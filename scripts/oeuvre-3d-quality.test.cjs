// Tests de la qualité de rendu de assets/oeuvre-3d-engine.js, repris du prototype (ticket 02).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { densityForCost, isSluggishRun, isTooSlow, renderDensity } = require('../assets/oeuvre-3d-engine.js')

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

test('un appareil que le calibrage ramène sous le budget garde la 3D', () => {
  assert.equal(isTooSlow(3, 6, 3), false)
  assert.equal(isTooSlow(3, 40.5, 2), false) // 18 ms une fois la densité baissée
})

test('un appareil qui reste sous 24 images par seconde à la densité la plus basse reste sur les photos', () => {
  assert.equal(isTooSlow(1.5, 60, 1.5), true)
  assert.equal(isTooSlow(3, 200, 1.5), true) // 50 ms par image à densité 1,5
  assert.equal(isTooSlow(3, 150, 1.5), false) // 37,5 ms : 26 images par seconde
})

const frames = (count, step) => Array.from({ length: count }, (_, i) => i * step)

test('une animation fluide est fluide', () => {
  assert.equal(isSluggishRun(frames(60, 16)), false)
})

test('une animation sous 24 images par seconde est trop lente', () => {
  assert.equal(isSluggishRun(frames(40, 60)), true)
})

test('trop peu d’images ne disent rien : un clic bref ne juge pas l’appareil', () => {
  assert.equal(isSluggishRun(frames(10, 60)), false)
})

test('une pause isolée ne compte pas : le visiteur a pu changer d’onglet pendant l’animation', () => {
  const run = frames(60, 16)
  for (let i = 30; i < run.length; i++) run[i] += 8000
  assert.equal(isSluggishRun(run), false)
})
