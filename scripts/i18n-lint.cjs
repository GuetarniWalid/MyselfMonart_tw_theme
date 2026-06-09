#!/usr/bin/env node
/*
 * i18n completeness lint for the MyselfMonArt theme.
 *
 * Catches the theme-side regression classes from the 2026-06-08/06-09 i18n audits BEFORE they
 * ship (run it in CI / pre-deploy):
 *   1. Hardcoded user-facing literals in `aria-label="..."` and `alt="..."` — i.e. text that
 *      is NOT a Liquid expression ({{ ... }}). Those never get translated (they stayed FR/EN
 *      on /es). Use `aria-label="{{ 'some.key' | t }}"` instead.
 *   2. Hardcoded user-facing literals in JSON-LD (`<script type="application/ld+json">`) free-text
 *      / label fields (name, description, jobTitle, …). They never get translated either (the
 *      home BreadcrumbList stayed "Accueil" and Organization.description stayed FR on /es/nl/de —
 *      2026-06-09 audit). Use `{{ 'some.key' | t | json }}` or pull from a localised object
 *      (e.g. `collections[handle].title`). Brand/proper nouns are allow-listed.
 *   3. Locale key drift: every key in the source locale (fr.default.json) must exist in
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

// ---- 1b. Hardcoded user-facing literals inside JSON-LD blocks --------------------------
// schema.org free-text / label fields hardcoded in FR/EN never get translated. Only a small
// set of label-bearing keys is checked; structural/enum keys (telephone, priceRange,
// addressCountry, contactType, itemListOrder, …) are ignored by omission. Brand / proper
// nouns are allow-listed; a trailing `i18n-lint-ignore` comment also silences a line.
const LD_KEYS = new Set([
  'name', 'alternateName', 'description', 'jobTitle', 'slogan', 'headline',
  'caption', 'abstract', 'disambiguatingDescription', 'reviewBody', 'articleBody', 'text',
])
const LD_BRAND_ALLOW = new Set(['MyselfMonArt', 'Walid', 'SAS KINDOPIA'])
const LD_KV_RE = /"([A-Za-z]+)"\s*:\s*"([^"]*)"/g

for (const dir of SCAN_DIRS) {
  for (const file of listLiquidFiles(dir)) {
    const rel = path.relative(ROOT, file)
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    let inLd = false
    lines.forEach((line, i) => {
      if (line.includes('application/ld+json')) inLd = true
      if (inLd && !line.includes('i18n-lint-ignore')) {
        LD_KV_RE.lastIndex = 0
        let m
        while ((m = LD_KV_RE.exec(line)) !== null) {
          const [, key, value] = m
          if (!LD_KEYS.has(key)) continue
          if (value.trim() === '') continue
          if (value.includes('{{') || value.includes('{%')) continue // Liquid expression — ok
          if (!HAS_LETTER.test(value)) continue
          if (LD_BRAND_ALLOW.has(value.trim())) continue // brand / proper noun
          console.log(`  ✖ ${rel}:${i + 1}  hardcoded JSON-LD ${key}="${value}" (use {{ 'key' | t | json }} or a localised object)`)
          issues++
        }
      }
      if (inLd && line.includes('</script>')) inLd = false
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
