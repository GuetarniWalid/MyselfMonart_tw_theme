// Tests des marques du dos de assets/oeuvre-3d-engine.js, repris du prototype (ticket 02).
const test = require('node:test')
const assert = require('node:assert/strict')
const {
  MARKS, STAPLE_DRIFT, dataMatrixCells, marksLayout, sizeText, backLayout, stapleRows, dimensionsOf,
} = require('../assets/oeuvre-3d-engine.js')

const SIZES = ['30x40', '60x80', '75x100', '90x120']

const FORMAT_LENGTH = 2 // cm : le plus long format, large
const PREMIUM_BOX = { height: 1.25, length: 8 } // en hauteurs de lettre, mesurée sur la planche
const layoutOf = (size) => {
  const { width: W, height: H } = dimensionsOf(size)
  return { W, H, marks: marksLayout(W, H, FORMAT_LENGTH, PREMIUM_BOX), back: backLayout(W, H) }
}
const staplesOf = ({ first, gap, count }) => Array.from({ length: count }, (_, k) => first + k * gap)
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test('le code est un Datamatrix décoratif : bord en L plein, bord opposé en pointillés, motif fixe', () => {
  const cells = dataMatrixCells(1)
  const n = cells.length
  assert.equal(n, cells[0].length)
  for (let i = 0; i < n; i++) {
    assert.equal(cells[i][0], true, 'bord gauche plein')
    assert.equal(cells[n - 1][i], true, 'bord bas plein')
  }
  for (let i = 0; i + 1 < n - 1; i++) {
    assert.notEqual(cells[0][i], cells[0][i + 1], 'bord haut en pointillés')
    assert.notEqual(cells[i][n - 1], cells[i + 1][n - 1], 'bord droit en pointillés')
  }
  const inner = cells.slice(1, -1).flatMap((row) => row.slice(1, -1))
  const dark = inner.filter(Boolean).length / inner.length
  assert.ok(dark > 0.35 && dark < 0.65, `motif déséquilibré : ${dark.toFixed(2)}`)
  assert.deepEqual(dataMatrixCells(1), cells, 'le même code à chaque fois')
})

test('les deux codes du dos sont différents', () => {
  assert.notDeepEqual(dataMatrixCells(1), dataMatrixCells(2))
})

test('la ligne de texte donne le format choisi', () => {
  assert.equal(sizeText('75x100'), '75×100 cm')
  assert.equal(sizeText('30x40'), '30×40 cm')
})

test('quelle que soit la police du téléphone, aucune agrafe ne touche PREMIUM, centré à mi-hauteur', () => {
  for (const [W, H] of [[30, 40], [60, 80], [75, 100], [90, 120]]) {
    const reach = backLayout(W, H).stapleLength / 2 + STAPLE_DRIFT
    for (const length of [5, 6.5, 8, 9.5, 12]) {
      const { premium, rightRows: { below, above } } = marksLayout(W, H, FORMAT_LENGTH, { ...PREMIUM_BOX, length })
      assert.ok(Math.abs(premium.y + premium.height / 2) < 1e-9, 'le mot et son équerre sont centrés sur le milieu')
      for (const at of staplesOf(below)) assert.ok(at + reach < premium.y, `${W} × ${H}, mot de ${length} : agrafe à ${at.toFixed(1)} cm`)
      for (const at of staplesOf(above)) assert.ok(at - reach > premium.y + premium.height, `${W} × ${H}, mot de ${length} : agrafe à ${at.toFixed(1)} cm`)
    }
  }
})

for (const size of SIZES) {
  test(`${size} : le logo est au centre de la bande du haut, à sa taille réelle`, () => {
    const { H, marks: { logo }, back: { band } } = layoutOf(size)
    assert.equal(logo.width, MARKS.logo)
    assert.equal(logo.x + logo.width / 2, 0)
    const fromTop = H / 2 - (logo.y + logo.height)
    assert.ok(fromTop >= MARKS.free && fromTop + logo.height <= band, `logo à ${fromTop} cm du haut`)
  })

  test(`${size} : un code et le format, côte à côte, au centre de la bande du bas`, () => {
    const { H, marks: { centerCode, format }, back: { band } } = layoutOf(size)
    assert.equal(centerCode.width, MARKS.code)
    assert.equal(format.width, FORMAT_LENGTH)
    assert.ok(Math.abs(centerCode.x + (format.x + format.width)) < 1e-9, 'le groupe est centré')
    assert.ok(centerCode.x + centerCode.width <= format.x, 'le format est à côté du code')
    for (const mark of [centerCode, format]) {
      const fromBottom = mark.y + H / 2
      assert.ok(fromBottom >= MARKS.free && fromBottom + mark.height <= band, `marque à ${fromBottom} cm du bas`)
    }
  })

  test(`${size} : le code du coin reste en bas à droite, sur la bande verticale, sans texte`, () => {
    const { W, H, marks: { cornerCode, format }, back: { band } } = layoutOf(size)
    assert.equal(cornerCode.width, MARKS.code)
    const fromRight = W / 2 - (cornerCode.x + cornerCode.width)
    assert.ok(fromRight >= MARKS.free && fromRight + cornerCode.width <= band, `code à ${fromRight} cm du bord`)
    assert.ok(cornerCode.y + H / 2 >= MARKS.free, 'au-dessus du retour d’image')
    assert.equal(overlap(cornerCode, format), false)
  })

  test(`${size} : PREMIUM longe la bande verticale de droite, en lettres de 28 % de la bande`, () => {
    const { W, H, marks: { premium }, back: { band } } = layoutOf(size)
    assert.ok(Math.abs(premium.width - 0.28 * band * PREMIUM_BOX.height) < 1e-9, 'hauteur des lettres')
    assert.ok(Math.abs(premium.height - 0.28 * band * PREMIUM_BOX.length) < 1e-9, 'longueur du mot et de son équerre')
    const fromRight = W / 2 - (premium.x + premium.width)
    assert.ok(fromRight >= MARKS.free && fromRight + premium.width <= band, `PREMIUM à ${fromRight} cm du bord`)
    const height = (premium.y + premium.height / 2 + H / 2) / H
    assert.ok(Math.abs(height - 1 / 2) < 1e-9, `à ${(height * 100).toFixed(0)} % de la hauteur`)
  })

  test(`${size} : sur la bande de droite, les agrafes restent régulières autour du mot`, () => {
    const { W, H, marks: { rightRows: { below, above } } } = layoutOf(size)
    for (const row of [below, above]) assert.ok(row.gap > 8 && row.gap < 14, `écart de ${row.gap.toFixed(1)} cm`)
    const nearestBelow = below.first + (below.count - 1) * below.gap
    assert.ok(Math.abs(above.first + nearestBelow) < 1e-9, 'ses deux voisines sont à la même distance du mot')
    const wordCell = 2 * above.first
    assert.ok(wordCell < 1.35 * Math.min(above.gap, below.gap), `case du mot de ${wordCell.toFixed(1)} cm`)
    const staples = below.count + above.count
    assert.ok(Math.abs(staples - stapleRows(W, H).upright.count) <= 1, `${staples} agrafes, à une près celles de l'autre côté`)
  })

  test(`${size} : aucune agrafe ne passe sur le code du coin`, () => {
    const { W, H, marks: { markedCornerInset, cornerCode, rightRows: { below } }, back: { stapleLength } } = layoutOf(size)
    assert.ok(H / 2 + cornerCode.y + cornerCode.height < markedCornerInset - stapleLength / 2, 'agrafe du coin au-dessus du code')
    assert.ok(markedCornerInset >= backLayout(W, H).cornerStapleInset)
    const lowest = below.first + H / 2
    assert.ok(lowest - stapleLength > markedCornerInset, 'le rang vertical laisse le coin tranquille')
  })

  test(`${size} : les rangs d'agrafes s'écartent du logo et du code du centre`, () => {
    const { marks: { logo, centerCode, format, rowClear }, back: { stapleLength } } = layoutOf(size)
    const reach = stapleLength / 2 + STAPLE_DRIFT
    assert.ok(rowClear.top >= logo.width / 2 + reach)
    assert.ok(rowClear.bottom >= format.x + format.width + reach)
    assert.ok(rowClear.bottom >= -centerCode.x + reach)
  })
}
