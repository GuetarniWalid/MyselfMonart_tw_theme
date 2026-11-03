/*
 * Géométrie de l'œuvre et des cadres (module pur : tableaux de nombres, sans three.js).
 * Unités : cm. L'œuvre occupe x ∈ [-W/2, W/2], y ∈ [-H/2, H/2], z ∈ [0, D] (dos au mur).
 */

/* Toile (ou feuille) : rectangle à coins à peine arrondis, arête avant arrondie (la toile
   qui tourne sur le châssis), tranches droites, dos fermé.
   Bordures : 'blanche' et 'noire' (tranche unie), 'etiree' (le bord de l'image est tiré
   sur la tranche), 'miroir' (la bande voisine du bord, en reflet), 'pliee' (l'image
   continue sur la tranche : la façade montre donc le centre de l'image), 'papier'.
   Attributs : uv (image), fab (grain, en cm), art (1 = image, 0 = couleur de tranche). */
export function artBox({ width: W, height: H, depth: D, border, edge = 0.25, corner = 0.3 }) {
  const K = 4 // segments par coin arrondi
  const M = 4 // segments de l'arête avant
  const rc = Math.min(corner, W / 2, H / 2)
  const re = Math.min(edge, D * 0.45, rc * 0.95)
  const fold = border === 'pliee'
  const sideArt = border === 'pliee' || border === 'miroir' || border === 'etiree'

  const artUV = (x, y) =>
    fold
      ? [(x + W / 2 + D) / (W + 2 * D), (y + H / 2 + D) / (H + 2 * D)]
      : [(x + W / 2) / W, (y + H / 2) / H]

  // Contour extérieur, dans le sens trigonométrique vu de face.
  const rim = []
  const arc = (cx, cy, a0) => {
    for (let k = 0; k <= K; k++) {
      const a = a0 + (k / K) * (Math.PI / 2)
      rim.push({ x: cx + rc * Math.cos(a), y: cy + rc * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) })
    }
  }
  arc(W / 2 - rc, -H / 2 + rc, -Math.PI / 2)
  arc(W / 2 - rc, H / 2 - rc, 0)
  arc(-W / 2 + rc, H / 2 - rc, Math.PI / 2)
  arc(-W / 2 + rc, -H / 2 + rc, Math.PI)
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

  // Dos : fermé, couleur de tranche.
  const back = rim.map((p) => vertex([p.x, p.y, 0], [0, 0, -1], [0, 0], 0))
  const backCenter = vertex([0, 0, 0], [0, 0, -1], [0, 0], 0)
  for (let i = 0; i < N; i++) index.push(backCenter, back[(i + 1) % N], back[i])

  return pack({ position, normal, uv, fab, art, index })
}

/* Cadre : 4 baguettes en onglet autour d'une ouverture (demi-tailles hw, hh), décrites
   par un profil (u, z) : u = écart vers l'extérieur depuis le bord de l'ouverture, z =
   hauteur depuis le mur. La normale d'un segment est (-dz, du), donc le profil se lit de
   l'intérieur vers l'extérieur. uv : grain du bois le long de la baguette, en cm. */
export function frameRing({ hw, hh, profile }) {
  const position = [], normal = [], uv = [], index = []
  const OUT = [[0, -1], [1, 0], [0, 1], [-1, 0]] // bas, droite, haut, gauche
  const rect = (u) => [[-hw - u, -hh - u], [hw + u, -hh - u], [hw + u, hh + u], [-hw - u, hh + u]]
  for (let s = 0; s < profile.length - 1; s++) {
    const [u0, z0] = profile[s]
    const [u1, z1] = profile[s + 1]
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
        [A[k], z0, u0], [A[(k + 1) % 4], z0, u0], [B[(k + 1) % 4], z1, u1], [B[k], z1, u1],
      ]
      const base = position.length / 3
      for (const [[x, y], z, u] of quad) {
        position.push(x, y, z)
        normal.push(n[0], n[1], n[2])
        uv.push(wall ? z : u, along === 0 ? x : y)
      }
      index.push(base, base + 2, base + 1, base, base + 3, base + 2)
    }
  }
  return pack({ position, normal, uv, index })
}

/* Profils de cadre (cm), pour une œuvre W × H et un profil du catalogue.
   Toile : caisse américaine (fond où la toile flotte, paroi intérieure, face, paroi
   extérieure). Poster : baguette dont la feuillure recouvre le bord du tirage, verre. */
const CHAMFER = 0.08

export function frameProfile(kind, f) {
  const c = CHAMFER
  if (kind === 'toile') {
    return [
      [-f.gap, f.floor],
      [0, f.floor],
      [0, f.depth - c],
      [c, f.depth],
      [f.face - c, f.depth],
      [f.face, f.depth - c],
      [f.face, 0],
    ]
  }
  const glassZ = f.floor + 0.1
  return [
    [0, glassZ],
    [0, f.depth - c],
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

function pack({ position, normal, uv, fab, art, index }) {
  const out = {
    position: new Float32Array(position),
    normal: new Float32Array(normal),
    uv: new Float32Array(uv),
    index: position.length / 3 > 65535 ? new Uint32Array(index) : new Uint16Array(index),
  }
  if (fab) out.fab = new Float32Array(fab)
  if (art) out.art = new Float32Array(art)
  return out
}
