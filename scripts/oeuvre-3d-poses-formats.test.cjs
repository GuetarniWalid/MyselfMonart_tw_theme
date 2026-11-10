// La Taille avec la femme pour le paysage 4:3 et le carré 1:1 (assets/oeuvre-3d-engine.js) : les photos
// de pose ne montrent que des portraits 3:4 ; ces formats y sont posés par la même règle.
// Lancer : node --test scripts/oeuvre-3d-poses-formats.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { createDirector, neutralRoom, paintingCorners, posePlacement, posesFor, POSES } = require('../assets/oeuvre-3d-engine.js')

const PORTRAIT = ['30x40', '60x80', '75x100', '90x120']
const LANDSCAPE = ['40x30', '80x60', '100x75', '120x90']
const SQUARE = ['40x40', '60x60', '80x80', '100x100']
const LATER = 5000
const toile = (size, frame = 'sans') => ({ material: 'toile', size, border: 'blanche', frame, passe: false })
// Formes de la zone au-dessus de la rangée ouverte (390 × 844, 375 × 667, 375 × 553, 1440 × 820) et le
// coin du bouton « De face », comme dans scripts/oeuvre-3d-poses.test.cjs.
const ZONES = [0.68, 0.92, 1.07, 2.53]
const INSETS = [
  { top: 62 / 572, left: 111 / 390 }, { top: 62 / 409, left: 111 / 375 },
  { top: 62 / 351, left: 111 / 375 }, { top: 74 / 569, left: 123 / 1440 },
]

const near = (actual, expected, label, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} : ${actual} au lieu de ${expected}`)

function sizeView(sizes, product, screen, aspect = screen, inset = undefined) {
  const director = createDirector({ room: neutralRoom(sizes), poses: posesFor(sizes), product: toile(sizes[0]) })
  director.choose('size', product, 0)
  return director.view(LATER, aspect, screen, inset)
}

// Projection sténopé indépendante du code testé : place d'un point à l'écran, de -1 à 1 sur chaque axe.
function project(camera, aspect, [x, y, z]) {
  const depth = camera.position[2] - z
  const half = depth * Math.tan(camera.fovY / 2)
  return { x: (x - camera.target[0]) / (half * aspect), y: (y - camera.target[1]) / half }
}
const inside = (s, label) => assert.ok(Math.abs(s.x) <= 1 + 1e-9 && Math.abs(s.y) <= 1 + 1e-9, `${label} hors de l'écran (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`)

test('chaque taille prend la pose de la taille la plus proche : le portrait la sienne', () => {
  const expected = {
    '30x40': '30x40', '60x80': '60x80', '75x100': '75x100', '90x120': '90x120',
    '40x30': '30x40', '80x60': '60x80', '100x75': '75x100', '120x90': '90x120',
    '40x40': '30x40', '60x60': '60x80', '80x80': '75x100', '100x100': '90x120',
  }
  for (const sizes of [PORTRAIT, LANDSCAPE, SQUARE]) {
    const poses = posesFor(sizes)
    assert.deepEqual(poses.sizes, sizes)
    for (const size of sizes) {
      assert.equal(poses.bySize[size].pose, expected[size], size)
      assert.deepEqual(poses.bySize[size].rect, POSES.bySize[expected[size]].rect, `${size} : le rectangle de sa pose`)
    }
  }
})

test('les images de chaque pose viennent de la page, une fois par pose', () => {
  const files = (pose) => ({ image: `photo-${pose}.webp`, figure: `calque-${pose}.webp`, light: `lumiere-${pose}.png` })
  const poses = posesFor(LANDSCAPE, files)
  assert.deepEqual(
    [poses.bySize['120x90'].image, poses.bySize['120x90'].figure, poses.bySize['120x90'].light],
    ['photo-90x120.webp', 'calque-90x120.webp', 'lumiere-90x120.png'],
  )
})

test('paysage et carré : accrochés au coin que sa main présente, ils grandissent vers le haut et vers la gauche', () => {
  const k = 1 / (POSES.pxPerCm * POSES.scale)
  for (const sizes of [LANDSCAPE, SQUARE]) {
    const poses = posesFor(sizes)
    for (const size of sizes) {
      for (const frame of size === sizes[3] ? ['sans'] : ['sans', 'chene']) {
        const p = sizeView(sizes, toile(size, frame), 0.92).painting
        const [L, T, W, H] = poses.bySize[size].rect
        const [w, h] = size.split('x').map(Number)
        // Le coin bas côté femme (à droite) au coin du rectangle de sa pose, à ses vraies mesures.
        near(p.x + p.width / 2, (L + W) * k, `${size} ${frame}, bord droit`)
        near(p.y - p.height / 2, (POSES.floorPx - T - H) * k, `${size} ${frame}, bas`)
        assert.equal(p.width, w, `${size}, largeur`)
        assert.equal(p.height, h, `${size}, hauteur`)
        const { rect } = posePlacement(poses, size)
        near(rect.left, (L + W) * k - w, `${size}, il grandit vers la gauche`)
        near(rect.top, (POSES.floorPx - T - H) * k + h, `${size}, il grandit vers le haut`)
      }
    }
  }
})

for (const [name, sizes] of [['paysage', LANDSCAPE], ['carré', SQUARE]]) {
  ZONES.forEach((screen, z) => {
    test(`${name}, zone ${screen} : le tableau, ses cotes et la tête de la femme se voient au-dessus de la rangée`, () => {
      const poses = posesFor(sizes)
      for (const size of sizes) {
        const view = sizeView(sizes, toile(size), screen, screen * 0.9, INSETS[z])
        const { head } = posePlacement(poses, size)
        assert.equal(view.shot, 'room')
        assert.deepEqual(view.poses, sizes.map((s) => (s === size ? 1 : 0)), `${size} : sa pose seule`)
        for (const c of paintingCorners(view.painting, 'outer').filter((q) => q.side.z === 1)) inside(project(view.camera, screen, c), `${size} : coin du tableau`)
        for (const end of [view.dims.width.a, view.dims.width.b, view.dims.height.a, view.dims.height.b]) inside(project(view.camera, screen, end), `${size} : cote`)
        for (const [x, y] of [[head.left, head.top], [head.right, head.top], [head.left, head.bottom], [head.right, head.bottom]]) {
          inside(project(view.camera, screen, [x, y, 0]), `${size} : tête`)
        }
      }
    })
  })
}
