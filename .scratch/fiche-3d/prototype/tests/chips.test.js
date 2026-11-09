import test from 'node:test'
import assert from 'node:assert/strict'
import { chipsLayout, railPlacement, maxShift, optionWidth, choicesOf, legendOf, toggleOf, eur, dims, swatchOf, sizeTileOf, TEXTS_FR } from '../src/chips.js'
import { BORDERS, FRAMES, SIZES, canFrame, dimensionsOf, fitChoice, frameFits, hasFrame, priceOf } from '../src/catalog.js'

/* Les valeurs attendues sont celles du design « Fiche chips v2 », relevées sur la page de Claude
   Design rendue dans Chrome (cadres 3a, 3b, 3c), en px depuis le haut de la scène, sous l'en-tête. */

const near = (actual, expected, tolerance = 0.51) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} au lieu de ${expected}`)

// Le catalogue du Bonsaï, comme la maquette le branche (src/maquette.js).
const SHORT = { sans: 'Aucun', blanc: 'Blanc', noir: 'Noir', argent: 'Argent', chene: 'Chêne', noyer: 'Noyer' }
const catalog = {
  side: (p) => (p.material === 'toile' ? 'border' : 'passe'),
  options(group, p) {
    if (group === 'material') return [{ id: 'toile', name: 'Toile', spoken: 'toile' }, { id: 'poster', name: 'Poster', spoken: 'poster' }]
    if (group === 'size') return SIZES.map((id) => ({ id, name: id, spoken: `${id.replace('x', ' × ')} cm` }))
    if (group === 'border') return BORDERS.map(({ id, label }) => ({ id, name: label, spoken: label.toLowerCase() }))
    if (group === 'passe') return [{ id: 'sans', name: 'Aucun', spoken: 'sans contour' }, { id: 'avec', name: 'Blanc', spoken: 'contour blanc' }]
    return FRAMES.filter((f) => f.materials.includes(p.material)).map((f) => ({
      id: f.id, name: SHORT[f.id], spoken: f.id === 'sans' ? 'sans cadre' : `cadre ${(p.material === 'poster' ? f.posterLabel : f.label).toLowerCase()}`,
    }))
  },
  value: (group, p) => (group === 'passe' ? (p.passe ? 'avec' : 'sans') : p[group]),
  apply: (group, p, id) => fitChoice({ ...p, [group]: group === 'passe' ? id === 'avec' : id }),
  available: (group, p, id) => group !== 'frame' || frameFits(p, id),
  price: priceOf,
  base: (group) => (group === 'border' ? 'blanche' : 'sans'),
  size: (id) => { const { width, height } = dimensionsOf(id); return { w: width, h: height } },
  framed: hasFrame,
  canFrame,
  unframedSize: () => '90 × 120',
}
const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster' }
const NB = ' '

test('iPhone SE (375 × 667) : l’œuvre, la bascule, les légendes et la cote du cadre 3a', () => {
  const L = chipsLayout({ width: 375, height: 615 })
  assert.equal(L.desk, false)
  near(L.art.w, 243)
  near(L.art.l, 66)
  near(L.art.r, 309)
  near(L.cy, 280.5)
  assert.equal(L.toggle.top, 62)
  assert.equal(L.lineY, 298.5)
  assert.equal(L.lineB, 461.5)
  assert.deepEqual(L.legends.left, { x: 4, y: 248, w: 62, h: 52 })
  assert.deepEqual(L.legends.right, { x: 311, y: 248, w: 60, h: 52 })
  assert.deepEqual(L.cote, { y: 456, w: 150 })
  assert.deepEqual(L.marks, { lx: 10, rx: 365, gapHalf: 29 })
  assert.equal(L.type.value, 13.5)
})

test('iPhone SE dans Safari (553 px visibles) : l’œuvre descend à 233 px, cadre 3b', () => {
  const L = chipsLayout({ width: 375, height: 501 })
  near(L.art.w, 233)
  near(L.art.l, 71)
  near(L.cy, 223.5)
  assert.equal(L.toggle.top, 12)
  assert.equal(L.lineY, 240.5)
  assert.equal(L.lineB, 397.5)
  assert.deepEqual(L.legends.left, { x: 4, y: 190, w: 67, h: 52 })
  assert.deepEqual(L.legends.right, { x: 306, y: 190, w: 65, h: 52 })
  assert.equal(L.cote.y, 392)
})

test('ordinateur (1440 × 820) : œuvre de 339 px, filets de 176 px, cadre 3c', () => {
  const L = chipsLayout({ width: 1440, height: 748 })
  assert.equal(L.desk, true)
  near(L.art.w, 338.8, 0.01)
  near(L.art.l, 550.6, 0.01)
  near(L.cy, 375, 0.01)
  assert.equal(L.toggle.top, 83)
  assert.equal(L.lineY, 399.5)
  assert.equal(L.lineB, 625.5)
  assert.deepEqual(L.legends.left, { x: 375, y: 339, w: 176, h: 62 })
  assert.deepEqual(L.legends.right, { x: 889, y: 339, w: 176, h: 62 })
  assert.deepEqual(L.cote, { y: 619.5, w: 200 })
  near(L.marks.lx, 374.6, 0.01)
  near(L.marks.rx, 1065.4, 0.01)
  assert.deepEqual(L.type, { value: 17, cote: 16 })
})

test('390 × 844 : l’œuvre plafonne à 254 px et reste au milieu de la scène, comme dans le cadre 2b', () => {
  const L = chipsLayout({ width: 390, height: 792 })
  near(L.art.w, 254.1, 0.11)
  near(L.cy, 396.5)
  assert.equal(L.toggle.top, 171)
  assert.equal(L.lineB, 584.5)
  assert.equal(L.lineY, 414.5) // 413,5 dans le cadre 2b, fixé à la main : la règle des cadres 3 donne 1 px de plus
  assert.deepEqual(L.legends.left, { x: 4, y: 364, w: 64, h: 52 })
  assert.deepEqual(L.legends.right, { x: 324, y: 364, w: 62, h: 52 })
  assert.equal(L.cote.w, 160)
  assert.equal(L.type.value, 14)
  // Le même téléphone dans Safari (664 px visibles) reprend la règle des cadres 3 : bloc au-dessus de la barre.
  const safari = chipsLayout({ width: 390, height: 612 })
  near(safari.cy, 612 / 2 - 27)
})

test('la rangée ouverte : la scène remonte juste ce qu’il faut, la barre ne s’efface que sur le petit écran', () => {
  const se = chipsLayout({ width: 375, height: 615 })
  assert.deepEqual(railPlacement(se, false), { shift: 22, hidePill: false, top: 427, height: 120 })
  assert.equal(railPlacement(se, true).shift, 40)
  const safari = chipsLayout({ width: 375, height: 501 })
  assert.deepEqual(railPlacement(safari, false), { shift: 16, hidePill: true, top: 369, height: 120 })
  assert.deepEqual(railPlacement(safari, true), { shift: 34, hidePill: true, top: 351, height: 138 })
  const desk = chipsLayout({ width: 1440, height: 748 })
  assert.deepEqual(railPlacement(desk, false), { shift: 20, hidePill: false, top: 589, height: 147 })
  assert.deepEqual(railPlacement(desk, true), { shift: 40, hidePill: false, top: 569, height: 167 })
  assert.equal(railPlacement(chipsLayout({ width: 390, height: 792 }), true).shift, 0)
  assert.equal(maxShift(se), 40)
})

test('la rangée partage la largeur : 54 px par choix sur 375 px pour les six cadres, jamais moins de 44', () => {
  const se = chipsLayout({ width: 375, height: 615 })
  assert.equal(optionWidth(se, 6), 54)
  assert.equal(optionWidth(se, 5), 56)
  assert.equal(optionWidth(chipsLayout({ width: 320, height: 500 }), 6), 45)
  assert.equal(optionWidth(chipsLayout({ width: 300, height: 500 }), 6), 44)
  assert.equal(optionWidth(chipsLayout({ width: 1440, height: 748 }), 6), 78)
})

test('l’œuvre tient toujours entre les légendes et au-dessus de la barre, du petit téléphone à l’ordinateur', () => {
  for (const [width, height] of [[320, 480], [360, 640], [375, 501], [390, 664], [430, 880], [720, 900], [1024, 600], [1920, 1000]]) {
    const L = chipsLayout({ width, height })
    if (!L.desk) {
      assert.ok(L.art.l >= 66 - 0.5 && L.art.r <= width - 66 + 0.5, `${width}×${height} : colonnes`)
      assert.ok(L.cote.y + 44 <= L.pillTop, `${width}×${height} : cote sous la barre`)
    } else {
      assert.ok(L.legends.left.x >= 0 && L.legends.right.x + L.legends.right.w <= width, `${width}×${height} : filets`)
    }
    assert.ok(L.toggle.top >= 0, `${width}×${height} : bascule`)
  }
})

test('les prix des rangées : complets pour la taille et la matière, en écart pour le reste', () => {
  const border = choicesOf(catalog, TEXTS_FR, 'border', TOILE)
  assert.deepEqual(border.options.map((o) => [o.name, o.price]), [['Blanche', ''], ['Noire', `+${eur(2)}`], ['Étirée', `+${eur(4)}`], ['Miroir', `+${eur(6)}`], ['Pliée', `+${eur(8)}`]])
  assert.equal(border.options[0].label, 'Bordure : blanche, inclus')
  assert.equal(border.options[1].label, `Bordure : noire, +${eur(2)}`)
  const frame = choicesOf(catalog, TEXTS_FR, 'frame', { ...TOILE, border: 'noire' })
  assert.deepEqual(frame.options.map((o) => o.price), ['', `+${eur(40)}`, `+${eur(40)}`, `+${eur(45)}`, `+${eur(50)}`, `+${eur(50)}`])
  const size = choicesOf(catalog, TEXTS_FR, 'size', { ...TOILE, border: 'noire', frame: 'chene' })
  assert.deepEqual(size.options.map((o) => o.price), [eur(114.5), eur(146), eur(188.5), eur(201)])
  assert.equal(size.note, 'En 90 × 120, livré sans cadre')
  assert.equal(size.options[3].label, `Taille : 90 × 120 cm, ${eur(201)}, sans cadre`)
  assert.deepEqual(size.options.map((o) => o.name), [`30${NB}×${NB}40`, `60${NB}×${NB}80`, `75${NB}×${NB}100`, `90${NB}×${NB}120`])
  // L'espace avant € dépend de la version d'ICU (insécable ou fine insécable) : on la normalise.
  const plain = (text) => text.replace(/[  ]/g, ' ')
  assert.equal(plain(eur(62.5)), '62,50 €')
  assert.equal(plain(eur(94)), '94 €')
  assert.equal(plain(eur(199.004)), '199 €')
})

test('en 90 × 120, les cadres sont grisés avec un tiret et la rangée le dit', () => {
  const frame = choicesOf(catalog, TEXTS_FR, 'frame', { ...TOILE, size: '90x120' })
  assert.deepEqual(frame.options.map((o) => [o.available, o.price]), [[true, ''], ...Array(5).fill([false, '—'])])
  assert.equal(frame.note, 'Pas de cadre en 90 × 120')
  assert.equal(frame.options[1].label, 'Cadre : cadre blanc, indisponible en 90 × 120')
})

test('le poster : contour à gauche, ses quatre cadres sans l’argent ancien, son prix encadré', () => {
  assert.equal(catalog.side(POSTER), 'passe')
  const frame = choicesOf(catalog, TEXTS_FR, 'frame', POSTER)
  assert.deepEqual(frame.options.map((o) => o.id), ['sans', 'blanc', 'noir', 'chene', 'noyer'])
  assert.equal(frame.options[1].price, `+${eur(23)}`)
  assert.equal(frame.options[2].label, `Cadre : cadre noir, +${eur(23)}`)
  const passe = choicesOf(catalog, TEXTS_FR, 'passe', POSTER)
  assert.deepEqual(passe.options.map((o) => [o.name, o.price, o.label]), [['Aucun', '', 'Contour : sans contour'], ['Blanc', '', 'Contour : contour blanc, inclus']])
  assert.deepEqual(legendOf(catalog, TEXTS_FR, 'passe', POSTER), { group: 'passe', cat: 'Contour', value: 'Aucun', label: 'Contour : sans contour. Voir les choix' })
})

test('les légendes et la bascule disent le choix en cours et ce qu’on change', () => {
  assert.deepEqual(legendOf(catalog, TEXTS_FR, 'border', TOILE), { group: 'border', cat: 'Bordure', value: 'Blanche', label: 'Bordure : blanche. Voir les choix' })
  assert.deepEqual(legendOf(catalog, TEXTS_FR, 'frame', { ...TOILE, frame: 'chene' }).label, 'Cadre : cadre chêne clair. Voir les choix')
  assert.equal(legendOf(catalog, TEXTS_FR, 'size', TOILE).value, `30${NB}×${NB}40${NB}cm`)
  assert.deepEqual(toggleOf(catalog, TEXTS_FR, TOILE).map((o) => [o.name, o.pressed, o.label]), [
    ['Toile', true, `Matière : toile, ${eur(62.5)}`],
    ['Poster', false, `Matière : poster, ${eur(24.9)}`],
  ])
  // La toile en argent ancien passe au poster sans cadre : le poster n'a pas l'argent.
  assert.equal(toggleOf(catalog, TEXTS_FR, { ...TOILE, frame: 'argent' })[1].label, `Matière : poster, ${eur(24.9)}`)
})

test('pastilles et vignettes de taille : les teintes et les échelles du design', () => {
  assert.deepEqual(swatchOf('frame', 'sans'), { w: 30, h: 30, r: '50%', bg: 'transparent', shadow: 'none', border: '1px dashed rgba(33, 21, 12, 0.5)' })
  assert.equal(swatchOf('frame', 'chene', 1.35).w, 40.5)
  assert.match(swatchOf('border', 'noire').bg, /#26211d 55%/)
  assert.deepEqual([swatchOf('passe', 'avec', 1.35).w, swatchOf('passe', 'avec', 1.35).h], [28.5, 38])
  assert.deepEqual(SIZES.map((id) => sizeTileOf(catalog.size(id), 30)), [{ w: 7.5, h: 10 }, { w: 15, h: 20 }, { w: 19, h: 25 }, { w: 22.5, h: 30 }])
  assert.equal(dims({ w: 30, h: 40 }, true), `30${NB}×${NB}40${NB}cm`)
})
