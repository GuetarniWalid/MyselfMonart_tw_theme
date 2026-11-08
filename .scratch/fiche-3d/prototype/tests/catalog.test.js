import test from 'node:test'
import assert from 'node:assert/strict'
import { FRAMES, SIZES, canFrame, fitChoice, frameFits, priceOf } from '../src/catalog.js'

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster' }

test('les quatre tailles de la fiche, de la plus petite à la plus grande', () => {
  assert.deepEqual(SIZES, ['30x40', '60x80', '75x100', '90x120'])
})

test('les prix sont ceux de la boutique, pour chaque taille', () => {
  const toile = { '30x40': 62.5, '60x80': 94, '75x100': 136.5, '90x120': 199 }
  const poster = { '30x40': 24.9, '60x80': 44.9, '75x100': 64.9, '90x120': 71.9 }
  const framed = { '30x40': 47.9, '60x80': 94.9, '75x100': 159.9 }
  for (const size of SIZES) {
    assert.equal(priceOf({ ...TOILE, size }), toile[size])
    assert.equal(priceOf({ ...POSTER, size }), poster[size])
    if (canFrame(size)) assert.equal(priceOf({ ...POSTER, size, frame: 'chene' }), framed[size])
  }
  assert.equal(priceOf({ ...TOILE, size: '60x80', border: 'miroir', frame: 'chene' }), 150)
  assert.equal(priceOf({ ...TOILE, size: '90x120', border: 'pliee' }), 207)
})

test('le 90 × 120 ne se vend pas encadré : le choix repasse sans cadre, en poster comme en toile', () => {
  assert.equal(canFrame('90x120'), false)
  for (const size of ['30x40', '60x80', '75x100']) assert.equal(canFrame(size), true)
  for (const material of ['poster', 'toile']) {
    const big = { ...TOILE, material, size: '90x120', frame: 'noir' }
    assert.equal(fitChoice(big).frame, 'sans')
  }
  const small = { ...POSTER, size: '75x100', frame: 'noir' }
  assert.equal(fitChoice(small), small)
})

test('les six cadres de la toile, aux prix de la boutique (relevés le 08/11/2026)', () => {
  assert.deepEqual(FRAMES.map((f) => f.id), ['sans', 'blanc', 'noir', 'argent', 'chene', 'noyer'])
  const add = { sans: 0, blanc: 40, noir: 40, argent: 45, chene: 50, noyer: 50 }
  for (const [frame, extra] of Object.entries(add)) {
    assert.equal(priceOf({ ...TOILE, size: '60x80', border: 'noire', frame }), 94 + 2 + extra)
  }
})

test("le poster n'a pas l'argent ancien : il repasse sans cadre ; ses autres cadres ont le prix « avec cadre »", () => {
  assert.equal(frameFits(POSTER, 'argent'), false)
  assert.equal(frameFits(TOILE, 'argent'), true)
  assert.equal(fitChoice({ ...POSTER, frame: 'argent' }).frame, 'sans')
  for (const frame of ['blanc', 'noir', 'chene', 'noyer']) assert.equal(priceOf({ ...POSTER, size: '60x80', frame }), 94.9)
})
