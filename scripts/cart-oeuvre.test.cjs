// Le panier et les nouveaux produits (modèle oeuvre-3d, décision 18 du dossier .scratch/fiche-3d) : ils n'ont
// que l'œuvre à plat, leur 1re photo. Les produits de toujours l'ont en 2e photo ; leur rendu ne change pas.
// La page panier (sections/page-cart-items.liquid) montre leur vignette, avec le bon texte alternatif ; le
// tiroir (sections/tw-cart-drawer.liquid) en tire leur format, portrait ou paysage, pour assortir la taille
// des tableaux qu'il propose en lot. Le rendu Liquid se vérifie au banc (liquidjs, avant et après, à l'octet
// près pour les produits de toujours) ; ici, les contrats du code.
// Lancer : node --test scripts/cart-oeuvre.test.cjs
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

/* L'index de l'œuvre à plat d'un produit `p` (expression Liquid, ex. « item.product ») : la règle unique
   (snippet artwork-kind, image_unique) le met à 0 pour un nouveau produit, et le laisse à 1 sinon. Rend le nom
   de la variable qui le porte. */
function flatIndex(source, p) {
  const esc = p.replace(/\./g, '\\.')
  const kind = new RegExp(`capture (\\w+)\\s+render 'artwork-kind', product: ${esc}, suffix: ${esc}\\.template_suffix, image_unique: true\\s+endcapture`).exec(source)
  assert.ok(kind, `${p} : la règle artwork-kind avec image_unique`)
  const rest = source.slice(kind.index)
  const index = new RegExp(`assign (\\w+) = 1\\s+if ${kind[1]} != blank\\s+assign \\1 = 0\\s+endif`).exec(rest)
  assert.ok(index, `${p} : l'index de l'œuvre à plat, 1, puis 0 pour un nouveau produit`)
  return index[1]
}

test('page panier : la vignette d’un nouveau produit est son œuvre à plat, sans exiger de 2e photo', () => {
  const page = code('sections/page-cart-items.liquid')
  const i = flatIndex(page, 'item.product')
  assert.match(page, new RegExp(`assign image = item\\.variant\\.featured_image\\.src \\| default: item\\.product\\.images\\[${i}\\]\\.src \\| default: item\\.product\\.featured_image\\.src`))
  assert.match(page, new RegExp(`{% if item\\.product\\.images\\[${i}\\] %}`), 'la vignette s’affiche dès que l’œuvre à plat existe')
  assert.doesNotMatch(page, /images\[1\]|alts\.value\[1\]/, 'plus aucune 2e photo en dur')
})

/* Les deux passes du tiroir sur les lignes du panier : la 1re compte les tableaux à proposer en lot, la 2e
   rend les lignes et leurs suggestions. */
function drawerPasses() {
  const drawer = code('sections/tw-cart-drawer.liquid')
  const first = drawer.indexOf('{% for item in cart.items %}')
  const second = drawer.indexOf('{% for item in cart.items %}', first + 1)
  assert.ok(first > 0 && second > first, 'les deux passes du tiroir')
  return { first: drawer.slice(first, second), second: drawer.slice(second) }
}

test('tiroir, 1re passe : le format d’une toile et celui de chaque tableau du lot viennent de leur œuvre à plat', () => {
  const { first } = drawerPasses()
  const i = flatIndex(first, 'item.product')
  const b = flatIndex(first, 'bundle')
  assert.match(first, new RegExp(`assign bundle_ratio = bundle\\.images\\[${b}\\]\\.aspect_ratio`))
  assert.match(first, new RegExp(`{% if item\\.product\\.images\\[${i}\\]\\.aspect_ratio < 1 %}`))
})

test('tiroir, 2e passe : vignette et format de la ligne, image et format de chaque tableau du lot, d’après l’œuvre à plat', () => {
  const { second } = drawerPasses()
  const i = flatIndex(second, 'item.product')
  const b = flatIndex(second, 'bundle')
  assert.match(second, new RegExp(`assign item_image = item\\.product\\.images\\[${i}\\] \\| default: item\\.product\\.featured_image`))
  assert.match(second, new RegExp(`assign bundle_ratio = bundle\\.images\\[${b}\\]\\.aspect_ratio`))
  assert.match(second, new RegExp(`assign bundle_image = bundle\\.images\\[${b}\\]\\.src \\| image_url: width: 80 \\| default: bundle\\.featured_image\\.src \\| image_url: width: 80`))
})

test('tiroir : plus aucune 2e photo en dur', () => {
  assert.doesNotMatch(code('sections/tw-cart-drawer.liquid'), /images\[1\]/)
})

test('page panier : le texte alternatif de la vignette est celui de l’œuvre à plat (métachamp, puis image)', () => {
  const page = code('sections/page-cart-items.liquid')
  const i = flatIndex(page, 'item.product')
  const alt = /alt="({% if custom_preview_url != blank %}[\s\S]*?{% endif %})"/.exec(page)
  assert.ok(alt, 'le texte alternatif de la vignette')
  assert.match(alt[1], new RegExp(`{% elsif item\\.product\\.metafields\\.meta_object\\.media\\.value\\.alts\\.value\\[${i}\\] %}{{ item\\.product\\.metafields\\.meta_object\\.media\\.value\\.alts\\.value\\[${i}\\] \\| escape }}{% else %}{{ item\\.product\\.images\\[${i}\\]\\.alt \\| escape }}{% endif %}`))
})
