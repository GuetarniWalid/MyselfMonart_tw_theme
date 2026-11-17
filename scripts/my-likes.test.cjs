// « Mes j'aime » (sections/my-likes.liquid, assets/my-likes.js) : chaque œuvre aimée avec la carte de la
// collection (snippets/card-product.liquid), rendue par Shopify dans le contexte du produit, par la Section
// Rendering API : /products/<handle>?section_id=my-likes-card (sections/my-likes-card.liquid). Les nouveaux
// produits y ont donc leur vignette d'œuvre, et les autres leur prix, leur titre et leur image.
// Lancer : node --test scripts/my-likes.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { productFromSelection } = require('../assets/component-oeuvre-3d.js')
const { poster: posterFixture } = require('./fixtures/oeuvre-3d-bonsai.json')

const ROOT = path.join(__dirname, '..')
// La sélection d'un poster encadré, comme la lit la fiche 3D (scripts/oeuvre-3d-catalog.test.cjs).
const posterWith = (key) => ({ options: [{ position: 1, kind: 'size', value: '30x40 cm', key: null }, { position: 2, kind: 'frame', value: 'Avec cadre', key: null }], frameColor: { name: 'Cadre', key }, whiteBorder: null })
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Le code Liquid d'un fichier, sans ses commentaires {% comment %} (ils citent du code).
const code = (file) => read(file).replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')

const FILE = path.join(ROOT, 'assets/my-likes.js')

const classList = (...initial) => {
  const set = new Set(initial)
  return { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c), toggle: (c, on) => ((on ?? !set.has(c)) ? set.add(c) : set.delete(c)) }
}

/* Une image de carte telle que la section la rend : chargement immédiat, en priorité (lazy_load: false). */
const eagerImage = () => {
  const attributes = { loading: 'eager', fetchpriority: 'high' }
  return {
    attributes,
    get loading() { return attributes.loading },
    set loading(value) { attributes.loading = value },
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
    setAttribute: (name, value) => { attributes[name] = String(value) },
    removeAttribute: (name) => { delete attributes[name] },
  }
}

/* Une carte telle que la section my-likes-card la rend, réduite à ce que la page touche : son cœur, son image,
   et l'œuvre en objet que Shopify y a rendue, s'il y en a une (snippets/artwork-object.liquid). La réponse du
   serveur la décrit en une balise, <anime-product-card data-handle="…">, dans l'enveloppe de la section
   (#shopify-section-my-likes-card) ou non, avec la balise de l'objet : <div class="oeuvre-card[ no-contour]"
   data-kind data-look data-frame>. Le DOMParser de la page réduite la relit. Ses modules (le reflet des
   posters) : banc du navigateur, et scripts/oeuvre-card.test.cjs. */
function cardFrom(html, selector) {
  const inSection = /<div id="shopify-section-my-likes-card"[^>]*>\s*<anime-product-card/.test(html)
  if (selector === '#shopify-section-my-likes-card anime-product-card' && !inSection) return null
  if (selector !== 'anime-product-card' && selector !== '#shopify-section-my-likes-card anime-product-card') return null
  const m = /<anime-product-card data-handle="([^"]*)">/.exec(html)
  if (!m) return null
  const like = { classList: classList('like') }
  const image = eagerImage()
  const o = /<div class="oeuvre-card( no-contour)?" data-kind="(\w+)"(?: data-look="(\w+)")?(?: data-frame="(\w+)")?>/.exec(html)
  const object = o && {
    dataset: { kind: o[2], ...(o[3] && { look: o[3] }), ...(o[4] && { frame: o[4] }) },
    classList: classList('oeuvre-card', ...(o[1] ? ['no-contour'] : [])),
  }
  // .oeuvre-card, et .oeuvre-card[data-kind="…"]
  const objectFor = (selector) => {
    const s = /^\.oeuvre-card(?:\[data-kind="(\w+)"\])?$/.exec(selector)
    return s && object && (!s[1] || s[1] === object.dataset.kind) ? object : null
  }
  return {
    handle: m[1], like, image, object, parent: null,
    querySelector: (selector) => (selector === 'button.like' ? like : objectFor(selector)),
    querySelectorAll: (selector) => (selector === 'img' ? [image] : []),
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null },
  }
}
const section = (handle, object = '') => `<div id="shopify-section-my-likes-card" class="shopify-section"><anime-product-card data-handle="${handle}"><li>${object}</li></anime-product-card></div>`
// L'œuvre en objet, telle que Shopify la rend dans la carte (snippets/artwork-object.liquid).
const posterObject = ({ look = 'verre', frame = look === 'verre' ? 'noir' : null, contour = false } = {}) =>
  `<div class="oeuvre-card${contour ? '' : ' no-contour'}" data-kind="poster" data-look="${look}"${frame ? ` data-frame="${frame}"` : ''}>`
const toileObject = (frame) => `<div class="oeuvre-card" data-kind="toile"${frame ? ` data-frame="${frame}"` : ''}>`

/* La page « Mes j'aime » réduite à ce que le script touche : l'élément <my-likes> (son modèle de grille, le
   chargeur qui le suit), le message de liste vide, localStorage, fetch (chaque réponse avec son délai, pour
   les faire arriver dans le désordre ; `responses` : adresse → réponse, ou une fonction de l'adresse),
   DOMParser et removeSkeletonOnImagesLoad (tw-global.js). */
async function likesPage({ handles, root = '/', responses = {}, storage, withoutRoutes = false } = {}) {
  const store = storage || { productLikedHandles: JSON.stringify(handles) }
  const requests = []
  const skeletons = []
  const grids = []
  const flight = { now: 0, max: 0 } // requêtes en cours, et leur plus grand nombre
  const loader = { classList: classList('flex') }
  const empty = { classList: classList('hidden', 'empty-message') }
  const newGrid = () => {
    const grid = { children: [],
      append(...nodes) { nodes.forEach((n) => { n.parent = this }); this.children.push(...nodes) },
      appendChild(node) { this.append(node); return node },
      querySelectorAll(selector) { return this.children.flatMap((c) => [...c.querySelectorAll(selector)]) } }
    grids.push(grid)
    return grid
  }
  const template = { content: { firstElementChild: { cloneNode: () => newGrid() } } }
  let defined = null
  let element = null
  class HTMLElement {
    constructor() {
      this.appended = []
      this.nextElementSibling = loader
    }
    querySelector(selector) {
      if (selector === 'template') return template
      if (selector === 'anime-product-card') return this.appended.flatMap((grid) => grid.children)[0] || null
      return null
    }
    append(...nodes) { this.appended.push(...nodes) }
    appendChild(node) { this.appended.push(node); return node }
  }
  const win = {
    HTMLElement,
    customElements: { define: (name, cls) => { defined = { name, cls } }, get: () => undefined },
    localStorage: { getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = String(value) } },
    fetch: async (url) => {
      requests.push(url)
      const r = (typeof responses === 'function' ? responses(url) : responses[url]) || { status: 404, body: '<div id="shopify-section-my-likes-card" class="shopify-section"></div>' }
      flight.max = Math.max(flight.max, ++flight.now)
      await new Promise((resolve) => setTimeout(resolve, r.delay || 0))
      flight.now -= 1
      if (r.network) throw new TypeError('Failed to fetch')
      return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.body }
    },
    DOMParser: class { parseFromString(html) { return { querySelector: (selector) => cardFrom(html, selector) } } },
    document: { querySelector: (selector) => (selector === '.empty-message' ? empty : null) },
    Shopify: { routes: { root } },
    // Ce qu'elle reçoit, et si c'était déjà dans la page (elle attend le chargement des images).
    removeSkeletonOnImagesLoad: (container) => skeletons.push({ container, inPage: element.appended.includes(container) }),
    JSON, Promise, Array, Set, Map, Math, encodeURIComponent, setTimeout, console,
  }
  win.window = win
  if (withoutRoutes) win.Shopify = {}
  vm.runInNewContext(read('assets/my-likes.js'), win, { filename: FILE })
  assert.equal(defined && defined.name, 'my-likes')
  element = new defined.cls()
  await element.connectedCallback()
  const grid = element.appended[0] || null
  return { element, requests, grid, cards: grid ? grid.children : [], loader, empty, skeletons, store, maxInFlight: flight.max }
}
const handlesOf = (cards) => cards.map((c) => c.handle)

test('la carte de « Mes j’aime » est celle de la collection, rendue pour le produit de la page', () => {
  const card = code('sections/my-likes-card.liquid')
  const m = /{%-?\s*if product\s*-?%}\s*<anime-product-card>\s*<li id="{{ product\.id }}" class="relative group h-full">\s*{% render 'card-product'([\s\S]*?)%}\s*<\/li>\s*<\/anime-product-card>\s*{%-?\s*endif\s*-?%}/.exec(card)
  assert.ok(m, 'anime-product-card > li#id > card-product, et rien hors d’une fiche produit')
  const args = m[1].replace(/\s+/g, ' ').trim()
  assert.match(args, /^, product: product , primary_image_index: 1 , next_image_index: 0 , lazy_load: false , section_id: section\.id$/)
})

test('la section de la carte ne se propose pas dans l’éditeur de thème (aucun preset)', () => {
  assert.doesNotMatch(read('sections/my-likes-card.liquid'), /"presets"/)
})

test('la page n’a plus de carte modèle : son modèle n’est que la grille de la collection, vide, suivie du chargeur', () => {
  const page = code('sections/my-likes.liquid')
  assert.match(page, /<my-likes>\s*<template>\s*<ul data-id="{{ section\.id }}" class="product-grid"><\/ul>\s*<\/template>\s*<\/my-likes>\s*<div class="flex justify-center my-40">\s*{% render 'tw-loading-hand' %}/)
  assert.doesNotMatch(page, /collections\.all|card-product|data-price-format|first_product/)
  assert.match(page, /class="hidden empty-message /)
})

test('plus de prix, d’image ni de titre recalculés dans le navigateur : la carte vient entière du serveur', () => {
  const js = read('assets/my-likes.js')
  assert.doesNotMatch(js, /formatPrice|buildShopifySrcset|priceFormat|productShortTitles|\.json/)
})

test('les cartes arrivent dans l’ordre des j’aime, chacune rendue pour son produit, derrière le préfixe de langue', async () => {
  const handles = ['bonsai-zen', 'pin-centenaire', 'carpes-koi']
  const responses = {}
  // La dernière arrive la première : l'ordre reste celui des j'aime.
  handles.forEach((handle, i) => { responses[`/en/products/${handle}?section_id=my-likes-card`] = { status: 200, body: section(handle), delay: (3 - i) * 5 } })
  const page = await likesPage({ handles, root: '/en/', responses })
  assert.deepEqual(page.requests.slice().sort(), Object.keys(responses).sort())
  assert.deepEqual(handlesOf(page.cards), handles)
})

const url = (handle) => `/products/${handle}?section_id=my-likes-card`

test('produit retiré (404), erreur réseau ou réponse sans carte : sauté, les autres s’affichent et le chargeur se cache', async () => {
  const page = await likesPage({
    handles: ['ok-1', 'retire', 'reseau', 'sans-carte', 'ok-2'],
    responses: {
      [url('ok-1')]: { status: 200, body: section('ok-1') },
      [url('reseau')]: { network: true, delay: 5 },
      [url('sans-carte')]: { status: 200, body: '<div id="shopify-section-my-likes-card" class="shopify-section"></div>' },
      [url('ok-2')]: { status: 200, body: section('ok-2') },
      // « retire » : la 404 de Shopify.
    },
  })
  assert.deepEqual(handlesOf(page.cards), ['ok-1', 'ok-2'])
  assert.ok(page.loader.classList.contains('hidden'), 'chargeur caché')
  assert.ok(page.empty.classList.contains('hidden'), 'pas de message de liste vide')
})

test('une page entière à la place de la section (redirection qui perdrait section_id) ne donne pas la carte d’une autre œuvre', async () => {
  // Les handles sont traduits (/en/products/zen-bonsai-…) : une redirection vers le handle de la langue pourrait
  // rendre la fiche entière, dont les cartes d'autres œuvres.
  const page = await likesPage({
    handles: ['fr-handle'],
    root: '/en/',
    responses: { '/en/products/fr-handle?section_id=my-likes-card': { status: 200, body: '<!doctype html><html><body><ul><anime-product-card data-handle="autre-oeuvre"><li></li></anime-product-card></ul></body></html>' } },
  })
  assert.deepEqual(handlesOf(page.cards), [])
  assert.ok(!page.empty.classList.contains('hidden'))
})

test('rien à montrer (aucun j’aime, liste illisible, aucune carte venue) : le message de liste vide, sans grille', async () => {
  const cases = {
    'jamais rien aimé': { storage: {} },
    'liste vidée': { handles: [] },
    'liste illisible': { storage: { productLikedHandles: '{"pas":"une liste"' } },
    'pas une liste': { storage: { productLikedHandles: '{"a":1}' } },
    'aucune carte venue': { handles: ['retire'] },
  }
  for (const [name, options] of Object.entries(cases)) {
    const page = await likesPage(options)
    assert.equal(page.grid, null, `${name} : pas de grille`)
    assert.ok(page.loader.classList.contains('hidden'), `${name} : chargeur caché`)
    assert.ok(!page.empty.classList.contains('hidden'), `${name} : message de liste vide`)
  }
})

test('chaque cœur s’affiche aimé, même quand son identifiant manque dans productLikedIds', async () => {
  const page = await likesPage({
    storage: { productLikedHandles: JSON.stringify(['a', 'b']), productLikedIds: '[]' },
    responses: { [url('a')]: { status: 200, body: section('a') }, [url('b')]: { status: 200, body: section('b') } },
  })
  assert.equal(page.cards.length, 2)
  for (const card of page.cards) assert.ok(card.like.classList.contains('is-liked'), card.handle)
})

test('comme la grille de collection, les deux premières images se chargent tout de suite et en priorité, les autres à l’approche de l’écran', async () => {
  const handles = ['a', 'b', 'c', 'd', 'e']
  const page = await likesPage({ handles, responses: Object.fromEntries(handles.map((h) => [url(h), { status: 200, body: section(h) }])) })
  assert.deepEqual(page.cards.map((c) => [c.image.getAttribute('loading'), c.image.getAttribute('fetchpriority')]), [
    ['eager', 'high'], ['eager', 'high'], ['lazy', null], ['lazy', null], ['lazy', null],
  ])
})

test('une carte retirée par son cœur part de la liste ; plus aucune carte : la liste vide', async () => {
  const page = await likesPage({ handles: ['a', 'b'], responses: { [url('a')]: { status: 200, body: section('a') }, [url('b')]: { status: 200, body: section('b') } } })
  const [a, b] = page.cards
  page.element.removeCard(a)
  assert.deepEqual(handlesOf(page.grid.children), ['b'])
  assert.ok(page.empty.classList.contains('hidden'), 'une carte reste')
  page.element.removeCard(b)
  assert.deepEqual(page.grid.children, [])
  assert.ok(!page.empty.classList.contains('hidden'), 'liste vide')
})

test('les images se dévoilent : removeSkeletonOnImagesLoad (tw-global.js) reçoit la grille, une fois dans la page', async () => {
  const page = await likesPage({ handles: ['a'], responses: { [url('a')]: { status: 200, body: section('a') } } })
  assert.equal(page.skeletons.length, 1)
  assert.equal(page.skeletons[0].container, page.grid)
  assert.ok(page.skeletons[0].inPage, 'appelée après l’insertion de la grille')
})

test('une œuvre aimée deux fois (ancien double clic) n’a qu’une carte, demandée une fois', async () => {
  const page = await likesPage({
    handles: ['a', 'b', 'a'],
    responses: { [url('a')]: { status: 200, body: section('a') }, [url('b')]: { status: 200, body: section('b') } },
  })
  assert.deepEqual(handlesOf(page.cards), ['a', 'b'])
  assert.equal(page.requests.filter((r) => r === url('a')).length, 1)
})

test('beaucoup de j’aime : six demandes à la fois au plus (la boutique répond 429 aux rafales), dans l’ordre', async () => {
  const handles = Array.from({ length: 20 }, (_, i) => `oeuvre-${i}`)
  const responses = Object.fromEntries(handles.map((h, i) => [url(h), { status: 200, body: section(h), delay: 2 + ((i * 7) % 5) }]))
  const page = await likesPage({ handles, responses })
  assert.ok(page.maxInFlight <= 6, `${page.maxInFlight} demandes en même temps`)
  assert.ok(page.maxInFlight >= 2, 'mais en parallèle')
  assert.deepEqual(handlesOf(page.cards), handles)
})

test('sans Shopify.routes.root, les cartes se demandent à la racine', async () => {
  const page = await likesPage({ handles: ['a'], withoutRoutes: true, responses: { [url('a')]: { status: 200, body: section('a') } } })
  assert.deepEqual(page.requests, [url('a')])
  assert.deepEqual(handlesOf(page.cards), ['a'])
})

/* « Mes j'aime » d'une seule œuvre, h, dont Shopify rend la carte avec `object` (l'œuvre en objet), quelle que
   soit l'adresse demandée. `looks` : ce que productLikedLooks contient (rien : pas de clé). */
async function likedCard(object, looks) {
  const storage = { productLikedHandles: '["h"]' }
  if (looks !== undefined) storage.productLikedLooks = typeof looks === 'string' ? looks : JSON.stringify(looks)
  const page = await likesPage({ storage, responses: (address) => (address.startsWith('/products/h?') ? { status: 200, body: section('h', object) } : null) })
  assert.equal(page.cards.length, 1)
  return { card: page.cards[0], requests: page.requests }
}
// Ce que la vignette montre : son cadre (data-frame, aucun : sans cadre) et son contour blanc.
const lookOf = (card) => ({ frame: card.object.dataset.frame || null, contour: !card.object.classList.contains('no-contour') })

test('une œuvre aimée sur sa fiche est demandée avec la variante aimée, derrière le préfixe de langue ; les autres, comme avant', async () => {
  const page = await likesPage({
    root: '/en/',
    storage: {
      productLikedHandles: JSON.stringify(['aimee-sur-la-fiche', 'aimee-sur-une-carte']),
      productLikedLooks: JSON.stringify({ 'aimee-sur-la-fiche': { id: '54403688005979', properties: {} } }),
    },
    responses: {
      '/en/products/aimee-sur-la-fiche?variant=54403688005979&section_id=my-likes-card': { status: 200, body: section('aimee-sur-la-fiche') },
      '/en/products/aimee-sur-une-carte?section_id=my-likes-card': { status: 200, body: section('aimee-sur-une-carte') },
    },
  })
  assert.deepEqual(page.requests.slice().sort(), [
    '/en/products/aimee-sur-la-fiche?variant=54403688005979&section_id=my-likes-card',
    '/en/products/aimee-sur-une-carte?section_id=my-likes-card',
  ])
  assert.deepEqual(handlesOf(page.cards), ['aimee-sur-la-fiche', 'aimee-sur-une-carte'])
})

test('un poster aimé sous verre prend la couleur de cadre gardée et son contour blanc, que la variante ne dit pas', async () => {
  const cases = [
    [{ _cadre: 'cadre-noyer-1', _passe_partout: 'oui' }, { frame: 'noyer', contour: true }],
    [{ _cadre: 'cadre-blanc-1', _passe_partout: 'non' }, { frame: 'blanc', contour: false }],
    [{ _cadre: 'cadre-chene-clair-1' }, { frame: 'chene', contour: false }],
    // « Avec cadre » sans couleur connue : le noir, comme au panier. Pas de _passe_partout : pas de contour.
    [{ _passe_partout: 'oui' }, { frame: 'noir', contour: true }],
    [{ _cadre: 'cadre-rose-poudre-1', _passe_partout: 'oui' }, { frame: 'noir', contour: true }],
    ['pas des propriétés', { frame: 'noir', contour: false }],
  ]
  for (const [properties, expected] of cases) {
    const { card, requests } = await likedCard(posterObject({ look: 'verre', frame: 'noir', contour: false }), { h: { id: '54403688138811', properties } })
    assert.deepEqual(requests, ['/products/h?variant=54403688138811&section_id=my-likes-card'])
    assert.deepEqual(lookOf(card), expected, JSON.stringify(properties))
    assert.equal(card.object.dataset.look, 'verre')
  }
})

test('chaque couleur de cadre de poster de la boutique : « Mes j’aime » pose le cadre que lui donne la fiche 3D', async () => {
  for (const [, handle] of posterFixture.frameColors) {
    const { card } = await likedCard(posterObject(), { h: { id: '5', properties: { _cadre: handle } } })
    assert.equal(card.object.dataset.frame, productFromSelection(posterFixture, posterWith(handle)).frame, handle)
  }
})

test('un poster aimé sans cadre reste en papier ; seul son contour blanc suit la ligne', async () => {
  for (const [passePartout, contour] of [['oui', true], ['non', false]]) {
    const { card } = await likedCard(posterObject({ look: 'papier' }), { h: { id: '5', properties: { _passe_partout: passePartout } } })
    assert.deepEqual(lookOf(card), { frame: null, contour })
    assert.equal(card.object.dataset.look, 'papier')
  }
})

test('une toile aimée : sa carte telle que Shopify l’a rendue pour la variante, son cadre compris', async () => {
  const { card } = await likedCard(toileObject('chene'), { h: { id: '5', properties: {} } })
  assert.deepEqual({ ...card.object.dataset }, { kind: 'toile', frame: 'chene' })
  assert.ok(!card.object.classList.contains('no-contour'))
})

test('une œuvre sans ligne gardée (aimée depuis une carte, ou avant) : demandée sans variante, sa carte reçue telle quelle', async () => {
  for (const looks of [undefined, { autre: { id: '5', properties: {} } }]) {
    const { card, requests } = await likedCard(posterObject({ look: 'verre', frame: 'noir', contour: true }), looks)
    assert.deepEqual(requests, [url('h')])
    assert.deepEqual(lookOf(card), { frame: 'noir', contour: true })
  }
})

test('une ligne gardée inutilisable (illisible, sans variante, variante qui n’est pas un nombre) : l’œuvre se montre comme sans ligne', async () => {
  const unusable = [
    '{"h":', '["h"]', '"h"', 'null',
    { h: null }, { h: 'texte' }, { h: { properties: { _cadre: 'cadre-noyer-1' } } },
    { h: { id: '12&section_id=main-product', properties: {} } }, { h: { id: '', properties: {} } }, { h: { id: 12.5, properties: {} } },
  ]
  for (const looks of unusable) {
    const { card, requests } = await likedCard(posterObject({ look: 'verre', frame: 'noir', contour: true }), looks)
    assert.deepEqual(requests, [url('h')], JSON.stringify(looks))
    assert.deepEqual(lookOf(card), { frame: 'noir', contour: true }, JSON.stringify(looks))
  }
})

/* Le cœur des cartes et de la fiche (assets/my-like-button.js, <my-like-button>) dans une page réduite : ses
   cœurs, la liste « Mes j'aime » s'il y en a une (elle note les cartes qu'on lui rend), localStorage, et le
   compteur de j'aime du serveur (fetch, sans effet ici). Chaque cœur est celui d'une carte, ou celui de la
   fiche s'il a `fiche` : le bloc de la fiche qui le contient (<main-product-blocks>, assets/main-product.js), dont
   cartLine() rend la ligne que l'achat ajouterait (`fiche: 'sans-script'` : un bloc pas encore défini, sans
   cartLine). `brokenStorage` : un localStorage qui refuse tout (stockage bloqué, ou plein). `click(i)` touche
   le cœur i. */
function heartPage({ cards, storage, likesPageHere = true, brokenStorage = false }) {
  const store = { ...storage }
  const removed = []
  const likes = likesPageHere ? { removeCard: (card) => removed.push(card.handle) } : null
  const defined = {}
  let pending = null // ce que le navigateur donne à l'élément avant son constructeur (attributs, enfants)
  class HTMLElement {
    constructor() { Object.assign(this, pending, { listeners: [] }) }
    addEventListener(type, callback) { this.listeners.push({ type, callback }) }
  }
  const refuse = () => { throw new Error('SecurityError: stockage refusé') }
  const win = {
    HTMLElement,
    customElements: { define: (name, cls) => { defined[name] = cls }, get: (name) => defined[name] },
    localStorage: brokenStorage
      ? { getItem: refuse, setItem: refuse }
      : { getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = String(value) } },
    fetch: async () => ({ json: async () => 0 }),
    document: { querySelector: (selector) => (selector === 'my-likes' ? likes : null) },
    JSON, Promise, Array, Object, console,
  }
  win.window = win
  vm.runInNewContext(read('assets/my-like-button.js'), win, { filename: path.join(ROOT, 'assets/my-like-button.js') })
  const onPage = cards.map(({ id, handle, liked = true, fiche }) => {
    const card = { id, handle }
    const button = { classList: classList('like', ...(liked ? ['is-liked'] : [])) }
    const blocks = fiche === undefined ? null : fiche === 'sans-script' ? {} : { cartLine: () => fiche }
    pending = {
      dataset: { productId: id, productHandle: handle }, firstElementChild: button,
      querySelector: (selector) => (selector === 'button.like' ? button : null),
      closest: (selector) => (selector === 'main-product-blocks' ? blocks : selector === 'anime-product-card' && !blocks ? card : null),
    }
    const heart = new defined['my-like-button']()
    heart.connectedCallback()
    return Object.assign(card, { heart, button })
  })
  return {
    store, removed, onPage,
    async click(i) { for (const { type, callback } of onPage[i].heart.listeners) if (type === 'click') await callback() },
  }
}
const stored = (store, key) => JSON.parse(store[key] || 'null')

test('« Mes j’aime » : retirer un j’aime rend sa carte à la liste, et l’efface des j’aime gardés', async () => {
  // Une œuvre aimée puis retirée de la boutique : son identifiant reste dans productLikedIds, sans carte.
  const page = heartPage({
    cards: [{ id: '1', handle: 'a' }, { id: '2', handle: 'b' }],
    storage: { productLikedIds: '["1","2","9"]', productLikedHandles: '["a","b","retiree"]' },
  })
  await page.click(0)
  assert.deepEqual(page.removed, ['a'])
  assert.deepEqual(stored(page.store, 'productLikedIds'), ['2', '9'])
  assert.deepEqual(stored(page.store, 'productLikedHandles'), ['b', 'retiree'])
  await page.click(1)
  assert.deepEqual(page.removed, ['a', 'b'])
})

test('ailleurs, le cœur garde les j’aime sous les mêmes clés (productLikedIds, productLikedHandles), et rien d’autre', async () => {
  const page = heartPage({ cards: [{ id: '7', handle: 'h', liked: false }], storage: { productLikedIds: '["1"]', productLikedHandles: '["a"]' }, likesPageHere: false })
  await page.click(0)
  assert.ok(page.onPage[0].button.classList.contains('is-liked'))
  assert.deepEqual(page.removed, [], 'hors de « Mes j’aime », la carte reste')
  assert.deepEqual(Object.keys(page.store).sort(), ['productLikedHandles', 'productLikedIds'])
  assert.deepEqual(stored(page.store, 'productLikedIds'), ['1', '7'])
  assert.deepEqual(stored(page.store, 'productLikedHandles'), ['a', 'h'])
  await page.click(0)
  assert.deepEqual(stored(page.store, 'productLikedIds'), ['1'])
  assert.deepEqual(stored(page.store, 'productLikedHandles'), ['a'])
})

/* La ligne de la fiche du Bonsaï poster, telle que l'achat l'ajouterait : la variante « 30x40 cm / Avec cadre »
   et toutes les propriétés de ligne (snippets/painting-variant-picker.liquid), dont les libellés traduits. */
const POSTER_LINE = {
  id: '54403688138811',
  properties: { 'Couleur du cadre': 'Cadre noyer', _cadre: 'cadre-noyer-1', 'Contour blanc': 'Avec contour blanc', _passe_partout: 'oui' },
}

test('un j’aime donné sur la fiche garde la ligne que l’achat ajouterait : sa variante, la couleur du cadre (_cadre) et le contour blanc (_passe_partout)', async () => {
  const page = heartPage({ cards: [{ id: '7', handle: 'poster-bonsai', liked: false, fiche: POSTER_LINE }], storage: { productLikedIds: '["1"]', productLikedHandles: '["a"]' }, likesPageHere: false })
  await page.click(0)
  assert.ok(page.onPage[0].button.classList.contains('is-liked'))
  assert.deepEqual(stored(page.store, 'productLikedLooks'), {
    'poster-bonsai': { id: '54403688138811', properties: { _cadre: 'cadre-noyer-1', _passe_partout: 'oui' } },
  })
  // Les clés de toujours ne changent pas : le compteur de l'en-tête et l'état des cœurs les lisent.
  assert.deepEqual(stored(page.store, 'productLikedIds'), ['1', '7'])
  assert.deepEqual(stored(page.store, 'productLikedHandles'), ['a', 'poster-bonsai'])
})

test('une toile aimée sur sa fiche : sa variante seule, son cadre y est', async () => {
  const page = heartPage({ cards: [{ id: '7', handle: 'toile-bonsai', liked: false, fiche: { id: '54403688005979', properties: {} } }], storage: {}, likesPageHere: false })
  await page.click(0)
  assert.deepEqual(stored(page.store, 'productLikedLooks'), { 'toile-bonsai': { id: '54403688005979', properties: {} } })
})

test('aimée de nouveau sur sa fiche : la ligne de cet instant remplace l’ancienne', async () => {
  const looks = { 'poster-bonsai': { id: '1', properties: { _cadre: 'cadre-blanc-1', _passe_partout: 'non' } }, koi: { id: '2', properties: {} } }
  const page = heartPage({ cards: [{ id: '7', handle: 'poster-bonsai', liked: false, fiche: POSTER_LINE }], storage: { productLikedLooks: JSON.stringify(looks) }, likesPageHere: false })
  await page.click(0)
  assert.deepEqual(stored(page.store, 'productLikedLooks'), {
    'poster-bonsai': { id: '54403688138811', properties: { _cadre: 'cadre-noyer-1', _passe_partout: 'oui' } },
    koi: looks.koi,
  })
})

test('un j’aime donné depuis une carte ne garde aucune ligne, et efface celle que l’œuvre avait ; les autres restent', async () => {
  const looks = { bonsai: { id: '1', properties: {} }, koi: { id: '2', properties: { _cadre: 'cadre-blanc-1' } } }
  const page = heartPage({ cards: [{ id: '7', handle: 'bonsai', liked: false }], storage: { productLikedLooks: JSON.stringify(looks) }, likesPageHere: false })
  await page.click(0)
  assert.deepEqual(stored(page.store, 'productLikedLooks'), { koi: looks.koi })
})

test('retirer un j’aime efface sa ligne, sur la fiche comme sur une carte de « Mes j’aime »', async () => {
  const looks = { a: { id: '1', properties: {} }, b: { id: '2', properties: {} }, c: { id: '3', properties: {} } }
  const page = heartPage({
    cards: [{ id: '1', handle: 'a', fiche: { id: '1', properties: {} } }, { id: '2', handle: 'b' }],
    storage: { productLikedIds: '["1","2","3"]', productLikedHandles: '["a","b","c"]', productLikedLooks: JSON.stringify(looks) },
  })
  await page.click(0)
  await page.click(1)
  assert.deepEqual(stored(page.store, 'productLikedLooks'), { c: looks.c })
  assert.deepEqual(page.removed, ['b'], 'la carte part de « Mes j’aime » ; la fiche n’en est pas une')
})

test('une fiche dont l’achat n’a pas de variante (aucun bouton d’achat), ou pas encore son script : le j’aime ne garde aucune ligne', async () => {
  for (const fiche of [{ id: null, properties: {} }, { id: 'pas-un-nombre', properties: {} }, null, 'sans-script']) {
    const page = heartPage({ cards: [{ id: '7', handle: 'h', liked: false, fiche }], storage: { productLikedLooks: JSON.stringify({ h: { id: '1', properties: {} } }) }, likesPageHere: false })
    await page.click(0)
    assert.deepEqual(stored(page.store, 'productLikedLooks'), {}, JSON.stringify(fiche))
    assert.deepEqual(stored(page.store, 'productLikedHandles'), ['h'], 'le j’aime est gardé quand même')
  }
})

test('lignes gardées illisibles : le cœur repart d’une liste vide, sans casser', async () => {
  for (const unreadable of ['{"pas":"fini"', '[1,2]', '"texte"', 'null']) {
    const page = heartPage({ cards: [{ id: '7', handle: 'h', liked: false, fiche: { id: '9', properties: {} } }], storage: { productLikedLooks: unreadable }, likesPageHere: false })
    await page.click(0)
    assert.deepEqual(stored(page.store, 'productLikedLooks'), { h: { id: '9', properties: {} } }, unreadable)
  }
})

/* Le bloc de la fiche (assets/main-product.js, <main-product-blocks>) réduit à ce que l'achat lit : son bouton
   d'achat (data-variant-id), ses propriétés de ligne (.product-properties input, comme
   snippets/painting-variant-picker.liquid les rend) et, sur la fiche 3D (data-buy-pill), la pilule d'achat de
   la scène, hors du bloc (snippets/oeuvre-3d-stage.liquid). */
function ficheBlocks({ buyButton = null, pill = null, inputs = [] } = {}) {
  const registry = new Map()
  class HTMLElement {
    constructor() { this.attrs = new Set() }
    hasAttribute(name) { return this.attrs.has(name) }
    setAttribute(name) { this.attrs.add(name) }
    querySelector(selector) { return selector === '.buy-button' ? buyButton : null }
    querySelectorAll(selector) { return selector === '.product-properties input' ? inputs : [] }
    closest() { return null }
    addEventListener() {}
  }
  class CollapsibleTab extends HTMLElement { connectedCallback() {} }
  registry.set('collapsible-tab', CollapsibleTab)
  const document = {
    body: { querySelector: () => null, appendChild() {} },
    getElementById: () => null,
    querySelector: (selector) => (selector === '[data-pill-buy]' ? pill : null),
    querySelectorAll: () => [],
    addEventListener() {},
    dispatchEvent() {},
  }
  const context = {
    HTMLElement, document, console, setTimeout, clearTimeout, requestAnimationFrame: () => 0,
    IntersectionObserver: class { observe() {} disconnect() {} },
    Event: class {}, CustomEvent: class {},
    customElements: { get: (name) => registry.get(name), define: (name, element) => registry.set(name, element) },
  }
  context.window = context
  vm.createContext(context)
  vm.runInContext(read('assets/main-product.js'), context, { filename: 'assets/main-product.js' })
  const blocks = new (registry.get('main-product-blocks'))()
  if (pill) blocks.setAttribute('data-buy-pill')
  return blocks
}
const hidden = (name, value, { disabled = false } = {}) => ({ type: 'hidden', name, value, disabled, checked: false })
// Les propriétés de ligne d'un poster de la fiche : couleur du cadre (désactivée pour « Sans cadre ») et contour blanc.
const posterInputs = ({ framed }) => [
  hidden('Couleur du cadre', framed ? 'Cadre noyer' : '', { disabled: !framed }),
  hidden('_cadre', framed ? 'cadre-noyer-1' : '', { disabled: !framed }),
  hidden('Contour blanc', 'Sans contour blanc'),
  hidden('_passe_partout', 'non'),
]

test('la ligne du cœur de la fiche est celle de l’achat : la variante du bouton d’achat et les propriétés de ligne envoyées au panier', () => {
  const framed = ficheBlocks({ buyButton: { dataset: { variantId: '54403688138811' } }, inputs: posterInputs({ framed: true }) })
  assert.deepEqual(JSON.parse(JSON.stringify(framed.cartLine())), {
    id: '54403688138811',
    properties: { 'Couleur du cadre': 'Cadre noyer', _cadre: 'cadre-noyer-1', 'Contour blanc': 'Sans contour blanc', _passe_partout: 'non' },
  })
  // « Sans cadre » : la couleur, désactivée, ne part pas au panier.
  const paper = ficheBlocks({ buyButton: { dataset: { variantId: '54403688106043' } }, inputs: posterInputs({ framed: false }) })
  assert.deepEqual(JSON.parse(JSON.stringify(paper.cartLine())), { id: '54403688106043', properties: { 'Contour blanc': 'Sans contour blanc', _passe_partout: 'non' } })
})

test('fiche 3D : la variante est celle de la pilule d’achat de la scène, qui achète (data-buy-pill)', () => {
  const blocks = ficheBlocks({ buyButton: { dataset: { variantId: '1' } }, pill: { dataset: { variantId: '54403688005979' } } })
  assert.equal(blocks.cartLine().id, '54403688005979')
})

test('une fiche sans bouton d’achat : une ligne sans variante', () => {
  assert.equal(ficheBlocks().cartLine().id, null)
})

test('localStorage qui refuse tout (stockage bloqué, ou plein) : le cœur s’affiche et change d’état, sans casser la page', async () => {
  const page = heartPage({ cards: [{ id: '7', handle: 'h', liked: false, fiche: POSTER_LINE }, { id: '8', handle: 'k' }], brokenStorage: true, likesPageHere: false })
  await page.click(0)
  await page.click(1)
  assert.ok(page.onPage[0].button.classList.contains('is-liked'))
  assert.ok(!page.onPage[1].button.classList.contains('is-liked'))
})

