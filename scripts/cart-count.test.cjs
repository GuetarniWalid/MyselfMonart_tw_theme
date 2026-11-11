// Le compteur du bouton du panier (assets/cart-count.js, snippets/open-cart-drawer-button.liquid) : le
// chiffre visible et la fin du nom lu, traduite (« Ouvrir le panier, 2 articles »), sur tout le site.
// Lancer : node --test scripts/cart-count.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { cartCountMarkup } = require('../assets/cart-count.js')

const ROOT = path.join(__dirname, '..')
const FR = { one: '[count] article', other: '[count] articles' }

test('panier vide : rien, le nom reste « Ouvrir le panier »', () => {
  assert.equal(cartCountMarkup(0, FR), '')
  assert.equal(cartCountMarkup('', FR), '')
})

test('un article, puis plusieurs : le chiffre visible, et le nom lu au singulier ou au pluriel', () => {
  assert.equal(cartCountMarkup(1, FR), '<span aria-hidden="true">1</span><span class="sr-only">, 1 article</span>')
  assert.equal(cartCountMarkup(12, FR), '<span aria-hidden="true">12</span><span class="sr-only">, 12 articles</span>')
})

test('au-delà de 99 : « 99+ » sur la fiche 3D, rien de visible ailleurs (l’ancien dessin)', () => {
  assert.equal(cartCountMarkup(120, { ...FR, overflow: true }), '<span aria-hidden="true">99+</span><span class="sr-only">, 120 articles</span>')
  assert.equal(cartCountMarkup(120, FR), '<span class="sr-only">, 120 articles</span>')
})

test('le texte traduit est échappé', () => {
  assert.equal(cartCountMarkup(2, { one: '', other: '<b>[count]</b> & co' }), '<span aria-hidden="true">2</span><span class="sr-only">, &lt;b&gt;2&lt;/b&gt; &amp; co</span>')
})

test('le bouton : un vrai bouton, nommé par son libellé et son compteur, modèles traduits', () => {
  const snippet = fs.readFileSync(path.join(ROOT, 'snippets/open-cart-drawer-button.liquid'), 'utf8')
  assert.doesNotMatch(snippet, /role="button"/)
  assert.match(snippet, /type="button"/)
  assert.match(snippet, /aria-labelledby="cart-button-label bubble-nb-product"/)
  assert.match(snippet, /data-count-one="{{ 'sections\.header\.cart_count' \| t: count: 1/)
  assert.match(snippet, /data-count-other="{{ 'sections\.header\.cart_count' \| t: count: 2/)
})

test('plus aucun « Cart count » en anglais dans les scripts du thème', () => {
  const found = fs.readdirSync(path.join(ROOT, 'assets'))
    .filter((name) => /\.js$/.test(name) && !/\.min\.js$/.test(name))
    .filter((name) => /Cart count/.test(fs.readFileSync(path.join(ROOT, 'assets', name), 'utf8')))
  assert.deepEqual(found, [])
})
