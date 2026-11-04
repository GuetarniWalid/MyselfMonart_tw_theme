/*
 * Murs d'essai, pour décider au ticket 11 comment régler les murs. Chaque mur est une tuile
 * répétable, peinte par le calcul sur un canvas : rien à télécharger. tileCm : largeur de la tuile
 * sur le mur. Le mur neutre n'a pas de tuile : c'est le mur uni de la scène.
 */

const TILE_PX = 1024

// Suite de nombres de 0 à 1, toujours la même : la tuile ne change pas d'une visite à l'autre.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

/* ---- Papier peint d'inspiration africaine : bandes cousues de pièces imprimées à la main, comme
   les bogolans, en tons de terre. ---- */

const EARTH = { terracotta: '#a65a35', sienna: '#864227', ochre: '#bf8840', umber: '#3f2a1d', cream: '#e4cca6' }
const EARTH_CELLS = 8

function line(ctx, points, close = false) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
  ctx.stroke()
}

function dots(ctx, points, radius) {
  for (const [x, y] of points) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()
  }
}

// Motifs dans une pièce de côté c, dessinés depuis son coin haut gauche. shake : main qui tremble.
const EARTH_MOTIFS = [
  function chevrons(ctx, c, shake) {
    for (let row = 0; row < 3; row++) {
      const y = c * (0.26 + 0.24 * row)
      line(ctx, [[0.1, 1], [0.3, -1], [0.5, 1], [0.7, -1], [0.9, 1]].map(([x, up]) => [c * x + shake(), y + up * c * 0.08 + shake()]))
    }
  },
  function diamonds(ctx, c, shake) {
    for (const r of [0.38, 0.24]) {
      line(ctx, [[0.5, 0.5 - r], [0.5 + r, 0.5], [0.5, 0.5 + r], [0.5 - r, 0.5]].map(([x, y]) => [c * x + shake(), c * y + shake()]), true)
    }
    dots(ctx, [[c * 0.5, c * 0.5]], c * 0.05)
  },
  function crosses(ctx, c, shake) {
    line(ctx, [[c * 0.14 + shake(), c * 0.14 + shake()], [c * 0.86 + shake(), c * 0.86 + shake()]])
    line(ctx, [[c * 0.86 + shake(), c * 0.14 + shake()], [c * 0.14 + shake(), c * 0.86 + shake()]])
    dots(ctx, [[0.5, 0.17], [0.5, 0.83], [0.17, 0.5], [0.83, 0.5]].map(([x, y]) => [c * x, c * y]), c * 0.04)
  },
  function stripes(ctx, c, shake) {
    for (let k = 0; k < 5; k++) {
      const x = c * (0.14 + 0.18 * k)
      line(ctx, [[x + shake(), c * 0.12], [x + shake(), c * 0.88]])
    }
  },
  function seeds(ctx, c, shake) {
    const points = []
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) points.push([c * (0.2 + 0.2 * i) + shake(), c * (0.2 + 0.2 * j) + shake()])
    dots(ctx, points, c * 0.045)
  },
  function teeth(ctx, c, shake) {
    for (const y of [0.3, 0.72]) {
      const zig = []
      for (let k = 0; k <= 8; k++) zig.push([c * (0.1 + 0.1 * k) + shake(), c * (y + (k % 2 ? -0.12 : 0.1)) + shake()])
      line(ctx, zig)
    }
    line(ctx, [[c * 0.1 + shake(), c * 0.5 + shake()], [c * 0.9 + shake(), c * 0.5 + shake()]])
  },
]

function paintEarth(ctx, size) {
  const random = seeded(7)
  const c = size / EARTH_CELLS
  const grounds = [EARTH.terracotta, EARTH.sienna, EARTH.umber, EARTH.ochre]
  ctx.lineCap = ctx.lineJoin = 'round'
  for (let col = 0; col < EARTH_CELLS; col++) {
    for (let row = 0; row < EARTH_CELLS; row++) {
      const ground = grounds[(col * 3 + row * 2 + (col >> 1)) % grounds.length]
      const ink = ground === EARTH.ochre ? EARTH.umber : EARTH.cream
      ctx.save()
      ctx.translate(col * c, row * c)
      ctx.fillStyle = ground
      ctx.fillRect(0, 0, c + 1, c + 1)
      ctx.strokeStyle = ctx.fillStyle = ink
      ctx.lineWidth = c * 0.042
      EARTH_MOTIFS[(col * 2 + row * 5) % EARTH_MOTIFS.length](ctx, c, () => (random() - 0.5) * c * 0.03)
      ctx.restore()
    }
  }
  // Coutures des bandes, et encre passée par endroits.
  ctx.fillStyle = 'rgba(40, 24, 14, 0.5)'
  for (let col = 0; col < EARTH_CELLS; col += 2) ctx.fillRect(col * c - 1, 0, 3, size)
  for (let k = 0; k < 2600; k++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(166, 90, 53, 0.22)' : 'rgba(40, 24, 14, 0.14)'
    ctx.beginPath()
    ctx.arc(random() * size, random() * size, 1 + random() * 3.5, 0, 2 * Math.PI)
    ctx.fill()
  }
}

/* ---- Carrelage de cuisine : zelliges vert sauge de 10 cm, joints clairs, émail inégal. ---- */

const TILE_CELLS = 8
const TILE_GREEN = [125, 153, 141]

const shade = ([r, g, b], k) => `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`

function paintTiles(ctx, size) {
  const random = seeded(23)
  const c = size / TILE_CELLS
  const joint = 3.5
  ctx.fillStyle = '#d8d2c4'
  ctx.fillRect(0, 0, size, size)
  for (let col = 0; col < TILE_CELLS; col++) {
    for (let row = 0; row < TILE_CELLS; row++) {
      const x = col * c + joint / 2, y = row * c + joint / 2, w = c - joint
      const tone = 0.86 + random() * 0.26
      // L'émail s'amasse vers le bas de chaque carreau, un peu de travers.
      const lean = (random() - 0.5) * w
      const glaze = ctx.createLinearGradient(x + lean, y, x - lean, y + w)
      glaze.addColorStop(0, shade(TILE_GREEN, tone * 1.07))
      glaze.addColorStop(1, shade(TILE_GREEN, tone * 0.93))
      ctx.fillStyle = glaze
      ctx.beginPath()
      ctx.roundRect(x, y, w, w, 4)
      ctx.fill()
      // La lumière vient du haut à gauche : bord clair de ce côté, sombre de l'autre.
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'
      line(ctx, [[x + 2, y + w - 3], [x + 2, y + 2], [x + w - 3, y + 2]])
      ctx.strokeStyle = 'rgba(30, 44, 38, 0.3)'
      line(ctx, [[x + w - 1, y + 3], [x + w - 1, y + w - 1], [x + 3, y + w - 1]])
      // Reflet doux de la fenêtre dans l'émail, et quelques piqûres.
      const shine = ctx.createRadialGradient(x + w * 0.3, y + w * 0.28, 0, x + w * 0.3, y + w * 0.28, w * 0.55)
      shine.addColorStop(0, `rgba(255, 255, 255, ${0.05 + random() * 0.1})`)
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shine
      ctx.fillRect(x, y, w, w)
      for (let k = 0; k < 7; k++) {
        ctx.fillStyle = 'rgba(40, 56, 50, 0.16)'
        ctx.fillRect(x + random() * w, y + random() * w, 1.5, 1.5)
      }
    }
  }
}

/* ---- Chambre d'enfant : nuages, étoiles, lunes et arcs-en-ciel pâles sur un fond de pêche. ---- */

const NURSERY = { ground: '#f2e2d6', cloud: '#fcf7f0', mustard: '#e9cd97', pink: '#e6baac', sage: '#bccdb9', blue: '#b9ced7' }
const NURSERY_CELLS = 4

function cloud(ctx, x, y, r) {
  ctx.fillStyle = NURSERY.cloud
  dots(ctx, [[x - r, y + r * 0.2], [x - r * 0.25, y - r * 0.3], [x + r * 0.6, y], [x + r * 1.15, y + r * 0.3]], r * 0.72)
  ctx.beginPath()
  ctx.roundRect(x - r * 1.5, y + r * 0.1, r * 3.2, r * 0.8, r * 0.4)
  ctx.fill()
}

function star(ctx, x, y, r, turn) {
  ctx.fillStyle = ctx.strokeStyle = NURSERY.mustard
  ctx.lineWidth = r * 0.3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let k = 0; k < 10; k++) {
    const a = turn + (k * Math.PI) / 5, d = k % 2 ? r * 0.45 : r
    ctx.lineTo(x + d * Math.sin(a), y - d * Math.cos(a))
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function moon(ctx, x, y, r) {
  ctx.fillStyle = NURSERY.blue
  ctx.beginPath()
  ctx.arc(x, y, r, 0.7, 0.7 + 1.5 * Math.PI)
  ctx.arc(x + r * 0.42, y - r * 0.32, r * 0.8, 0.7 + 1.5 * Math.PI, 0.7, true)
  ctx.closePath()
  ctx.fill()
}

function rainbow(ctx, x, y, r) {
  ctx.lineCap = 'round'
  ctx.lineWidth = r * 0.24
  for (const [k, color] of [[1, NURSERY.pink], [0.72, NURSERY.mustard], [0.44, NURSERY.sage]]) {
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.arc(x, y + r * 0.45, r * k, Math.PI, 2 * Math.PI)
    ctx.stroke()
  }
}

function paintNursery(ctx, size) {
  const random = seeded(41)
  const c = size / NURSERY_CELLS
  ctx.fillStyle = NURSERY.ground
  ctx.fillRect(0, 0, size, size)
  const motifs = [
    (x, y) => cloud(ctx, x, y, c * 0.17),
    (x, y) => star(ctx, x, y, c * 0.13, random()),
    (x, y) => rainbow(ctx, x, y, c * 0.22),
    (x, y) => moon(ctx, x, y, c * 0.17),
  ]
  for (let col = 0; col < NURSERY_CELLS; col++) {
    for (let row = 0; row < NURSERY_CELLS; row++) {
      const x = (col + 0.5) * c + (random() - 0.5) * c * 0.22
      const y = (row + 0.5) * c + (random() - 0.5) * c * 0.22
      motifs[(col + 2 * row + (row >> 1)) % motifs.length](x, y)
      // Entre les motifs, trois points de couleur.
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = [NURSERY.pink, NURSERY.sage, NURSERY.blue][k]
        dots(ctx, [[col * c + random() * c * 0.3, row * c + c * (0.05 + random() * 0.9)]], c * 0.016)
      }
    }
  }
}

export const WALLS = [
  { id: 'neutre', label: 'Neutre', color: '#e9e9e8' },
  { id: 'terre', label: 'Motif terre', color: EARTH.terracotta, tileCm: 72, paint: paintEarth },
  { id: 'carrelage', label: 'Carrelage', color: '#7d998d', tileCm: 80, paint: paintTiles },
  { id: 'enfant', label: 'Chambre d’enfant', color: NURSERY.ground, tileCm: 60, paint: paintNursery },
]

export const NEUTRAL_WALL = WALLS[0].id

export const wallOf = (id) => WALLS.find((wall) => wall.id === id) || WALLS[0]

export function paintWall(canvas, wall) {
  canvas.width = canvas.height = TILE_PX
  wall.paint(canvas.getContext('2d'), TILE_PX)
}
