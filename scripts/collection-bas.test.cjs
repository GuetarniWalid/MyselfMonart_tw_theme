// La nouvelle page collection, ticket 08 (dossier .scratch/collection-design) : le bas de la page, après la grille.
// - « Envie d'un autre sujet ? » (sections/collection-sujets.liquid) : les sœurs de la page, tirées du plan du cocon
//   par snippets/cocon-famille.liquid en mode « emblèmes », chacune en grand emblème (snippets/collection-embleme.liquid),
//   et le couple de tableau ancien qui part les voir (un décor) ;
// - le guide (sections/collection-guide.liquid) : le texte de custom.guide, traité comme aujourd'hui
//   (snippets/collection-editorial-auto.liquid, partie « guide »), dans une carte pêche repliée, avec le voyageur ;
// - les questions (sections/collection-questions.liquid) : les questions de custom.faq en volets, la carte ciel avec la
//   Joconde au casque, et la liste FAQPage d'aujourd'hui (même snippet, partie « faq-ld »).
// Mêmes textes et mêmes données Google qu'aujourd'hui : la grille d'aujourd'hui les écrivait sous les tableaux
// (sections/main-collection-product-grid.liquid). Le bas de page « liens » d'aujourd'hui ne change pas (copie d'avant :
// scripts/fixtures/cocon-famille.avant-refonte.liquid), ni l'éditorial rendu sans paramètre
// (scripts/fixtures/collection-editorial-auto.avant-refonte.liquid).
// Ici, le rendu Liquid (liquidjs) : sans lui, ces tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-bas.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, code, json, schemaOf, rules, blocs, LANGS, SKIP, engine, locales, globals, templateOf, ldOf } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

const SUJETS = 'sections/collection-sujets.liquid'
const GUIDE = 'sections/collection-guide.liquid'
const QUESTIONS = 'sections/collection-questions.liquid'
const COCON = 'snippets/cocon-famille.liquid'
const COCON_AVANT = 'scripts/fixtures/cocon-famille.avant-refonte.liquid'
const EDITO = 'snippets/collection-editorial-auto.liquid'
const EDITO_AVANT = 'scripts/fixtures/collection-editorial-auto.avant-refonte.liquid'
const MODELE = 'templates/collection.refonte.json'
const CSS = 'assets/collection-refonte.css'

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
      if (text && typeof text === 'object' && 'count' in values) text = text[new Intl.PluralRules(lang).select(Number(values.count))] ?? text.other
      if (typeof text !== 'string') return key
      const html = String(key).endsWith('_html')
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? (html ? String(values[name]) : echappe(values[name])) : hole))
    })
    // {% paginate %} : son contenu, sur une seule page (la grille de la page de test n'a pas de produits).
    e.registerTag('paginate', {
      parse(token, remain) {
        this.tpls = []
        const stream = this.liquid.parser.parseStream(remain)
        stream.on('tag:endpaginate', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('paginate non fermé') })
        stream.start()
      },
      * render(ctx, emitter) {
        ctx.push({ paginate: { pages: 1, current_page: 1, current_offset: 0, previous: null, next: null, parts: [] } })
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
        ctx.pop()
      },
    })
  }
}

/* Les blancs comme les rogne Shopify (« compatibilité de bogue », relevée en ligne : scripts/collection-entree.test.cjs) :
   un texte fait seulement de blancs, entre une balise sans tiret final et une balise « {%- » ou « {{- », garde son
   premier caractère. Le source est réécrit pour que liquidjs le rende aussi. */
const blancsShopify = (source) => source.replace(/(?<!-)(%\}|\}\})([ \t\r\n]+)\{([%{])-/g, (m, fin, blancs, ouvre) => `${fin}${blancs[0]}{${ouvre}`)

/* ---------- La boutique d'essai ---------- */

const mf = (value) => ({ value })
const FILES = '//www.myselfmonart.com/cdn/shop/files/'
/* Le fichier d'un emblème (métachamp cocon.embleme) : une image de 640 × 528 px, comme ceux de la famille Nature. */
const fichier = (name) => ({ id: 31640, src: `${FILES}${name}?v=1`, width: 640, height: 528, aspect_ratio: 640 / 528, alt: '', media_type: 'image' })
let lastId = 800000000000
/* Une collection, telle que la donnent collection et collections[handle] : sa place dans le fil d'Ariane, ses textes
   (custom.*) et son emblème (cocon.*). */
function col(handle, title, { count = 10, url = `/collections/${handle}`, type = 'painting', defaut = false, parent = null, custom = {}, couleur = null, embleme = false } = {}) {
  const cocon = {}
  if (embleme) cocon.embleme = mf(fichier(`embleme-${handle}.webp`))
  if (couleur) cocon.embleme_couleur = mf(couleur)
  return {
    id: ++lastId, handle, title, url, products_count: count, all_products_count: count, products: [], filters: [],
    metafields: {
      custom: { type_of_collection: type, ...custom },
      collection_par_default: { boolean: defaut },
      breadcrumb: { parentCollection: parent ? mf(parent) : null, parentPage: null },
      cocon,
    },
  }
}
/* Les collections de la boutique : une liste (le fil d'Ariane la parcourt) où chacune se trouve aussi par son handle
   français, comme dans Shopify. */
function boutique(...list) {
  const all = [...list]
  for (const c of list) all[c.handle] = c
  return all
}

// Les textes de Tableaux Nature, raccourcis : la note Trustpilot en jetons, un lien de produit, un lien de collection
// dans une réponse (le ticket 10 traitera ces liens), une question sans réponse (jamais montrée), un « Pour aller plus
// loin » qui garde son article et perd sa collection.
const INTRO = 'Respirez. Notre collection de tableaux nature fait entrer le souffle du vivant chez vous.'
const GUIDE_TEXTE = '<h2>Comment choisir votre tableau nature ?</h2>\n<p>Un <strong>tableau nature</strong> ne se choisit pas au hasard : <a href="/products/creation-artistique-montagnes-du-japon-apaisantes">les montagnes du Japon</a>.</p>\n<h3>Placement, format et finition</h3>\n<p>Une note de [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.</p>'
const FAQ = [
  { q: 'Comment choisir un tableau nature adapté à ma pièce ?', a: '<p>Partez de l’ambiance souhaitée.</p>' },
  { q: 'Que disent nos clients ([[TP_COUNT]] avis) ?', a: '<p>Ils nous donnent [[TP_SCORE]]/5.</p>' },
  { q: '', a: '<p>Une réponse sans question.</p>' },
  { q: 'Une question sans réponse ?', a: '' },
  { q: 'Proposez-vous d’autres univers proches de la nature ?', a: '<p>Oui : nos <a href="/collections/tableau-zen">tableaux zen</a>.</p>' },
]
const PLUS_LOIN = [{ url: '/blogs/deco/un-salon-nature', label: 'Un salon nature' }, { url: '/collections/tableau-fleurs', label: 'Fleurs' }]
const textes = ({ guide = GUIDE_TEXTE, faq = FAQ } = {}) => ({ intro: mf(INTRO), guide: guide == null ? null : mf(guide), faq: faq == null ? null : mf(faq), cocon_links: mf(PLUS_LOIN) })

/* Autour de Tableaux Nature, en français : la racine, la page et ses filles (Animaux, Fleurs, Mer, Paysage), ses sœurs
   du même rayon (Portrait, Femme, Ville, Espace, en emblèmes ; Cinéma, une piste du plan, jamais montrée), des filles
   de la racine d'autres rayons (Bleu, Salon), Tableau Lion et ses sœurs, la racine des posters et les jumelles. */
function nature({ custom = textes() } = {}) {
  const tous = col('tous-les-tableaux', 'Tous les Tableaux', { count: 890, defaut: true })
  const page = col('tableaux-nature-sauvage', 'Tableaux Nature', { count: 327, parent: tous, custom })
  const animaux = col('tableau-animaux', 'Tableau Animaux', { count: 152, parent: page })
  const tousPosters = col('posters-affiches', 'Tous les Posters & Affiches', { count: 680, type: 'poster' })
  const posters = col('posters-affiches-nature', 'Poster & Affiche Nature', { count: 120, type: 'poster', parent: tousPosters, custom })
  return boutique(
    tous, page, animaux,
    col('tableau-fleurs', 'Tableau Fleurs', { count: 115, parent: page }),
    col('tableau-mer-1', 'Tableau Mer', { count: 39, parent: page }),
    col('tableau-paysage', 'Tableau Paysage', { count: 90, parent: page }),
    col('tableau-portrait-1', 'Tableau Portrait', { count: 64, parent: tous, embleme: true, couleur: 'soleil' }),
    col('tableau-femme', 'Tableau Femme', { count: 89, parent: tous, embleme: true, couleur: 'menthe' }),
    col('tableau-ville', 'Tableau Ville', { count: 72, parent: tous, embleme: true, couleur: 'ciel' }),
    col('tableau-espace', 'Tableau Espace', { count: 33, parent: tous }),
    col('tableau-cinema', 'Tableau Cinéma', { count: 20, parent: tous }),
    col('tableau-bleue', 'Tableau Bleu', { count: 90, parent: tous }),
    col('tableau-salon', 'Tableau Salon', { count: 496, parent: tous }),
    col('tableau-lion', 'Tableau Lion', { count: 8, parent: animaux, custom }),
    col('tableau-cheval', 'Tableau Chevaux', { count: 12, parent: animaux }),
    col('tableau-oiseaux', 'Tableau Oiseaux', { count: 31, parent: animaux }),
    col('tableau-chat', 'Tableau Chat', { count: 5, parent: animaux }),
    col('tableau-zebre', 'Tableau Zèbre', { count: 0, parent: animaux }),
    tousPosters, posters,
    col('posters-affiches-portrait', 'Poster & Affiche Portrait', { count: 40, type: 'poster', parent: tousPosters }),
    col('posters-affiches-lion', 'Poster & Affiche Lion', { count: 9, type: 'poster', parent: posters }),
  )
}
// Les sœurs de Tableaux Nature, dans l'ordre du plan : celles du rayon « sujet » de la racine, créées et pleines.
const SOEURS_NATURE = ['/collections/tableau-portrait-1', '/collections/tableau-femme', '/collections/tableau-ville', '/collections/tableau-espace']

/* Ce que Shopify donne à toute page de collection. */
const pageGlobals = ({ page, collections, lang = 'fr', primary = lang === 'fr', plan = PLAN, currentPage = 1 }) => ({
  ...globals(null, { name: 'collection', lang }),
  template: templateOf('collection', null),
  collection: page,
  collections,
  current_page: currentPage,
  shop: { name: 'MyselfMonArt', url: 'https://www.myselfmonart.com', metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
  request: { page_type: 'collection', origin: 'https://www.myselfmonart.com', locale: { iso_code: lang, primary } },
  routes: { root_url: lang === 'fr' ? '/' : `/${lang}` },
  settings: { trustpilot_score_global: 42, trustpilot_review_count_global: 86 },
  cart: { currency: { iso_code: 'EUR', symbol: '€' } },
})
const langOf = (vars) => vars.request.locale.iso_code

/* Une section rendue seule, sans son schéma (que Shopify ne rend pas), avec les réglages que Shopify lui donne : ceux du
   modèle, et pour les autres la valeur par défaut du schéma. shopify : les blancs rognés comme Shopify. */
const parsed = new Map()
function renderFile(file, vars, { settings = {}, id = path.basename(file, '.liquid'), shopify = false } = {}) {
  const lang = langOf(vars)
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
/* Un snippet rendu depuis un fichier (le snippet ou sa copie d'avant), avec ses paramètres, comme {% render %} les lui
   passe ; shopify : les blancs rognés comme Shopify. */
const renderSource = (file, vars, params = {}, { shopify = false } = {}) => engine(langOf(vars)).parseAndRender(shopify ? blancsShopify(read(file)) : read(file), params, { globals: vars })

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// Le texte d'un morceau de HTML, tel que le lisent Google et les lecteurs d'écran (sans balises ni blancs en trop).
const texte = (html) => unescape(html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<\/?(a|b|span|strong|em)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
// Les liens d'un HTML, dans l'ordre : [adresse, texte].
const liens = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, inner]) => [href, texte(inner)])
// Les balises <name …> d'un HTML, chacune en { attribut: valeur } (un attribut sans valeur vaut '').
const balises = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'g'))].map(([, attrs]) => Object.fromEntries([...attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? ''])))
/* Le contenu de l'élément qui porte cette classe (balises équilibrées), ou null. */
function contenu(html, classe) {
  const start = new RegExp(`<([a-z][\\w-]*)\\b[^>]*\\bclass="(?:[^"]*\\s)?${classe}(?:\\s[^"]*)?"[^>]*>`).exec(html)
  if (!start) return null
  const tag = start[1]
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
  re.lastIndex = start.index + start[0].length
  let depth = 1
  let m
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1
    if (!depth) return html.slice(start.index + start[0].length, m.index)
  }
  return null
}
const ldTypes = (html) => ldOf(html).map((ld) => JSON.parse(ld))
const ldDe = (html, type) => ldOf(html).filter((ld) => JSON.parse(ld)['@type'] === type)

/* ---------- Le bas de page cocon : « liens », comme avant ; « emblèmes », les sœurs seules ---------- */

function coconCases() {
  const fr = nature()
  const enTous = col('tous-les-tableaux', 'All Wall Art', { count: 890, defaut: true, url: '/en/collections/all-wall-art' })
  const enNature = col('tableaux-nature-sauvage', 'Nature-Themed Wall Art Collection', { count: 327, parent: enTous, url: '/en/collections/nature-themed-wall-art' })
  const en = boutique(enTous, enNature,
    col('tableau-portrait-1', 'Portrait Art Collection', { count: 64, parent: enTous, url: '/en/collections/portrait-art-collection' }),
    col('posters-affiches-nature', 'Nature Posters & Prints', { count: 120, type: 'poster', url: '/en/collections/nature-posters-prints' }))
  const papier = col('papier-peint-fleur', 'Papier Peint fleur', { count: 1, type: 'other' })
  return {
    'Tableaux Nature': pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr }),
    'Tableau Lion': pageGlobals({ page: fr['tableau-lion'], collections: fr }),
    'Poster & Affiche Nature': pageGlobals({ page: fr['posters-affiches-nature'], collections: fr }),
    'une racine': pageGlobals({ page: fr['tous-les-tableaux'], collections: fr }),
    'hors du plan': pageGlobals({ page: papier, collections: boutique(...fr, papier) }),
    'sans plan': pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr, plan: null }),
    'en anglais': pageGlobals({ page: { ...enNature, handle: 'nature-themed-wall-art' }, collections: en, lang: 'en', primary: false }),
  }
}

test('le bas de page cocon, sans paramètre ou en « liens » : exactement le HTML d’avant, blancs de Shopify compris', { skip: SKIP }, async () => {
  for (const shopify of [false, true]) {
    for (const [name, vars] of Object.entries(coconCases())) {
      const avant = await renderSource(COCON_AVANT, vars, {}, { shopify })
      const cas = `${name}${shopify ? ', blancs de Shopify' : ''}`
      assert.equal(await renderSource(COCON, vars, {}, { shopify }), avant, cas)
      assert.equal(await renderSource(COCON, vars, { mode: 'liens' }, { shopify }), avant, `${cas}, mode liens`)
    }
  }
  // Rendu par {% render %}, comme dans la grille d'aujourd'hui : le même HTML.
  const vars = coconCases()['Tableaux Nature']
  assert.equal(await engine('fr').parseAndRender("{% render 'cocon-famille' %}", {}, { globals: vars }), await renderSource(COCON_AVANT, vars))
  assert.match(await renderSource(COCON, vars), /Autres sujets[\s\S]*Aussi en poster/)
})

/* Les emblèmes rendus : pour chacun, son lien, sa taille, sa couleur, et l'arrivée de son image. */
const emblemes = (html) => [...html.matchAll(/<li class="c-emb"([^>]*)>([\s\S]*?)<\/li>/g)].map(([, attrs, inner]) => ({
  lien: liens(inner)[0][0],
  nom: liens(inner)[0][1],
  taille: (/data-taille="([^"]*)"/.exec(attrs) || [])[1] || null,
  fond: (/data-fond="([^"]*)"/.exec(attrs) || [])[1] || null,
  image: balises(inner, 'img')[0] || null,
}))

test('le bas de page cocon en « emblèmes » : les sœurs seulement, chacune une fois, dans l’ordre du plan, en grand ; jamais la jumelle', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = (await renderSource(COCON, vars, { mode: 'emblemes' })).trim()
  const items = emblemes(html)
  assert.deepEqual(items.map((i) => i.lien), SOEURS_NATURE)
  assert.deepEqual(items.map((i) => i.nom), ['Tableau Portrait', 'Tableau Femme', 'Tableau Ville', 'Tableau Espace'])
  // Les mêmes sœurs, dans le même ordre, que les liens d'aujourd'hui ; ni la jumelle ni personne d'autre.
  const aujourdhui = liens(await renderSource(COCON_AVANT, vars)).map(([href]) => href)
  assert.deepEqual(aujourdhui, [...SOEURS_NATURE, '/collections/posters-affiches-nature'])
  assert.deepEqual(liens(html).map(([href]) => href), SOEURS_NATURE)
  assert.doesNotMatch(html, /posters-affiches-nature|Aussi en poster|Autres sujets/)
  // Rien que les emblèmes : ni repère, ni liste, ni libellé ; la section les pose dans sa liste.
  assert.match(html, /^<li class="c-emb"/)
  assert.match(html, /<\/li>$/)
  assert.doesNotMatch(html, /<nav|<ul|<p\b|<h[1-6]\b/)
  // En grand (104 et 136 px de rond), en bas de page : les images arrivent à la demande.
  assert.ok(items.every((i) => i.taille === 'bas'))
  assert.deepEqual(items.filter((i) => i.image).map((i) => [i.image.loading, i.image.sizes, i.image.alt]), Array(3).fill(['lazy', '(min-width: 900px) 272px, 208px', '']))
  // La couleur du métachamp, sinon le rang dans la rangée (Espace, 4e : rose).
  assert.deepEqual(items.map((i) => i.fond), ['soleil', 'menthe', 'ciel', 'rose'])
  // Espace n'a pas encore d'emblème : son initiale.
  assert.match(html.slice(html.lastIndexOf('<li')), /<span class="c-emb-initiale">E<\/span>/)
})

test('le bas de page cocon en « emblèmes » : plus bas toutes les sœurs de la mère, hors du français la page se retrouve, rien sans sœur', { skip: SKIP }, async () => {
  const cases = coconCases()
  // Tableau Lion, fille de Tableau Animaux : Chevaux, Oiseaux, Chat (Zèbre est vide).
  assert.deepEqual(liens(await renderSource(COCON, cases['Tableau Lion'], { mode: 'emblemes' })).map(([href]) => href), ['/collections/tableau-cheval', '/collections/tableau-oiseaux', '/collections/tableau-chat'])
  // Une page poster : ses sœurs en poster, jamais sa jumelle en toile.
  assert.deepEqual(liens(await renderSource(COCON, cases['Poster & Affiche Nature'], { mode: 'emblemes' })).map(([href]) => href), ['/collections/posters-affiches-portrait'])
  // Sur /en : la page se retrouve par sa collection, le titre et l'adresse de la langue.
  assert.deepEqual(liens(await renderSource(COCON, cases['en anglais'], { mode: 'emblemes' })), [['/en/collections/portrait-art-collection', 'Portrait Art Collection']])
  // Rien sur une racine, hors du plan, sans plan.
  for (const name of ['une racine', 'hors du plan', 'sans plan']) assert.equal((await renderSource(COCON, cases[name], { mode: 'emblemes' })).trim(), '', name)
  // Une page dont la jumelle seule existe : rien en emblèmes (la jumelle est dans l'interrupteur de l'entrée).
  const seule = boutique(col('tableau-animaux', 'Tableau Animaux', { count: 152 }), col('tableau-lion', 'Tableau Lion', { count: 8 }), col('posters-affiches-lion', 'Poster & Affiche Lion', { count: 9, type: 'poster' }))
  const vars = pageGlobals({ page: seule['tableau-lion'], collections: seule })
  assert.match(await renderSource(COCON, vars), /Aussi en poster/)
  assert.equal((await renderSource(COCON, vars, { mode: 'emblemes' })).trim(), '')
})

/* ---------- « Envie d'un autre sujet ? » ---------- */

const sujets = (vars, options = {}) => renderFile(SUJETS, vars, { id: 'collection_sujets', ...options })

test('les autres sujets : le surtitre, le titre, les sœurs en grands emblèmes, le couple qui part les voir', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = (await sujets(vars)).trim()
  // Un repère de navigation, nommé par son surtitre.
  const nav = /^<nav class="c-sujets" id="autres-sujets" aria-labelledby="([^"]+)">/.exec(html)
  assert.ok(nav, 'le repère des autres sujets')
  assert.match(html, new RegExp(`<p class="c-sujets-surtitre" id="${nav[1]}">Autres sujets</p>`))
  assert.match(html, /<h2 class="c-sujets-titre">Envie d’un autre <b>sujet\u00a0\?<\/b><\/h2>/)
  // Les sœurs : les emblèmes du snippet, dans une liste.
  const liste = /<ul class="c-sujets-liste" role="list">([\s\S]*?)<\/ul>/.exec(html)
  assert.ok(liste, 'la liste des sœurs')
  assert.equal(liste[1].trim(), (await renderSource(COCON, vars, { mode: 'emblemes' })).trim())
  assert.deepEqual(liens(html).map(([href]) => href), SOEURS_NATURE)
  // Le couple : un décor, caché aux lecteurs d'écran, jamais nommé, chargé à la demande ; sa bulle avec lui.
  const perso = /<div class="c-sujets-perso" aria-hidden="true">([\s\S]*?)<\/div>/.exec(html)
  assert.ok(perso, 'le couple, caché aux lecteurs d’écran')
  const [img] = balises(perso[1], 'img')
  assert.deepEqual(img, { src: '//www.myselfmonart.com/cdn/shop/t/25/assets/collection-couple.webp?v=1', alt: '', width: '248', height: '560', loading: 'lazy', decoding: 'async' })
  assert.match(perso[1], /<p class="c-sujets-bulle">On va voir à côté\u00a0\?<\/p>/)
  // Un seul titre, le h2 de la section ; aucun h1 (celui de la page est dans l'entrée).
  assert.deepEqual([...html.matchAll(/<(h[1-6])\b/g)].map((m) => m[1]), ['h2'])
})

test('les autres sujets : le surtitre et le titre disent ce que sont les sœurs, « Dans la même famille » quand elles se mélangent', { skip: SKIP }, async () => {
  const tous = col('tous-les-tableaux', 'Tous les Tableaux', { count: 890, defaut: true })
  const popArt = col('tableau-pop-art', 'Tableau Pop Art', { count: 120, parent: tous })
  const enfant = col('tableau-chambre-enfant', 'Tableau Chambre Enfant', { count: 150, parent: tous })
  const posters = col('posters-affiches', 'Tous les Posters & Affiches', { count: 680, type: 'poster' })
  const c = boutique(tous, popArt, enfant, posters,
    col('tableau-bleue', 'Tableau Bleu', { count: 90, parent: tous }),
    col('tableau-jaune', 'Tableau Jaune', { count: 40, parent: tous }),
    col('tableau-salon', 'Tableau Salon', { count: 496, parent: tous }),
    col('tableau-chambre', 'Tableau Chambre', { count: 200, parent: tous }),
    col('tableau-abstrait', 'Tableau Abstrait', { count: 150, parent: tous }),
    col('tableau-zen', 'Tableau Zen', { count: 60, parent: tous }),
    col('tableau-super-heros', 'Tableau Super-Héros', { count: 30, parent: popArt }),
    col('tableau-keith-haring', 'Tableau Keith Haring', { count: 12, parent: popArt }),
    col('tableau-chambre-fille', 'Tableau Chambre Fille', { count: 40, parent: enfant }),
    col('tableau-chambre-garcon', 'Tableau Chambre Garçon', { count: 35, parent: enfant }),
    col('tableau-petit-prince', 'Tableau Petit Prince', { count: 15, parent: enfant }),
    col('horoscope-bebe', 'Poster bébé : Signe Astrologique', { count: 12, type: 'poster', parent: posters }),
    col('tableau-personnalise-famille', 'Poster Personnalisé Famille', { count: 5, type: 'poster', parent: posters }),
  )
  const attendu = {
    // Sous une racine, les sœurs du même rayon que la page.
    'tableau-bleue': ['Autres couleurs', 'Envie d’une autre <b>couleur ?</b>', ['tableau-jaune']],
    'tableau-salon': ['Autres pièces', 'Envie d’une autre <b>pièce ?</b>', ['tableau-chambre']],
    'tableau-abstrait': ['Autres styles', 'Envie d’un autre <b>style ?</b>', ['tableau-pop-art', 'tableau-zen']],
    'horoscope-bebe': ['Autres personnalisés', 'Envie d’une autre <b>idée ?</b>', ['tableau-personnalise-famille']],
    // Plus bas, le rayon des sœurs, pas celui de la page : sous Tableau Pop Art, la sœur de Super-Héros (un sujet) est
    // une inspiration, celle de Keith Haring un sujet.
    'tableau-super-heros': ['Autres inspirations', 'Envie d’une autre <b>inspiration ?</b>', ['tableau-keith-haring']],
    'tableau-keith-haring': ['Autres sujets', 'Envie d’un autre <b>sujet ?</b>', ['tableau-super-heros']],
    // Des chambres et une inspiration : un titre qui va à toutes.
    'tableau-chambre-fille': ['Dans la même famille', 'Envie d’un autre <b>univers ?</b>', ['tableau-chambre-garcon', 'tableau-petit-prince']],
  }
  for (const [handle, [surtitre, titre, soeurs]] of Object.entries(attendu)) {
    const html = (await sujets(pageGlobals({ page: c[handle], collections: c }))).trim()
    const nav = /^<nav class="c-sujets" id="autres-sujets" aria-labelledby="([^"]+)">/.exec(html)
    assert.ok(nav, `${handle} : le repère`)
    assert.ok(html.includes(`<p class="c-sujets-surtitre" id="${nav[1]}">${surtitre}</p>`), `${handle} : le surtitre`)
    assert.ok(html.includes(`<h2 class="c-sujets-titre">${titre}</h2>`), `${handle} : le titre`)
    assert.deepEqual(liens(html).map(([href]) => href), soeurs.map((h) => `/collections/${h}`), `${handle} : les sœurs`)
  }
})

test('les autres sujets : rien sans sœur à montrer (racine, hors du plan, sans plan, jumelle seule)', { skip: SKIP }, async () => {
  const cases = coconCases()
  for (const name of ['une racine', 'hors du plan', 'sans plan']) assert.equal((await sujets(cases[name])).trim(), '', name)
  const seule = boutique(col('tableau-animaux', 'Tableau Animaux', { count: 152 }), col('tableau-lion', 'Tableau Lion', { count: 8 }), col('posters-affiches-lion', 'Poster & Affiche Lion', { count: 9, type: 'poster' }))
  assert.equal((await sujets(pageGlobals({ page: seule['tableau-lion'], collections: seule }))).trim(), '')
})

/* ---------- Le guide ---------- */

const guide = (vars, options = {}) => renderFile(GUIDE, vars, { id: 'collection_guide', ...options })
/* Le guide d'aujourd'hui : le contenu de son volet (.collection-description) et ses liens « Pour aller plus loin ». */
async function guideAujourdhui(vars) {
  const html = await renderSource(EDITO_AVANT, vars)
  const description = /<div class="collection-description pb-8 pt-2">([\s\S]*?)<\/div>\s*<\/details>/.exec(html)
  const plusLoin = /<p\b[^>]*>\s*<strong\b[^>]*>([^<]*)<\/strong>([\s\S]*?)<\/p>\s*<\/div>\s*<\/div>/.exec(html)
  return { texte: description ? description[1].trim() : null, plusLoin: plusLoin ? { label: plusLoin[1], liens: liens(plusLoin[2]) } : null }
}

test('le guide : le texte d’aujourd’hui, mot pour mot, dans un volet natif fermé, puis « Pour aller plus loin »', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = await guide(vars)
  const aujourdhui = await guideAujourdhui(vars)
  assert.ok(aujourdhui.texte.includes('<h2>Comment choisir votre tableau nature ?</h2>'), 'le guide d’aujourd’hui')
  // Un volet natif, fermé : Google lit le texte, le client l'ouvre.
  assert.equal(balises(html, 'details').length, 1)
  assert.deepEqual(balises(html, 'details')[0], { class: 'c-guide-carte' })
  const corps = contenu(html, 'c-guide-corps')
  assert.ok(corps, 'le texte du guide, dans la carte blanche')
  // Le texte d'aujourd'hui, au caractère près (jetons remplacés), puis « Pour aller plus loin » : l'article seul, la
  // collection ne s'y montre plus (cocon, 23/11/2026).
  assert.ok(corps.trim().startsWith(aujourdhui.texte), 'le texte d’aujourd’hui en tête')
  assert.match(corps, /Une note de 4,2\/5 sur 86 avis\./)
  const reste = corps.trim().slice(aujourdhui.texte.length)
  assert.equal(reste, '<p><strong>Pour aller plus loin :</strong> <a href="/blogs/deco/un-salon-nature">Un salon nature</a></p>')
  assert.deepEqual(aujourdhui.plusLoin.liens, [['/blogs/deco/un-salon-nature', 'Un salon nature']])
  assert.doesNotMatch(html, /\[\[TP_/)
})

test('le guide : la carte pêche fermée dit ce qu’elle contient, le bouton s’ouvre et se referme, le voyageur est un décor', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = (await guide(vars)).trim()
  const section = /^<section class="c-guide" id="guide" aria-labelledby="([^"]+)">/.exec(html)
  assert.ok(section, 'la section, nommée par son surtitre')
  const resume = /<summary>([\s\S]*?)<\/summary>/.exec(html)
  assert.ok(resume, 'le résumé du volet')
  assert.match(resume[1], new RegExp(`<span class="c-guide-surtitre" id="${section[1]}">Le guide</span>`))
  // « le guide. » ne se coupe pas (espace insécable, comme la maquette).
  assert.match(resume[1], /<h2 class="c-guide-titre">Suivez <b>le\u00a0guide\.<\/b><\/h2>/)
  // Le nom de la collection, tel qu'il s'écrit, en tête de la phrase : juste au singulier comme au pluriel.
  assert.match(resume[1], /<span class="c-guide-texte">Tableaux Nature\u00a0: tout ce qu’il faut savoir pour bien choisir le sujet, le format et la place au mur\.<\/span>/)
  // Le bouton : ses deux libellés, la feuille montre celui qui convient (fermé : « Lire le guide »).
  assert.match(resume[1], /<span class="c-guide-bouton"><span class="c-guide-ouvrir">Lire le guide<\/span><span class="c-guide-fermer">Refermer le guide<\/span><\/span>/)
  // Le voyageur, vu de dos : un décor, caché aux lecteurs d'écran, chargé à la demande.
  const perso = /<span class="c-guide-perso" aria-hidden="true">(<img\b[^>]*>)<\/span>/.exec(resume[1])
  assert.ok(perso, 'le voyageur, caché aux lecteurs d’écran')
  assert.deepEqual(balises(perso[1], 'img')[0], { src: '//www.myselfmonart.com/cdn/shop/t/25/assets/collection-voyageur.webp?v=1', alt: '', width: '213', height: '560', loading: 'lazy', decoding: 'async' })
  // Aucun h1 : le titre de la carte (h2), puis ceux du guide, les h2 et h3 du métachamp, tels quels.
  assert.deepEqual([...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => `${m[1]} ${texte(m[2])}`), ['h2 Suivez le guide.', 'h2 Comment choisir votre tableau nature ?', 'h3 Placement, format et finition'])
  // Un titre de poster, au singulier, échappé.
  const posters = await guide(coconCases()['Poster & Affiche Nature'])
  assert.match(posters, /<span class="c-guide-texte">Poster &amp; Affiche Nature\u00a0: tout ce qu’il faut savoir/)
})

test('le guide : rien sans guide, rien après la page 1', { skip: SKIP }, async () => {
  const fr = nature()
  assert.equal((await guide(pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr, currentPage: 2 }))).trim(), '')
  const sans = nature({ custom: textes({ guide: null }) })
  assert.equal((await guide(pageGlobals({ page: sans['tableaux-nature-sauvage'], collections: sans }))).trim(), '')
  const vide = nature({ custom: textes({ guide: '' }) })
  assert.equal((await guide(pageGlobals({ page: vide['tableaux-nature-sauvage'], collections: vide }))).trim(), '')
})

/* ---------- Les questions ---------- */

const questions = (vars, options = {}) => renderFile(QUESTIONS, vars, { id: 'collection_questions', settings: { contact_link: '/pages/contactez-nous' }, ...options })
/* Les questions d'aujourd'hui (le bloc FAQ de l'éditorial) : [question, réponse]. */
async function questionsAujourdhui(vars) {
  const html = await renderSource(EDITO_AVANT, vars)
  return [...html.matchAll(/<details class="accordion[^"]*">\s*<summary[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/summary>\s*<div class="[^"]*">\s*<div class="[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/details>/g)].map(([, q, a]) => [texte(q), a.trim()])
}
/* Les volets rendus par la section : [question, réponse]. */
const volets = (html) => [...html.matchAll(/<details class="accordion c-questions-volet">\s*<summary>\s*<h3>([\s\S]*?)<\/h3>\s*<span class="c-questions-plus" aria-hidden="true" data-allow-empty><\/span>\s*<\/summary>\s*<div class="c-questions-reponse">([\s\S]*?)<\/div>\s*<\/details>/g)].map(([, q, a]) => [texte(q), a.trim()])

test('les questions : les volets du thème, les mêmes questions et réponses qu’aujourd’hui, jetons remplacés', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = await questions(vars)
  // Les volets du thème : <collapsible-tab> (assets/tw-global.js), ses <details class="accordion">, le rond « + ».
  assert.match(html, /<collapsible-tab class="c-questions-volets">\s*<details class="accordion c-questions-volet">/)
  const aujourdhui = await questionsAujourdhui(vars)
  assert.equal(aujourdhui.length, 3, 'les trois questions complètes d’aujourd’hui')
  assert.deepEqual(volets(html), aujourdhui)
  assert.deepEqual(volets(html).map(([q]) => q), ['Comment choisir un tableau nature adapté à ma pièce ?', 'Que disent nos clients (86 avis) ?', 'Proposez-vous d’autres univers proches de la nature ?'])
  assert.equal(volets(html)[1][1], '<p>Ils nous donnent 4,2/5.</p>')
  assert.doesNotMatch(html, /\[\[TP_/)
})

test('les questions : la liste FAQPage, exactement celle d’aujourd’hui', { skip: SKIP }, async () => {
  for (const [name, vars] of Object.entries(coconCases())) {
    if (!vars.collection.metafields.custom.faq) continue
    const avant = ldDe(await renderSource(EDITO_AVANT, vars), 'FAQPage')
    assert.equal(avant.length, 1, name)
    assert.deepEqual(ldDe(await questions(vars), 'FAQPage'), avant, name)
    // Rendue par le snippet, partie « faq-ld » : la même liste, rien d'autre.
    const ld = (await renderSource(EDITO, vars, { partie: 'faq-ld' })).trim()
    assert.equal(ld, `<script type="application/ld+json">${avant[0]}</script>`, name)
  }
  // Les questions de la liste sont celles des volets.
  const vars = coconCases()['Tableaux Nature']
  const faq = JSON.parse(ldDe(await questions(vars), 'FAQPage')[0])
  assert.deepEqual(faq.mainEntity.map((q) => q.name), volets(await questions(vars)).map(([q]) => q))
})

test('les questions : le surtitre, le titre au nom de la collection, et la carte ciel avec la Joconde', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const html = (await questions(vars)).trim()
  const section = /^<section class="c-questions" id="questions" aria-labelledby="([^"]+)">/.exec(html)
  assert.ok(section, 'la section, nommée par son titre')
  assert.match(html, /<p class="c-questions-surtitre">Vos questions<\/p>/)
  assert.match(html, new RegExp(`<h2 class="c-questions-titre" id="${section[1]}">Vos questions sur <b>tableaux nature</b></h2>`))
  // Un seul titre h2, puis les questions en h3 ; aucun h1.
  assert.deepEqual([...html.matchAll(/<(h[1-6])\b/g)].map((m) => m[1]), ['h2', 'h3', 'h3', 'h3'])
  // La carte ciel : son titre, son texte, le bouton vers la page de contact (réglage).
  const aide = contenu(html, 'c-questions-aide')
  assert.ok(aide, 'la carte ciel')
  assert.match(aide, /<p class="c-questions-aide-titre">Une autre <b>question\u00a0\?<\/b><\/p>/)
  assert.match(aide, /<p class="c-questions-aide-texte">Une vraie personne vous répond 7 jours sur 7\.<\/p>/)
  assert.deepEqual(liens(aide), [['/pages/contactez-nous', 'Nous écrire']])
  // La Joconde au casque et sa bulle : un décor, caché aux lecteurs d'écran, chargé à la demande.
  assert.match(aide, /<p class="c-questions-bulle" aria-hidden="true">Allô, j’écoute\u00a0!<\/p>/)
  const ecoute = /<div class="c-questions-ecoute" aria-hidden="true">([\s\S]*?)<\/div>/.exec(aide)
  assert.ok(ecoute, 'la Joconde, cachée aux lecteurs d’écran')
  assert.deepEqual(balises(ecoute[1], 'img')[0], { src: '//www.myselfmonart.com/cdn/shop/t/25/assets/galerie-ecoute.webp?v=1', width: '572', height: '810', alt: '', loading: 'lazy', decoding: 'async' })
  // Son casque : le dessin de la fiche 3D (sections/galerie-questions.liquid), à l'identique.
  const casque = (source) => /<svg class="[\w-]*casque" viewBox="0 0 572 810" focusable="false">([\s\S]*?)<\/svg>/.exec(source)[1].replace(/class="[\w-]*(arceau|tige)"/g, 'class="$1"')
  assert.equal(casque(ecoute[1]), casque(read('sections/galerie-questions.liquid')))
  // Sans lien de contact : pas de bouton.
  assert.deepEqual(liens(await questions(vars, { settings: {} })), [['/collections/tableau-zen', 'tableaux zen']])
})

test('les questions : rien sans questions, rien sans guide (comme aujourd’hui), rien après la page 1', { skip: SKIP }, async () => {
  const fr = nature()
  assert.equal((await questions(pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr, currentPage: 2 }))).trim(), '')
  for (const [name, custom] of Object.entries({
    'sans questions': textes({ faq: null }),
    'une liste vide': textes({ faq: [] }),
    'aucune question complète': textes({ faq: [{ q: 'Seule ?', a: '' }, { q: '', a: '<p>Seule.</p>' }] }),
    // Aujourd'hui, tout l'éditorial (questions et FAQPage comprises) ne s'écrit qu'avec un guide : vider custom.guide
    // retire les textes d'une collection (seo/collections-applied-log.md).
    'sans guide': textes({ guide: null }),
  })) {
    const c = nature({ custom })
    const vars = pageGlobals({ page: c['tableaux-nature-sauvage'], collections: c })
    assert.equal((await questions(vars)).trim(), '', name)
    // La page normale ne montre pas de question non plus. Sans question complète, elle écrit encore une liste FAQPage
    // vide, que Google refuse (une FAQPage demande au moins une question) : la nouvelle page n'en écrit pas.
    const normale = await renderFile('sections/main-collection-product-grid.liquid', vars, { settings: { primary_image_index: 1, next_image_index: 0, margin_top: 'mt-0' } })
    assert.doesNotMatch(normale, /<details class="accordion/, name)
    for (const ld of ldDe(normale, 'FAQPage')) assert.deepEqual(JSON.parse(ld).mainEntity, [], name)
  }
})

/* ---------- L'éditorial : les parties « guide » et « faq-ld » ---------- */

test('l’éditorial, partie « guide » : le texte du guide traité comme aujourd’hui et « Pour aller plus loin », rien d’autre', { skip: SKIP }, async () => {
  const vars = coconCases()['Tableaux Nature']
  const sortie = (await renderSource(EDITO, vars, { partie: 'guide' })).trim()
  const { texte: aujourdhui } = await guideAujourdhui(vars)
  assert.equal(sortie, `${aujourdhui}<p><strong>Pour aller plus loin :</strong> <a href="/blogs/deco/un-salon-nature">Un salon nature</a></p>`)
  // En anglais : les liens dans la langue de la page, la note au point décimal.
  const en = pageGlobals({ page: nature()['tableaux-nature-sauvage'], collections: nature(), lang: 'en', primary: false })
  const anglais = await renderSource(EDITO, en, { partie: 'guide' })
  assert.match(anglais, /<a href="\/en\/products\/creation-artistique-montagnes-du-japon-apaisantes">/)
  assert.match(anglais, /4\.2\/5 sur 86 avis/)
  assert.match(anglais, /<strong>Further reading:<\/strong> <a href="\/en\/blogs\/deco\/un-salon-nature">/)
  // Sans lien d'article ou de page : le texte seul.
  const sansLien = nature({ custom: { ...textes(), cocon_links: mf([{ url: '/collections/tableau-fleurs', label: 'Fleurs' }]) } })
  assert.equal((await renderSource(EDITO, pageGlobals({ page: sansLien['tableaux-nature-sauvage'], collections: sansLien }), { partie: 'guide' })).trim(), aujourdhui)
})

test('l’éditorial, partie « faq-ld » : rien sans questions ni après la page 1', { skip: SKIP }, async () => {
  const fr = nature()
  assert.equal((await renderSource(EDITO, pageGlobals({ page: fr['tableaux-nature-sauvage'], collections: fr, currentPage: 2 }), { partie: 'faq-ld' })).trim(), '')
  const sans = nature({ custom: textes({ faq: null }) })
  assert.equal((await renderSource(EDITO, pageGlobals({ page: sans['tableaux-nature-sauvage'], collections: sans }), { partie: 'faq-ld' })).trim(), '')
})

/* ---------- Les cinq langues ---------- */

test('les textes du bas de page : sous sections.mma.collection.bas, dans les cinq langues, traduits', { skip: SKIP }, async () => {
  const fr = locales.fr.sections.mma.collection.bas
  const cles = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? cles(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  // Le titre des autres sujets, un par rayon des sœurs (leur surtitre est celui du bas de page cocon,
  // sections.sous_collections.famille), et « melange » quand elles se mélangent.
  const titres = ['couleur', 'inspiration', 'melange', 'personnalise', 'piece', 'style', 'sujet'].map((r) => `sujets.titre.${r}_html`)
  assert.deepEqual(cles(fr), ['guide.lire', 'guide.refermer', 'guide.surtitre', 'guide.texte', 'guide.titre_html', 'questions.titre_html', 'sujets.bulle', ...titres])
  for (const lang of Object.keys(LANGS)) {
    const t = locales[lang].sections.mma.collection.bas
    assert.deepEqual(cles(t), cles(fr), lang)
    for (const cle of cles(fr)) {
      const valeur = cle.split('.').reduce((o, k) => o[k], t)
      assert.ok(valeur.trim(), `${lang}.${cle}`)
      if (lang !== 'fr') assert.notEqual(valeur, cle.split('.').reduce((o, k) => o[k], fr), `${lang}.${cle} : resté en français`)
      assert.doesNotMatch(valeur, /made in france|fabriqué en france|hergestellt in frankreich|hecho en francia|gemaakt in frankrijk/i, `${lang}.${cle}`)
    }
    // Le nom de la collection : en tête du texte du guide, tel qu'il s'écrit ; dans le titre des questions (en
    // minuscules, sauf en allemand, avec ses capitales).
    assert.ok(t.guide.texte.startsWith('{{ titre }}'), `${lang}.guide.texte`)
    const nom = lang === 'de' ? '{{ titre_exact }}' : '{{ titre }}'
    assert.ok(t.questions.titre_html.includes(`<b>${nom}</b>`), `${lang}.questions.titre_html`)
  }
  // Rendus dans chaque langue : chaque section écrit ses textes, sans clé restée telle quelle.
  for (const lang of Object.keys(LANGS)) {
    const c = nature()
    const vars = pageGlobals({ page: c['tableaux-nature-sauvage'], collections: c, lang, primary: lang === 'fr' })
    const t = locales[lang].sections.mma.collection.bas
    const html = (await sujets(vars)) + (await guide(vars)) + (await questions(vars))
    assert.doesNotMatch(html, /sections\.mma\./, lang)
    for (const morceau of [locales[lang].sections.sous_collections.famille.autres.sujet, t.sujets.bulle, t.guide.surtitre, t.guide.lire, t.guide.refermer]) assert.ok(html.includes(echappe(morceau)), `${lang} : ${morceau}`)
    assert.ok(html.includes(`<h2 class="c-sujets-titre">${t.sujets.titre.sujet_html}</h2>`), `${lang} : le titre des autres sujets`)
    assert.ok(html.includes(locales[lang].sections.mma.galerie.questions.help_button), `${lang} : le bouton de la carte ciel`)
    assert.match(html, lang === 'de' ? /<b>Tableaux Nature<\/b><\/h2>/ : /<b>tableaux nature<\/b><\/h2>/, lang)
  }
})

/* ---------- Les schémas des sections ---------- */

test('les trois sections : un nom de schéma que Shopify accepte, sur les pages de collection, une fois, sans préréglage', () => {
  for (const file of [SUJETS, GUIDE, QUESTIONS]) {
    const schema = schemaOf(file)
    // Shopify refuse un nom de plus de 25 caractères (le fichier refusé fait réimporter l'ancienne version).
    assert.ok(schema.name.length <= 25, `${file} : ${schema.name}`)
    assert.deepEqual(schema.enabled_on, { templates: ['collection'] }, file)
    assert.equal(schema.limit, 1, file)
    // Sans préréglage : la section ne s'ajoute pas depuis l'éditeur, où elle n'aurait pas sa feuille.
    assert.equal(schema.presets, undefined, file)
  }
  assert.deepEqual(schemaOf(SUJETS).settings || [], [])
  assert.deepEqual(schemaOf(GUIDE).settings || [], [])
  assert.deepEqual(schemaOf(QUESTIONS).settings.map((s) => [s.id || s.type, s.type]), [['paragraph', 'paragraph'], ['contact_link', 'url']])
})

/* ---------- Les personnages ---------- */

test('les personnages du bas de page : dans le thème, en WebP, aux dimensions qu’écrivent les sections', () => {
  // Les dimensions d'un WebP : son en-tête (VP8X, VP8L ou VP8).
  const taille = (file) => {
    const b = fs.readFileSync(path.join(ROOT, file))
    assert.equal(b.toString('ascii', 0, 4), 'RIFF', file)
    assert.equal(b.toString('ascii', 8, 12), 'WEBP', file)
    const bloc = b.toString('ascii', 12, 16)
    if (bloc === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
    if (bloc === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
    return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  }
  for (const [file, section] of [['assets/collection-couple.webp', SUJETS], ['assets/collection-voyageur.webp', GUIDE], ['assets/galerie-ecoute.webp', QUESTIONS]]) {
    const [w, h] = taille(file)
    const nom = path.basename(file)
    const img = (code(section).match(/<img\b[^>]*>/g) || []).find((tag) => tag.includes(`'${nom}' | asset_url`))
    assert.ok(img, `${section} : ${nom}`)
    assert.match(img, new RegExp(`\\swidth="${w}"`), `${section} : ${nom}, ${w} px de large`)
    assert.match(img, new RegExp(`\\sheight="${h}"`), `${section} : ${nom}, ${h} px de haut`)
  }
  // Pas plus lourds qu'il ne faut : des décors d'une centaine de pixels de large.
  for (const file of ['assets/collection-couple.webp', 'assets/collection-voyageur.webp']) assert.ok(fs.statSync(path.join(ROOT, file)).size < 60 * 1024, file)
})

/* ---------- La feuille ---------- */

/* Les règles du bloc du ticket 08, sans ses commentaires : { head, body, context }. */
function monBloc() {
  const marks = blocs(CSS)
  const i = marks.findIndex((m) => m.ticket === '08' && m.side === 'début')
  assert.ok(i >= 0, 'le bloc du ticket 08')
  return rules(read(CSS).slice(marks[i].end, marks[i + 1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const H = ':root[data-refonte-page]'
const LARGE = '@media (min-width: 900px)'
const regle = (bloc, head, context = []) => bloc.find((r) => r.head === head && r.context.join(' / ') === context.join(' / '))

test('la feuille : un bloc à part pour le ticket 08, où chaque classe des trois sections a sa règle', () => {
  assert.equal(blocs(CSS).filter((m) => m.ticket === '08').map((m) => `${m.name} : ${m.side}`).join(', '), 'Bas de page : début, Bas de page : fin')
  const bloc = monBloc()
  const heads = bloc.map((r) => r.head).join('\n')
  const classes = new Set([SUJETS, GUIDE, QUESTIONS].flatMap((file) => [...code(file).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].replace(/{%[\s\S]*?%}/g, ' ').split(/\s+/))).filter((c) => /^c-(sujets|guide|questions)/.test(c)))
  assert.ok(classes.size >= 25, [...classes].join(' '))
  for (const name of classes) assert.match(heads, new RegExp(`\\.${name}(?![\\w-])`), name)
})

test('la feuille : les sœurs par deux, par quatre dès 700 px, une rangée incomplète centrée, en ronds de 104 et 136 px ; rien ne dépasse de la page', () => {
  const bloc = monBloc()
  const liste = regle(bloc, `${H} .c-sujets-liste`).body
  assert.match(liste, /--colonnes: 2;/)
  assert.match(liste, /display: flex;\s*flex-wrap: wrap;\s*justify-content: center;/)
  assert.match(regle(bloc, `${H} .c-sujets-liste`, ['@media (min-width: 700px)']).body, /--colonnes: 4;/)
  // Chaque sœur a la largeur d'une colonne, écarts compris : une rangée pleine fait toute la largeur, jamais plus.
  assert.match(regle(bloc, `${H} .c-sujets-liste .c-emb`).body, /flex: 0 0 calc\(\(100% - \(var\(--colonnes\) - 1\) \* var\(--ecart\)\) \/ var\(--colonnes\)\);\s*min-width: 0;/)
  assert.match(regle(bloc, `${H} .c-sujets-liste`, [LARGE]).body, /--ecart: 24px;/)
  // Les ronds du bas : ceux du ticket 03 (data-taille="bas"), 104 px puis 136 px.
  const d = (context) => Number(/--d:\s*(\d+)px;/.exec(rules(read(CSS).replace(/\/\*[\s\S]*?\*\//g, '')).find((r) => r.head === `${H} .c-emb[data-taille="bas"]` && r.context.join(' / ') === context.join(' / ')).body)[1])
  assert.deepEqual([d([]), d([LARGE])], [104, 136])
  // Les images des emblèmes (deux fois le rond) et le couple qui arrive de la droite ne débordent jamais de l'écran.
  assert.match(regle(bloc, `${H} .c-sujets`).body, /overflow-x: clip;/)
  assert.match(regle(bloc, `${H} .c-guide-carte`).body, /overflow: clip;/)
  assert.match(regle(bloc, `${H} .c-questions-aide`).body, /overflow: clip;/)
})

test('la feuille : le guide ouvert garde une bande de sa carte sous le texte ; une réponse ouverte n’a pas deux marges', () => {
  const bloc = monBloc()
  // La marge du bas du texte passerait sous la carte (overflow: clip ne retient pas les marges) : c'est l'espace de la carte.
  assert.match(regle(bloc, `${H} .c-guide-corps`).body, /margin: 22px 12px 0;/)
  assert.match(regle(bloc, `${H} .c-guide-carte[open]`).body, /padding-bottom: 12px;/)
  assert.match(regle(bloc, `${H} .c-guide-corps`, [LARGE]).body, /margin: 30px 40px 0;/)
  assert.match(regle(bloc, `${H} .c-guide-carte[open]`, [LARGE]).body, /padding-bottom: 40px;/)
  assert.match(regle(bloc, `${H} .c-questions-reponse > :last-child`).body, /margin-bottom: 0;/)
})

test('la feuille : la Joconde tient dans sa carte à côté de sa bulle, de 900 px à l’ordinateur', () => {
  const bloc = monBloc()
  // Deux colonnes égales jusqu'à 1200 px, celles de la maquette au-delà ; la Joconde grandit avec l'écran, jusqu'à 300 px.
  assert.match(regle(bloc, `${H} .c-questions-in`, [LARGE]).body, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(regle(bloc, `${H} .c-questions-in`, ['@media (min-width: 1200px)']).body, /grid-template-columns: minmax\(0, 5fr\) minmax\(0, 7fr\);\s*column-gap: 90px;/)
  assert.match(regle(bloc, `${H} .c-questions-ecoute`, [LARGE]).body, /height: clamp\(208px, 23\.4vw, 300px\);/)
  // La bulle la plus large (159 px, en allemand), l'écart, la Joconde (572 × 810) : entre les marges de la carte (34 px), à
  // 8 px près (en allemand, vers 1200 px).
  for (const large of [900, 1024, 1080, 1180, 1199, 1200, 1280, 1440]) {
    const colonne = large < 1200 ? (large - 96 - 48) / 2 : (Math.min(large - 96, 1240) - 90) * 5 / 12
    const joconde = Math.min(300, Math.max(208, 0.234 * large)) * 572 / 810
    assert.ok(159 + 4 + joconde <= colonne - 68 + 8, `${large} px : ${Math.round(159 + 4 + joconde)} dans ${Math.round(colonne - 68)}`)
  }
})

test('la feuille : le couple arrive de la droite et sa bulle s’ouvre, le voyageur avance, la Joconde surgit ; jamais en « mouvements réduits »', () => {
  const bloc = monBloc()
  const NO_PREF = '@media (prefers-reduced-motion: no-preference)'
  const LIE = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
  const anime = (head) => {
    const r = bloc.find((x) => x.head === `${H} ${head}` && /animation:/.test(x.body))
    assert.ok(r, head)
    assert.equal(r.context[0], NO_PREF, head)
    return r
  }
  // Liés au défilement : là où le navigateur le sait.
  for (const head of ['.c-sujets-perso img', '.c-sujets-bulle', '.c-sujets-liste .c-emb', '.c-guide-perso', '.c-questions-ecoute']) assert.deepEqual(anime(head).context, [NO_PREF, LIE], head)
  assert.match(anime('.c-sujets-perso img').body, /animation: refonte-arrive linear both;/)
  assert.match(anime('.c-sujets-bulle').body, /animation: refonte-dit linear both;/)
  assert.match(anime('.c-guide-perso').body, /animation: refonte-avance linear both;/)
  // La bulle de la Joconde hoche la tête, sans fin, comme sur la fiche 3D.
  assert.match(anime('.c-questions-bulle').body, /animation: refonte-hoche 2\.2s ease-in-out infinite alternate;/)
  // Les images clés du bloc : celles de la maquette (bloc « Le mouvement »).
  const cles = (name) => regle(bloc, `@keyframes ${name}`)
  assert.match(cles('refonte-arrive').body, /0% \{ transform: translateX\(120%\) rotate\(0\); \}/)
  assert.match(cles('refonte-dit').body, /from \{ opacity: 0; transform: scale\(0\.3\); \}/)
  assert.match(cles('refonte-avance').body, /from \{ transform: translateY\(14%\) scale\(1\.12\); \}/)
  assert.match(cles('refonte-surgit').body, /from \{ transform: translateY\(62%\); \}/)
  // Rien ne bouge hors de « mouvements voulus » (le test du socle le vérifie pour toute la feuille).
  for (const r of bloc.filter((x) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(x.body))) assert.equal(r.context[0], NO_PREF, r.head)
})

/* ---------- Le modèle caché et la page de test ---------- */

test('le modèle caché : après la grille, les autres sujets, le guide, puis les questions', () => {
  const modele = json(MODELE)
  const types = modele.order.map((key) => modele.sections[key].type)
  const grille = types.indexOf('collection-grille')
  assert.ok(grille >= 0, 'la grille du ticket 05')
  assert.deepEqual(types.slice(grille + 1), ['collection-sujets', 'collection-guide', 'collection-questions'])
  const section = (type) => modele.sections[modele.order[types.indexOf(type)]]
  assert.deepEqual(section('collection-sujets'), { type: 'collection-sujets', settings: {} })
  assert.deepEqual(section('collection-guide'), { type: 'collection-guide', settings: {} })
  // Le bouton « Nous écrire » : la page de contact, la même que sur la fiche 3D.
  assert.deepEqual(section('collection-questions'), { type: 'collection-questions', settings: { contact_link: 'shopify://pages/contactez-nous' } })
  const fiche = Object.values(json('templates/product.oeuvre-galerie.json').sections).find((s) => s.type === 'galerie-questions')
  assert.equal(fiche.settings.contact_link, section('collection-questions').settings.contact_link)
})

/* La page d'un modèle : ses sections dans l'ordre, chacune avec les réglages du modèle (sans la bannière désactivée ni les
   badges, qui n'ont ni titre, ni lien de la famille, ni liste pour Google). */
const RENDUES = ['breadcrumb', 'collection-refonte', 'sous-collections', 'main-collection-product-grid', 'collection-grille', 'collection-sujets', 'collection-guide', 'collection-questions']
async function pageDuModele(file, vars) {
  const modele = json(file)
  let html = ''
  for (const key of modele.order) {
    const s = modele.sections[key]
    if (s.disabled || !RENDUES.includes(s.type)) continue
    html += `<div id="shopify-section-template--1__${key}" class="shopify-section">${await renderFile(`sections/${s.type}.liquid`, vars, { settings: s.settings || {}, id: key })}</div>`
  }
  return html
}
/* La famille de chaque page de la boutique d'essai : ancêtres, filles, jumelle, sœurs. */
const FAMILLES = {
  'tableaux-nature-sauvage': ['/collections/tous-les-tableaux', '/collections/tableau-animaux', '/collections/tableau-fleurs', '/collections/tableau-mer-1', '/collections/tableau-paysage', '/collections/posters-affiches-nature', ...SOEURS_NATURE],
  'tableau-lion': ['/collections/tous-les-tableaux', '/collections/tableaux-nature-sauvage', '/collections/tableau-animaux', '/collections/posters-affiches-lion', '/collections/tableau-cheval', '/collections/tableau-oiseaux', '/collections/tableau-chat'],
  'posters-affiches-nature': ['/collections/posters-affiches', '/collections/tableaux-nature-sauvage', '/collections/posters-affiches-portrait'],
}
/* Ce qui n'est pas de la page elle-même : le texte du guide et les réponses aux questions, que le ticket 10 relit. */
const horsTextes = (html) => html.replace(/<div class="(?:c-guide-corps|c-questions-reponse)">[\s\S]*?<\/div>/g, '').replace(/<div class="collection-description[\s\S]*?<\/details>/g, '').replace(/<div class="pb-7[\s\S]*?<\/details>/g, '')

test('la page de test : un seul h1, chaque lien de la famille une seule fois, BreadcrumbList, ItemList et FAQPage de la page normale', { skip: SKIP }, async () => {
  for (const handle of ['tableaux-nature-sauvage', 'tableau-lion', 'posters-affiches-nature']) {
    const fr = nature()
    const vars = pageGlobals({ page: fr[handle], collections: fr })
    const refonte = await pageDuModele(MODELE, vars)
    const normale = await pageDuModele('templates/collection.json', vars)
    assert.equal((refonte.match(/<h1\b/g) || []).length, 1, `${handle} : un seul h1`)
    // Les données pour Google : les mêmes listes que la page normale, une fois chacune.
    for (const type of ['BreadcrumbList', 'ItemList', 'FAQPage']) {
      assert.equal(ldDe(refonte, type).length, 1, `${handle} : ${type}`)
      assert.deepEqual(ldDe(refonte, type), ldDe(normale, type), `${handle} : ${type} de la page normale`)
    }
    // Hors du texte du guide et des questions (le ticket 10 relit leurs liens), chaque lien de collection une seule fois,
    // et seulement la famille : les ancêtres (fil d'Ariane), les filles (emblèmes du haut), la jumelle (interrupteur),
    // les sœurs (emblèmes du bas). Aucun lien vers une autre branche.
    const collectionsLiees = liens(horsTextes(refonte)).map(([href]) => href).filter((href) => href.startsWith('/collections/'))
    assert.deepEqual(collectionsLiees, [...new Set(collectionsLiees)], `${handle} : chaque lien de collection une seule fois`)
    assert.deepEqual([...collectionsLiees].sort(), [...FAMILLES[handle]].sort(), `${handle} : la famille, rien d’autre`)
    // Les sœurs du bas : les liens d'aujourd'hui, la jumelle en moins (elle est dans l'interrupteur).
    const jumelle = `/collections/${PLAN.noeuds.find((n) => n.id === handle).jumeau}`
    const bas = /<nav class="c-sujets"[\s\S]*?<\/nav>/.exec(refonte)
    const aujourdhui = liens(/<nav class="cocon-famille[\s\S]*?<\/nav>/.exec(normale)[0]).map(([href]) => href).filter((href) => href !== jumelle)
    assert.ok(aujourdhui.length > 0, `${handle} : des sœurs`)
    assert.deepEqual(liens(bas[0]).map(([href]) => href), aujourdhui, `${handle} : les sœurs d’aujourd’hui`)
    assert.doesNotMatch(refonte, /\[\[TP_/)
    assert.doesNotMatch(refonte, /made in france|fabriqué en france/i)
  }
})
