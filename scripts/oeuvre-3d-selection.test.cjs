// Du choix de la fiche (mma:selection-change, ticket 05) au produit que rend le moteur.
// Lancer : node --test scripts/oeuvre-3d-selection.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { neutralRoom, productFromSelection, sizesFromVariants } = require('../assets/oeuvre-3d-engine.js')

// Forme de e.detail, valeurs relevées sur la fiche du Bonsaï le 05/11/2026.
const selection = ({ size = '30x40 cm', border, frame } = {}) => ({
  changed: null,
  variant: null,
  options: [
    { position: 1, kind: 'size', value: size, key: null },
    { position: 2, kind: 'border', value: 'Bordure', key: border },
    { position: 3, kind: 'frame', value: 'Cadre', key: frame },
  ],
  frameColor: null,
  whiteBorder: null,
})

test('le choix de la fiche donne le produit du moteur', () => {
  assert.deepEqual(productFromSelection(selection({ size: '60x80 cm', border: 'bordure-noire', frame: 'cadre-chene-clair' })), {
    material: 'toile',
    size: '60x80',
    border: 'noire',
    frame: 'chene',
    passe: false,
  })
})

test('chaque bordure de la boutique a sa matière, même celle dont le handle a une coquille', () => {
  const borders = {
    'bordure-blanche': 'blanche',
    'bordure-noire': 'noire',
    'bordure-etiree': 'etiree',
    'bordure-moroir': 'miroir',
    'bordure-pliee': 'pliee',
  }
  for (const [key, id] of Object.entries(borders)) {
    assert.equal(productFromSelection(selection({ border: key, frame: 'sans-cadre' })).border, id)
  }
})

test('chaque cadre de la boutique a sa matière', () => {
  const frames = {
    'sans-cadre': 'sans',
    'cadre-blanc': 'blanc',
    'cadre-noir-mat': 'noir',
    'cadre-argent-ancien': 'argent',
    'cadre-chene-clair': 'chene',
    'cadre-noyer': 'noyer',
  }
  for (const [key, id] of Object.entries(frames)) {
    assert.equal(productFromSelection(selection({ border: 'bordure-blanche', frame: key })).frame, id)
  }
})

test('seuls les handles comptent : une fiche traduite donne le même produit', () => {
  const translated = selection({ size: '30x40 cm', border: 'bordure-moroir', frame: 'cadre-noyer' })
  translated.options[1].value = 'Mirror border'
  translated.options[2].value = 'Walnut frame'
  assert.deepEqual(productFromSelection(translated), productFromSelection(selection({ border: 'bordure-moroir', frame: 'cadre-noyer' })))
})

test('une clé inconnue, ou absente, retombe sur la bordure blanche sans cadre plutôt que de casser la 3D', () => {
  const product = productFromSelection(selection({ border: 'bordure-doree', frame: null }))
  assert.equal(product.border, 'blanche')
  assert.equal(product.frame, 'sans')
})

test('les tailles du produit se lisent dans ses variantes, dans leur ordre et sans doublon', () => {
  const variants = [
    { option1: '30x40 cm' }, { option1: '30x40 cm' }, { option1: '60x80 cm' }, { option1: '75x100 cm' }, { option1: '90x120 cm' },
  ]
  assert.deepEqual(sizesFromVariants(variants), ['30x40', '60x80', '75x100', '90x120'])
})

test('une taille se lit quelle que soit son écriture', () => {
  for (const option1 of ['100x75 cm', '100 x 75 cm', '100×75', ' 100X75 CM']) {
    assert.deepEqual(sizesFromVariants([{ option1 }]), ['100x75'])
  }
})

test('un produit sans taille en cm n’a pas de tailles : la fiche restera sur les photos', () => {
  assert.deepEqual(sizesFromVariants([{ option1: 'Default Title' }]), [])
})

test('le mur neutre retient le plus grand format, en portrait, en paysage et en carré', () => {
  assert.deepEqual(neutralRoom(['30x40', '60x80', '75x100', '90x120']).largest, { width: 90, height: 120 })
  assert.deepEqual(neutralRoom(['40x30', '80x60', '100x75', '120x90']).largest, { width: 120, height: 90 })
  assert.deepEqual(neutralRoom(['40x40', '60x60', '80x80', '100x100']).largest, { width: 100, height: 100 })
})
