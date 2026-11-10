// Tests de la mise en scène jouée dès l'ouverture d'une rangée, repris du prototype (version 26).
// Lancer : node --test scripts/oeuvre-3d-open-staging.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { createDirector } = require('../assets/oeuvre-3d-engine.js')
const { railEvent } = require('../assets/oeuvre-3d-chips.js')

// La pièce réglée à la main au prototype : la photo et le mur sont les vrais, pour que ces tests
// restent ceux du ticket 02 (lumière venant de la gauche, canapé, cadrage du recul).
const ROOM = {
  image: 'piece-salon-canape.jpg',
  photo: { left: 0, right: 2400 / 6.6, bottom: -(1350 - 1216) / 6.6, top: 1216 / 6.6 },
  hang: { x: 121, minBottom: 111, center: 130 },
  view: { bottom: -12, height: 250 },
  light: [-0.5, 0.45, 0.74],
  wall: [233, 233, 232],
  wallSlope: -0.00023,
}

/* Retour de Walid sur la version 15 (09/11) : ouvrir une rangée joue la mise en scène de son groupe
   avec le choix en cours. La page appelle alors le directeur avec le produit inchangé : il doit jouer
   le plan du groupe, comme pour un vrai choix, et non le prendre pour un rejeu sans effet. */

const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster' }
const ASPECT = 0.55
const LATER = 5000 // une mise en scène est finie

function opened(product, group) {
  const director = createDirector({ room: ROOM, product })
  // La page démarre de face ; une rangée fermée l'y ramène (choose('front')).
  director.choose('front', product, 0)
  director.choose(group, product, LATER)
  return { director, during: director.isMoving(LATER + 100), shot: director.view(2 * LATER, ASPECT).shot }
}

test('ouvrir Bordure sans rien changer : la toile pivote vers sa tranche', () => {
  const { during, shot } = opened(TOILE, 'border')
  assert.ok(during)
  assert.equal(shot, 'edge')
})

test('ouvrir Cadre avec « Aucun » : zoom sur le coin, là où irait le cadre', () => {
  assert.equal(opened(TOILE, 'frame').shot, 'bare')
  assert.equal(opened({ ...TOILE, frame: 'chene' }, 'frame').shot, 'corner')
  assert.equal(opened(POSTER, 'frame').shot, 'bare')
})

test('ouvrir Taille sans rien changer : recul dans la pièce, à la taille en cours', () => {
  const { director, shot } = opened({ ...TOILE, size: '75x100' }, 'size')
  assert.equal(shot, 'room')
  assert.equal(director.view(2 * LATER, ASPECT).painting.height, 100)
})

test('ouvrir Contour sur le poster : sa mise en scène habituelle, la marge', () => {
  assert.equal(opened(POSTER, 'passe').shot, 'margin')
})

test('rouvrir la même rangée après un retour de face rejoue sa mise en scène', () => {
  const director = createDirector({ room: ROOM, product: TOILE })
  director.choose('border', TOILE, 0)
  director.choose('front', TOILE, LATER)
  assert.equal(director.view(2 * LATER, ASPECT).shot, 'front')
  director.choose('border', TOILE, 2 * LATER)
  assert.ok(director.isMoving(2 * LATER + 100))
  assert.equal(director.view(3 * LATER, ASPECT).shot, 'edge')
})

test('animations réduites : la rangée ouverte coupe directement sur le plan du groupe', () => {
  const director = createDirector({ room: ROOM, product: TOILE, reducedMotion: true })
  director.choose('border', TOILE, 0)
  assert.equal(director.isMoving(1), false)
  assert.equal(director.view(1, ASPECT).shot, 'edge')
})
