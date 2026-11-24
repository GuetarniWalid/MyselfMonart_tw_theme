/*
 * Les photos du menu d'ordinateur (snippets/tw-sticky-header.liquid, assets/tw-header.js) : au téléphone, qui ne montre
 * jamais ce menu, aucune ne se charge ; sur ordinateur, elles sont prêtes au premier survol.
 * Relevé du 24/11/2026 : sans loading, les 18 photos (617 Ko) se chargeaient sur toutes les pages, au téléphone aussi,
 * alors que leur conteneur y est caché (hidden md:block). Le plus grand élément de Tableaux Nature passait de 5,0 s à
 * 2,7 s sans elles (processeur ×4, 4G lente).
 * - Le Liquid : chaque photo du menu est en loading: 'lazy'.
 * - Le script : <sticky-header> les repasse en « eager » une fois la page chargée, au repos, à partir de 768 px.
 * Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/tw-header-photos.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('vm')
const { SKIP, code, read, engine, image, renderSnippet } = require('./galerie-banc.cjs')

/* ---------- Le Liquid : toutes les photos attendent ---------- */

const FILE = 'snippets/tw-sticky-header.liquid'

test('chaque image_tag de l’en-tête est dans le menu d’ordinateur et porte loading: \'lazy\'', () => {
  const source = code(FILE)
  const menu = source.indexOf('class="desktop-dropdown-container hidden md:block')
  assert.ok(menu > 0, 'le conteneur, caché au téléphone')
  const photos = [...source.matchAll(/\|\s*image_tag\b([\s\S]*?)}}/g)]
  // Une photo de plus dans l'en-tête : l'ajouter aussi au menu d'essai du test suivant.
  assert.equal(photos.length, 11)
  for (const [, options] of photos) assert.match(options, /\bloading:\s*'lazy'/, options.replace(/\s+/g, ' '))
  for (const { index } of photos) assert.ok(index > menu, 'une photo hors du menu d’ordinateur')
  assert.doesNotMatch(source, /<img\b/, 'une image sans image_tag')
})

/* L'en-tête rendu avec un menu d'essai : deux volets, et dans le premier un bloc de chaque sorte, avec toutes ses
   photos (la sienne, puis celle que le Liquid prend à défaut). */
const photo = (nom) => image(nom, `${nom}.jpg`, 800, 800)
const MENU = [
  ['title_only', { title: 'Nos Tableaux' }],
  ['collection_only', { collection: { title: 'Tous les Tableaux', url: '/collections/tous-les-tableaux' }, desktop_image_1: photo('c1'), desktop_image_2: photo('c2'), desktop_image_3: photo('c3'), desktop_image_4: photo('c4') }],
  ['product_only', { product: { title: 'Le Baiser', url: '/products/le-baiser', featured_image: photo('p0') }, desktop_image: photo('p1') }],
  ['product_only', { product: { title: 'La Vague', url: '/products/la-vague', featured_image: photo('p2') } }],
  ['page_only', { page: { title: 'Notre histoire', url: '/pages/notre-histoire' }, desktop_image: photo('g1') }],
  ['set_of_collections', { title: 'Par Pièce', child_collection_list: [{ title: 'Tableau Salon', url: '/collections/tableau-salon', featured_image: photo('s0') }], desktop_image: photo('s1') }],
  ['set_of_collections', { title: 'Animaux', child_collection_list: [{ title: 'Tableau Lion', url: '/collections/tableau-lion', featured_image: photo('s2') }] }],
  ['title_only', { title: 'Posters & Affiches' }],
].map(([type, settings], i) => ({ id: `bloc${i}`, type, settings }))

function rendre() {
  const e = engine('fr')
  e.registerFilter('image_tag', (url, ...options) => `<img src="${url}"${options.filter(Array.isArray).map(([nom, valeur]) => ` ${nom}="${valeur}"`).join('')}>`)
  // {% form %} de Shopify (le choix du pays, dans le menu du téléphone) : son contenu, dans une balise <form>.
  e.registerTag('form', {
    parse(token, remain) {
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endform', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('form non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      emitter.write('<form>')
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      emitter.write('</form>')
    },
  })
  const settings = { logo_svg: '', default_desktop_image_1: photo('d1'), default_desktop_image_2: photo('d2'), default_desktop_image_3: photo('d3'), default_desktop_image_4: photo('d4') }
  return renderSnippet('tw-sticky-header', {}, null, { name: 'index', section: { id: 'tw-header', settings, blocks: MENU } })
}

test('le menu rendu : toutes ses photos attendent (loading="lazy"), et l’en-tête n’en a pas d’autre', { skip: SKIP }, async () => {
  const html = await rendre()
  const photos = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
  const noms = photos.map((balise) => /\/files\/(\w+)\.jpg/.exec(balise)[1])
  // Dans chaque volet, les quatre photos par défaut ; dans le premier, celles de ses blocs.
  assert.deepEqual(noms, ['d1', 'd2', 'd3', 'd4', 'c1', 'c2', 'c3', 'c4', 'p1', 'p2', 'g1', 's1', 's2', 'd1', 'd2', 'd3', 'd4'])
  for (const balise of photos) assert.match(balise, / loading="lazy"/, balise)
})

/* ---------- Le script : prêtes au premier survol, jamais au téléphone ---------- */

/* Un élément d'essai : ses écouteurs, qu'on déclenche, et ce que trouvent ses recherches (trouve : sélecteur →
   élément ou liste). */
class Element {
  constructor(trouve = {}) {
    this.trouve = trouve
    this.ecouteurs = {}
    this.dataset = {}
    this.classList = { add() {}, remove() {}, toggle() {}, replace() {}, contains: () => false }
  }
  addEventListener(type, action) { (this.ecouteurs[type] = this.ecouteurs[type] || []).push(action) }
  declencher(type, evenement = {}) { for (const action of this.ecouteurs[type] || []) action({ preventDefault() {}, ...evenement }) }
  querySelector(selecteur) { return this.trouve[selecteur] || null }
  querySelectorAll(selecteur) { return this.trouve[selecteur] || [] }
  setAttribute() {}
}

/* Une page d'essai avec son en-tête : sa largeur, son état (document.readyState), et le navigateur, qui a
   requestIdleCallback ou non (Safari). Le vrai script, tel que le navigateur le lit, dans un bac à sable. */
function page({ largeur, etat = 'interactive', repos = true }) {
  // Deux photos du menu. La recherche du script ne rend que celles qui attendent encore.
  const photos = [{ loading: 'lazy' }, { loading: 'lazy' }]
  const bouton = new Element()
  bouton.dataset.sectionId = 'volet1'
  const volet = new Element()
  volet.id = 'dropdown-volet1'
  const menu = new Element()
  const ouvreur = new Element()
  ouvreur.parentNode = new Element()
  ouvreur.nextElementSibling = menu

  const media = new Element()
  const fenetre = new Element()
  const attente = []
  const bac = {
    HTMLElement: class extends Element {
      constructor() {
        super({ '.menu-opener': ouvreur, '.desktop-nav-button': [bouton], '.desktop-dropdown': [volet], '#dropdown-volet1': volet, '[aria-controls="dropdown-volet1"]': bouton })
        this.parentElement = new Element()
        this.recherches = []
      }
      querySelectorAll(selecteur) {
        if (!/\bimg\b/.test(selecteur)) return super.querySelectorAll(selecteur)
        this.recherches.push(selecteur)
        return photos.filter((p) => p.loading === 'lazy')
      }
    },
    customElements: { define() {}, get() {} },
    document: Object.assign(new Element(), { readyState: etat, body: new Element(), documentElement: { hasAttribute: () => false }, getElementById: () => new Element() }),
    matchMedia: (requete) => {
      const min = /^\(min-width: (\d+)px\)$/.exec(requete)
      assert.ok(min, requete)
      return Object.defineProperty(media, 'matches', { configurable: true, get: () => largeur >= Number(min[1]) })
    },
    addEventListener: (...args) => fenetre.addEventListener(...args),
    setTimeout: (action, delai) => attente.push({ action, delai }),
    clearTimeout() {},
  }
  if (repos) bac.requestIdleCallback = (action, options) => attente.push({ action, options })
  bac.window = bac
  vm.createContext(bac)
  vm.runInContext(read('assets/tw-header.js'), bac, { filename: 'assets/tw-header.js' })
  const entete = new (vm.runInContext('StickyHeader', bac))()
  entete.connectedCallback()
  return {
    entete, bouton, attente,
    photos: () => photos.map((p) => p.loading).join(' '),
    chargee() { bac.document.readyState = 'complete'; fenetre.declencher('load') },
    auRepos() { for (const { action } of attente.splice(0)) action() },
    changerDeLargeur(nouvelle) { largeur = nouvelle; media.declencher('change', { matches: media.matches }) },
  }
}
const ATTENDENT = 'lazy lazy'
const DEMANDEES = 'eager eager'

test('sur ordinateur, les photos se chargent une fois la page chargée et le navigateur au repos, pas avant', () => {
  const p = page({ largeur: 1280 })
  assert.equal(p.photos(), ATTENDENT)
  assert.equal(p.attente.length, 0, 'rien avant la fin du chargement')
  p.chargee()
  assert.equal(p.photos(), ATTENDENT, 'la page chargée, elles attendent encore un creux')
  // Un navigateur qui ne se repose jamais : 2 s au plus.
  assert.equal(p.attente[0].options.timeout, 2000)
  p.auRepos()
  assert.equal(p.photos(), DEMANDEES)
  assert.deepEqual(p.entete.recherches, ['.desktop-dropdown-container img[loading="lazy"]'], 'les photos du menu, et elles seules')
})

test('Safari, sans requestIdleCallback : une minuterie après la fin du chargement', () => {
  const p = page({ largeur: 1280, repos: false })
  p.chargee()
  assert.equal(p.photos(), ATTENDENT)
  assert.equal(p.attente[0].delai, 200)
  p.auRepos()
  assert.equal(p.photos(), DEMANDEES)
})

test('l’en-tête posé dans une page déjà chargée (l’éditeur du thème) : au repos, sans attendre d’évènement', () => {
  const p = page({ largeur: 1280, etat: 'complete' })
  assert.equal(p.photos(), ATTENDENT)
  p.auRepos()
  assert.equal(p.photos(), DEMANDEES)
})

test('le seuil est celui de la feuille (md) : 768 px les charge, 767 px jamais', () => {
  for (const [largeur, attendu] of [[768, DEMANDEES], [767, ATTENDENT]]) {
    const p = page({ largeur })
    p.chargee()
    p.auRepos()
    assert.equal(p.photos(), attendu, `${largeur} px`)
  }
})

test('au téléphone, rien ne les demande : ni la fin du chargement, ni un survol, ni le clavier', () => {
  const p = page({ largeur: 390 })
  p.chargee()
  assert.equal(p.attente.length, 0)
  p.bouton.declencher('mouseenter')
  p.bouton.declencher('keydown', { key: 'Enter' })
  p.auRepos()
  assert.equal(p.photos(), ATTENDENT)
})

test('un menu ouvert avant la fin du chargement : le script n’y touche pas, le navigateur charge celles qui se montrent', () => {
  // Les demander toutes à l'ouverture les ferait attendre : 0,4 à 1,2 s au lieu de 0,2 à 0,9 s (10 Mb/s, 24/11/2026).
  for (const ouvrir of [(p) => p.bouton.declencher('mouseenter'), (p) => p.bouton.declencher('keydown', { key: 'Enter' })]) {
    const p = page({ largeur: 1280 })
    ouvrir(p)
    assert.ok(p.entete.currentOpenDropdown, 'le menu est ouvert')
    assert.equal(p.photos(), ATTENDENT)
    // Puis, comme d'habitude, toutes.
    p.chargee()
    p.auRepos()
    assert.equal(p.photos(), DEMANDEES)
  }
})

test('une tablette qu’on tourne, une fenêtre qu’on élargit : au repos, dès que le menu d’ordinateur se montre', () => {
  const p = page({ largeur: 744 })
  p.chargee()
  p.auRepos()
  assert.equal(p.photos(), ATTENDENT)
  p.changerDeLargeur(1133)
  assert.equal(p.photos(), ATTENDENT)
  p.auRepos()
  assert.equal(p.photos(), DEMANDEES)
  // Tournée pendant le chargement : la fin du chargement s'en charge.
  const tot = page({ largeur: 744 })
  tot.changerDeLargeur(1133)
  assert.equal(tot.attente.length, 0)
  tot.chargee()
  tot.auRepos()
  assert.equal(tot.photos(), DEMANDEES)
})
