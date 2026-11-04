import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKS, dataMatrixCells, marksLayout, sizeText } from '../src/marks.js'
import { backLayout, stapleRows } from '../src/geometry.js'
import { SIZES, dimensionsOf } from '../src/catalog.js'

const FORMAT_LENGTH = 2 // cm : le plus long format, large
const PREMIUM_LENGTH = 2
const layoutOf = (size) => {
  const { width: W, height: H } = dimensionsOf(size)
  return { W, H, marks: marksLayout(W, H, FORMAT_LENGTH, PREMIUM_LENGTH), back: backLayout(W, H) }
}
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

  test(`${size} : PREMIUM longe la bande verticale de droite, vers les deux tiers de la hauteur`, () => {
    const { W, H, marks: { premium }, back: { band } } = layoutOf(size)
    assert.equal(premium.height, PREMIUM_LENGTH)
    assert.equal(premium.width, MARKS.textHeight)
    const fromRight = W / 2 - (premium.x + premium.width)
    assert.ok(fromRight >= MARKS.free && fromRight + premium.width <= band, `PREMIUM à ${fromRight} cm du bord`)
    const height = (premium.y + premium.height / 2 + H / 2) / H
    assert.ok(height > 0.6 && height < 0.75, `à ${(height * 100).toFixed(0)} % de la hauteur`)
  })

  test(`${size} : aucune agrafe ne passe sur PREMIUM ni sur le code du coin`, () => {
    const { W, H, marks: { premium, markedCornerInset, cornerCode }, back: { stapleLength } } = layoutOf(size)
    const { upright } = stapleRows(W, H)
    const reach = stapleLength / 2 + 0.7 // demi-longueur et décalage de la pose à la main
    for (let k = 0; k < upright.count; k++) {
      const at = upright.first + k * upright.gap
      assert.ok(at + reach < premium.y || at - reach > premium.y + premium.height, `agrafe à ${at.toFixed(1)} cm sur PREMIUM`)
    }
    assert.ok(H / 2 + cornerCode.y + cornerCode.height < markedCornerInset - stapleLength / 2, 'agrafe du coin au-dessus du code')
    assert.ok(markedCornerInset >= backLayout(W, H).cornerStapleInset)
    const lowest = upright.first + H / 2
    assert.ok(lowest - stapleLength > markedCornerInset, 'le rang vertical laisse le coin tranquille')
  })

  test(`${size} : les rangs d'agrafes s'écartent du logo et du code du centre`, () => {
    const { marks: { logo, centerCode, format, rowClear }, back: { stapleLength } } = layoutOf(size)
    assert.ok(rowClear.top >= logo.width / 2 + stapleLength / 2 + 0.7)
    assert.ok(rowClear.bottom >= format.x + format.width + stapleLength / 2 + 0.7)
    assert.ok(rowClear.bottom >= -centerCode.x + stapleLength / 2 + 0.7)
  })
}
