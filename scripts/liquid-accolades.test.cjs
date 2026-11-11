// Les balises d'affichage {{ … }} : Shopify coupe la balise à sa première accolade fermante, même dans
// une chaîne. `{{ 'x' | t: size: '{size}' | json }}` passait dans liquidjs (le banc local), mais le
// déploiement l'a refusé le 11/11/2026 (« Variable … was not properly terminated », commit 8d05e2f).
// Un texte qui contient une accolade passe donc par une variable : {%- assign size_hole = '{size}' %}.
// Lancer : node --test scripts/liquid-accolades.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FOLDERS = ['layout', 'sections', 'snippets', 'templates', 'blocks']

/* Les balises {{ … }} qu'une accolade fermante coupe avant leur fin : dans une chaîne, ou seule. Le
   contenu de {% raw %} n'est pas lu par Liquid : il est mis à blanc, lignes gardées. Rend [{ line, tag }]. */
function brokenOutputTags(source) {
  const text = source.replace(/{%-?\s*raw\s*-?%}[\s\S]*?{%-?\s*endraw\s*-?%}/g, (block) => block.replace(/[^\n]/g, ' '))
  const found = []
  let at = text.indexOf('{{')
  while (at !== -1) {
    let quote = null
    let broken = false
    let end = -1
    for (let i = at + 2; i < text.length && end === -1; i++) {
      const c = text[i]
      if (quote) {
        if (c === quote) quote = null
        else if (c === '}') broken = true
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '}') {
        end = i
        if (text[i + 1] !== '}') broken = true
      }
    }
    if (broken || end === -1) {
      found.push({ line: text.slice(0, at).split('\n').length, tag: text.slice(at, end === -1 ? at + 80 : end + 2).slice(0, 120) })
    }
    at = text.indexOf('{{', end === -1 ? at + 2 : end + 2)
  }
  return found
}

test('refuse une accolade fermante dans une chaîne entre doubles accolades', () => {
  const source = `"unavailable": {{ 'sections.mma.oeuvre_3d_chips.unavailable' | t: size: '{size}' | json }},`
  assert.deepEqual(brokenOutputTags(source).map((f) => f.line), [1])
})

test('accepte le texte à accolades passé par une variable', () => {
  const source = `{%- assign size_hole = '{size}' %}\n"unavailable": {{ 'k' | t: size: size_hole | json }},`
  assert.deepEqual(brokenOutputTags(source), [])
})

test('accepte les espaces maîtrisés, les chaînes et les balises sur plusieurs lignes', () => {
  const source = `{{- 'a' | append: "b" -}}\n{{\n  product.title\n  | escape\n}}\n{{ "l'œuvre" }}`
  assert.deepEqual(brokenOutputTags(source), [])
})

test('refuse une accolade seule, et donne sa ligne', () => {
  assert.deepEqual(brokenOutputTags(`a\nb {{ x } }}`).map((f) => f.line), [2])
  assert.deepEqual(brokenOutputTags(`{{ "}}" }}`).map((f) => f.line), [1])
})

test('ignore le contenu de {% raw %}, que Liquid ne lit pas', () => {
  assert.deepEqual(brokenOutputTags(`{% raw %}{{ '}' }}{% endraw %}`), [])
})

test('aucune balise {{ … }} du thème ne contient d’accolade fermante avant sa fin', () => {
  const found = []
  for (const folder of FOLDERS) {
    const dir = path.join(ROOT, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.liquid'))) {
      for (const f of brokenOutputTags(fs.readFileSync(path.join(dir, name), 'utf8'))) found.push(`${folder}/${name}:${f.line} ${f.tag}`)
    }
  }
  assert.deepEqual(found, [], `accolade fermante dans une balise {{ … }} :\n${found.join('\n')}`)
})
