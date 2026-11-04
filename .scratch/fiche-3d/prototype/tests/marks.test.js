import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKS, dataMatrixCells, marksLayout, sizeText } from '../src/marks.js'
import { backLayout, stapleRows } from '../src/geometry.js'
import { SIZES, dimensionsOf } from '../src/catalog.js'

const TEXT_LENGTH = 2 // cm : le plus long format, large

test('le code est un Datamatrix décoratif : bord en L plein, bord opposé en pointillés, motif fixe', () => {
  const cells = dataMatrixCells()
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
  assert.deepEqual(dataMatrixCells(), cells, 'le même code à chaque fois')
})

test('la ligne de texte donne le format choisi', () => {
  assert.equal(sizeText('75x100'), '75×100 cm')
  assert.equal(sizeText('30x40'), '30×40 cm')
})

test('sur chaque format, les marques gardent leur taille réelle et tiennent dans la bande', () => {
  for (const size of SIZES) {
    const { width: W, height: H } = dimensionsOf(size)
    const { band } = backLayout(W, H)
    const { logo, code, text } = marksLayout(W, H, TEXT_LENGTH)
    assert.equal(logo.width, MARKS.logo)
    assert.equal(code.width, MARKS.code)
    assert.equal(text.height, TEXT_LENGTH)

    // Logo : au milieu de la bande du bas, entre le retour d'image et le bord de la bande.
    assert.equal(logo.x + logo.width / 2, 0)
    const fromBottom = logo.y + H / 2
    assert.ok(fromBottom >= MARKS.free && fromBottom + logo.height <= band, `logo du ${size}`)

    // Code et texte : dans la bande verticale, en bas à droite vu de dos.
    const right = W / 2 - (code.x + code.width), left = W / 2 - text.x
    assert.ok(right >= MARKS.free && left <= band, `code et texte du ${size} : ${right} à ${left} cm du bord`)
    assert.ok(text.x + text.width <= code.x, 'le texte est à côté du code, sans le toucher')
    assert.ok(code.y + H / 2 >= MARKS.free, 'le code reste au-dessus du retour d’image')
  }
})

test('l’agrafe du coin marqué ne touche ni le code ni le texte', () => {
  for (const size of SIZES) {
    const { width: W, height: H } = dimensionsOf(size)
    const { code, text, markedCornerInset } = marksLayout(W, H, TEXT_LENGTH)
    const top = Math.max(code.y + code.height, text.y + text.height) + H / 2
    assert.ok(markedCornerInset - 1 > top, `agrafe trop basse en ${size}`)
    assert.ok(markedCornerInset >= backLayout(W, H).cornerStapleInset)
  }
})

test('aucune agrafe du rang vertical ne vient sur les marques du coin', () => {
  for (const size of SIZES) {
    const { width: W, height: H } = dimensionsOf(size)
    const { upright } = stapleRows(W, H)
    const { markedCornerInset } = marksLayout(W, H, TEXT_LENGTH)
    const lowest = upright.first + H / 2 // distance au bord bas de la première agrafe du rang
    assert.ok(lowest - 2 > markedCornerInset, `${size} : agrafes à ${lowest.toFixed(1)} et ${markedCornerInset.toFixed(1)} cm`)
  }
})
