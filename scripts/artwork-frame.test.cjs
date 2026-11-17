// Le cadre d'une toile ou d'un poster tel qu'une ligne le dit (snippets/artwork-frame.liquid) : la seule lecture
// de la commande, celle de la vignette d'une ligne du panier (snippets/cart-item-artwork.liquid) et de la carte
// de « Mes j'aime » d'une œuvre aimée sur sa fiche (snippets/card-product.liquid, avec la variante gardée). Elle
// se lit comme la fiche 3D la lit (assets/component-oeuvre-3d.js : FRAME_IDS, frameIdOf). Le rendu Liquid se
// vérifie au banc (liquidjs, paniers et cartes réels) ; ici, les contrats du code.
// Lancer : node --test scripts/artwork-frame.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { productFromSelection } = require('../assets/component-oeuvre-3d.js')
const { toile, poster } = require('./fixtures/oeuvre-3d-bonsai.json')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Le code Liquid d'un fichier, sans ses commentaires (ils citent du code).
const code = (file) => read(file)
  .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')
  .replace(/^\s*#.*$/gm, '')
const SNIPPET = 'snippets/artwork-frame.liquid'

/* La table du snippet : handle de métaobjet cadre (sans le suffixe numérique des couleurs du poster) → id du
   cadre du moteur 3D. Lue sur ses lignes « when '<handle>' » suivies de « assign frame = '<id>' ». */
function frameTable() {
  const source = code(SNIPPET)
  const block = /case frame_key([\s\S]*?)endcase/.exec(source)
  assert.ok(block, 'la table des cadres (case frame_key … endcase)')
  const table = {}
  for (const [, handles, id] of block[1].matchAll(/when ((?:'[^']+'(?:,\s*)?)+)\s+assign frame = '(\w+)'/g)) {
    for (const [, handle] of handles.matchAll(/'([^']+)'/g)) table[handle] = id
  }
  return table
}
// La sélection de la fiche, comme la lit la fiche 3D (scripts/oeuvre-3d-catalog.test.cjs).
const toileWith = (frame) => ({ options: [{ position: 1, kind: 'size', value: '30x40 cm', key: null }, { position: 2, kind: 'border', value: 'Bordure', key: 'bordure-blanche' }, { position: 3, kind: 'frame', value: 'Cadre', key: frame }], frameColor: null, whiteBorder: null })
const posterWith = (key) => ({ options: [{ position: 1, kind: 'size', value: '30x40 cm', key: null }, { position: 2, kind: 'frame', value: 'Avec cadre', key: null }], frameColor: { name: 'Cadre', key }, whiteBorder: null })

test('cadre d’une toile : chaque cadre de la boutique a l’id que lui donne la fiche 3D', () => {
  const table = frameTable()
  for (const [, handle] of toile.frames) {
    assert.equal(table[handle], productFromSelection(toile, toileWith(handle)).frame, handle)
  }
})

test('cadre d’un poster : chaque couleur de la boutique (« cadre-noir-mat-1 ») a l’id que lui donne la fiche 3D, suffixe numérique ôté', () => {
  const table = frameTable()
  for (const [, handle] of poster.frameColors) {
    assert.match(handle, /-\d+$/, `${handle} : les couleurs du poster ont leurs propres métaobjets, suffixés`)
    assert.equal(table[handle.replace(/-\d+$/, '')], productFromSelection(poster, posterWith(handle)).frame, handle)
  }
  // Le suffixe s'ôte s'il est numérique, et seulement alors (comme frameIdOf de la fiche 3D).
  const source = code(SNIPPET)
  assert.match(source, /assign handle_tail = frame_handle \| split: '-' \| last/)
  assert.match(source, /assign numeric_tail = handle_tail \| plus: 0 \| append: ''/)
  assert.match(source, /if numeric_tail == handle_tail\s+assign frame_key = frame_handle \| remove_last: handle_tail \| remove_last: '-'/)
})

test('toile : le cadre est la valeur de l’option 3 de la variante, menée par son nom au métaobjet de frames_canvas', () => {
  assert.match(code(SNIPPET), /if kind == 'toile'\s+for frame_object in product\.metafields\.painting_options\.frames_canvas\.value\s+if frame_object\.name == variant\.option3\s+assign frame_handle = frame_object\.system\.handle\s+break/)
})

test('poster : sans cadre si la variante a la 1re valeur de l’option 2 ; encadré sans couleur connue, le cadre noir des cartes de collection', () => {
  const source = code(SNIPPET)
  // « Sans cadre » : la 1re valeur de l'option 2, comme sur la fiche (painting-variant-picker : sans_value).
  // Sans option 2 (aucun choix de cadre), le poster n'est pas encadré. La couleur : le paramètre cadre (la
  // propriété de ligne _cadre au panier ; rien dans « Mes j'aime », où assets/my-likes.js la pose).
  assert.match(source, /capture without_frame\s+echo product\.options_with_values\[1\]\.values\.first\s+endcapture\s+if variant\.option2 != blank and variant\.option2 != without_frame\s+assign poster_framed = true\s+assign frame_handle = cadre\s+endif/)
  // Un poster encadré a toujours un cadre : sa couleur si on la connaît, noir sinon.
  assert.match(source, /endcase\s+if poster_framed and frame == 'sans'\s+assign frame = 'noir'\s+endif/)
})

test('« Mes j’aime » (assets/my-likes.js), qui pose la couleur gardée du poster, a la même table, et ôte le même suffixe', () => {
  const source = read('assets/my-likes.js')
  const block = /FRAME_IDS = {([\s\S]*?)}/.exec(source)
  assert.ok(block, 'la table FRAME_IDS de assets/my-likes.js')
  const table = Object.fromEntries([...block[1].matchAll(/'([^']+)': '(\w+)'/g)].map((m) => [m[1], m[2]]))
  assert.deepEqual(table, frameTable())
  assert.match(source, /\.replace\(\/-\\d\+\$\/, ''\)/, 'le suffixe numérique s’ôte (« cadre-noir-mat-1 »)')
})

test('le cadre sort seul, sans aucun espace, pour se comparer tel quel', () => {
  const source = read(SNIPPET)
  assert.match(source, /^{%- comment -%}[\s\S]*?{%- endcomment -%}\s*{%- liquid\s[\s\S]*\s+echo frame\s+-%}\s*$/, 'un commentaire, puis un seul bloc liquid qui finit par echo frame')
})
