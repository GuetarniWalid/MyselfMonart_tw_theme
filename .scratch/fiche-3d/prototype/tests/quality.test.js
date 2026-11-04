import { test } from 'node:test'
import assert from 'node:assert/strict'
import { densityAfterRun, renderDensity } from '../src/quality.js'

const PHONE = { width: 390, height: 487 } // scène 3D sur un téléphone, en pixels CSS

test("un téléphone dense est rendu à sa vraie densité, sans agrandissement par l'écran", () => {
  assert.equal(renderDensity({ ...PHONE, dpr: 2 }), 2)
  assert.equal(renderDensity({ ...PHONE, dpr: 3 }), 3)
  assert.equal(renderDensity({ ...PHONE, dpr: 2.625 }), 2.625)
})

test('au-delà de la densité 3, le gain ne se voit plus : on plafonne', () => {
  assert.equal(renderDensity({ ...PHONE, dpr: 4 }), 3)
})

test("une grande scène reste sous le budget de pixels, quelle que soit la densité de l'écran", () => {
  const stage = { width: 1200, height: 1000 }
  const density = renderDensity({ ...stage, dpr: 2 })
  assert.ok(density < 2)
  const pixels = stage.width * density * stage.height * density
  assert.ok(pixels <= 2.7e6, `${Math.round(pixels / 1e4) / 100} Mpx`)
})

test("une animation fluide ne change rien, une animation lente fait baisser la densité d'un cran", () => {
  assert.equal(densityAfterRun(3, 58), 3)
  assert.equal(densityAfterRun(3, 28), 2.25)
  assert.equal(densityAfterRun(2.25, 28), 1.5)
})

test('la densité ne descend jamais sous 1,5, ni au-dessous de ce que l’écran affiche', () => {
  assert.equal(densityAfterRun(1.5, 20), 1.5)
  assert.equal(densityAfterRun(1, 20), 1)
})
