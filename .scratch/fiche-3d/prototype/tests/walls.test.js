import test from 'node:test'
import assert from 'node:assert/strict'
import { NEUTRAL_WALL, WALLS, wallOf } from '../src/walls.js'
import { wallMask } from '../tools/mur-piece.js'

test('le mur neutre vient en premier, sans tuile ; chaque mur d’essai a la sienne et sa largeur', () => {
  assert.equal(WALLS[0].id, NEUTRAL_WALL)
  assert.equal(WALLS[0].paint, undefined)
  const trials = WALLS.slice(1)
  assert.deepEqual(trials.map((wall) => wall.id), ['terre', 'carrelage', 'enfant'])
  for (const wall of trials) {
    assert.equal(typeof wall.paint, 'function', wall.id)
    assert.ok(wall.tileCm >= 40 && wall.tileCm <= 100, `${wall.id} : tuile de ${wall.tileCm} cm`)
  }
  for (const wall of WALLS) assert.match(wall.color, /^#[0-9a-f]{6}$/, `pastille de ${wall.id}`)
})

test('un mur inconnu retombe sur le neutre', () => {
  assert.equal(wallOf('terre').id, 'terre')
  assert.equal(wallOf('nulle-part').id, NEUTRAL_WALL)
})

// Image de 60 × 40 : un mur clair, un meuble sombre, un sol chaud sous la ligne y = 32.
function picture() {
  const width = 60, height = 40
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const furniture = x >= 20 && x < 40 && y >= 10 && y < 32
      const floor = y >= 32
      const [r, g, b] = floor ? [220, 190, 150] : furniture ? [120, 125, 125] : [232, 232, 231]
      rgba.set([r, g, b, 255], 4 * (y * width + x))
    }
  }
  return { rgba, width, height }
}

test('le masque du mur couvre le mur, et ni le meuble ni le sol', () => {
  const { rgba, width, height } = picture()
  const mask = wallMask(rgba, width, height, { seeds: [[0.1, 0.1]], floor: 32 / 40, grow: 0 })
  const at = (x, y) => mask[y * width + x]
  assert.equal(at(5, 5), 255, 'mur à gauche')
  assert.equal(at(55, 20), 255, 'mur à droite, rejoint par le haut')
  assert.equal(at(30, 20), 0, 'meuble')
  assert.equal(at(5, 36), 0, 'sol')
})

test('un morceau de mur sans point de départ reste à la photo', () => {
  const { rgba, width, height } = picture()
  // Le meuble touche le haut : le mur de droite n'est plus relié à celui de gauche.
  for (let y = 0; y < 10; y++) for (let x = 20; x < 40; x++) rgba.set([120, 125, 125, 255], 4 * (y * width + x))
  const mask = wallMask(rgba, width, height, { seeds: [[0.1, 0.1]], floor: 32 / 40, grow: 0 })
  assert.equal(mask[20 * width + 5], 255)
  assert.equal(mask[20 * width + 55], 0)
})
