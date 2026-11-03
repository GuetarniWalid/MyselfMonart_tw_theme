/*
 * Prototype : relie les options, le directeur de mise en scène et le moteur three.js.
 * Arrivée : la vraie image s'affiche d'abord ; three.js se charge ensuite, quand la page
 * est au repos, puis la 3D la remplace en fondu, sans rien décaler. Le prix et le résumé
 * changent au clic, sans attendre l'animation.
 */

import { createDirector } from './staging.js'
import { ROOM } from './room.js'
import { BORDERS, FRAMES, SIZES, priceOf } from './catalog.js'

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js'

const $ = (id) => document.getElementById(id)
const stageEl = $('stage'), canvas = $('gl'), poster = $('poster')
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

const product = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const director = createDirector({ room: ROOM, product: { ...product }, reducedMotion })

let engine = null
const size = { w: 1, h: 1 }
const aspect = () => size.w / size.h

/* ---------------- Options ---------------- */

const SWATCH = {
  border: { blanche: '#efede8', noire: '#272727', etiree: 'image', miroir: 'image', pliee: 'image' },
  frame: { sans: null, noir: '#1f1f21', chene: 'linear-gradient(135deg, #d8b98e, #b48c60)' },
}
const GROUPS = [
  { name: 'material', legend: 'Matière', options: [['toile', 'Toile'], ['poster', 'Poster']] },
  { name: 'size', legend: 'Taille', options: SIZES.map((s) => [s, `${s.replace('x', ' × ')} cm`]) },
  { name: 'border', legend: 'Bordure', only: 'toile', options: BORDERS.map((b) => [b.id, b.label]) },
  { name: 'frame', legend: 'Cadre', options: FRAMES.map((f) => [f.id, f.label]) },
  { name: 'passe', legend: 'Contour blanc', only: 'poster', options: [['sans', 'Sans'], ['avec', 'Avec']] },
]
const valueOf = (group) => (group === 'passe' ? (product.passe ? 'avec' : 'sans') : product[group])
let noirLabel = null

function swatch(group, value) {
  const look = SWATCH[group] && SWATCH[group][value]
  if (look === undefined) return null
  const dot = document.createElement('i')
  dot.className = 'swatch'
  dot.setAttribute('aria-hidden', 'true')
  if (look === null) dot.style.background = 'transparent'
  else if (look === 'image') dot.style.background = `center / 260% url(${poster.getAttribute('src')})`
  else dot.style.background = look
  return dot
}

function buildOptions() {
  const form = $('options')
  for (const g of GROUPS) {
    const fieldset = document.createElement('fieldset')
    if (g.only) fieldset.dataset.only = g.only
    const legend = document.createElement('legend')
    legend.textContent = g.legend
    const chips = document.createElement('div')
    chips.className = 'chips'
    for (const [value, label] of g.options) {
      const chip = document.createElement('label')
      chip.className = 'chip'
      const input = document.createElement('input')
      Object.assign(input, { type: 'radio', name: g.name, value, id: `opt-${g.name}-${value}` })
      input.checked = valueOf(g.name) === value
      const text = document.createElement('span')
      const dot = swatch(g.name, value)
      if (dot) text.append(dot)
      const words = document.createTextNode(label)
      text.append(words)
      if (g.name === 'frame' && value === 'noir') noirLabel = words
      chip.append(input, text)
      chips.append(chip)
    }
    fieldset.append(legend, chips)
    form.append(fieldset)
  }
  form.addEventListener('change', (event) => choose(event.target.name, event.target.value))
  form.addEventListener('submit', (event) => event.preventDefault())
}

function describe(p) {
  const dims = `${p.size.replace('x', ' × ')} cm`
  if (p.material === 'poster') {
    const frame = p.frame === 'sans' ? 'sans cadre' : `cadre ${p.frame === 'noir' ? 'noir' : 'chêne clair'}`
    return `Poster ${dims} · ${frame} · ${p.passe ? 'contour blanc' : 'sans contour'}`
  }
  const border = BORDERS.find((b) => b.id === p.border).label.toLowerCase()
  const frame = p.frame === 'sans' ? 'sans cadre' : `cadre ${FRAMES.find((f) => f.id === p.frame).label.toLowerCase()}`
  return `Toile ${dims} · bordure ${border} · ${frame}`
}

function updateTexts() {
  const text = describe(product)
  const price = euro.format(priceOf(product))
  $('summary').textContent = text
  $('price').textContent = price
  $('barPrice').textContent = price
  canvas.setAttribute('aria-label', `Bonsaï zen en 3D : ${text}`)
  for (const fieldset of document.querySelectorAll('fieldset[data-only]')) {
    fieldset.hidden = fieldset.dataset.only !== product.material
  }
  if (noirLabel) noirLabel.textContent = product.material === 'poster' ? 'Noir' : 'Noir mat'
}

function choose(group, value) {
  if (group === 'passe') product.passe = value === 'avec'
  else if (group in product) product[group] = value
  updateTexts()
  director.choose(group, { ...product }, performance.now())
  if (reducedMotion && engine) {
    canvas.classList.remove('fade-cut')
    void canvas.offsetWidth // relance le fondu
    canvas.classList.add('fade-cut')
  }
  requestRender()
}

/* ---------------- Rendu à la demande ---------------- */

let raf = 0
const run = { times: [] }

function requestRender() {
  if (!raf && engine) raf = requestAnimationFrame(frame)
}

function frame(now) {
  raf = 0
  const view = director.view(now, aspect())
  engine.render(view, product, now)
  placeDims(view)
  $('hint').classList.toggle('gone', hintGone || view.room > 0.5)
  run.times.push(now)
  if (engine.roomReady() && !roomReported) reportRoom()
  if (director.isMoving(now) || engine.roomFading(now) || drag) raf = requestAnimationFrame(frame)
  else reportFluidity()
}

const dimsEl = $('dims'), dimW = $('dimW'), dimH = $('dimH')
function placeDims(view) {
  const o = view.dims.opacity
  dimsEl.style.opacity = o.toFixed(3)
  if (o < 0.01) return
  const a = engine.toScreen(view.dims.width.a), b = engine.toScreen(view.dims.width.b)
  Object.assign(dimW.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${b.x - a.x}px` })
  dimW.firstChild.textContent = view.dims.width.text
  const bottom = engine.toScreen(view.dims.height.a), top = engine.toScreen(view.dims.height.b)
  Object.assign(dimH.style, { left: `${bottom.x}px`, top: `${top.y}px`, height: `${bottom.y - top.y}px` })
  dimH.firstChild.textContent = view.dims.height.text
}

/* ---------------- Inclinaison au doigt ---------------- */

let drag = null, hintGone = false
canvas.addEventListener('pointerdown', (event) => {
  if (!engine || (event.pointerType === 'mouse' && event.button !== 0)) return
  drag = { x: event.clientX, y: event.clientY, id: event.pointerId }
  director.grab(performance.now())
  try { canvas.setPointerCapture(event.pointerId) } catch { /* le doigt peut déjà être relâché */ }
  requestRender()
})
canvas.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return
  director.drag((event.clientX - drag.x) / size.w, (event.clientY - drag.y) / size.h, performance.now())
  hintGone = true
  requestRender()
})
const endDrag = (event) => {
  if (!drag || event.pointerId !== drag.id) return
  drag = null
  director.release(performance.now())
  requestRender()
}
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

$('frontBtn').addEventListener('click', () => choose('front'))
$('roomBtn').addEventListener('click', () => choose('size', product.size))

new ResizeObserver(([entry]) => {
  size.w = Math.max(1, Math.round(entry.contentRect.width))
  size.h = Math.max(1, Math.round(entry.contentRect.height))
  if (engine) {
    engine.resize(size.w, size.h)
    requestRender()
  }
}).observe(stageEl)

/* ---------------- Mesures ---------------- */

const setMeasure = (key, text) => { document.querySelector(`[data-m="${key}"]`).textContent = text }
const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`
const seconds = (ms) => `${decimal.format(ms / 1000)} s`

function transfer(url) {
  const entry = performance.getEntriesByName(new URL(url, location.href).href)[0]
  if (!entry) return null
  return entry.transferSize ? kb(entry.transferSize) : `${kb(entry.encodedBodySize || entry.decodedBodySize)} (cache)`
}

function gpuName() {
  try {
    const gl = engine.renderer.getContext()
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || 'GPU inconnu'
  } catch {
    return 'GPU inconnu'
  }
}

function reportLoad(times) {
  const three = performance.getEntriesByName(THREE_URL)[0]
  setMeasure('three', three
    ? `${three.transferSize ? kb(three.transferSize) : 'cache'} · r170 · ${Math.round(three.duration)} ms`
    : 'r170')
  setMeasure('art', `${transfer(poster.getAttribute('src')) || '?'} · ${poster.naturalWidth}×${poster.naturalHeight} px`)
  setMeasure('first', `${seconds(times.first)} après l'ouverture (photo ${seconds(times.photo)}, three.js ${seconds(times.module)})`)
  setMeasure('screen', `${size.w}×${size.h} px × ${Math.min(window.devicePixelRatio || 1, 2)} · ${gpuName()}`)
}

let roomReported = false
function reportRoom() {
  roomReported = true
  setMeasure('room', `${transfer(ROOM.image) || '?'}, chargée au premier recul`)
}

function reportFluidity() {
  const t = run.times
  run.times = []
  if (t.length < 20) return
  const deltas = t.slice(1).map((v, i) => v - t[i])
  const mean = deltas.reduce((s, v) => s + v, 0) / deltas.length
  const slow = deltas.filter((d) => d > 34).length
  const fps = Math.round(1000 / mean)
  setMeasure('fps', `${fps} images/s pendant la dernière animation · ${slow} image${slow > 1 ? 's' : ''} lente${slow > 1 ? 's' : ''} sur ${deltas.length}`)
  window.__lastRun = { fps, slow, frames: deltas.length, worst: Math.round(Math.max(...deltas)) }
}

function measureColors() {
  const now = performance.now()
  const view = director.view(now, aspect())
  if (director.isMoving(now) || drag || view.shot !== 'front' || product.material !== 'toile') {
    setTimeout(measureColors, 1000)
    return
  }
  const r = engine.measureFidelity(view, product)
  if (!r) return
  window.__fidelity = r
  setMeasure('color', `écart ΔE ${decimal.format(r.deltaE)} en moyenne, ${decimal.format(r.deltaE95)} au pire (95 %) ; invisible sous 2 · teinte ${decimal.format(r.hue)}°`)
}

/* ---------------- Démarrage et garde-fous ---------------- */

function showNotice(text, action, onAction) {
  const box = $('notice')
  box.textContent = text
  if (action) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'link-btn'
    button.textContent = action
    button.addEventListener('click', () => { box.hidden = true; onAction() })
    box.append(document.createElement('br'), button)
  }
  box.hidden = false
}

const marks = { photo: 0 }
const photoReady = new Promise((resolve) => {
  const done = () => { marks.photo = performance.now(); resolve() }
  if (poster.complete && poster.naturalWidth) done()
  else poster.addEventListener('load', done, { once: true })
})

async function start3D() {
  try {
    await photoReady
    // Décodage anticipé : un plus, jamais un blocage (une page en arrière-plan peut l'ajourner).
    await Promise.race([poster.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 300))])
    const [THREE, { createScene }] = await Promise.all([import(THREE_URL), import('./scene.js')])
    marks.module = performance.now()
    engine = createScene(THREE, { canvas, artImage: poster, room: ROOM })
  } catch (error) {
    console.error(error)
    showNotice("La 3D n'a pas pu démarrer sur cet appareil : la vraie fiche resterait sur les photos.")
    return
  }
  const rect = stageEl.getBoundingClientRect()
  size.w = Math.max(1, Math.round(rect.width))
  size.h = Math.max(1, Math.round(rect.height))
  engine.resize(size.w, size.h)
  engine.onNeedsRender = requestRender
  const now = performance.now()
  engine.render(director.view(now, aspect()), product, now)
  marks.first = performance.now()
  requestAnimationFrame(() => {
    canvas.classList.add('on')
    poster.classList.add('off')
  })
  canvas.addEventListener('webglcontextlost', () => {
    canvas.classList.remove('on')
    poster.classList.remove('off')
    showNotice('La 3D s’est arrêtée (mémoire du téléphone) : retour à la photo.')
  })
  reportLoad(marks)
  setTimeout(() => {
    measureColors()
    whenIdle(() => engine.warmUp())
  }, 900)
}

// Ne pas disputer le processeur à la photo : on attend la fin du chargement et un creux,
// avec une minuterie de secours (Safari n'a pas requestIdleCallback, d'autres le retardent).
function whenIdle(task) {
  let done = false
  const once = () => {
    if (done) return
    done = true
    task()
  }
  const go = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(once, { timeout: 1500 })
    setTimeout(once, 'requestIdleCallback' in window ? 2000 : 200)
  }
  if (document.readyState === 'complete') go()
  else window.addEventListener('load', go, { once: true })
}

buildOptions()
updateTexts()

const connection = navigator.connection
const slowNetwork = !!(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')))
if (slowNetwork) {
  showNotice('Économie de données ou réseau lent : la vraie fiche resterait sur cette photo.', 'Charger la 3D quand même', start3D)
} else {
  whenIdle(start3D)
  if (reducedMotion) {
    showNotice('Animations réduites sur cet appareil : la vraie fiche resterait sur les photos, ici la 3D change de plan sans mouvement.',
      'Voir les animations', () => { reducedMotion = false; director.setReducedMotion(false) })
  }
}

for (const id of ['buy', 'buyDesk']) {
  $(id).addEventListener('click', () => {
    const toast = $('toast')
    toast.textContent = "Prototype : le panier n'est pas branché ici."
    toast.hidden = false
    clearTimeout(toast.timer)
    toast.timer = setTimeout(() => { toast.hidden = true }, 2200)
  })
}

/* Accès pour les vérifications dans le navigateur : `render(at)` dessine une image complète
   (3D et cotes) pour un instant donné, même quand la page est en arrière-plan. */
window.__proto = {
  director,
  product,
  engine: () => engine,
  measureColors,
  render(at) {
    const view = director.view(at, aspect())
    engine.render(view, product, at)
    placeDims(view)
    return view
  },
}
