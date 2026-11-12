// Tests des chips de la fiche 3D (assets/oeuvre-3d-chips.js), repris de la maquette (version 26).
// Lancer : node --test scripts/oeuvre-3d-chips.test.cjs  (lanceur intégré de Node, sans dépendance)
const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const {
  chipsLayout, railPlacement, railWidth, maxShift, optionWidth, optionShare, railFit, choicesOf, legendOf, toggleOf, eur, dims, swatchOf, sizeTileOf,
  railEvent, TEXTS_FR, pickOf, noticeOf,
} = require('../assets/oeuvre-3d-chips.js')

/* ---- Données de test : le catalogue du Bonsaï de la maquette (.scratch/fiche-3d/prototype/src/catalog.js) ---- */
const CANVAS_DEPTH = 2 // châssis des toiles (décision 8)
const PAPER_DEPTH = 0.05 // feuille du poster, à peine visible de profil

/* Profils de cadre, à comparer aux vrais produits (tickets 10 et 14).
   gap   : écart entre l'œuvre et l'intérieur du cadre (négatif : la baguette recouvre le bord)
   face  : largeur de la baguette vue de face
   depth : profondeur totale, du mur à l'avant du cadre
   floor : position de l'arrière de l'œuvre dans le cadre (toile posée sur le fond de la caisse,
           poster plaqué derrière le verre) */
const FRAME_PROFILE = {
  toile: { gap: 0.6, face: 1.2, depth: 3.2, floor: 0.6 }, // caisse américaine : la toile flotte
  poster: { gap: -0.5, face: 1.6, depth: 2.0, floor: 1.6 }, // baguette sous verre, tirage collé au verre
}

const SIZES = ['30x40', '60x80', '75x100', '90x120']

// Taille d'option (« 30x40 ») : largeur et hauteur en cm, et libellé affiché.
function dimensionsOf(size) {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

const sizeLabel = (size) => `${size.replace('x', ' × ')} cm`

/* Bordures et cadres. `color` (sRGB) sert à la fois à la pastille de l'option et au
   moteur ; null : la bordure reprend l'image, ou il n'y a pas de cadre. */
const BORDERS = [
  { id: 'blanche', label: 'Blanche', add: 0, color: '#efede8' },
  { id: 'noire', label: 'Noire', add: 2, color: '#272727' },
  { id: 'etiree', label: 'Étirée', add: 4, color: null },
  { id: 'miroir', label: 'Miroir', add: 6, color: null },
  { id: 'pliee', label: 'Pliée', add: 8, color: null },
]

const PAPER_WHITE = '#f7f6f2'

/* Matière des cadres. wood : part de l'image de bois ; relief : fil du bois sous la
   lumière ; rough : 0 brillant, 1 mat. Noir et chêne sont réglés ; blanc, argent et noyer
   gardent la teinte de la fiche en ligne (assets/oeuvre-3d-engine.js), leurs matières sont au
   ticket 10. Ordre et prix de la boutique, relevés le 08/11/2026. materials : la toile a les six,
   le poster n'a pas l'argent ancien (sa couleur de cadre est une propriété de ligne). */
const FRAMES = [
  { id: 'sans', label: 'Sans cadre', posterLabel: 'Sans cadre', color: null, materials: ['toile', 'poster'] },
  { id: 'blanc', label: 'Blanc', posterLabel: 'Blanc', color: '#edebe3', wood: 0, relief: 0.3, rough: 0.6, materials: ['toile', 'poster'] },
  { id: 'noir', label: 'Noir mat', posterLabel: 'Noir', color: '#1f1f21', wood: 0, relief: 0.5, rough: 0.68, materials: ['toile', 'poster'] },
  { id: 'argent', label: 'Argent ancien', posterLabel: 'Argent ancien', color: '#9ea1a8', wood: 0, relief: 0.6, rough: 0.5, materials: ['toile'] },
  { id: 'chene', label: 'Chêne clair', posterLabel: 'Chêne clair', color: '#c9a77c', wood: 1, relief: 0.9, rough: 0.55, materials: ['toile', 'poster'] },
  { id: 'noyer', label: 'Noyer', posterLabel: 'Noyer', color: '#66422b', wood: 0, relief: 0.9, rough: 0.55, materials: ['toile', 'poster'] },
]

const borderOf = (id) => BORDERS.find((b) => b.id === id) || BORDERS[0]
const borderTakesImage = (id) => !borderOf(id).color
const frameOf = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0]

const TOILE_BASE = { '30x40': 62.5, '60x80': 94, '75x100': 136.5, '90x120': 199 } // bordure blanche, sans cadre
const TOILE_FRAME_ADD = { sans: 0, blanc: 40, noir: 40, argent: 45, chene: 50, noyer: 50 }
const POSTER_PRICE = {
  '30x40': { sans: 24.9, avec: 47.9 },
  '60x80': { sans: 44.9, avec: 94.9 },
  '75x100': { sans: 64.9, avec: 159.9 },
  '90x120': { sans: 71.9 },
}

// La boutique ne vend pas le 90 × 120 encadré, ni en toile ni en poster.
const canFrame = (size) => 'avec' in POSTER_PRICE[size]

// Ce cadre existe-t-il pour ce produit (matière et taille) ?
const frameFits = (product, frame) =>
  frame === 'sans' || (canFrame(product.size) && frameOf(frame).materials.includes(product.material))

// Un choix qui n'existe pas en boutique repasse sans cadre.
const fitChoice = (product) => (frameFits(product, product.frame) ? product : { ...product, frame: 'sans' })

function hasFrame(product) {
  return product.frame !== 'sans'
}

function priceOf(product) {
  if (product.material === 'poster') return POSTER_PRICE[product.size][hasFrame(product) ? 'avec' : 'sans']
  return TOILE_BASE[product.size] + borderOf(product.border).add + TOILE_FRAME_ADD[product.frame]
}

// Résumé affiché sous le titre, et lu par le lecteur d'écran sur la 3D.
function describe(product) {
  const size = sizeLabel(product.size)
  const frame = frameOf(product.frame)
  if (product.material === 'poster') {
    const framing = hasFrame(product) ? `cadre ${frame.posterLabel.toLowerCase()}` : 'sans cadre'
    return `Poster ${size} · ${framing} · ${product.passe ? 'contour blanc' : 'sans contour'}`
  }
  const framing = hasFrame(product) ? `cadre ${frame.label.toLowerCase()}` : 'sans cadre'
  return `Toile ${size} · bordure ${borderOf(product.border).label.toLowerCase()} · ${framing}`
}


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

// Pastilles de 50 px (64 sur ordinateur) depuis le 12/11/2026 : la rangée a 10 px de plus.
test('la rangée ouverte : la scène remonte juste ce qu’il faut, la barre ne s’efface que sur le petit écran', () => {
  const se = chipsLayout({ width: 375, height: 615 })
  assert.deepEqual(railPlacement(se, false), { shift: 32, hidePill: false, top: 417, height: 130 })
  assert.equal(railPlacement(se, true).shift, 50)
  const safari = chipsLayout({ width: 375, height: 501 })
  assert.deepEqual(railPlacement(safari, false), { shift: 26, hidePill: true, top: 359, height: 130 })
  assert.deepEqual(railPlacement(safari, true), { shift: 44, hidePill: true, top: 341, height: 148 })
  const desk = chipsLayout({ width: 1440, height: 748 })
  assert.deepEqual(railPlacement(desk, false), { shift: 30, hidePill: false, top: 579, height: 157 })
  assert.deepEqual(railPlacement(desk, true), { shift: 50, hidePill: false, top: 559, height: 177 })
  assert.equal(railPlacement(chipsLayout({ width: 390, height: 792 }), true).shift, 0)
  assert.equal(maxShift(se), 50)
})

/* Retour de Walid du 12/11/2026 : les ronds des rangées grossissent, pour les photos des cadres, sans que
   la barre d'achat s'efface là où elle restait : la pastille rapetisse un peu sur les petits écrans. La
   mise en page de face, elle, ne bouge pas (k.disc). */
test('les ronds des rangées : 50 px sur un téléphone, 64 sur ordinateur, moins là où la place manque, jamais au prix de la barre d’achat', () => {
  const discOf = (width, height) => chipsLayout({ width, height }).disc
  assert.equal(discOf(390, 756), 50)
  assert.equal(discOf(430, 780), 50)
  assert.equal(discOf(1440, 820), 64)
  assert.equal(discOf(768, 901), 64)
  assert.equal(discOf(375, 553), 44) // iPhone SE dans Safari : 50 px effaceraient la barre
  assert.equal(discOf(360, 640), 47) // six choix de 51 px
  assert.equal(discOf(320, 480), 41) // six choix de 45 px
  for (const [width, height] of [[320, 480], [320, 548], [360, 560], [360, 640], [375, 501], [375, 553], [375, 579], [375, 615], [390, 612], [390, 680], [390, 756], [414, 740], [430, 880], [768, 901], [1024, 600], [1440, 748]]) {
    const L = chipsLayout({ width, height })
    const before = { ...L, disc: L.k.disc }
    for (const note of [false, true]) {
      assert.equal(railPlacement(L, note).hidePill, railPlacement(before, note).hidePill, `${width} × ${height}, note ${note} : la barre d'achat`)
    }
    assert.ok(L.disc >= Math.min(L.k.disc, optionWidth(L, 6) - 4) && L.disc <= L.k.discMax, `${width} × ${height} : ${L.disc} px`)
    if (!L.desk) assert.ok(L.disc <= optionWidth(L, 6) - 4, `${width} × ${height} : le rond tient dans son choix`)
  }
})

/* Sur ordinateur, la pilule d'achat est en bas à droite et le panier juste au-dessus d'elle (choix de
   Walid du 11/11/2026). En 768 × 1024, la rangée centrée les croisait et couvrait ses prix (relevé de
   l'UX) : elle s'arrête au-dessus de ce qu'elle croiserait. La scène fait 1024 - 123 px de haut. */
const deskObstacles = (W, SH, pillWidth) => {
  const pill = { left: W - 32 - pillWidth, right: W - 32, top: SH - 28 - 56 }
  return [pill, { left: W - 32 - 86, right: W - 32, top: pill.top - 12 - 56 }]
}

test('ordinateur étroit (768 × 1024) : la rangée ouverte s’arrête au-dessus de la pilule et du panier qu’elle croise', () => {
  const W = 768, SH = 901
  const obstacles = deskObstacles(W, SH, 300)
  const L = chipsLayout({ width: W, height: SH, obstacles })
  for (const [count, note] of [[6, false], [6, true], [5, false], [4, true]]) {
    const spot = railPlacement(L, note, count)
    const half = railWidth(L, count) / 2
    const crossed = obstacles.filter((o) => L.cx + half > o.left - 8 && L.cx - half < o.right + 8)
    assert.ok(crossed.length, `${count} choix : la rangée croise la pilule`)
    for (const o of crossed) assert.ok(spot.top + spot.height <= o.top - 8, `${count} choix, note ${note} : bas ${spot.top + spot.height} au-dessus de ${o.top - 8}`)
  }
  // La 3D se cadre au-dessus de la plus haute rangée : la zone suit.
  assert.equal(railPlacement(L, true).top, railPlacement(L, true, 6).top)
})

test('ordinateur large (1440 × 748) : la pilule est loin de la rangée, rien ne change', () => {
  const desk = chipsLayout({ width: 1440, height: 748, obstacles: deskObstacles(1440, 748, 365) })
  assert.deepEqual(railPlacement(desk, false), { shift: 30, hidePill: false, top: 579, height: 157 })
  assert.deepEqual(railPlacement(desk, true), { shift: 50, hidePill: false, top: 559, height: 177 })
  assert.equal(railWidth(desk, 4), 352) // 4 choix de 78 px, 4 px entre eux, 14 px de chaque côté
})

test('la rangée partage la largeur : 54 px par choix sur 375 px pour les six cadres, jamais moins de 44', () => {
  const se = chipsLayout({ width: 375, height: 615 })
  assert.equal(optionWidth(se, 6), 54)
  assert.equal(optionWidth(se, 5), 56)
  assert.equal(optionWidth(chipsLayout({ width: 320, height: 500 }), 6), 45)
  assert.equal(optionWidth(chipsLayout({ width: 300, height: 500 }), 6), 44)
  assert.equal(optionWidth(chipsLayout({ width: 1440, height: 748 }), 6), 78)
  assert.equal(optionShare(chipsLayout({ width: 390, height: 844 }), 5), 68) // les cinq cadres du poster
})

/* Les noms de la rangée Cadre du poster, en px, en Albert Sans gras à 11 px (mesurés dans Chrome le
   12/11/2026) : Aucun, Blanc, Noir, Chêne vieilli, Noyer ; en espagnol Ninguno, Blanco, Negro, Roble
   envejecido, Nogal. */
const POSTER_FR = [33, 28, 22, 63, 31]
const POSTER_ES = [43, 35, 31, 88, 29]
const gapsOf = (widths, { width, scale }, gap = 2) =>
  widths.slice(1).map((w, i) => width + gap - ((widths[i] + w) / 2) * scale)

test('les noms voisins d’une rangée ne se touchent jamais : 6 px au moins entre eux', () => {
  for (const [w, h] of [[320, 568], [360, 640], [375, 667], [390, 844], [430, 932]]) {
    const L = chipsLayout({ width: w, height: h })
    for (const widths of [POSTER_FR, POSTER_ES]) {
      const fit = railFit(widths, { width: optionWidth(L, 5), share: optionShare(L, 5) })
      assert.ok(fit.width >= optionWidth(L, 5) && fit.width <= optionShare(L, 5), `${w} px : choix de ${fit.width} px`)
      assert.ok(fit.scale >= 0.8 && fit.scale <= 1, `${w} px : noms à ${fit.scale}`)
      if (fit.scale > 0.8) assert.ok(Math.min(...gapsOf(widths, fit)) >= 5.9, `${w} px : ${gapsOf(widths, fit).map(Math.round)}`)
    }
  }
})

test('le design reste tel quel tant que les noms tiennent : « Chêne vieilli » en français, même sur 320 px', () => {
  for (const w of [320, 390]) {
    const L = chipsLayout({ width: w, height: 700 })
    assert.deepEqual(railFit(POSTER_FR, { width: optionWidth(L, 5), share: optionShare(L, 5) }), { width: optionWidth(L, 5), scale: 1 })
  }
  // Une rangée sans nom (pas encore remplie) ne bouge pas non plus.
  assert.deepEqual(railFit([], { width: 56, share: 68 }), { width: 56, scale: 1 })
})

test('un nom trop long élargit d’abord les choix, puis rapetisse les noms sur un petit téléphone', () => {
  const big = chipsLayout({ width: 390, height: 844 })
  assert.deepEqual(railFit(POSTER_ES, { width: optionWidth(big, 5), share: optionShare(big, 5) }), { width: 64, scale: 1 })
  const small = chipsLayout({ width: 320, height: 568 })
  assert.deepEqual(railFit(POSTER_ES, { width: optionWidth(small, 5), share: optionShare(small, 5) }), { width: 54, scale: 0.84 })
  // Sur ordinateur, les choix gardent leur largeur (la rangée est comptée pour éviter la pilule) : les noms tiennent.
  const desk = chipsLayout({ width: 1440, height: 900 })
  assert.deepEqual(railFit(POSTER_ES.map((x) => x * 12.5 / 11), { width: optionWidth(desk, 5), share: optionShare(desk, 5), gap: 4 }), { width: 78, scale: 1 })
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
  // Avec un cadre : « sans cadre » sous la vignette du 90 × 120, le cadre sur celles des autres tailles.
  assert.equal(size.note, '')
  assert.deepEqual(size.options.map((o) => [o.caption, o.frame]), [['', 'chene'], ['', 'chene'], ['', 'chene'], ['sans cadre', null]])
  assert.equal(size.options[3].label, `Taille : 90 × 120 cm, ${eur(201)}, sans cadre`)
  assert.deepEqual(size.options.map((o) => o.name), [`30${NB}×${NB}40`, `60${NB}×${NB}80`, `75${NB}×${NB}100`, `90${NB}×${NB}120`])
  // L'espace avant € dépend de la version d'ICU (insécable ou fine insécable) : on la normalise.
  const plain = (text) => text.replace(/[  ]/g, ' ')
  assert.equal(plain(eur(62.5)), '62,50 €')
  assert.equal(plain(eur(94)), '94 €')
  assert.equal(plain(eur(199.004)), '199 €')
})

/* Le cadre qu'une taille ou une matière n'a pas : retour de Walid du 11/11/2026, solution « Prévenir et
   expliquer » (le 90 × 120 n'existe pas encadré ; le poster n'a pas l'argent). */
test('en 90 × 120, un cadre se choisit encore : il passe au 75 × 100, son prix y est, et la rangée le dit', () => {
  const frame = choicesOf(catalog, TEXTS_FR, 'frame', { ...TOILE, size: '90x120' })
  assert.deepEqual(frame.options.map((o) => [o.available, o.price]), [[true, ''], [true, `+${eur(40)}`], [true, `+${eur(40)}`], [true, `+${eur(45)}`], [true, `+${eur(50)}`], [true, `+${eur(50)}`]])
  assert.equal(frame.note, `Avec cadre : jusqu’au 75${NB}×${NB}100`)
  assert.equal(frame.options[1].label, `Cadre : cadre blanc, +${eur(40)}. Avec cadre, la taille passe au 75${NB}×${NB}100.`)
  assert.equal(frame.options[0].label, 'Cadre : sans cadre')
})

test('le 90 × 120 retire le cadre et le dit, avec « Garder le cadre » ; une taille plus petite le remet', () => {
  const framed = { ...TOILE, frame: 'blanc' }
  const to90 = pickOf(catalog, framed, 'size', '90x120')
  assert.deepEqual(to90, { next: { ...framed, size: '90x120', frame: 'sans' }, held: 'blanc', dropped: 'blanc', moved: null })
  assert.deepEqual(noticeOf(catalog, TEXTS_FR, framed, 'size', to90), {
    text: `Le 90${NB}×${NB}120 est livré sans cadre.`,
    action: { label: 'Garder le cadre', group: 'size', id: '75x100' },
  })
  // « Garder le cadre » : le 75 × 100, avec le cadre en mémoire, sans autre message.
  const keep = pickOf(catalog, to90.next, 'size', '75x100', to90.held)
  assert.deepEqual(keep, { next: { ...framed, size: '75x100' }, held: null, dropped: null, moved: null })
  assert.equal(noticeOf(catalog, TEXTS_FR, to90.next, 'size', keep), null)
  // Revenir au 60 × 80 le remet aussi ; retoucher le 90 × 120 garde la mémoire, sans redire le message.
  assert.equal(pickOf(catalog, to90.next, 'size', '60x80', 'blanc').next.frame, 'blanc')
  const again = pickOf(catalog, to90.next, 'size', '90x120', 'blanc')
  assert.deepEqual([again.next.frame, again.held, again.dropped], ['sans', 'blanc', null])
  assert.equal(noticeOf(catalog, TEXTS_FR, to90.next, 'size', again), null)
})

test('cadre en mémoire : les prix et les vignettes des tailles le comptent, « sans cadre » sous le 90 × 120', () => {
  const at90 = { ...TOILE, size: '90x120' }
  const size = choicesOf(catalog, TEXTS_FR, 'size', at90, 'blanc')
  assert.deepEqual(size.options.map((o) => o.price), [eur(102.5), eur(134), eur(176.5), eur(199)])
  assert.deepEqual(size.options.map((o) => [o.caption, o.frame]), [['', 'blanc'], ['', 'blanc'], ['', 'blanc'], ['sans cadre', null]])
  // Sans cadre en tête : ni « sans cadre », ni cadre sur les vignettes.
  assert.deepEqual(choicesOf(catalog, TEXTS_FR, 'size', at90).options.map((o) => [o.caption, o.frame]), Array(4).fill(['', null]))
  // La bascule compte le cadre là où il revient : le poster en 90 × 120 n'en a pas.
  assert.equal(toggleOf(catalog, TEXTS_FR, at90, 'blanc')[1].label, `Matière : poster, ${eur(71.9)}`)
})

test('en 90 × 120, toucher un cadre passe au 75 × 100 avec lui, le dit, et propose de rester en 90 × 120', () => {
  const at90 = { ...TOILE, size: '90x120' }
  const pick = pickOf(catalog, at90, 'frame', 'noir', 'blanc')
  assert.deepEqual(pick, { next: { ...at90, size: '75x100', frame: 'noir' }, held: null, dropped: null, moved: '90x120' })
  assert.deepEqual(noticeOf(catalog, TEXTS_FR, at90, 'frame', pick), {
    text: `Avec cadre, la taille passe au 75${NB}×${NB}100.`,
    action: { label: `Rester en 90${NB}×${NB}120`, group: 'size', id: '90x120' },
  })
  // « Rester en 90 × 120 » : sans cadre, le cadre touché en mémoire.
  const stay = pickOf(catalog, pick.next, 'size', '90x120')
  assert.deepEqual([stay.next.size, stay.next.frame, stay.held], ['90x120', 'sans', 'noir'])
  // Choisir « Aucun » efface la mémoire.
  assert.deepEqual(pickOf(catalog, at90, 'frame', 'sans', 'blanc'), { next: at90, held: null, dropped: null, moved: null })
})

test('la toile en argent passe au poster sans cadre et le dit ; revenir à la toile le remet', () => {
  const argent = { ...TOILE, frame: 'argent' }
  const toPoster = pickOf(catalog, argent, 'material', 'poster')
  assert.deepEqual([toPoster.next.material, toPoster.next.frame, toPoster.held, toPoster.dropped], ['poster', 'sans', 'argent', 'argent'])
  assert.deepEqual(noticeOf(catalog, TEXTS_FR, argent, 'material', toPoster), { text: 'Poster : pas de cadre Argent, il est retiré.', action: null })
  assert.equal(pickOf(catalog, toPoster.next, 'material', 'toile', toPoster.held).next.frame, 'argent')
  // Le poster n'a jamais l'argent : ses tailles ne disent pas toutes « sans cadre ».
  assert.deepEqual(choicesOf(catalog, TEXTS_FR, 'size', toPoster.next, 'argent').options.map((o) => o.caption), ['', '', '', ''])
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

/* Retour de Walid sur la version 14 (09/11) : un choix s'applique et la rangée reste ouverte ; elle
   se ferme seulement par un toucher en dehors, ou Échap, qui ramène la 3D de face. */
test('un choix s’applique et la rangée reste ouverte, choix après choix', () => {
  let state = railEvent(null, { type: 'chip', group: 'border' })
  assert.deepEqual(state, { open: 'border', effects: ['stage'] })
  for (const id of ['noire', 'miroir', 'miroir']) {
    state = railEvent(state.open, { type: 'pick', group: 'border', id })
    assert.deepEqual(state, { open: 'border', effects: ['apply'] })
  }
})

test('seul un toucher en dehors ferme la rangée, et il ramène la vue de face', () => {
  assert.deepEqual(railEvent('frame', { type: 'outside' }), { open: null, effects: ['front'] })
  // Toucher la légende active, ou « De face », c'est toucher en dehors de la rangée.
  assert.deepEqual(railEvent('frame', { type: 'chip', group: 'frame' }), { open: null, effects: ['front'] })
  // Rangée fermée : un toucher sur la scène ne concerne pas les chips.
  assert.deepEqual(railEvent(null, { type: 'outside' }), { open: null, effects: [] })
})

test('au clavier : Échap ferme, revient de face et rend le focus à la légende ; un choix garde le focus', () => {
  assert.deepEqual(railEvent('size', { type: 'escape' }), { open: null, effects: ['front', 'focus-chip'] })
  assert.deepEqual(railEvent('size', { type: 'pick', group: 'size', id: '60x80', keyboard: true }), { open: 'size', effects: ['apply'] })
  // Le focus sort de la rangée (Tab) : elle se ferme comme pour un toucher en dehors.
  assert.deepEqual(railEvent('size', { type: 'focusout' }), { open: null, effects: ['front'] })
  assert.deepEqual(railEvent(null, { type: 'escape' }), { open: null, effects: [] })
})

/* Retour de Walid sur la version 15 (09/11) : ouvrir une rangée joue tout de suite la mise en scène de
   son groupe, avec le choix en cours, sans attendre qu'on en change. */
test('ouvrir une rangée, au doigt comme au clavier, joue tout de suite la mise en scène du groupe', () => {
  for (const group of ['border', 'passe', 'frame', 'size']) {
    assert.deepEqual(railEvent(null, { type: 'chip', group }), { open: group, effects: ['stage'] }, group)
    assert.deepEqual(railEvent(null, { type: 'chip', group, keyboard: true }), { open: group, effects: ['stage'] }, `${group} au clavier`)
  }
  // Choisir, toucher dehors, Échap : rien ne change.
  assert.deepEqual(railEvent('border', { type: 'pick', group: 'border', id: 'noire' }), { open: 'border', effects: ['apply'] })
  assert.deepEqual(railEvent('border', { type: 'outside' }), { open: null, effects: ['front'] })
})

/* Retour de Walid sur la version 18 (10/11) : rangée ouverte, il ne reste qu'elle. La légende touchée
   s'efface comme les autres, avec son filet ; plus de pulsation. Hors du plan de face, la plaque
   dépolie serre le texte. Ces règles vivent dans la feuille de style : on les y lit. */
// Les règles des chips vivent dans input.css (compilé dans assets/output.css), entre deux repères.
const INPUT_CSS = readFileSync(path.join(__dirname, '..', 'input.css'), 'utf8')
const CSS = INPUT_CSS.slice(
  INPUT_CSS.indexOf('/* ==== Fiche 3D : la scène et ses chips (début) ===='),
  INPUT_CSS.indexOf('/* ==== Fiche 3D : la scène et ses chips (fin) ==== */'),
)

test('rangée ouverte, toutes les légendes s’effacent, la touchée comprise, sans filet ni pulsation', () => {
  const rule = CSS.match(/\.chips\.is-open \.chips-toggle,[^{]*\{[^}]*\}/)
  assert.ok(rule, 'règle des chips effacées')
  assert.match(rule[0], /\.chips\.is-open \.chips-legend\s*[,{]/, 'toutes les légendes, sans exception')
  assert.match(rule[0], /opacity:\s*0;\s*pointer-events:\s*none/)
  assert.doesNotMatch(CSS, /aria-expanded="false"\]/, 'la légende touchée ne reste plus')
  assert.doesNotMatch(CSS, /pulse/, 'plus de pulsation')
  assert.doesNotMatch(CSS, /data-chips-open="(side|frame)"\] \.chips-mk/, 'plus de filet gardé')
})

/* Retour du coordinateur sur la version 19 (10/11) : refermée, les chips revenaient pendant que la 3D
   revenait de face, sur l'œuvre encore agrandie. Elles attendent la face (fin de is-returning), sauf
   celle qui a le focus (Échap la rend à la légende). */
test('rangée refermée, bascule, légendes et cote attendent que la 3D revienne de face, sauf celle qui a le focus', () => {
  const rule = CSS.match(/\.chips\.is-open \.chips-toggle,[^{]*\{[^}]*\}/)[0]
  for (const chip of ['toggle', 'cote', 'legend']) {
    assert.match(rule, new RegExp(`\\.chips\\.is-returning \\.chips-${chip}:not\\(:focus-within\\)\\s*[,{]`), `${chip} pendant le retour`)
  }
})

/* Retour de Walid du 12/11 : pendant l'acte de la matière (is-switching, que la page pose tant que le
   directeur joue l'acte : isActing), légendes, cote et filets s'effacent, leurs plaques gênaient. La
   bascule reste : c'est elle qu'on vient de toucher. */
test('le temps de la bascule Toile | Poster, légendes, cote et filets s’effacent ; la bascule reste', () => {
  const rule = CSS.match(/\.chips\.is-open \.chips-toggle,[^{]*\{[^}]*\}/)[0]
  for (const chip of ['cote', 'legend']) {
    assert.match(rule, new RegExp(`\\.chips\\.is-switching \\.chips-${chip}:not\\(:focus-within\\)\\s*[,{]`), `${chip} pendant l'acte`)
  }
  assert.match(rule, /\.chips\.is-switching \.chips-marks\s*[,{]/, 'les filets aussi')
  assert.doesNotMatch(CSS, /\.chips\.is-switching \.chips-(toggle|item)\b/, 'la bascule reste')
})

test('la plaque dépolie serre le texte sans le déplacer, et ne revient pas pendant le retour de face', () => {
  const label = CSS.match(/\.chips-label \{[^}]*padding[^}]*\}/)[0]
  const pad = label.match(/padding:\s*([\d.]+)px ([\d.]+)px/)
  const margin = label.match(/margin:\s*-([\d.]+)px -([\d.]+)px/)
  assert.deepEqual([margin[1], margin[2]], [pad[1], pad[2]], 'la marge négative compense le retrait')
  assert.ok(Number(pad[1]) <= 6 && Number(pad[2]) <= 10, `retrait de ${pad[1]} × ${pad[2]} px`)
  // Ni sous la rangée ouverte, ni pendant le retour de face : la plaque ne reparaît pas en s'effaçant.
  assert.match(CSS, /\.chips\.is-staged\.is-open \.chips-plate::before, \.chips\.is-staged\.is-returning \.chips-plate::before\s*\{\s*opacity:\s*0;/)
})

test('la bascule Toile | Poster n’a pas de rangée : elle s’applique, rien d’autre ne change', () => {
  assert.deepEqual(railEvent(null, { type: 'toggle', id: 'poster' }), { open: null, effects: ['apply'] })
})

/* ---- L'œuvre tournée au doigt, de face : plaques, filets et cote ----
   Retours de Walid du 11/11 : de face, le doigt tourne le tableau jusqu'à 40° de côté et 14° en hauteur.
   Les tests suivants projettent la vue du vrai directeur, aux extrêmes du geste, pour les quatre matières
   et cadres au plus petit et au plus grand format. */
const { faceOf, coteMarks, filetEnds, canvasBox, framingAt } = require('../assets/oeuvre-3d-chips.js')
const { createDirector, neutralRoom, paintingCorners, convexHull } = require('../assets/oeuvre-3d-engine.js')

const FRONT_ORDER = [[-1, 1], [1, 1], [1, -1], [-1, -1]] // haut gauche, haut droit, bas droit, bas gauche
const PHONE_3D = { W: 390, H: 488, fovScale: 1, top: 0 } // la zone de la 3D d'un téléphone, en px
const EXTREME_PRODUCTS = [
  { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false },
  { material: 'toile', size: '90x120', border: 'blanche', frame: 'sans', passe: false },
  { material: 'toile', size: '30x40', border: 'blanche', frame: 'chene', passe: false },
  { material: 'toile', size: '75x100', border: 'blanche', frame: 'chene', passe: false },
  { material: 'poster', size: '30x40', border: 'blanche', frame: 'sans', passe: true },
  { material: 'poster', size: '90x120', border: 'blanche', frame: 'sans', passe: true },
  { material: 'poster', size: '30x40', border: 'blanche', frame: 'noir', passe: true },
  { material: 'poster', size: '75x100', border: 'blanche', frame: 'noir', passe: true },
]
// Le doigt glissé de (dx, dy) parts de la scène : au plus fort (au-delà des bornes), et en chemin
// (0,3 et 0,4 de la largeur : 24° et 32° de côté).
const EXTREME_DRAGS = [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, 3], [3, -3], [-3, -3], [0.3, 3], [-0.3, 3], [0.4, 3], [-0.4, 3]]
const productName = (p) => `${p.material} ${p.frame === 'sans' ? 'sans cadre' : `cadre ${p.frame}`} ${p.size}`

/* Projection sténopé indépendante du moteur (regard vers la cible, haut = +y), en px d'un écran
   { W, H } ; fovScale élargit l'angle de vue et top décale l'image, comme le canvas de la page. */
function onScreen(view, point, frame = PHONE_3D) {
  const sub = (a, b) => a.map((v, i) => v - b[i])
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const unit = (a) => a.map((v) => v / Math.hypot(...a))
  const { position, target, fovY } = view.camera
  const forward = unit(sub(target, position))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const rel = sub(point, position)
  const t = Math.tan(fovY / 2) * frame.fovScale * dot(rel, forward)
  const { W, H } = frame
  return { x: ((dot(rel, right) / (t * (W / H)) + 1) / 2) * W, y: ((1 - dot(rel, up) / t) / 2) * H + frame.top }
}

// Les quatre coins de la boîte de l'œuvre (cadre compris), projetés : z = 1 la façade, z = 0 l'arrière.
const facade = (view, frame = PHONE_3D, z = 1) => {
  const box = paintingCorners(view.painting, 'outer').filter((c) => c.side.z === z)
  return FRONT_ORDER.map(([sx, sy]) => onScreen(view, box.find((c) => c.side.x === sx && c.side.y === sy), frame))
}

// L'écran de la page (chipsLayout) : le canvas centré sur l'œuvre, son angle de vue élargi (framingAt).
function sceneFrame(L) {
  const box = canvasBox(L)
  const f = framingAt(L, { w: 0, shift: 0, glH: box.height })
  return { W: L.W, H: box.height, fovScale: f.fovScale, top: box.top, aspect: f.aspect, screen: f.screen }
}

// La silhouette de l'œuvre (ses huit coins projetés), et l'écart d'un point à elle, en px : > 0 dehors.
const silhouette = (view, frame) => convexHull(paintingCorners(view.painting, 'outer').map((c) => {
  const p = onScreen(view, c, frame)
  return [p.x, p.y]
}))
function outside(hull, p) {
  let most = -Infinity
  hull.forEach(([ax, ay], i) => {
    const [bx, by] = hull[(i + 1) % hull.length]
    most = Math.max(most, -((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / Math.hypot(bx - ax, by - ay))
  })
  return most
}

function tilted(product, frame, [dx, dy]) {
  const director = createDirector({ room: neutralRoom(SIZES), product })
  director.grab(10)
  director.drag(dx, dy, 10)
  return director.view(10, frame.aspect || frame.W / frame.H, frame.screen)
}

/* Les coins projetés s'écartent jusqu'à 23 % de la largeur de l'œuvre, bien au-delà du seuil où les
   légendes prennent leur plaque : ce que l'inclinaison explique ne compte pas, et les plaques (son
   « encadré blanc ») ne viennent pas. Un vrai changement de plan les fait toujours venir. */
for (const product of EXTREME_PRODUCTS) {
  test(`${productName(product)} : de face, le doigt tourne le tableau sans faire venir les plaques ; un autre plan les fait venir`, () => {
    const front = createDirector({ room: neutralRoom(SIZES), product })
    const [tl, tr, br, bl] = facade(front.view(0, PHONE_3D.W / PHONE_3D.H))
    const art = { l: (tl.x + bl.x) / 2, r: (tr.x + br.x) / 2, t: (tl.y + tr.y) / 2, b: (bl.y + br.y) / 2 }
    art.w = art.r - art.l
    for (const drag of [[3, 0], [-3, 0], [3, 3], [-3, -3], [3, -3], [-3, 3]]) {
      const view = tilted(product, PHONE_3D, drag)
      assert.ok(faceOf(facade(view), art) < 0.6, 'sans compter l’inclinaison, les plaques viendraient : le test porte')
      assert.equal(faceOf(facade(view), art, view.tilt), 1, `glisser de ${drag} : toujours de face`)
    }
    front.choose('frame', product, 5000)
    const close = front.view(10000, PHONE_3D.W / PHONE_3D.H)
    assert.equal(faceOf(facade(close), art, close.tilt), 0, 'le coin du cadre est un autre plan')
  })
}

/* La cote sous l'œuvre (coteMarks). De face, comme dans le design (cadre 2b) : un trait à chaque coin
   bas, de 5 px au-dessus à 5 px au-dessous de la ligne, et deux lignes, des coins au blanc où s'écrit
   « Taille ». */
test('de face, la cote : un trait à chaque coin bas de l’œuvre, ses lignes des coins au blanc de « Taille »', () => {
  const m = coteMarks(chipsLayout({ width: 390, height: 792 }))
  const same = (got, want) => got.forEach((v, i) => near(v, want[i], 0.06))
  same(m.tickL, [67.95, 579.5, 67.95, 589.5])
  same(m.tickR, [322.05, 579.5, 322.05, 589.5])
  same(m.lineL, [67.95, 584.5, 166, 584.5])
  same(m.lineR, [322.05, 584.5, 224, 584.5])
})

/* Les filets des légendes. De face, ils finissent sur les bords de la façade, comme dans le design. */
test('de face, les filets finissent sur les bords de l’œuvre', () => {
  const L = chipsLayout({ width: 390, height: 792 })
  assert.deepEqual(filetEnds(L), { xl: L.art.l, xr: L.art.r })
  const frame = sceneFrame(L)
  const view = tilted(EXTREME_PRODUCTS[2], frame, [0, 0])
  const ends = filetEnds(L, facade(view, frame), facade(view, frame, 0))
  near(ends.xl, L.art.l, 0.6)
  near(ends.xr, L.art.r, 0.6)
})

/* Tourné au plus fort, le coin bas le plus proche descend, vu d'en haut, jusqu'à la cote, et la tranche
   de la toile (ou le flanc du cadre) se montre du côté de la caméra. Ni la cote ni les filets n'entrent
   dans la silhouette de l'œuvre (ses huit coins, cadre compris) : la cote s'arrête sous son bord bas,
   comme un trait tracé au mur qu'elle cache ; chaque filet s'arrête au bord de la silhouette et y pose
   son point. Sur un téléphone comme sur un ordinateur, dans le cadrage de la page. */
for (const [W, SH] of [[390, 792], [1440, 748]]) {
  for (const product of EXTREME_PRODUCTS) {
    test(`${W} × ${SH}, ${productName(product)} : tourné au plus fort, ni la cote ni les filets ne passent sur l’œuvre`, () => {
      const L = chipsLayout({ width: W, height: SH })
      const frame = sceneFrame(L)
      let lowest = -Infinity
      let band = -Infinity
      for (const drag of EXTREME_DRAGS) {
        const view = tilted(product, frame, drag)
        const hull = silhouette(view, frame)
        const corners = facade(view, frame)
        lowest = Math.max(lowest, ...corners.map((c) => c.y - (L.lineB - 5)))
        const marks = coteMarks(L, corners)
        for (const [name, s] of Object.entries(marks)) {
          if (!s) continue
          for (let i = 0; i <= 50; i++) {
            const p = { x: s[0] + ((s[2] - s[0]) * i) / 50, y: s[1] + ((s[3] - s[1]) * i) / 50 }
            assert.ok(outside(hull, p) > 1, `glisser de ${drag} : ${name} entre dans l’œuvre en ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`)
          }
        }
        assert.ok(marks.lineL && marks.lineR, `glisser de ${drag} : la cote garde ses deux lignes`)

        const y = L.lineY
        const onFacade = filetEnds(L, corners) // sans l'arrière : les bords de la façade
        band = Math.max(band, -outside(hull, { x: onFacade.xl, y }), -outside(hull, { x: onFacade.xr, y }))
        const ends = filetEnds(L, corners, facade(view, frame, 0))
        for (const [from, to, name] of [[L.marks.lx, ends.xl, 'filet gauche'], [L.marks.rx, ends.xr, 'filet droit']]) {
          assert.ok(Math.abs(outside(hull, { x: to, y })) < 0.75, `glisser de ${drag} : le point du ${name} est au bord de l’œuvre`)
          for (let i = 0; i <= 50; i++) {
            const x = from + ((to - from) * i) / 50
            if (Math.abs(to - x) >= 1.5) assert.ok(outside(hull, { x, y }) > 0.5, `glisser de ${drag} : le ${name} passe sur l’œuvre en ${x.toFixed(1)}`)
          }
        }
      }
      assert.ok(lowest > 0, 'au plus fort, un coin bas descend sous le haut des traits : le test porte')
      // Une feuille de papier n'a pas de tranche ; une toile ou un cadre en montrent une : le test porte.
      if (product.material === 'poster' && product.frame === 'sans') assert.ok(band < 1, `papier : ${band.toFixed(1)} px`)
      else assert.ok(band > 3, `au plus fort, la tranche ou le flanc du cadre dépasse la façade de ${band.toFixed(1)} px`)
    })
  }
}
