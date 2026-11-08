/*
 * Maquette du 08/11/2026 : la fiche toile en plein écran, les options en vignettes de part et
 * d'autre de l'œuvre. Demande de Walid après l'essai de la fiche 3D en ligne sur son téléphone :
 * tout dans l'image, des vignettes qui montrent exactement ce qu'elles changent.
 *
 * Question posée : cette mise en page se comprend-elle dès la première seconde, au doigt ?
 * Une seule variante, puisque Walid l'a décrite. Le moteur (scene.js), la mise en scène
 * (staging.js) et leurs réglages sont ceux du prototype validé : seules changent la mise en page
 * et la façon de choisir. Le reste de la fiche, sous l'œuvre, est factice.
 *
 * Arrivée : la photo d'abord, des croquis dans les vignettes ; three.js se charge au repos et la
 * 3D apparaît en fondu ; puis le moteur rend les vignettes, par petits lots, toujours à l'arrêt.
 * Toucher une vignette ouvre à côté d'elle une rangée d'aperçus ; toucher un aperçu applique le
 * choix (le prix change aussitôt), la 3D joue sa mise en scène et la rangée se referme.
 */

import { createDirector } from './staging.js'
import { ROOM } from './room.js'
import { BORDERS, FRAMES, SIZES, borderOf, canFrame, describe, fitChoice, priceOf } from './catalog.js'
import { densityForCost, renderDensity } from './quality.js'
import { decodeImage } from './images.js'
import { startReliefs } from './reliefs.js'
import { drawSketch, needsRoom, thumbView } from './thumbs.js'

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js'
const WOOD_IMAGE = 'assets/chene-clair.jpg'
const DETAIL_IMAGE = 'assets/bonsai-source.jpg' // la source complète, pour les gros plans
const FRONT_FILL = 0.72 // part de la scène que le tableau occupe de face (FRONT_FILL de staging.js)
const ART_RATIO = 0.75 // les quatre tailles du Bonsaï sont en 3:4
const HINT_MS = 6000

document.documentElement.lang = 'fr' // l'hébergeur des Artifacts fournit <html> sans langue

const $ = (id) => document.getElementById(id)
const stageEl = $('stage'), canvas = $('gl'), poster = $('poster'), paintBox = $('paintBox')
// Prix formatés une fois chacun : au toucher, les rangées en réécrivent une vingtaine.
const memo = (format) => {
  const known = new Map()
  return { format: (value) => known.get(value) ?? known.set(value, format.format(value)).get(value) }
}
const euro = memo(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }))
const euroRound = memo(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }))
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

const product = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const director = createDirector({ room: ROOM, product: { ...product }, reducedMotion })

let engine = null
let live = false // moteur prêt à dessiner : programmes compilés
let noThreeD = false // la 3D ne viendra pas : les vignettes restent des croquis
const stageSize = { w: 1, h: 1, framing: 1, zone: 1 }
const aspect = () => stageSize.framing

/* ---------------- Options ---------------- */

const GROUPS_OF = { toile: ['material', 'border', 'size', 'frame'], poster: ['material', 'passe', 'size', 'frame'] }
// Les deux produits jumeaux (titres de la boutique) : la fiche passe de l'un à l'autre sans recharger.
const TITLES = {
  toile: { eyebrow: 'Tableau sur toile · Collection Zen', title: 'Tableau sur toile Bonsaï zen, sérénité végétale et équilibre apaisant' },
  poster: { eyebrow: 'Poster · Collection Zen', title: 'Poster Bonsaï zen, patience végétale et harmonie silencieuse' },
}
const GROUP_NAME = { material: 'Toile ou poster', size: 'Taille', border: 'Bordure', frame: 'Cadre', passe: 'Contour blanc' }
const FRAME_SHORT = { sans: 'Aucun', blanc: 'Blanc', noir: 'Noir', argent: 'Argent', chene: 'Chêne', noyer: 'Noyer' }
const sizeText = (size) => size.replace('x', ' × ')

const valueOf = (group, p = product) => (group === 'passe' ? (p.passe ? 'avec' : 'sans') : p[group])
const withChoice = (p, group, value) => fitChoice({ ...p, [group]: group === 'passe' ? value === 'avec' : value })
const sameProduct = (a, b) => Object.keys(a).every((key) => a[key] === b[key])

// Les choix d'un groupe, pour le produit en cours. long : ce que lit un lecteur d'écran.
function optionsOf(group) {
  switch (group) {
    case 'material': return [{ id: 'toile', label: 'Toile' }, { id: 'poster', label: 'Poster' }]
    case 'size': return SIZES.map((id) => ({ id, label: sizeText(id), long: `${sizeText(id)} cm` }))
    case 'border': return BORDERS.map(({ id, label }) => ({ id, label, long: `Bordure ${label.toLowerCase()}` }))
    case 'passe': return [{ id: 'sans', label: 'Aucun', long: 'Sans contour' }, { id: 'avec', label: 'Blanc', long: 'Contour blanc' }]
    default: return FRAMES.filter((f) => f.materials.includes(product.material)).map((f) => ({
      id: f.id,
      label: FRAME_SHORT[f.id],
      long: f.id === 'sans' ? 'Sans cadre' : `Cadre ${(product.material === 'poster' ? f.posterLabel : f.label).toLowerCase()}`,
    }))
  }
}

// Ce que dit une vignette au repos : son groupe et le choix en cours (la matière dit l'autre choix).
function chipWords(group) {
  switch (group) {
    case 'material': return product.material === 'toile' ? ['Toile', 'ou poster'] : ['Poster', 'ou toile']
    case 'size': return ['Taille', sizeText(product.size)]
    case 'border': return ['Bordure', borderOf(product.border).label.toLowerCase()]
    case 'passe': return ['Contour', product.passe ? 'blanc' : 'aucun']
    default: return ['Cadre', FRAME_SHORT[product.frame].toLowerCase()]
  }
}

function chipLabel(group) {
  const option = optionsOf(group).find((o) => o.id === valueOf(group))
  const value = group === 'material' ? option.label : (option.long || option.label).toLowerCase()
  return `${GROUP_NAME[group]} : ${value}. Voir les choix`
}

const isAvailable = (group, id) => group !== 'frame' || id === 'sans' || canFrame(product.size)

const optEl = (group) => document.querySelector(`.opt[data-group="${group}"]`)
const chipEl = (group) => $(`chip-${group}`)
const rowEl = (group) => $(`row-${group}`)

/* ---------------- Vignettes : croquis, puis rendu du moteur ---------------- */

const thumbCss = () => parseFloat(getComputedStyle(stageEl).getPropertyValue('--thumb')) || 46
let thumbSize = thumbCss()
const cache = new Map() // clé -> ImageData
const queue = new Map() // clé -> { group, product, priority }
const slots = new Set()
const slotByElement = new WeakMap()
const thumbStats = { count: 0, total: 0, batches: 0, worstBatch: 0, wait: 0, log: [] }

const keyOf = (group, p) => `${group}|${p.material}|${p.size}|${p.border}|${p.frame}|${p.passe ? 1 : 0}|${thumbSize}`

// Une case à vignette : deux canvas superposés, pour passer de l'un à l'autre en fondu.
function slotOf(el) {
  if (!slotByElement.has(el)) {
    const [a, b] = el.querySelectorAll('canvas')
    const slot = { el, a, b, front: null, key: null, group: null, product: null, priority: 0, rendered: false }
    slotByElement.set(el, slot)
    slots.add(slot)
  }
  return slotByElement.get(el)
}

function show(slot, paint) {
  const back = slot.front === slot.a ? slot.b : slot.a
  paint(back)
  back.classList.add('on')
  if (slot.front) slot.front.classList.remove('on')
  slot.front = back
}

// Un canvas ne change de taille que s'il le faut : chaque changement réalloue son image.
function sized(target, side) {
  if (target.width !== side) target.width = side
  if (target.height !== side) target.height = side
  return target.getContext('2d')
}

function showImage(slot, image) {
  show(slot, (target) => sized(target, image.width).putImageData(image, 0, 0))
  slot.rendered = true
  slot.sketched = false
}

// L'œuvre réduite une fois pour les croquis.
let sketchArt = null
function sketchSlot(slot) {
  if (!sketchArt) return
  const side = Math.round(thumbSize * Math.min(3, window.devicePixelRatio || 1))
  show(slot, (target) => drawSketch(sized(target, side), side, slot.group, slot.product, sketchArt))
  slot.sketched = true
}

function enqueue(key, group, p, priority) {
  const job = queue.get(key)
  if (!job || job.priority < priority) queue.set(key, { key, group, product: { ...p }, priority })
  scheduleThumbs()
}

/* Relie une case à une vignette. Sans vignette du moteur en cache, une case qu'on voit prend le
   croquis ; une vignette au repos garde la vignette du moteur qu'elle montrait déjà (un détail a
   changé, l'image juste arrive après l'animation) ; une rangée fermée attend. */
function bind(el, group, p, priority, visible) {
  const slot = slotOf(el)
  const key = keyOf(group, p)
  slot.priority = priority
  if (slot.key !== key) {
    Object.assign(slot, { key, group, product: { ...p }, sketched: false })
    const image = cache.get(key)
    if (image) {
      showImage(slot, image)
      return
    }
  } else if (cache.has(key)) {
    return
  }
  if (!noThreeD) enqueue(key, group, p, priority)
  if (!slot.sketched && visible && (noThreeD || !slot.rendered)) sketchSlot(slot)
}

/* Une case de la bande lue par le moteur : les lignes sont de bas en haut. Le mur couvre toute la
   scène, la case est donc opaque ; sinon, on la rend opaque. */
function tileImage({ strip, side, count }, index) {
  const image = new ImageData(side, side)
  const row = side * 4
  const stride = side * count * 4
  for (let y = 0; y < side; y++) {
    const from = (side - 1 - y) * stride + index * row
    image.data.set(strip.subarray(from, from + row), y * row)
  }
  if (image.data[3] !== 255) for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255
  return image
}

let thumbTimer = 0, thumbBusy = false
function scheduleThumbs(delay = 0) {
  if (thumbTimer || thumbBusy || !live || !queue.size) return
  thumbTimer = setTimeout(() => {
    const go = () => { thumbTimer = 0; runThumbs() }
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 400 })
    else go()
  }, delay)
}

/* Un lot de vignettes, seulement à l'arrêt : aucune animation, aucun doigt posé, aucun fondu. Le
   moteur les dessine en cases, puis la vue principale est redessinée dans la même tâche : l'écran
   ne voit jamais une case. Les pixels reviennent plus tard, sans que la page attende. La taille du
   lot suit le coût mesuré, pour qu'un lot n'occupe pas la page plus de BATCH_MS, même sur un
   téléphone lent : un toucher n'attend jamais longtemps. */
const BATCH_MS = 12
let perThumbMs = 2 // estimation, corrigée à chaque lot
function runThumbs() {
  if (!live || !queue.size || thumbBusy) return
  const now = performance.now()
  if (raf || drag || director.isMoving(now) || engine.isFading(now)) return // la fin du mouvement relance
  const jobs = []
  let waiting = 0
  const room = Math.max(1, Math.min(6, engine.maxThumbs(thumbSize), Math.floor(BATCH_MS / perThumbMs)))
  for (const job of [...queue.values()].sort((a, b) => b.priority - a.priority)) {
    if (jobs.length >= room) break
    if (cache.has(job.key)) queue.delete(job.key)
    else if (engine.stillsReady(now, { room: needsRoom(job.group) })) jobs.push(job)
    else waiting += 1
  }
  if (!jobs.length) {
    // Ce qui attend le bois, le papier ou la pièce : on repasse un peu plus tard.
    if (queue.size) scheduleThumbs(waiting ? 300 : 0)
    return
  }
  const start = performance.now()
  const pending = engine.renderThumbs(jobs.map((job) => thumbView(ROOM, job.group, job.product)), now, thumbSize)
  draw(performance.now())
  const busy = performance.now() - start
  for (const job of jobs) queue.delete(job.key)
  thumbBusy = true
  // Les pixels reviennent plus tard : si une animation a commencé entre-temps, on attend sa fin.
  pending.then((shot) => whenStill(() => {
    const t0 = performance.now()
    jobs.slice(0, shot.count).forEach((job, i) => {
      const image = tileImage(shot, i)
      cache.set(job.key, image)
      for (const slot of slots) if (slot.key === job.key) showImage(slot, image)
    })
    for (const job of jobs.slice(shot.count)) queue.set(job.key, job)
    const total = busy + performance.now() - t0
    perThumbMs = perThumbMs * 0.5 + (total / shot.count) * 0.5
    thumbStats.log = [...thumbStats.log.slice(-39), { busy: Math.round(busy * 10) / 10, apply: Math.round((performance.now() - t0) * 10) / 10, jobs: jobs.map((job) => `${job.group}:${job.product.material}/${job.product.size}/${job.product.frame}`).join(' ') }]
    thumbStats.count += shot.count
    thumbStats.total += total
    thumbStats.batches += 1
    thumbStats.worstBatch = Math.max(thumbStats.worstBatch, total)
    thumbStats.wait = Math.max(thumbStats.wait, shot.waitMs)
    reportThumbs()
    thumbBusy = false
    scheduleThumbs()
  }), () => {
    // Lecture refusée (le moteur passe alors à la lecture immédiate) ou contexte perdu : on reprend.
    for (const job of jobs) if (!cache.has(job.key)) queue.set(job.key, job)
    thumbBusy = false
    scheduleThumbs(300)
  })
}

// Ce qui touche à beaucoup de pixels attend que rien ne bouge.
const stillTasks = []
function whenStill(task) {
  if (!raf && !drag && !director.isMoving(performance.now())) task()
  else stillTasks.push(task)
}
function runStillTasks() {
  while (stillTasks.length) stillTasks.shift()()
}

/* Priorités : la rangée ouverte, puis les vignettes au repos, puis les autres rangées. */
const PRIORITY = { open: 3, chip: 2, row: 1 }

function bindAll() {
  for (const group of GROUPS_OF[product.material]) {
    bind(chipEl(group).querySelector('.thumb'), group, product, PRIORITY.chip, true)
    const open = group === openGroup
    for (const item of rowEl(group).querySelectorAll('.pick')) {
      bind(item.querySelector('.thumb'), group, withChoice(product, group, item.dataset.value), open ? PRIORITY.open : PRIORITY.row, open)
    }
  }
}

/* ---------------- Vignettes et rangées : construction et mise à jour ---------------- */

function thumbElement() {
  const thumb = document.createElement('span')
  thumb.className = 'thumb'
  thumb.setAttribute('aria-hidden', 'true')
  thumb.append(document.createElement('canvas'), document.createElement('canvas'))
  return thumb
}

function buildRow(group) {
  const row = rowEl(group)
  for (const thumb of row.querySelectorAll('.thumb')) slots.delete(slotByElement.get(thumb))
  row.replaceChildren()
  const items = document.createElement('div')
  items.className = 'row-items'
  for (const option of optionsOf(group)) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'pick'
    item.dataset.value = option.id
    item.dataset.long = option.long || option.label
    const name = document.createElement('span')
    name.className = 'pick-name'
    name.textContent = option.label
    const price = document.createElement('span')
    price.className = 'pick-price'
    item.append(thumbElement(), name, price)
    items.append(item)
  }
  const note = document.createElement('p')
  note.className = 'row-note'
  note.id = `note-${group}`
  note.hidden = true
  row.append(items, note)
}

function signedPrice(delta) {
  const format = Number.isInteger(delta) ? euroRound : euro
  return `${delta > 0 ? '+' : '−'}${format.format(Math.abs(delta))}`
}

function updateRow(group) {
  const current = valueOf(group)
  const price = priceOf(product)
  let unavailable = false
  for (const item of rowEl(group).querySelectorAll('.pick')) {
    const value = item.dataset.value
    const chosen = value === current
    const available = isAvailable(group, value)
    const next = withChoice(product, group, value)
    const delta = Math.round((priceOf(next) - price) * 100) / 100
    item.setAttribute('aria-pressed', String(chosen))
    item.setAttribute('aria-disabled', String(!available))
    item.querySelector('.pick-price').textContent = !available ? '' : chosen || !delta ? '' : signedPrice(delta)
    item.setAttribute('aria-label', available ? `${item.dataset.long}, ${euro.format(priceOf(next))}` : `${item.dataset.long}, indisponible pour cette taille`)
    if (!available) unavailable = true
  }
  const note = $(`note-${group}`)
  note.hidden = !unavailable
  note.textContent = unavailable ? 'Aucun cadre disponible pour cette taille' : ''
}

function updateChip(group) {
  const chip = chipEl(group)
  const [name, value] = chipWords(group)
  chip.querySelector('.chip-name').textContent = name
  chip.querySelector('.chip-value').textContent = value
  chip.setAttribute('aria-label', chipLabel(group))
}

let builtFor = null
function refresh() {
  if (builtFor !== product.material) {
    // Toile ou poster : tout change. Les vignettes au repos repartent du croquis plutôt que de
    // montrer l'autre produit le temps de l'animation.
    if (builtFor) for (const slot of slots) slot.rendered = false
    // Seuls les cadres changent de liste (le poster n'a pas l'argent ancien) ; les autres rangées
    // se construisent une fois.
    for (const group of builtFor ? ['frame'] : ['material', 'size', 'border', 'frame', 'passe']) buildRow(group)
    builtFor = product.material
    optEl('border').hidden = product.material !== 'toile'
    optEl('passe').hidden = product.material !== 'poster'
  }
  for (const group of GROUPS_OF[product.material]) {
    updateChip(group)
    updateRow(group)
  }
  const text = describe(product)
  const price = euro.format(priceOf(product))
  const { eyebrow, title } = TITLES[product.material]
  $('eyebrow').textContent = eyebrow
  $('title').textContent = title
  for (const facts of document.querySelectorAll('.facts')) facts.hidden = facts.dataset.material !== product.material
  $('summary').textContent = text
  $('price').textContent = price
  $('barPrice').textContent = price
  canvas.setAttribute('aria-label', `Bonsaï zen en 3D : ${text}`)
  bindAll()
}

function announce() {
  const region = $('live')
  region.textContent = ''
  setTimeout(() => { region.textContent = `${describe(product)}, ${euro.format(priceOf(product))}` }, 60)
}

/* ---------------- Ouvrir, choisir, refermer ---------------- */

let openGroup = null
let closing = 0

// La rangée tient à côté de sa vignette : les aperçus rétrécissent un peu s'il le faut.
function fitRow(group) {
  const row = rowEl(group)
  const stage = stageEl.getBoundingClientRect()
  const chip = chipEl(group).getBoundingClientRect()
  const edge = parseFloat(getComputedStyle(stageEl).getPropertyValue('--edge')) || 12
  const left = !!chipEl(group).closest('.rail-left')
  const room = left ? stage.right - chip.right - 8 - edge : chip.left - stage.left - 8 - edge
  const count = row.querySelectorAll('.pick').length
  const style = getComputedStyle(row)
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2
  const gap = parseFloat(getComputedStyle(row.querySelector('.row-items')).columnGap) || 5
  const margins = 6 // marge de l'anneau du choix, de part et d'autre
  const fit = Math.floor((room - padding - gap * (count - 1)) / count) - margins
  row.style.setProperty('--pv', `${Math.max(34, Math.min(thumbSize, fit))}px`)
  row.style.maxWidth = `${Math.max(120, room)}px`
}

function openRow(group, { focus = false } = {}) {
  if (openGroup === group) {
    closeRow()
    return
  }
  closeRow()
  openGroup = group
  closing += 1
  const row = rowEl(group)
  fitRow(group)
  row.hidden = false
  chipEl(group).setAttribute('aria-expanded', 'true')
  chipEl(group).closest('.rail').classList.add('raised') // la rangée passe au-dessus de l'autre colonne
  void row.offsetWidth // la rangée part de son état fermé : le fondu se voit
  row.classList.add('open')
  approach(group)
  dismissHint()
  bindAll() // la rangée ouverte passe devant
  if (focus) {
    const target = row.querySelector('.pick[aria-pressed="true"]') || row.querySelector('.pick:not([aria-disabled="true"])')
    if (target) target.focus()
  }
}

function closeRow({ focusChip = false } = {}) {
  if (!openGroup) return
  const group = openGroup
  const row = rowEl(group)
  openGroup = null
  const token = (closing += 1)
  row.classList.remove('open')
  chipEl(group).setAttribute('aria-expanded', 'false')
  setTimeout(() => {
    if (token !== closing) return
    row.hidden = true
    chipEl(group).closest('.rail').classList.remove('raised')
  }, 200)
  if (focusChip) chipEl(group).focus()
}

// Ce qu'un groupe réclame part dès qu'on l'ouvre : la source complète pour les gros plans.
function approach(group) {
  if (group === 'border' || group === 'frame' || group === 'passe' || group === 'material') loadDetail()
  if (group === 'size') prefetchRoom()
}

function choose(group, value, { fromKeyboard = false } = {}) {
  if (!isAvailable(group, value)) return
  const started = performance.now()
  queueMicrotask(() => reportChoice(performance.now() - started))
  const next = withChoice(product, group, value)
  const replay = sameProduct(next, product)
  Object.assign(product, next)
  if (!replay) {
    refresh()
    announce()
  }
  director.choose(group, { ...product }, performance.now())
  run.active = true
  if (reducedMotion && engine) {
    // Animations réduites : simple fondu au changement de plan.
    canvas.classList.remove('fade-cut')
    void canvas.offsetWidth
    canvas.classList.add('fade-cut')
  }
  requestRender()
  closeRow({ focusChip: fromKeyboard })
}

function goFront() {
  director.choose('front', { ...product }, performance.now())
  run.active = true
  requestRender()
}

for (const group of ['material', 'border', 'passe', 'size', 'frame']) {
  const chip = chipEl(group)
  chip.addEventListener('click', (event) => openRow(group, { focus: event.detail === 0 }))
  chip.addEventListener('pointerdown', () => approach(group), { once: true })
  const row = rowEl(group)
  row.addEventListener('click', (event) => {
    const item = event.target.closest('.pick')
    if (item && item.getAttribute('aria-disabled') !== 'true') choose(group, item.dataset.value, { fromKeyboard: event.detail === 0 })
  })
  // Au clavier : les flèches parcourent les aperçus, Échap referme.
  row.addEventListener('keydown', (event) => {
    const items = [...row.querySelectorAll('.pick')]
    const at = items.indexOf(document.activeElement)
    const moves = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: items.length - 1 }
    if (event.key in moves && at >= 0) {
      event.preventDefault()
      items[(moves[event.key] + items.length) % items.length].focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeRow({ focusChip: true })
    }
  })
  // Le focus quitte la vignette et sa rangée : la rangée se referme.
  optEl(group).addEventListener('focusout', (event) => {
    if (openGroup === group && !optEl(group).contains(event.relatedTarget) && event.relatedTarget) closeRow()
  })
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openGroup) closeRow({ focusChip: true })
})

/* Toucher ailleurs referme la rangée, et ce toucher ne fait rien d'autre sur la 3D (ni inclinaison
   ni retour de face). Une autre vignette, elle, ouvre sa propre rangée. */
let swallow = false
document.addEventListener('pointerdown', (event) => {
  swallow = false
  if (!openGroup) return
  const inside = optEl(openGroup).contains(event.target)
  if (inside) return
  if (!event.target.closest('.chip')) {
    closeRow()
    swallow = event.target === canvas
  }
}, true)
stageEl.addEventListener('wheel', () => closeRow(), { passive: true })

/* ---------------- Indice de la première seconde ---------------- */

let hintTimer = 0
function showHint() {
  const hint = $('hint')
  if (!matchMedia('(pointer: coarse)').matches) hint.textContent = 'Cliquez sur une vignette pour essayer une option'
  hint.classList.add('show')
  if (!reducedMotion) {
    $('railLeft').classList.add('nudge')
    $('railRight').classList.add('nudge')
  }
  hintTimer = setTimeout(dismissHint, HINT_MS)
}
function dismissHint() {
  clearTimeout(hintTimer)
  $('hint').classList.remove('show')
  setTimeout(() => {
    $('railLeft').classList.remove('nudge')
    $('railRight').classList.remove('nudge')
  }, 1600)
}
window.addEventListener('scroll', () => { if (window.scrollY > 40) dismissHint() }, { passive: true })

/* ---------------- Retour de face ---------------- */

const frontBtn = $('frontBtn')
let frontShown = true
function setFront(visible) {
  if (visible === frontShown) return
  frontShown = visible
  // Le bouton disparaît sous le focus du clavier : le focus passe à la première vignette.
  if (!visible && document.activeElement === frontBtn) chipEl('material').focus({ preventScroll: true })
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
function swapDetail() {
  if (!detailReady || drag || director.isMoving(performance.now())) return
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

/* Dans la pièce, sur un écran haut et étroit, le 75 × 100 et le 90 × 120 passaient sous les colonnes
   et la cote de hauteur sortait de l'écran : le cadrage de la pièce était réglé pour la scène d'avant,
   plus large. La caméra recule juste ce qu'il faut pour que le tableau et ses cotes tiennent entre
   les colonnes, et le cadrage remonte d'autant pour ne jamais descendre sous le sol de la photo. Le
   recul arrive avec la pièce (view.room) : la transition reste continue. Rien ne change ailleurs. */
const ROOM_DIMS = { cm: 6, px: 24 } // écart d'une cote au tableau, place de son étiquette
function fitRoom(view) {
  const k = view.room
  if (!(k > 0)) return view
  const { camera, painting } = view
  const tan = Math.tan(camera.fovY / 2)
  const offset = camera.position.map((c, i) => c - camera.target[i])
  const distance = Math.hypot(...offset)
  const room = stageSize.zone - 2 * ROOM_DIMS.px
  const need = ((painting.outer.width + 2 * ROOM_DIMS.cm) * stageSize.h) / (2 * tan * room)
  if (need <= distance) return view
  const reach = distance + (need - distance) * k
  const half = reach * tan
  const target = [...camera.target]
  target[1] += Math.max(0, ROOM.view.bottom + half - target[1]) * k
  const sideways = half * (stageSize.w / stageSize.h)
  target[0] += (Math.min(Math.max(target[0], ROOM.photo.left + sideways), ROOM.photo.right - sideways) - target[0]) * k
  const position = target.map((t, i) => t + (offset[i] * reach) / distance)
  return { ...view, camera: { ...camera, position, target } }
}

function draw(at) {
  const view = fitRoom(director.view(at, aspect()))
  engine.render(view, at)
  placeDims(view)
  return view
}

function frame(now) {
  raf = 0
  const view = draw(now)
  if (run.active) run.times.push(now)
  const moving = director.isMoving(now) || engine.isFading(now) || !!drag
  setFront(!moving && view.shot !== 'front')
  if (moving) {
    raf = requestAnimationFrame(frame)
    return
  }
  if (run.active) reportFluidity()
  swapDetail()
  runStillTasks()
  scheduleThumbs()
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
  if (swallow) return
  if (!engine || (event.pointerType === 'mouse' && event.button !== 0)) return
  drag = { x: event.clientX, y: event.clientY, id: event.pointerId, at: performance.now(), moved: 0 }
  director.grab(performance.now())
  run.active = true
  dismissHint()
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
  if (swallow) {
    swallow = false
    return
  }
  if (!drag || event.pointerId !== drag.id) return
  const tap = event.type === 'pointerup' && drag.moved < 8 && performance.now() - drag.at < 400
  drag = null
  director.release(performance.now())
  if (tap && frontShown) goFront()
  requestRender()
}
canvas.addEventListener('pointerup', endDrag)
canvas.addEventListener('pointercancel', endDrag)

/* ---------------- Cadrage : le tableau de face tient entre les deux colonnes ---------------- */

/* Le directeur cadre pour un écran de forme `aspect`. Sur un téléphone, le tableau de face prendrait
   72 % de la largeur et passerait sous les colonnes : on lui donne une forme plus étroite, celle qui
   met le tableau à la largeur de la zone libre (--paint-w). La 3D garde tout l'écran : le mur passe
   derrière les colonnes. Sur un écran large, rien ne change. */
function measureStage() {
  const rect = stageEl.getBoundingClientRect()
  stageSize.w = Math.max(1, Math.round(rect.width))
  stageSize.h = Math.max(1, Math.round(rect.height))
  const paintW = paintBox.getBoundingClientRect().width
  const natural = Math.min(FRONT_FILL * ART_RATIO * stageSize.h, FRONT_FILL * stageSize.w)
  stageSize.framing = paintW < natural - 0.5 ? paintW / (FRONT_FILL * stageSize.h) : stageSize.w / stageSize.h
  // Zone libre entre les deux colonnes, pour le recul dans la pièce.
  const left = $('railLeft').getBoundingClientRect(), right = $('railRight').getBoundingClientRect()
  stageSize.zone = Math.max(paintW, right.left - left.right)
}

let densityCap = Infinity
function fitStage() {
  const fit = renderDensity({ dpr: window.devicePixelRatio || 1, width: stageSize.w, height: stageSize.h })
  engine.resize(stageSize.w, stageSize.h, Math.min(densityCap, fit))
}

new ResizeObserver(() => {
  measureStage()
  const size = thumbCss()
  if (size !== thumbSize) {
    thumbSize = size
    cache.clear()
    queue.clear()
    for (const slot of slots) slot.key = null
    bindAll()
  }
  if (openGroup) fitRow(openGroup)
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
  setMeasure('screen', `${stageSize.w}×${stageSize.h} px × ${decimal.format(engine.density())} · image ${decimal.format(marks.frameCost)} ms · ${engine.gpuName()}`)
}

const choices = { count: 0, worst: 0, last: 0 }
function reportChoice(ms) {
  choices.count += 1
  choices.last = ms
  choices.worst = Math.max(choices.worst, ms)
  window.__chooseMs = ms
  setMeasure('choice', `${decimal.format(ms)} ms pour le dernier choix, ${decimal.format(choices.worst)} ms au pire sur ${choices.count} (prix, vignettes et rangées à jour, avant l'animation)`)
}

function reportThumbs() {
  const { count, total, batches, worstBatch, wait } = thumbStats
  setMeasure('thumbs', `${count} rendues en ${batches} lots, à l'arrêt · page occupée ${decimal.format(total / batches)} ms par lot en moyenne, ${decimal.format(worstBatch)} ms au pire · pixels revenus en ${Math.round(wait)} ms au plus, sans attente`)
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

// Croquis : l'œuvre réduite une fois, puis toutes les cases vides prennent le leur. Canvas gardé en
// mémoire (willReadFrequently) : copié dans de petits canvas, il coûte 6 fois moins qu'un canvas de
// la carte graphique, relu à chaque croquis (0,5 ms contre 3,4 ms, processeur ÷ 4).
photoReady.then(() => {
  const small = document.createElement('canvas')
  small.width = 240
  small.height = 320
  small.getContext('2d', { willReadFrequently: true }).drawImage(poster, 0, 0, small.width, small.height)
  sketchArt = small
  for (const slot of slots) if (!slot.rendered && slot.el.closest('.chip, .row.open')) sketchSlot(slot)
}, () => {})

let reliefs = null
const askReliefs = () => (reliefs ||= startReliefs())

let contextLost = false
function backToPhoto() {
  contextLost = true
  live = false
  noThreeD = true
  canvas.classList.remove('on')
  canvas.setAttribute('aria-hidden', 'true')
  poster.classList.remove('off')
  poster.removeAttribute('aria-hidden')
  for (const slot of slots) { slot.key = null; slot.rendered = false }
  bindAll()
  showNotice('La 3D s’est arrêtée (mémoire du téléphone) : retour à la photo.')
}

let starting = false
async function start3D() {
  if (starting) return
  starting = true
  noThreeD = false
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
    marks.frameCost = await engine.prepare(director.view(at, aspect()), at)
    densityCap = densityForCost(engine.density(), marks.frameCost)
    if (densityCap < engine.density()) fitStage()
  } catch (error) {
    console.error(error)
    noThreeD = true
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
  // Les vignettes en ont besoin : le bois des cadres (40 Ko) et la pièce de la taille (211 Ko).
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
  bindAll()
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
setTimeout(showHint, 700)

/* Garde-fous de la vraie fiche (décision 5) : réseau lent ou économie de données, appareil
   modeste, animations réduites -> on reste sur la photo, vignettes en croquis. La maquette
   propose quand même de voir la 3D, pour que Walid puisse juger sur son téléphone. */
const connection = navigator.connection
const slowNetwork = !!(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')))
const lightNetwork = slowNetwork || !!(connection && /3g/.test(connection.effectiveType || '')) // pas de source complète
const weakDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
const showAnyway = ['Voir la 3D quand même', start3D]
if (slowNetwork) {
  noThreeD = true
  showNotice('Économie de données ou réseau lent : la vraie fiche resterait sur cette photo.', [showAnyway])
} else if (weakDevice) {
  noThreeD = true
  showNotice('Appareil modeste : la vraie fiche resterait sur cette photo.', [showAnyway])
} else if (reducedMotion) {
  noThreeD = true
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

$('buy').addEventListener('click', () => {
  const toast = $('toast')
  toast.textContent = ''
  toast.hidden = false
  // Texte posé après l'affichage, pour que les lecteurs d'écran l'annoncent.
  setTimeout(() => { toast.textContent = "Maquette : le panier n'est pas branché ici." }, 60)
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => { toast.hidden = true }, 2200)
})

/* Accès pour les vérifications : `render(at)` dessine une image complète pour un instant donné ;
   `lab(size)` rend toutes les vignettes du produit en cours, en grand, pour les régler. */
window.__proto = {
  director, product, engine: () => engine, render: draw, stageSize, thumbStats, cache, queue,
  openGroup: () => openGroup,
  async lab(size = 160) {
    const out = []
    for (const group of GROUPS_OF[product.material]) {
      for (const option of optionsOf(group)) {
        const p = withChoice(product, group, option.id)
        const pending = engine.renderThumbs([thumbView(ROOM, group, p)], performance.now(), size)
        draw(performance.now())
        const image = tileImage(await pending, 0)
        const c = document.createElement('canvas')
        c.width = c.height = image.width
        c.getContext('2d').putImageData(image, 0, 0)
        out.push({ group, option: option.id, url: c.toDataURL() })
      }
    }
    return out
  },
}
