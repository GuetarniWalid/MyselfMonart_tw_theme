// La vignette d'une ligne du panier, telle que le client l'a commandée (snippets/cart-item-artwork.liquid) :
// toute toile et tout poster, nouveaux ou de toujours, en objet (snippets/artwork-object.liquid), avec le cadre
// et le contour blanc de la ligne. La page panier (sections/page-cart-items.liquid) et le tiroir
// (sections/tw-cart-drawer.liquid) passent par lui ; les autres lignes gardent leur image. La commande se lit
// comme la fiche 3D la lit (snippets/oeuvre-3d-model.liquid, assets/component-oeuvre-3d.js). Le rendu Liquid se
// vérifie au banc (liquidjs, paniers réels) ; ici, les contrats du code.
// Lancer : node --test scripts/cart-item-artwork.test.cjs
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
const SNIPPET = 'snippets/cart-item-artwork.liquid'

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
  assert.match(source, /assign tail_number = handle_tail \| plus: 0 \| append: ''/)
  assert.match(source, /if tail_number == handle_tail\s+assign frame_key = frame_handle \| remove_last: handle_tail \| remove_last: '-'/)
})

/* L'appel du snippet de l'œuvre en objet : ses paramètres, nom → expression. */
function objectCall(source) {
  const call = /{%-?\s*render 'artwork-object',([^%]*?)-?%}/.exec(source)
  assert.ok(call, 'render artwork-object')
  return Object.fromEntries([...call[1].matchAll(/(\w+): ([^,]+?)\s*(?:,|$)/g)].map((m) => [m[1], m[2].trim()]))
}

test('la ligne en objet : son œuvre à plat (snippet artwork-flat-index), toile ou poster, le cadre, le contour blanc, la taille de la case', () => {
  const source = code(SNIPPET)
  assert.deepEqual(objectCall(source), { product: 'item.product', image: 'art', kind: 'kind', frame: 'frame', contour: 'contour', context: 'context', lazy: 'true' })
  assert.match(source, /capture flat_index\s+render 'artwork-flat-index', product: item\.product\s+endcapture\s+assign flat_index = flat_index \| plus: 0\s+assign art = item\.product\.images\[flat_index\]/)
  assert.match(source, /capture kind\s+render 'artwork-kind', product: item\.product, suffix: item\.product\.template_suffix\s+endcapture/)
  // Le contour blanc : la propriété de ligne _passe_partout, « oui » ou « non » (main-product.js, mmaSetWhiteBorder).
  assert.match(source, /if property\.first == '_passe_partout' and property\.last == 'oui'\s+assign contour = true/)
})

test('les lignes qui gardent leur image : aperçu personnalisé (_preview), produit ni toile ni poster, produit sans œuvre à plat', () => {
  const source = code(SNIPPET)
  assert.match(source, /if property\.first == '_preview' and property\.last != blank\s+assign has_preview = true/)
  const guard = /{%-?\s*if kind != blank and has_preview == false and art != blank\s*-?%}\s*{%-?\s*render 'artwork-object'/.exec(source)
  assert.ok(guard, 'l’objet, seulement pour une toile ou un poster, sans aperçu, avec son œuvre à plat')
})

test('poster « Avec cadre » sans couleur (commande passée hors de la fiche) : le cadre noir, celui des cartes de collection', () => {
  const source = code(SNIPPET)
  assert.match(source, /for property in item\.properties\s+if property\.first == '_cadre'\s+assign frame_handle = property\.last\s+endif\s+endfor\s+if frame_handle == blank\s+assign frame_handle = 'cadre-noir-mat'/)
  // « Sans cadre » : la 1re valeur de l'option 2, comme sur la fiche (painting-variant-picker : sans_value).
  assert.match(source, /capture without_frame\s+echo item\.product\.options_with_values\[1\]\.values\.first\s+endcapture\s+if item\.variant\.option2 == without_frame\s+assign frame_handle = 'sans-cadre'/)
})

/* La case de la vignette d'une ligne, dans une section du panier : le <a> du produit, qui porte l'objet de la
   ligne ou, à défaut, l'image d'avant. Rend l'image d'avant. */
function thumbnail(file, context) {
  const source = code(file)
  const m = new RegExp(`{%-?\\s*capture line_artwork\\s*-?%}{%-?\\s*render 'cart-item-artwork', item: item, context: '${context}'\\s*-?%}{%-?\\s*endcapture\\s*-?%}\\s*{%-?\\s*if line_artwork != blank\\s*-?%}\\s*{{ line_artwork }}\\s*{%-?\\s*else\\s*-?%}([\\s\\S]*?){%-?\\s*endif\\s*-?%}\\s*</a>`).exec(source)
  assert.ok(m, `${file} : l'objet de la ligne, sinon l'image d'avant`)
  return m[1]
}

test('tiroir : la vignette de la ligne en objet, dans sa case de 80 px (au plus 112 px de haut) ; sinon l’image d’avant, inchangée', () => {
  const fallback = thumbnail('sections/tw-cart-drawer.liquid', 'tiroir')
  assert.match(fallback, /^\s*<img\s+class="w-full h-full object-cover"/)
  assert.match(fallback, /src="{{ custom_preview_url \| escape }}"[\s\S]*onerror="this\.onerror=null;this\.src='{{ item_image \| image_url: width: 160 }}'"/)
  assert.match(fallback, /src="{{ item_image \| image_url: width: 160 }}"/)
  assert.match(code('sections/tw-cart-drawer.liquid'), /<div class="relative row-span-2 w-20 max-h-28">\s*<a\s+href="{{ item\.url }}"\s+tabindex="-1"\s+aria-hidden="true"\s+class="absolute inset-0 rounded-lg overflow-hidden">\s*{%-?\s*capture line_artwork/)
})

test('page panier : la vignette de la ligne en objet, dans sa case de 120 px ; sinon l’image d’avant', () => {
  const fallback = thumbnail('sections/page-cart-items.liquid', 'panier')
  assert.match(fallback, /^\s*<img\s+{%- if custom_preview_url != blank %}/)
  assert.match(code('sections/page-cart-items.liquid'), /<div class="relative md:row-span-2 w-\[120px\]">\s*<a href="{{ item\.url }}" class="absolute inset-0">\s*{%-?\s*capture line_artwork/)
})
