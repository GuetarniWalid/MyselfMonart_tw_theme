/*
 * Géométrie de l'œuvre et des cadres (module pur : tableaux de nombres, sans three.js).
 * Unités : cm. L'œuvre occupe x ∈ [-W/2, W/2], y ∈ [-H/2, H/2], z ∈ [0, D] (dos au mur).
 */

import { borderTakesImage } from './catalog.js'

const CANVAS_CORNER = 0.3
const PAPER_CORNER = 0.02
const CORNER_SEGMENTS = 4
const CANVAS_EDGE = 0.25 // arrondi de la toile qui tourne sur le châssis

// Contour à coins arrondis, dans le sens trigonométrique vu de face, un arc par coin.
function roundedContour(W, H, rc) {
  const rim = []
  const arc = (cx, cy, a0) => {
    for (let k = 0; k <= CORNER_SEGMENTS; k++) {
      const a = a0 + (k / CORNER_SEGMENTS) * (Math.PI / 2)
      rim.push({ x: cx + rc * Math.cos(a), y: cy + rc * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) })
    }
  }
  arc(W / 2 - rc, -H / 2 + rc, -Math.PI / 2)
  arc(W / 2 - rc, H / 2 - rc, 0)
  arc(-W / 2 + rc, H / 2 - rc, Math.PI / 2)
  arc(-W / 2 + rc, -H / 2 + rc, Math.PI)
  return rim
}

/* Toile (ou feuille) : rectangle à coins à peine arrondis, arête avant arrondie (la toile
   qui tourne sur le châssis), tranches droites. Seule la feuille a son dos ici : celui de la
   toile est ouvert sur le châssis (backShell).
   Bordures : 'blanche' et 'noire' (tranche unie), 'etiree' (le bord de l'image est tiré
   sur la tranche), 'miroir' (la bande voisine du bord, en reflet), 'pliee' (l'image
   continue sur la tranche : la façade montre donc le centre de l'image), 'papier'.
   paper : de 0 (toile, qui tourne autour du châssis) à 1 (feuille, coupée net).
   Attributs : uv (image), fab (grain, en cm), art (1 = image, 0 = couleur de tranche). */
export function artBox({ width: W, height: H, depth: D, border, paper = 0 }) {
  const M = 4 // segments de l'arête avant
  const corner = CANVAS_CORNER + (PAPER_CORNER - CANVAS_CORNER) * paper
  const rc = Math.min(corner, W / 2, H / 2)
  const re = Math.min(CANVAS_EDGE, D * 0.45, rc * 0.95)
  const fold = border === 'pliee'
  const sideArt = borderTakesImage(border)

  // Coordonnées d'image : origine en haut à gauche, les textures n'étant pas retournées.
  const artUV = (x, y) =>
    fold
      ? [(x + W / 2 + D) / (W + 2 * D), 1 - (y + H / 2 + D) / (H + 2 * D)]
      : [(x + W / 2) / W, 1 - (y + H / 2) / H]

  const rim = roundedContour(W, H, rc)
  const N = rim.length

  const position = [], normal = [], uv = [], fab = [], art = [], index = []
  const vertex = (p, n, t, isArt) => {
    position.push(p[0], p[1], p[2])
    normal.push(n[0], n[1], n[2])
    uv.push(t[0], t[1])
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2])
    if (az >= ax && az >= ay) fab.push(p[0], p[1])
    else if (ax >= ay) fab.push(p[2], p[1])
    else fab.push(p[0], p[2])
    art.push(isArt)
    return position.length / 3 - 1
  }
  // Bande entre deux anneaux (a vers l'avant, b vers l'arrière), faces tournées vers l'extérieur.
  const strip = (a, b) => {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      index.push(a[i], b[j], a[j], a[i], b[i], b[j])
    }
  }

  // Façade : éventail depuis le centre, sur le contour rentré de l'arrondi.
  const center = vertex([0, 0, D], [0, 0, 1], artUV(0, 0), 1)
  let previous = []
  for (let j = 0; j <= M; j++) {
    const phi = (j / M) * (Math.PI / 2)
    const inset = re * (1 - Math.sin(phi))
    const z = D - re * (1 - Math.cos(phi))
    const ring = rim.map((p) => {
      const x = p.x - p.nx * inset, y = p.y - p.ny * inset
      const n = [Math.sin(phi) * p.nx, Math.sin(phi) * p.ny, Math.cos(phi)]
      return vertex([x, y, z], n, artUV(x, y), 1)
    })
    if (j === 0) for (let i = 0; i < N; i++) index.push(center, ring[i], ring[(i + 1) % N])
    else strip(previous, ring)
    previous = ring
  }

  // Tranches : de la fin de l'arrondi jusqu'au mur. s = profondeur sous la façade.
  const sideUV = (p, s) => {
    if (border === 'pliee') return artUV(p.x + p.nx * s, p.y + p.ny * s)
    if (border === 'miroir') return artUV(p.x - p.nx * s, p.y - p.ny * s)
    return artUV(p.x, p.y)
  }
  const sideRing = (z) =>
    rim.map((p) => vertex([p.x, p.y, z], [p.nx, p.ny, 0], sideUV(p, D - z), sideArt ? 1 : 0))
  strip(sideRing(D - re), sideRing(0))

  if (border === 'papier') {
    const back = rim.map((p) => vertex([p.x, p.y, 0], [0, 0, -1], [0, 0], 0))
    const backCenter = vertex([0, 0, 0], [0, 0, -1], [0, 0], 0)
    for (let i = 0; i < N; i++) index.push(backCenter, back[(i + 1) % N], back[i])
  }

  return pack({ position, normal, uv, fab, art, index })
}

/* Dos de la toile, selon le petit côté du tableau : côté, bande de toile repliée, pin, agrafe. Le
   75 × 100 vient des photos de Walid ; les autres valeurs sont des estimations, à comparer aux
   vrais tableaux. Entre deux lignes, elles s'interpolent ; au-delà, elles ne changent plus. */
const BACK_WIDTHS = [[30, 2.5, 1.2, 1.2], [60, 3.5, 1.7, 1.6], [75, 4, 2, 2]]

function backWidth(size, column) {
  const next = BACK_WIDTHS.findIndex(([side]) => side >= size)
  if (next === 0) return BACK_WIDTHS[0][column]
  if (next < 0) return BACK_WIDTHS[BACK_WIDTHS.length - 1][column]
  const a = BACK_WIDTHS[next - 1], b = BACK_WIDTHS[next]
  return a[column] + ((b[column] - a[column]) * (size - a[0])) / (b[0] - a[0])
}

/* band : toile repliée. bar : largeur totale du châssis vu de dos. stapleLength : longueur d'une
   agrafe. cornerStapleInset : distance au bord haut ou bas de l'agrafe de chaque coin. */
export function backLayout(W, H) {
  const size = Math.min(W, H)
  const band = backWidth(size, 1)
  return { band, bar: band + backWidth(size, 2), stapleLength: backWidth(size, 3), cornerStapleInset: 0.75 * band }
}

const STAPLE_EVERY = 11

// Rang d'agrafes régulier sur `span` cm centrés : premier, écart, nombre. `ends` : les bouts
// du rang portent déjà une agrafe (celles du coin), sinon elles sont à une demi-maille du bout.
function stapleRow(span, ends) {
  const cells = Math.max(ends ? 2 : 1, Math.round(span / STAPLE_EVERY))
  const gap = span / cells
  return { first: -span / 2 + (ends ? gap : gap / 2), gap, count: ends ? cells - 1 : cells }
}

/* Agrafes le long des bandes, tous les 10 à 12 cm, un peu plus sur les petits formats. Sur les
   bords verticaux, le rang s'accroche aux agrafes des coins ; sur les bords horizontaux, il va
   d'une bande verticale à l'autre. */
export function stapleRows(W, H) {
  const { band, cornerStapleInset } = backLayout(W, H)
  return { upright: stapleRow(H - 2 * cornerStapleInset, true), flat: stapleRow(W - 2 * band, false) }
}

const CANVAS_SKIN = 0.12 // la toile tendue est juste derrière la façade

/* Coquille du dos : un anneau au ras de l'arrière du châssis (bande repliée et pin), les
   parois intérieures du châssis, la toile tendue au fond. Tout le détail est peint par le
   shader du dos (back-shader.js). Attribut part : 0 anneau, 1 parois, 2 toile tendue. */
export function backShell({ width: W, height: H, depth: D }) {
  const { bar } = backLayout(W, H)
  const ix = W / 2 - bar, iy = H / 2 - bar
  const panel = Math.max(0, D - CANVAS_SKIN)
  const position = [], normal = [], uv = [], part = [], index = []
  const vertex = (x, y, z, n, kind) => {
    position.push(x, y, z)
    normal.push(...n)
    uv.push(x, y)
    part.push(kind)
    return position.length / 3 - 1
  }
  const REAR = [0, 0, -1]

  // Anneau : chaque arc du contour se referme sur le coin de l'ouverture le plus proche.
  const rim = roundedContour(W, H, Math.min(CANVAS_CORNER, W / 2, H / 2))
  const opening = [[ix, -iy], [ix, iy], [-ix, iy], [-ix, -iy]]
  const outer = rim.map((p) => vertex(p.x, p.y, 0, REAR, 0))
  const inner = opening.map(([x, y]) => vertex(x, y, 0, REAR, 0))
  const perArc = CORNER_SEGMENTS + 1
  for (let c = 0; c < 4; c++) {
    const first = c * perArc
    for (let k = 0; k < CORNER_SEGMENTS; k++) index.push(outer[first + k + 1], outer[first + k], inner[c])
    const last = first + CORNER_SEGMENTS, next = ((c + 1) % 4) * perArc
    index.push(outer[next], outer[last], inner[c], outer[next], inner[c], inner[(c + 1) % 4])
  }

  // Parois : tournées vers le centre de l'ouverture.
  for (let c = 0; c < 4; c++) {
    const [ax, ay] = opening[c], [bx, by] = opening[(c + 1) % 4]
    const length = Math.hypot(bx - ax, by - ay)
    const n = [-(by - ay) / length, (bx - ax) / length, 0]
    const a0 = vertex(ax, ay, 0, n, 1), b0 = vertex(bx, by, 0, n, 1)
    const b1 = vertex(bx, by, panel, n, 1), a1 = vertex(ax, ay, panel, n, 1)
    index.push(a0, a1, b1, a0, b1, b0)
  }

  // Toile tendue, au fond.
  const [p0, p1, p2, p3] = opening.map(([x, y]) => vertex(x, y, panel, REAR, 2))
  index.push(p0, p3, p2, p0, p2, p1)

  return pack({ position, normal, uv, part, index })
}

/* Coin soulevé du poster : au-delà d'une ligne de pli, le papier s'enroule sur un cylindre
   sans s'étirer, puis repart droit. Le rayon s'élargit vers les bouts du pli, comme une
   feuille qui se courbe en cône. Tailles en part du petit côté de la feuille.
   Le vertex shader de la feuille (scene.js) fait le même calcul que curlPoint. */
export const CURL = {
  angle: (42 * Math.PI) / 180, // direction du coin, depuis l'horizontale
  fold: 0.23, // distance du coin à la ligne de pli, à fond
  loose: 0.2, // rayon du papier qui commence à se lever
  tight: 0.048, // rayon du papier enroulé
  roll: 3.6, // angle d'enroulement maximal (radians)
  cone: 0.35,
}

// corner : coin soulevé (signes x et y). amount : 0 à plat, 1 à fond.
export function curlShape(amount, W, H, corner) {
  const size = Math.min(W, H)
  const tight = amount * amount * (3 - 2 * amount)
  return {
    tip: [(corner.x * W) / 2, (corner.y * H) / 2],
    dir: [corner.x * Math.cos(CURL.angle), corner.y * Math.sin(CURL.angle)],
    fold: CURL.fold * size * Math.pow(amount, 0.8),
    radius: size * (CURL.loose + (CURL.tight - CURL.loose) * tight),
  }
}

// Point (x, y) de la feuille à plat -> position courbée, z au-dessus de la feuille.
export function curlPoint([x, y], { tip, dir, fold, radius }) {
  const rx = x - tip[0], ry = y - tip[1]
  const beyond = rx * dir[0] + ry * dir[1] + fold
  if (beyond <= 0 || fold === 0) return [x, y, 0]
  const across = -rx * dir[1] + ry * dir[0]
  const r = radius * (1 + (CURL.cone * Math.abs(across)) / fold)
  const phi = Math.min(beyond / r, CURL.roll)
  const rest = beyond - phi * r
  const shift = r * Math.sin(phi) + rest * Math.cos(phi) - beyond
  return [x + dir[0] * shift, y + dir[1] * shift, r * (1 - Math.cos(phi)) + rest * Math.sin(phi)]
}

// Contour du coin soulevé, à plat : les deux bords du papier, la pointe, le haut de la courbe.
export function curlOutline({ tip, dir, fold, radius }) {
  const edgeX = [-fold / dir[0], 0], edgeY = [0, -fold / dir[1]]
  const onEdge = ([dx, dy], t) => [tip[0] + dx * t, tip[1] + dy * t]
  const onDiagonal = (s) => [tip[0] - dir[0] * (fold - s), tip[1] - dir[1] * (fold - s)]
  return [
    onEdge(edgeX, 1), onEdge(edgeX, 0.5), tip, onEdge(edgeY, 0.5), onEdge(edgeY, 1),
    onDiagonal(Math.min(fold, (radius * Math.PI) / 2)), onDiagonal(Math.min(fold, radius * Math.PI)),
  ]
}

/* Grille de la feuille, dans le carré unité : (0, 0) au coin soulevé, (1, 1) à l'opposé. Le
   shader la met à la taille de la feuille : une seule grille, préparée une fois pour tous les
   formats. Mailles fines là où le papier se courbe, diagonales parallèles au pli. */
const CURL_ZONE = 0.45
const CURL_FINE = 44
const CURL_COARSE = 6

export function curlSheet(corner) {
  const ticks = []
  for (let i = 0; i < CURL_FINE; i++) ticks.push((i / CURL_FINE) * CURL_ZONE)
  for (let i = 0; i <= CURL_COARSE; i++) ticks.push(CURL_ZONE + (i / CURL_COARSE) * (1 - CURL_ZONE))
  const n = ticks.length
  const position = [], normal = [], uv = [], index = []
  for (const gy of ticks) {
    for (const gx of ticks) {
      position.push(gx, gy, 0)
      normal.push(0, 0, 1)
      uv.push(gx, gy)
    }
  }
  const facing = corner.x * corner.y > 0
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1
      if (facing) index.push(a, b, c, b, d, c)
      else index.push(a, c, b, b, c, d)
    }
  }
  return pack({ position, normal, uv, index })
}

/* Cadre : 4 baguettes en onglet autour d'une ouverture (demi-tailles hw, hh), décrites
   par un profil (u, z, shade) : u = écart vers l'extérieur depuis le bord de l'ouverture,
   z = hauteur depuis le mur, shade = part de lumière qui arrive là (1 par défaut, moins dans
   les creux). La normale d'un segment est (-dz, du), donc le profil se lit de l'intérieur
   vers l'extérieur. uv : grain du bois le long de la baguette, en cm. */
export function frameRing({ hw, hh, profile }) {
  const position = [], normal = [], uv = [], shades = [], index = []
  const OUT = [[0, -1], [1, 0], [0, 1], [-1, 0]] // bas, droite, haut, gauche
  const rect = (u) => [[-hw - u, -hh - u], [hw + u, -hh - u], [hw + u, hh + u], [-hw - u, hh + u]]
  for (let s = 0; s < profile.length - 1; s++) {
    const [u0, z0, shade0 = 1] = profile[s]
    const [u1, z1, shade1 = 1] = profile[s + 1]
    const len = Math.hypot(u1 - u0, z1 - z0)
    if (len < 1e-6) continue
    const nu = -(z1 - z0) / len
    const nz = (u1 - u0) / len
    const wall = Math.abs(nz) < 0.5 // segment presque vertical : on déroule le grain en z
    const A = rect(u0), B = rect(u1)
    for (let k = 0; k < 4; k++) {
      const n = [OUT[k][0] * nu, OUT[k][1] * nu, nz]
      const along = k % 2 === 0 ? 0 : 1 // baguettes du bas et du haut : grain selon x
      const quad = [
        [A[k], z0, u0, shade0], [A[(k + 1) % 4], z0, u0, shade0], [B[(k + 1) % 4], z1, u1, shade1], [B[k], z1, u1, shade1],
      ]
      const base = position.length / 3
      for (const [[x, y], z, u, shade] of quad) {
        position.push(x, y, z)
        normal.push(n[0], n[1], n[2])
        shades.push(shade)
        // Chaque baguette est taillée dans un autre endroit de la planche (décalage par côté).
        uv.push((wall ? z : u) + k * 2.37, (along === 0 ? x : y) + k * 7.1)
      }
      index.push(base, base + 2, base + 1, base, base + 3, base + 2)
    }
  }
  return pack({ position, normal, uv, shade: shades, index })
}

/* Profils de cadre (cm), pour une œuvre W × H et un profil du catalogue.
   Toile : caisse américaine (fond où la toile flotte, paroi intérieure, face, paroi
   extérieure, puis le dos, qui se voit quand la toile fait son tour).
   Poster : baguette dont la feuillure recouvre le bord du tirage, verre. */
const CHAMFER = 0.08

export function frameProfile(kind, f) {
  const c = CHAMFER
  if (kind === 'toile') {
    return [
      [-f.gap, f.floor, 0.3],
      [0, f.floor, 0.45],
      [0, f.depth - c, 0.9],
      [c, f.depth],
      [f.face - c, f.depth],
      [f.face, f.depth - c],
      [f.face, 0],
      [-f.gap, 0],
      [-f.gap, f.floor],
    ]
  }
  const glassZ = f.floor + 0.1
  return [
    [0, glassZ, 0.7],
    [0, f.depth - c, 0.95],
    [c, f.depth],
    [f.face - c, f.depth],
    [f.face, f.depth - c],
    [f.face, 0],
  ]
}

// Demi-tailles de l'ouverture du cadre pour une œuvre W × H (gap négatif : la feuillure
// recouvre le bord de l'œuvre).
export function frameOpening(W, H, f) {
  return { hw: W / 2 + f.gap, hh: H / 2 + f.gap }
}

// Enveloppe convexe 2D (chaîne monotone d'Andrew), sens trigonométrique : l'ombre du
// tableau sur le mur est l'enveloppe de ses coins projetés le long de la lumière.
export function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

function pack({ position, normal, uv, fab, art, shade, part, index }) {
  const out = {
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    uv: new Float32Array(uv),
    index: position.length / 3 > 65535 ? new Uint32Array(index) : new Uint16Array(index),
  }
  if (fab) out.fab = new Float32Array(fab)
  if (art) out.art = new Float32Array(art)
  if (shade) out.shade = new Float32Array(shade)
  if (part) out.part = new Float32Array(part)
  return out
}
