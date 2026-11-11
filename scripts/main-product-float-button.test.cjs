// Le bouton flottant « Ajouter au panier » des fiches classiques (assets/main-product.js,
// MainProductBlocks) : il paraît quand la fiche, ou le pied de page (assets/tw-footer.js), quitte l'écran.
// - Fiche 3D (data-buy-pill) : jamais, la pilule de la scène le remplace. Le pied de page l'y recréait
//   quand on remontait de tout en bas (retour de Walid du 11/11/2026).
// - Bascule toile/poster (assets/product-twin-toggle.js remplace la fiche) : toutes les surveillances de
//   la fiche quittée s'arrêtent. Le pied de page écrasait la seule qu'on gardait pour l'arrêter : celle de
//   la fiche, oubliée, recréait le bouton de la fiche quittée, qui ajoutait la toile au panier quand la
//   page montrait le poster (banc du 11/11/2026).
// Lancer : node --test scripts/main-product-float-button.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')

/* Une page réduite à ce que ces deux scripts touchent : des éléments à attributs, le <template> du bouton
   flottant, un <body>, et des IntersectionObserver qu'on déclenche à la main. */
function page({ variantId = 'toile' } = {}) {
  const observers = []
  const body = {
    nodes: [],
    appendChild(fragment) { this.nodes.push(...fragment.nodes) },
    querySelector(selector) { return selector === '.float-buy-button' ? this.nodes[0] || null : null },
  }
  const floatButton = (id) => {
    const classes = new Set(['float-buy-button'])
    const button = {
      dataset: { variantId: id },
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
      addEventListener() {},
      remove() { body.nodes = body.nodes.filter((node) => node !== button) },
      get visible() { return !classes.has('hidden') },
    }
    return button
  }
  let template = null
  const setTemplate = (id) => { template = { content: { cloneNode: () => ({ nodes: [floatButton(id)] }) } } }
  setTemplate(variantId)

  const registry = new Map()
  let mainBlocks = null
  class HTMLElement {
    constructor() { this.attrs = new Set() }
    hasAttribute(name) { return this.attrs.has(name) }
    setAttribute(name) { this.attrs.add(name) }
    querySelector(selector) { return selector === '.buy-button' ? { addEventListener() {}, dataset: {} } : null }
    querySelectorAll() { return [] }
    closest(selector) { return { tag: selector } }
    addEventListener() {}
  }
  class CollapsibleTab extends HTMLElement {
    constructor() { super(); this.accordions = []; this.section = this.closest('section') }
    connectedCallback() {}
  }
  registry.set('collapsible-tab', CollapsibleTab)
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; this.live = true; observers.push(this) }
    observe(target) { this.targets.push(target) }
    disconnect() { this.live = false }
    fire(isIntersecting) { if (this.live) this.callback(this.targets.map((target) => ({ target, isIntersecting }))) }
  }
  const document = {
    body,
    getElementById: (id) => (id === 'float-buy-button' ? template : null),
    querySelector: (selector) => (selector === 'main-product-blocks' ? mainBlocks : null),
    querySelectorAll: () => [],
    addEventListener() {},
    dispatchEvent() {},
  }
  const context = {
    HTMLElement, document, IntersectionObserver: FakeObserver, console, setTimeout, clearTimeout,
    Event: class { constructor(type) { this.type = type } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail } },
    customElements: { get: (name) => registry.get(name), define: (name, element) => registry.set(name, element) },
    requestAnimationFrame: () => 0,
  }
  context.window = context
  vm.createContext(context)
  vm.runInContext(read('assets/main-product.js'), context, { filename: 'assets/main-product.js' })
  vm.runInContext(read('assets/tw-footer.js'), context, { filename: 'assets/tw-footer.js' })
  const MainProductBlocks = registry.get('main-product-blocks')
  const FooterLogic = registry.get('footer-logic')

  return {
    observers, body, setTemplate,
    // La fiche, telle que le serveur la rend, branchée à la page.
    mount({ pill = false } = {}) {
      const blocks = new MainProductBlocks()
      if (pill) blocks.setAttribute('data-buy-pill')
      mainBlocks = blocks
      blocks.connectedCallback()
      return blocks
    },
    // Le pied de page, hors de #MainContent : branché une fois, après la fiche.
    mountFooter() { new FooterLogic().connectedCallback() },
    // Tout ce qui surveille entre à l'écran, puis en sort (on descend tout en bas, puis on remonte).
    scrollAll() { for (const observer of [...observers]) { observer.fire(true); observer.fire(false) } },
  }
}

test('fiche 3D : ni la fiche ni le pied de page ne font paraître le bouton flottant', () => {
  const p = page()
  p.mount({ pill: true })
  p.mountFooter()
  p.scrollAll()
  assert.equal(p.body.nodes.length, 0)
})

test('fiche classique : le bouton paraît quand la fiche quitte l’écran, et se cache sur le pied de page', () => {
  const p = page()
  p.mount()
  p.mountFooter()
  const [section, footer] = p.observers
  section.fire(true) // arrivée : la fiche à l'écran
  footer.fire(false) // le pied de page, loin
  assert.equal(p.body.nodes.length, 0)
  section.fire(false) // on descend : la fiche sort de l'écran
  assert.equal(p.body.nodes.length, 1)
  assert.ok(p.body.nodes[0].visible)
  footer.fire(true) // tout en bas : le pied de page
  assert.ok(!p.body.nodes[0].visible)
})

test('bascule toile/poster : la fiche quittée ne recrée pas son bouton, celui de la nouvelle porte sa variante', () => {
  const p = page({ variantId: 'toile' })
  const toile = p.mount()
  p.mountFooter()
  const [toileSection] = p.observers
  toileSection.fire(true) // la bascule est en haut de la fiche : la fiche est à l'écran
  // La bascule remplace la fiche : la toile est débranchée, le poster branché, avec son gabarit.
  toile.disconnectedCallback()
  p.setTemplate('poster')
  p.mount()
  const posterSection = p.observers.at(-1)
  toileSection.fire(false) // la fiche de la toile n'est plus dans la page
  posterSection.fire(true)
  assert.equal(p.body.nodes.length, 0, 'aucun bouton de la fiche quittée')
  posterSection.fire(false) // on descend
  assert.deepEqual(p.body.nodes.map((button) => button.dataset.variantId), ['poster'])
})
