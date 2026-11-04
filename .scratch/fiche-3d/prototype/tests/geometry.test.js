import test from 'node:test'
import assert from 'node:assert/strict'
import { artBox, frameProfile, frameRing } from '../src/geometry.js'
import { FRAME_PROFILE } from '../src/catalog.js'

// Ce que l'arrondi retire au coin d'un rectangle 30 × 40, le long de la diagonale.
function cornerGap(paper) {
  const { position } = artBox({ width: 30, height: 40, depth: 0.05, border: 'blanche', paper })
  let far = 0
  for (let i = 0; i < position.length; i += 3) far = Math.max(far, Math.hypot(position[i], position[i + 1]))
  return Math.hypot(15, 20) - far
}

test('la toile a des coins arrondis, la feuille de papier des coins vifs', () => {
  assert.ok(cornerGap(0) > 0.1, `coin de toile : ${cornerGap(0)}`)
  assert.ok(cornerGap(1) < 0.01, `coin de papier : ${cornerGap(1)}`)
})

test('la lumière du profil arrive au cadre : moins dans les creux, pleine sur la face', () => {
  const { position, shade } = frameRing({ hw: 15, hh: 20, profile: frameProfile('toile', FRAME_PROFILE.toile) })
  assert.equal(shade.length, position.length / 3)
  assert.ok(Math.min(...shade) < 0.5)
  assert.equal(Math.max(...shade), 1)
})
