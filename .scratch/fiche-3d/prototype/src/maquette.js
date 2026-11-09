/*
 * Maquette de la fiche toile 3D : le design des chips v2 de Walid (Claude Design, fichier
 * « Fiche chips v2 », 09/11/2026), appliqué à la vraie 3D. Il remplace les vignettes du 08/11, que
 * Walid a refusées : « Chips sans miniatures », l'œuvre en 3D est le seul aperçu.
 *
 * Les chips (src/chips.js et src/chips.css) sont un module à part, que la fiche du thème reprendra :
 * cette page leur fournit le catalogue du Bonsaï, la scène et la 3D. Le moteur (scene.js), la mise
 * en scène (staging.js) et leurs réglages sont ceux du prototype validé. La page ne fait que cadrer
 * (framing.js) : le tableau de face prend la largeur et la place que le design lui donne, la pièce
 * recule pour tenir entre les légendes (fitRoom), la 3D est décalée vers le haut comme l'œuvre du
 * design (lensShift) et, rangée ouverte, chaque mise en scène se cadre dans la zone visible
 * au-dessus de la rangée. Le reste de la fiche, sous l'œuvre, est factice.
 *
 * Arrivée : la photo d'abord, à la place exacte de l'œuvre de face, et les chips qui se posent ;
 * three.js se charge au repos et la 3D apparaît en fondu. Toucher une légende ouvre sa rangée et, dès
 * qu'elle est apparue, la 3D joue la mise en scène du groupe avec le choix en cours ; toucher un
 * choix l'applique (le prix change aussitôt) et la 3D joue sa mise en scène, rangée ouverte : on
 * enchaîne les choix (retours de Walid du 09/11). Un toucher en dehors, ou Échap, ferme la rangée et
 * ramène l'œuvre de face. Filets et points suivent l'œuvre que la 3D projette.
 */

import { createDirector, paintingCorners } from './staging.js'
import { ROOM } from './room.js'
import { BORDERS, FRAMES, SIZES, canFrame, describe, dimensionsOf, fitChoice, frameFits, hasFrame, priceOf } from './catalog.js'
import { densityForCost, renderDensity } from './quality.js'
import { decodeImage } from './images.js'
import { startReliefs } from './reliefs.js'
import { createChips, eur } from './chips.js'
import { canvasBox, framingAt } from './framing.js'

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js'
const WOOD_IMAGE = 'assets/chene-clair.jpg'
const DETAIL_IMAGE = 'assets/bonsai-source.jpg' // la source complète, pour les gros plans
const ART_RATIO = 0.75 // les quatre tailles du Bonsaï sont en 3:4

document.documentElement.lang = 'fr' // l'hébergeur des Artifacts fournit <html> sans langue

const $ = (id) => document.getElementById(id)
const stageEl = $('stage'), sceneEl = $('scene'), canvas = $('gl'), poster = $('poster')
// Prix du design : « 94 € », « 62,50 € » (eur, de chips.js).
const euro = { format: eur }
const decimal =new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

const product = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const director = createDirector({ room: ROOM, product: { ...product }, reducedMotion })

let engine = null
let live = false // moteur prêt à dessiner : programmes compilés
/* w, h : la scène visible ; top, glH : la 3D, qui déborde la scène (canvasBox) ; zone : largeur
   libre entre les légendes, pour la pièce ; L : la mise en page des chips. */
const stageSize = { w: 1, h: 1, top: 0, glH: 1, zone: 1, L: null }

/* Rangée ouverte, une mise en scène se cadre dans la zone visible au-dessus de la rangée : le poids
   w (framing.js) passe de 0 à 1 au rythme de la caméra, et revient à 0 avec elle quand la rangée se
   ferme. zoneShift : la remontée de la scène, figée tant que le poids n'est pas revenu à 0, pour
   que l'image glisse sans saut quand une note de la rangée apparaît ou disparaît. */
const zoneMove = { from: 0, to: 0, t0: 0, ms: 0 }
let zoneShift = 0
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // la courbe des étapes de staging.js
function zoneWeight(at) {
  const { from, to, t0, ms } = zoneMove
  if (!ms || at >= t0 + ms) return to
  return from + (to - from) * easeInOut(Math.max(0, (at - t0) / ms))
}
// Fin du mouvement que le directeur vient de prévoir : il est pur, on le sonde dans le temps.
function movingUntil(now) {
  if (!director.isMoving(now)) return now
  let lo = now, hi = now + 20000
  while (hi - lo > 2) {
    const mid = (lo + hi) / 2
    if (director.isMoving(mid)) lo = mid
    else hi = mid
  }
  return hi
}
function moveZone(to) {
  const now = performance.now()
  const from = zoneWeight(now)
  if (zoneMove.to === to && from === to) return
  // La remontée se relève au départ : la rangée vient peut-être de s'ouvrir, sans image depuis.
  if (from === 0 && chips.placement) zoneShift = chips.placement.shift
  Object.assign(zoneMove, { from, to, t0: now, ms: reducedMotion ? 0 : Math.max(0, movingUntil(now) - now) })
}
function framingNow(at) {
  const spot = chips.placement
  if (spot && zoneMove.to === 0 && zoneWeight(at) === 0) zoneShift = spot.shift
  return framingAt(stageSize.L, { w: zoneWeight(at), shift: zoneShift, glH: stageSize.glH })
}

/* ---------------- Le catalogue du Bonsaï, tel que les chips le lisent ---------------- */

// Les deux produits jumeaux (titres de la boutique) : la fiche passe de l'un à l'autre sans recharger.
const TITLES = {
  toile: { eyebrow: 'Tableau sur toile · Collection Zen', title: 'Tableau sur toile Bonsaï zen, sérénité végétale et équilibre apaisant' },
  poster: { eyebrow: 'Poster · Collection Zen', title: 'Poster Bonsaï zen, patience végétale et harmonie silencieuse' },
}
const FRAME_SHORT = { sans: 'Aucun', blanc: 'Blanc', noir: 'Noir', argent: 'Argent', chene: 'Chêne', noyer: 'Noyer' }
const sizeOf = (id) => {
  const { width, height } = dimensionsOf(id)
  return { w: width, h: height }
}
const spokenSize = (id) => `${id.replace('x', ' × ')} cm`

const catalog = {
  side: (p) => (p.material === 'toile' ? 'border' : 'passe'),
  options(group, p) {
    switch (group) {
      case 'material': return [{ id: 'toile', name: 'Toile', spoken: 'toile' }, { id: 'poster', name: 'Poster', spoken: 'poster' }]
      case 'size': return SIZES.map((id) => ({ id, name: id.replace('x', ' × '), spoken: spokenSize(id) }))
      case 'border': return BORDERS.map(({ id, label }) => ({ id, name: label, spoken: label.toLowerCase() }))
      case 'passe': return [{ id: 'sans', name: 'Aucun', spoken: 'sans contour' }, { id: 'avec', name: 'Blanc', spoken: 'contour blanc' }]
      default: return FRAMES.filter((f) => f.materials.includes(p.material)).map((f) => ({
        id: f.id,
        name: FRAME_SHORT[f.id],
        spoken: f.id === 'sans' ? 'sans cadre' : `cadre ${(p.material === 'poster' ? f.posterLabel : f.label).toLowerCase()}`,
      }))
    }
  },
  value: (group, p) => (group === 'passe' ? (p.passe ? 'avec' : 'sans') : p[group]),
  // Les règles de la boutique : pas de cadre en 90 × 120, pas d'argent ancien sur le poster.
  apply: (group, p, id) => fitChoice({ ...p, [group]: group === 'passe' ? id === 'avec' : id }),
  available: (group, p, id) => group !== 'frame' || frameFits(p, id),
  price: priceOf,
  base: (group) => (group === 'border' ? 'blanche' : 'sans'),
  size: sizeOf,
  framed: hasFrame,
  canFrame,
  unframedSize: () => SIZES.filter((id) => !canFrame(id)).map((id) => id.replace('x', ' × ')).join(', '),
}

const sameProduct = (a, b) => Object.keys(a).every((key) => a[key] === b[key])

const chips = createChips({
  stage: stageEl,
  scene: sceneEl,
  catalog,
  product,
  pill: $('buyPill'),
  ratio: ART_RATIO, // l'œuvre des vignettes de taille arrive avec la photo (setArtImage, plus bas)
  reducedMotion,
  onChoose: (group, id, next) => choose(group, next),
  onOpen: (group) => approach(group),
  onStage: (group) => stageOpened(group), // une rangée s'ouvre : sa mise en scène, choix en cours
  onDismiss: () => goFront(), // un toucher en dehors de la rangée, ou Échap : retour de face
})

// Seulement ce qui change : un texte réécrit à l'identique relance styles et mise en page.
const setText = (node, text) => { if (node.textContent !== text) node.textContent = text }

function refresh() {
  chips.update(product)
  const text = describe(product)
  const price = euro.format(priceOf(product))
  const { eyebrow, title } = TITLES[product.material]
  setText($('eyebrow'), eyebrow)
  setText($('title'), title)
  for (const facts of document.querySelectorAll('.facts')) {
    const hidden = facts.dataset.material !== product.material
    if (facts.hidden !== hidden) facts.hidden = hidden
  }
  setText($('summary'), text)
  setText($('price'), price)
  setText($('barPrice'), price)
  canvas.setAttribute('aria-label', `Bonsaï zen en 3D : ${text}`)
}

function announce() {
  const region = $('live')
  region.textContent = ''
  setTimeout(() => { region.textContent = `${describe(product)}, ${euro.format(priceOf(product))}` }, 60)
}

/* ---------------- Choisir ---------------- */

// Ce qu'un groupe réclame part dès qu'on l'approche : la source complète pour les gros plans.
function approach(group) {
  if (group === 'border' || group === 'frame' || group === 'passe' || group === 'material') loadDetail()
  if (group === 'size') prefetchRoom()
}
stageEl.addEventListener('pointerdown', (event) => {
  const target = event.target.closest('.chips-switch, .chips-legend, .chips-cote')
  if (target) approach(target.classList.contains('chips-switch') ? 'material' : target.dataset.group)
})

/* Le prix et les textes changent aussitôt ; la 3D joue ensuite sa mise en scène. Retoucher le
   choix en cours (dans sa rangée, ou « Toile » dans la bascule) rejoue sa mise en scène. Rangée
   ouverte, la mise en scène se cadre au-dessus de la rangée. */
function choose(group, next) {
  const started = performance.now()
  queueMicrotask(() => reportChoice(performance.now() - started))
  const replay = sameProduct(next, product)
  Object.assign(product, next)
  if (!replay) {
    refresh()
    announce()
  }
  // Avant la 3D, la rangée ouverte attend déjà sa mise en scène : elle partira avec ce choix.
  if (stageWaiting) return
  playStaging(group)
}

// La 3D joue la mise en scène d'un groupe, avec le produit en cours.
function playStaging(group) {
  director.choose(group, { ...product }, performance.now())
  if (chips.openGroup) moveZone(1)
  run.active = true
  if (reducedMotion && engine) {
    // Animations réduites : simple fondu au changement de plan.
    canvas.classList.remove('fade-cut')
    void canvas.offsetWidth
    canvas.classList.add('fade-cut')
  }
  requestRender()
}

/* Retour de Walid sur la version 15 (09/11) : ouvrir une rangée joue tout de suite la mise en scène
   de son groupe avec le choix en cours, comme si on venait de le choisir, et cadrée au-dessus de la
   rangée (Cadre avec « Aucun » : le coin, là où irait le cadre). Si la 3D n'a pas encore démarré
   (la photo de l'arrivée), le toucher la démarre et la mise en scène part dès qu'elle est prête, si
   la rangée est encore ouverte (start3D). Sans 3D d'office (garde-fous de la décision 5) ou après un
   échec : comme pour un choix.
   La caméra part quand la rangée est apparue (son fondu, chips.css) : le premier rendu de la rangée
   occupe la carte graphique pendant ses 200 premières ms, et la 3D qui partait en même temps perdait
   près d'une image sur deux (processeur ÷ 4). Une mise en scène démarre lentement : l'écart ne se
   voit pas. */
const RAIL_APPEARS_MS = 200
let autoStart = false // la 3D démarre d'elle-même, au repos
let stageWaiting = null // la rangée ouverte avant la 3D, qui attend sa mise en scène
let stagePending = null // la rangée qui apparaît, 3D prête : sa mise en scène part dans un instant
function stageOpened(group) {
  if (live) {
    stagePending = group
    setTimeout(() => {
      if (stagePending !== group) return // une autre rangée s'est ouverte entre-temps
      stagePending = null
      if (live && chips.openGroup === group) playStaging(group)
      else if (live) swapDetail() // refermée aussitôt : la source complète attendait
    }, RAIL_APPEARS_MS)
    return
  }
  if (!autoStart) {
    playStaging(group)
    return
  }
  stageWaiting = group
  start3D()
}

// Retour de face (bouton, toucher l'œuvre, rangée fermée) ; une mise en scène en cours s'y rend.
function goFront() {
  const now = performance.now()
  // Une rangée fermée avant la 3D n'attend plus rien ; le directeur prend les choix faits entre-temps.
  const waited = stageWaiting
  stageWaiting = null
  if (waited || director.isMoving(now) || director.view(now, framingNow(now).aspect).shot !== 'front') {
    director.choose('front', { ...product }, now)
    run.active = true
  }
  moveZone(0)
  requestRender()
}

/* ---------------- Retour de face ---------------- */

const frontBtn = $('frontBtn')
let frontShown = true
function setFront(visible) {
  if (visible === frontShown) return
  frontShown = visible
  // Le bouton disparaît sous le focus du clavier : le focus passe à la bascule.
  if (!visible && document.activeElement === frontBtn) chips.focusFirst()
  frontBtn.classList.toggle('show', visible)
  frontBtn.inert = !visible
}
setFront(false)
frontBtn.addEventListener('click', goFront)

/* ---------------- Source complète, pièce, bois ---------------- */

const pendingTasks = []
const onceLive = (task) => (live ? task() : pendingTasks.push(task))
function prefetchRoom() {
  onceLive(() => engine.prefetchRoom())
}

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
// La source complète se pose la 3D arrêtée, jamais juste avant une mise en scène (stagePending).
function swapDetail() {
  if (!detailReady || drag || stagePending || director.isMoving(performance.now())) return
  engine.useArtImage(detailReady)
  detailReady = null
  requestRender()
}

/* ---------------- Rendu à la demande ---------------- */

let raf = 0
const run = { active: false, times: [] } // un vrai parcours : un choix ou un glisser, pas un fondu

function requestRender() {
  if (!raf && live) raf = requestAnimationFrame(frame)
}

/* Dans la pièce, sur un écran haut et étroit, le 75 × 100 et le 90 × 120 passaient sous les
   légendes et la cote de hauteur sortait de l'écran. La caméra recule juste ce qu'il faut pour que
   le tableau et ses cotes tiennent dans la largeur de l'œuvre de face, et le cadrage remonte d'autant
   pour ne jamais descendre sous le sol de la photo. Le recul arrive avec la pièce (view.room) : la
   transition reste continue. Rien ne change ailleurs. h : la hauteur d'écran du cadrage en cours
   (la scène, ou la zone au-dessus de la rangée ouverte). */
const ROOM_DIMS = { cm: 6, px: 24 } // écart d'une cote au tableau, place de son étiquette
function fitRoom(view, h) {
  const k = view.room
  if (!(k > 0)) return view
  const { camera, painting } = view
  const tan = Math.tan(camera.fovY / 2)
  const offset = camera.position.map((c, i) => c - camera.target[i])
  const distance = Math.hypot(...offset)
  const room = stageSize.zone - 2 * ROOM_DIMS.px
  const need = ((painting.outer.width + 2 * ROOM_DIMS.cm) * h) / (2 * tan * room)
  if (need <= distance) return view
  const reach = distance + (need - distance) * k
  const half = reach * tan
  const target = [...camera.target]
  target[1] += Math.max(0, ROOM.view.bottom + half - target[1]) * k
  const sideways = half * (stageSize.w / h)
  target[0] += (Math.min(Math.max(target[0], ROOM.photo.left + sideways), ROOM.photo.right - sideways) - target[0]) * k
  const position = target.map((t, i) => t + (offset[i] * reach) / distance)
  return { ...view, camera: { ...camera, position, target } }
}

/* Le design place l'œuvre de face un peu au-dessus du milieu de la scène, pour centrer le bloc
   (bascule, œuvre, cote) au-dessus de la barre d'achat. La 3D garde l'image que la mise en scène
   calcule pour la scène visible (ou pour la zone au-dessus de la rangée), simplement déplacée : le
   canvas, plus haut que la scène, est centré sur elle et son angle de vue grandit d'autant
   (fovScale). C'est un décentrement d'objectif : à l'écran, rien d'autre ne bouge. */
function lensShift(view, fovScale) {
  if (fovScale === 1) return view
  const fovY = 2 * Math.atan(Math.tan(view.camera.fovY / 2) * fovScale)
  return { ...view, camera: { ...view.camera, fovY } }
}

// Le canvas et ses cotes glissent dans la scène vers la zone au-dessus de la rangée (au pixel de l'écran).
let canvasOffset = 0
function placeCanvas(offset) {
  const dpr = window.devicePixelRatio || 1
  const snapped = Math.round(offset * dpr) / dpr
  if (snapped === canvasOffset) return
  canvasOffset = snapped
  const transform = snapped ? `translateY(${snapped}px)` : ''
  canvas.style.transform = transform
  dimsEl.style.transform = transform
}

let lastView = null
function draw(at) {
  const f = framingNow(at)
  const view = lensShift(fitRoom(director.view(at, f.aspect), f.h), f.fovScale)
  placeCanvas(f.offset)
  engine.render(view, at)
  placeDims(view)
  trackChips(view)
  lastView = view
  return view
}

function frame(now) {
  raf = 0
  const view = draw(now)
  if (run.active) run.times.push(now)
  const moving = director.isMoving(now) || engine.isFading(now) || !!drag || zoneWeight(now) !== zoneMove.to
  chips.setMoving(moving)
  setFront(!moving && view.shot !== 'front')
  if (moving) {
    raf = requestAnimationFrame(frame)
    return
  }
  if (run.active) reportFluidity()
  swapDetail()
}

// Un point de la 3D, projeté dans la couche `scene` (canvas décalé compris).
function toScene(point) {
  const p = engine.toScreen(point)
  return { x: p.x, y: p.y + stageSize.top + canvasOffset }
}

// Les quatre coins de la façade du tableau (cadre compris), projetés dans la scène.
function trackChips(view) {
  const front = paintingCorners(view.painting, 'outer').filter((c) => c.side.z === 1)
  const at = (sx, sy) => toScene(front.find((c) => c.side.x === sx && c.side.y === sy))
  chips.track([at(-1, 1), at(1, 1), at(1, -1), at(-1, -1)])
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

/* ---------------- Inclinaison au doigt, et toucher pour revenir de face ---------------- */

let drag = null
canvas.addEventListener('pointerdown', (event) => {
  if (!engine || (event.pointerType === 'mouse' && event.button !== 0)) return
  drag = { x: event.clientX, y: event.clientY, id: event.pointerId, at: performance.now(), moved: 0 }
  director.grab(performance.now())
  run.active = true
  try { canvas.setPointerCapture(event.pointerId) } catch { /* le doigt peut déjà être relâché */ }
  requestRender()
})
canvas.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return
  drag.moved = Math.max(drag.moved, Math.hypot(event.clientX - drag.x, event.clientY - drag.y))
  director.drag((event.clientX - drag.x) / stageSize.w, (event.clientY - drag.y) / stageSize.h, performance.now())
  requestRender()
})
const endDrag = (event) => {
  if (!drag || event.pointerId !== drag.id) return
  const tap = event.type === 'pointerup' && drag.moved < 8 && performance.now() - drag.at < 400
  drag = null
  director.release(performance.now())
  if (tap && frontShown) goFront()
  requestRender()
}
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

/* ---------------- Cadrage : le tableau de face à la place que le design lui donne ---------------- */

/* Les chips calculent la place de l'œuvre (chipsLayout). Le directeur cadre pour un écran de forme
   `aspect` (framing.js) : celle qui met le tableau de face à la largeur voulue, la 3D gardant tout
   l'écran (le mur passe derrière les légendes). Le canvas est centré sur l'œuvre et couvre la scène
   dans tous les cadrages : œuvre remontée avec la rangée, zone au-dessus de la rangée (canvasBox). */
function measureStage() {
  const rect = stageEl.getBoundingClientRect()
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  const L = chips.resize({ width: w, height: h })
  const box = canvasBox(L)
  Object.assign(stageSize, { w, h, top: box.top, glH: box.height, zone: L.art.w, L })
  const set = (name, value) => sceneEl.style.setProperty(name, `${Math.round(value * 100) / 100}px`)
  set('--art-x', L.art.l)
  set('--art-y', L.art.t)
  set('--art-w', L.art.w)
  set('--art-h', L.art.h)
  set('--gl-top', box.top)
  set('--gl-h', box.height)
  stageEl.style.setProperty('--notice-top', `${L.toggle.top + (L.desk ? 56 : 52)}px`)
}

/* La 3D déborde la scène (canvasBox) : à densité égale, la carte graphique peindrait jusqu'à 30 % de
   pixels en plus, et un téléphone moyen perdait des images. Elle garde donc le nombre de pixels de la
   scène visible : la densité baisse un peu sur les écrans × 3 (2,6 au lieu de 3), jamais sous 2. */
let densityCap = Infinity
function fitStage() {
  const dpr = window.devicePixelRatio || 1
  const visible = renderDensity({ dpr, width: stageSize.w, height: stageSize.h })
  const fit = Math.max(Math.min(dpr, 2), visible * Math.sqrt(stageSize.h / stageSize.glH))
  engine.resize(stageSize.w, stageSize.glH, Math.min(densityCap, fit))
}

new ResizeObserver(() => {
  measureStage()
  if (engine) fitStage()
  if (live) draw(performance.now())
}).observe(stageEl)

/* ---------------- Mesures ---------------- */

const setMeasure = (key, text) => { document.querySelector(`[data-m="${key}"]`).textContent = text }
const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`
const seconds = (ms) => `${decimal.format(ms / 1000)} s`

function reportLoad(times) {
  const three = performance.getEntriesByName(THREE_URL)[0]
  setMeasure('three', `${three && three.transferSize ? kb(three.transferSize) : 'cache'} (r170, ${three ? Math.round(three.duration) : '?'} ms)`)
  setMeasure('first', `${seconds(times.first)} après l'ouverture (photo ${seconds(times.photo)}, three.js ${seconds(times.module)})`)
  setMeasure('screen', `${stageSize.w}×${stageSize.h} px (3D ${stageSize.w}×${stageSize.glH}) × ${decimal.format(engine.density())} · image ${decimal.format(marks.frameCost)} ms · ${engine.gpuName()}`)
}

const choices = { count: 0, worst: 0, last: 0 }
function reportChoice(ms) {
  choices.count += 1
  choices.last = ms
  choices.worst = Math.max(choices.worst, ms)
  window.__chooseMs = ms
  setMeasure('choice', `${decimal.format(ms)} ms pour le dernier choix, ${decimal.format(choices.worst)} ms au pire sur ${choices.count} (prix, légendes et rangées à jour, avant l'animation)`)
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
  window.__lastRun = {
    fps, slow, frames: deltas.length, worst: Math.round(Math.max(...deltas)),
    slowAt: deltas.map((d, i) => (d > 34 ? i : -1)).filter((i) => i >= 0),
  }
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
const photoReady = new Promise((resolve, reject) => {
  const done = () => { marks.photo = performance.now(); resolve() }
  if (poster.complete && poster.naturalWidth) done()
  else {
    poster.addEventListener('load', done, { once: true })
    poster.addEventListener('error', reject, { once: true })
  }
})
photoReady.catch(() => {}) // l'échec se traite au démarrage de la 3D, qui peut ne jamais venir

/* Vignettes de taille : l'œuvre y fait 30 px de haut au plus. Une copie de 90 × 120 px (écran × 3)
   leur suffit ; peindre l'image de 1536 px à chaque fois coûtait des images à la 3D. */
photoReady.then(() => {
  const small = document.createElement('canvas')
  small.width = 90
  small.height = Math.round((90 * poster.naturalHeight) / poster.naturalWidth)
  small.getContext('2d').drawImage(poster, 0, 0, small.width, small.height)
  chips.setArtImage(small.toDataURL('image/jpeg', 0.86))
}, () => {})

let reliefs = null
const askReliefs = () => (reliefs ||= startReliefs())

let contextLost = false
function backToPhoto() {
  contextLost = true
  live = false
  autoStart = false
  canvas.classList.remove('on')
  canvas.setAttribute('aria-hidden', 'true')
  poster.classList.remove('off')
  poster.removeAttribute('aria-hidden')
  chips.track(null)
  setFront(false)
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
    measureStage()
    fitStage()
    engine.onNeedsRender = requestRender
    const at = performance.now()
    const f = framingNow(at)
    marks.frameCost = await engine.prepare(lensShift(director.view(at, f.aspect), f.fovScale), at)
    densityCap = densityForCost(engine.density(), marks.frameCost)
    if (densityCap < engine.density()) fitStage()
  } catch (error) {
    console.error(error)
    autoStart = false
    stageWaiting = null
    showNotice("La 3D n'a pas pu démarrer sur cet appareil : la vraie fiche resterait sur les photos.")
    return
  }
  if (contextLost) return
  live = true
  // Une rangée ouverte avant la 3D : sa mise en scène part maintenant, de face, si elle l'est encore.
  const waited = stageWaiting
  stageWaiting = null
  if (waited && chips.openGroup === waited) playStaging(waited)
  else if (waited) director.choose('front', { ...product }, performance.now()) // les choix faits entre-temps
  draw(performance.now())
  marks.first = performance.now()
  requestRender() // un choix fait avant l'arrivée de la 3D continue sa transition
  pendingTasks.forEach((task) => task())
  askReliefs().paper.then((pixels) => engine.setPaperRelief(pixels))
  // Les cadres et la pièce en ont besoin : le bois (40 Ko) et la photo de la pièce (211 Ko).
  engine.loadWood()
  whenIdle(() => engine.prefetchRoom())
  requestAnimationFrame(() => {
    canvas.removeAttribute('aria-hidden')
    canvas.classList.add('on')
    setTimeout(() => {
      if (contextLost) return
      poster.classList.add('off')
      poster.setAttribute('aria-hidden', 'true')
    }, 500)
  })
  reportLoad(marks)
}

// Ne pas disputer le processeur à la photo : on attend la fin du chargement et un creux.
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

measureStage()
refresh()
fillCredit()

/* Garde-fous de la vraie fiche (décision 5) : réseau lent ou économie de données, appareil
   modeste, animations réduites -> on reste sur la photo ; les chips marchent, le prix aussi. La
   maquette propose quand même de voir la 3D, pour que Walid puisse juger sur son téléphone. */
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
  autoStart = true // au repos, ou dès qu'une rangée s'ouvre (stageOpened)
  askReliefs() // en parallèle de la photo et de three.js
  whenIdle(start3D)
}

$('buy').addEventListener('click', () => {
  const toast = $('toast')
  toast.textContent = ''
  toast.hidden = false
  // Texte posé après l'affichage, pour que les lecteurs d'écran l'annoncent.
  setTimeout(() => { toast.textContent = "Maquette : le panier n'est pas branché ici." }, 60)
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => { toast.hidden = true }, 2200)
})

/* Accès pour les vérifications : `render(at)` dessine une image complète pour un instant donné. */
window.__proto = {
  director, product, chips, catalog, engine: () => engine, render: draw, stageSize,
  openGroup: () => chips.openGroup,
  layout: () => chips.layout,
  framing: () => framingNow(performance.now()),
  // Les coins de la dernière image (œuvre ou boîte cadre comprise), en px de la scène visible.
  corners: (which = 'outer') => {
    const shift = chips.placement ? chips.placement.shift : 0
    return lastView ? paintingCorners(lastView.painting, which).map((c) => ({ ...toScene(c), y: toScene(c).y - shift, side: c.side })) : []
  },
  shot: () => (lastView ? lastView.shot : null),
}
