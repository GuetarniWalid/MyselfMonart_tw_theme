// La fiche 3D des nouveaux produits (modèle oeuvre-3d, ticket 18 du dossier .scratch/fiche-3d) : ils n'ont que
// l'œuvre à plat, leur 1re image, et un poster à contour blanc y ajoute son image « passe-partout ». Les
// produits de toujours ont l'œuvre à plat en 2e image ; leur fiche ne change pas, sous leur modèle comme sous
// ?view=oeuvre-3d. La place de l'œuvre à plat vient du snippet artwork-flat-index (0 pour un nouveau produit,
// 1 sinon). Le rendu Liquid se vérifie au banc (liquidjs, avant et après, à l'octet près pour les produits de
// toujours) ; ici, les contrats du code.
// Lancer : node --test scripts/oeuvre-3d-image-unique.test.cjs
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

/* L'index de l'œuvre à plat du produit de la fiche, tiré du snippet artwork-flat-index et rendu numérique
   (l'index d'une liste l'exige), en balises ou dans un bloc {% liquid %}. Rend le nom de la variable. */
function flatIndex(source, where) {
  const tags = /{%-?\s*capture (\w+)\s*-?%}{%-?\s*render 'artwork-flat-index', product: product\s*-?%}{%-?\s*endcapture\s*-?%}\s*{%-?\s*assign \1 = \1 \| plus: 0\s*-?%}/.exec(source)
  const block = /\bcapture (\w+)\s+render 'artwork-flat-index', product: product\s+endcapture\s+assign \1 = \1 \| plus: 0\b/.exec(source)
  const m = tags || block
  assert.ok(m, `${where} : l'index de l'œuvre à plat (snippet artwork-flat-index), en nombre`)
  return { name: m[1], at: m.index }
}

test('fiche : la scène 3D s’ouvre dès que l’œuvre à plat est une image, où qu’elle soit (1re image d’un nouveau produit)', () => {
  const section = code('sections/main-product.liquid')
  const flat = flatIndex(section, 'main-product')
  const condition = /{%-\s*if section\.settings\.media_display == 'stage_3d' and (.*?)\s*-%}/.exec(section)
  assert.ok(condition, 'la condition de la scène 3D')
  assert.equal(condition[1], `product.media[${flat.name}].media_type == 'image'`)
  assert.ok(flat.at < condition.index, 'l’index est connu avant la condition')
})

test('données Google de la fiche : la 3D est annoncée dès que l’œuvre à plat est une image, comme pour la scène', () => {
  const section = code('sections/main-product.liquid')
  const flat = flatIndex(section, 'main-product')
  const props = /{%-\s*capture product_3d_props\s*-%}\s*{%-\s*if (.*?)\s*-%}/.exec(section)
  assert.ok(props, 'les propriétés 3D du JSON-LD')
  assert.equal(props[1], `product.media[${flat.name}] and product.media[${flat.name}].media_type == 'image'`)
})

test('scène : l’image d’arrivée est l’œuvre à plat, avec son texte alternatif (métachamp au même index, puis image)', () => {
  const stage = code('snippets/oeuvre-3d-stage.liquid')
  const flat = flatIndex(stage, 'oeuvre-3d-stage')
  const art = new RegExp(`assign art_media = product\\.media\\[${flat.name}\\]`).exec(stage)
  assert.ok(art, 'l’image d’arrivée')
  assert.ok(flat.at < art.index, 'l’index est connu avant elle')
  assert.match(stage, new RegExp(`assign art_alt = alts\\[${flat.name}\\] \\| default: art_media\\.alt`))
  assert.doesNotMatch(stage, /media\[1\]|alts\[1\]/, 'plus aucune 2e image en dur')
})

test('scène sans 3D : les autres photos ne répètent pas l’œuvre à plat, où qu’elle soit, ni les contours blancs', () => {
  const stage = code('snippets/oeuvre-3d-stage.liquid')
  const flat = flatIndex(stage, 'oeuvre-3d-stage')
  // Sa place parmi les images, comptée comme image_index (1 pour la 1re).
  const position = new RegExp(`assign (\\w+) = ${flat.name} \\| plus: 1\\b`).exec(stage)
  assert.ok(position, 'la place de l’œuvre à plat parmi les images')
  const photos = /<template data-photos>([\s\S]*?)<\/template>/.exec(stage)
  assert.ok(photos, 'les photos du repli')
  assert.ok(position.index < photos.index, 'sa place est connue avant les photos')
  assert.match(photos[1], new RegExp(`{%-\\s*if image_index >= start_from and image_index != ${position[1]}\\s*-%}`))
  assert.match(photos[1], /{%-\s*unless media\.preview_image\.src contains 'passe-partout'\s*-%}/)
  assert.doesNotMatch(photos[1], /image_index != 2/, 'plus de 2e image en dur')
})
