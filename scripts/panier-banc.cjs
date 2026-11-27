// Le banc des tests du panier des tuiles (ticket 14 de .scratch/collection-design) : ce que partagent
// scripts/panier.test.cjs et les essais dans un navigateur (copies de pages, captures). Le panier d'essai de l'étude
// (donnees/panier-fr.json, relevé le 27/11/2026), ses produits en plusieurs langues, et le rendu Liquid (liquidjs) d'une
// section avec lui. Ce fichier n'est pas un test : npm test ne lance que scripts/*.test.cjs.
const { read, SKIP, liquid, engine, locales, LANGS, templateOf, optionValue } = require('./galerie-banc.cjs')

/* Le filtre t de Shopify avec son pluriel, base64_encode, image_tag, preload_tag avec ses attributs, et la balise
   {% form %} (le choix du pays de l'en-tête) : chaque fichier de test tourne dans son propre processus. */
if (!SKIP) {
  for (const lang of Object.keys(LANGS)) {
    const e = engine(lang)
    e.registerFilter('t', (key, ...args) => {
      const values = Object.fromEntries(args.filter(Array.isArray))
      let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
      if (text && typeof text === 'object' && 'count' in values) text = text[new Intl.PluralRules(lang).select(Number(values.count))] ?? text.other
      if (typeof text !== 'string') return key
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
    })
    e.registerFilter('base64_encode', (s) => Buffer.from(String(s)).toString('base64'))
    e.registerFilter('image_tag', (url) => `<img src="${url}" loading="lazy">`)
    e.registerFilter('preload_tag', (url, ...args) => `<link href="${url}"${args.filter(Array.isArray).map(([key, value]) => ` ${key}="${value}"`).join('')} rel="preload">`)
    e.registerTag('form', {
      parse(token, remain) {
        this.tpls = []
        const stream = this.liquid.parser.parseStream(remain)
        stream.on('tag:endform', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('form non fermé') })
        stream.start()
      },
      * render(ctx, emitter) {
        emitter.write('<form method="post" action="/localization">')
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
        emitter.write('</form>')
      },
    })
  }
}

/* ---------- Un panier d'essai : celui de l'étude (donnees/panier-fr.json, relevé le 27/11/2026) ---------- */

const FILES = '//www.myselfmonart.com/cdn/shop/files/'
const img = (file, width, height, alt = '') => ({ src: `${FILES}${file}?v=1`, width, height, aspect_ratio: width / height, alt })
// Les mots de chaque langue : les options des produits, comme Shopify les traduit.
const MOTS = {
  fr: { tailles: 'Tailles', bordures: 'Bordures', cadres: 'Cadres', blanche: 'Bordure blanche', sans: 'Sans cadre', avec: 'Avec cadre' },
  de: { tailles: 'Größen', bordures: 'Ränder', cadres: 'Rahmen', blanche: 'Weißer Rand', sans: 'Ohne Rahmen', avec: 'Mit Rahmen' },
  en: { tailles: 'Sizes', bordures: 'Borders', cadres: 'Frames', blanche: 'White border', sans: 'Without frame', avec: 'With frame' },
}
const motsDe = (lang) => MOTS[lang] || MOTS.fr
const KIT = {
  id: 9875962626395, title: 'KIT D’ACCROCHAGE – Simple et Polyvalent', type: 'Fixation', template_suffix: null,
  url: '/products/fixation-pour-toile-simple-et-polyvalente', handle: 'fixation-pour-toile-simple-et-polyvalente',
  price: 600, compare_at_price: null, has_only_default_variant: true,
  images: [img('set-fixation-tableau-toile.jpg', 1000, 1000)], metafields: { bundle: {} },
}
KIT.featured_image = KIT.images[0]
KIT.first_available_variant = { id: 50505925984603, title: 'Default Title', price: 600 }
KIT.variant = KIT.first_available_variant
/* Une toile de toujours (modèle painting) : sa photo d'ambiance, puis son œuvre à plat. */
function toile(lang = 'fr') {
  const m = motsDe(lang)
  const images = [img('tableau-portrait-frida-kahlo-bleu-rouge-fleurs.jpg', 1702, 2000), img('peinture-frida-khalo.jpg', 3001, 4000, 'Frida Kahlo, couronne de fleurs')]
  const variant = { id: 49822621040987, title: `30x40 cm / ${m.blanche} / ${m.sans}`, option1: '30x40 cm', option2: m.blanche, option3: m.sans, price: 6250 }
  return {
    id: 9634055258459, title: 'Tableau Frida Kahlo - Portrait floral bohème', type: 'Tableau Frida kahlo', template_suffix: 'painting',
    url: '/products/tableau-design-frida-kahlo-nature-eclatante', handle: 'tableau-design-frida-kahlo-nature-eclatante',
    has_only_default_variant: false, images, featured_image: images[0], variants: [variant], first_available_variant: variant, price: 6250,
    options_with_values: [
      { name: m.tailles, position: 1, values: ['30x40 cm', '60x80 cm'].map(optionValue) },
      { name: m.bordures, position: 2, values: [m.blanche].map(optionValue) },
      { name: m.cadres, position: 3, values: [m.sans].map(optionValue) },
    ],
    metafields: { bundle: { products: { value: [KIT] } }, painting_options: { frames_canvas: { value: [{ name: m.sans, system: { handle: 'sans-cadre' } }] } }, meta_object: {} },
  }
}
/* Un poster des nouveaux produits (modèle oeuvre-3d) : son œuvre à plat seule ; « Sans cadre » ou « Avec cadre ». */
function poster(lang = 'fr', cadre = false) {
  const m = motsDe(lang)
  const images = [img('poster-femme-au-bouquet-de-roses.png', 3000, 4000, 'Poster Femme au bouquet de roses')]
  const variants = [
    { id: 53518343766363, title: `30x40 cm / ${m.sans}`, option1: '30x40 cm', option2: m.sans, option3: null, price: 2490 },
    { id: 53518343799131, title: `30x40 cm / ${m.avec}`, option1: '30x40 cm', option2: m.avec, option3: null, price: 4490 },
  ]
  return {
    id: 10573466141019, title: 'Poster Femme au bouquet de roses - Assurance tranquille et rayures vertes', type: 'poster', template_suffix: 'oeuvre-3d',
    url: '/products/poster-femme-au-bouquet-de-roses-assurance-tranquille-et-rayures-vertes', handle: 'poster-femme-au-bouquet-de-roses-assurance-tranquille-et-rayures-vertes',
    has_only_default_variant: false, images, featured_image: images[0], variants, first_available_variant: variants[0], price: 2490,
    variant: variants[cadre ? 1 : 0],
    options_with_values: [
      { name: m.tailles, position: 1, values: ['30x40 cm'].map(optionValue) },
      { name: m.cadres, position: 2, values: [m.sans, m.avec].map(optionValue) },
    ],
    metafields: { bundle: { products: { value: [KIT] } }, painting_options: { frames_poster: { value: [{ name: 'Noir', system: { handle: 'cadre-noir-mat-1' } }] } }, meta_object: {} },
  }
}
/* Un poster personnalisé (modèle personalized-poster, relevé le 27/11/2026 sur « Cadeau Personnalisé Foot Coloré ») :
   pas de fiche d'œuvre (snippet artwork-kind : rien), mais un poster par son métachamp artwork.type, avec le kit en
   métachamp bundle.products, et ses options Format puis Cadre, « Sans cadre » en premier. */
function posterPerso(lang = 'fr', cadre = false) {
  const m = motsDe(lang)
  const images = [img('affiche-personnalisee-joueur-football-bleu-rouge-chambre-garcon.jpg', 1588, 1588), img('joueur-foot.jpg', 1308, 1760, 'Joueur de foot')]
  const variants = [
    { id: 53565327540571, title: `30x40 cm / ${m.sans}`, option1: '30x40 cm', option2: m.sans, option3: null, price: 3990 },
    { id: 53565327573339, title: `30x40 cm / ${m.avec}`, option1: '30x40 cm', option2: m.avec, option3: null, price: 6290 },
  ]
  return {
    id: 9199870378331, title: 'Cadeau Personnalisé Foot Coloré', type: 'Poster Personnalisé', template_suffix: 'personalized-poster',
    url: '/products/cadeau-personnalise-foot-colore', handle: 'cadeau-personnalise-foot-colore',
    has_only_default_variant: false, images, featured_image: images[0], variants, first_available_variant: variants[0], price: 3990,
    variant: variants[cadre ? 1 : 0],
    options_with_values: [
      { name: 'Format', position: 1, values: ['30x40 cm'].map(optionValue) },
      { name: m.cadres, position: 2, values: [m.sans, m.avec].map(optionValue) },
    ],
    metafields: { artwork: { type: { value: 'poster' } }, bundle: { products: { value: [KIT] } }, meta_object: {} },
  }
}
const REMISE = 'Black Friday : -20 % sur tous les tableaux'
/* Une ligne du panier, telle que Shopify la donne : sa remise de 20 % si remise est vrai. */
function ligne(product, { variant = product.variant || product.first_available_variant, quantity = 1, properties = {}, remise = true, index = 0 } = {}) {
  const original = variant.price
  const final = remise ? Math.round(original * 0.8) : original
  const options = product.has_only_default_variant ? [] : product.options_with_values.map((o, i) => ({ name: o.name, value: variant[`option${i + 1}`] })).filter((o) => o.value)
  return {
    id: variant.id, variant_id: variant.id, key: `${variant.id}:${'0'.repeat(32)}`, index, quantity, product, variant, properties,
    title: product.title, url: `${product.url}?variant=${variant.id}`, image: product.featured_image,
    options_with_values: options, original_price: original, final_price: final, price: original,
    original_line_price: original * quantity, final_line_price: final * quantity, line_price: final * quantity,
    discounts: remise ? [{ title: REMISE, amount: (original - final) * quantity }] : [],
  }
}
/* Un panier : ses lignes, ses totaux, ses remises. Comme dans Shopify, « cart == empty » quand il n'a aucune ligne. */
function panier(lignes) {
  const items = lignes.map((l, index) => ({ ...l, index }))
  const original = items.reduce((s, l) => s + l.original_line_price, 0)
  const total = items.reduce((s, l) => s + l.final_line_price, 0)
  const donnees = {
    items, item_count: items.reduce((s, l) => s + l.quantity, 0), original_total_price: original, total_price: total,
    total_discount: original - total, discount_applications: original > total ? [{ title: REMISE }] : [], taxes_included: true,
    currency: { iso_code: 'EUR' },
  }
  return Object.assign(new (class extends liquid.Drop { valueOf() { return this.items } })(), donnees)
}
const VIDE = () => panier([])
// Le panier d'essai de l'étude : le poster sans cadre, puis la toile, tous deux remisés.
const ESSAI = (lang = 'fr') => panier([ligne(poster(lang)), ligne(toile(lang))])
// Le même, avec le kit d'accrochage ajouté (en tête, comme Shopify range le dernier ajout).
const AVEC_KIT = (lang = 'fr') => panier([ligne(KIT, { remise: false }), ligne(poster(lang)), ligne(toile(lang))])

/* ---------- Le tiroir ---------- */

const TIROIR = 'sections/tw-cart-drawer.liquid'
const TIROIR_AVANT = 'scripts/fixtures/tw-cart-drawer.avant-panier.liquid'
const sansSchema = (source) => (source.includes('{% schema %}') ? source.slice(0, source.indexOf('{% schema %}')) : source)
const ROUTES = { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', account_url: '/account', all_products_collection_url: '/collections/all' }
const globalsDe = ({ name, suffix, lang, cart, section }) => ({
  template: templateOf(name, suffix), cart, section, routes: ROUTES,
  settings: { order_tracking_url: '' }, shop: { name: 'MyselfMonArt' },
  request: { locale: { iso_code: lang }, page_type: name, origin: 'https://www.myselfmonart.com' },
})
/* Une section rendue (sans son schéma), avec le panier et la page donnés. */
function rendre(file, { name = 'collection', suffix = 'refonte', lang = 'fr', cart = ESSAI(lang), id = 'tw-cart-drawer', settings = { keep_shopping_url: '/collections', bundle_title: 'Ils vont si bien ensemble' } } = {}) {
  return engine(lang).parseAndRender(sansSchema(read(file)), {}, { globals: globalsDe({ name, suffix, lang, cart, section: { id, settings, blocks: [] } }) })
}
// Les pages d'aujourd'hui : l'accueil, une collection (sans modèle, avec le sien), une fiche, la recherche, une page.
const PAGES_DU_JOUR = [
  { name: 'index', suffix: null }, { name: 'collection', suffix: null }, { name: 'collection', suffix: 'tableau-salon' },
  { name: 'product', suffix: 'oeuvre-3d' }, { name: 'product', suffix: 'painting' }, { name: 'search', suffix: null }, { name: 'page', suffix: 'contact' },
]

/* ---------- L'en-tête et le gabarit de la page panier ---------- */

/* Un menu d'essai (les blocs de sections/tw-header.liquid) : deux rayons, leurs tuiles, un groupe chacun. */
let dernierId = 700000000000
const collectionDuMenu = (handle, title, count, couleur = null, type = 'painting') => ({
  id: ++dernierId, handle, title, url: `/collections/${handle}`, all_products_count: count,
  metafields: { custom: { type_of_collection: type }, cocon: couleur ? { embleme: { value: { src: `${FILES}embleme-${handle}.webp?v=1`, width: 640, height: 528 } }, embleme_couleur: { value: couleur } } : {} },
})
const bloc = (id, type, settings) => ({ id, type, settings })
const BLOCS = [
  bloc('t1', 'title_only', { title: 'Tableaux' }),
  bloc('c1', 'collection_only', { collection: collectionDuMenu('tous-les-tableaux', 'Tous les Tableaux', 890) }),
  bloc('g1', 'set_of_collections', { title: 'Par Pièce', child_collection_list: [collectionDuMenu('tableau-salon', 'Tableau Salon', 496, 'soleil')] }),
  bloc('c2', 'collection_only', { collection: collectionDuMenu('bestsellers-1', 'Tableau best-seller', 90, 'soleil') }),
  bloc('t2', 'title_only', { title: 'Posters' }),
  bloc('c3', 'collection_only', { collection: collectionDuMenu('posters-affiches', 'Tous les Posters & Affiches', 680, null, 'poster') }),
]
const PAYS = { country: { currency: { iso_code: 'EUR' } }, language: { iso_code: 'fr' }, available_countries: ['FR', 'CH'].map((iso_code) => ({ iso_code })) }
/* L'en-tête rendu sur une page (snippets/tw-sticky-header.liquid, ou sa copie d'avant). Rendu asynchrone, comme les
   sections : liquidjs garde en cache les morceaux lus, et un rendu synchrone ne sait pas lire ceux d'un rendu
   asynchrone. */
function entete({ file = 'snippets/tw-sticky-header.liquid', name = 'cart', suffix = null, lang = 'fr' } = {}) {
  return engine(lang).parseAndRender(read(file), {}, {
    globals: {
      template: templateOf(name, suffix), collection: null, product: null,
      settings: { social_facebook_link: 'https://www.facebook.com/x', order_tracking_url: '', likes_page: 'mes-jaime' },
      section: { id: 'tw-header', settings: { logo_svg: '' }, blocks: BLOCS },
      request: { locale: { iso_code: lang }, page_type: name, origin: 'https://www.myselfmonart.com' },
      routes: ROUTES, shop: { name: 'MyselfMonArt' }, cart: { item_count: 0 }, localization: PAYS,
    },
  })
}

/* Le gabarit de la page panier (layout/cart.liquid, ou sa copie d'avant), avec ce que Shopify lui donne : la page déjà
   rendue (content_for_layout), et des repères pour ce qu'il rend hors de lui (chaque {% section %}, head-base, le
   bandeau des cookies, content_for_header). La police et le script de la vue de test se rendent pour de vrai. */
const AILLEURS = ['head-base', 'cookie-banner']
const reperes = (source) => source
  .replace(/{%\s*section\s+'([\w-]+)'\s*%}/g, '[section $1]')
  .replace(/{%\s*render\s+'([\w-]+)'(?:\s*,[^%]*)?\s*%}/g, (tag, name) => (AILLEURS.includes(name) ? `[render ${name}]` : tag))
const gabarit = (file, content, { lang = 'fr', cookie = true, suffix = null } = {}) => engine(lang).parseAndRender(reperes(read(file)), {
  content_for_layout: content,
  content_for_header: '[content_for_header]',
}, {
  globals: {
    request: { locale: { iso_code: lang }, origin: 'https://www.myselfmonart.com' },
    routes: ROUTES, settings: { enable_cookie: cookie }, template: templateOf('cart', suffix),
  },
})

module.exports = {
  SKIP, read, engine, locales, LANGS, templateOf, MOTS, KIT, REMISE, toile, poster, posterPerso, ligne, panier, VIDE, ESSAI, AVEC_KIT,
  TIROIR, TIROIR_AVANT, sansSchema, ROUTES, globalsDe, rendre, PAGES_DU_JOUR, BLOCS, entete, gabarit,
}
