// Les vignettes de collection des nouveaux produits (décision 18 du dossier .scratch/fiche-3d ; essai, notes
// et code de référence dans .scratch/fiche-3d/vignettes-collection) : une seule image, l'œuvre à plat, mise
// en objet par le navigateur. La toile de face, le poster sous verre ; les cartes des anciens produits ne
// changent pas. Le rendu Liquid se vérifie au banc ; ici, les contrats du balisage avec le CSS et les
// scripts du thème.
// Lancer : node --test scripts/oeuvre-card.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Le code Liquid d'un fichier, sans ses commentaires {% comment %} (ils citent du code).
const code = (file) => read(file).replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')

// La branche d'un `when` du snippet artwork-kind : jusqu'au `when` suivant, ou à `endcase`.
const whenBranch = (source, suffix) => {
  const m = new RegExp(`when '${suffix}'([\\s\\S]*?)(?=\\n\\s*(?:when |endcase))`).exec(source)
  assert.ok(m, `when '${suffix}' introuvable`)
  return m[1]
}

test('artwork-kind, avec image_unique : seul le modèle oeuvre-3d répond, la toile et le poster de toujours non', () => {
  const kind = code('snippets/artwork-kind.liquid')
  assert.match(whenBranch(kind, 'painting'), /unless image_unique\s+echo 'toile'\s+endunless/)
  assert.match(whenBranch(kind, 'poster'), /unless image_unique\s+echo 'poster'\s+endunless/)
  assert.doesNotMatch(whenBranch(kind, 'oeuvre-3d'), /image_unique/)
  assert.match(read('snippets/artwork-kind.liquid'), /^\s*- image_unique: /m, 'paramètre décrit dans « Accepts »')
})

/* La carte (snippets/card-product.liquid) : la nouvelle vignette d'abord, l'ancien balisage ensuite, tel quel.
   Rend { choice, branch, old } : le test qui choisit la vignette, son balisage, et celui des autres cartes. */
function cardBranches() {
  const card = code('snippets/card-product.liquid')
  const m = /{%-\s*if (vignette != blank[^%]*?)\s*-%}([\s\S]*?){%-\s*elsif primary_image\s*-%}([\s\S]*?){%-\s*endif\s*-%}\s*{% render 'card-product-info'/.exec(card)
  assert.ok(m, 'la nouvelle vignette, puis l’ancien balisage en elsif primary_image')
  return { card, choice: m[1], branch: m[2], old: m[3] }
}

test('carte : la vignette d’œuvre pour les seuls produits à image unique dont la 1re image est une image', () => {
  const { card, choice, old } = cardBranches()
  assert.match(card, /capture vignette -%}{% render 'artwork-kind', product: product, suffix: product\.template_suffix, image_unique: true %}/)
  assert.match(choice, /product\.media\[0\]\.media_type == 'image'/)
  // L'ancien balisage n'a pas bougé : son image, son texte alternatif (index 1) et son décalage.
  assert.match(old, /<div class="skeleton overflow-hidden relative w-full duration-100" style="aspect-ratio: {{ primary_image\.width }} \/ {{ primary_image\.height }}">/)
  assert.match(old, /alts\.value\[1\][\s\S]*product\.media\[1\]\.alt/)
  assert.equal((old.match(/class="(?:lqip )?w-full h-full object-contain translate-x-1"/g) || []).length, 2)
})

test('vignette : la face porte .skeleton et contient l’image elle-même (removeSkeletonOnImagesLoad, tw-global.js)', () => {
  const { branch } = cardBranches()
  const faces = branch.match(/<div class="oeuvre-card-face skeleton">[\s\S]*?<\/div>/g) || []
  assert.equal(faces.length, 1)
  // Entre la face et ses <img> : rien que du Liquid (eager ou lazy), aucun autre élément.
  const inside = faces[0].replace(/{%-?[\s\S]*?-?%}/g, '').replace(/^<div[^>]*>|<\/div>$/g, '')
  assert.deepEqual([...inside.matchAll(/<(\w+)/g)].map((t) => t[1]), ['img', 'img'])
  assert.match(inside, /data-srcset="{{ art_srcset }}"[\s\S]*class="lqip w-full h-full object-cover"/)
  assert.match(inside, /srcset="{{ art_srcset }}"[\s\S]*loading="eager"/)
})

test('vignette : texte alternatif de l’image 0, celle de l’œuvre (et non de l’image 1, absente)', () => {
  const { branch } = cardBranches()
  assert.match(branch, /alts\.value\[0\][\s\S]*art\.alt/)
  assert.doesNotMatch(branch, /\[1\]/)
  for (const img of branch.match(/<img[\s\S]*?>/g)) assert.match(img, /alt="{{ art_alt }}"/)
})

test('vignette : le décor vide passe la règle *:empty du thème (data-allow-empty), et la vitre est muette', () => {
  const { branch } = cardBranches()
  const empty = [...branch.matchAll(/<(\w+)([^>]*)><\/\1>/g)].filter((t) => t[1] !== 'script')
  assert.ok(empty.length > 0)
  for (const [element, , attrs] of empty) assert.match(attrs, /data-allow-empty/, element)
  assert.match(branch, /<span class="oeuvre-card-glass" aria-hidden="true">/)
})

/* Les règles de la vignette dans input.css : le bloc « Vignette d'œuvre », de son titre à sa fin. Rend aussi
   la profondeur d'accolades à son début (0 : hors de tout @layer). */
function vignetteCss() {
  const css = read('input.css')
  const start = css.indexOf('/* ==== Vignette d\'œuvre')
  const end = css.indexOf('/* ==== Vignette d\'œuvre (fin)')
  assert.ok(start > 0 && end > start, 'bloc « Vignette d’œuvre » (début, fin) dans input.css')
  const depth = [...css.slice(0, start).replace(/\/\*[\s\S]*?\*\//g, '')].reduce((d, c) => d + (c === '{') - (c === '}'), 0)
  return { block: css.slice(start, end), depth }
}
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`)
  assert.ok(at >= 0, `règle ${selector}`)
  return css.slice(at, css.indexOf('}', at))
}

test('CSS : hors de tout @layer, et chaque classe du balisage y a sa règle', () => {
  const { block, depth } = vignetteCss()
  assert.equal(depth, 0, 'le bloc est hors @layer (et hors de toute règle)')
  const { branch } = cardBranches()
  const attrs = [...branch.matchAll(/class="([^"]*)"/g)].map((m) => m[1].replace(/{%[\s\S]*?%}/g, ' ')).join(' ')
  const classes = new Set(attrs.match(/\boeuvre-card[\w-]*|no-contour/g))
  assert.ok(classes.size >= 7)
  for (const name of classes) assert.match(block, new RegExp(`\\.${name}(?![\\w-])`), name)
})

test('CSS : la vignette laisse les clics au lien étiré du titre, et se peint au-dessus de lui', () => {
  const card = rule(vignetteCss().block, '.oeuvre-card')
  assert.match(card, /pointer-events: none/)
  assert.match(card, /position: relative/)
  assert.match(card, /z-index: 1/)
})

test('CSS : scène et vitre en overflow: clip (hidden figerait le reflet : la timeline view() se mesurerait contre elles)', () => {
  const { block } = vignetteCss()
  for (const selector of ['.oeuvre-card-stage', '.oeuvre-card-glass']) {
    const r = rule(block, selector)
    assert.match(r, /overflow: clip/, selector)
    assert.doesNotMatch(r, /overflow: hidden/, selector)
  }
  assert.match(rule(block, '.oeuvre-card-glass'), /view-timeline: --oc-glass block/)
})

test('CSS : la face reste à sa place pendant le chargement (.skeleton la met en position: relative)', () => {
  assert.match(rule(vignetteCss().block, '.oeuvre-card .oeuvre-card-face'), /position: absolute/)
})

test('CSS : animations réduites, le reflet reste immobile', () => {
  const { block } = vignetteCss()
  assert.match(block, /@media \(prefers-reduced-motion: reduce\) {\s*\.oeuvre-card-glare { animation: none !important; translate: 0 -62% !important; }/)
})

test('CSS : poster sous verre et cadre noir seulement ; le papier libre (A) et les autres teintes restent dans l’essai', () => {
  const rules = vignetteCss().block.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(rules, /papier|paper-edge|data-frame/)
  assert.match(rule(rules, '.oeuvre-card[data-look="verre"]'), /--frame: #353535/)
})

test('reflet : le poster sous verre charge son script en module (une exécution par page), la toile non', () => {
  const { branch } = cardBranches()
  const tags = branch.match(/<script[^>]*>/g) || []
  assert.deepEqual(tags, [`<script type="module" src="{{ 'oeuvre-card-reflet.js' | asset_url }}">`])
  const before = branch.slice(0, branch.indexOf('<script'))
  assert.match(before, /{%-\s*if vignette == 'poster'\s*-%}\s*$/, 'sous la condition du poster')
})

test('reflet : les cartes reçues par fetch (défilement infini, filtres, « Mes j’aime ») importent leur module, dont les balises ne s’exécutent pas', () => {
  for (const [file, scope] of [['assets/collection.js', 'node'], ['assets/collection-tag-filter.js', 'insertedGrid'], ['assets/my-likes.js', 'grid']]) {
    assert.match(read(file), new RegExp(`${scope}\\.querySelectorAll\\('script\\[type="module"\\]\\[src\\]'\\)\\.forEach\\(\\(script\\) => import\\(script\\.src\\)\\)`), file)
  }
})

test('données Google de la collection (ItemList) : l’œuvre à plat, 1re image des nouveaux produits, 2e des autres (snippet artwork-flat-index)', () => {
  const grid = read('sections/main-collection-product-grid.liquid')
  const ld = /<script type="application\/ld\+json">[\s\S]*?<\/script>/.exec(grid)[0]
  const image = /{%-\s*liquid([\s\S]*?)-%}\s*"image": "{{ product_image }}"/.exec(ld)
  assert.ok(image, 'le bloc qui choisit l’image')
  const block = image[1].replace(/^\s*#.*$/gm, '')
  assert.match(block, /capture (\w+)\s+render 'artwork-flat-index', product: product\s+endcapture\s+assign \1 = \1 \| plus: 0\s+assign ld_image = product\.images\[\1\]\s/)
  assert.match(block, /assign product_image = ld_image \| image_url: width: ld_image\.preview_image\.width \| prepend: "https:"/)
  assert.doesNotMatch(block, /artwork-kind|images\[[01]\]/, 'la règle vient du snippet, sans copie')
})

test('la feuille de style compilée (assets/output.css) porte la vignette : Tailwind a été relancé', () => {
  const out = read('assets/output.css')
  assert.match(out, /\.oeuvre-card-glass{[^}]*overflow:clip[^}]*}/)
  assert.match(out, /view-timeline:--oc-glass block/)
  assert.match(out, /animation-range:cover 12% cover 88%/)
  assert.match(out, /\.oeuvre-card \.oeuvre-card-face{position:absolute/)
})
