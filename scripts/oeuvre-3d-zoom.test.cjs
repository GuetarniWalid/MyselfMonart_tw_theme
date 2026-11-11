// Tests du zoom sur l'œuvre de assets/oeuvre-3d-engine.js : la limite selon la source, le modèle du
// geste (ancrage sous les doigts, bornes, élastique), la caméra qui s'approche, la pièce de détail.
// Lancer : node --test scripts/oeuvre-3d-zoom.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { zoomLimit, createZoom, withZoom, createDirector, neutralRoom, tilePlan, tileServes, tileUrl, visibleImage } = require('../assets/oeuvre-3d-engine.js')
const { gestureOf, pinchDismisses, tapKind } = require('../assets/component-oeuvre-3d.js')

const near = (actual, expected, tolerance, label = '') =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} au lieu de ${expected} (± ${tolerance})`)

// L'œuvre de face sur un téléphone de 390 px (chipsLayout : 242 × 1,05 px de large) et sur un ordinateur.
const PHONE_ART = { w: 254.1, h: 338.8 }
const DESK_ART = { w: 338.8, h: 451.7 }

test("zoom maximal : un pixel de la source s'étale sur 1,5 pixel de l'écran au plus", () => {
  // Bonsaï, 1904 px de large : 7,49 px de source par px CSS, 2,5 par pixel d'un écran × 3.
  near(zoomLimit({ native: { width: 1904, height: 2544 }, art: PHONE_ART, dpr: 3 }), 3.747, 0.005, 'Bonsaï ×3')
  // 1085 × 1450 : le plus petit des deux côtés décide (1,5 × 1085 / 762,3).
  near(zoomLimit({ native: { width: 1085, height: 1450 }, art: PHONE_ART, dpr: 3 }), 2.135, 0.005, '1450 px ×3')
  near(zoomLimit({ native: { width: 1085, height: 1450 }, art: PHONE_ART, dpr: 2 }), 3.203, 0.005, '1450 px ×2')
})

test('zoom maximal : jamais moins de ×2, jamais plus de ×4', () => {
  assert.equal(zoomLimit({ native: { width: 1904, height: 2544 }, art: DESK_ART, dpr: 1 }), 4)
  assert.equal(zoomLimit({ native: { width: 600, height: 800 }, art: PHONE_ART, dpr: 3 }), 2)
})

test('zoom maximal : sans taille connue de la source, ×2', () => {
  assert.equal(zoomLimit({ native: null, art: PHONE_ART, dpr: 3 }), 2)
  assert.equal(zoomLimit({ native: { width: 0, height: 0 }, art: PHONE_ART, dpr: 3 }), 2)
})

/* Le modèle du geste. Tout est en px de l'écran, comptés depuis le milieu de l'œuvre de face (le centre
   de l'image de la 3D). Un point de l'œuvre que l'on voyait en u à ×1 se voit en scale × (u − centre),
   centre étant le point de ×1 qui se trouve au milieu de l'image. L'œuvre de face sur un téléphone de
   390 × 844 : 254 × 338 px ; l'écran utile va de 195 px à gauche et à droite, de 333 px au-dessus du
   milieu de l'œuvre à 327 px dessous (au-dessus de la pilule d'achat). */
const PHONE = { half: [127, 169], view: { left: -195, top: -333, right: 195, bottom: 327 }, max: 3.75 }
const onScreen = (z, [ux, uy]) => [z.scale * (ux - z.x), z.scale * (uy - z.y)]

test("pincer : le point de l'œuvre sous les doigts y reste, et les deux doigts déplacent l'œuvre", () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(40, 0, 100, 0)
  zoom.drag(40, 0, 200, 16)
  let z = zoom.at(16)
  near(z.scale, 2, 1e-9, 'échelle')
  const under = [40, 0] // le point vu à ×1 sous les doigts
  near(onScreen(z, under)[0], 40, 1e-6, 'x')
  near(onScreen(z, under)[1], 0, 1e-6, 'y')
  zoom.drag(60, 0, 200, 32) // les deux doigts glissent de 20 px vers la droite
  z = zoom.at(32)
  near(onScreen(z, under)[0], 60, 1e-6, 'x après glissement')
})

// Zoomé à ×2 au milieu, doigts levés et immobiles.
function zoomedTwice() {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(0, 0, 100, 0)
  zoom.drag(0, 0, 200, 16)
  zoom.release(16)
  return zoom
}
const leftEdge = (z) => onScreen(z, [-PHONE.half[0], 0])[0]

test("au bord de l'œuvre, l'élastique : elle suit le doigt en résistant, puis revient se caler au bord", () => {
  const zoom = zoomedTwice()
  zoom.grab(0, 0, 0, 100)
  zoom.drag(300, 0, 0, 200) // un doigt tire l'œuvre de 300 px vers la droite
  const pulled = leftEdge(zoom.at(200))
  assert.ok(pulled > PHONE.view.left + 20, `le mur se découvre à gauche (bord à ${pulled})`)
  assert.ok(pulled < PHONE.view.left + 150, `en résistant : le bord a moins suivi que le doigt (${pulled})`)
  zoom.release(200)
  assert.ok(zoom.isMoving(300), 'elle revient')
  near(leftEdge(zoom.at(1400)), PHONE.view.left, 0.5, 'bord gauche')
  assert.equal(zoom.isMoving(1400), false)
})

test("zoomée moins large que l'écran, l'œuvre ne se déplace pas de côté", () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(0, 0, 100, 0)
  zoom.drag(0, 0, 120, 16) // ×1,2 : 305 px de large sur 390
  zoom.release(16)
  const before = zoom.at(16).x
  zoom.grab(0, 0, 0, 100)
  zoom.drag(80, 0, 0, 120)
  zoom.release(120)
  near(zoom.at(2000).x, before, 0.5, 'centre')
})

test('pincer sous ×1 : l’œuvre rapetisse en résistant, puis revient à sa place de face', () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(30, 40, 200, 0)
  zoom.drag(30, 40, 100, 16) // les doigts se rapprochent de moitié
  const z = zoom.at(16)
  assert.ok(z.scale < 1 && z.scale > 0.6, `rapetissée sans s'effondrer (${z.scale})`)
  zoom.release(16)
  const back = zoom.at(1000)
  near(back.scale, 1, 1e-9, 'échelle')
  near(back.x, 0, 1e-6, 'x')
  near(back.y, 0, 1e-6, 'y')
  assert.equal(zoom.isMoving(1000), false)
})

test('pincer au-delà du maximum : il résiste, puis revient au maximum', () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(0, 0, 100, 0)
  zoom.drag(0, 0, 600, 16) // ×6 demandé
  const z = zoom.at(16)
  assert.ok(z.scale > PHONE.max && z.scale < PHONE.max * 1.4, `au-delà, en résistant (${z.scale})`)
  zoom.release(16)
  near(zoom.at(1000).scale, PHONE.max, 1e-9, 'maximum')
})

// À ×3, un doigt glisse vers la gauche à v px par ms pendant 48 ms, puis se lève.
function flung(v) {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.grab(0, 0, 100, 0)
  zoom.drag(0, 0, 300, 16)
  zoom.release(16)
  zoom.grab(0, 0, 0, 100)
  for (const t of [116, 132, 148]) zoom.drag(-v * (t - 100), 0, 0, t)
  zoom.release(150)
  return zoom
}

test("lâchée en mouvement, l'œuvre file sur son élan, ralentit et s'arrête", () => {
  const zoom = flung(0.25)
  const x = (t) => zoom.at(t).x
  // Au lâcher, le centre est à 12 / 3 = 4 px ; il file de 0,25 / 3 px par ms, l'élan décroît en 325 ms.
  const first = x(250) - x(150), second = x(350) - x(250)
  assert.ok(first > 0 && second > 0 && second < first, `il ralentit (${first}, ${second})`)
  near(x(5000), 4 + (0.25 / 3) * 325, 0.1, 'arrêt')
  assert.equal(zoom.isMoving(5000), false)
})

test("lancée vers un bord, l'œuvre le dépasse à peine, puis s'y cale", () => {
  const zoom = flung(1.5)
  const edge = 127 - 195 / 3 // centre le plus à droite permis à ×3 : le bord droit de l'œuvre au bord de l'écran
  let farthest = -Infinity
  for (let t = 150; t < 3000; t += 8) farthest = Math.max(farthest, zoom.at(t).x)
  assert.ok(farthest > edge + 1, `elle dépasse le bord (${farthest} pour ${edge})`)
  assert.ok((farthest - edge) * 3 < 120, `de peu : ${(farthest - edge) * 3} px à l'écran`)
  near(zoom.at(5000).x, edge, 0.05, 'calée au bord')
  assert.equal(zoom.isMoving(5000), false)
})

test("double toucher : à ×1, il zoome vers ×2,5 sous le doigt, en glissant ; zoomé, il revient à ×1", () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.toggle(30, -50, 0)
  assert.ok(zoom.isMoving(100), 'en glissant')
  const z = zoom.at(1000)
  near(z.scale, 2.5, 1e-9, 'échelle')
  const tapped = onScreen(z, [30, -50]) // le point touché reste sous le doigt
  near(tapped[0], 30, 1e-6, 'x')
  near(tapped[1], -50, 1e-6, 'y')
  zoom.toggle(0, 0, 1000)
  const back = zoom.at(2000)
  near(back.scale, 1, 1e-9, 'retour')
  near(back.x, 0, 1e-9, 'x')
  near(back.y, 0, 1e-9, 'y')
})

test('double toucher : vers le maximum quand il est sous ×2,5 ; près du bord, l’œuvre reste calée', () => {
  const zoom = createZoom()
  zoom.frame({ ...PHONE, max: 2.13 })
  zoom.toggle(120, 160, 0) // dans le coin bas droit de l'œuvre
  const z = zoom.at(1000)
  near(z.scale, 2.13, 1e-9, 'maximum')
  // Le bord droit de l'œuvre ne quitte pas celui de l'écran.
  near(onScreen(z, [127, 0])[0], 195, 1e-6, 'bord droit')
})

test("retour à ×1 (bouton « Retour », Échap, choix d'une option) : en glissant, ou d'un coup", () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.toggle(30, -50, 0)
  zoom.reset(1000, 200)
  assert.ok(zoom.isMoving(1100))
  near(zoom.at(1200).scale, 1, 1e-9, 'en 200 ms')
  zoom.toggle(30, -50, 2000)
  zoom.reset(3000, 0)
  near(zoom.at(3000).scale, 1, 1e-9, "d'un coup")
  assert.equal(zoom.isMoving(3000), false)
})

/* Sur un ordinateur de 1440 × 820 : l'œuvre de face fait 339 × 452 px, l'écran utile va de 720 px de
   chaque côté, de 349,5 px au-dessus de son milieu à 347,5 px dessous. */
const DESK = { half: [169.4, 225.85], view: { left: -720, top: -349.5, right: 720, bottom: 347.5 }, max: 4 }

test('molette : le zoom suit le pavé tactile sous le pointeur, sans passer sous ×1 ni au-delà du maximum', () => {
  const zoom = createZoom()
  zoom.frame(DESK)
  zoom.wheel(2, 0, 100, 0)
  let z = zoom.at(0)
  near(z.scale, 2, 1e-9, 'échelle')
  near(onScreen(z, [0, 100])[1], 100, 1e-6, 'le point sous le pointeur')
  zoom.wheel(0.2, 0, 100, 10)
  near(zoom.at(10).scale, 1, 1e-9, 'pas sous ×1')
  zoom.wheel(10, 0, 100, 20)
  near(zoom.at(20).scale, 4, 1e-9, 'pas au-delà du maximum')
})

test("animations réduites : le zoom suit toujours les doigts, mais le double toucher, les retours et l'élan sont immédiats", () => {
  const zoom = createZoom({ reducedMotion: true })
  zoom.frame(PHONE)
  zoom.toggle(30, -50, 0)
  near(zoom.at(0).scale, 2.5, 1e-9, 'double toucher')
  assert.equal(zoom.isMoving(1), false)
  zoom.grab(0, 0, 0, 100)
  for (const t of [116, 132, 148]) zoom.drag(-1.5 * (t - 100), 0, 0, t)
  const before = zoom.at(148).x
  zoom.release(150)
  assert.ok(Math.abs(zoom.at(150).x - before) < 30, 'pas d’élan')
  assert.equal(zoom.isMoving(151), false)
  zoom.reset(200)
  near(zoom.at(200).scale, 1, 1e-9, 'retour')
})

test("où l'œuvre va se poser : connu dès le départ d'un glissé ou d'un élan, pour demander sa pièce de détail en route", () => {
  const zoom = createZoom()
  zoom.frame(PHONE)
  zoom.toggle(30, -50, 0)
  const landing = zoom.landing()
  near(landing.scale, 2.5, 1e-9, 'échelle')
  const end = zoom.at(1000)
  near(landing.x, end.x, 1e-9, 'x')
  near(landing.y, end.y, 1e-9, 'y')
  const flying = flung(0.25)
  near(flying.landing().x, flying.at(5000).x, 1e-9, "l'élan")
  zoom.grab(0, 0, 0, 2000)
  assert.equal(zoom.landing(), null, 'doigts posés : on ne sait pas')
})

test("molette d'une souris : chaque cran glisse, et des crans rapprochés s'additionnent", () => {
  const zoom = createZoom()
  zoom.frame(DESK)
  zoom.wheel(1.25, 0, 0, 0, 150)
  assert.ok(zoom.at(50).scale > 1 && zoom.at(50).scale < 1.25, 'en glissant')
  zoom.wheel(1.25, 0, 0, 60, 150)
  near(zoom.at(1000).scale, 1.5625, 1e-9, 'deux crans')
})

/* La caméra du zoom. Projection sténopé indépendante du code testé : un point, en px depuis le centre
   d'une image de width × height px (y vers le bas), vu par la caméra de la vue. */
const sub = (a, b) => a.map((v, i) => v - b[i])
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = (v) => v.map((c) => c / Math.hypot(...v))
function pixel(camera, width, height, point) {
  const forward = unit(sub(camera.target, camera.position))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const rel = sub(point, camera.position)
  const depth = dot(rel, forward)
  const t = Math.tan(camera.fovY / 2)
  return [(dot(rel, right) / (depth * t)) * (height / 2), -(dot(rel, up) / (depth * t)) * (height / 2)]
}

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }

test("la caméra s'approche du tableau en restant de face : un point vu en u à ×1 se voit en échelle × (u − centre)", () => {
  const W = 390, H = 700
  const director = createDirector({ room: neutralRoom(['30x40']), product: TOILE })
  const front = director.view(0, W / H)
  const target = front.camera.target
  const k = H / 2 / (Math.hypot(...sub(front.camera.position, target)) * Math.tan(front.camera.fovY / 2)) // px par cm
  const point = [target[0] + 5, target[1] + 4, target[2]] // sur la façade de l'œuvre
  const u = pixel(front.camera, W, H, point)
  near(u[0], 5 * k, 1e-6, 'à ×1')
  const center = [20, -30] // px de ×1
  const zoomed = withZoom(front, 2.5, [center[0] / k, -center[1] / k])
  const seen = pixel(zoomed.camera, W, H, point)
  near(seen[0], 2.5 * (u[0] - center[0]), 1e-6, 'x')
  near(seen[1], 2.5 * (u[1] - center[1]), 1e-6, 'y')
  assert.equal(zoomed.camera.position[0], zoomed.camera.target[0])
  assert.equal(zoomed.camera.position[1], zoomed.camera.target[1])
  assert.equal(zoomed.camera.fovY, front.camera.fovY, "l'objectif ne change pas")
  assert.equal(withZoom(front, 1, [0, 0]), front, '×1 : la vue telle quelle')
})

/* La pièce de détail. Le Bonsaï (1904 × 2544 px) zoomé ×3,75 au milieu d'un téléphone : on voit 41 %
   de sa largeur et 52 % de sa hauteur, soit 779 × 1323 px de la source, sur 1014 px de canvas de large
   (390 px CSS en densité 2,6) : plus d'un pixel de canvas par pixel de la source. */
const BONSAI = { width: 1904, height: 2544 }
const MIDDLE = { u0: 0.2953, v0: 0.24, u1: 0.7047, v1: 0.76 }
const BUDGET = { maxSide: 4096, maxPixels: 3.2e6 }
const ARRIVAL = { width: 1100 } // l'image d'arrivée sur un téléphone (srcset)

test("pièce de détail : la vue et une marge d'un quart autour, en vraie résolution de la source", () => {
  const plan = tilePlan({ visible: MIDDLE, native: BONSAI, density: 1.3, base: ARRIVAL, ...BUDGET })
  const seen = { left: 0.2953 * 1904, top: 0.24 * 2544, right: 0.7047 * 1904, bottom: 0.76 * 2544 }
  const w = seen.right - seen.left, h = seen.bottom - seen.top
  assert.ok(plan.left <= seen.left - 0.24 * w && plan.left + plan.width >= seen.right + 0.24 * w, 'marge en largeur')
  assert.ok(plan.top <= seen.top - 0.24 * h && plan.top + plan.height >= seen.bottom + 0.24 * h, 'marge en hauteur')
  assert.ok(plan.left >= 0 && plan.top >= 0 && plan.left + plan.width <= 1904 && plan.top + plan.height <= 2544, "dans l'image")
  assert.equal(plan.out.width, plan.width, 'jamais plus que la source : un pixel pour un pixel')
  assert.deepEqual(plan.rect, [plan.left / 1904, plan.top / 2544, (plan.left + plan.width) / 1904, (plan.top + plan.height) / 2544])
})

test("pièce de détail : calée sur une grille, pour que le CDN la garde en cache ; un petit glissé n'en demande pas d'autre", () => {
  const plan = tilePlan({ visible: MIDDLE, native: BONSAI, density: 1.3, base: ARRIVAL, ...BUDGET })
  const step = 32
  for (const edge of [plan.left, plan.top]) assert.equal(edge % step, 0, `bord ${edge} sur la grille`)
  const nudged = { u0: MIDDLE.u0 + 0.004, v0: MIDDLE.v0 - 0.003, u1: MIDDLE.u1 + 0.004, v1: MIDDLE.v1 - 0.003 }
  assert.deepEqual(tilePlan({ visible: nudged, native: BONSAI, density: 1.3, base: ARRIVAL, ...BUDGET }), plan, 'même pièce')
  assert.equal(tileServes(plan, nudged, 1.3), true, 'la pièce en place sert encore')
  const far = { u0: 0.02, v0: 0.24, u1: 0.43, v1: 0.76 }
  assert.equal(tileServes(plan, far, 1.3), false, 'loin de là, il en faut une autre')
})

test("pièce de détail : par paliers de résolution, jamais en deçà de ce que l'écran montre", () => {
  const plan = tilePlan({ visible: MIDDLE, native: BONSAI, density: 0.62, base: ARRIVAL, ...BUDGET })
  near(plan.out.width / plan.width, Math.SQRT1_2, 0.002, 'palier de √2')
  assert.equal(tileServes(plan, MIDDLE, 0.62), true)
  assert.equal(tileServes(plan, MIDDLE, 0.9), false, 'zoomé plus loin, elle ne suffit plus')
})

test("pièce de détail : aucune, si l'image en place a déjà la résolution voulue", () => {
  assert.equal(tilePlan({ visible: MIDDLE, native: BONSAI, density: 1.3, base: { width: 1904 }, ...BUDGET }), null)
  assert.equal(tilePlan({ visible: MIDDLE, native: BONSAI, density: 0.5, base: ARRIVAL, ...BUDGET }), null)
})

test('pièce de détail : sous la taille maximale des textures et dans le budget de mémoire', () => {
  const whole = { u0: -0.1, v0: -0.05, u1: 1.1, v1: 1.05 }
  const plan = tilePlan({ visible: whole, native: BONSAI, density: 1, base: { width: 400 }, maxSide: 2048, maxPixels: 2e6 })
  assert.ok(plan.out.width <= 2048 && plan.out.height <= 2048, `${plan.out.width} × ${plan.out.height}`)
  assert.ok(plan.out.width * plan.out.height <= 2e6, `${plan.out.width * plan.out.height} pixels`)
  assert.equal(plan.left, 0)
  assert.equal(plan.width, 1904, "toute l'image")
})

/* La région de l'image que l'on voit, d'après la région de la façade (cm depuis son milieu, y vers le
   haut) : les coordonnées de la façade d'artBox, et le recadrage du contour blanc du shader. */
const PAINTING = { width: 30, height: 40, depth: 2, paper: 0, passe: 0 }
const rectNear = (actual, expected, label) => ['u0', 'v0', 'u1', 'v1'].forEach((k) => near(actual[k], expected[k], 5e-4, `${label} ${k}`))

test("région vue de l'image : toile, la façade montre toute l'image", () => {
  rectNear(visibleImage(PAINTING, 'blanche', 0.75, [-5, -10, 5, 10]), { u0: 1 / 3, v0: 0.25, u1: 2 / 3, v1: 0.75 }, 'toile')
})

test("région vue de l'image : bordure pliée, la façade n'en montre que le milieu", () => {
  rectNear(visibleImage(PAINTING, 'pliee', 0.75, [-5, -10, 5, 10]), { u0: 12 / 34, v0: 12 / 44, u1: 22 / 34, v1: 32 / 44 }, 'pliée')
})

test("région vue de l'image : poster au contour blanc, l'œuvre recadrée dans l'intérieur", () => {
  const poster = { ...PAINTING, depth: 0.05, paper: 1, passe: 1 }
  rectNear(visibleImage(poster, 'papier', 0.75, [-5, -10, 5, 10]), { u0: 0.3106, v0: 0.2159, u1: 0.6894, v1: 0.7841 }, 'contour')
})

test("l'adresse de la pièce : le recadrage du CDN de Shopify, la version de l'image gardée", () => {
  const plan = { left: 320, top: 256, width: 1280, height: 2048, out: { width: 905, height: 1448 } }
  const url = new URL(tileUrl('https://www.myselfmonart.com/cdn/shop/files/bonsai.png?v=1792266398&width=2000', plan))
  assert.equal(url.pathname, '/cdn/shop/files/bonsai.png')
  assert.equal(url.searchParams.get('v'), '1792266398')
  assert.equal(url.searchParams.get('crop'), 'region')
  assert.deepEqual(['crop_left', 'crop_top', 'crop_width', 'crop_height'].map((k) => url.searchParams.get(k)), ['320', '256', '1280', '2048'])
  assert.equal(url.searchParams.get('width'), '905')
  assert.equal(url.searchParams.getAll('width').length, 1)
})

/* Les gestes, sur la scène. fingers : doigts posés ; on : où ils se sont posés (la 3D, ou le voile
   d'une rangée ouverte) ; front : la 3D de face, au repos, sans rangée ni transition ; shot : son plan. */
test("un doigt : de face, il incline le tableau comme avant ; zoomé, il déplace l'œuvre", () => {
  assert.equal(gestureOf({ fingers: 1, on: 'canvas', zoomed: false, front: true, shot: 'front' }), 'tilt')
  assert.equal(gestureOf({ fingers: 1, on: 'canvas', zoomed: true, front: true, shot: 'front' }), 'pan')
  assert.equal(gestureOf({ fingers: 1, on: 'canvas', zoomed: false, front: false, shot: 'corner' }), 'tilt', 'gros plan : comme avant')
})

test('deux doigts : de face au repos, ils zooment ; en gros plan ou rangée ouverte, ils ramènent de face', () => {
  assert.equal(gestureOf({ fingers: 2, on: 'canvas', zoomed: false, front: true, shot: 'front' }), 'pinch')
  assert.equal(gestureOf({ fingers: 2, on: 'canvas', zoomed: true, front: true, shot: 'front' }), 'pinch')
  assert.equal(gestureOf({ fingers: 2, on: 'closer', zoomed: false, front: false, shot: 'edge' }), 'dismiss')
  assert.equal(gestureOf({ fingers: 2, on: 'canvas', zoomed: false, front: false, shot: 'room' }), 'dismiss')
  assert.equal(gestureOf({ fingers: 2, on: 'canvas', zoomed: false, front: false, shot: 'front' }), 'none', 'en plein retour de face')
  assert.equal(gestureOf({ fingers: 1, on: 'closer', zoomed: false, front: false, shot: 'edge' }), 'none', 'un toucher du voile reste un clic')
})

test("pincer en gros plan : des doigts qui se rapprochent de 15 % valent un toucher en dehors ; s'écarter, rien", () => {
  assert.equal(pinchDismisses(200, 175), false)
  assert.equal(pinchDismisses(200, 169), true)
  assert.equal(pinchDismisses(200, 260), false)
})

test('double toucher : deux touchers en moins de 320 ms, à moins de 40 px', () => {
  const first = { at: 0, x: 100, y: 100 }
  assert.equal(tapKind(null, first), 'single')
  assert.equal(tapKind(first, { at: 250, x: 120, y: 110 }), 'double')
  assert.equal(tapKind(first, { at: 400, x: 100, y: 100 }), 'single', 'trop lent')
  assert.equal(tapKind(first, { at: 200, x: 180, y: 100 }), 'single', 'trop loin')
})
