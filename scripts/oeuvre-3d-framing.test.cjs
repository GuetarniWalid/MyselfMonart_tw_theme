// Tests du cadrage de la 3D de la fiche (assets/oeuvre-3d-chips.js), repris de la maquette (version 26).
// Lancer : node --test scripts/oeuvre-3d-framing.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { chipsLayout, railPlacement, canvasBox, directorAspect, framingAt, railZone } = require('../assets/oeuvre-3d-chips.js')

/* Cadrage de la 3D : au repos, l'image de la scène remontée sur l'œuvre du design ; rangée ouverte,
   pendant une mise en scène, l'image de la zone visible au-dessus de la rangée, posée dans cette zone. */

const FORMATS = { '2b': [390, 792], '3a': [375, 615], '3b': [375, 501], '3c': [1440, 748] }

test('la zone visible s’arrête au haut de la plus haute rangée, pour les quatre formats', () => {
  for (const [name, [width, height]] of Object.entries(FORMATS)) {
    const L = chipsLayout({ width, height })
    const zone = railZone(L)
    assert.equal(zone.height, railPlacement(L, true).top, name)
    assert.equal(zone.center, zone.height / 2, name)
    for (const note of [false, true]) assert.ok(railPlacement(L, note).top >= zone.height, `${name} : la rangée reste sous la zone`)
  }
})

test('le canvas couvre toute la scène, au repos, rangée ouverte et dans la zone', () => {
  for (const [name, [width, height]] of Object.entries(FORMATS)) {
    const L = chipsLayout({ width, height })
    const box = canvasBox(L)
    const zone = railZone(L)
    // Centre du canvas dans la scène : l'œuvre au repos, l'œuvre remontée, puis le milieu de la zone.
    const shift = railPlacement(L, true).shift
    for (const center of [L.cy, L.cy - shift, zone.center]) {
      assert.ok(center - box.height / 2 <= 0.5, `${name} : haut couvert (${center})`)
      assert.ok(center + box.height / 2 >= height - 0.5, `${name} : bas couvert (${center})`)
    }
    assert.ok(Math.abs(box.top + box.height / 2 - L.cy) <= 0.5, `${name} : canvas centré sur l'œuvre`)
  }
})

test('au repos (poids 0), rien ne change : forme d’écran et angle de vue de la version 14', () => {
  const L = chipsLayout({ width: 375, height: 615 })
  const box = canvasBox(L)
  const rest = framingAt(L, { w: 0, shift: 22, glH: box.height })
  assert.equal(rest.h, 615)
  assert.equal(rest.offset, 0)
  assert.equal(rest.fovScale, box.height / 615)
  assert.equal(rest.aspect, directorAspect({ w: 375, h: 615, paintW: L.art.w }))
  // La forme du tableau de face de la version 14 : 243 px de large pour 0,72 de la hauteur.
  assert.ok(Math.abs(rest.aspect - 243 / (0.72 * 615)) < 1e-6)
})

test('rangée ouverte (poids 1), l’image de la mise en scène occupe la zone au-dessus de la rangée', () => {
  for (const [name, [width, height]] of Object.entries(FORMATS)) {
    const L = chipsLayout({ width, height })
    const box = canvasBox(L)
    const zone = railZone(L)
    const shift = railPlacement(L, false).shift
    const f = framingAt(L, { w: 1, shift, glH: box.height })
    assert.equal(f.h, zone.height, name)
    // Le canvas, dans la scène remontée de `shift`, a son centre au milieu de la zone.
    assert.ok(Math.abs(L.cy + f.offset - shift - zone.center) < 1e-9, name)
    assert.equal(f.fovScale, box.height / zone.height, name)
  }
})

test('entre les deux, le cadrage glisse sans saut', () => {
  const L = chipsLayout({ width: 375, height: 615 })
  const box = canvasBox(L)
  let last = null
  for (let i = 0; i <= 20; i++) {
    const f = framingAt(L, { w: i / 20, shift: 22, glH: box.height })
    if (last) {
      assert.ok(Math.abs(f.h - last.h) < 12 && Math.abs(f.offset - last.offset) < 12, `pas ${i}`)
      assert.ok(f.h <= last.h && f.offset <= last.offset, `pas ${i} : sens constant`)
    }
    last = f
  }
})
