// Les matières des cadres de la 3D (assets/oeuvre-3d-engine.js, FRAMES) face aux vrais cadres de l'atelier.
// Lancer : node --test scripts/oeuvre-3d-cadres.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { FRAMES, frameOf } = require('../assets/oeuvre-3d-engine.js')

/* Retour de Walid du 12/11/2026 : des clients déçus par la teinte du cadre reçu. Les vrais cadres sont
   ceux de Picanova (« Shadow Frames » de la toile, « Decor Frame » du poster). Teintes de leur face,
   mesurées le 12/11 sur leurs photos (merchone.com, leur marque publique), au milieu de la baguette.
   Choix de Walid du même jour : le chêne de la toile devient le bois naturel clair, celui du poster
   reste le chêne vieilli, renommé. */
const ATELIER = {
  toile: { blanc: '#ececec', argent: '#9a9380', chene: '#bcaa97', noyer: '#866554' },
  poster: { blanc: '#e2e2e2', chene: '#6e6664', noyer: '#756454' },
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const distance = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]))
const luma = (hex) => { const [r, g, b] = rgb(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b }

test('chaque cadre de la 3D a la teinte du vrai cadre de l’atelier, toile et poster', () => {
  for (const [kind, colors] of Object.entries(ATELIER)) {
    for (const [id, real] of Object.entries(colors)) {
      const look = frameOf(id, kind)
      assert.ok(distance(look.color, real) <= 24, `${kind} ${id} : ${look.color} au lieu de ${real} (écart ${distance(look.color, real).toFixed(0)})`)
    }
  }
})

test('le chêne de la toile est le bois naturel clair, celui du poster un chêne vieilli brun-gris', () => {
  const toile = frameOf('chene', 'toile')
  const poster = frameOf('chene', 'poster')
  assert.ok(luma(toile.color) > 160, `chêne de la toile trop sombre : ${toile.color}`)
  assert.ok(luma(poster.color) < 115, `chêne du poster trop clair : ${poster.color}`)
  const [r, , b] = rgb(poster.color)
  assert.ok(r - b < 16, `chêne vieilli trop chaud (pas assez gris) : ${poster.color}`)
})

test('l’argent est un argent vintage chaud, pas un gris bleuté', () => {
  const [r, , b] = rgb(frameOf('argent').color)
  assert.ok(r > b + 10, `argent froid : ${frameOf('argent').color}`)
})

test('les cadres à l’aspect bois et l’argent brossé ont un fil ; le blanc et le noir sont unis', () => {
  for (const id of ['chene', 'noyer', 'argent']) {
    for (const kind of ['toile', 'poster']) assert.ok(frameOf(id, kind).grain > 0, `${kind} ${id} sans fil`)
  }
  for (const id of ['blanc', 'noir']) assert.equal(frameOf(id).grain, 0)
  // Le poster reprend la matière de la toile, sauf ce qu'il change.
  assert.equal(frameOf('blanc', 'poster'), FRAMES.find((f) => f.id === 'blanc'))
  assert.equal(frameOf('inconnu').id, 'sans')
})
