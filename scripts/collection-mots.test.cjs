// La nouvelle page collection, ticket 09 (dossier .scratch/collection-design) : les mots de la page.
// - Le titre se coupe sur son sujet (snippets/collection-titre.liquid) : les mots de type en tête et en fin
//   (« Tableau », « Poster & Affiche », « Wall Art Collection »…, une liste par langue dans les fichiers de langue)
//   restent maigres, le sujet entre eux est en gras : « Tableau <b>Pop Art</b> », « <b>Nature-Themed</b> Wall Art
//   Collection ». Si tous les mots sont des mots de type (« Tous les Tableaux »), le dernier passe en gras. L'entrée
//   (sections/collection-refonte.liquid) et l'emblème (snippets/collection-embleme.liquid) prennent ce même découpage.
// - Posters ou tableaux : partout où la page compte des œuvres, une collection de posters (custom.type_of_collection
//   « poster ») dit « posters » ; sous un emblème, le mot suit la collection visée.
// Ici, le rendu Liquid (liquidjs), sur de vrais titres des cinq langues relevés en ligne le 24/11/2026
// (/collections.json de chaque langue) : sans liquidjs, ces tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-mots.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { LANGS, SKIP, engine, locales, read, schemaOf, globals, templateOf } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

/* ---------- Le banc : textes au pluriel, pagination de Shopify ---------- */

const echappe = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
if (!SKIP) {
  for (const lang of Object.keys(LANGS)) {
    const e = engine(lang)
    // Les textes des fichiers de langue comme Shopify (scripts/collection-entree.test.cjs) : au pluriel, et les valeurs
    // glissées dans un texte échappées, sauf pour une clé en _html.
    e.registerFilter('t', (key, ...args) => {
      let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
      const values = Object.fromEntries(args.filter(Array.isArray))
      if (text && typeof text === 'object' && 'count' in values) text = (Number(values.count) === 1 ? text.one : text.other) || text.other
      if (typeof text !== 'string') return key
      const html = String(key).endsWith('_html')
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? (html ? String(values[name]) : echappe(values[name])) : hole))
    })
    // {% paginate %} : son contenu, sur une page (les collections d'essai donnent paginate).
    e.registerTag('paginate', {
      parse(token, remain) {
        this.tpls = []
        const stream = this.liquid.parser.parseStream(remain)
        stream.on('tag:endpaginate', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('paginate non fermé') })
        stream.start()
      },
      * render(ctx, emitter) {
        const page = ctx.getSync(['paginate_essai']) || { pages: 1, current_page: 1, current_offset: 0, previous: null, next: null, parts: [] }
        ctx.push({ paginate: page })
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
        ctx.pop()
      },
    })
  }
}

/* ---------- La boutique d'essai ---------- */

const mf = (value) => ({ value })
let lastId = 900000000000
/* Une collection, telle que la donnent collection et collections[handle] : son type (custom.type_of_collection), son
   nombre de tableaux, ses produits et ses filtres. */
function col(handle, title, { count = 10, url = `/collections/${handle}`, type = 'painting', products = [], filters = [] } = {}) {
  return {
    id: ++lastId, handle, title, url, products_count: count, all_products_count: count, products, filters,
    sort_by: null, default_sort_by: 'best-selling', sort_options: [{ value: 'best-selling' }, { value: 'created-descending' }, { value: 'price-ascending' }, { value: 'price-descending' }],
    metafields: { custom: { type_of_collection: type }, collection_par_default: { boolean: false }, breadcrumb: {}, cocon: {} },
  }
}
const boutique = (...list) => Object.fromEntries(list.map((c) => [c.handle, c]))

/* Ce que Shopify donne à toute page de collection. */
const pageGlobals = ({ page, collections = boutique(page), lang = 'fr', primary = lang === 'fr', plan = PLAN, paginate = null }) => ({
  ...globals(null, { name: 'collection', lang }),
  template: templateOf('collection', null),
  collection: page,
  collections,
  current_page: 1,
  paginate_essai: paginate,
  shop: { name: 'MyselfMonArt', url: 'https://www.myselfmonart.com', metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
  request: { page_type: 'collection', origin: 'https://www.myselfmonart.com', locale: { iso_code: lang, primary } },
  routes: { root_url: lang === 'fr' ? '/' : `/${lang}` },
  settings: { trustpilot_score_global: 42, trustpilot_review_count_global: 86 },
  cart: { currency: { iso_code: 'EUR', symbol: '€' } },
})

/* Une section rendue seule, sans son schéma, avec les réglages par défaut de son schéma. Tous les rendus de ce fichier
   sont synchrones : liquidjs garde en cache un snippet lu en asynchrone sous une forme que le rendu synchrone ne lit pas. */
const parsed = new Map()
function renderFile(file, vars, { settings = {}, id = path.basename(file, '.liquid') } = {}) {
  const lang = vars.request.locale.iso_code
  const e = engine(lang)
  const key = `${lang} ${file}`
  if (!parsed.has(key)) {
    const source = read(file)
    const end = source.indexOf('{% schema %}')
    parsed.set(key, e.parse(end < 0 ? source : source.slice(0, end)))
  }
  const schema = /{% schema %}/.test(read(file)) ? schemaOf(file) : { settings: [] }
  const defaults = Object.fromEntries((schema.settings || []).filter((s) => 'default' in s).map((s) => [s.id, s.default]))
  return e.renderSync(parsed.get(key), {}, { globals: { ...vars, section: { id: `template--1__${id}`, settings: { ...defaults, ...settings }, blocks: [] } } })
}

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// Le texte d'un morceau de HTML, tel que le lisent Google et les lecteurs d'écran (sans balises ni blancs en trop).
const texte = (html) => unescape(html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<\/?(a|b|span|strong|em)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/* ---------- Le titre coupé sur son sujet ---------- */

/* Le titre coupé par le snippet : [début, sujet, fin]. */
const couper = (titre, lang = 'fr') => engine(lang).renderFileSync('collection-titre', { titre }).split('¤')

// De vrais titres de collection, dans chaque langue (relevé du 24/11/2026), avec leur découpage attendu.
const TITRES = {
  fr: [
    ['Tableaux Nature', 'Tableaux', 'Nature', ''],
    ['Tableau Pop Art', 'Tableau', 'Pop Art', ''],
    ['Poster & Affiche Nature', 'Poster & Affiche', 'Nature', ''],
    ['Tableau Chambre Enfant', 'Tableau', 'Chambre Enfant', ''],
    ['Tableau Noir et Blanc', 'Tableau', 'Noir et Blanc', ''],
    ['Poster & Affiche Fruits et Légumes', 'Poster & Affiche', 'Fruits et Légumes', ''],
    ['Tableaux indiens d’Amérique', 'Tableaux', 'indiens d’Amérique', ''],
    ['Poster bébé : Signe Astrologique aquarelle', 'Poster', 'bébé : Signe Astrologique aquarelle', ''],
    ['Poster Personnalisé Famille', 'Poster', 'Personnalisé Famille', ''],
    ['Tableau best-seller', 'Tableau', 'best-seller', ''],
    ['Papier Peint Coloré', 'Papier Peint', 'Coloré', ''],
    ['Kit tableau', '', 'Kit', 'tableau'],
    // Tous les mots sont des mots de type : le dernier passe en gras, comme avant.
    ['Tous les Tableaux', 'Tous les', 'Tableaux', ''],
    ['Tous les Posters & Affiches', 'Tous les Posters &', 'Affiches', ''],
  ],
  en: [
    ['Nature-Themed Wall Art Collection', '', 'Nature-Themed', 'Wall Art Collection'],
    ['Pop Art Canvas Prints', '', 'Pop Art', 'Canvas Prints'],
    ['Street Art Canvas', '', 'Street Art', 'Canvas'],
    ['Pop Art Posters & Prints', '', 'Pop Art', 'Posters & Prints'],
    // Tableau Line Art, à créer dans le plan du cocon : son « Art » reste au sujet.
    ['Line Art Wall Art', '', 'Line Art', 'Wall Art'],
    ['Abstract Posters & Art Prints', '', 'Abstract', 'Posters & Art Prints'],
    ['Wall Art for Master Bedroom', 'Wall Art for', 'Master Bedroom', ''],
    ['Frida Kahlo Wall Art: Canvas Prints & Posters', '', 'Frida Kahlo', 'Wall Art: Canvas Prints & Posters'],
    ['Fruit & Vegetable Posters and Prints', '', 'Fruit & Vegetable', 'Posters and Prints'],
    ['Female Portrait Canvas Art', '', 'Female Portrait', 'Canvas Art'],
    ['Minimalist Wall Art on Canvas', '', 'Minimalist', 'Wall Art on Canvas'],
    ['Black and White Art Prints', '', 'Black and White', 'Art Prints'],
    ['Lion Artwork', '', 'Lion', 'Artwork'],
    ['Yellow Paintings Collection', '', 'Yellow', 'Paintings Collection'],
    ['Japanese Art Wall Decor', '', 'Japanese', 'Art Wall Decor'],
    ['Living Room Art', '', 'Living Room', 'Art'],
    ['Red Art Canvas Collection', '', 'Red', 'Art Canvas Collection'],
    ['All Wall Art', 'All Wall', 'Art', ''],
    // Un titre sans mot de type au bord reste entier, en gras.
    ['Kitchen Wall Art: Add Flair to Your Culinary Space', '', 'Kitchen Wall Art: Add Flair to Your Culinary Space', ''],
    // Un titre pas encore traduit garde son titre français : les mots du français sont aussi dans la liste.
    ['Tableau Espace', 'Tableau', 'Espace', ''],
    ['Poster & Affiche Beige', 'Poster & Affiche', 'Beige', ''],
  ],
  de: [
    ['Naturbilder', '', 'Naturbilder', ''],
    ['Leinwandbilder Frauen', 'Leinwandbilder', 'Frauen', ''],
    ['Abstrakte Poster & Kunstdrucke', '', 'Abstrakte', 'Poster & Kunstdrucke'],
    ['Stillleben Bilder auf Leinwand', '', 'Stillleben', 'Bilder auf Leinwand'],
    ['Bilder mit Obst und Gemüse', 'Bilder mit', 'Obst und Gemüse', ''],
    ['Poster & Kunstdrucke – Bestseller', 'Poster & Kunstdrucke –', 'Bestseller', ''],
    ['Poster fürs Mädchenzimmer – Wandbilder & Drucke', 'Poster fürs', 'Mädchenzimmer', '– Wandbilder & Drucke'],
    ['Vintage-Poster & -Plakate', '', 'Vintage-Poster', '& -Plakate'],
    ['Pop-Art-Wandbild', '', 'Pop-Art-Wandbild', ''],
    ['Alle Bilder', 'Alle', 'Bilder', ''],
    ['Tableau Géométrique', 'Tableau', 'Géométrique', ''],
  ],
  es: [
    ['Cuadros de Naturaleza', 'Cuadros de', 'Naturaleza', ''],
    ['Cuadro Pop Art', 'Cuadro', 'Pop Art', ''],
    ['Pósters y Láminas en Blanco y Negro', 'Pósters y Láminas en', 'Blanco y Negro', ''],
    ['Láminas y pósters para la habitación del bebé', 'Láminas y pósters para la', 'habitación del bebé', ''],
    ['Póster & Lámina Naranja', 'Póster & Lámina', 'Naranja', ''],
    ['Pósters y láminas más vendidos', 'Pósters y láminas', 'más vendidos', ''],
    ['Todos los Cuadros', 'Todos los', 'Cuadros', ''],
    ['Poster & Affiche Ville', 'Poster & Affiche', 'Ville', ''],
  ],
  nl: [
    ['Natuurschilderijen', '', 'Natuurschilderijen', ''],
    ['Abstract Schilderij', '', 'Abstract', 'Schilderij'],
    ['Pop Art Schilderij', '', 'Pop Art', 'Schilderij'],
    ['Posters & affiches voor de woonkamer', 'Posters & affiches voor de', 'woonkamer', ''],
    ['Schilderijen van Amerikaanse indianen', 'Schilderijen van', 'Amerikaanse indianen', ''],
    ['Vintage & retro posters', '', 'Vintage & retro', 'posters'],
    ['Fruit- en Groenteschilderij', '', 'Fruit- en Groenteschilderij', ''],
    ['Alle Kunstposters & Affiches', 'Alle Kunstposters &', 'Affiches', ''],
    ['Tableau Oiseaux', 'Tableau', 'Oiseaux', ''],
  ],
}

test('le titre se coupe sur son sujet : les mots de type en tête et en fin, le sujet entre eux (vrais titres des cinq langues)', { skip: SKIP }, () => {
  for (const [lang, titres] of Object.entries(TITRES)) {
    for (const [titre, ...attendu] of titres) assert.deepEqual(couper(titre, lang), attendu, `${lang} : ${titre}`)
  }
})

test('le titre coupé : les blancs en trop ne comptent pas, la casse non plus, et le snippet ne rend rien d’autre', { skip: SKIP }, () => {
  assert.deepEqual(couper('  Tableau   Lion '), ['Tableau', 'Lion', ''])
  assert.deepEqual(couper('TABLEAU ZEN'), ['TABLEAU', 'ZEN', ''])
  assert.deepEqual(couper('Zen'), ['', 'Zen', ''])
  assert.deepEqual(couper('Tableau'), ['', 'Tableau', ''])
  // Une ponctuation seule (« & », « – ») colle au mot de type voisin.
  assert.deepEqual(couper('Poster – Affiche'), ['Poster –', 'Affiche', ''])
})

test('les mots de type : une liste par langue, en minuscules, qui reprend les mots du français ; les sujets de deux mots à part', () => {
  const FRANCAIS = ['tableau', 'tableaux', 'poster', 'posters', 'affiche', 'affiches', 'toile', 'toiles']
  for (const lang of Object.keys(LANGS)) {
    const { mots_type: liste, sujets } = locales[lang].sections.mma.collection.titre
    assert.equal(typeof liste, 'string', lang)
    const mots = liste.split(',')
    for (const mot of mots) assert.match(mot, /^[^\sA-Z,]+$/u, `${lang} : « ${mot} », un mot, en minuscules, sans blanc`)
    assert.equal(new Set(mots).size, mots.length, `${lang} : chaque mot une fois`)
    // Un titre pas encore traduit garde son titre français.
    for (const mot of FRANCAIS) assert.ok(mots.includes(mot), `${lang} : « ${mot} »`)
    // Les sujets que rien ne coupe : deux mots chacun.
    for (const sujet of sujets.split(',')) assert.match(sujet, /^\S+ \S+$/, `${lang} : « ${sujet} »`)
  }
  // En anglais, « art » est un mot de type (« Wall Art », « Art Prints ») : « Pop Art » et « Street Art » sont protégés.
  assert.ok(locales.en.sections.mma.collection.titre.mots_type.split(',').includes('art'))
  assert.deepEqual(locales.en.sections.mma.collection.titre.sujets.split(',').slice(0, 2), ['pop art', 'street art'])
})

/* ---------- L'entrée et l'emblème prennent ce découpage ---------- */

const ENTREE = 'sections/collection-refonte.liquid'
/* Le h1 de l'entrée, pour une collection de ce titre (sans jumelle : hors du plan). */
function h1(titre, lang = 'fr') {
  const page = col('collection-essai', titre, { count: 12 })
  const html = renderFile(ENTREE, pageGlobals({ page, lang }), { id: 'collection_refonte' })
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${titre} : un seul h1`)
  return /<h1 class="c-titre" id="template--1__collection_refonte-titre">([\s\S]*?)<\/h1>/.exec(html)[1]
}

test('l’entrée : le h1 met le sujet en gras, les mots de type en tête et en fin restent maigres', { skip: SKIP }, () => {
  assert.equal(h1('Tableaux Nature'), 'Tableaux <b>Nature</b>')
  assert.equal(h1('Tableau Pop Art'), 'Tableau <b>Pop Art</b>')
  assert.equal(h1('Poster & Affiche Nature'), 'Poster &amp; Affiche <b>Nature</b>')
  assert.equal(h1('Tableau Chambre Enfant'), 'Tableau <b>Chambre Enfant</b>')
  assert.equal(h1('  Tableau Lion '), 'Tableau <b>Lion</b>')
  assert.equal(h1('Bestsellers'), '<b>Bestsellers</b>')
  // Tous les mots sont des mots de type : le dernier en gras, comme avant.
  assert.equal(h1('Tous les Tableaux'), 'Tous les <b>Tableaux</b>')
  // Le sujet en tête, les mots de type après lui.
  assert.equal(h1('Nature-Themed Wall Art Collection', 'en'), '<b>Nature-Themed</b> Wall Art Collection')
  assert.equal(h1('Poster fürs Mädchenzimmer – Wandbilder & Drucke', 'de'), 'Poster fürs <b>Mädchenzimmer</b> – Wandbilder &amp; Drucke')
  assert.equal(h1('Natuurschilderijen', 'nl'), '<b>Natuurschilderijen</b>')
})

/* L'emblème rendu seul, comme {% render 'collection-embleme', … %}. */
const emblem = (cible, { lang = 'fr', taille = 'haut' } = {}) => engine(lang).renderFileSync('collection-embleme', { cible, rang: 0, taille, tout_de_suite: false })
/* Le lien de l'emblème : son HTML et son texte. */
const lienEmbleme = (html) => {
  const m = /<a class="c-emb-lien" href="[^"]*">([\s\S]*?)<\/a>/.exec(html)
  return { html: m[1], texte: texte(m[1]) }
}
const initiale = (html) => (/<span class="c-emb-initiale">([^<]*)<\/span>/.exec(html) || [])[1] ?? null

test('l’emblème : le début et la fin en petit, le sujet en gras, le titre lu en entier et dans l’ordre', { skip: SKIP }, () => {
  const cas = [
    ['fr', 'Tableau Pop Art', '<span class="c-emb-mot">Tableau</span> <span class="c-emb-nom">Pop Art</span>'],
    ['fr', 'Poster & Affiche Nature', '<span class="c-emb-mot">Poster &amp; Affiche</span> <span class="c-emb-nom">Nature</span>'],
    ['fr', 'Tous les Tableaux', '<span class="c-emb-mot">Tous les</span> <span class="c-emb-nom">Tableaux</span>'],
    ['en', 'Nature-Themed Wall Art Collection', '<span class="c-emb-nom">Nature-Themed</span> <span class="c-emb-mot">Wall Art Collection</span>'],
    ['de', 'Poster fürs Mädchenzimmer – Wandbilder & Drucke', '<span class="c-emb-mot">Poster fürs</span> <span class="c-emb-nom">Mädchenzimmer</span> <span class="c-emb-mot">– Wandbilder &amp; Drucke</span>'],
    ['de', 'Naturbilder', '<span class="c-emb-nom">Naturbilder</span>'],
  ]
  for (const [lang, titre, attendu] of cas) {
    const lien = lienEmbleme(emblem(col('collection-essai', titre), { lang }))
    assert.equal(lien.html, attendu, `${lang} : ${titre}`)
    // Google et les lecteurs d'écran lisent le titre entier, dans son ordre.
    assert.equal(lien.texte, titre, `${lang} : ${titre}, lu en entier`)
  }
  // En bas de page aussi.
  assert.equal(lienEmbleme(emblem(col('collection-essai', 'Tableau Pop Art'), { taille: 'bas' })).html, cas[0][2])
})

test('l’emblème sans image : l’initiale du sujet', { skip: SKIP }, () => {
  assert.equal(initiale(emblem(col('tableau-pop-art', 'Tableau Pop Art'))), 'P')
  assert.equal(initiale(emblem(col('tableau-mer-1', 'Tableau Mer'))), 'M')
  assert.equal(initiale(emblem(col('tableau-ete', 'Tableau Été'))), 'É')
  assert.equal(initiale(emblem(col('posters-affiches-nature', 'Poster & Affiche Nature'))), 'N')
  assert.equal(initiale(emblem(col('tous-les-tableaux', 'Tous les Tableaux'))), 'T')
  assert.equal(initiale(emblem(col('tableaux-nature-sauvage', 'Nature-Themed Wall Art Collection'), { lang: 'en' })), 'N')
})

/* ---------- Posters ou tableaux ---------- */

// Le nombre d'œuvres dans chaque langue : une collection de tableaux, puis une collection de posters.
const NOMBRES = {
  fr: [['1 tableau', '327 tableaux'], ['1 poster', '256 posters']],
  en: [['1 artwork', '327 artworks'], ['1 poster', '256 posters']],
  de: [['1 Bild', '327 Bilder'], ['1 Poster', '256 Poster']],
  es: [['1 cuadro', '327 cuadros'], ['1 póster', '256 pósteres']],
  nl: [['1 schilderij', '327 schilderijen'], ['1 poster', '256 posters']],
}

test('l’entrée sans jumelle : « 327 tableaux », et « 256 posters » sur une collection de posters, dans les cinq langues', { skip: SKIP }, () => {
  const nombreHaut = (page, lang) => texte(/<p class="c-nombre" id="nombre-haut">([\s\S]*?)<\/p>/.exec(renderFile(ENTREE, pageGlobals({ page, lang }), { id: 'collection_refonte' }))[1])
  for (const [lang, [[unTableau, tableaux], [unPoster, posters]]] of Object.entries(NOMBRES)) {
    assert.equal(nombreHaut(col('collection-essai', 'Tableau Essai', { count: 327 }), lang), tableaux, lang)
    assert.equal(nombreHaut(col('collection-essai', 'Tableau Essai', { count: 1 }), lang), unTableau, lang)
    assert.equal(nombreHaut(col('posters-essai', 'Poster & Affiche Essai', { count: 256, type: 'poster' }), lang), posters, lang)
    assert.equal(nombreHaut(col('posters-essai', 'Poster & Affiche Essai', { count: 1, type: 'poster' }), lang), unPoster, lang)
  }
})

test('sous un emblème, le nombre suit la collection visée, pas la page : « 152 tableaux », « 103 posters »', { skip: SKIP }, () => {
  const nombre = (cible, lang, page) => {
    const html = engine(lang).renderFileSync('collection-embleme', { cible, rang: 0, taille: 'haut', tout_de_suite: false }, { globals: { collection: page } })
    return texte(/<span class="c-emb-nb">([\s\S]*?)<\/span>/.exec(html)[1])
  }
  const pagePosters = col('posters-affiches-nature', 'Poster & Affiche Nature', { count: 256, type: 'poster' })
  const pageTableaux = col('tableaux-nature-sauvage', 'Tableaux Nature', { count: 327 })
  for (const [lang, [[unTableau, tableaux], [unPoster, posters]]] of Object.entries(NOMBRES)) {
    // Une toile sur une page de posters, un poster sur une page de toiles : le mot de la collection visée.
    assert.equal(nombre(col('tableau-animaux', 'Tableau Animaux', { count: 327 }), lang, pagePosters), tableaux, lang)
    assert.equal(nombre(col('tableau-lion', 'Tableau Lion', { count: 1 }), lang, pagePosters), unTableau, lang)
    assert.equal(nombre(col('posters-affiches-animaux', 'Poster & Affiche Animaux', { count: 256, type: 'poster' }), lang, pageTableaux), posters, lang)
    assert.equal(nombre(col('posters-affiches-lion', 'Poster & Affiche Lion', { count: 1, type: 'poster' }), lang, pageTableaux), unPoster, lang)
  }
})

test('les textes du nombre : sections.mma.collection.nombre, tableaux et posters, dans les cinq langues', () => {
  for (const lang of Object.keys(LANGS)) {
    const nombre = locales[lang].sections.mma.collection.nombre
    assert.deepEqual(Object.keys(nombre), ['tableaux', 'posters'], lang)
    for (const mot of ['tableaux', 'posters']) {
      for (const forme of ['one', 'other', 'many']) assert.match(nombre[mot][forme], /^{{ count }} \S/, `${lang}.${mot}.${forme}`)
    }
    // Les anciennes clés, réunies dans celle-ci, ne restent pas.
    assert.equal(locales[lang].sections.mma.collection.emblemes, undefined, lang)
    assert.equal(locales[lang].sections.mma.collection.entree.tableaux, undefined, lang)
  }
})

/* ---------- La feuille ---------- */

const CSS = 'assets/collection-refonte.css'
const HOOK = ':root[data-refonte-page]'
/* Les règles du bloc du ticket 09, sans ses commentaires : { head, body, context }. */
function monBloc() {
  const { blocs, rules } = require('./galerie-banc.cjs')
  const marks = blocs(CSS)
  const i = marks.findIndex((m) => m.ticket === '09' && m.side === 'début')
  assert.ok(i >= 0, 'le bloc du ticket 09')
  // Après le bloc du ticket 07 : un bloc s'ajoute à la fin de la feuille.
  assert.ok(i > marks.findIndex((m) => m.ticket === '07' && m.side === 'fin'), 'après le bloc du ticket 07')
  return rules(read(CSS).slice(marks[i].end, marks[i + 1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}

test('la feuille : sous l’emblème, le début et la fin sur la ligne du haut, le sujet seul dessous, coupé s’il est trop long', () => {
  const bloc = monBloc()
  const regle = (head) => {
    const r = bloc.find((x) => x.head === `${HOOK} ${head}` && !x.context.length)
    assert.ok(r, head)
    return r.body
  }
  // Le lien passe en ligne souple : ses morceaux gardent l'ordre du titre, le sujet prend sa propre ligne, après.
  const lien = regle('.c-emb-lien')
  assert.match(lien, /display:\s*flex;/)
  assert.match(lien, /flex-wrap:\s*wrap;/)
  assert.match(lien, /justify-content:\s*center;/)
  const nom = regle('.c-emb-nom')
  assert.match(nom, /order:\s*1;/)
  assert.match(nom, /flex-basis:\s*100%;/)
  // Un mot trop long pour la colonne (« Erwachsenenschlafzimmerbild ») se coupe au lieu de déborder.
  assert.match(nom, /overflow-wrap:\s*anywhere;/)
  assert.match(nom, /hyphens:\s*auto;/)
  // Rien d'autre ne bouge que l'ordre : aucun mouvement dans ce bloc.
  for (const r of bloc) assert.doesNotMatch(r.body, /(transition|animation|transform)\s*:/, r.head)
})
