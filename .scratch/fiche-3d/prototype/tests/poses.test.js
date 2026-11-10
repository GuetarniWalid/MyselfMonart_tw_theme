import test from 'node:test'
import assert from 'node:assert/strict'
import { BEYOND, createDirector, paintingCorners, posePlacement } from '../src/staging.js'
import { ROOM } from '../src/room.js'
import { POSES } from '../src/poses.js'
import { SIZES, canFrame } from '../src/catalog.js'

/* Mise en scène de la taille avec la femme (choix de Walid du 10/11) : la photo de la taille en
   cours remplace le salon, le tableau 3D est posé sur le rectangle de la photo, à la vraie échelle
   (16 px/cm), et le cadrage tient la femme et le tableau au-dessus de la rangée ouverte. */

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const LATER = 5000
// Formes réelles de la zone au-dessus de la rangée ouverte : 390 × 844, 375 × 667, 375 × 553, 1440 × 820,
// et le coin qu'y prend le bouton « De face », en haut à gauche (part de la hauteur et de la largeur).
const ZONES = [0.68, 0.92, 1.07, 2.53]
const INSETS = [
  { top: 62 / 572, left: 111 / 390 }, { top: 62 / 409, left: 111 / 375 },
  { top: 62 / 351, left: 111 / 375 }, { top: 74 / 569, left: 123 / 1440 },
]

const unit = (v) => { const n = Math.hypot(...v); return v.map((c) => c / n) }
const sub = (a, b) => a.map((v, i) => v - b[i])
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

function basis(camera) {
  const forward = unit(sub(camera.target, camera.position))
  const right = unit(cross(forward, [0, 1, 0]))
  return { forward, right, up: cross(right, forward), t: Math.tan(camera.fovY / 2) }
}
// Place d'un point à l'écran, de -1 à 1 sur chaque axe.
function project(camera, aspect, point) {
  const { forward, right, up, t } = basis(camera)
  const rel = sub(point, camera.position)
  const depth = dot(rel, forward)
  return { x: dot(rel, right) / (depth * t * aspect), y: dot(rel, up) / (depth * t), depth }
}
// Point du mur (z = 0) vu à la place (sx, sy) de l'écran.
function onWall(camera, aspect, sx, sy) {
  const { forward, right, up, t } = basis(camera)
  const ray = forward.map((f, k) => f + right[k] * sx * t * aspect + up[k] * sy * t)
  const reach = -camera.position[2] / ray[2]
  return [camera.position[0] + ray[0] * reach, camera.position[1] + ray[1] * reach]
}
const inside = (s, label) => assert.ok(Math.abs(s.x) <= 1 + 1e-9 && Math.abs(s.y) <= 1 + 1e-9, `${label} hors de l'écran (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`)

// La page donne au directeur une forme pour la vue de face, et celle de l'écran réel.
function sizeView(product, screen, aspect = screen, inset = undefined) {
  const director = createDirector({ room: ROOM, poses: POSES, product: TOILE })
  director.choose('size', product, 0)
  return director.view(LATER, aspect, screen, inset)
}
const near = (actual, expected, label, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} : ${actual} au lieu de ${expected}`)

test('choisir une taille montre la femme de cette taille, seule, à la place du salon', () => {
  for (const size of SIZES) {
    const view = sizeView({ ...TOILE, size }, 0.92)
    assert.equal(view.shot, 'room')
    assert.equal(view.room, 1)
    assert.deepEqual(view.poses, SIZES.map((s) => (s === size ? 1 : 0)), size)
  }
})

test('le tableau est posé exactement sur le rectangle de la photo, à la vraie échelle, cadre ou non', () => {
  for (const size of SIZES) {
    for (const frame of canFrame(size) ? ['sans', 'chene'] : ['sans']) {
      const product = { ...TOILE, size, frame }
      const p = sizeView(product, 0.92).painting
      const { photo, rect } = posePlacement(POSES, size)
      near(p.x - p.width / 2, rect.left, `${size} ${frame}, bord gauche`)
      near(p.x + p.width / 2, rect.right, `${size} ${frame}, bord droit`)
      near(p.y + p.height / 2, rect.top, `${size} ${frame}, haut`)
      near(p.y - p.height / 2, rect.bottom, `${size} ${frame}, bas`)
      near(rect.right - rect.left, p.width, `${size}, largeur à 16 px/cm`)
      near(photo.right - photo.left, POSES.px[0] / POSES.pxPerCm, `${size}, 300 cm de mur`)
      near(photo.bottom, -(POSES.px[1] - POSES.floorPx) / POSES.pxPerCm, `${size}, pied du mur en y = 0`)
      assert.equal(p.z, 0, 'au mur')
    }
  }
})

test('le tableau ne glisse pas sur le mur entre la vue de face et la pose', () => {
  for (const size of SIZES) {
    const product = { ...TOILE, size }
    const director = createDirector({ room: ROOM, poses: POSES, product })
    const front = director.view(0, 0.8).painting
    director.choose('size', product, 0)
    for (const t of [200, 450, 900, LATER]) {
      const p = director.view(t, 0.8, 0.92).painting
      near(p.x, front.x, `${size} à ${t} ms, x`)
      near(p.y, front.y, `${size} à ${t} ms, y`)
    }
  }
})

ZONES.forEach((screen, z) => {
  test(`zone ${screen} : cadrage sur la femme et le tableau, sans voir le bord de la photo`, () => {
    for (const size of SIZES) {
      for (const frame of canFrame(size) ? ['sans', 'chene'] : ['sans']) {
        const product = { ...TOILE, size, frame }
        // Sur le 390 × 844, la page donne au directeur une forme plus étroite que l'écran (vue de face).
        const view = sizeView(product, screen, screen * 0.9, INSETS[z])
        const { photo, person, head } = posePlacement(POSES, size)
        const label = `${size} ${frame}`
        // Les coins de l'écran restent dans la photo prolongée, jamais sous son sol.
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const [x, y] = onWall(view.camera, screen, sx, sy)
          assert.ok(x >= photo.left - BEYOND.side - 0.5 && x <= photo.right + BEYOND.side + 0.5 &&
            y >= photo.bottom - 0.5 && y <= photo.top + BEYOND.top + 0.5,
          `${label} : coin (${sx}, ${sy}) hors de la photo prolongée, en ${x.toFixed(1)}, ${y.toFixed(1)}`)
        }
        // À droite, la femme est près du bord : le mur n'y est pas prolongé (le miroir d'une bande
        // étroite se verrait).
        const [rightEdge] = onWall(view.camera, screen, 1, 0)
        assert.ok(rightEdge <= photo.right + 0.5, `${label} : la vue dépasse la photo à droite (${rightEdge.toFixed(1)} cm)`)
        // Le tableau, ses cotes et l'étiquette de la cote de hauteur, en entier.
        for (const c of paintingCorners(view.painting, 'outer').filter((q) => q.side.z === 1)) inside(project(view.camera, screen, c), `${label} : coin du tableau`)
        for (const end of [view.dims.width.a, view.dims.width.b, view.dims.height.a, view.dims.height.b]) inside(project(view.camera, screen, end), `${label} : cote`)
        inside(project(view.camera, screen, [view.dims.height.a[0] - 6, view.painting.y, 0]), `${label} : étiquette de la cote de hauteur`)
        // ... jamais sous le bouton « De face » (l'étiquette de la cote de largeur au-dessus de sa ligne).
        const outer = view.painting.outer
        const roof = Math.max(view.painting.y + outer.height / 2, view.dims.under ? -Infinity : view.dims.width.a[1] + 10)
        const corner = project(view.camera, screen, [view.dims.height.a[0] - 7, roof, 0])
        const hidden = (corner.x + 1) / 2 < INSETS[z].left && (1 - corner.y) / 2 < INSETS[z].top
        assert.ok(!hidden, `${label} : le tableau ou ses cotes sous le bouton « De face » (${corner.x.toFixed(2)}, ${corner.y.toFixed(2)})`)
        // La tête de la femme toujours, ses pieds sur un écran en hauteur.
        for (const [x, y] of [[head.left, head.top], [head.right, head.top], [head.left, head.bottom], [head.right, head.bottom]]) {
          inside(project(view.camera, screen, [x, y, 0]), `${label} : tête`)
        }
        if (screen <= 1) inside(project(view.camera, screen, [(person.left + person.right) / 2, person.bottom, 0]), `${label} : pieds`)
        // Pas de mur vide inutile : de haut en bas, la femme, le tableau et sa cote de largeur (son
        // étiquette au-dessus de la ligne) prennent l'essentiel de la vue...
        const paintingTop = view.painting.y + view.painting.outer.height / 2
        const tops = [person.top, paintingTop, view.dims.under ? paintingTop : view.dims.width.a[1] + 10]
        const bottoms = [person.bottom, view.painting.y - view.painting.outer.height / 2, view.dims.width.a[1]]
        const span = (Math.min(1, project(view.camera, screen, [0, Math.max(...tops), 0]).y) -
          Math.max(-1, project(view.camera, screen, [0, Math.min(...bottoms), 0]).y)) / 2
        assert.ok(span >= 0.75, `${label} : la femme et le tableau ne prennent que ${(span * 100).toFixed(0)} % de la hauteur`)
        // ... et sur un écran large, le mur vide sur les côtés n'en prend pas plus d'un cinquième,
        // sauf s'il faut la place pour le tableau et ses cotes.
        if (screen > 1) {
          const [left] = onWall(view.camera, screen, -1, 0)
          const [right] = onWall(view.camera, screen, 1, 0)
          const content = Math.max(person.right, view.painting.x + view.painting.outer.width / 2) - (view.dims.height.a[0] - 7)
          const tight = (view.painting.outer.height + 30) * screen // ce que le tableau et ses cotes demandent au moins
          assert.ok(right - left <= Math.max(content / 0.8, tight * 1.12) + 1e-6, `${label} : ${(right - left).toFixed(0)} cm de large pour ${content.toFixed(0)} cm de contenu`)
        }
      }
    }
  })
})

test('passer d’une taille à l’autre fond une pose dans l’autre, pendant que le tableau change de taille', () => {
  const director = createDirector({ room: ROOM, poses: POSES, product: TOILE })
  director.choose('size', TOILE, 0)
  director.choose('size', { ...TOILE, size: '90x120' }, LATER)
  let previous = director.view(LATER, 0.92)
  let mixed = false
  for (let t = LATER; t <= 2 * LATER; t += 20) {
    const view = director.view(t, 0.92)
    const [a, , , b] = view.poses
    near(a + b, 1, `à ${t - LATER} ms, les deux poses`, 1e-9)
    assert.ok(b >= previous.poses[3] - 1e-9, 'le fondu ne recule pas')
    assert.equal(view.poses[1] + view.poses[2], 0, 'aucune autre pose')
    assert.ok(view.painting.width >= previous.painting.width - 1e-9, 'le tableau grandit sans à-coup')
    assert.equal(view.room, 1, 'la pièce reste')
    if (a > 0.1 && b > 0.1) mixed = true
    previous = view
  }
  assert.ok(mixed, 'les deux poses se mêlent un moment')
  assert.deepEqual(previous.poses, [0, 0, 0, 1])
  assert.equal(previous.painting.width, 90)
})

test('la cote de hauteur passe à gauche du tableau, dans tous les plans : la femme est à droite', () => {
  for (const size of SIZES) {
    const view = sizeView({ ...TOILE, size }, 0.92)
    const left = view.painting.x - view.painting.width / 2
    assert.ok(view.dims.height.a[0] < left && view.dims.height.b[0] < left, `${size} : cote à droite`)
    assert.equal(view.dims.opacity, 1)
    assert.equal(view.dims.side, -1)
  }
  const director = createDirector({ room: ROOM, poses: POSES, product: TOILE })
  assert.equal(director.view(0, 0.8).dims.side, -1, 'de face aussi (invisible) : pas de traversée en fondu')
})

test('les autres plans ne montrent aucune pose ; sans poses, le salon reste comme avant', () => {
  const director = createDirector({ room: ROOM, poses: POSES, product: TOILE })
  director.choose('border', TOILE, 0)
  assert.deepEqual(director.view(LATER, 0.92).poses, [0, 0, 0, 0])
  const salon = createDirector({ room: ROOM, product: TOILE })
  const front = salon.view(0, 0.92).painting
  salon.choose('size', TOILE, 0)
  const view = salon.view(LATER, 0.92)
  assert.equal(view.room, 1)
  assert.deepEqual(view.poses, [0, 0, 0, 0])
  assert.equal(view.dims.side, 1)
  assert.deepEqual([front.x, front.y], [ROOM.hang.x, ROOM.hang.minBottom + 20], 'accroché au-dessus du canapé')
})
