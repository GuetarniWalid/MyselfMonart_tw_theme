/*
 * Prototype : relie les options, le directeur de mise en scène et le moteur three.js.
 * Arrivée : la vraie image s'affiche d'abord ; three.js se charge ensuite, quand la page
 * est au repos, puis la 3D apparaît en fondu par-dessus la photo, sans rien décaler.
 * Le prix et le résumé changent au clic, sans attendre l'animation.
 */

import { createDirector } from './staging.js'
import { ROOM } from './room.js'
import { BORDERS, FRAMES, SIZES, describe, priceOf, sizeLabel } from './catalog.js'
import { densityForCost, renderDensity } from './quality.js'
import { decodeImage } from './images.js'
import { startReliefs } from './reliefs.js'

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js'
const WOOD_IMAGE = 'assets/chene-clair.jpg'
const DETAIL_IMAGE = 'assets/bonsai-source.jpg' // la source complète, pour les gros plans

const $ = (id) => document.getElementById(id)
const stageEl = $('stage'), canvas = $('gl'), poster = $('poster')
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

const product = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const director = createDirector({ room: ROOM, product: { ...product }, reducedMotion })

let engine = null
let live = false // moteur prêt à dessiner : programmes compilés
const stageSize = { w: 1, h: 1 }
const aspect = () => stageSize.w / stageSize.h

/* ---------------- Options ---------------- */

// onApproach : ce que l'option réclame part dès qu'on s'en approche, avant le clic.
const GROUPS = [
  { name: 'material', legend: 'Matière', options: [{ id: 'toile', label: 'Toile' }, { id: 'poster', label: 'Poster' }] },
  { name: 'size', legend: 'Taille', onApproach: prefetchRoom, options: SIZES.map((s) => ({ id: s, label: sizeLabel(s) })) },
  { name: 'border', legend: 'Bordure', only: 'toile', onApproach: loadDetail, options: BORDERS, swatch: true },
  { name: 'frame', legend: 'Cadre', onApproach: loadDetail, options: FRAMES, swatch: true },
  { name: 'passe', legend: 'Contour blanc', only: 'poster', onApproach: loadDetail, options: [{ id: 'sans', label: 'Sans' }, { id: 'avec', label: 'Avec' }] },
]
const valueOf = (group) => (group === 'passe' ? (product.passe ? 'avec' : 'sans') : product[group])
const frameWords = new Map() // libellés de cadre, qui changent entre toile et poster

function swatch(option) {
  const dot = document.createElement('i')
  dot.className = 'swatch'
  dot.setAttribute('aria-hidden', 'true')
  // Pas de couleur : bordure qui reprend l'image (pastille d'image) ou pas de cadre (vide).
  if (option.color) dot.style.background = option.color
  else if ('add' in option) dot.style.background = `center / 260% url(${poster.getAttribute('src')})`
  else dot.style.background = 'transparent'
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
    for (const option of g.options) {
      const chip = document.createElement('label')
      chip.className = 'chip'
      const input = document.createElement('input')
      Object.assign(input, { type: 'radio', name: g.name, value: option.id, id: `opt-${g.name}-${option.id}` })
      input.checked = valueOf(g.name) === option.id
      const text = document.createElement('span')
      if (g.swatch) text.append(swatch(option))
      const words = document.createTextNode(option.label)
      text.append(words)
      if (g.name === 'frame') frameWords.set(option, words)
      chip.append(input, text)
      chips.append(chip)
    }
    fieldset.append(legend, chips)
    form.append(fieldset)
    if (g.onApproach) {
      fieldset.addEventListener('pointerdown', g.onApproach, { once: true })
      fieldset.addEventListener('focusin', g.onApproach, { once: true })
    }
  }
  form.addEventListener('change', (event) => choose(event.target.name, event.target.value))
  form.addEventListener('submit', (event) => event.preventDefault())
}

// Demandes faites avant que le moteur soit prêt : rejouées à son arrivée.
const pendingTasks = []
const onceLive = (task) => (live ? task() : pendingTasks.push(task))
function prefetchRoom() {
  onceLive(() => engine.prefetchRoom())
}

/* Source complète de l'œuvre : chargée quand on s'approche d'un gros plan, jamais à
   l'arrivée. Son envoi au GPU attend que tout soit immobile, pour ne saccader aucun mouvement. */
let detailAsked = false, detailReady = null
function askDetail() {
  if (detailAsked || lightNetwork) return
  detailAsked = true
  decodeImage(DETAIL_IMAGE).then((image) => {
    detailReady = image
    swapDetail()
  }, () => {}) // pas de source complète : on garde la version de l'arrivée
}
function loadDetail() {
  onceLive(askDetail)
}
function swapDetail() {
  if (!detailReady || drag || director.isMoving(performance.now())) return
  const start = performance.now()
  engine.useArtImage(detailReady)
  detailReady = null
  reportDetail(performance.now() - start)
  requestRender()
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
  for (const [frame, words] of frameWords) {
    words.textContent = product.material === 'poster' ? frame.posterLabel : frame.label
  }
}

function choose(group, value) {
  if (group === 'passe') product.passe = value === 'avec'
  else if (group in product) product[group] = value
  updateTexts()
  director.choose(group, { ...product }, performance.now())
  run.active = true
  if (reducedMotion && engine) {
    // Animations réduites : simple fondu au changement de plan.
    canvas.classList.remove('fade-cut')
    void canvas.offsetWidth
    canvas.classList.add('fade-cut')
  }
  requestRender()
}

/* ---------------- Rendu à la demande ---------------- */

let raf = 0
const run = { active: false, times: [] } // un vrai parcours : un choix ou un glisser, pas un fondu

function requestRender() {
  if (!raf && live) raf = requestAnimationFrame(frame)
}

function draw(at) {
  const view = director.view(at, aspect())
  engine.render(view, at)
  placeDims(view)
  return view
}

function frame(now) {
  raf = 0
  const view = draw(now)
  $('hint').classList.toggle('gone', hintGone || view.room > 0.5)
  if (run.active) run.times.push(now)
  if (engine.roomReady() && !roomReported) reportRoom()
  if (director.isMoving(now) || engine.isFading(now) || drag) {
    raf = requestAnimationFrame(frame)
    return
  }
  if (run.active) reportFluidity()
  swapDetail()
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
  run.active = true
  try { canvas.setPointerCapture(event.pointerId) } catch { /* le doigt peut déjà être relâché */ }
  requestRender()
})
canvas.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return
  director.drag((event.clientX - drag.x) / stageSize.w, (event.clientY - drag.y) / stageSize.h, performance.now())
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
$('roomBtn').addEventListener('pointerdown', prefetchRoom, { once: true })
$('roomBtn').addEventListener('click', () => choose('size', product.size))

// Densité de rendu : celle de l'écran, sous le plafond fixé une fois pour toutes à l'arrivée.
let densityCap = Infinity
function fitStage() {
  const fit = renderDensity({ dpr: window.devicePixelRatio || 1, width: stageSize.w, height: stageSize.h })
  engine.resize(stageSize.w, stageSize.h, Math.min(densityCap, fit))
}

// Redimensionner efface le canvas : on redessine aussitôt, avant que l'écran ne se rafraîchisse.
new ResizeObserver(([entry]) => {
  stageSize.w = Math.max(1, Math.round(entry.contentRect.width))
  stageSize.h = Math.max(1, Math.round(entry.contentRect.height))
  if (engine) fitStage()
  if (live) draw(performance.now())
}).observe(stageEl)

/* ---------------- Mesures ---------------- */

const setMeasure = (key, text) => { document.querySelector(`[data-m="${key}"]`).textContent = text }
const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`
const seconds = (ms) => `${decimal.format(ms / 1000)} s`
const resources = () => performance.getEntriesByType('resource')
const bytesOf = (entry) => entry.transferSize || entry.encodedBodySize || 0

function transfer(url) {
  const entry = performance.getEntriesByName(new URL(url, location.href).href)[0]
  if (!entry) return null
  return entry.transferSize ? kb(entry.transferSize) : `${kb(entry.encodedBodySize || entry.decodedBodySize)} (cache)`
}

function reportLoad(times) {
  const three = performance.getEntriesByName(THREE_URL)[0]
  const own = resources().filter((e) => /\/src\/[a-z-]+\.js$/.test(e.name))
  const ownBytes = own.reduce((s, e) => s + bytesOf(e), 0)
  setMeasure('three', `${three && three.transferSize ? kb(three.transferSize) : 'cache'} (r170, ${three ? Math.round(three.duration) : '?'} ms) + prototype ${kb(ownBytes)}`)
  setMeasure('art', `${transfer(poster.getAttribute('src')) || '?'} · ${poster.naturalWidth}×${poster.naturalHeight} px`)
  setMeasure('first', `${seconds(times.first)} après l'ouverture (photo ${seconds(times.photo)}, three.js ${seconds(times.module)})`)
  reportScreen()
}

function reportScreen() {
  setMeasure('screen', `${stageSize.w}×${stageSize.h} px × ${decimal.format(engine.density())} · image ${decimal.format(marks.frameCost)} ms · anticrénelage ${engine.samples()}× · ${engine.gpuName()}`)
}

function reportDetail(uploadMs) {
  setMeasure('detail', `${transfer(DETAIL_IMAGE) || '?'} · envoi au GPU ${Math.round(uploadMs)} ms, à l'arrêt`)
}

let roomReported = false
function reportRoom() {
  roomReported = true
  setMeasure('room', `${transfer(ROOM.image) || '?'}, chargée à la première approche des tailles`)
}

const SLOW_FPS = 24 // en dessous, la vraie fiche resterait sur les photos

function reportFluidity() {
  const t = run.times
  run.times = []
  run.active = false
  if (t.length < 20) return
  const deltas = t.slice(1).map((v, i) => v - t[i])
  const mean = deltas.reduce((s, v) => s + v, 0) / deltas.length
  const slow = deltas.filter((d) => d > 34).length
  const fps = Math.round(1000 / mean)
  const verdict = fps < SLOW_FPS ? ' · trop lent : la vraie fiche resterait sur les photos' : ''
  setMeasure('fps', `${fps} images/s pendant la dernière animation · ${slow} image${slow > 1 ? 's' : ''} lente${slow > 1 ? 's' : ''} sur ${deltas.length}${verdict}`)
  window.__lastRun = { fps, slow, frames: deltas.length, worst: Math.round(Math.max(...deltas)) }
}

// Mesurée une fois, de face, sur une toile dont la façade montre toute l'image (la bordure
// pliée en montre le centre) ; on réessaie chaque seconde pendant deux minutes au plus.
function measureColors(attempt = 0) {
  const now = performance.now()
  const view = director.view(now, aspect())
  const fullFace = product.material === 'toile' && product.border !== 'pliee'
  if (director.isMoving(now) || drag || view.shot !== 'front' || !fullFace) {
    if (attempt < 120) setTimeout(() => measureColors(attempt + 1), 1000)
    else setMeasure('color', 'à mesurer de face, sur la toile (bordure non pliée)')
    return
  }
  const r = engine.measureFidelity(view)
  if (!r) return
  window.__fidelity = r
  setMeasure('color', `écart ΔE ${decimal.format(r.deltaE)} en moyenne, ${decimal.format(r.deltaE95)} au pire (95 %) ; invisible sous 2 · teinte ${decimal.format(r.hue)}°`)
}

/* ---------------- Démarrage et garde-fous ---------------- */

function showNotice(text, actions = []) {
  const box = $('notice')
  box.replaceChildren()
  box.hidden = false
  // Texte posé après l'affichage, pour que les lecteurs d'écran l'annoncent.
  setTimeout(() => {
    box.append(text)
    for (const [label, onAction] of actions) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'link-btn'
      button.textContent = label
      button.addEventListener('click', () => {
        box.hidden = true
        onAction()
      })
      box.append(document.createElement('br'), button)
    }
  }, 60)
}

const marks = { photo: 0 }
const photoReady = new Promise((resolve) => {
  const done = () => { marks.photo = performance.now(); resolve() }
  if (poster.complete && poster.naturalWidth) done()
  else poster.addEventListener('load', done, { once: true })
})

// Reliefs : calculés une seule fois, dès qu'on sait que la 3D va démarrer.
let reliefs = null
const askReliefs = () => (reliefs ||= startReliefs())

let contextLost = false
function backToPhoto() {
  contextLost = true
  live = false
  canvas.classList.remove('on')
  canvas.setAttribute('aria-hidden', 'true')
  poster.classList.remove('off')
  poster.removeAttribute('aria-hidden')
  showNotice('La 3D s’est arrêtée (mémoire du téléphone) : retour à la photo.')
}

let starting = false
async function start3D() {
  if (starting) return
  starting = true
  try {
    await photoReady
    const three = import(THREE_URL).then((module) => {
      marks.module = performance.now()
      return module
    })
    const [THREE, { createScene }, weave, artImage] = await Promise.all([
      three, import('./scene.js'), askReliefs().weave, decodeImage(poster),
    ])
    engine = createScene(THREE, { canvas, artImage, weave, room: ROOM, woodImage: WOOD_IMAGE })
    canvas.addEventListener('webglcontextlost', backToPhoto)
    const rect = stageEl.getBoundingClientRect()
    stageSize.w = Math.max(1, Math.round(rect.width))
    stageSize.h = Math.max(1, Math.round(rect.height))
    fitStage()
    engine.onNeedsRender = requestRender
    // La photo reste affichée pendant que tout se prépare. Le coût d'une image fixe la densité
    // ici, une seule fois : une fois la 3D visible, un changement de netteté se verrait.
    const at = performance.now()
    marks.frameCost = await engine.prepare(director.view(at, aspect()), at)
    densityCap = densityForCost(engine.density(), marks.frameCost)
    if (densityCap < engine.density()) fitStage()
  } catch (error) {
    console.error(error)
    showNotice("La 3D n'a pas pu démarrer sur cet appareil : la vraie fiche resterait sur les photos.")
    return
  }
  if (contextLost) return
  live = true
  draw(performance.now())
  marks.first = performance.now()
  requestRender() // un choix fait avant l'arrivée de la 3D continue sa transition
  pendingTasks.forEach((task) => task())
  askReliefs().paper.then((pixels) => engine.setPaperRelief(pixels))
  whenIdle(engine.loadWood)
  // Fondu : la 3D apparaît par-dessus la photo, qui reste opaque dessous jusqu'au bout.
  requestAnimationFrame(() => {
    canvas.removeAttribute('aria-hidden')
    canvas.classList.add('on')
    setTimeout(() => {
      poster.classList.add('off')
      poster.setAttribute('aria-hidden', 'true')
    }, 500)
  })
  reportLoad(marks)
  setTimeout(() => whenIdle(measureColors), 900)
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

function fillCredit() {
  const { title, author, url } = ROOM.credit
  const link = document.createElement('a')
  Object.assign(link, { href: url, target: '_blank', rel: 'noopener', textContent: 'Unsplash' })
  $('credit').replaceChildren(`Pièce provisoire : « ${title} », rendu de ${author} sur `, link,
    ' (licence Unsplash), en attendant les pièces du ticket 11.')
}

buildOptions()
updateTexts()
fillCredit()

/* Garde-fous de la vraie fiche (décision 5) : réseau lent ou économie de données, appareil
   modeste, animations réduites -> on reste sur la photo. Le prototype propose quand même
   de voir la 3D, pour que Walid puisse juger sur son téléphone. */
const connection = navigator.connection
const slowNetwork = !!(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')))
const lightNetwork = slowNetwork || !!(connection && /3g/.test(connection.effectiveType || '')) // pas de source complète
const weakDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
const showAnyway = ['Voir la 3D quand même', start3D]
if (slowNetwork) {
  showNotice('Économie de données ou réseau lent : la vraie fiche resterait sur cette photo.', [showAnyway])
} else if (weakDevice) {
  showNotice('Appareil modeste : la vraie fiche resterait sur cette photo.', [showAnyway])
} else if (reducedMotion) {
  showNotice('Animations réduites sur cet appareil : la vraie fiche resterait sur les photos.', [
    ['Voir la 3D sans animations', start3D],
    ['Voir la 3D avec animations', () => {
      reducedMotion = false
      director.setReducedMotion(false)
      start3D()
    }],
  ])
} else {
  askReliefs() // en parallèle de la photo et de three.js
  whenIdle(start3D)
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

// Accès pour les vérifications dans le navigateur : `render(at)` dessine une image complète
// (3D et cotes) pour un instant donné, même quand la page est en arrière-plan.
window.__proto = { director, product, engine: () => engine, measureColors, render: draw }
