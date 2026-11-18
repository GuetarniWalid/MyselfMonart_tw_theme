// Une toile ou un poster tel qu'une ligne le dit, en objet (snippets/artwork-line.liquid) : le rendu commun de la
// vignette d'une ligne du panier (snippets/cart-item-artwork.liquid) et de la carte de « Mes j'aime » d'une œuvre
// aimée sur sa fiche (snippets/card-product.liquid). Le cadre se lit par snippets/artwork-frame.liquid
// (scripts/artwork-frame.test.cjs). Le rendu Liquid se vérifie au banc (liquidjs, paniers et cartes réels) ; ici,
// les contrats du code.
// Lancer : node --test scripts/artwork-line.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Le code Liquid d'un fichier, sans ses commentaires (ils citent du code).
const code = (file) => read(file)
  .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')
  .replace(/^\s*#.*$/gm, '')
const SNIPPET = 'snippets/artwork-line.liquid'
// Les paramètres d'un render, nom → expression.
const params = (call) => Object.fromEntries([...call.matchAll(/(\w+): ([^,]+?)\s*(?:,|$)/g)].map((m) => [m[1], m[2].trim()]))

test('toute toile et tout poster, nouveau ou de toujours : son œuvre à plat (snippet artwork-flat-index), en objet', () => {
  const source = code(SNIPPET)
  // Toile ou poster, sans image_unique : les produits de toujours aussi.
  assert.match(source, /capture kind\s+render 'artwork-kind', product: product, suffix: product\.template_suffix\s+endcapture/)
  assert.match(source, /capture flat_index\s+render 'artwork-flat-index', product: product\s+endcapture\s+assign flat_index = flat_index \| plus: 0\s+assign art = product\.images\[flat_index\]/)
  const call = /render 'artwork-object',([^\n]*)/.exec(source)
  assert.ok(call, 'render artwork-object')
  assert.deepEqual(params(call[1]), { product: 'product', image: 'art', kind: 'kind', frame: 'frame', contour: 'contour', context: 'context', lazy: 'lazy' })
})

test('le cadre est celui de la ligne : la lecture commune de la commande (snippet artwork-frame), avec sa variante et la couleur du poster', () => {
  assert.match(code(SNIPPET), /capture frame\s+render 'artwork-frame', product: product, variant: variant, kind: kind, cadre: cadre\s+endcapture/)
})

test('rien pour un produit qui n’est ni toile ni poster (règle unique : snippet artwork-kind), ni pour un produit sans œuvre à plat', () => {
  assert.match(code(SNIPPET), /if kind != blank and art != blank\s+capture frame[\s\S]*?render 'artwork-object'[^\n]*\s+endif\s+-%}\s*$/)
})

test('une seule lecture : le panier et la carte de « Mes j’aime » passent par elle, et aucun ne refait son travail', () => {
  const cart = code('snippets/cart-item-artwork.liquid')
  const card = code('snippets/card-product.liquid')
  assert.match(cart, /render 'artwork-line', product: item\.product, variant: item\.variant, cadre: cadre_property, contour: contour, context: context, lazy: true/)
  assert.match(card, /render 'artwork-line', product: product, variant: variant, context: 'carte', lazy: lazy_load/)
  assert.doesNotMatch(cart, /artwork-object|artwork-frame|artwork-flat-index|artwork-kind/)
  assert.doesNotMatch(card, /artwork-frame/)
  // La lecture du cadre n'a que deux appelants : ce snippet, et la page des photos studio, qui lit le cadre de
  // chaque valeur de l'option cadre comme une ligne le lit (scripts/photo-studio.test.cjs).
  const others = fs.readdirSync(path.join(ROOT, 'snippets'))
    .concat(fs.readdirSync(path.join(ROOT, 'sections')).map((f) => `../sections/${f}`))
    .concat(fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.liquid')).map((f) => `../templates/${f}`))
  for (const file of others) {
    if (file === 'artwork-line.liquid' || file === '../templates/product.photo-studio.liquid') continue
    assert.doesNotMatch(code(`snippets/${file}`), /render 'artwork-frame'/, file)
  }
})
