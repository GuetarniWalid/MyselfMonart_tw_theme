// La nouvelle page collection, ticket 02 (dossier .scratch/collection-design) : l'entrée de la page. Le fil d'Ariane
// complet (sections/breadcrumb.liquid, affichage « complet »), le titre, seul h1 de la page, l'interrupteur
// Posters | Toiles, qui porte le nombre de tableaux et le seul lien vers la collection jumelle, et l'intro sur deux
// lignes (sections/collection-refonte.liquid). L'intro est celle de l'éditorial d'aujourd'hui
// (snippets/collection-editorial-auto.liquid, partie « intro »). La grille (sections/main-collection-product-grid.liquid)
// n'écrit plus, sur cette page, ni l'éditorial ni le bas de page « Aussi en poster » : la jumelle et le h1 n'y sont
// qu'une fois. Partout ailleurs, ces fichiers rendent exactement le HTML d'avant (copies dans scripts/fixtures/).
// Ici, le rendu Liquid (liquidjs) : sans lui, ces tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-entree.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, schemaOf, LANGS, SKIP, engine, locales, templateOf, globals, product, ldOf } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

const CRUMB = 'sections/breadcrumb.liquid'
const ENTREE = 'sections/collection-refonte.liquid'
const GRILLE = 'sections/main-collection-product-grid.liquid'
const EDITO = 'snippets/collection-editorial-auto.liquid'
const AVANT = {
  [CRUMB]: 'scripts/fixtures/breadcrumb.avant-refonte.liquid',
  [EDITO]: 'scripts/fixtures/collection-editorial-auto.avant-refonte.liquid',
  [GRILLE]: 'scripts/fixtures/main-collection-product-grid.avant-refonte.liquid',
}
const MODELE = 'templates/collection.refonte.json'

/* ---------- Le banc : textes au pluriel, pagination de Shopify ---------- */

const echappe = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
if (!SKIP) {
  for (const lang of Object.keys(LANGS)) {
    const e = engine(lang)
    // Les textes des fichiers de langue comme Shopify : au pluriel (« one » pour 1, « other » sinon), et les valeurs
    // glissées dans un texte échappées, sauf pour une clé en _html (relevé en ligne : « Vos questions sur poster &amp;
    // affiche nature »).
    e.registerFilter('t', (key, ...args) => {
      let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
      const values = Object.fromEntries(args.filter(Array.isArray))
      if (text && typeof text === 'object' && 'count' in values) text = (Number(values.count) === 1 ? text.one : text.other) || text.other
      if (typeof text !== 'string') return key
      const html = String(key).endsWith('_html')
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? (html ? String(values[name]) : echappe(values[name])) : hole))
    })
    // {% paginate %} : son contenu, sur une seule page.
    e.registerTag('paginate', {
      parse(token, remain) {
        this.tpls = []
        const stream = this.liquid.parser.parseStream(remain)
        stream.on('tag:endpaginate', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('paginate non fermé') })
        stream.start()
      },
      * render(ctx, emitter) {
        ctx.push({ paginate: { pages: 1, current_page: 1, previous: null, next: null } })
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
        ctx.pop()
      },
    })
  }
}

/* ---------- La boutique d'essai ---------- */

const mf = (value) => ({ value })
let lastId = 700000000000
/* Une collection, telle que la donnent collection et collections[handle] : son type, sa place dans le fil d'Ariane
   (parentCollection) et ses textes (custom.*). */
function col(handle, title, { count = 10, url = `/collections/${handle}`, type = 'painting', defaut = false, parent = null, custom = {} } = {}) {
  return {
    id: ++lastId, handle, title, url, products_count: count, all_products_count: count, products: [], filters: [],
    metafields: {
      custom: { type_of_collection: type, ...custom },
      collection_par_default: { boolean: defaut },
      breadcrumb: { parentCollection: parent ? mf(parent) : null, parentPage: null },
    },
  }
}
/* Les collections de la boutique : une liste (le fil d'Ariane les parcourt) où chacune se trouve aussi par son handle
   français (collections['tableau-lion']), comme dans Shopify. */
function boutique(...list) {
  const all = [...list]
  for (const c of list) all[c.handle] = c
  return all
}

// L'intro de Tableaux Nature, avec la note Trustpilot en jetons et un retour à la ligne.
const INTRO = 'Respirez. Notre collection de tableaux nature fait entrer le souffle du vivant chez vous.\nNotés [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.'
const GUIDE = '<h2>Bien choisir</h2><p>Un guide noté [[TP_SCORE]]/5.</p>'
const FAQ = [{ q: 'Quelle taille ?', a: '<p>Celle de [[TP_COUNT]] clients.</p>' }, { q: '', a: 'sans question' }, { q: 'Le cadre ?', a: 'En option.' }]
const textes = (intro = INTRO) => ({ intro: mf(intro), guide: mf(GUIDE), faq: mf(FAQ), cocon_links: mf([{ url: '/blogs/deco/salon', label: 'Un salon nature' }, { url: '/collections/tableau-fleurs', label: 'Fleurs' }]) })

/* Autour de Tableaux Nature, en français : la racine, la page, deux descendantes (Animaux, Lion), la racine des
   posters et les jumelles de Nature et de Lion. */
function nature({ intro = INTRO, jumelle = 120 } = {}) {
  const tous = col('tous-les-tableaux', 'Tous les Tableaux', { count: 890, defaut: true })
  const page = col('tableaux-nature-sauvage', 'Tableaux Nature', { count: 327, parent: tous, custom: textes(intro) })
  const animaux = col('tableau-animaux', 'Tableau Animaux', { count: 152, parent: page })
  const lion = col('tableau-lion', 'Tableau Lion', { count: 8, parent: animaux, custom: textes() })
  const tousPosters = col('posters-affiches', 'Tous les Posters & Affiches', { count: 680, type: 'poster' })
  const posters = col('posters-affiches-nature', 'Poster & Affiche Nature', { count: jumelle, type: 'poster', parent: tousPosters, custom: textes('Un poster nature.') })
  const postersLion = col('posters-affiches-lion', 'Poster & Affiche Lion', { count: 9, type: 'poster', parent: posters })
  return boutique(tous, page, animaux, lion, tousPosters, posters, postersLion)
}

/* Ce que Shopify donne à toute page de collection. */
const pageGlobals = ({ page, collections, lang = 'fr', primary = lang === 'fr', plan = PLAN, currentPage = 1, settings = {} }) => ({
  ...globals(null, { name: 'collection', lang }),
  template: templateOf('collection', null),
  collection: page,
  collections,
  current_page: currentPage,
  shop: { name: 'MyselfMonArt', url: 'https://www.myselfmonart.com', metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
  request: { page_type: 'collection', origin: 'https://www.myselfmonart.com', locale: { iso_code: lang, primary } },
  routes: { root_url: lang === 'fr' ? '/' : `/${lang}` },
  settings: { trustpilot_score_global: 42, trustpilot_review_count_global: 86, ...settings },
})

/* Les blancs comme les rogne Shopify. Son moteur Liquid travaille en « compatibilité de bogue »
   (bug_compatible_whitespace_trimming) : un texte fait seulement de blancs, entre une balise ou une sortie sans tiret
   final (« %} », « }} ») et une balise « {%- » ou « {{- », garde son premier caractère, quand liquidjs l'efface. Relevé
   en ligne : trois sauts de ligne entre </breadcrumb-popup> et la boîte du fil d'Ariane, un seul dans liquidjs. Le
   source est réécrit pour que liquidjs rende ce caractère : comparer ainsi le fichier d'avant et celui d'après dit si
   Shopify, lui aussi, rend le même HTML. */
const blancsShopify = (source) => source.replace(/(?<!-)(%\}|\}\})([ \t\r\n]+)\{([%{])-/g, (m, fin, blancs, ouvre) => `${fin}${blancs[0]}{${ouvre}`)

/* Une section rendue seule, sans son schéma (que Shopify ne rend pas), avec les réglages que Shopify lui donne : ceux du
   modèle, et pour les autres la valeur par défaut du schéma. shopify : les blancs rognés comme Shopify. Le banc commun
   (renderSectionFile de scripts/galerie-banc.cjs) donne les variables d'une fiche produit, sans les réglages par défaut :
   ce rendu-ci prend celles d'une page de collection. */
const parsed = new Map()
function renderFile(file, vars, { lang = 'fr', settings = {}, id = path.basename(file, '.liquid'), shopify = false } = {}) {
  const e = engine(lang)
  const key = `${lang} ${shopify} ${file}`
  if (!parsed.has(key)) {
    const source = read(file)
    const end = source.indexOf('{% schema %}')
    const body = end < 0 ? source : source.slice(0, end)
    parsed.set(key, e.parse(shopify ? blancsShopify(body) : body))
  }
  const schema = /{% schema %}/.test(read(file)) ? schemaOf(file) : { settings: [] }
  const defaults = Object.fromEntries((schema.settings || []).filter((s) => 'default' in s).map((s) => [s.id, s.default]))
  return e.render(parsed.get(key), {}, { globals: { ...vars, section: { id: `template--1__${id}`, settings: { ...defaults, ...settings }, blocks: [] } } })
}

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// Le texte d'un morceau de HTML, tel que le lisent Google et les lecteurs d'écran (sans balises ni blancs en trop).
const texte = (html) => unescape(html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
const liens = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, inner]) => [href, texte(inner)])
const breadcrumbLd = (html) => ldOf(html).map((ld) => JSON.parse(ld)).filter((ld) => ld['@type'] === 'BreadcrumbList')

/* ---------- Le fil d'Ariane ---------- */

/* Les pages où le fil d'Ariane s'affiche aujourd'hui : des collections (une racine, une page à trois niveaux, une à
   cinq, des posters, en français et en anglais), une fiche produit, une page, la fiche 3D (sa capsule). */
function crumbCases() {
  const fr = nature()
  const enTous = col('tous-les-tableaux', 'All Wall Art', { count: 890, defaut: true, url: '/en/collections/all-wall-art' })
  const enNature = col('tableaux-nature-sauvage', 'Nature-Themed Wall Art Collection', { count: 327, parent: enTous, url: '/en/collections/nature-themed-wall-art' })
  const en = boutique(enTous, enNature)
  const mere = fr['tableau-lion']
  const fiche = { ...product({ suffix: 'painting' }), collections: [fr['tous-les-tableaux']], metafields: { ...product().metafields, link: { mother_collection: mf(mere) } } }
  return {
    'collection racine': pageGlobals({ page: fr['tous-les-tableaux'], collections: fr }),
    'collection Tableaux Nature': pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr }),
    'collection Tableau Lion (cinq niveaux)': pageGlobals({ page: fr['tableau-lion'], collections: fr }),
    'collection de posters': pageGlobals({ page: fr['posters-affiches-nature'], collections: fr }),
    'collection en anglais': pageGlobals({ page: { ...enNature, handle: 'nature-themed-wall-art' }, collections: en, lang: 'en' }),
    'fiche produit': { ...globals(fiche, { name: 'product', suffix: 'painting' }), collections: fr },
    'page': { ...globals(null, { name: 'page', suffix: null }), page: { title: 'Contact', url: '/pages/contact' }, collections: fr },
    'fiche 3D (capsule)': { ...globals(product(), { name: 'product', suffix: 'oeuvre-3d' }), collections: fr },
  }
}
const langOf = (vars) => vars.request.locale.iso_code

test('le fil d’Ariane, sans réglage ou replié : exactement le HTML d’avant, partout, blancs de Shopify compris', { skip: SKIP }, async () => {
  for (const shopify of [false, true]) {
    for (const [name, vars] of Object.entries(crumbCases())) {
      const lang = langOf(vars)
      const avant = await renderFile(AVANT[CRUMB], vars, { lang, id: 'breadcrumb', shopify })
      assert.ok(avant.includes('BreadcrumbList'), `${name} : la liste pour Google`)
      assert.equal(await renderFile(CRUMB, vars, { lang, shopify }), avant, `${name}, sans réglage${shopify ? ', blancs de Shopify' : ''}`)
      assert.equal(await renderFile(CRUMB, vars, { lang, shopify, settings: { affichage: 'replie' } }), avant, `${name}, replié${shopify ? ', blancs de Shopify' : ''}`)
    }
  }
})

test('les blancs de Shopify : la règle relevée en ligne sur le fil d’Ariane', { skip: SKIP }, async () => {
  // La page Tableaux Nature servie par Shopify le 23/11/2026 : trois sauts de ligne entre </breadcrumb-popup> et la
  // boîte du fil (copie des pages témoins). La règle les rend ; liquidjs seul n'en rend qu'un.
  const vars = crumbCases()['collection Tableaux Nature']
  const entre = (html) => /<\/breadcrumb-popup>(\s*)<div class="breadcrumb-popup-container/.exec(html)[1]
  assert.equal(entre(await renderFile(AVANT[CRUMB], vars, { id: 'breadcrumb', shopify: true })), '\n\n\n')
  assert.equal(entre(await renderFile(AVANT[CRUMB], vars, { id: 'breadcrumb' })), '\n')
})

/* Le fil complet rendu : [adresse ou null, nom], dans l'ordre. */
function filComplet(html) {
  const nav = /<nav class="c-fil" aria-label="([^"]*)"><ol>([\s\S]*?)<\/ol><\/nav>/.exec(html)
  assert.ok(nav, 'le fil complet : une liste dans un repère de navigation')
  return { nom: unescape(nav[1]), items: [...nav[2].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map(([, attrs, inner]) => ({ courant: /aria-current="page"/.test(attrs), lien: (/href="([^"]*)"/.exec(inner) || [])[1] || null, nom: texte(inner) })) }
}

test('le fil d’Ariane complet : chaque ancêtre en lien, la page en dernier, sans lien, sans bouton « … »', { skip: SKIP }, async () => {
  const cases = crumbCases()
  const lion = await renderFile(CRUMB, cases['collection Tableau Lion (cinq niveaux)'], { settings: { affichage: 'complet' } })
  assert.deepEqual(filComplet(lion), {
    nom: 'Fil d’Ariane',
    items: [
      { courant: false, lien: '/', nom: 'Accueil' },
      { courant: false, lien: '/collections/tous-les-tableaux', nom: 'Tous les Tableaux' },
      { courant: false, lien: '/collections/tableaux-nature-sauvage', nom: 'Tableaux Nature' },
      { courant: false, lien: '/collections/tableau-animaux', nom: 'Tableau Animaux' },
      { courant: true, lien: null, nom: 'Tableau Lion' },
    ],
  })
  // Rien de replié : ni l'élément qui ouvre la liste cachée, ni son bouton, ni sa boîte, ni son script.
  assert.doesNotMatch(lion, /breadcrumb-popup|breadcrumb-ellipsis|hidden md:inline/)
  const natureHtml = await renderFile(CRUMB, cases['collection Tableaux Nature'], { settings: { affichage: 'complet' } })
  assert.deepEqual(filComplet(natureHtml).items.map((i) => i.nom), ['Accueil', 'Tous les Tableaux', 'Tableaux Nature'])
  // Un titre avec une esperluette reste un texte.
  const posters = await renderFile(CRUMB, cases['collection de posters'], { settings: { affichage: 'complet' } })
  assert.match(posters, /<li aria-current="page">Poster &amp; Affiche Nature<\/li>/)
  // En anglais : Home, l'adresse de la langue.
  const en = await renderFile(CRUMB, cases['collection en anglais'], { lang: 'en', settings: { affichage: 'complet' } })
  assert.deepEqual(filComplet(en), {
    nom: 'Breadcrumb',
    items: [
      { courant: false, lien: '/en', nom: 'Home' },
      { courant: false, lien: '/en/collections/all-wall-art', nom: 'All Wall Art' },
      { courant: true, lien: null, nom: 'Nature-Themed Wall Art Collection' },
    ],
  })
})

test('le fil d’Ariane : la liste JSON-LD ne change pas, quel que soit l’affichage', { skip: SKIP }, async () => {
  for (const [name, vars] of Object.entries(crumbCases())) {
    const lang = langOf(vars)
    const avant = breadcrumbLd(await renderFile(AVANT[CRUMB], vars, { lang, id: 'breadcrumb' }))
    assert.equal(avant.length, 1, name)
    assert.deepEqual(breadcrumbLd(await renderFile(CRUMB, vars, { lang, settings: { affichage: 'complet' } })), avant, name)
  }
})

test('le fil d’Ariane complet : ses liens sont ceux de la liste JSON-LD, dans le même ordre', { skip: SKIP }, async () => {
  const cases = crumbCases()
  for (const name of ['collection Tableaux Nature', 'collection Tableau Lion (cinq niveaux)', 'collection de posters', 'collection en anglais', 'fiche produit', 'page']) {
    const vars = cases[name]
    const html = await renderFile(CRUMB, vars, { lang: langOf(vars), settings: { affichage: 'complet' } })
    const [ld] = breadcrumbLd(html)
    const { items } = filComplet(html)
    assert.deepEqual(items.map((i) => i.nom), ld.itemListElement.map((i) => i.name), name)
    assert.deepEqual(items.slice(0, -1).map((i) => 'https://www.myselfmonart.com' + i.lien), ld.itemListElement.slice(0, -1).map((i) => i.item), name)
  }
})

test('le fil d’Ariane : la capsule de la fiche 3D reste la capsule, même en « complet »', { skip: SKIP }, async () => {
  const vars = crumbCases()['fiche 3D (capsule)']
  assert.equal(await renderFile(CRUMB, vars, { settings: { affichage: 'complet' } }), await renderFile(AVANT[CRUMB], vars, { id: 'breadcrumb' }))
})

test('le fil d’Ariane : le réglage « affichage », replié par défaut', () => {
  const schema = schemaOf(CRUMB)
  const reglage = schema.settings.find((s) => s.id === 'affichage')
  assert.ok(reglage, 'un réglage affichage')
  assert.equal(reglage.type, 'select')
  assert.deepEqual(reglage.options.map((o) => o.value), ['replie', 'complet'])
  assert.equal(reglage.default, 'replie')
  // Le reste du schéma ne change pas.
  const avant = JSON.parse(/{% schema %}([\s\S]*?){% endschema %}/.exec(read(AVANT[CRUMB]))[1])
  assert.deepEqual({ ...schema, settings: undefined }, { ...avant, settings: undefined })
})

/* ---------- L'éditorial : la partie « intro » ---------- */

const editoVars = (page, { lang = 'fr', currentPage = 1 } = {}) => pageGlobals({ page, collections: nature(), lang, currentPage })
/* Le snippet rendu depuis son fichier, avec ses paramètres (ce que {% render 'collection-editorial-auto', partie: … %}
   lui passe) ; shopify : les blancs rognés comme Shopify. */
const renderEdito = (file, vars, params = {}, { shopify = false } = {}) => engine(langOf(vars)).parseAndRender(shopify ? blancsShopify(read(file)) : read(file), params, { globals: vars })
const renderEditoAvant = (vars, options) => renderEdito(AVANT[EDITO], vars, {}, options)

function editoCases() {
  const fr = nature()
  return {
    'page 1, tous les textes': editoVars(fr['tableaux-nature-sauvage']),
    'page 2': editoVars(fr['tableaux-nature-sauvage'], { currentPage: 2 }),
    'sans intro': editoVars({ ...fr['tableaux-nature-sauvage'], metafields: { ...fr['tableaux-nature-sauvage'].metafields, custom: { ...textes(), intro: null } } }),
    'sans questions': editoVars({ ...fr['tableaux-nature-sauvage'], metafields: { ...fr['tableaux-nature-sauvage'].metafields, custom: { ...textes(), faq: null } } }),
    'en anglais': editoVars(fr['tableaux-nature-sauvage'], { lang: 'en' }),
  }
}

test('l’éditorial sans paramètre : exactement la copie d’avant, blancs de Shopify compris', { skip: SKIP }, async () => {
  for (const shopify of [false, true]) {
    for (const [name, vars] of Object.entries(editoCases())) {
      const avant = await renderEditoAvant(vars, { shopify })
      const cas = `${name}${shopify ? ', blancs de Shopify' : ''}`
      assert.equal(await renderEdito(EDITO, vars, {}, { shopify }), avant, cas)
      assert.equal(await renderEdito(EDITO, vars, { partie: 'tout' }, { shopify }), avant, `${cas}, partie tout`)
      assert.equal(await renderEdito(EDITO, vars, { titre: true }, { shopify }), avant, `${cas}, titre`)
    }
  }
})

test('l’éditorial, rendu par {% render %} comme dans la grille : le même HTML que son fichier', { skip: SKIP }, async () => {
  const vars = editoCases()['page 1, tous les textes']
  for (const [params, scope] of [['', {}], [", partie: 'intro', titre: false", { partie: 'intro', titre: false }]]) {
    assert.equal(await engine('fr').parseAndRender(`{% render 'collection-editorial-auto'${params} %}`, {}, { globals: vars }), await renderEdito(EDITO, vars, scope), params)
  }
})

test('l’éditorial, partie « intro » : seulement l’accroche, traitée comme aujourd’hui (jetons, retours à la ligne)', { skip: SKIP }, async () => {
  const vars = editoCases()['page 1, tous les textes']
  const intro = (await renderEdito(EDITO, vars, { partie: 'intro', titre: false })).trim()
  assert.equal(intro, '<p>Respirez. Notre collection de tableaux nature fait entrer le souffle du vivant chez vous.<br />\nNotés 4,2/5 sur 86 avis.</p>')
  // Le même paragraphe que celui de l'éditorial d'aujourd'hui.
  const avant = await renderEditoAvant(vars)
  assert.ok(avant.includes(intro), 'le paragraphe de l’intro d’aujourd’hui')
  // Avec le titre (par défaut) : le h1 d'aujourd'hui, puis l'accroche ; rien du guide ni des questions.
  const avecTitre = await renderEdito(EDITO, vars, { partie: 'intro' })
  assert.equal((avecTitre.match(/<h1\b/g) || []).length, 1)
  assert.ok(avecTitre.includes(intro))
  for (const html of [intro, avecTitre]) assert.doesNotMatch(html, /Bien choisir|Quelle taille|FAQPage|<details|<section|\[\[TP_/)
  // En anglais, le point décimal.
  assert.match(await renderEdito(EDITO, editoCases()['en anglais'], { partie: 'intro', titre: false }), /4\.2\/5 sur 86 avis/)
})

test('l’éditorial, partie « intro » : rien après la page 1, rien sans intro', { skip: SKIP }, async () => {
  for (const name of ['page 2', 'sans intro']) {
    assert.equal((await renderEdito(EDITO, editoCases()[name], { partie: 'intro', titre: false })).trim(), '', name)
  }
})

test('l’éditorial sans son titre : le bloc d’aujourd’hui, sans le h1', { skip: SKIP }, async () => {
  const vars = editoCases()['page 1, tous les textes']
  for (const shopify of [false, true]) {
    const avant = await renderEditoAvant(vars, { shopify })
    const sans = await renderEdito(EDITO, vars, { titre: false }, { shopify })
    assert.doesNotMatch(sans, /<h1\b/)
    assert.equal(sans, avant.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, ''), shopify ? 'blancs de Shopify' : 'liquidjs')
  }
})

test('l’éditorial, parties « guide » et « questions » : chacune seule, comme aujourd’hui', { skip: SKIP }, async () => {
  const vars = editoCases()['page 1, tous les textes']
  const avant = await renderEditoAvant(vars)
  const guide = await renderEdito(EDITO, vars, { partie: 'guide' })
  assert.match(guide, /Bien choisir/)
  assert.match(guide, /Un guide noté 4,2\/5\./)
  assert.match(guide, /Pour aller plus loin/)
  assert.doesNotMatch(guide, /<h1\b|Respirez|Quelle taille|FAQPage|\[\[TP_/)
  const faq = await renderEdito(EDITO, vars, { partie: 'faq' })
  assert.match(faq, /Quelle taille \?/)
  assert.doesNotMatch(faq, /<h1\b|Respirez|Bien choisir|\[\[TP_/)
  // La liste FAQPage, celle d'aujourd'hui.
  assert.deepEqual(ldOf(faq).map((ld) => JSON.parse(ld)), ldOf(avant).map((ld) => JSON.parse(ld)))
  assert.equal(ldOf(faq).length, 1)
  // Rien après la page 1.
  for (const partie of ['guide', 'faq']) assert.equal((await renderEdito(EDITO, editoCases()['page 2'], { partie })).trim(), '', partie)
})

/* ---------- L'entrée : le titre, l'interrupteur, l'intro ---------- */

const entree = (page, collections, options = {}) => renderFile(ENTREE, pageGlobals({ page, collections, ...options }), { lang: options.lang || 'fr', id: 'collection_refonte' })
/* Les éléments de premier niveau d'un morceau de HTML, balises équilibrées : [{ tag, attrs, inner }]. */
function enfants(html) {
  const out = []
  const re = /<(\/?)([a-z][\w-]*)\b([^>]*?)(\/?)>/g
  let depth = 0
  let open = null
  let m
  while ((m = re.exec(html))) {
    const [all, close, tag, attrs, selfClose] = m
    if (selfClose) continue
    if (!close) {
      if (depth === 0) open = { tag, attrs, start: m.index + all.length }
      depth++
    } else if (--depth === 0) {
      out.push({ tag: open.tag, attrs: open.attrs, inner: html.slice(open.start, m.index) })
    }
  }
  return out
}
/* L'interrupteur rendu : le nom du groupe, puis ses cellules, dans l'ordre. Pour chaque cellule : son lien, si elle est
   la page, son texte (ce que lit Google), son nom pour les lecteurs d'écran (aria-label) et son nombre. */
function bascule(html) {
  const group = /<div class="c-bascule" role="group" aria-label="([^"]*)">([\s\S]*?)<\/div>/.exec(html)
  if (!group) return null
  const cells = enfants(group[2]).map(({ tag, attrs, inner }) => ({
    lien: tag === 'a' ? /href="([^"]*)"/.exec(attrs)[1] : null,
    courant: /aria-current="page"/.test(attrs),
    texte: texte(inner),
    nom: unescape((/aria-label="([^"]*)"/.exec(attrs) || [])[1] || '') || null,
    nombre: (/<span class="nb" id="nombre-haut">([^<]*)<\/span>/.exec(inner) || [])[1] || null,
  }))
  return { nom: unescape(group[1]), cells }
}

test('l’entrée : un seul h1, le titre traduit de la collection, maigre, son dernier mot en gras', { skip: SKIP }, async () => {
  const fr = nature()
  const html = await entree(fr['tableaux-nature-sauvage'], fr)
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /<h1 class="c-titre" id="template--1__collection_refonte-titre">Tableaux <b>Nature<\/b><\/h1>/)
  // La section est nommée par son titre.
  assert.match(html, /<section class="c-entree" aria-labelledby="template--1__collection_refonte-titre">/)
  // Une esperluette, un titre d'un seul mot, des blancs autour.
  const titre = async (title) => /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(await entree({ ...fr['tableaux-nature-sauvage'], title }, fr))[1]
  assert.equal(await titre('Poster & Affiche Nature'), 'Poster &amp; Affiche <b>Nature</b>')
  assert.equal(await titre('Bestsellers'), '<b>Bestsellers</b>')
  assert.equal(await titre('  Tableau Lion '), 'Tableau <b>Lion</b>')
})

test('l’entrée garde la marque de la page, une fois', { skip: SKIP }, async () => {
  const fr = nature()
  const html = await entree(fr['tableaux-nature-sauvage'], fr)
  // layout/collection.liquid cherche « data-refonte> » dans la page rendue (ticket 01).
  assert.equal((html.match(/ data-refonte>/g) || []).length, 1)
  assert.match(html, /^\s*<div hidden data-refonte><\/div>/)
})

test('l’interrupteur sur une collection de toiles : Toiles pressé avec le nombre de tableaux, Posters le lien vers la jumelle', { skip: SKIP }, async () => {
  const fr = nature()
  const html = await entree(fr['tableaux-nature-sauvage'], fr)
  assert.deepEqual(bascule(html), {
    nom: 'Toiles ou posters',
    cells: [
      { lien: '/collections/posters-affiches-nature', courant: false, texte: 'Posters Poster & Affiche Nature', nom: 'Posters : Poster & Affiche Nature', nombre: null },
      { lien: null, courant: true, texte: 'Toiles 327', nom: null, nombre: '327' },
    ],
  })
  // Le titre entier de la jumelle, pour Google : invisible, collé au coin du lien (il ne dépasse jamais de l'écran).
  assert.match(html, /<span>Posters<\/span> <span class="sr-only left-0 top-0">Poster &amp; Affiche Nature<\/span><\/a>/)
  // Les icônes de la bascule des fiches produit : Tabler « photo » pour les posters, « frame » pour les toiles.
  assert.match(html, /<a href="\/collections\/posters-affiches-nature" aria-label="[^"]+"><svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?M15 8h\.01/)
  assert.match(html, /<span aria-current="page"><svg\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?M4 7l16 0/)
  // Un seul lien vers la jumelle dans l'entrée, et aucun autre lien.
  assert.deepEqual(liens(html).map(([href]) => href), ['/collections/posters-affiches-nature'])
  // Le nombre n'est écrit qu'une fois (le ticket 06 le met à jour avec les filtres).
  assert.equal((html.match(/id="nombre-haut"/g) || []).length, 1)
})

test('l’interrupteur sur une collection de posters : Posters pressé, Toiles mène à la jumelle', { skip: SKIP }, async () => {
  const fr = nature()
  assert.deepEqual(bascule(await entree(fr['posters-affiches-nature'], fr)), {
    nom: 'Toiles ou posters',
    cells: [
      { lien: null, courant: true, texte: 'Posters 120', nom: null, nombre: '120' },
      { lien: '/collections/tableaux-nature-sauvage', courant: false, texte: 'Toiles Tableaux Nature', nom: 'Toiles : Tableaux Nature', nombre: null },
    ],
  })
})

test('sans jumelle publiée et pleine, pas d’interrupteur : le nombre de tableaux à côté du titre', { skip: SKIP }, async () => {
  const sansJumelle = async (page, collections, options) => {
    const html = await entree(page, collections, options)
    assert.equal(bascule(html), null)
    assert.deepEqual(liens(html), [])
    return texte(/<p class="c-nombre" id="nombre-haut">([\s\S]*?)<\/p>/.exec(html)[1])
  }
  // La jumelle n'est pas publiée (collections[…] ne la trouve pas), ou n'a aucun produit.
  const absente = nature()
  delete absente['posters-affiches-nature']
  assert.equal(await sansJumelle(absente['tableaux-nature-sauvage'], absente), '327 tableaux')
  const vide = nature({ jumelle: 0 })
  assert.equal(await sansJumelle(vide['tableaux-nature-sauvage'], vide), '327 tableaux')
  // Une racine n'a pas de jumelle ; une collection hors du plan non plus ; ni une page sans plan.
  const fr = nature()
  assert.equal(await sansJumelle(fr['tous-les-tableaux'], fr), '890 tableaux')
  const papier = col('papier-peint-fleur', 'Papier Peint fleur', { count: 1, type: 'other' })
  assert.equal(await sansJumelle(papier, boutique(...fr, papier)), '1 tableau')
  assert.equal(await sansJumelle(fr['tableaux-nature-sauvage'], fr, { plan: null }), '327 tableaux')
})

test('hors du français, la page se retrouve par sa collection, et la jumelle est nommée dans la langue', { skip: SKIP }, async () => {
  // Sur /en, collection.handle est traduit, mais collections['tableaux-nature-sauvage'] répond toujours.
  const en = boutique(
    col('tableaux-nature-sauvage', 'Nature-Themed Wall Art Collection', { count: 327, url: '/en/collections/nature-themed-wall-art', custom: textes('Breathe.') }),
    col('posters-affiches-nature', 'Nature Posters & Prints', { count: 120, type: 'poster', url: '/en/collections/nature-posters-prints' }),
  )
  const page = { ...en['tableaux-nature-sauvage'], handle: 'nature-themed-wall-art' }
  const html = await entree(page, en, { lang: 'en' })
  assert.deepEqual(bascule(html), {
    nom: 'Canvas or posters',
    cells: [
      { lien: '/en/collections/nature-posters-prints', courant: false, texte: 'Posters Nature Posters & Prints', nom: 'Posters: Nature Posters & Prints', nombre: null },
      { lien: null, courant: true, texte: 'Canvas 327', nom: null, nombre: '327' },
    ],
  })
  assert.match(html, /<h1\b[^>]*>Nature-Themed Wall Art <b>Collection<\/b><\/h1>/)
})

test('l’intro : le texte de l’éditorial sur deux lignes, « Lire la suite » au bout, qui déplie le texte', { skip: SKIP }, async () => {
  const fr = nature()
  const html = await entree(fr['tableaux-nature-sauvage'], fr)
  const intro = /<collection-intro class="c-intro replie" id="([^"]+)">([\s\S]*?)<\/collection-intro>/.exec(html)
  assert.ok(intro, 'l’intro, repliée')
  // Le paragraphe de l'éditorial, jetons remplacés.
  const editorial = (await renderEdito(EDITO, editoVars(fr['tableaux-nature-sauvage']), { partie: 'intro', titre: false })).trim()
  assert.ok(intro[2].includes(editorial), 'le paragraphe de collection-editorial-auto')
  // Le bouton : il dit ce qu'il fait, et ce qu'il commande.
  const bouton = /<button type="button" class="c-intro-plus" aria-expanded="false" aria-controls="([^"]+)">([\s\S]*?)<\/button>/.exec(intro[2])
  assert.ok(bouton, 'le bouton « Lire la suite »')
  assert.equal(bouton[1], intro[1])
  assert.deepEqual([...bouton[2].matchAll(/<span class="(c-intro-[a-z]+)">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]), [['c-intro-lire', 'Lire la suite'], ['c-intro-reduire', 'Réduire']])
  // Le script du bouton, chargé en différé.
  assert.match(html, /<script src="\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/collection-intro\.js\?v=1" defer><\/script>/)
  // Aucun jeton Trustpilot ne reste.
  assert.doesNotMatch(html, /\[\[TP_/)
})

test('l’intro : rien après la page 1, ni sans texte (pas de bouton seul)', { skip: SKIP }, async () => {
  const fr = nature()
  const page2 = await entree(fr['tableaux-nature-sauvage'], fr, { currentPage: 2 })
  assert.doesNotMatch(page2, /collection-intro|c-intro-plus/)
  // Le titre et l'interrupteur restent.
  assert.match(page2, /<h1\b/)
  assert.ok(bascule(page2))
  const sans = nature({ intro: null })
  assert.doesNotMatch(await entree(sans['tableaux-nature-sauvage'], sans), /collection-intro|c-intro-plus/)
})

test('les textes de l’entrée : sous sections.mma.collection.entree, dans les cinq langues, traduits', { skip: SKIP }, async () => {
  const fr = locales.fr.sections.mma.collection.entree
  assert.deepEqual(Object.keys(fr).sort(), ['groupe', 'lien_jumelle', 'lire_la_suite', 'posters', 'reduire', 'tableaux', 'toiles'])
  assert.deepEqual(Object.keys(fr.tableaux).sort(), ['one', 'other'])
  for (const lang of Object.keys(LANGS)) {
    const t = locales[lang].sections.mma.collection.entree
    assert.deepEqual(Object.keys(t).sort(), Object.keys(fr).sort(), lang)
    for (const key of ['groupe', 'lire_la_suite', 'posters', 'reduire', 'toiles']) assert.ok(typeof t[key] === 'string' && t[key].trim(), `${lang}.${key}`)
    for (const form of ['one', 'other']) assert.match(t.tableaux[form], /^{{ count }} \S/, `${lang}.tableaux.${form}`)
    if (lang !== 'fr') for (const key of ['groupe', 'lire_la_suite', 'reduire', 'toiles']) assert.notEqual(t[key], fr[key], `${lang}.${key} : resté en français`)
    // Le nom du lien vers la jumelle : le mot de la cellule, puis le titre entier, avec la ponctuation de la langue.
    assert.equal(t.lien_jumelle, lang === 'fr' ? '{{ format }} : {{ titre }}' : '{{ format }}: {{ titre }}', `${lang}.lien_jumelle`)
  }
  // Rendu dans chaque langue : le groupe, les deux cellules, le bouton.
  for (const lang of Object.keys(LANGS)) {
    const t = locales[lang].sections.mma.collection.entree
    const c = nature()
    const html = await entree(c['tableaux-nature-sauvage'], c, { lang, primary: lang === 'fr' })
    const b = bascule(html)
    assert.equal(b.nom, t.groupe, lang)
    assert.deepEqual(b.cells.map((cell) => cell.texte.split(' ')[0]), [t.posters, t.toiles].map((w) => w.split(' ')[0]), lang)
    assert.ok(html.includes(`<span class="c-intro-lire">${t.lire_la_suite}</span>`), lang)
  }
})

test('la section de l’entrée : aucun réglage, aucun préréglage, un nom de schéma que Shopify accepte', () => {
  const schema = schemaOf(ENTREE)
  assert.ok(schema.name.length <= 25, schema.name)
  assert.deepEqual(Object.keys(schema).sort(), ['enabled_on', 'limit', 'name'])
})

/* ---------- La grille : l'éditorial et le bas de page cocon, sur réglage ---------- */

test('la grille : deux cases, « éditorial » et « bas de page cocon », cochées par défaut', () => {
  const settings = schemaOf(GRILLE).settings
  for (const id of ['editorial', 'cocon_famille']) {
    const s = settings.find((x) => x.id === id)
    assert.ok(s, id)
    assert.equal(s.type, 'checkbox', id)
    assert.equal(s.default, true, id)
  }
})

test('la grille, cases cochées (par défaut) : exactement le HTML d’avant, blancs de Shopify compris', { skip: SKIP }, async () => {
  const fr = nature()
  for (const shopify of [false, true]) {
    for (const page of [fr['tableaux-nature-sauvage'], fr['tableau-lion'], fr['posters-affiches-nature'], fr['tous-les-tableaux']]) {
      for (const currentPage of [1, 2]) {
        const vars = pageGlobals({ page, collections: fr, currentPage })
        const settings = { primary_image_index: 1, next_image_index: 0, margin_top: 'mt-0' }
        const avant = await renderFile(AVANT[GRILLE], vars, { id: 'main-collection-product-grid', settings, shopify })
        assert.equal(await renderFile(GRILLE, vars, { settings, shopify }), avant, `${page.handle}, page ${currentPage}${shopify ? ', blancs de Shopify' : ''}`)
      }
    }
  }
})

test('la grille, cases décochées : ni l’éditorial ni le bas de page cocon, le reste à l’identique', { skip: SKIP }, async () => {
  const fr = nature()
  const vars = pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr })
  const avec = await renderFile(GRILLE, vars)
  assert.match(avec, /<section class="collection-editorial-auto/)
  assert.match(avec, /<nav class="cocon-famille/)
  const sans = await renderFile(GRILLE, vars, { settings: { editorial: false, cocon_famille: false } })
  assert.doesNotMatch(sans, /collection-editorial-auto|cocon-famille|<h1\b|Aussi en poster/)
  // La liste ItemList reste.
  assert.ok(ldOf(sans).some((ld) => JSON.parse(ld)['@type'] === 'ItemList'))
  assert.doesNotMatch(await renderFile(GRILLE, vars, { settings: { editorial: false } }), /collection-editorial-auto/)
  assert.doesNotMatch(await renderFile(GRILLE, vars, { settings: { cocon_famille: false } }), /cocon-famille/)
})

/* ---------- La page dans le plan : un snippet pour le bas de page cocon et pour l'entrée ---------- */

const NOEUD = 'snippets/cocon-noeud.liquid'
const COCON = 'snippets/cocon-famille.liquid'
const COCON_AVANT = 'scripts/fixtures/cocon-famille.avant-refonte.liquid'
const renderSource = (file, vars, { shopify = false } = {}) => engine(langOf(vars)).parseAndRender(shopify ? blancsShopify(read(file)) : read(file), {}, { globals: vars })

/* Autour de Tableaux Nature, en anglais : les titres et les adresses de la langue, les handles français dans le plan. */
function natureEn() {
  const tous = col('tous-les-tableaux', 'All Wall Art', { count: 890, defaut: true, url: '/en/collections/all-wall-art' })
  const page = col('tableaux-nature-sauvage', 'Nature-Themed Wall Art Collection', { count: 327, parent: tous, url: '/en/collections/nature-themed-wall-art', custom: textes('Breathe.') })
  const portrait = col('tableau-portrait-1', 'Portrait Art Collection', { count: 200, parent: tous, url: '/en/collections/portrait-art-collection' })
  const posters = col('posters-affiches-nature', 'Nature Posters & Prints', { count: 120, type: 'poster', url: '/en/collections/nature-posters-prints' })
  return boutique(tous, page, portrait, posters)
}

test('le nœud de la page dans le plan : par son handle, par sa collection hors du français, ou rien', { skip: SKIP }, async () => {
  const fr = nature()
  const noeud = async (page, collections, options = {}) => renderSource(NOEUD, pageGlobals({ page, collections, ...options }))
  assert.equal(await noeud(fr['tableaux-nature-sauvage'], fr), 'tableaux-nature-sauvage')
  assert.equal(await noeud(fr['posters-affiches-nature'], fr), 'posters-affiches-nature')
  // Sur /en, le handle est traduit : la collection se reconnaît à son identifiant.
  const en = natureEn()
  assert.equal(await noeud({ ...en['tableaux-nature-sauvage'], handle: 'nature-themed-wall-art' }, en, { lang: 'en' }), 'tableaux-nature-sauvage')
  // Hors du plan, ou sans plan.
  const papier = col('papier-peint-fleur', 'Papier Peint fleur', { count: 1, type: 'other' })
  assert.equal(await noeud(papier, boutique(...fr, papier)), '')
  assert.equal(await noeud(fr['tableaux-nature-sauvage'], fr, { plan: null }), '')
})

test('le bas de page cocon, qui prend le nœud au snippet : exactement le HTML d’avant, blancs de Shopify compris', { skip: SKIP }, async () => {
  const fr = nature()
  const en = natureEn()
  const papier = col('papier-peint-fleur', 'Papier Peint fleur', { count: 1, type: 'other' })
  const cas = {
    'Tableaux Nature': pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr }),
    'Tableau Lion': pageGlobals({ page: fr['tableau-lion'], collections: fr }),
    'Poster & Affiche Nature': pageGlobals({ page: fr['posters-affiches-nature'], collections: fr }),
    'une racine': pageGlobals({ page: fr['tous-les-tableaux'], collections: fr }),
    'hors du plan': pageGlobals({ page: papier, collections: boutique(...fr, papier) }),
    'sans plan': pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr, plan: null }),
    'en anglais': pageGlobals({ page: { ...en['tableaux-nature-sauvage'], handle: 'nature-themed-wall-art' }, collections: en, lang: 'en' }),
  }
  for (const shopify of [false, true]) {
    for (const [name, vars] of Object.entries(cas)) {
      const avant = await renderSource(COCON_AVANT, vars, { shopify })
      assert.equal(await renderSource(COCON, vars, { shopify }), avant, `${name}${shopify ? ', blancs de Shopify' : ''}`)
    }
  }
  // Le cas qui compte : la jumelle et les sœurs sont bien là.
  assert.match(await renderSource(COCON, cas['en anglais']), /Also as a poster[\s\S]*nature-posters-prints/)
})

/* ---------- Le bouton « Lire la suite » (assets/collection-intro.js) ---------- */

/* L'élément <collection-intro> dans une page réduite à ce que le script touche : son paragraphe (sa hauteur à l'écran,
   celle de son texte entier), son bouton, et ce qui avertit le script quand la taille du texte change. */
function intro({ hauteurTexte, hauteurBoite }) {
  const vm = require('vm')
  const classes = new Set(['c-intro', 'replie'])
  const bouton = { hidden: false, attrs: { 'aria-expanded': 'false' }, clic: null, setAttribute(k, v) { this.attrs[k] = v }, addEventListener(type, f) { if (type === 'click') this.clic = f } }
  const texte = { scrollHeight: hauteurTexte, clientHeight: hauteurBoite }
  const observateurs = []
  let polices = null
  const page = {
    HTMLElement: class {},
    customElements: { liste: {}, get(nom) { return this.liste[nom] }, define(nom, classe) { this.liste[nom] = classe } },
    ResizeObserver: class { constructor(f) { this.f = f; observateurs.push(this) } observe() {} disconnect() {} },
    document: { fonts: { ready: { then(f) { polices = f } } } },
  }
  vm.runInNewContext(read('assets/collection-intro.js'), page)
  const element = new (page.customElements.get('collection-intro'))()
  element.classList = { toggle(c) { if (classes.has(c)) { classes.delete(c); return false } classes.add(c); return true }, contains: (c) => classes.has(c) }
  element.querySelector = (sel) => ({ p: texte, '.c-intro-plus': bouton })[sel] || null
  element.connectedCallback()
  return { bouton, texte, classes, redimensionner: () => observateurs.forEach((o) => o.f()), policesArrivees: () => polices && polices() }
}

test('« Lire la suite » : un toucher déplie l’intro, un autre la replie, aria-expanded suit', () => {
  const { bouton, classes, redimensionner } = intro({ hauteurTexte: 131, hauteurBoite: 44 })
  redimensionner()
  assert.equal(bouton.hidden, false, 'le texte dépasse ses deux lignes : le bouton se montre')
  bouton.clic()
  assert.equal(classes.has('replie'), false)
  assert.equal(bouton.attrs['aria-expanded'], 'true')
  bouton.clic()
  assert.equal(classes.has('replie'), true)
  assert.equal(bouton.attrs['aria-expanded'], 'false')
})

test('« Lire la suite » : pas de bouton quand le texte tient en deux lignes (chaque toucher a un effet)', () => {
  const court = intro({ hauteurTexte: 22, hauteurBoite: 22 })
  court.redimensionner()
  assert.equal(court.bouton.hidden, true)
  // La police de la page arrive : le texte se replace, le bouton suit.
  court.texte.scrollHeight = 66
  court.texte.clientHeight = 44
  court.policesArrivees()
  assert.equal(court.bouton.hidden, false)
  // Déplié, le texte tient tout entier : le bouton « Réduire » reste.
  court.bouton.clic()
  court.texte.scrollHeight = 66
  court.texte.clientHeight = 66
  court.redimensionner()
  assert.equal(court.bouton.hidden, false)
})

/* ---------- Le modèle caché et la page de test ---------- */

test('le modèle caché : le fil complet, l’entrée, les pastilles, puis la grille sans éditorial ni bas de page cocon', () => {
  const modele = json(MODELE)
  const types = modele.order.map((key) => modele.sections[key].type)
  assert.deepEqual(types.slice(0, 2), ['breadcrumb', 'collection-refonte'])
  const section = (type) => modele.sections[modele.order[types.indexOf(type)]]
  assert.equal(section('breadcrumb').settings.affichage, 'complet')
  assert.equal(section('main-collection-product-grid').settings.editorial, false)
  assert.equal(section('main-collection-product-grid').settings.cocon_famille, false)
})

test('les autres modèles de collection ne changent pas : fil replié, éditorial et bas de page cocon', () => {
  const files = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^collection(\.[^.]+)?\.json$/.test(name) && name !== 'collection.refonte.json')
  assert.ok(files.length >= 20, 'les modèles de collection')
  for (const file of files) {
    for (const [key, s] of Object.entries(json(`templates/${file}`).sections)) {
      if (s.type === 'breadcrumb') assert.notEqual((s.settings || {}).affichage, 'complet', `${file} : ${key}`)
      if (s.type === 'main-collection-product-grid') {
        assert.notEqual((s.settings || {}).editorial, false, `${file} : ${key}`)
        assert.notEqual((s.settings || {}).cocon_famille, false, `${file} : ${key}`)
      }
    }
    assert.ok(!Object.values(json(`templates/${file}`).sections).some((s) => s.type === 'collection-refonte'), `${file} : sans l’entrée de la nouvelle page`)
  }
})

/* La page d'un modèle : ses sections dans l'ordre (le fil, l'entrée, les pastilles, la grille), chacune avec les
   réglages du modèle. Les autres sections du modèle par défaut (bannière désactivée, badges) n'ont ni titre, ni lien de
   la famille, ni liste pour Google. */
const RENDUES = ['breadcrumb', 'collection-refonte', 'sous-collections', 'main-collection-product-grid']
async function pageDuModele(file, vars) {
  const modele = json(file)
  let html = ''
  for (const key of modele.order) {
    const s = modele.sections[key]
    if (s.disabled || !RENDUES.includes(s.type)) continue
    html += await renderFile(`sections/${s.type}.liquid`, vars, { settings: s.settings || {}, id: key })
  }
  return html
}

test('la page de test : un seul h1, un seul lien vers la jumelle, la liste BreadcrumbList de la page normale', { skip: SKIP }, async () => {
  for (const handle of ['tableaux-nature-sauvage', 'posters-affiches-nature', 'tableau-lion']) {
    const fr = nature()
    const vars = pageGlobals({ page: fr[handle], collections: fr })
    const refonte = await pageDuModele(MODELE, vars)
    const normale = await pageDuModele('templates/collection.json', vars)
    assert.equal((refonte.match(/<h1\b/g) || []).length, 1, `${handle} : un seul h1`)
    assert.match(refonte, /<h1 class="c-titre"/, `${handle} : celui de l’entrée`)
    const jumeau = PLAN.noeuds.find((n) => n.id === handle).jumeau
    const versJumelle = liens(refonte).filter(([href]) => href === fr[jumeau].url)
    assert.equal(versJumelle.length, 1, `${handle} : un seul lien vers la jumelle`)
    assert.deepEqual(breadcrumbLd(refonte), breadcrumbLd(normale), `${handle} : la même liste BreadcrumbList`)
    assert.equal(breadcrumbLd(refonte).length, 1)
    assert.doesNotMatch(refonte, /\[\[TP_/)
  }
})
