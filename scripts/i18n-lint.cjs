#!/usr/bin/env node
/*
 * i18n completeness lint for the MyselfMonArt theme.
 *
 * Catches the two theme-side regression classes from the 2026-06-08 i18n audit BEFORE they
 * ship (run it in CI / pre-deploy):
 *   1. Hardcoded user-facing literals in `aria-label="..."` and `alt="..."` — i.e. text that
 *      is NOT a Liquid expression ({{ ... }}). Those never get translated (they stayed FR/EN
 *      on /es). Use `aria-label="{{ 'some.key' | t }}"` instead.
 *   2. Locale key drift: every key in the source locale (fr.default.json) must exist in
 *      en/es/de/nl.json, or that string falls back to French on the missing language.
 *
 * Usage:  node scripts/i18n-lint.cjs
 * Exit code 1 if any issue is found (0 otherwise).
 *
 * Allowlist: append a trailing  {# i18n-lint-ignore #}  comment on the same line to silence
 * a deliberate literal (e.g. a brand name).
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SCAN_DIRS = ['sections', 'snippets']
const LOCALES_DIR = path.join(ROOT, 'locales')
const SOURCE_LOCALE_FILE = 'fr.default.json'
const TARGET_LOCALE_FILES = ['en.json', 'es.json', 'de.json', 'nl.json']

let issues = 0 // hard errors (fail the build): hardcoded literals, unparseable locale files
let warnings = 0 // soft (reported only): locale key drift, auto-converged by the backend cron

// ---- 1. Hardcoded aria-label / alt literals -------------------------------------------
const ATTR_RE = /(aria-label|alt|title)\s*=\s*"([^"]*)"/gi
const HAS_LETTER = /\p{L}/u

function listLiquidFiles(dir) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.liquid'))
    .map((f) => path.join(abs, f))
}

for (const dir of SCAN_DIRS) {
  for (const file of listLiquidFiles(dir)) {
    const rel = path.relative(ROOT, file)
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (line.includes('i18n-lint-ignore')) return
      let m
      ATTR_RE.lastIndex = 0
      while ((m = ATTR_RE.exec(line)) !== null) {
        const [, attr, value] = m
        if (value.trim() === '') continue // decorative alt="" is fine
        if (value.includes('{{') || value.includes('{%')) continue // Liquid expression — ok
        if (!HAS_LETTER.test(value)) continue // punctuation / numbers only
        console.log(`  ✖ ${rel}:${i + 1}  hardcoded ${attr}="${value}"`)
        issues++
      }
    })
  }
}

// ---- 2. Locale key parity --------------------------------------------------------------
function loadLocale(fileName) {
  const raw = fs.readFileSync(path.join(LOCALES_DIR, fileName), 'utf8')
  const body = raw.replace(/^﻿/, '').replace(/^\s*\/\*[\s\S]*?\*\//, '')
  return JSON.parse(body)
}

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...flattenKeys(v, full))
    else keys.push(full)
  }
  return keys
}

let sourceKeys = []
try {
  sourceKeys = flattenKeys(loadLocale(SOURCE_LOCALE_FILE))
} catch (e) {
  console.log(`  ✖ could not parse ${SOURCE_LOCALE_FILE}: ${e.message}`)
  issues++
}

for (const target of TARGET_LOCALE_FILES) {
  let targetKeys
  try {
    targetKeys = new Set(flattenKeys(loadLocale(target)))
  } catch (e) {
    console.log(`  ✖ could not parse ${target}: ${e.message}`)
    issues++
    continue
  }
  const missing = sourceKeys.filter((k) => !targetKeys.has(k))
  if (missing.length) {
    // Soft: theme `t:` keys are auto-translated by the backend TranslateThemeLocale cron, so
    // parity is eventually consistent — report it (visibility) but don't fail the build.
    console.log(`  ⚠ ${target} missing ${missing.length} key(s) present in ${SOURCE_LOCALE_FILE}:`)
    for (const k of missing.slice(0, 25)) console.log(`      - ${k}`)
    if (missing.length > 25) console.log(`      … and ${missing.length - 25} more`)
    warnings += missing.length
  }
}

// ---- result ----------------------------------------------------------------------------
const warnNote = warnings ? ` (${warnings} key-parity warning(s) — backend cron converges these)` : ''
if (issues === 0) {
  console.log(`✅ i18n lint passed — no hardcoded aria/alt literals${warnNote}.`)
  process.exit(0)
} else {
  console.log(
    `\n❌ i18n lint found ${issues} hard issue(s)${warnNote}. ` +
      `Fix the literals (or add {# i18n-lint-ignore #}).`
  )
  process.exit(1)
}
