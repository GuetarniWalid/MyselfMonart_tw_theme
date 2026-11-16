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

const ROOT = path.join(__dirname, '..')
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

/* Une carte telle que la section my-likes-card la rend, réduite à ce que la page touche : son cœur, son image.
   La réponse du serveur la décrit en une balise, <anime-product-card data-handle="…">, dans l'enveloppe de la
   section (#shopify-section-my-likes-card) ou non ; le DOMParser de la page réduite la relit. Ses modules (le
   reflet des posters) : banc du navigateur, et scripts/oeuvre-card.test.cjs. */
function cardFrom(html, selector) {
  const inSection = /<div id="shopify-section-my-likes-card"[^>]*>\s*<anime-product-card/.test(html)
  if (selector === '#shopify-section-my-likes-card anime-product-card' && !inSection) return null
  if (selector !== 'anime-product-card' && selector !== '#shopify-section-my-likes-card anime-product-card') return null
  const m = /<anime-product-card data-handle="([^"]*)">/.exec(html)
  if (!m) return null
  const like = { classList: classList('like') }
  const image = eagerImage()
  return {
    handle: m[1], like, image, parent: null,
    querySelector: (selector) => (selector === 'button.like' ? like : null),
    querySelectorAll: (selector) => (selector === 'img' ? [image] : []),
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null },
  }
}
const section = (handle) => `<div id="shopify-section-my-likes-card" class="shopify-section"><anime-product-card data-handle="${handle}"><li></li></anime-product-card></div>`

/* La page « Mes j'aime » réduite à ce que le script touche : l'élément <my-likes> (son modèle de grille, le
   chargeur qui le suit), le message de liste vide, localStorage, fetch (chaque réponse avec son délai, pour
   les faire arriver dans le désordre), DOMParser et removeSkeletonOnImagesLoad (tw-global.js). */
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
      const r = responses[url] || { status: 404, body: '<div id="shopify-section-my-likes-card" class="shopify-section"></div>' }
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

/* Le cœur des cartes (assets/my-like-button.js, <my-like-button>) dans une page réduite : ses cartes (chacune
   son cœur), la liste « Mes j'aime » s'il y en a une (elle note les cartes qu'on lui rend), localStorage, et le
   compteur de j'aime du serveur (fetch, sans effet ici). `click(i)` touche le cœur de la carte i. */
function heartPage({ cards, storage, likesPageHere = true }) {
  const store = { ...storage }
  const removed = []
  const likes = likesPageHere ? { removeCard: (card) => removed.push(card.handle) } : null
  const defined = {}
  let pending = null // ce que le navigateur donne à l'élément avant son constructeur (attributs, enfants)
  class HTMLElement {
    constructor() { Object.assign(this, pending, { listeners: [] }) }
    addEventListener(type, callback) { this.listeners.push({ type, callback }) }
  }
  const win = {
    HTMLElement,
    customElements: { define: (name, cls) => { defined[name] = cls }, get: (name) => defined[name] },
    localStorage: { getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = String(value) } },
    fetch: async () => ({ json: async () => 0 }),
    document: { querySelector: (selector) => (selector === 'my-likes' ? likes : null) },
    JSON, Promise, Array, console,
  }
  win.window = win
  vm.runInNewContext(read('assets/my-like-button.js'), win, { filename: path.join(ROOT, 'assets/my-like-button.js') })
  const onPage = cards.map(({ id, handle, liked = true }) => {
    const card = { id, handle }
    const button = { classList: classList('like', ...(liked ? ['is-liked'] : [])) }
    pending = {
      dataset: { productId: id, productHandle: handle }, firstElementChild: button,
      querySelector: (selector) => (selector === 'button.like' ? button : null),
      closest: (selector) => (selector === 'anime-product-card' ? card : null),
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

