// Le bouton qui ramène la 3D de face (snippets/oeuvre-3d-stage.liquid, [data-front]) : son libellé.
// Lancer : node --test scripts/oeuvre-3d-retour.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Les fichiers de langue commencent par un commentaire de Shopify (comme scripts/i18n-lint.cjs).
const locale = (name) => JSON.parse(read(`locales/${name}.json`).replace(/^﻿/, '').replace(/^\s*\/\*[\s\S]*?\*\//, ''))

/* Retour de Walid du 11/11, après un essai avec une cliente : « quand une option est ouverte, elle ne
   savait pas comment la quitter […] je vois qu'il y a "De face". Donc peut-être marque retour ou un truc,
   quelque chose de plus explicite. » Le bouton dit « Retour », dans les cinq langues de la boutique. */
const BACK = { 'fr.default': 'Retour', en: 'Back', de: 'Zurück', es: 'Volver', nl: 'Terug' }

function frontButton() {
  const source = read('snippets/oeuvre-3d-stage.liquid')
  const match = /<button\b[^>]*\bdata-front\b[^>]*>([\s\S]*?)<\/button>/.exec(source)
  assert.ok(match, 'le bouton [data-front] est dans la scène')
  return match[1]
}

test('le bouton qui ramène la 3D de face dit « Retour », dans les cinq langues', () => {
  const keys = [...frontButton().matchAll(/{{\s*'([^']+)'\s*\|\s*t\s*}}/g)].map((m) => m[1])
  assert.deepEqual(keys, ['sections.mma.oeuvre_3d_back'])
  for (const [name, word] of Object.entries(BACK)) {
    assert.equal(locale(name).sections.mma.oeuvre_3d_back, word, name)
  }
})

test('l’ancien libellé « De face » ne reste dans aucune langue', () => {
  for (const name of Object.keys(BACK)) assert.equal(locale(name).sections.mma.oeuvre_3d_front, undefined, name)
})
