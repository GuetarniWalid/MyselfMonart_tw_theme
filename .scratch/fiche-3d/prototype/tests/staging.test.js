import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDirector, curlCorner, paintingCorners } from '../src/staging.js'
import { ROOM } from '../src/room.js' // la pièce provisoire réelle (lumière venant de la gauche)

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const PORTRAIT = 0.8 // largeur / hauteur de la scène 3D sur un téléphone

// Projection sténopé indépendante du code testé : part de la caméra rendue par le
// directeur et renvoie la part de la hauteur d'écran occupée par un segment vertical
// de hauteur h placé à la profondeur du point visé.
function heightFraction(view, h) {
  const { position, target, fovY } = view.camera
  const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
  return h / (2 * d * Math.tan(fovY / 2))
}

test("à l'arrivée, le tableau est de face et occupe 72 % de la hauteur d'un écran de téléphone", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  const view = director.view(0, PORTRAIT)

  assert.equal(view.shot, 'front')
  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  assert.equal(view.painting.yaw, 0)
  assert.equal(view.painting.pitch, 0)
  assert.ok(Math.abs(heightFraction(view, 40) - 0.72) < 0.005)
})

const LATER = 5000 // ms : toute transition est finie

function unit(v) {
  const n = Math.hypot(...v)
  return v.map((c) => c / n)
}

const mid = (pts) => pts.reduce((a, p) => a.map((v, i) => v + p[i] / pts.length), [0, 0, 0])
const sub = (a, b) => a.map((v, i) => v - b[i])
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// Caméra sténopé (regard vers la cible, haut = +y) : renvoie la position à l'écran en
// coordonnées normalisées (-1..1) et la profondeur le long de l'axe de visée.
function project(camera, aspect, point) {
  const forward = unit(sub(camera.target, camera.position))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const rel = sub(point, camera.position)
  const depth = dot(rel, forward)
  const t = Math.tan(camera.fovY / 2)
  return { x: dot(rel, right) / (depth * t * aspect), y: dot(rel, up) / (depth * t), depth }
}

test('choisir une bordure fait pivoter le tableau pour montrer sa tranche éclairée, sans entrer dans le mur', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('border', { ...TOILE, border: 'miroir' }, 100)
  const view = director.view(100 + LATER, PORTRAIT)

  assert.equal(view.shot, 'edge')
  const corners = paintingCorners(view.painting)
  for (const c of corners) assert.ok(c[2] >= 0, `coin derrière le mur : z = ${c[2]}`)

  // Tranche du côté de la fenêtre (à gauche) : normale du milieu de la face droite au
  // milieu de la face gauche.
  const lit = mid(corners.filter((c) => c.side.x < 0))
  const other = mid(corners.filter((c) => c.side.x > 0))
  const normal = unit(sub(lit, other))
  const facing = dot(normal, unit(sub(view.camera.position, lit)))
  assert.ok(facing >= 0.5, `tranche trop rasante : cos = ${facing.toFixed(2)}`)
  assert.ok(dot(normal, unit(ROOM.light)) >= 0.5, 'la tranche montrée reçoit la lumière')
})

test('choisir un cadre amène la caméra de trois-quarts sur un coin du cadre, côté lumière, en gros plan', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('frame', { ...TOILE, frame: 'chene' }, 100)
  const view = director.view(100 + LATER, PORTRAIT)

  assert.equal(view.shot, 'corner')
  assert.ok(view.painting.outer.width > view.painting.width, 'le cadre entoure la toile')
  const corner = paintingCorners(view.painting, 'outer').find(
    (c) => c.side.x < 0 && c.side.y < 0 && c.side.z === 1,
  )
  const onScreen = project(view.camera, PORTRAIT, corner)
  assert.ok(Math.abs(onScreen.x) < 0.5 && Math.abs(onScreen.y) < 0.5, 'coin au centre de l’image')
  const visibleHeight = 2 * onScreen.depth * Math.tan(view.camera.fovY / 2)
  assert.ok(visibleHeight <= 25, `pas assez près : ${visibleHeight.toFixed(1)} cm visibles`)

  const look = unit(sub(view.camera.position, corner))
  const angle = (Math.acos(look[2]) * 180) / Math.PI
  assert.ok(angle >= 20 && angle <= 50, `angle de trois-quarts : ${angle.toFixed(0)}°`)
  assert.ok(look[0] < 0 && look[1] > 0, 'caméra du côté de la fenêtre et au-dessus du coin')
})

// Deux vues prises à un pas de temps d'écart ne doivent pas différer de plus que ce
// qu'un mouvement fluide parcourt pendant ce pas (cm pour la caméra, rad pour le tableau).
function assertSameView(a, b, label, tolerance = 0.5) {
  const gap = Math.hypot(...sub(a.camera.position, b.camera.position))
  assert.ok(gap < tolerance, `${label} : la caméra saute de ${gap.toFixed(2)} cm`)
  const turn = Math.abs(a.painting.yaw - b.painting.yaw)
  assert.ok(turn < tolerance / 10, `${label} : le tableau saute de ${turn.toFixed(3)} rad`)
}

test("passer à un autre groupe d'option ramène d'abord la caméra de face, sans à-coup", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('border', { ...TOILE, border: 'miroir' }, 0)
  const framed = { ...TOILE, border: 'miroir', frame: 'chene' }
  const before = director.view(LATER - 1, PORTRAIT)
  director.choose('frame', framed, LATER)
  assertSameView(before, director.view(LATER + 1, PORTRAIT), 'au clic')

  const front = createDirector({ room: ROOM, product: framed }).view(0, PORTRAIT)
  let passedFront = false
  let previous = director.view(LATER, PORTRAIT)
  for (let t = LATER; t <= 2 * LATER; t += 8) {
    const view = director.view(t, PORTRAIT)
    assertSameView(previous, view, `à ${t - LATER} ms`, 5)
    previous = view
    const atFront =
      view.painting.yaw === 0 &&
      view.painting.z === 0 &&
      Math.hypot(...sub(view.camera.position, front.camera.position)) < 0.5
    if (atFront) passedFront = true
  }
  assert.ok(passedFront, 'la caméra ne repasse pas de face')
  assert.equal(director.view(2 * LATER, PORTRAIT).shot, 'corner')
})

test('choisir une taille fait reculer la caméra dans la pièce, tableau à la vraie échelle et coté en cm', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const view = director.view(LATER, PORTRAIT)

  assert.equal(view.shot, 'room')
  assert.equal(view.room, 1)
  const p = view.painting
  assert.equal(p.width, 75)
  assert.equal(p.height, 100)
  assert.ok(p.y - p.height / 2 >= ROOM.hang.minBottom, 'accroché au-dessus du dossier du canapé')

  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  const floor = project(view.camera, PORTRAIT, [p.x, 0, 0])
  const top = project(view.camera, PORTRAIT, [p.x, p.y + p.height / 2, p.depth])
  assert.ok(floor.y >= -1 && top.y <= 1, 'le sol et le haut du tableau sont à l’écran')

  assert.equal(view.dims.width.text, '75 cm')
  assert.equal(view.dims.height.text, '100 cm')
  assert.equal(Math.abs(view.dims.width.b[0] - view.dims.width.a[0]), 75)
  assert.equal(Math.abs(view.dims.height.b[1] - view.dims.height.a[1]), 100)
  assert.equal(view.dims.opacity, 1)
})

const POSTER = { material: 'poster', size: '30x40', border: 'blanche', frame: 'sans', passe: false }

test("un cadre arrive et repart en fondu, jamais d'un coup", () => {
  const director = createDirector({ room: ROOM, product: POSTER })
  assert.equal(director.view(0, PORTRAIT).painting.framed, 0)

  director.choose('frame', { ...POSTER, frame: 'chene' }, 100)
  let previous = 0
  let steps = 0
  for (let t = 100; t <= 100 + LATER; t += 16) {
    const framed = director.view(t, PORTRAIT).painting.framed
    assert.ok(framed >= previous - 1e-9, 'le fondu ne recule pas')
    assert.ok(framed - previous < 0.12, `le cadre saute de ${previous.toFixed(2)} à ${framed.toFixed(2)}`)
    if (framed > 0 && framed < 1) steps++
    previous = framed
  }
  assert.equal(previous, 1)
  assert.ok(steps >= 10, `fondu trop bref : ${steps} images`)

  director.choose('frame', { ...POSTER, frame: 'sans' }, 200 + LATER)
  const leaving = director.view(200 + LATER + 200, PORTRAIT).painting.framed
  assert.ok(leaving > 0 && leaving < 1, 'le cadre qui part est encore là, en train de s’effacer')
  assert.equal(director.view(200 + 2 * LATER, PORTRAIT).painting.framed, 0)
})

test('choisir le contour blanc zoome de face sur la marge du poster', () => {
  const director = createDirector({ room: ROOM, product: POSTER })
  director.choose('passe', { ...POSTER, passe: true }, 0)
  const view = director.view(LATER, PORTRAIT)

  assert.equal(view.shot, 'margin')
  const { position, target } = view.camera
  assert.equal(position[0], target[0])
  assert.equal(position[1], target[1])
  assert.equal(view.painting.yaw, 0)

  const p = view.painting
  const corner = paintingCorners(p).find((c) => c.side.x < 0 && c.side.y < 0 && c.side.z === 1)
  const onScreen = project(view.camera, PORTRAIT, corner)
  assert.ok(onScreen.x > -1 && onScreen.x < 0 && onScreen.y > -1 && onScreen.y < 0, 'coin bas gauche visible')
  const visibleHeight = 2 * onScreen.depth * Math.tan(view.camera.fovY / 2)
  assert.ok(visibleHeight <= 0.45 * p.height, `zoom trop large : ${visibleHeight.toFixed(1)} cm`)
})

test("passer au poster avec un cadre montre de trois-quarts le tableau qui s'affine : pas de coin soulevé sous verre", () => {
  const framed = { ...TOILE, frame: 'chene' }
  const director = createDirector({ room: ROOM, product: framed })
  director.choose('material', { ...framed, material: 'poster' }, 0)

  let previous = director.view(0, PORTRAIT).painting.depth
  assert.equal(previous, 2)
  let sawBetween = false
  for (let t = 0; t <= LATER; t += 20) {
    const { depth, curl } = director.view(t, PORTRAIT).painting
    assert.equal(curl, 0, 'sous verre, le papier ne se soulève pas')
    assert.ok(depth <= previous + 1e-9, 'l’épaisseur ne fait que diminuer')
    if (depth > 0.1 && depth < 1.9) sawBetween = true
    previous = depth
  }
  assert.ok(sawBetween, 'l’épaisseur passe par des valeurs intermédiaires')

  const view = director.view(LATER, PORTRAIT)
  assert.equal(view.shot, 'material')
  assert.equal(view.painting.depth, 0.05)
  assert.equal(view.painting.paper, 1)
  const lit = mid(paintingCorners(view.painting).filter((c) => c.side.x < 0))
  const toCamera = unit(sub(view.camera.position, lit))
  assert.ok(toCamera[0] <= -0.3, 'la caméra voit le tableau de profil, côté fenêtre')
})

const TURN_END = 3600 // ms : fin du tour de la toile, avec une marge dans les tests
const FULL_TURN = 2 * Math.PI
const wrapped = (a) => Math.atan2(Math.sin(a), Math.cos(a))

function choosePoster(product = TOILE) {
  const director = createDirector({ room: ROOM, product })
  director.choose('material', { ...product, material: 'poster' }, 0)
  return director
}

function chooseToile(product = POSTER) {
  const director = createDirector({ room: ROOM, product })
  director.choose('material', { ...product, material: 'toile' }, 0)
  return director
}

test('choisir la toile fait quitter le mur au tableau, lui fait faire un tour complet et le repose de face', () => {
  const director = chooseToile()
  let previous = 0
  let lowest = Infinity
  for (let t = 0; t <= LATER; t += 16) {
    const { painting } = director.view(t, PORTRAIT)
    const turned = Math.abs(painting.yaw)
    if (t < TURN_END) assert.ok(turned >= previous - 1e-9, `le tour recule à ${t} ms`)
    assert.ok(turned - previous < 0.09, `le tour saute à ${t} ms : ${(turned - previous).toFixed(3)} rad`)
    if (t < TURN_END) previous = turned
    for (const c of paintingCorners(painting, 'outer')) lowest = Math.min(lowest, c[2])
  }
  assert.ok(Math.abs(previous - FULL_TURN) < 0.05, `tour incomplet : ${previous.toFixed(2)} rad`)
  assert.ok(lowest >= -1e-6, `le tableau traverse le mur : z = ${lowest.toFixed(2)}`)

  const rest = director.view(LATER, PORTRAIT)
  assert.equal(rest.shot, 'front')
  assert.equal(rest.painting.yaw, 0)
  assert.equal(rest.painting.z, 0)
  assert.equal(rest.painting.depth, 2)
  assert.equal(rest.painting.paper, 0)
  assert.equal(director.isMoving(LATER), false)
})

test('le tableau quitte le mur juste assez pour tourner', () => {
  const director = chooseToile()
  const farthest = Math.max(...Array.from({ length: 300 }, (_, i) => director.view(i * 16, PORTRAIT).painting.z))
  assert.ok(farthest >= 15, 'il faut au moins la demi-largeur pour tourner')
  assert.ok(farthest <= 18, `trop loin du mur : ${farthest.toFixed(1)} cm`)
})

test('de dos, le tableau ralentit pour montrer le châssis', () => {
  const director = chooseToile()
  let ofBack = 0
  let moving = 0
  for (let t = 0; t <= TURN_END; t += 4) {
    const turned = Math.abs(director.view(t, PORTRAIT).painting.yaw)
    if (turned > 0.02 && turned < FULL_TURN - 0.02) moving += 4
    if (Math.abs(turned - Math.PI) < (25 * Math.PI) / 180) ofBack += 4
  }
  // 50° sur 360° au rythme moyen prendraient 14 % du temps de rotation.
  assert.ok(ofBack >= 900, `dos trop vite passé : ${ofBack} ms`)
  assert.ok(ofBack / moving >= 0.3, `pas de ralentissement : ${Math.round((ofBack / moving) * 100)} %`)
})

test('pendant le tour, le tableau reste entier dans le cadre, tranches comprises', () => {
  const director = chooseToile({ ...POSTER, size: '75x100' })
  for (let t = 0; t <= TURN_END; t += 32) {
    const view = director.view(t, PORTRAIT)
    for (const c of paintingCorners(view.painting, 'outer')) {
      const { x, y } = project(view.camera, PORTRAIT, c)
      assert.ok(Math.abs(x) <= 1 && Math.abs(y) <= 1, `coin hors de l'écran à ${t} ms : ${x.toFixed(2)}, ${y.toFixed(2)}`)
    }
  }
})

test('avec une caisse américaine, le tour se fait aussi, cadre compris', () => {
  const director = chooseToile({ ...POSTER, frame: 'noir' })
  const back = director.view(1800, PORTRAIT).painting
  assert.ok(Math.abs(Math.abs(back.yaw) - Math.PI) < 0.5, `pas de dos à mi-parcours : ${back.yaw.toFixed(2)} rad`)
  assert.equal(back.framed, 1)
  for (let t = 0; t <= LATER; t += 16) {
    for (const c of paintingCorners(director.view(t, PORTRAIT).painting, 'outer')) assert.ok(c[2] >= -1e-6)
  }
})

test('choisir autre chose pendant le tour repart de la vue en cours, sans saut ni traversée du mur', () => {
  for (const at of [500, 1200, 1800, 2400, 3000]) {
    const director = chooseToile()
    const before = director.view(at - 1, PORTRAIT)
    const next = { ...POSTER, material: 'toile', frame: 'chene' }
    director.choose('frame', next, at)
    const after = director.view(at + 1, PORTRAIT)
    assert.ok(Math.abs(wrapped(before.painting.yaw - after.painting.yaw)) < 0.05, `saut d'angle à ${at} ms`)
    assert.ok(Math.hypot(...sub(before.camera.position, after.camera.position)) < 1, `saut de caméra à ${at} ms`)
    for (let t = at; t <= at + LATER; t += 16) {
      const view = director.view(t, PORTRAIT)
      for (const c of paintingCorners(view.painting, 'outer')) {
        assert.ok(c[2] >= -1e-6, `traversée du mur ${t - at} ms après le clic de ${at} ms`)
      }
    }
    const rest = director.view(at + LATER, PORTRAIT)
    assert.equal(rest.shot, 'corner')
    assert.equal(rest.painting.yaw, 0)
    assert.equal(rest.painting.z, 0)
  }
})

test('interrompu après le demi-tour, le tableau finit de tourner au lieu de revenir en arrière', () => {
  const director = chooseToile()
  const at = 2400
  const before = director.view(at, PORTRAIT).painting.yaw
  assert.ok(Math.abs(before) > Math.PI)
  director.choose('frame', { ...POSTER, material: 'toile', frame: 'chene' }, at)
  const soon = director.view(at + 200, PORTRAIT).painting.yaw
  assert.ok(Math.abs(wrapped(soon)) < Math.abs(wrapped(before)), 'il va vers la face par le plus court')
})

test('un tour interrompu se finit sur son propre chemin : même marge au mur, vitesse et recul sans à-coup', () => {
  for (const at of [900, 1800, 2400]) {
    const director = chooseToile()
    const earlier = director.view(at - 16, PORTRAIT).painting
    let { z: previousZ, yaw: previousYaw } = director.view(at, PORTRAIT).painting
    let previousStep = Math.abs(wrapped(previousYaw - earlier.yaw))
    director.choose('frame', { ...POSTER, material: 'toile', frame: 'chene' }, at)
    for (let t = at + 16; t <= at + 1400; t += 16) {
      const { z, yaw } = director.view(t, PORTRAIT).painting
      const step = Math.abs(wrapped(yaw - previousYaw))
      assert.ok(step < 0.11, `le tableau fouette ${t - at} ms après le clic : ${step.toFixed(3)} rad`)
      assert.ok(Math.abs(z - previousZ) < 1.3, `le recul saute ${t - at} ms après le clic`)
      assert.ok(Math.abs(step - previousStep) < 0.03, `la rotation casse ${t - at} ms après le clic`)
      previousZ = z
      previousYaw = yaw
      previousStep = step
    }
  }
})

test('choisir le poster pendant le tour ramène d’abord le tableau de face, sans le fouetter, puis soulève le coin', () => {
  const director = chooseToile()
  const at = 1800
  director.choose('material', { ...POSTER }, at)
  let previous = wrapped(director.view(at, PORTRAIT).painting.yaw)
  let most = 0
  for (let t = at; t <= at + LATER; t += 16) {
    const { yaw, curl, depth, z, paper } = director.view(t, PORTRAIT).painting
    const turned = wrapped(yaw)
    assert.ok(Math.abs(wrapped(turned - previous)) < 0.11, `le tableau fouette à ${t - at} ms`)
    previous = turned
    if (Math.abs(turned) > 0.5) assert.equal(paper, 0, 'il reste une toile tant qu’il tourne')
    most = Math.max(most, curl)
    if (curl > 0.001) {
      assert.ok(Math.abs(turned) < 1e-6 && z < 1e-6, 'le coin se soulève sur un poster à plat, au mur')
      assert.ok(depth <= 0.051, 'le coin se soulève sur une feuille fine')
    }
  }
  assert.equal(most, 1)
})

test('avec les animations réduites, choisir la toile ou le poster ne fait ni tour ni coin soulevé', () => {
  const toile = createDirector({ room: ROOM, product: POSTER, reducedMotion: true })
  toile.choose('material', { ...POSTER, material: 'toile' }, 0)
  assert.equal(toile.isMoving(1), false)
  assert.equal(toile.view(1, PORTRAIT).painting.yaw, 0)

  const poster = createDirector({ room: ROOM, product: TOILE, reducedMotion: true })
  poster.choose('material', { ...TOILE, material: 'poster' }, 0)
  assert.equal(poster.isMoving(1), false)
  assert.equal(poster.view(1, PORTRAIT).painting.curl, 0)
})

test('choisir le poster sans cadre soulève un coin du papier, qui s’enroule puis retombe, et revient de face', () => {
  const director = choosePoster()
  let most = 0
  let thinBeforeLift = true
  const curls = []
  for (let t = 0; t <= LATER; t += 16) {
    const { curl, depth } = director.view(t, PORTRAIT).painting
    curls.push(curl)
    most = Math.max(most, curl)
    if (curl > 0.01 && depth > 0.06) thinBeforeLift = false
  }
  assert.equal(most, 1)
  assert.ok(thinBeforeLift, 'le coin se soulève sur une feuille déjà fine')
  for (let i = 1; i < curls.length; i++) {
    assert.ok(Math.abs(curls[i] - curls[i - 1]) < 0.12, `le papier saute à ${i * 16} ms`)
  }
  const atMost = curls.indexOf(1)
  assert.ok(atMost * 16 >= 600, `le coin monte trop vite : ${atMost * 16} ms`)
  const rest = director.view(LATER, PORTRAIT)
  assert.equal(rest.shot, 'front')
  assert.equal(rest.painting.curl, 0)
  assert.equal(rest.painting.paper, 1)
})

test('le coin soulevé est à l’opposé de la lumière, et la caméra s’en approche', () => {
  const director = choosePoster()
  const atPeak = 1400
  const view = director.view(atPeak, PORTRAIT)
  assert.equal(view.painting.curl, 1)
  const corner = paintingCorners(view.painting).find((c) => c.side.x === curlCorner(ROOM).x && c.side.y === curlCorner(ROOM).y && c.side.z === 1)
  assert.ok(ROOM.light[0] * corner.side.x < 0, 'côté opposé à la fenêtre')
  const onScreen = project(view.camera, PORTRAIT, corner)
  assert.ok(Math.abs(onScreen.x) < 0.8 && Math.abs(onScreen.y) < 0.8, `coin hors du plan : ${onScreen.x.toFixed(2)}, ${onScreen.y.toFixed(2)}`)
  assert.ok(heightFraction(view, 40) > 1, 'la caméra se rapproche du coin')
})

test('choisir autre chose pendant que le coin est levé le fait retomber sans à-coup', () => {
  const director = choosePoster()
  const at = 1400
  director.choose('passe', { ...TOILE, material: 'poster', passe: true }, at)
  let previous = 1
  for (let t = at; t <= at + LATER; t += 16) {
    const { curl } = director.view(t, PORTRAIT).painting
    assert.ok(curl <= previous + 1e-9, 'le coin ne remonte pas')
    assert.ok(previous - curl < 0.12, 'le coin retombe sans saut')
    previous = curl
  }
  assert.equal(previous, 0)
  assert.equal(director.view(at + LATER, PORTRAIT).shot, 'margin')
})

test('choisir un cadre pendant que le coin est levé : le papier retombe avant que le verre arrive', () => {
  for (const at of [800, 1200, 1400, 1700, 2000]) {
    const director = choosePoster()
    director.choose('frame', { ...TOILE, material: 'poster', frame: 'chene' }, at)
    let sawFrame = false
    for (let t = at; t <= at + LATER; t += 16) {
      const { curl, framed } = director.view(t, PORTRAIT).painting
      if (curl > 0.001) assert.equal(framed, 0, `papier encore levé sous le cadre ${t - at} ms après le clic de ${at} ms`)
      if (framed > 0) sawFrame = true
    }
    assert.ok(sawFrame)
    assert.equal(director.view(at + LATER, PORTRAIT).shot, 'corner')
  }
})

test('le coin qui monte, interrompu, redescend par où il est monté', () => {
  const director = choosePoster()
  const at = 800
  const before = director.view(at, PORTRAIT).painting.curl
  assert.ok(before > 0 && before < 1)
  director.choose('passe', { ...TOILE, material: 'poster', passe: true }, at)
  const curls = []
  for (let t = at; t <= at + LATER; t += 16) curls.push(director.view(t, PORTRAIT).painting.curl)
  const peak = Math.max(...curls)
  assert.ok(peak < before + 0.1, `le papier continue de monter : ${before.toFixed(2)} puis ${peak.toFixed(2)}`)
  for (let i = curls.indexOf(peak) + 1; i < curls.length; i++) {
    assert.ok(curls[i] <= curls[i - 1] + 1e-9, 'une fois reparti, le coin ne remonte plus')
  }
  assert.equal(curls[curls.length - 1], 0)
})

// Angle (degrés, signé : positif si la caméra est à droite) entre la caméra et l'axe du
// tableau, vu de dessus.
function sideAngle(view) {
  const v = sub(view.camera.position, view.camera.target)
  return (Math.atan2(v[0], v[2]) * 180) / Math.PI
}

test("glisser le doigt incline légèrement le tableau, puis il revient de face avec un rebond", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.grab(0)
  director.drag(0.15, 0, 50)
  const tilted = sideAngle(director.view(50, PORTRAIT))
  assert.ok(tilted < -2, `glisser à droite fait tourner le tableau vers la droite (${tilted.toFixed(1)}°)`)

  director.drag(3, 3, 100) // bien au-delà de la borne
  const far = director.view(100, PORTRAIT)
  assert.ok(Math.abs(sideAngle(far)) <= 12.0001, `inclinaison bornée : ${sideAngle(far).toFixed(1)}°`)
  const held = sideAngle(far)

  director.release(100)
  let overshoot = 0
  for (let t = 100; t <= 1100; t += 10) {
    overshoot = Math.max(overshoot, sideAngle(director.view(t, PORTRAIT)) * Math.sign(-held))
  }
  assert.ok(overshoot > 0, 'le retour est élastique : il dépasse un peu la position de face')
  assert.ok(overshoot < 0.2 * Math.abs(held), `rebond trop fort : ${overshoot.toFixed(2)}°`)
  assert.ok(Math.abs(sideAngle(director.view(1100, PORTRAIT))) < 0.2, 'revenu de face en 1 s')
})

test("un choix fait pendant le rebond garde l'inclinaison du moment, sans la doubler", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.grab(0)
  director.drag(3, 0, 10) // inclinaison maximale
  director.release(20)
  const before = sideAngle(director.view(119, PORTRAIT))
  director.choose('border', { ...TOILE, border: 'noire' }, 120)
  const after = sideAngle(director.view(121, PORTRAIT))
  assert.ok(Math.abs(after - before) < 0.5, `l'inclinaison saute de ${before.toFixed(1)}° à ${after.toFixed(1)}°`)
})

test("toucher la 3D sans glisser (début d'un défilement de page) ne lance aucun rebond", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.grab(0)
  director.release(40)
  assert.equal(director.isMoving(60), false)
})

test("dans la pièce, le doigt n'incline rien : la photo ne se regarde que de face", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  director.grab(LATER)
  director.drag(0.3, 0.2, LATER + 50)
  assert.equal(sideAngle(director.view(LATER + 50, PORTRAIT)), 0)
})

test('avec les animations réduites, un choix coupe directement sur le plan, sans mouvement', () => {
  const director = createDirector({ room: ROOM, product: TOILE, reducedMotion: true })
  director.choose('border', { ...TOILE, border: 'pliee' }, 1000)
  const settled = createDirector({ room: ROOM, product: TOILE })
  settled.choose('border', { ...TOILE, border: 'pliee' }, 0)
  assertSameView(settled.view(LATER, PORTRAIT), director.view(1000, PORTRAIT), 'dès le clic')
  assert.equal(director.isMoving(1000), false)

  director.grab(2000)
  director.drag(0.3, 0, 2010)
  director.release(2020)
  assertSameView(settled.view(LATER, PORTRAIT), director.view(2020, PORTRAIT), 'au relâché')
})

test("la scène ne s'anime que pendant une transition, un glisser ou un rebond", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  assert.equal(director.isMoving(0), false)
  director.choose('frame', { ...TOILE, frame: 'noir' }, 100)
  assert.equal(director.isMoving(150), true)
  assert.equal(director.isMoving(100 + LATER), false)
  director.grab(LATER * 2)
  director.drag(0.1, 0, LATER * 2 + 5)
  assert.equal(director.isMoving(LATER * 2 + 10), true)
  director.release(LATER * 2 + 20)
  assert.equal(director.isMoving(LATER * 2 + 200), true)
  assert.equal(director.isMoving(LATER * 3), false)
})

test("sur un écran large, la vue de la pièce ne sort jamais de la photo", () => {
  const WIDE = 1.8
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const view = director.view(LATER, WIDE)
  const left = project(view.camera, WIDE, [ROOM.photo.left, 80, 0])
  const right = project(view.camera, WIDE, [ROOM.photo.right, 80, 0])
  assert.ok(left.x <= -0.999 && right.x >= 0.999, `bords de la photo à l'écran : ${left.x.toFixed(3)} / ${right.x.toFixed(3)}`)
})

test("dans la pièce, changer de taille garde la caméra et fait grandir le tableau sous les yeux", () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('size', { ...TOILE, size: '75x100' }, 0)
  const big = director.view(LATER, PORTRAIT)
  director.choose('size', { ...TOILE, size: '30x40' }, LATER)
  let previous = big.painting.width
  for (let t = LATER; t <= 2 * LATER; t += 20) {
    const view = director.view(t, PORTRAIT)
    assertSameView(big, view, `à ${t - LATER} ms`)
    assert.ok(view.painting.width <= previous + 1e-9, 'la largeur décroît sans à-coup')
    previous = view.painting.width
  }
  assert.equal(previous, 30)
})

test('un nouveau clic en pleine transition repart de la vue en cours, sans saut', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('border', { ...TOILE, border: 'noire' }, 0)
  const before = director.view(299, PORTRAIT)
  director.choose('size', { ...TOILE, border: 'noire', size: '75x100' }, 300)
  assertSameView(before, director.view(301, PORTRAIT), 'au second clic', 2)
})

test('changer de valeur dans le même groupe garde le plan en cours', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('border', { ...TOILE, border: 'miroir' }, 0)
  const edge = director.view(LATER, PORTRAIT)
  director.choose('border', { ...TOILE, border: 'noire' }, LATER)
  for (let t = LATER; t <= 2 * LATER; t += 50) {
    assertSameView(edge, director.view(t, PORTRAIT), `à ${t - LATER} ms`)
  }
})
