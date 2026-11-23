// Le titre des cartes produit (snippets/card-product-info.liquid) : le titre entier, invisible, que lisent les lecteurs
// d'écran après le libellé court. Il est en position absolue : sans left-0 top-0, il se plaçait au bout du libellé et,
// dans la colonne de droite, dépassait de l'écran sur téléphone. La page s'élargissait alors (Tableaux Nature : 405 px
// au lieu de 390, relevé du 23/11/2026) et Chrome la réduisait pour la faire tenir.
// Lancer : node --test scripts/card-titre.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { read } = require('./galerie-banc.cjs')

test('le titre entier des cartes reste collé au coin de sa carte', () => {
  const card = read('snippets/card-product-info.liquid')
  const spans = [...card.matchAll(/<span class="([^"]*)">\{\{ product\.title \| escape \}\}<\/span>/g)].map((m) => m[1].split(/\s+/))
  assert.equal(spans.length, 1, 'un seul titre entier invisible')
  for (const cls of ['sr-only', 'left-0', 'top-0']) assert.ok(spans[0].includes(cls), `il porte ${cls}`)
})

test('les classes du coin sont dans la feuille compilée', () => {
  const css = read('assets/output.css')
  assert.match(css, /\.left-0\{left:0(px)?\}/)
  assert.match(css, /\.top-0\{top:0(px)?\}/)
})
