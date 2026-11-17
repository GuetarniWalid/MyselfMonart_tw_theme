// La vignette d'une ligne du panier, telle que le client l'a commandée (snippets/cart-item-artwork.liquid) :
// toute toile et tout poster, nouveaux ou de toujours, en objet (snippets/artwork-object.liquid), avec le cadre
// et le contour blanc de la ligne. La page panier (sections/page-cart-items.liquid) et le tiroir
// (sections/tw-cart-drawer.liquid) passent par lui ; les autres lignes gardent leur image. Le cadre se lit par
// la lecture commune de la commande (snippets/artwork-frame.liquid, scripts/artwork-frame.test.cjs), comme la
// fiche 3D le lit. Le rendu Liquid se vérifie au banc (liquidjs, paniers réels) ; ici, les contrats du code.
// Lancer : node --test scripts/cart-item-artwork.test.cjs
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
const SNIPPET = 'snippets/cart-item-artwork.liquid'

test('le cadre de la ligne : la lecture commune de la commande (snippet artwork-frame), avec la variante et la couleur _cadre de la ligne', () => {
  const source = code(SNIPPET)
  assert.match(source, /capture frame\s+render 'artwork-frame', product: item\.product, variant: item\.variant, kind: kind, cadre: cadre_property\s+endcapture/)
  // Une seule table des cadres, dans le snippet commun (scripts/artwork-frame.test.cjs).
  assert.doesNotMatch(source, /case frame_key|frames_canvas|options_with_values/)
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
  // Les propriétés de la ligne se lisent en un seul passage : l'aperçu, la couleur du cadre, le contour blanc.
  assert.equal((source.match(/for property in item\.properties/g) || []).length, 1)
  // Le contour blanc : la propriété de ligne _passe_partout, « oui » ou « non » (main-product.js, mmaSetWhiteBorder).
  assert.match(source, /when '_passe_partout'\s+if property\.last == 'oui'\s+assign contour = true/)
})

test('les lignes qui gardent leur image : aperçu personnalisé (_preview), produit ni toile ni poster, produit sans œuvre à plat', () => {
  const source = code(SNIPPET)
  assert.match(source, /when '_preview'\s+if property\.last != blank\s+assign has_preview = true/)
  assert.match(source, /if kind != blank and has_preview == false and art != blank\s+assign as_object = true/, 'l’objet, seulement pour une toile ou un poster, sans aperçu, avec son œuvre à plat')
  assert.match(source, /{%-?\s*if as_object\s*-?%}\s*{%-?\s*render 'artwork-object'/)
})

test('la couleur du cadre d’un poster : la propriété de ligne _cadre, handle de son métaobjet', () => {
  assert.match(code(SNIPPET), /when '_cadre'\s+assign cadre_property = property\.last/)
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
