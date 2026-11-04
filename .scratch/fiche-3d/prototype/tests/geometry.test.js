import test from 'node:test'
import assert from 'node:assert/strict'
import { artBox, backLayout, backShell, curlPoint, curlShape, curlSheet, frameProfile, frameRing } from '../src/geometry.js'
import { FRAME_PROFILE } from '../src/catalog.js'

// Ce que l'arrondi retire au coin d'un rectangle 30 × 40, le long de la diagonale.
function cornerGap(paper) {
  const { position } = artBox({ width: 30, height: 40, depth: 0.05, border: 'blanche', paper })
  let far = 0
  for (let i = 0; i < position.length; i += 3) far = Math.max(far, Math.hypot(position[i], position[i + 1]))
  return Math.hypot(15, 20) - far
}

const triangles = ({ position, normal, index }) => {
  const list = []
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]].map((v) => [...position.subarray(v * 3, v * 3 + 3)])
    const u = a.map((v, k) => b[k] - v), w = a.map((v, k) => c[k] - v)
    const face = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    list.push({ a, b, c, face, normal: [...normal.subarray(index[i] * 3, index[i] * 3 + 3)] })
  }
  return list
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

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

test('la caisse américaine a un dos : le profil se referme derrière la toile', () => {
  const f = FRAME_PROFILE.toile
  const profile = frameProfile('toile', f)
  const [first, last] = [profile[0], profile[profile.length - 1]]
  assert.equal(first[0], last[0])
  assert.equal(first[1], last[1])
  const { normal } = frameRing({ hw: 15, hh: 20, profile })
  let rear = 0
  for (let i = 2; i < normal.length; i += 3) if (normal[i] < -0.99) rear++
  assert.ok(rear >= 16, 'une face tournée vers le mur sur les quatre baguettes')
})

test('la toile laisse son dos ouvert au châssis ; la feuille de papier reste fermée', () => {
  const rearFaces = (border) => triangles(artBox({ width: 30, height: 40, depth: 2, border })).filter((t) => t.face[2] < -1e-6).length
  assert.equal(rearFaces('blanche'), 0)
  assert.ok(rearFaces('papier') > 0)
})

test('sur une 75 × 100, le dos a les mesures relevées : 4 cm de toile repliée, puis 1,5 à 2 cm de pin', () => {
  const { band, bar } = backLayout(75, 100)
  assert.ok(Math.abs(band - 4) < 0.1)
  assert.ok(bar - band >= 1.5 && bar - band <= 2)
})

test('le dos de la toile : un anneau au ras du mur, des parois de châssis, la toile tendue au fond', () => {
  const data = backShell({ width: 30, height: 40, depth: 2 })
  const { bar } = backLayout(30, 40)
  const parts = [0, 1, 2].map((part) => {
    const zs = []
    for (let v = 0; v < data.part.length; v++) if (data.part[v] === part) zs.push(data.position[v * 3 + 2])
    return zs
  })
  assert.ok(parts[0].every((z) => z === 0), 'anneau en z = 0')
  assert.ok(parts[2].every((z) => z > 1.7 && z < 2), 'toile tendue juste derrière la façade')
  assert.ok(Math.min(...parts[1]) === 0 && Math.max(...parts[1]) > 1.7, 'parois sur toute la profondeur')

  for (const t of triangles(data)) {
    assert.ok(dot(t.face, t.normal) > 0, 'chaque face regarde le long de sa normale')
    assert.ok(t.normal[2] <= 1e-6, 'aucune face ne regarde vers la façade')
  }

  let inner = 0
  for (let v = 0; v < data.part.length; v++) {
    if (data.part[v] === 2) inner = Math.max(inner, data.position[v * 3])
  }
  assert.ok(Math.abs(inner - (15 - bar)) < 1e-5, 'ouverture du châssis')
})

const CORNER = { x: 1, y: -1 }

test('la feuille du coin soulevé regarde vers la façade, avec des mailles fines près du coin', () => {
  const data = curlSheet(CORNER)
  const place = ([gx, gy]) => [CORNER.x * (15 - gx * 30), CORNER.y * (20 - gy * 40), 0]
  for (let i = 0; i < data.index.length; i += 3) {
    const [a, b, c] = [data.index[i], data.index[i + 1], data.index[i + 2]]
      .map((v) => place([data.position[v * 3], data.position[v * 3 + 1]]))
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    assert.ok(area > 0, 'triangle retourné')
  }
  const steps = new Set()
  for (let v = 0; v < data.position.length; v += 3) steps.add(+data.position[v].toFixed(5))
  const ticks = [...steps].sort((p, q) => p - q)
  assert.ok(ticks[1] - ticks[0] < 0.012, 'maille fine au coin')
  assert.ok(ticks[ticks.length - 1] - ticks[ticks.length - 2] > 0.05, 'maille large ailleurs')
})

test('à plat, le coin ne bouge pas ; soulevé, il garde sa longueur de papier', () => {
  const flat = curlShape(0, 30, 40, CORNER)
  assert.deepEqual(curlPoint([15, -20], flat), [15, -20, 0])

  const shape = curlShape(0.7, 30, 40, CORNER)
  const [cx, cy] = [15, -20]
  const inward = [-shape.dir[0], -shape.dir[1]]
  let length = 0
  let previous = curlPoint([cx + inward[0] * shape.fold * 1.3, cy + inward[1] * shape.fold * 1.3], shape)
  const steps = 400
  for (let i = steps - 1; i >= 0; i--) {
    const d = (shape.fold * 1.3 * i) / steps
    const p = curlPoint([cx + inward[0] * d, cy + inward[1] * d], shape)
    length += Math.hypot(p[0] - previous[0], p[1] - previous[1], p[2] - previous[2])
    previous = p
  }
  const expected = shape.fold * 1.3
  assert.ok(Math.abs(length - expected) / expected < 0.01, `papier étiré : ${length.toFixed(2)} pour ${expected.toFixed(2)} cm`)
})

test('à fond, le coin s’enroule au-dessus de la feuille et ne passe jamais derrière le mur', () => {
  const shape = curlShape(1, 30, 40, CORNER)
  const tip = curlPoint([15, -20], shape)
  assert.ok(tip[2] > 1, `pointe trop basse : ${tip[2].toFixed(2)} cm`)
  assert.ok(tip[0] < 15 - shape.fold * 0.6, 'la pointe est revenue au-dessus de la feuille')
  for (let x = 0; x <= 15; x += 0.5) {
    for (let y = -20; y <= 0; y += 0.5) assert.ok(curlPoint([x, y], shape)[2] >= 0)
  }
  assert.deepEqual(curlPoint([-15, 20], shape), [-15, 20, 0])
})
