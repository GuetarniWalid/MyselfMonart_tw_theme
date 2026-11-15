// Le reflet des vitres des vignettes de poster (assets/oeuvre-card-reflet.js ; vignettes de collection des
// nouveaux produits, décision 18 du dossier .scratch/fiche-3d). Le CSS le lie seul au défilement là où le
// navigateur le sait (animation-timeline: view()) ; ailleurs, le script fait la même course.
// Lancer : node --test scripts/oeuvre-card-reflet.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.join(__dirname, '..')
const FILE = path.join(ROOT, 'assets/oeuvre-card-reflet.js')
const SOURCE = fs.readFileSync(FILE, 'utf8')

/* Une vitre de vignette (.oeuvre-card-glass) et son reflet (.oeuvre-card-glare, son premier enfant), à `top`
   px du haut de l'écran. Les animations que le script crée sur le reflet sont gardées dans `anims`. */
function glass(top, height = 200) {
  const anims = []
  const glare = {
    animate(keyframes, options) {
      const anim = { keyframes, options, currentTime: null, paused: false, cancelled: false, pause() { this.paused = true }, cancel() { this.cancelled = true } }
      anims.push(anim)
      return anim
    },
  }
  const el = {
    nodeType: 1, isConnected: true, top, height, anims, firstElementChild: glare,
    matches: (selector) => selector === '.oeuvre-card-glass',
    querySelector: () => null,
    getBoundingClientRect: () => ({ top: el.top, height: el.height }),
  }
  return el
}
// Une carte entière, qui contient une vitre (ce que les filtres et le défilement infini ajoutent ou retirent).
const cardWith = (g) => ({ nodeType: 1, matches: () => false, querySelector: (selector) => (selector === '.oeuvre-card-glass' ? g : null) })

/* Une page réduite à ce que le script touche : ses vitres, un écran de 800 px, les observateurs (qu'on
   déclenche à la main), requestAnimationFrame (qu'on déroule à la main), et le défilement. */
function page({ cssTimeline = false, reducedMotion = false, glasses = [] } = {}) {
  const listeners = {}
  const frames = []
  const observers = { io: [], mo: [] }
  const doc = { glasses: [...glasses] }
  class IntersectionObserver {
    constructor(callback, options) { Object.assign(this, { callback, options, targets: new Set() }); observers.io.push(this) }
    observe(target) { this.targets.add(target) }
    unobserve(target) { this.targets.delete(target) }
    disconnect() { this.targets.clear() }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.mo.push(this) }
    observe(target, options) { Object.assign(this, { target, options }) }
  }
  class Element {}
  Element.prototype.animate = () => {}
  const body = {}
  const win = {
    innerHeight: 800,
    CSS: { supports: (query) => cssTimeline && /animation-timeline:\s*view\(\)/.test(query) },
    matchMedia: (query) => ({ matches: reducedMotion && /prefers-reduced-motion: reduce/.test(query), media: query }),
    requestAnimationFrame: (callback) => frames.push(callback),
    addEventListener: (type, callback, options) => { (listeners[type] = listeners[type] || []).push({ callback, options }) },
    document: { body, documentElement: {}, querySelectorAll: (selector) => (selector === '.oeuvre-card-glass' ? doc.glasses.filter((g) => g.isConnected) : []) },
    IntersectionObserver, MutationObserver, Element, Map, Set, Math,
  }
  win.window = win
  vm.runInNewContext(SOURCE, win, { filename: FILE })
  return {
    listeners, observers,
    // L'IntersectionObserver annonce les vitres proches de l'écran (ou qui s'en éloignent).
    near(...entries) { for (const io of observers.io) io.callback(entries.map(([target, isIntersecting = true]) => ({ target, isIntersecting }))) },
    scroll() { for (const { callback } of listeners.scroll || []) callback() },
    frame() { const pending = frames.splice(0); pending.forEach((callback) => callback(0)); return pending.length },
    add(g) { doc.glasses.push(g); for (const mo of observers.mo) mo.callback([{ addedNodes: [cardWith(g)], removedNodes: [] }]) },
    remove(g) { g.isConnected = false; for (const mo of observers.mo) mo.callback([{ addedNodes: [], removedNodes: [cardWith(g)] }]) },
  }
}
const time = (g) => g.anims[g.anims.length - 1].currentTime
// Les objets nés dans le contexte vm ont leurs propres prototypes : on compare leur contenu.
const plain = (value) => JSON.parse(JSON.stringify(value))

test('là où le CSS lie le reflet au défilement, le script ne fait rien : ni écouteur, ni observateur, ni animation', () => {
  const g = glass(300)
  const p = page({ cssTimeline: true, glasses: [g] })
  assert.deepEqual(Object.keys(p.listeners), [])
  assert.equal(p.observers.io.length + p.observers.mo.length, 0)
  assert.equal(g.anims.length, 0)
})

test('ailleurs, chaque vitre reçoit une seule animation de son reflet, en pause, sur la course du CSS', () => {
  const a = glass(300)
  const b = glass(1500)
  page({ glasses: [a, b] })
  for (const g of [a, b]) {
    assert.equal(g.anims.length, 1)
    const [anim] = g.anims
    assert.equal(anim.paused, true)
    assert.deepEqual(plain(anim.keyframes), [{ translate: '0 -100%' }, { translate: '0 96%' }])
    assert.equal(anim.options.duration, 1000)
    assert.equal(anim.options.fill, 'both')
  }
})

test('le reflet suit la traversée de l’écran : immobile avant 12 %, au bout de sa course après 88 %', () => {
  // Écran de 800 px, vitre de 200 px : sa traversée fait 1 000 px, de son entrée en bas à sa sortie en haut.
  const g = glass(800)
  const p = page({ glasses: [g] })
  p.near([g])
  const at = (top) => { g.top = top; p.scroll(); p.frame(); return time(g) }
  assert.equal(at(800), 0, 'entre en bas de l’écran')
  assert.equal(at(680), 0, '12 % de la traversée')
  assert.equal(at(490), 250, '31 %')
  assert.equal(at(300), 500, 'au milieu de l’écran')
  assert.equal(at(-80), 1000, '88 %')
  assert.equal(at(-200), 1000, 'sort en haut')
})

test('seules les vitres proches de l’écran sont mises à jour, une fois par image même si le défilement s’emballe', () => {
  const near = glass(300)
  const far = glass(3000)
  const p = page({ glasses: [near, far] })
  p.near([near], [far, false])
  p.frame()
  const farTime = time(far)
  near.top = 490
  far.top = 2000
  p.scroll(); p.scroll(); p.scroll()
  assert.equal(p.frame(), 1, 'une seule image demandée')
  assert.equal(time(near), 250)
  assert.equal(time(far), farTime, 'la vitre lointaine n’est pas lue')
  assert.ok((p.listeners.scroll || []).every((l) => l.options && l.options.passive), 'écoute passive')
})

test('animations réduites : le reflet ne bouge pas au défilement', () => {
  const g = glass(300)
  const p = page({ reducedMotion: true, glasses: [g] })
  p.near([g])
  p.frame()
  const still = time(g)
  g.top = -80
  p.scroll()
  p.frame()
  assert.equal(time(g), still)
})

test('les cartes qui arrivent (filtres, défilement infini) ont leur reflet ; celles qui partent le perdent', () => {
  const first = glass(300)
  const p = page({ glasses: [first] })
  const arrived = glass(490)
  p.add(arrived)
  assert.equal(arrived.anims.length, 1, 'animation créée à l’arrivée')
  assert.ok(p.observers.io[0].targets.has(arrived), 'surveillée')
  p.near([arrived])
  p.frame()
  assert.equal(time(arrived), 250)
  p.remove(first)
  assert.equal(first.anims[0].cancelled, true, 'animation retirée avec sa carte')
  assert.ok(!p.observers.io[0].targets.has(first))
  p.add(arrived)
  assert.equal(arrived.anims.length, 1, 'jamais deux animations pour une vitre')
})

test('arrivées par fetch avant le script : la page sans vitre au départ suit celles qui arrivent', () => {
  const p = page({ glasses: [] })
  assert.equal(p.observers.mo.length, 1)
  assert.deepEqual(plain(p.observers.mo[0].options), { childList: true, subtree: true })
  const g = glass(300)
  p.add(g)
  assert.equal(g.anims.length, 1)
})

test('la course du script est celle du CSS (input.css) : mêmes positions, même plage de la traversée', () => {
  const css = fs.readFileSync(path.join(ROOT, 'input.css'), 'utf8')
  const keyframes = /@keyframes oeuvre-card-glare { from { translate: ([^;]+); } to { translate: ([^;]+); } }/.exec(css)
  const range = /animation-range: cover (\d+)% cover (\d+)%/.exec(css)
  assert.ok(keyframes && range)
  const g = glass(0)
  const p = page({ glasses: [g] })
  assert.deepEqual(plain(g.anims[0].keyframes), [{ translate: keyframes[1] }, { translate: keyframes[2] }])
  // Aux bornes de la plage du CSS : 0, puis le bout de la course.
  p.near([g])
  const crossing = (fraction) => { g.top = 800 - fraction * 1000; p.scroll(); p.frame(); return time(g) }
  assert.equal(crossing(Number(range[1]) / 100), 0)
  assert.equal(crossing(Number(range[2]) / 100), 1000)
})
