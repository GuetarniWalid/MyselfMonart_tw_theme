import test from 'node:test'
import assert from 'node:assert/strict'
import { BORDERS, FRAMES, SIZES, fitChoice } from '../src/catalog.js'
import { ROOM } from '../src/room.js'
import { thumbView } from '../src/thumbs.js'

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster' }

const cameraOf = (group, product) => {
  const { position, target, fovY } = thumbView(ROOM, group, fitChoice(product)).camera
  return [...position, ...target, fovY].map((v) => Math.round(v * 1000) / 1000)
}

test('chaque vignette a un plan fini, pour chaque choix, en toile comme en poster', () => {
  for (const base of [TOILE, POSTER, { ...TOILE, frame: 'chene', size: '75x100' }]) {
    const choices = {
      material: ['toile', 'poster'].map((material) => ({ material })),
      size: SIZES.map((size) => ({ size })),
      border: BORDERS.map(({ id }) => ({ border: id })),
      frame: FRAMES.map(({ id }) => ({ frame: id })),
      passe: [{ passe: false }, { passe: true }],
    }
    for (const [group, list] of Object.entries(choices)) {
      for (const choice of list) {
        const view = thumbView(ROOM, group, fitChoice({ ...base, ...choice }))
        assert.ok([...view.camera.position, ...view.camera.target].every(Number.isFinite), `${group} ${JSON.stringify(choice)}`)
      }
    }
  }
})

test('dans une rangée, seul le choix change : le cadrage reste le même', () => {
  const same = (group, products) => {
    const [first, ...others] = products.map((p) => cameraOf(group, p))
    for (const other of others) assert.deepEqual(other, first, group)
  }
  same('size', SIZES.map((size) => ({ ...TOILE, size, frame: 'noir' })))
  same('border', BORDERS.map(({ id }) => ({ ...TOILE, border: id })))
  same('frame', FRAMES.map(({ id }) => ({ ...TOILE, frame: id })))
  same('frame', FRAMES.filter((f) => f.materials.includes('poster')).map(({ id }) => ({ ...POSTER, frame: id })))
  same('passe', [{ ...POSTER, passe: false }, { ...POSTER, passe: true }])
})

test('la vignette de la matière montre la toile tournée, le poster le coin soulevé', () => {
  const toile = thumbView(ROOM, 'material', TOILE)
  assert.ok(Math.abs(toile.painting.yaw) > 0.3 && Math.abs(toile.painting.yaw) < 1, `toile tournée de ${toile.painting.yaw} rad`)
  assert.ok(thumbView(ROOM, 'material', POSTER).painting.curl > 0.9)
  assert.equal(thumbView(ROOM, 'material', { ...POSTER, frame: 'noir' }).painting.curl, 0)
})

test('la vignette des tailles montre la pièce, la même pour les quatre tailles', () => {
  for (const size of SIZES) assert.equal(thumbView(ROOM, 'size', { ...TOILE, size }).room, 1)
})
