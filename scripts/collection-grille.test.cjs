// La grille de la nouvelle page collection, ticket 05 (dossier .scratch/collection-design) : la section
// sections/collection-grille.liquid, qui remplace main-collection-product-grid dans le modèle caché
// templates/collection.refonte.json (vue ?view=refonte), et sa carte, snippets/collection-carte.liquid. Toutes les
// cartes montrent l'œuvre seule, en objet sur fond blanc (snippets/artwork-object.liquid), anciens produits compris ;
// dessous, le nom court, « Dès 62,50 € » et le cœur. Les tableaux arrivent 24 par 24 (<infinite-scroll>,
// assets/collection.js), avec « 48 tableaux sur 327 » et une jauge ; les liens ?page=N et la liste ItemList restent.
// Ici, le rendu Liquid (liquidjs) : sans lui, ces tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-grille.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('vm')
const { read, code, json, schemaOf, rules, blocs, SKIP, engine, ldOf, LANGS, locales, image: imageDuBanc, asMedia } = require('./galerie-banc.cjs')

const CARTE = 'collection-carte'
const GRILLE = 'sections/collection-grille.liquid'
const ANCIENNE = 'sections/main-collection-product-grid.liquid'
// La section d'avant le ticket 05, figée : la référence de « rend le même HTML qu'avant ».
const ANCIENNE_AVANT = 'scripts/fixtures/main-collection-product-grid.avant-refonte.liquid'

/* ---------- Des produits d'essai, tels que les donne collection.products ---------- */

// Les fichiers des images d'essai (scripts/galerie-banc.cjs : image, asMedia).
const FILES = '//www.myselfmonart.com/cdn/shop/files/'
let lastId = 900000000000

/* Un produit de la grille : son modèle de page, ses images (dans l'ordre de product.images), son titre court, son
   plus bas prix. Un poster de la fiche 3D se reconnaît à son métachamp frames_poster (snippet artwork-kind). */
function produit({ handle, title, suffix, files, short = '', price = 6250, poster = false }) {
  const images = files.map(([file, width, height]) => imageDuBanc(++lastId, file, width, height))
  return {
    id: ++lastId,
    handle,
    title,
    url: `/products/${handle}`,
    template_suffix: suffix,
    images,
    media: images.map(asMedia),
    featured_media: asMedia(images[0]),
    price_min: price,
    description: `<p>Description de ${title}.</p>`,
    metafields: {
      title: { short },
      painting_options: { frames_poster: poster ? { value: [{ name: 'Noir', system: { handle: 'noir' } }] } : null },
      meta_object: {},
    },
  }
}

// Un nouveau produit (fiche 3D) : sa seule image, l'œuvre à plat, puis la photo studio que le serveur ajoute.
const nouvelleToile = () => produit({
  handle: 'tableau-superman-envol', title: 'Tableau Superman - Envol au-dessus de la ville', suffix: 'oeuvre-3d', short: 'Superman en vol',
  files: [['superman-oeuvre.jpg', 1500, 2000], ['superman-studio.jpg', 2000, 2000]],
})
const nouveauPoster = () => produit({
  handle: 'poster-superman-envol', title: 'Poster Superman - Envol au-dessus de la ville', suffix: 'oeuvre-3d', short: 'Superman en vol', price: 2490, poster: true,
  files: [['poster-superman-oeuvre.jpg', 1500, 2000], ['poster-superman-studio.jpg', 2000, 2000], ['poster-superman-passe-partout.jpg', 1588, 1588]],
})
// Un produit de toujours : la photo d'ambiance d'abord, l'œuvre à plat en 2e (relevé en ligne le 23/11/2026).
const ancienneToile = () => produit({
  handle: 'creation-artistique-montagnes-du-japon-apaisantes', title: 'Tableau mural Montagnes du Japon - Sérénité zen', suffix: 'painting', short: 'Voile sur fleuve',
  files: [['tableau-paysage-japonais-montagnes-sepia-rouge.jpg', 1588, 1865], ['tableau-paysage-fleuve-japon.jpg', 1440, 1920], ['tableau-japonais-ambiance.jpg', 2982, 2982], ['tableau-salon-moderne.jpg', 1900, 2329], ['tableau-japonais-texture-toile.jpg', 3000, 3000]],
})
const ancienPoster = () => produit({
  handle: 'poster-marguerites-blanches-fraicheur-lumineuse-sur-fond-nocturne', title: 'Poster Marguerites blanches - Fraîcheur lumineuse sur fond nocturne', suffix: 'poster', short: 'Marguerites blanches', price: 2490,
  files: [['poster-marguerites-0.jpg', 1588, 1588], ['poster-marguerites.png', 1086, 1448], ['poster-marguerites-vierge-2.jpg', 2400, 2400], ['poster-marguerites-0-passe-partout.jpg', 1588, 1588]],
})
// Un produit de toujours dont l'œuvre à plat manque (une seule photo) : il garde la carte d'aujourd'hui.
const sansOeuvre = () => produit({
  handle: 'tableau-une-seule-photo', title: 'Tableau Une seule photo', suffix: 'painting', short: 'Une seule photo',
  files: [['tableau-une-seule-photo-salon.jpg', 1588, 1865]],
})

/* ---------- Le rendu ---------- */

const globals = (lang = 'fr') => ({
  request: { locale: { iso_code: lang }, origin: 'https://www.myselfmonart.com' },
  shop: { name: 'MyselfMonArt', url: 'https://www.myselfmonart.com' },
  settings: {},
  cart: { currency: { iso_code: 'EUR', symbol: '€' } },
})
const carte = (product, { lazy = true, lang = 'fr' } = {}) => engine(lang).renderFile(CARTE, { product, lazy }, { globals: globals(lang) })

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// Le texte d'un rendu : les balises de texte (a, b, span) ne coupent pas les mots, les autres oui.
const texte = (html) => unescape(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<\/?(a|b|span)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
// Les balises <img> d'un rendu, et un attribut d'une balise.
const imgs = (html) => html.match(/<img\b[^>]*>/g) || []
const attr = (tag, name) => (new RegExp(`\\s${name}="([^"]*)"`).exec(tag) || [])[1]

/* ---------- La carte ---------- */

test('la carte d’un nouveau produit : l’œuvre en objet, son nom court, « Dès », le cœur, un lien qui couvre la carte', { skip: SKIP }, async () => {
  const p = nouvelleToile()
  const html = (await carte(p)).trim()
  // Une carte de la liste.
  assert.match(html, /^<li class="refonte-carte">/)
  assert.match(html, /<\/li>$/)
  // L'œuvre seule, en toile de face, sans cadre : la vignette des nouveaux produits (snippets/artwork-object.liquid).
  assert.match(html, /<div\s+class="oeuvre-card"\s+data-kind="toile"\s+style="--r: 0\.75">/)
  assert.doesNotMatch(html, /data-frame=/)
  const [art] = imgs(html)
  assert.equal(imgs(html).length, 1, 'une seule image : l’œuvre à plat')
  assert.ok(attr(art, 'data-srcset').includes(`${FILES}superman-oeuvre.jpg?v=1&width=400 400w`), 'l’œuvre à plat, 1re image d’un nouveau produit')
  assert.equal(attr(art, 'width'), '1500')
  assert.equal(attr(art, 'height'), '2000')
  // Le nom court, le lien vers la fiche et, pour les lecteurs d'écran, le titre entier.
  const lien = /<a class="refonte-carte-lien" href="([^"]+)">([\s\S]*?)<\/a>/.exec(html)
  assert.ok(lien, 'le lien de la carte')
  assert.equal(lien[1], '/products/tableau-superman-envol')
  assert.match(lien[2], /^Superman en vol<span class="sr-only left-0 top-0">, Tableau Superman - Envol au-dessus de la ville<\/span>$/)
  assert.match(html, /<h3 class="refonte-carte-nom">\s*<a class="refonte-carte-lien"/)
  // Le prix : le plus bas, « Dès ».
  assert.match(html, /<p class="refonte-carte-prix">Dès 62,50 €<\/p>/)
  // Le cœur de toutes les cartes (snippets/my-like-button.liquid).
  assert.match(html, new RegExp(`<my-like-button data-product-id="${p.id}" data-product-handle="tableau-superman-envol">`))
})

test('la carte d’un ancien produit : son œuvre à plat (2e image), jamais sa photo d’ambiance', { skip: SKIP }, async () => {
  const p = ancienneToile()
  const html = await carte(p)
  assert.match(html, /^<li class="refonte-carte">/)
  assert.match(html, /<div\s+class="oeuvre-card"\s+data-kind="toile"\s+style="--r: 0\.75">/)
  const [art] = imgs(html)
  assert.equal(imgs(html).length, 1)
  assert.ok(attr(art, 'data-srcset').startsWith(`${FILES}tableau-paysage-fleuve-japon.jpg?v=1&width=200 200w,`), 'la 2e image')
  assert.equal(attr(art, 'width'), '1440')
  assert.doesNotMatch(html, /montagnes-sepia-rouge|tableau-salon-moderne/, 'ni la photo d’ambiance ni une autre')
  assert.match(texte(html), /^Voile sur fleuve, Tableau mural Montagnes du Japon - Sérénité zen Dès 62,50 €$/)
})

test('la carte d’un poster : sous verre, au cadre noir, avec son contour blanc si sa fiche le propose, et le reflet de sa vitre', { skip: SKIP }, async () => {
  for (const p of [ancienPoster(), nouveauPoster()]) {
    const html = await carte(p)
    assert.match(html, /<div\s+class="oeuvre-card"\s+data-kind="poster" data-look="verre" data-frame="noir"\s+style="--r: 0\.75">/, p.handle)
    assert.match(html, /<span class="oeuvre-card-glare" data-allow-empty><\/span>/, p.handle)
    // Le reflet qui passe sur la vitre, là où le CSS seul ne sait pas le faire : un module, une fois par page.
    assert.equal((html.match(/<script type="module" src="[^"]*oeuvre-card-reflet\.js[^"]*"><\/script>/g) || []).length, 1, p.handle)
    assert.match(html, /<p class="refonte-carte-prix">Dès 24,90 €<\/p>/, p.handle)
  }
  // Sans image « passe-partout », pas de contour blanc.
  const nu = ancienPoster()
  nu.images = nu.images.filter((img) => !img.src.includes('passe-partout'))
  nu.media = nu.images.map(asMedia)
  assert.match(await carte(nu), /<div\s+class="oeuvre-card no-contour"\s+data-kind="poster"/)
  // L'œuvre à plat d'un ancien poster : sa 2e image ; d'un nouveau : sa 1re.
  assert.ok(attr(imgs(await carte(ancienPoster()))[0], 'data-srcset').startsWith(`${FILES}poster-marguerites.png?v=1&width=200 200w,`))
  assert.ok(attr(imgs(await carte(nouveauPoster()))[0], 'data-srcset').startsWith(`${FILES}poster-superman-oeuvre.jpg?v=1&width=200 200w,`))
})

test('repli : un produit sans œuvre à plat, ou qui n’est pas une œuvre, garde la carte d’aujourd’hui', { skip: SKIP }, async () => {
  const tapisserie = { ...ancienneToile(), template_suffix: 'tapestry' }
  for (const p of [sansOeuvre(), tapisserie]) {
    const html = (await carte(p)).trim()
    assert.match(html, /^<li class="refonte-carte refonte-carte-repli">/, p.handle)
    assert.match(html, /<\/li>$/, p.handle)
    // La carte d'aujourd'hui (snippets/card-product.liquid), telle quelle : sa 1re image, son nom en capitales.
    assert.equal(html.replace(/^<li class="refonte-carte refonte-carte-repli">|<\/li>$/g, ''), await engine('fr').renderFile('card-product', { product: p, primary_image_index: 1, next_image_index: 0, lazy_load: true }, { globals: globals() }), p.handle)
    assert.doesNotMatch(html, /oeuvre-card|refonte-carte-prix/, p.handle)
  }
})

test('le nom : le titre court tel qu’il est écrit, sa première lettre en capitale ; tout en capitales, il passe en minuscules ; à défaut, le titre', { skip: SKIP }, async () => {
  const nom = async (short, title = 'Tableau mural Montagnes du Japon - Sérénité zen') => {
    const p = ancienneToile()
    p.metafields.title.short = short
    p.title = title
    return /<a class="refonte-carte-lien" href="[^"]+">([^<]*)/.exec(await carte(p))[1]
  }
  assert.equal(await nom('Voile sur fleuve'), 'Voile sur fleuve')
  assert.equal(await nom('Soir à Paris'), 'Soir à Paris', 'les noms propres gardent leur capitale')
  assert.equal(await nom('VOILE SUR FLEUVE'), 'Voile sur fleuve')
  assert.equal(await nom('élan sauvage'), 'Élan sauvage')
  assert.equal(await nom('  '), 'Tableau mural Montagnes du Japon - Sérénité zen')
  // Sans titre court, le titre entier n'est pas répété pour les lecteurs d'écran.
  const p = ancienneToile()
  p.metafields.title.short = ''
  assert.doesNotMatch(await carte(p), /sr-only/)
})

test('le prix « Dès », le plus bas du produit, dans les cinq langues', { skip: SKIP }, async () => {
  const DES = { fr: 'Dès 62,50 €', en: 'From 62,50 €', de: 'Ab 62,50 €', es: 'Desde 62,50 €', nl: 'Vanaf 62,50 €' }
  for (const [lang, attendu] of Object.entries(DES)) {
    const html = await carte(ancienneToile(), { lang })
    assert.equal(/<p class="refonte-carte-prix">([^<]*)<\/p>/.exec(html)[1], attendu, lang)
  }
})

test('les images : l’attribut sizes de la grille qui montre la carte ; ailleurs, la vignette d’œuvre garde le sien', { skip: SKIP }, async () => {
  const SIZES = '(min-width: 1336px) 238px, (min-width: 1100px) 20vw, (min-width: 700px) 27vw, 40vw'
  const html = await engine('fr').renderFile(CARTE, { product: ancienneToile(), lazy: true, sizes: SIZES }, { globals: globals() })
  assert.equal(attr(imgs(html)[0], 'sizes'), SIZES)
  // La vignette d'œuvre des autres pages (carte des collections d'aujourd'hui, « Mes j'aime ») : sans sizes, les
  // siens, ceux de la grille .product-grid, toile ou poster à contour blanc.
  const vignette = (contour) => engine('fr').renderFile('artwork-object', { product: nouvelleToile(), image: nouvelleToile().media[0], kind: contour ? 'poster' : 'toile', contour, context: 'carte', lazy: true }, { globals: globals() })
  assert.equal(attr(imgs(await vignette(false))[0], 'sizes'), '(min-width: 1280px) 240px, (min-width: 1024px) 26vw, 39vw')
  assert.equal(attr(imgs(await vignette(true))[0], 'sizes'), '(min-width: 1280px) 200px, (min-width: 1024px) 22vw, 33vw')
})

test('les images : chargées tout de suite et en priorité pour les deux premières cartes, différées ensuite', { skip: SKIP }, async () => {
  const [tot] = imgs(await carte(ancienneToile(), { lazy: false }))
  assert.equal(attr(tot, 'loading'), 'eager')
  assert.equal(attr(tot, 'fetchpriority'), 'high')
  assert.ok(attr(tot, 'srcset'))
  const [tard] = imgs(await carte(ancienneToile(), { lazy: true }))
  assert.equal(attr(tard, 'loading'), 'lazy')
  assert.equal(attr(tard, 'fetchpriority'), undefined)
  assert.ok(attr(tard, 'data-srcset'), 'l’image entière arrive par assets/tw-global.js')
})

/* ---------- La section ---------- */

/* {% paginate %} de Shopify, pour liquidjs : la page vient de current_page (global de Shopify), les produits de la
   page remplacent la liste dans le bloc et après lui (comme en ligne : la liste ItemList, écrite après le bloc, a les
   24 produits de la page), et paginate dit les pages et leurs adresses (?page=N). */
function paginate(e) {
  e.registerTag('paginate', {
    parse(token, remain) {
      const m = /^\s*([\w.]+)\s+by\s+(\d+)\s*$/.exec(token.args)
      assert.ok(m, `paginate ${token.args}`)
      this.path = m[1].split('.')
      this.by = Number(m[2])
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endpaginate', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('paginate non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      const owner = yield ctx._get(this.path.slice(0, -1))
      const key = this.path[this.path.length - 1]
      const all = owner[key]
      const pages = Math.max(1, Math.ceil(all.length / this.by))
      const current = Math.min(Math.max(1, Number(ctx.globals.current_page) || 1), pages)
      const part = (n) => ({ title: String(n), url: `${owner.url}?page=${n}`, is_link: n !== current })
      const pagination = {
        current_page: current,
        current_offset: (current - 1) * this.by,
        items: all.length,
        page_size: this.by,
        pages,
        parts: pages > 1 ? Array.from({ length: pages }, (_, i) => part(i + 1)) : [],
        previous: current > 1 ? part(current - 1) : undefined,
        next: current < pages ? part(current + 1) : undefined,
      }
      owner[key] = all.slice(pagination.current_offset, pagination.current_offset + this.by)
      ctx.push({ paginate: pagination })
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      ctx.pop()
    },
  })
}
/* Les pluriels de Shopify, que le filtre t du banc commun laisse de côté : une clé à « one » et « other », choisie par
   count (« one » pour 1, et pour 0 en français). */
function pluriels(e, lang) {
  e.registerFilter('t', (key, ...args) => {
    const values = Object.fromEntries(args.filter(Array.isArray))
    let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
    if (text && typeof text === 'object' && 'count' in values) {
      const n = Number(values.count)
      text = n === 1 || (lang === 'fr' && n === 0) ? text.one : text.other
    }
    if (typeof text !== 'string') return key
    return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
  })
}
if (!SKIP) for (const lang of Object.keys(LANGS)) { paginate(engine(lang)); pluriels(engine(lang), lang) }

/* Une collection d'essai : n produits, anciens et nouveaux mêlés, chacun unique ; la même à chaque appel (mêmes
   identifiants), pour comparer deux rendus. */
function collection(n, { handle = 'tableaux-nature-sauvage', title = 'Tableaux Nature', type = 'painting' } = {}) {
  lastId = 700000000000
  const modeles = type === 'poster' ? [ancienPoster, nouveauPoster] : [ancienneToile, ancienneToile, nouvelleToile]
  const products = Array.from({ length: n }, (_, i) => {
    const p = modeles[i % modeles.length]()
    p.handle = `${p.handle}-${i + 1}`
    p.url = `/products/${p.handle}`
    p.title = `${p.title} (${i + 1})`
    return p
  })
  return {
    id: 607047844187, handle, title, url: `/collections/${handle}`, description: '<p>Respirez.</p>',
    products, products_count: n, all_products_count: n, filters: [],
    metafields: { custom: { type_of_collection: type } },
  }
}

/* Une section rendue sur la page d'une collection, à une page donnée (?page=N), sans son schéma ; filtres : les
   réglages du thème qui affichent les filtres de la grille d'aujourd'hui. */
const sources = new Map()
async function section(file, { col, page = 1, lang = 'fr', settings = {}, filtres = false }) {
  const e = engine(lang)
  const key = `${lang} ${file}`
  if (!sources.has(key)) sources.set(key, e.parse(read(file).slice(0, read(file).indexOf('{% schema %}'))))
  const theme = filtres ? { enable_painting_filtering: true, enable_poster_filtering: true, enable_tapestry_filtering: true, enable_other_filtering: true } : {}
  return e.render(sources.get(key), {}, {
    globals: { ...globals(lang), settings: theme, collection: col, current_page: page, section: { id: 'template--1__grille', settings } },
  })
}
const grille = (col, options = {}) => section(GRILLE, { col, ...options })

// Les réglages de la grille d'aujourd'hui dans les modèles de collection (templates/collection.json).
const REGLAGES = { primary_image_index: 1, next_image_index: 0, margin_top: 'mt-0' }
// Les cas de la grille d'aujourd'hui : une ou plusieurs pages, chaque page, toiles et posters, filtres ou non.
const CAS = [
  ['une seule page', () => collection(10), 1, false],
  ['page 1 sur 3', () => collection(50), 1, false],
  ['page 2 sur 3', () => collection(50), 2, false],
  ['dernière page', () => collection(50), 3, false],
  ['posters, filtres affichés', () => collection(30, { handle: 'posters-affiches-nature', title: 'Poster & Affiche Nature', type: 'poster' }), 1, true],
  ['collection vide', () => collection(0), 1, false],
]

test('la grille d’aujourd’hui rend le même HTML qu’avant (sa liste ItemList vient du snippet commun)', { skip: SKIP }, async () => {
  for (const lang of ['fr', 'en']) {
    for (const [nom, col, page, filtres] of CAS) {
      const options = { page, lang, settings: REGLAGES }
      const avant = await section(ANCIENNE_AVANT, { col: col(), ...options, filtres })
      const apres = await section(ANCIENNE, { col: col(), ...options, filtres })
      assert.equal(apres, avant, `${nom}, ${lang}`)
    }
  }
})

test('la section : la même liste ItemList que la grille d’aujourd’hui, sur la même collection', { skip: SKIP }, async () => {
  for (const [nom, col, page] of CAS) {
    const avant = ldOf(await section(ANCIENNE_AVANT, { col: col(), page, settings: REGLAGES }))
    const grilleLd = ldOf(await grille(col(), { page }))
    assert.equal(avant.length, 1, nom)
    assert.deepEqual(grilleLd, avant, nom)
    const liste = JSON.parse(grilleLd[0])
    assert.equal(liste['@type'], 'ItemList', nom)
    assert.equal(liste.itemListElement.length, Math.min(24, Math.max(0, col().products.length - (page - 1) * 24)), `${nom} : les produits de la page`)
  }
})

test('la section : 24 cartes par page, toutes de la nouvelle carte, et aucun h1', { skip: SKIP }, async () => {
  const html = await grille(collection(50))
  const cartes = html.match(/<li class="refonte-carte(?: [^"]*)?">/g) || []
  assert.equal(cartes.length, 24)
  assert.equal(html.match(/<li class="refonte-carte">/g).length, 24, 'aucune carte de repli')
  assert.doesNotMatch(html, /<h1\b/)
  // Les deux premières images tout de suite et en priorité, les autres différées ; toutes à la taille de leur place
  // dans la grille (à 390 px : 0,8 × (390 − 40 − 8) / 2 ≈ 137 px).
  const tags = imgs(html)
  assert.deepEqual(tags.map((tag) => attr(tag, 'loading')), ['eager', 'eager', ...Array(22).fill('lazy')])
  assert.equal(tags.filter((tag) => attr(tag, 'fetchpriority') === 'high').length, 2)
  for (const tag of tags) assert.equal(attr(tag, 'sizes'), '(min-width: 1336px) 237px, (min-width: 1100px) calc(20vw - 30px), (min-width: 900px) calc(26.67vw - 33px), (min-width: 700px) calc(26.67vw - 18px), calc(40vw - 19px)')
  // La dernière page : ce qui reste.
  assert.equal((await grille(collection(50), { page: 3 })).match(/<li class="refonte-carte">/g).length, 2)
})

test('la section : ses places dans l’ordre, le titre invisible, la ligne des filtres à venir, la zone parlée', { skip: SKIP }, async () => {
  const html = await grille(collection(50))
  assert.match(html, /^\s*<section id="grille" class="refonte-grille" aria-labelledby="grille-titre">/)
  // Le titre, pour les lecteurs d'écran (la grille a son nom dans le plan de la page, sous le h1 de l'entrée).
  assert.match(html, /<h2 id="grille-titre" class="sr-only">Les tableaux nature<\/h2>/)
  // L'ordre de la maquette : la ligne des filtres (ticket 06), la liste, la suite, les liens des pages, la zone parlée.
  const ids = [...html.matchAll(/\sid="(grille-titre|ancre-barre|barre|liste|suite|pages|statut)"/g)].map((m) => m[1])
  assert.deepEqual(ids, ['grille-titre', 'ancre-barre', 'barre', 'liste', 'suite', 'pages', 'statut'])
  // Les places encore vides passent la règle *:empty du thème (input.css) : la zone parlée doit exister pour parler.
  for (const id of ['ancre-barre', 'barre', 'statut']) assert.match(html, new RegExp(`<div id="${id}"[^>]*\\sdata-allow-empty>`), id)
  assert.match(html, /<div id="statut" class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-allow-empty><\/div>/)
  // Le titre dans les cinq langues.
  const TITRES = { fr: 'Les tableaux nature', en: 'The tableaux nature', de: 'Die Tableaux Nature', es: 'Selección de tableaux nature', nl: 'De tableaux nature' }
  for (const [lang, titre] of Object.entries(TITRES)) {
    assert.equal(/<h2 id="grille-titre" class="sr-only">([^<]*)<\/h2>/.exec(await grille(collection(5), { lang }))[1], titre, lang)
  }
})

test('la section : les liens ?page=N restent, et la suite arrive seule, 700 px avant la fin', { skip: SKIP }, async () => {
  const html = await grille(collection(80))
  // Les liens des pages, pour Google et sans JavaScript (snippets/pagination.liquid).
  const nav = /<div id="pages" class="refonte-pages">\s*(<nav[\s\S]*?<\/nav>)\s*<\/div>/.exec(html)
  assert.ok(nav, 'les liens des pages')
  const hrefs = [...nav[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter(Boolean)
  assert.deepEqual(hrefs, ['/collections/tableaux-nature-sauvage?page=2', '/collections/tableaux-nature-sauvage?page=3', '/collections/tableaux-nature-sauvage?page=4', '/collections/tableaux-nature-sauvage?page=2'])
  // La suite : <infinite-scroll> (assets/collection.js) autour des cartes de la page, avec sa marge de 700 px.
  const suite = /<div id="liste" class="refonte-liste">\s*<infinite-scroll\s([^>]*)>\s*<ul class="refonte-cartes" role="list">/.exec(html)
  assert.ok(suite, 'la liste dans <infinite-scroll>')
  const data = Object.fromEntries([...suite[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  assert.deepEqual(data, {
    id: 'infinite-scroll-607047844187-1', 'data-pages': '4', 'data-page': '1', 'data-section-id': 'template--1__grille', 'data-marge': '700',
    'data-paginate-previous-url': '', 'data-paginate-next-url': '/collections/tableaux-nature-sauvage?page=2',
  })
  // Une seule page : ni suite ni liens.
  const seule = await grille(collection(10))
  assert.doesNotMatch(seule, /<infinite-scroll|<nav/)
  assert.match(seule, /<div id="liste" class="refonte-liste">\s*<ul class="refonte-cartes" role="list">/)
})

test('la suite : « 24 tableaux sur 80 » et sa jauge au bout du lot, puis « Vous avez vu les 80 tableaux. »', { skip: SKIP }, async () => {
  const suite = async (col, options) => /<collection-suite[\s\S]*?<\/collection-suite>/.exec(await grille(col, options))[0]
  const debut = await suite(collection(80))
  assert.match(debut, /^<collection-suite id="suite" class="refonte-suite" data-vus="24" data-total="80" data-statut="statut">/)
  assert.match(debut, /<p class="refonte-suite-compte"><b data-vus>24<\/b> tableaux sur <b>80<\/b><\/p>/)
  assert.match(debut, /<progress class="refonte-jauge" value="24" max="80" aria-hidden="true" data-allow-empty><\/progress>/)
  assert.match(debut, /<p class="refonte-suite-fin" hidden>Vous avez vu les 80 tableaux\.<\/p>/)
  // Arrivé sur la page 3 : le rang du dernier tableau de la page.
  assert.match(await suite(collection(80), { page: 3 }), /<b data-vus>72<\/b> tableaux sur <b>80<\/b>/)
  // La dernière page : la fin, sans compte ni jauge.
  const fin = await suite(collection(80), { page: 4 })
  assert.match(fin, /<p class="refonte-suite-compte" hidden>/)
  assert.match(fin, /<progress class="refonte-jauge" value="80" max="80" aria-hidden="true" data-allow-empty hidden><\/progress>/)
  assert.match(fin, /<p class="refonte-suite-fin">Vous avez vu les 80 tableaux\.<\/p>/)
  // Une page, un tableau.
  assert.match(await suite(collection(1)), /<p class="refonte-suite-fin">Vous avez vu le tableau\.<\/p>/)
  // Les cinq langues.
  const TEXTES = {
    fr: ['24 tableaux sur 80', 'Vous avez vu les 80 tableaux.'],
    en: ['24 of 80 artworks', 'You have seen all 80 artworks.'],
    de: ['24 von 80 Bildern', 'Sie haben alle 80 Bilder gesehen.'],
    es: ['24 de 80 cuadros', 'Ha visto los 80 cuadros.'],
    nl: ['24 van 80 schilderijen', 'U heeft alle 80 schilderijen gezien.'],
  }
  for (const [lang, [compte, vu]] of Object.entries(TEXTES)) {
    const html = await suite(collection(80), { lang })
    assert.equal(texte(/<p class="refonte-suite-compte">[\s\S]*?<\/p>/.exec(html)[0]), compte, lang)
    assert.match(/<b data-vus>(\d+)<\/b>/.exec(html)[1], /^24$/, `${lang} : le nombre que le script tient à jour`)
    assert.equal(texte(/<p class="refonte-suite-fin" hidden>[\s\S]*?<\/p>/.exec(html)[0]), vu, lang)
  }
})

test('la section : une collection vide le dit, sans liste, sans suite, sans liens', { skip: SKIP }, async () => {
  const html = await grille(collection(0))
  assert.match(html, /<p class="refonte-grille-vide">Aucun produit trouvé<\/p>/)
  assert.doesNotMatch(html, /<ul|collection-suite|<nav/)
})

/* ---------- Le schéma ---------- */

test('la section : un nom de schéma que Shopify accepte, rien à régler, une seule fois, sur les pages de collection', () => {
  const schema = schemaOf(GRILLE)
  // Shopify refuse un nom de plus de 25 caractères (le fichier refusé fait réimporter l'ancienne version).
  assert.ok(schema.name.length <= 25, schema.name)
  assert.deepEqual(schema, { name: schema.name, limit: 1, enabled_on: { templates: ['collection'] } })
})

/* ---------- La feuille de la page : le bloc du ticket ---------- */

// Le bloc « Grille et suite (ticket 05) » de assets/collection-refonte.css, sans ses commentaires, en règles.
function blocCss() {
  const CSS = 'assets/collection-refonte.css'
  // Les repères de la feuille, vérifiés par paires (scripts/galerie-banc.cjs) : le début et la fin du ticket 05.
  const reperes = blocs(CSS).filter((m) => m.ticket === '05')
  assert.deepEqual(reperes.map((m) => `${m.name} : ${m.side}`), ['Grille et suite : début', 'Grille et suite : fin'])
  return rules(read(CSS).slice(reperes[0].end, reperes[1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (bloc, head, context = '') => bloc.find((r) => r.head === head && r.context.join(' / ') === context)

test('la feuille : chaque classe de la grille et de sa carte a sa règle, dans le bloc du ticket', () => {
  const bloc = blocCss()
  const heads = bloc.map((r) => r.head).join('\n')
  const classes = new Set([GRILLE, `snippets/${CARTE}.liquid`].flatMap((file) => [...code(file).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].replace(/{%[\s\S]*?%}/g, ' ').split(/\s+/))).filter((c) => c.startsWith('refonte-')))
  assert.ok(classes.size >= 12, [...classes].join(' '))
  // La carte de repli garde le style de la carte d'aujourd'hui : rien à elle.
  classes.delete('refonte-carte-repli')
  for (const name of classes) assert.match(heads, new RegExp(`\\.${name}(?![\\w-])`), name)
})

test('la feuille : 2 colonnes, 3 dès 700 px, 4 dès 1100 px ; la scène des vignettes de toile, sur le blanc ; la carte monte au défilement', () => {
  const bloc = blocCss()
  const H = ':root[data-refonte-page]'
  assert.match(regle(bloc, `${H} .refonte-cartes`).body, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(regle(bloc, `${H} .refonte-cartes`, '@media (min-width: 700px)').body, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/)
  assert.match(regle(bloc, `${H} .refonte-cartes`, '@media (min-width: 1100px)').body, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/)
  // Les écarts de la maquette : 22 × 8, 34 × 14, 40 × 18.
  const ecarts = ['', '@media (min-width: 700px)', '@media (min-width: 1100px)'].map((c) => regle(bloc, `${H} .refonte-grille`, c).body.replace(/\s+/g, ' '))
  assert.deepEqual(ecarts.map((b) => [/--rangee: (\d+px)/.exec(b)[1], /--colonne: (\d+px)/.exec(b)[1]]), [['22px', '8px'], ['34px', '14px'], ['40px', '18px']])
  // Toile ou poster : la scène au format des vignettes de toile, sur le blanc, où l'ombre de l'œuvre s'estompe sans être
  // coupée à son bord.
  const scene = regle(bloc, `${H} .refonte-carte .oeuvre-card-stage`).body
  assert.match(scene, /aspect-ratio: 500 \/ 587;/)
  assert.match(scene, /background: var\(--blanc\);/)
  assert.match(scene, /overflow: visible;/)
  // La carte monte un peu à son arrivée, liée au défilement, seulement sans « mouvements réduits ».
  const monte = regle(bloc, `${H} .refonte-carte`, '@media (prefers-reduced-motion: no-preference) / @supports (animation-timeline: view()) and (animation-range-start: contain 10svh)')
  assert.ok(monte, 'l’animation de la carte, sous les deux conditions')
  assert.match(monte.body, /animation: refonte-monte linear both;\s*animation-timeline: view\(\);\s*animation-range: cover 0% cover 20%;/)
  assert.match(regle(bloc, '@keyframes refonte-monte').body, /from { transform: translateY\(34px\); }/)
})

/* ---------- La suite par lots : <infinite-scroll> et <collection-suite> (assets/collection.js) ---------- */

/* Une page réduite à ce que le script touche : des éléments (classes, attributs, enfants, frères), document et ses
   évènements, des IntersectionObserver qu'on déclenche à la main, fetch et DOMParser (la page suivante : une liste de
   `cartes` cartes), history. */
function pageDuScript({ search = '?view=refonte' } = {}) {
  const observers = []
  const events = []
  const listeners = new Map()
  const requests = []
  class El {
    constructor(name, options) {
      // Un élément du script naît comme dans une page qu'on lit : déjà en place, ses attributs posés (El.pending).
      const pending = name === undefined ? El.pending : null
      El.pending = null
      const tag = pending ? pending.name : name || 'div'
      const { attrs = {}, children = [], text = '' } = (pending || options || {})
      this.tagName = tag.toUpperCase()
      this.attrs = { ...attrs }
      this.children = []
      this.parent = null
      this.style = {}
      this.hidden = 'hidden' in attrs
      this.textContent = text
      this.dataset = new Proxy({}, {
        get: (_, k) => this.attrs[`data-${String(k).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`],
      })
      const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean))
      this.classList = { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), replace: (a, b) => { if (classes.delete(a)) classes.add(b) } }
      Object.defineProperty(this, 'className', { get: () => [...classes].join(' ') })
      children.forEach((c) => this.append(c))
      if (pending && pending.parent) pending.parent.append(this)
    }
    get firstElementChild() { return this.children[0] || null }
    get lastElementChild() { return this.children[this.children.length - 1] || null }
    get childElementCount() { return this.children.length }
    get siblings() { return this.parent ? this.parent.children : [] }
    get previousElementSibling() { const s = this.siblings; return s[s.indexOf(this) - 1] || null }
    get nextElementSibling() { const s = this.siblings; const i = s.indexOf(this); return i >= 0 ? s[i + 1] || null : null }
    getAttribute(name) { return name in this.attrs ? this.attrs[name] : null }
    setAttribute(name, value) { this.attrs[name] = String(value) }
    removeAttribute(name) { delete this.attrs[name] }
    detach() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null }
    append(node) { node.detach && node.detach(); node.parent = this; this.children.push(node) }
    prepend(node) { node.detach(); node.parent = this; this.children.unshift(node) }
    after(node) { node.detach(); const s = this.siblings; node.parent = this.parent; s.splice(s.indexOf(this) + 1, 0, node) }
    before(node) { node.detach(); const s = this.siblings; node.parent = this.parent; s.splice(s.indexOf(this), 0, node) }
    matches(selector) {
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1))
      if (selector === 'script[type="module"][src]') return this.tagName === 'SCRIPT' && this.attrs.type === 'module' && 'src' in this.attrs
      const attr = /^\[([\w-]+)\]$/.exec(selector)
      if (attr) return attr[1] in this.attrs
      return this.tagName === selector.toUpperCase()
    }
    querySelectorAll(selector) { return this.children.flatMap((c) => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]) }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null }
    addEventListener() {}
    getBoundingClientRect() { return { top: 0, bottom: 0, height: 0 } }
  }
  const registry = new Map()
  class FakeObserver {
    constructor(callback, options = {}) { this.callback = callback; this.options = options; this.targets = []; this.live = true; observers.push(this) }
    observe(target) { this.targets.push(target) }
    disconnect() { this.live = false }
    fire(isIntersecting = true) { if (this.live) return this.callback(this.targets.map((target) => ({ target, isIntersecting }))) }
  }
  // La page suivante, telle que la renvoie ?page=N&section_id= : un <infinite-scroll> et ses cartes.
  let reponse = { page: 2, cartes: 24 }
  const lot = ({ page, cartes }) => new El('infinite-scroll', { attrs: { 'data-page': String(page) }, children: [new El('ul', { children: Array.from({ length: cartes }, () => new El('li')) })] })
  const body = new El('body')
  const document = {
    body,
    createElement: (tag) => new El(tag),
    querySelector: (selector) => body.querySelector(selector),
    getElementById: (id) => body.querySelectorAll('*').find((el) => el.attrs.id === id) || null,
    addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn) },
    removeEventListener: (type, fn) => { listeners.set(type, (listeners.get(type) || []).filter((f) => f !== fn)) },
    dispatchEvent: (event) => { events.push(event); (listeners.get(event.type) || []).forEach((fn) => fn(event)); return true },
  }
  El.prototype.querySelectorAll = ((own) => function (selector) { return selector === '*' ? this.children.flatMap((c) => [c, ...c.querySelectorAll('*')]) : own.call(this, selector) })(El.prototype.querySelectorAll)
  const context = {
    HTMLElement: El, document, IntersectionObserver: FakeObserver, console, setTimeout, clearTimeout, Number, String, Math, URLSearchParams,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail } },
    customElements: { get: (name) => registry.get(name), define: (name, cls) => registry.set(name, cls) },
    requestAnimationFrame: (fn) => fn(),
    scrollY: 0,
    scrollTo() {},
    location: { pathname: '/collections/tableaux-nature-sauvage', search },
    history: { replaceState() {} },
    fetch: async (url) => { requests.push(url); return { text: async () => reponse } },
    DOMParser: class { parseFromString(r) { return { querySelector: (s) => (s === 'infinite-scroll' ? lot(r) : null) } } },
  }
  context.window = context
  vm.createContext(context)
  vm.runInContext(read('assets/collection.js'), context, { filename: 'assets/collection.js' })
  return {
    El, body, observers, events, requests, registry,
    repondre(r) { reponse = r },
    // Un lot annoncé sur document, comme le fait <infinite-scroll>.
    annoncer: (detail) => document.dispatchEvent({ type: 'mma:collection-lot', detail }),
    // Un élément du script, déjà dans la page, construit puis branché, comme le navigateur le fait.
    monter(name, attrs, children = [], parent = body) {
      const Cls = registry.get(name)
      assert.ok(Cls, `<${name}> défini par assets/collection.js`)
      El.pending = { name, attrs, children, parent }
      const el = new Cls()
      if (el.connectedCallback) el.connectedCallback()
      return el
    },
  }
}
const attendre = () => new Promise((resolve) => setTimeout(resolve, 0))

test('<infinite-scroll> sans data-marge : 300 px avant la fin, comme avant ; avec data-marge="700" : 700 px', () => {
  for (const [attrs, marge] of [[{}, '0px 0px 300px 0px'], [{ 'data-marge': '700' }, '0px 0px 700px 0px']]) {
    const p = pageDuScript()
    p.monter('infinite-scroll', { 'data-pages': '14', 'data-page': '1', 'data-section-id': 'template--1__grille', ...attrs }, [new p.El('ul')])
    // La page 1 : la page suivante seulement (aucune précédente), et la page qu'on regarde.
    const [suivante, courante] = p.observers
    assert.equal(p.observers.length, 2)
    assert.equal(suivante.options.rootMargin, marge, JSON.stringify(attrs))
    assert.equal(courante.options.rootMargin, '-50% 0px', 'la page qu’on regarde, inchangée')
    assert.equal(suivante.targets[0].className, 'elem-bottom')
  }
})

test('<infinite-scroll> : chaque lot arrivé s’annonce sur document (mma:collection-lot), avec son nombre de cartes', async () => {
  const p = pageDuScript()
  const liste = new p.El('div', { attrs: { id: 'liste' } })
  p.body.append(liste)
  const premier = p.monter('infinite-scroll', { 'data-pages': '14', 'data-page': '1', 'data-section-id': 'template--1__grille', 'data-marge': '700' }, [new p.El('ul')], liste)
  p.repondre({ page: 2, cartes: 24 })
  await p.observers[0].fire(true)
  await attendre()
  // La page 2, demandée avec l'adresse de la vue (les filtres de l'adresse restent), puis posée après la page 1.
  assert.deepEqual(p.requests, ['/collections/tableaux-nature-sauvage?view=refonte&page=2&section_id=template--1__grille'])
  assert.equal(premier.nextElementSibling.dataset.page, '2')
  const lots = p.events.filter((e) => e.type === 'mma:collection-lot')
  assert.equal(lots.length, 1)
  assert.deepEqual({ ...lots[0].detail }, { cards: 24, direction: 'down' })
  // Une page précédente (arrivé sur ?page=3, on remonte) : posée avant, annoncée « haut ».
  const q = pageDuScript({ search: '?view=refonte&page=3' })
  q.monter('infinite-scroll', { 'data-pages': '14', 'data-page': '3', 'data-section-id': 'template--1__grille', 'data-marge': '700' }, [new q.El('ul')])
  q.repondre({ page: 2, cartes: 24 })
  const haut = q.observers.find((o) => o.targets[0] && o.targets[0].className === 'elem-top')
  await haut.fire(true)
  await attendre()
  assert.deepEqual({ ...q.events.find((e) => e.type === 'mma:collection-lot').detail }, { cards: 24, direction: 'up' })
})

test('<collection-suite> : le compte et la jauge suivent les lots qui arrivent en bas, puis la fin ; la zone parlée le dit', () => {
  const p = pageDuScript()
  const statut = new p.El('div', { attrs: { id: 'statut', role: 'status' } })
  p.body.append(statut)
  const vus = new p.El('b', { attrs: { 'data-vus': '' }, text: '24' })
  const compte = new p.El('p', { attrs: { class: 'refonte-suite-compte' }, children: [vus] })
  const jauge = new p.El('progress', { attrs: { value: '24', max: '80' } })
  jauge.value = 24
  const fin = new p.El('p', { attrs: { class: 'refonte-suite-fin', hidden: '' }, text: 'Vous avez vu les 80 tableaux.' })
  p.monter('collection-suite', { 'data-vus': '24', 'data-total': '80', 'data-statut': 'statut' }, [compte, jauge, fin])
  // Texte du compte, tel que le lit un lecteur d'écran.
  Object.defineProperty(compte, 'textContent', { get: () => `${vus.textContent}\n tableaux sur 80 ` })
  const lot = (cards, direction = 'down') => p.annoncer({ cards, direction })
  lot(24)
  assert.equal(vus.textContent, '48')
  assert.equal(jauge.value, 48)
  assert.equal(compte.hidden, false)
  assert.equal(fin.hidden, true)
  assert.equal(statut.textContent, '48 tableaux sur 80')
  // Une page précédente, posée au-dessus : le compte ne bouge pas.
  lot(24, 'up')
  assert.equal(vus.textContent, '48')
  lot(24)
  lot(8)
  assert.equal(vus.textContent, '80')
  assert.equal(compte.hidden, true)
  assert.equal(jauge.hidden, true)
  assert.equal(fin.hidden, false)
  assert.equal(statut.textContent, 'Vous avez vu les 80 tableaux.')
})
