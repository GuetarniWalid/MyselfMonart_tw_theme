// Le message sous les cadres des fiches classiques (assets/main-product.js, mmaRenderFrameNotice) nomme les
// tailles par mmaSizeName. La fiche anglaise donne les siennes en pouces, au dixième : le 22/11/2026, le
// message y disait « Our frames stop at 5 × 39 » pour le 29.5x39.4 in.
// Lancer : node --test scripts/main-product-frame-notice.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'main-product.js'), 'utf8')
const body = source.match(/function mmaSizeName\(value\) \{[\s\S]*?\n\}/)[0]
const mmaSizeName = new Function(`${body}; return mmaSizeName`)()
const plain = (text) => text.replace(/ /g, ' ')

test('les tailles du message des cadres : cm sans unité, pouces avec leur dixième et leur unité', () => {
  assert.equal(plain(mmaSizeName('90x120 cm')), '90 × 120')
  assert.equal(plain(mmaSizeName('75x100 cm')), '75 × 100')
  assert.equal(plain(mmaSizeName('29,7x42 cm')), '29,7 × 42')
  assert.equal(plain(mmaSizeName('35.4x47.2 in')), '35.4 × 47.2 in')
  assert.equal(plain(mmaSizeName('29.5x39.4 in')), '29.5 × 39.4 in')
  assert.equal(plain(mmaSizeName('11.8 x 15.7 inches')), '11.8 × 15.7 in')
  // Les espaces sont fines et insécables : le message ne se coupe jamais au milieu d'une taille.
  assert.equal(mmaSizeName('90x120 cm'), '90 × 120')
  // Ce qui n'est pas une taille reste tel quel.
  assert.equal(mmaSizeName('Sur mesure'), 'Sur mesure')
  assert.equal(mmaSizeName(''), '')
})
