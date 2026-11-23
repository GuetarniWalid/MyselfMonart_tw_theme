// Le banc des tests de la page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie) : ce que partagent
// scripts/oeuvre-galerie.test.cjs (le socle et la présentation, ticket 19) et les tests de chaque section
// (scripts/galerie-<section>.test.cjs, tickets 20 à 24). Lecture des fichiers du thème, règles d'une feuille,
// et le rendu Liquid par liquidjs avec les filtres de Shopify dont ces rendus ont besoin, sur un produit
// d'essai (le Bonsaï relevé en ligne). Sans liquidjs, SKIP dit pourquoi : les tests de rendu se sautent, le
// reste passe. Le banc les lance avec NODE_PATH vers un node_modules qui a liquidjs.
// Ce fichier n'est pas un test : npm test ne lance que scripts/*.test.cjs.
// Un test de section qui a besoin d'un filtre de plus l'ajoute à son moteur, dans son propre fichier
// (engine(lang).registerFilter(…)) : chaque fichier de test tourne dans son propre processus.
// Hors de la galerie, scripts/sous-collections.test.cjs prend ici la lecture des fichiers et le moteur par langue
// (engine), avec ses propres données : une page de collection, pas un produit. scripts/collection-refonte.test.cjs
// (la nouvelle page collection) y prend aussi les règles d'une feuille, ses blocs et le rendu d'une section.
const fs = require('fs')
const path = require('path')
const bonsai = require('./fixtures/oeuvre-3d-bonsai.json')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(ROOT, file))
// Le code Liquid d'un fichier, sans ses commentaires : {% comment %}, et les lignes « # » des blocs {% liquid %}.
const code = (file) => read(file)
  .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')
  .replace(/{%-?\s*liquid\b[\s\S]*?-?%}/g, (block) => block.replace(/^\s*#.*$/gm, ''))
// Un fichier JSON du thème (modèle, langue) : sans le commentaire que Shopify pose en tête.
const json = (file) => JSON.parse(read(file).replace(/^\uFEFF/, '').replace(/^\s*\/\*[\s\S]*?\*\//, ''))
const schemaOf = (file) => JSON.parse(/{% schema %}([\s\S]*?){% endschema %}/.exec(read(file))[1])

const SECTION = 'sections/main-product.liquid'
const LANGS = { fr: 'fr.default.json', en: 'en.json', de: 'de.json', es: 'es.json', nl: 'nl.json' }

// Les règles d'une feuille, sans ses commentaires : { head, body, context } ; context : les @media et @supports
// qui l'entourent.
function rules(css, context = []) {
  const out = []
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open < 0) break
    const head = css.slice(i, open).trim()
    let depth = 1
    let j = open + 1
    while (depth && j < css.length) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(open + 1, j - 1)
    if (/^@(media|supports)\b/.test(head)) out.push(...rules(body, [...context, head]))
    else out.push({ head, body, context })
    i = j
  }
  return out
}

/* Les blocs d'une feuille ou d'un script de page (assets/oeuvre-galerie.*, assets/collection-refonte.css), un par
   partie de la page ou par ticket : entre deux repères « === Nom (ticket N) : début === » et « … : fin === ». Vérifie
   que chaque début a sa fin, au même nom, et qu'aucun code n'est hors d'un bloc (l'en-tête du fichier avant le
   premier, des blancs entre deux blocs et après le dernier) ; rend les repères, dans l'ordre. */
function blocs(file) {
  const assert = require('node:assert/strict')
  const source = read(file)
  const marks = [...source.matchAll(/\/\* === (.+?) \(ticket (\d+)\) : (début|fin) ===/g)].map((m) => ({ name: m[1], ticket: m[2], side: m[3], start: m.index, end: source.indexOf('*/', m.index) + 2 }))
  assert.ok(marks.length >= 2 && marks.length % 2 === 0, `${file} : des repères, par paires`)
  for (let i = 0; i < marks.length; i += 2) {
    assert.equal(`${marks[i].side}, ${marks[i + 1].side}`, 'début, fin', `${file} : « ${marks[i].name} »`)
    assert.equal(`${marks[i + 1].name} (${marks[i + 1].ticket})`, `${marks[i].name} (${marks[i].ticket})`, `${file} : le même nom au début et à la fin`)
  }
  const outside = [source.slice(0, marks[0].start)]
  for (let i = 1; i < marks.length; i += 2) outside.push(source.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : source.length))
  for (const part of outside) assert.equal(part.replace(/\/\*[\s\S]*?\*\//g, '').trim(), '', `${file} : du code hors d’un bloc`)
  return marks
}

// Le bloc principal d'un modèle produit (sa section main-product).
const mainOf = (template) => Object.values(template.sections).find((s) => s.type === 'main-product')

/* ---------- Le rendu Liquid (liquidjs) ---------- */

let liquid = null
try {
  liquid = require('liquidjs')
} catch {
  liquid = null
}
const SKIP = liquid ? false : 'liquidjs absent : NODE_PATH vers un node_modules qui l’a (le banc)'

const locales = Object.fromEntries(Object.entries(LANGS).map(([lang, file]) => [lang, json(`locales/${file}`)]))

/* Un moteur par langue sur les fichiers du thème, avec les filtres de Shopify dont ces rendus ont besoin. Les textes
   sont ceux des fichiers de langue (une clé inconnue, ou au pluriel, sort telle quelle). Chaque fichier n'est lu
   qu'une fois (cache). */
const engines = new Map()
function engine(lang = 'fr') {
  if (!engines.has(lang)) engines.set(lang, newEngine(lang))
  return engines.get(lang)
}
function newEngine(lang) {
  const { Liquid } = liquid
  const e = new Liquid({
    root: [path.join(ROOT, 'snippets'), path.join(ROOT, 'templates')],
    extname: '.liquid',
    relativeReference: false,
    jsTruthy: false,
    ownPropertyOnly: false,
    cache: true,
  })
  e.registerFilter('image_url', (input, ...args) => {
    const image = input && input.preview_image ? input.preview_image : input
    const src = image && image.src
    if (!src) return ''
    const query = args.filter(Array.isArray).map(([key, value]) => `${key}=${value}`).join('&')
    return query ? `${src}&${query}` : src
  })
  e.registerFilter('asset_url', (name) => `//www.myselfmonart.com/cdn/shop/t/25/assets/${name}?v=1`)
  e.registerFilter('stylesheet_tag', (url) => `<link href="${url}" rel="stylesheet" type="text/css" media="all" />`)
  e.registerFilter('preload_tag', (url) => `<link href="${url}" rel="preload">`)
  e.registerFilter('money', (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`)
  e.registerFilter('money_without_currency', (cents) => (cents / 100).toFixed(2).replace('.', ','))
  e.registerFilter('t', (key, ...args) => {
    const text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
    if (typeof text !== 'string') return key
    const values = Object.fromEntries(args.filter(Array.isArray))
    return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
  })
  // Une date fixe pour « now » (priceValidUntil du JSON-LD) : un rendu égal d'un jour à l'autre.
  e.registerFilter('date', (input, format) => {
    const seconds = input === 'now' ? 1795003200 : Number(input)
    if (format === '%s') return String(seconds)
    if (format === '%Y-%m-%d') return new Date(seconds * 1000).toISOString().slice(0, 10)
    return String(input)
  })
  // {% style %} de Shopify : son contenu, dans une balise <style>.
  e.registerTag('style', {
    parse(token, remain) {
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endstyle', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('style non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      emitter.write('<style data-shopify>')
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      emitter.write('</style>')
    },
  })
  return e
}

/* Une valeur d'option, rendue par son nom, comme dans Shopify. */
const optionValue = (name) => {
  const { Drop } = liquid
  return new (class extends Drop {
    constructor() { super(); this.name = name }
    valueOf() { return name }
    toString() { return name }
  })()
}
/* Le modèle de la page, comme dans Shopify : son nom et son suffixe, et « product.oeuvre-3d » quand on l'écrit. */
const templateOf = (name, suffix) => {
  const { Drop } = liquid
  const text = suffix ? `${name}.${suffix}` : name
  return new (class extends Drop {
    constructor() { super(); this.name = name; this.suffix = suffix }
    valueOf() { return text }
    toString() { return text }
  })()
}

const FILES = '//www.myselfmonart.com/cdn/shop/files/'
const image = (id, file, width, height) => ({ id, src: `${FILES}${file}?v=1`, width, height, aspect_ratio: width / height, alt: `Texte de ${file}` })
const asMedia = (img) => ({ id: img.id, media_type: 'image', alt: img.alt, preview_image: img, aspect_ratio: img.aspect_ratio, width: img.width, height: img.height, position: 0 })
// Les fichiers d'un nouveau produit (l'œuvre à plat seule) et d'un produit de toujours (la photo d'ambiance d'abord).
const FLAT = ['bonsai-zen-oeuvre.jpg', 1904, 2544]
const OLD = [['bonsai-zen-salon.jpg', 1588, 1865], FLAT, ['bonsai-zen-chambre.jpg', 2982, 2982]]
const MOTHER = { title: 'Tableau Zen & Nature', url: '/collections/tableau-zen', metafields: { breadcrumb: {} } }

/* Un produit à partir du Bonsaï relevé en ligne (scripts/fixtures/oeuvre-3d-bonsai.json), comme dans
   scripts/photo-studio.test.cjs, avec ce que lit la présentation : son titre court, sa collection mère, ses tailles. */
function product({ suffix = 'oeuvre-3d', poster = false, files = [FLAT], short = 'Bonsaï zen', mother = MOTHER, sizes = null } = {}) {
  const source = poster ? bonsai.poster : bonsai.toile
  const images = files.map(([file, width, height], i) => image(i + 1, file, width, height))
  const media = images.map(asMedia)
  const frames = (source.frames || []).map(([name, handle]) => ({ name, system: { handle } }))
  const variants = source.variants.map(([id, option1, option2, option3, price, available]) => ({
    id, option1, option2, option3, price, available, url: `${source.url}?variant=${id}`, title: [option1, option2, option3].filter(Boolean).join(' / '),
  }))
  const options = poster ? [['Tailles', sizes || source.sizes], ['Cadres', source.frameModes]] : [['Tailles', sizes || source.sizes], ['Bordures', source.borders.map(([n]) => n)], ['Cadres', frames.map((f) => f.name)]]
  return {
    id: poster ? 2 : 1,
    title: poster ? 'Poster Bonsaï zen - Patience & harmonie' : 'Tableau Bonsaï zen - Sérénité & équilibre',
    handle: source.url.split('/').pop(),
    url: source.url,
    vendor: 'MyselfMonArt',
    description: '<p>Une description.</p>',
    template_suffix: suffix,
    images,
    media,
    featured_image: images[0],
    featured_media: media[0],
    collections: [],
    options: options.map(([name]) => name),
    options_with_values: options.map(([name, values], i) => ({ name, position: i + 1, values: values.map(optionValue) })),
    variants,
    selected_variant: null,
    selected_or_first_available_variant: variants[0],
    first_available_variant: variants[0],
    price: variants[0].price,
    metafields: {
      painting_options: {
        frames_canvas: { value: frames },
        borders: { value: (source.borders || []).map(([name, handle]) => ({ name, system: { handle } })) },
        frames_poster: poster ? { value: source.frameColors.map(([name, handle]) => ({ name, system: { handle } })) } : null,
      },
      link: mother ? { mother_collection: { value: mother } } : {},
      meta_object: {},
      title: { short },
    },
  }
}

const globals = (p, { suffix = p ? p.template_suffix : null, name = 'product', lang = 'fr', section = null, score = 42 } = {}) => ({
  product: p,
  section,
  request: { page_type: name, origin: 'https://www.myselfmonart.com', locale: { iso_code: lang } },
  template: templateOf(name, suffix),
  shop: { name: 'MyselfMonArt', description: '' },
  settings: { trustpilot_score_global: score, trustpilot_review_count_global: 86 },
  cart: { currency: { iso_code: 'EUR', symbol: '€' }, item_count: 0 },
  routes: { root_url: '/' },
  collections: [],
})

/* Le bloc principal d'un modèle produit, tel que Shopify le donne à la section : ses réglages et ses blocs. */
function sectionOf(file, { settings = {}, blocks = null } = {}) {
  const main = mainOf(json(file))
  const list = main.block_order.filter((id) => !main.blocks[id].disabled).map((id) => ({ id, type: main.blocks[id].type, settings: main.blocks[id].settings || {} }))
  return { id: 'template--1__main', settings: { ...main.settings, ...settings }, blocks: blocks ? blocks(list) : list }
}
/* Le bloc principal de la page galerie : les réglages de la fiche 3D plus la case, ses blocs gardés (titre, avis,
   titre court, achat, sélecteur) et la fiche en cinq lignes. Le même que le modèle caché, sans dépendre de lui. */
const KEPT = ['trustpilot_review', 'short_title', 'buy', 'variant_picker', 'title']
/* La fiche 3D d'avant la page galerie (templates/product.oeuvre-3d.json jusqu'à la bascule du 21/11/2026), figée :
   la référence des tests (mêmes données pour Google, mêmes volets, mêmes mots de clients). */
const FICHE_3D_AVANT = 'scripts/fixtures/product.oeuvre-3d.avant-galerie.json'
const galerieSection = (change = (list) => list) => sectionOf(FICHE_3D_AVANT, {
  settings: { page_galerie: true },
  blocks: (list) => change([...list.filter((b) => KEPT.includes(b.type)), { id: 'fact_sheet', type: 'fact_sheet', settings: {} }]),
})

// La section, de son début à son schéma (que Shopify ne rend pas) : la fiche et ses données Google. Lue une fois par
// moteur.
const sections = new Map()
const renderSection = (p, options) => {
  const e = engine(options.lang)
  if (!sections.has(e)) sections.set(e, e.parse(read(SECTION).slice(0, read(SECTION).indexOf('{% schema %}'))))
  return e.render(sections.get(e), {}, { globals: globals(p, options) })
}
const renderSnippet = (file, scope, p, options = {}) => engine(options.lang).renderFile(file, scope, { globals: globals(p, options) })
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
// Le bloc principal rendu : de sa balise ouvrante à sa balise fermante.
const blocksOf = (html) => /<main-product-blocks[\s\S]*?<\/main-product-blocks>/.exec(html)[0]

/* Une section du thème rendue seule (sections/<fichier>.liquid, sans son schéma, que Shopify ne rend pas) : ses
   réglages et ses blocs sont donnés tels que Shopify les donne (section.settings, section.blocks : { id, type,
   settings }). Lue une fois par moteur et par fichier. */
const sectionFiles = new Map()
const renderSectionFile = (file, section, p, options = {}) => {
  const e = engine(options.lang)
  const key = (options.lang || 'fr') + ' ' + file
  if (!sectionFiles.has(key)) {
    const source = read(file)
    const end = source.indexOf('{% schema %}')
    sectionFiles.set(key, e.parse(end < 0 ? source : source.slice(0, end)))
  }
  return e.render(sectionFiles.get(key), {}, { globals: globals(p, { ...options, section: { id: 'template--1__' + path.basename(file, '.liquid'), settings: {}, blocks: [], ...section } }) })
}

module.exports = {
  ROOT, read, exists, code, json, schemaOf, SECTION, LANGS, rules, blocs, mainOf,
  liquid, SKIP, locales, engine, optionValue, templateOf, image, asMedia, FLAT, OLD, MOTHER,
  product, globals, sectionOf, KEPT, galerieSection, FICHE_3D_AVANT, renderSection, renderSectionFile, renderSnippet, ldOf, blocksOf,
}
