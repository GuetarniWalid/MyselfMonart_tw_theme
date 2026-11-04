import { test } from 'node:test'
import assert from 'node:assert/strict'
import { densityForCost, renderDensity } from '../src/quality.js'

const PHONE = { width: 390, height: 487 } // scène 3D sur un téléphone, en pixels CSS

test("un téléphone dense est rendu à sa vraie densité, sans agrandissement par l'écran", () => {
  assert.equal(renderDensity({ ...PHONE, dpr: 2 }), 2)
  assert.equal(renderDensity({ ...PHONE, dpr: 3 }), 3)
  assert.equal(renderDensity({ ...PHONE, dpr: 2.625 }), 2.625)
})

test('au-delà de la densité 3, le gain ne se voit plus : on plafonne', () => {
  assert.equal(renderDensity({ ...PHONE, dpr: 4 }), 3)
})

test("un écran classique garde sa densité : on n'agrandit jamais moins net que l'écran", () => {
  assert.equal(renderDensity({ width: 965, height: 1000, dpr: 1 }), 1)
})

test('une grande scène garde la densité 2, sans le supplément au-delà du budget de pixels', () => {
  const big = { width: 1200, height: 1000 }
  assert.equal(renderDensity({ ...big, dpr: 2 }), 2)
  assert.equal(renderDensity({ ...big, dpr: 3 }), 2)
  const medium = { width: 700, height: 700 }
  const density = renderDensity({ ...medium, dpr: 3 })
  assert.ok(density > 2 && density < 3, `densité ${density}`)
  assert.ok(medium.width * density * medium.height * density <= 2.7e6)
})

test('une image qui se dessine vite garde toute sa densité', () => {
  assert.equal(densityForCost(3, 6), 3)
  assert.equal(densityForCost(3, 18), 3)
})

test("une image trop lente fait baisser la densité d'autant, avant la première animation", () => {
  assert.equal(densityForCost(3, 40.5), 2) // 2,25 fois moins de pixels pour 2,25 fois trop de temps
})

test('la densité ne descend jamais sous 1,5, ni au-dessous de ce que l’écran affiche', () => {
  assert.equal(densityForCost(3, 1000), 1.5)
  assert.equal(densityForCost(1, 1000), 1)
})
