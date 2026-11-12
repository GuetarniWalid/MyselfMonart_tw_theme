/*
 * oeuvre-3d-engine.js — le moteur 3D de la fiche d'œuvre (fiche-3d, ticket 07)
 * ----------------------------------------------------------------------------------------------
 * Rend une toile ou un poster à partir de sa seule image à plat. Porté du prototype du ticket 02
 * (.scratch/fiche-3d/prototype) : les plans, la lumière et les matières y ont été réglés avec
 * Walid. Les mesures et les retours sont dans .scratch/fiche-3d/issues/02-prototype-3d-bonsai.md.
 *
 * Deux parties, qui ne se parlent que par la « vue » :
 *   createDirector()  la mise en scène : pur calcul, ni three.js ni DOM. Pour un instant et une
 *                     forme d'écran, elle dit où sont la caméra et le tableau.
 *   createScene()     le moteur three.js : il dessine la vue qu'on lui donne, et rien d'autre.
 *
 * Deux usages, une seule scène :
 *   - la fiche : assets/component-oeuvre-3d.js, qui charge ce fichier une fois la page posée ;
 *   - le serveur (ticket 08) : renderStill(), dans une page sans rapport avec la fiche.
 *
 * three.js est la seule dépendance, reçue en paramètre : assets/three.module.min.js, r170, MIT.
 *
 * Un seul fichier, exprès. Le CDN de Shopify garde un an les adresses sans ?v=, et un `import`
 * relatif perd le ?v= de son parent : après un déploiement, un visiteur qui revient aurait un
 * moteur neuf sur des modules périmés. Une import map ne sauve rien : <head> charge déjà des
 * modules (content_for_header), elle arriverait trop tard sur une bonne partie des navigateurs.
 *
 * Testé par scripts/oeuvre-3d-*.test.cjs. Le rendu lui-même se vérifie dans un navigateur.
 */

/* ==== CATALOGUE ==== */

export const CANVAS_DEPTH = 2 // châssis des toiles (décision 8)
export const PAPER_DEPTH = 0.05 // feuille du poster, à peine visible de profil

/* Profils de cadre, à comparer aux vrais produits (tickets 10 et 14).
   gap   : écart entre l'œuvre et l'intérieur du cadre (négatif : la baguette recouvre le bord)
   face  : largeur de la baguette vue de face
   depth : profondeur totale, du mur à l'avant du cadre
   floor : position de l'arrière de l'œuvre dans le cadre (toile posée sur le fond de la caisse,
           poster plaqué derrière le verre) */
export const FRAME_PROFILE = {
  toile: { gap: 0.6, face: 1.2, depth: 3.2, floor: 0.6 }, // caisse américaine : la toile flotte
  poster: { gap: -0.5, face: 1.6, depth: 2.0, floor: 1.6 }, // baguette sous verre, tirage collé au verre
}

/* Dos du poster encadré, qui se voit quand il fait son tour (retour de Walid du 11/11 : « derrière,
   tu n'as qu'à mettre une espèce de mélaminé marron, comme ils font, avec le crochet déjà installé
   dessus »). Derrière la lèvre, la baguette a une feuillure où s'empilent le verre, le tirage et un
   panneau d'isorel, tenu par des pattes de fixation ; un crochet dents de scie est riveté en haut au
   milieu du panneau. play : jeu entre le bord du tirage et la paroi de la feuillure ; recess :
   retrait du panneau sous le dos de la baguette. */
export const POSTER_BACK = { play: 0.1, recess: 0.25 }

// Taille du moteur (« 30x40 ») : largeur et hauteur en cm.
export function dimensionsOf(size) {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

/* Bordures et cadres. color (sRGB) : teinte de la tranche ou du cadre ; null : la bordure reprend
   l'image, ou il n'y a pas de cadre. Les handles des métaobjets de la boutique y mènent par
   assets/component-oeuvre-3d.js (productFromSelection). */
export const BORDERS = [
  { id: 'blanche', color: '#efede8' },
  { id: 'noire', color: '#272727' },
  { id: 'etiree', color: null },
  { id: 'miroir', color: null },
  { id: 'pliee', color: null },
]

export const PAPER_WHITE = '#f7f6f2'

/* Matière des cadres. wood : part de l'image de bois ; relief : fil du bois sous la lumière ;
   rough : 0 brillant, 1 mat. Noir et chêne viennent du prototype. Blanc, argent et noyer gardent
   pour l'instant la teinte de l'ancienne 3D : leurs matières sont au ticket 10. */
export const FRAMES = [
  { id: 'sans', color: null },
  { id: 'blanc', color: '#edebe3', wood: 0, relief: 0.3, rough: 0.6 },
  { id: 'noir', color: '#1f1f21', wood: 0, relief: 0.5, rough: 0.68 },
  { id: 'argent', color: '#9ea1a8', wood: 0, relief: 0.6, rough: 0.5 },
  { id: 'chene', color: '#c9a77c', wood: 1, relief: 0.9, rough: 0.55 },
  { id: 'noyer', color: '#66422b', wood: 0, relief: 0.9, rough: 0.55 },
]

export const borderOf = (id) => BORDERS.find((b) => b.id === id) || BORDERS[0]
export const borderTakesImage = (id) => !borderOf(id).color
export const frameOf = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0]

export function hasFrame(product) {
  return product.frame !== 'sans'
}

/* Le mur neutre de la fiche : le mur et la lumière réglés au prototype, sans photo de pièce. light :
   vers la lumière, une fenêtre à gauche. wall : couleur du mur (sRGB). wallSlope : pente de luminosité
   par cm vers la droite. Le tableau est centré à hauteur d'œil, quelle que soit sa taille : aucun
   meuble à respecter. largest : le plus grand format du produit, qui fixe le cadrage des tailles. */
export function neutralRoom(sizes) {
  const formats = sizes.map(dimensionsOf)
  const area = ({ width, height }) => width * height
  return {
    hang: { x: 121, minBottom: 0, center: 130 },
    light: [-0.5, 0.45, 0.74],
    wall: [233, 233, 232],
    wallSlope: -0.00023,
    largest: formats.reduce((big, format) => (area(format) > area(big) ? format : big)),
  }
}

/* ==== POSES DE LA TAILLE ==== */

/* Mise en scène de la taille (choix de Walid du 10/11) : une femme se tient à côté du tableau, une
   pose par taille. Photos de la version 26 du prototype (.scratch/fiche-3d/prototype/src/poses.js) :
   la vraie photo de chaque pose, retouchée par Gemini et validée par Walid, pièce meublée, en 21:9.
   6336 × 2688 px d'origine, 12 px/cm dans le plan du mur, pied du mur vers 2422 px ; publiées à
   3168 px de large (assets/oeuvre-3d-pose-*), préparées sur le PC par les outils du prototype
   (tools/poses-detourer.py, tools/poses-preparer.py) :
   - photo : la photo, la femme et les meubles compris ;
   - calque : ce qui passe devant le tableau (sa main, les feuilles de l'olivier, les branches du vase),
     là seulement où il peut aller, en portrait, en paysage 4:3 ou en carré (posesFor : ils prennent la
     pose et grandissent plus loin vers la gauche ; calques élargis le 11/11/2026, painted_any de
     l'outil), couleurs estimées sans le mur ;
   - lumiere : la lumière du mur sans eux, en cases d'environ 3 cm.
   Le tableau paraît scale fois plus grand à côté d'elle (la photo est réduite d'autant) ; il garde
   ses vraies mesures et son coin bas côté femme, au coin du rectangle de la photo : ses mains le
   présentent comme sur la photo, et il grandit vers le haut et vers la gauche.
   Valeurs en px de la photo d'origine. rect : le rectangle du tableau (left, top, width, height).
   person, head : la femme et sa tête (left, top, right, bottom). overlay : la zone du calque. clean :
   largeur sans rien devant le mur le long des bords gauche et droit (0 : un objet au bord, le mur s'y
   prolonge uni). reach : son bras lointain (bord du corps, coude, poignet), bras ouverts. */
export const POSES = {
  px: [6336, 2688],
  pxPerCm: 12,
  floorPx: 2422,
  // À côté d'elle, les tableaux paraissent 20 % plus grands que sur ses photos (retour de Walid sur la
  // version 21). Les cotes gardent les vraies mesures.
  scale: 1.2,
  // Vers la lumière des photos : elle vient de la droite de l'image ; l'ombre du tableau tombe à
  // gauche et vers le bas. Pour l'inverser : changer le signe du premier nombre.
  light: [0.36, 0.44, 0.82],
  // Le mur de face (sRGB), celui des photos autour du tableau, ramené au même blanc chaud sur les
  // quatre : le passage de la pièce au mur de face se voit à peine (version 25).
  wall: [223, 217, 207],
  bySize: {
    '30x40': {
      rect: [2676, 376, 378, 484],
      person: [3138, 479, 4298, 2651],
      head: [3792, 479, 4183, 767],
      overlay: [2402, 208, 2406, 212],
      clean: { left: 1000, right: 1030 },
    },
    '60x80': {
      rect: [2362, 141, 717, 957],
      person: [3121, 479, 4262, 2663],
      head: [3750, 479, 4131, 767],
      overlay: [1858, 688, 3152, 1214],
      clean: { left: 976, right: 1128 },
    },
    '75x100': {
      rect: [2267, 21, 878, 1198],
      person: [3122, 480, 4186, 2654],
      head: [3772, 480, 4138, 768],
      overlay: [1636, 516, 3216, 1334],
      clean: { left: 1054, right: 1102 },
    },
    '90x120': {
      rect: [2175, 20, 1075, 1441],
      person: [3005, 497, 4961, 2667],
      head: [3760, 497, 4146, 785],
      overlay: [1448, 492, 3322, 1576],
      clean: { left: 1010, right: 1126 },
      reach: { body: 4174, elbow: 4420, wrist: 4668 },
    },
  },
}

/* La pose de chaque taille du produit : celle dont le tableau a l'aire la plus proche (en rapport).
   Les photos ne montrent que des portraits 3:4 ; un paysage 4:3 ou un carré prend la pose de sa
   taille (40 × 30 et 40 × 40 celle du 30 × 40, … 120 × 90 et 100 × 100 celle du 90 × 120) et s'accroche
   à la même règle : par son coin bas côté femme, au coin du rectangle que sa main présente ; il
   grandit vers le haut et vers la gauche. files(pose) : les adresses de ses trois images
   ({ image, figure, light }). Rend les poses du produit, au format du directeur et du moteur :
   sizes (l'ordre des parts de pose dans une vue) et bySize, par taille du produit. */
export function posesFor(sizes, files = () => ({})) {
  const poseKeys = Object.keys(POSES.bySize)
  const area = (size) => {
    const { width, height } = dimensionsOf(size)
    return width * height
  }
  const nearest = (size) => poseKeys.reduce((best, key) =>
    (Math.abs(Math.log(area(key) / area(size))) < Math.abs(Math.log(area(best) / area(size))) ? key : best))
  return {
    ...POSES,
    sizes: [...sizes],
    bySize: Object.fromEntries(sizes.map((size) => {
      const pose = nearest(size)
      return [size, { ...POSES.bySize[pose], pose, ...files(pose) }]
    })),
  }
}

/* ==== GÉOMÉTRIE ==== */

/* Tableaux de nombres, sans three.js. Unités : cm. L'œuvre occupe x ∈ [-W/2, W/2], y ∈ [-H/2, H/2],
   z ∈ [0, D] (dos au mur). */

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

  // Tranches : de la fin de l'arrondi jusqu'au mur. s = profondeur sous cet arrondi.
  const sideUV = (p, s) => {
    if (border === 'pliee') return artUV(p.x + p.nx * s, p.y + p.ny * s)
    if (border === 'miroir') return artUV(p.x - p.nx * s, p.y - p.ny * s)
    return artUV(p.x, p.y)
  }
  const sideRing = (z) =>
    rim.map((p) => vertex([p.x, p.y, z], [p.nx, p.ny, 0], sideUV(p, D - re - z), sideArt ? 1 : 0))
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
const BACK_WIDTHS = [
  { side: 30, band: 2.5, pine: 1.2, staple: 1.2 },
  { side: 60, band: 3.5, pine: 1.7, staple: 1.6 },
  { side: 75, band: 4, pine: 2, staple: 2 },
]

function backWidth(size, name) {
  const next = BACK_WIDTHS.findIndex(({ side }) => side >= size)
  if (next === 0) return BACK_WIDTHS[0][name]
  if (next < 0) return BACK_WIDTHS[BACK_WIDTHS.length - 1][name]
  const a = BACK_WIDTHS[next - 1], b = BACK_WIDTHS[next]
  return a[name] + ((b[name] - a[name]) * (size - a.side)) / (b.side - a.side)
}

/* band : toile repliée. bar : largeur totale du châssis vu de dos. stapleLength : longueur d'une
   agrafe. cornerStapleInset : distance au bord haut ou bas de l'agrafe de chaque coin. */
export function backLayout(W, H) {
  const size = Math.min(W, H)
  const band = backWidth(size, 'band')
  return { band, bar: band + backWidth(size, 'pine'), stapleLength: backWidth(size, 'staple'), cornerStapleInset: 0.75 * band }
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
// Rang d'agrafes à égale distance, de `from`, qui en porte une, jusqu'au coin, qui a la sienne.
export function stapleRowToCorner(from, corner) {
  const span = Math.abs(corner - from)
  const cells = Math.max(1, Math.round(span / STAPLE_EVERY))
  const gap = span / cells
  return { first: corner > from ? from : corner + gap, gap, count: cells }
}

export function stapleRows(W, H) {
  const { band, cornerStapleInset } = backLayout(W, H)
  return { upright: stapleRow(H - 2 * cornerStapleInset, true), flat: stapleRow(W - 2 * band, false) }
}

const CANVAS_SKIN = 0.12 // la toile tendue est juste derrière la façade

/* Coquille du dos : un anneau au ras de l'arrière du châssis (bande repliée et pin), les
   parois intérieures du châssis, la toile tendue au fond. Tout le détail est peint par le
   shader du dos (BACK_FRAGMENT). Attribut part : 0 anneau, 1 parois, 2 toile tendue. */
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
   Le vertex shader de la feuille (CURL_VERTEX) fait le même calcul que curlPoint. */
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
   extérieure, puis le dos, qui se voit quand la toile fait son tour). Le fond passe sous la
   toile de la largeur de son angle arrondi : au bord carré, il laissait voir le mur à l'angle
   (gros plan sur le jour, 09/11). Tourné vers l'avant, il ne se voit pas de dos ; de face, la
   toile le cache partout ailleurs.
   Poster : baguette dont la lèvre recouvre le bord du tirage, verre ; de dos (son tour, 11/11), le
   dos plat de la baguette, puis la paroi de la feuillure, que le panneau du dos ferme (posterBoard).
   La paroi monte jusqu'au tirage : rien de l'intérieur ne se voit entre elle et le panneau. */
const CHAMFER = 0.08

export function frameProfile(kind, f) {
  const c = CHAMFER
  if (kind === 'toile') {
    return [
      [-f.gap - CANVAS_CORNER, f.floor, 0.3],
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
  const rabbet = -f.gap + POSTER_BACK.play
  return [
    [0, glassZ, 0.7],
    [0, f.depth - c, 0.95],
    [c, f.depth],
    [f.face - c, f.depth],
    [f.face, f.depth - c],
    [f.face, 0],
    [rabbet, 0],
    [rabbet, POSTER_BACK.recess, 0.55],
    [rabbet, glassZ, 0.4],
  ]
}

// Demi-tailles de l'ouverture du cadre pour une œuvre W × H (gap négatif : la lèvre
// recouvre le bord de l'œuvre).
export function frameOpening(W, H, f) {
  return { hw: W / 2 + f.gap, hh: H / 2 + f.gap }
}

/* Le panneau du dos du poster encadré et ce qu'il porte, en cm, vu de dos (x vers la gauche du regard,
   tout y est symétrique). half : demi-tailles du panneau, qui touche la paroi de la feuillure. hanger :
   le crochet, son haut à 2,5 cm du bord plus 3 % de la hauteur (3,7 cm en 30 × 40, 5,5 cm en 75 × 100).
   tabs : les pattes de fixation, à égale distance le long de chaque bord, en nombre pair en haut et en
   bas (le crochet a le milieu) ; width et length, leur part visible sur le panneau. */
const HANGER = { width: 4.5, height: 1 }
const TAB = { width: 0.5, length: 1.3, every: 18 }

export function posterBackLayout(W, H) {
  const half = [W / 2 + POSTER_BACK.play, H / 2 + POSTER_BACK.play]
  const fromTop = 2.5 + 0.03 * H
  const row = (span, even) => {
    const count = even ? 2 * Math.max(1, Math.round(span / (2 * TAB.every))) : Math.max(2, Math.round(span / TAB.every))
    const gap = span / count
    return { first: (gap - span) / 2, gap, count }
  }
  return {
    half,
    hanger: { x: 0, y: half[1] - fromTop - HANGER.height / 2, ...HANGER },
    tabs: { width: TAB.width, length: TAB.length, across: row(2 * half[0], true), along: row(2 * half[1], false) },
  }
}

// Le panneau : un rectangle tourné vers le mur. Tout son détail est peint par son shader (BOARD_FRAGMENT).
export function posterBoard({ width: W, height: H }) {
  const [hw, hh] = posterBackLayout(W, H).half
  const position = [], normal = [], uv = []
  for (const [x, y] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
    position.push(x, y, POSTER_BACK.recess)
    normal.push(0, 0, -1)
    uv.push(x, y)
  }
  return pack({ position, normal, uv, index: [0, 2, 1, 0, 3, 2] })
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

/* ==== MARQUES DU DOS ==== */

/* Marques imprimées au dos de la toile : le logo de MyselfMonArt au centre de la bande du haut ; au
   centre de la bande du bas, un code carré et le format ; en bas à droite, sur la bande verticale,
   un autre code ; à mi-hauteur de cette bande, « PREMIUM ». Elles gardent la même taille réelle sur
   tous les formats, sauf PREMIUM, qui suit la largeur de la bande pour se lire sur un téléphone.
   Tout est dessiné ici : rien à télécharger. */

// Tailles réelles, en cm. free : distance au bord où finit le retour d'image.
export const MARKS = { logo: 1.5, code: 1.1, textHeight: 0.4, gap: 0.1, free: 0.5 }
const ABOVE_FREE = 0.15 // le code du coin se pose un peu au-dessus du retour d'image
const STAPLE_MARGIN = 0.3 // entre une marque et le bout d'une agrafe
export const STAPLE_DRIFT = 0.7 // écart d'une agrafe posée à la main, de part et d'autre
export const MARK_COUNT = 5 // logo, deux codes, format, PREMIUM
const PREMIUM_LETTER = 0.28 // hauteur de ses lettres, en part de la largeur de la bande

/* Boîtes des marques, en cm, telles qu'on les voit de dos : x vers la droite du regard, y vers
   le haut, origine au milieu du tableau. PREMIUM est tourné d'un quart de tour ; premiumBox donne
   sa boîte en hauteurs de lettre, mesurée sur la planche. rowClear : au centre des bandes du haut
   et du bas, distance en deçà de laquelle une agrafe s'efface. rightRows : sur la bande de droite,
   le mot occupe une case du rang d'agrafes. Ses deux voisines s'écartent autant qu'il le faut,
   selon sa longueur, qui dépend de la police du téléphone, et le rang reste régulier jusqu'aux
   coins. */
export function marksLayout(W, H, formatLength, premiumBox) {
  const { band, cornerStapleInset, stapleLength } = backLayout(W, H)
  const { logo, code, textHeight, gap, free } = MARKS
  const middle = (free + band) / 2 // milieu de la partie libre d'une bande
  const bottom = -H / 2
  const stapleReach = stapleLength / 2 + STAPLE_DRIFT + STAPLE_MARGIN
  const rowWidth = code + gap + formatLength
  const letter = PREMIUM_LETTER * band
  const premiumWidth = letter * premiumBox.height
  const premiumLength = letter * premiumBox.length
  const wordNeighbour = Math.max(premiumLength / 2 + stapleReach, stapleRows(W, H).upright.gap / 2)
  const markedCornerInset = Math.max(cornerStapleInset, free + ABOVE_FREE + code + STAPLE_MARGIN + stapleLength / 2)
  return {
    logo: { x: -logo / 2, y: H / 2 - middle - logo / 2, width: logo, height: logo },
    cornerCode: { x: W / 2 - middle - code / 2, y: bottom + free + ABOVE_FREE, width: code, height: code },
    centerCode: { x: -rowWidth / 2, y: bottom + middle - code / 2, width: code, height: code },
    format: { x: gap + code - rowWidth / 2, y: bottom + middle - textHeight / 2, width: formatLength, height: textHeight },
    premium: { x: W / 2 - middle - premiumWidth / 2, y: -premiumLength / 2, width: premiumWidth, height: premiumLength },
    markedCornerInset,
    rowClear: { top: logo / 2 + stapleReach, bottom: rowWidth / 2 + stapleReach },
    rightRows: {
      below: stapleRowToCorner(-wordNeighbour, bottom + markedCornerInset),
      above: stapleRowToCorner(wordNeighbour, H / 2 - cornerStapleInset),
    },
  }
}

export const sizeText = (size) => `${size.replace('x', '×')} cm`

const CODE_CELLS = 16

/* Code carré de type Datamatrix : bords gauche et bas pleins, bords haut et droit en pointillés,
   et un motif fixe sans aucun contenu. Il est décoratif : il ne se lit pas. */
export function dataMatrixCells(pattern) {
  const n = CODE_CELLS
  let seed = 20261104 + pattern
  const coin = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32 < 0.5
  }
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (__, x) => {
      if (x === 0 || y === n - 1) return true
      if (y === 0) return x % 2 === 0
      if (x === n - 1) return y % 2 === 1
      return coin()
    }),
  )
}

// Logo du site (snippets/tw-default-logo.liquid), sans son disque de fond et cerné de noir.
const LOGO_BOX = { x: 12.1, y: 12.5, size: 40 }
const INK = '#14130f'
const LOGO_SHAPES = [
  ['#A93514', 'M29.2466 13.6602L29.2466 37.3573L13.6931 37.3573C14.1881 18.1987 29.2466 13.6602 29.2466 13.6602Z'],
  ['#F0AC01', 'M29.373 13.4951H48.1871V38.7456L50.6627 41.5512L48.8473 43.6142L50.2501 46.0897L48.1871 48.3177V51.1233H29.373V13.4951Z'],
  [INK, 'M47.8573 52.0541H30.1044C29.3882 52.0541 28.8089 51.4732 28.8089 50.7585V37.96C28.1422 37.96 27.7147 37.96 27.6702 37.96H13.7428C13.4424 37.96 13.1883 37.7438 13.1388 37.4484C12.8318 35.5571 13.0859 33.9034 13.3995 32.2382C15.1406 22.9616 20.5604 16.2066 28.6571 13.2112C29.0383 13.071 29.4476 13 29.8734 13H47.9118C48.4762 13 48.935 13.4588 48.9334 14.0232L48.8707 38.7819C49.9021 39.3595 51.2686 40.2062 51.2307 41.4885C51.2076 42.284 50.6349 43.02 49.4879 43.7231C50.1068 44.134 50.729 44.7512 50.7966 45.5995C50.8725 46.5534 50.2421 47.4545 48.8723 48.3457V48.5025L48.9251 50.9632C48.9383 51.5623 48.4564 52.0541 47.8573 52.0541ZM30.8108 50.8312H46.8308C47.3078 50.8312 47.694 50.44 47.6857 49.9631L47.6527 47.9067C47.651 47.7565 47.7286 47.6163 47.8573 47.5387L47.9448 47.4859C49.0373 46.8257 49.6166 46.1904 49.577 45.6969C49.5358 45.1737 48.77 44.6357 48.029 44.3337L47.9316 44.2941C47.76 44.2248 47.6494 44.0581 47.6494 43.8733V43.591C47.6494 43.4161 47.7501 43.2577 47.9068 43.1818L47.996 43.1388C49.7932 42.2774 50.0028 41.6717 50.0094 41.4522C50.0276 40.8201 48.6974 40.0824 48.0587 39.7292L47.8887 39.6351C47.7418 39.5526 47.6494 39.3975 47.6494 39.2291V38.7307L47.7088 14.9606C47.7088 14.553 47.3804 14.2229 46.9727 14.2229H29.8734C29.5928 14.2229 29.3255 14.2691 29.0812 14.3582C21.4021 17.1985 16.2596 23.6267 14.601 32.461C14.3765 33.6559 14.1933 34.7748 14.2247 35.9631C14.2362 36.3922 14.5878 36.7355 15.0185 36.7355H27.6669C27.7114 36.7355 28.1537 36.7355 28.8419 36.7355H30.0318V50.0522C30.0318 50.4829 30.38 50.8312 30.8108 50.8312Z'],
  [INK, 'M33.2317 38.1564C32.8967 38.1564 32.5683 38.1564 32.253 38.1564H29.6075C29.5877 38.1564 29.5663 38.1564 29.5465 38.1564L29.393 38.1531C29.1487 38.1383 28.9144 38.0739 28.751 37.7901L28.5381 37.4237L28.6586 37.2141V14.2642C28.6586 13.8599 28.9853 13.5298 29.3913 13.5298C29.7973 13.5298 30.1257 13.8582 30.1257 14.2642V36.6876C31.6292 36.6876 35.0785 36.6876 37.2008 36.6876C39.0063 36.686 39.2572 36.4302 39.2638 34.5818C39.2654 34.1263 39.2654 33.5272 39.2522 32.933C39.2423 32.5287 39.5641 32.192 39.9685 32.1821C40.3761 32.1722 40.7095 32.4941 40.7194 32.8984C40.7326 33.5107 40.7326 34.123 40.7309 34.5867C40.721 37.2504 39.8298 38.1498 37.2025 38.1531C36.0868 38.1531 34.6048 38.1548 33.2317 38.1548V38.1564Z'],
  [INK, 'M16.7627 32.3886C18.6276 35.549 23.8328 35.9517 26.107 32.4397C24.2372 29.5384 19.4643 28.8832 16.7627 32.3886ZM20.3473 33.8772C19.1904 33.6412 18.5055 33.2171 17.9064 32.4447C18.5088 31.674 19.2283 31.2944 20.3671 31.0138C19.6046 32.014 19.5881 32.8754 20.3473 33.8772ZM21.5075 33.2814C21.0685 33.3095 20.6344 32.92 20.6179 32.481C20.6014 32.047 21.0157 31.6047 21.4497 31.6294C21.9118 31.6542 22.1973 31.9281 22.2782 32.3721C22.3558 32.7896 21.9432 33.2517 21.5075 33.2814ZM22.6198 33.8558C23.2337 32.8886 23.3443 32.0503 22.7386 31.1673C23.6595 31.3142 24.394 31.6789 24.9567 32.4249C24.4385 33.2204 23.7107 33.6165 22.6182 33.8558H22.6198Z'],
  [INK, 'M34.6963 24.5659C36.8054 28.1405 42.6923 28.596 45.2635 24.6236C43.1494 21.3427 37.7511 20.6017 34.6963 24.5659ZM38.7496 26.2492C37.4408 25.9819 36.6668 25.5033 35.9885 24.6286C36.6668 23.7555 37.4837 23.3264 38.771 23.0112C37.9095 24.1417 37.8897 25.1171 38.7496 26.2492ZM40.0616 25.5759C39.5632 25.6089 39.0747 25.1666 39.0565 24.6715C39.0384 24.183 39.5071 23.6813 39.9972 23.7077C40.5188 23.7357 40.8406 24.0476 40.9346 24.5494C41.0221 25.0214 40.5551 25.5429 40.0616 25.5759ZM41.3192 26.2278C42.014 25.1336 42.1378 24.1846 41.4545 23.1845C42.4959 23.3512 43.326 23.7621 43.9631 24.6088C43.3755 25.5066 42.5536 25.9555 41.3192 26.2261V26.2278Z'],
]
const LOGO_EYES = [[21.5326, 32.5569, 4.04338, 1.73288], [40.017, 24.7177, 4.37345, 2.14547]]

function drawLogo(ctx, size) {
  ctx.save()
  ctx.scale(size / LOGO_BOX.size, size / LOGO_BOX.size)
  ctx.translate(-LOGO_BOX.x, -LOGO_BOX.y)
  const [red, yellow, ...outlines] = LOGO_SHAPES
  for (const [fill, path] of [red, yellow]) {
    ctx.fillStyle = fill
    ctx.fill(new Path2D(path))
  }
  ctx.fillStyle = '#ffffff'
  for (const [x, y, rx, ry] of LOGO_EYES) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI)
    ctx.fill()
  }
  for (const [fill, path] of outlines) {
    ctx.fillStyle = fill
    ctx.fill(new Path2D(path))
  }
  ctx.restore()
}

function drawCode(ctx, x, cell, pattern) {
  ctx.fillStyle = CODE_BLUE
  dataMatrixCells(pattern).forEach((row, j) => row.forEach((dark, i) => {
    if (dark) ctx.fillRect(x + i * cell, j * cell, cell, cell)
  }))
}

const CODE_BLUE = '#1b2c54'
const PREMIUM_GREY = '#6f6f6f'
const PREMIUM_STROKE = 4 // trait en équerre, à la suite du mot, en px de la planche
const PREMIUM_PAD = 4 // marge de sa zone, pour ne pas couper le bord lissé des lettres
const ATLAS = { width: 1024, logo: 256, codeCell: 11, textRow: 64, textPxPerCm: 160, margin: 16 }

/* Planche des marques sur fond blanc : le shader la multiplie au tissu, comme une encre. Le
   texte de chaque format y a sa ligne, pour que changer de taille ne redessine rien.
   Renvoie les zones de la planche (x, y, largeur, hauteur, de 0 à 1) ; pour le format, sa
   longueur en cm ; pour PREMIUM, sa boîte en hauteurs de lettre. sizes : les tailles du produit. */
export function paintMarks(canvas, sizes) {
  const { width: W, logo, codeCell, textRow, textPxPerCm, margin } = ATLAS
  const H = Math.max(logo, sizes.length * textRow)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  const area = (x, y, w, h) => [x / W, y / H, w / W, h / H]

  drawLogo(ctx, logo)

  const code = CODE_CELLS * codeCell
  const cornerCodeX = logo + margin
  const centerCodeX = cornerCodeX + code + margin
  drawCode(ctx, cornerCodeX, codeCell, 0)
  drawCode(ctx, centerCodeX, codeCell, 1)

  const textX = centerCodeX + code + margin
  const fontOf = (weight) => `${weight} ${textRow * 0.7}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
  ctx.font = fontOf(600)
  ctx.textBaseline = 'middle'
  const format = {}
  sizes.forEach((size, i) => {
    const words = sizeText(size)
    const length = Math.ceil(ctx.measureText(words).width)
    ctx.fillText(words, textX, (i + 0.5) * textRow)
    format[size] = { area: area(textX, i * textRow, length, textRow), length: length / textPxPerCm }
  })

  // PREMIUM, sous les codes, suivi de son petit trait en équerre, de la hauteur des lettres.
  const premiumMiddle = code + margin + textRow / 2
  ctx.font = fontOf(400)
  ctx.fillStyle = PREMIUM_GREY
  const word = ctx.measureText('PREMIUM')
  const letter = Math.ceil(word.actualBoundingBoxAscent + word.actualBoundingBoxDescent)
  const letterTop = Math.floor(premiumMiddle - word.actualBoundingBoxAscent)
  ctx.fillText('PREMIUM', cornerCodeX, premiumMiddle)
  const cornerX = cornerCodeX + Math.ceil(word.width) + margin
  ctx.fillRect(cornerX, letterTop, PREMIUM_STROKE, letter)
  ctx.fillRect(cornerX, letterTop + letter - PREMIUM_STROKE, letter, PREMIUM_STROKE)
  const premiumWidth = cornerX + letter - cornerCodeX + 2 * PREMIUM_PAD
  const premiumHeight = letter + 2 * PREMIUM_PAD

  return {
    logo: area(0, 0, logo, logo),
    cornerCode: area(cornerCodeX, 0, code, code),
    centerCode: area(centerCodeX, 0, code, code),
    format,
    premium: {
      area: area(cornerCodeX - PREMIUM_PAD, letterTop - PREMIUM_PAD, premiumWidth, premiumHeight),
      height: premiumHeight / letter,
      length: premiumWidth / letter,
    },
  }
}

/* ==== SHADER DU DOS ==== */

/* Dos de la toile, peint par le shader en cm, d'après les photos de Walid (une 75 × 100). Rien à
   télécharger, et le même code sert tous les formats : largeurs et agrafes viennent de backLayout et
   stapleRows. Du bord vers le centre : l'image (ou la couleur de tranche) qui revient de quelques
   mm, un fin trait noir, la toile blanche repliée et ses agrafes, le pin pâle du châssis, et au
   fond la toile brute, blanc cassé. Aux coins, la bande verticale passe sur la bande horizontale. */

export const BACK_COLORS = { band: '#f1efe9', raw: '#e9e6df', pine: '#e6dccb' }

/* Peints en cm, au pixel près : les shaders du dos de la toile et du panneau du poster encadré. pixel :
   la taille d'un pixel à l'écran, en cm, que chacun pose au début de main ; inside lisse un bord sur
   un pixel ; hash, un tirage répétable. */
const CM_SHAPES = /* glsl */ `
  float pixel; // taille d'un pixel à l'écran, en cm

  // 1 là où v > 0, 0 ailleurs, bord lissé sur un pixel.
  float inside(float v) {
    return clamp(v / pixel + 0.5, 0.0, 1.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
`

export const BACK_VERTEX = /* glsl */ `
  attribute float part;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;
  void main() {
    vLocal = position;
    vPart = part;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const BACK_FRAGMENT = /* glsl */ `
  uniform sampler2D uArt;
  uniform sampler2D uWeave;
  uniform sampler2D uMap;
  uniform float uWeaveScale;
  uniform vec2 uTile;
  uniform float uPine;
  uniform vec3 uBandColor;
  uniform vec3 uRawColor;
  uniform vec3 uPineColor;
  uniform vec3 uBorder;
  uniform float uSideArt;
  uniform vec2 uHalf;
  uniform float uBand;
  uniform float uBar;
  uniform vec3 uStaplesUpright; // rang d'agrafes des bords verticaux : premier, écart, nombre
  uniform vec3 uStaplesFlat; // et des bords horizontaux
  uniform vec3 uStaplesBelow; // sur la bande de droite, le rang sous PREMIUM
  uniform vec3 uStaplesAbove; // et au-dessus de lui
  uniform float uStapleHalf; // demi-longueur d'une agrafe
  uniform float uCornerStapleInset; // distance au bord haut ou bas de l'agrafe de coin
  uniform float uMarkedCornerInset; // de même dans le coin du code, plus haut pour lui laisser la place
  uniform vec2 uRowClear; // au centre des bandes du haut et du bas, les marques écartent les agrafes
  uniform sampler2D uMarks; // planche des marques
  uniform vec4 uMarkBoxes[${MARK_COUNT}]; // boîtes vues de dos, en cm : x, y, largeur, hauteur
  uniform vec4 uMarkAreas[${MARK_COUNT}]; // zones de la planche, de 0 à 1
  uniform vec3 uLight;
  uniform vec3 uLightLocal;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;

  const float WIRE = 0.055; // demi-épaisseur du fil, en part de la demi-longueur de l'agrafe
  const vec3 STEEL = vec3(0.13, 0.135, 0.15);
  const vec3 STEEL_EDGE = vec3(0.04, 0.042, 0.05);
  const int PREMIUM = ${MARK_COUNT - 1}; // la dernière marque, seule tournée d'un quart de tour
  const float DRIFT = ${STAPLE_DRIFT.toFixed(2)}; // écart d'une agrafe posée à la main, de part et d'autre
  const float SHOULDER = 0.325; // arrondi de la bande du dessus, près du coin, en part de la bande
  const vec2 FOLD_TIP = vec2(0.25, 0.3625); // tout petit rabat replié de la pointe, de même
  const float OAK_MEAN = 1.34; // somme moyenne des trois canaux de l'image de chêne

  ${CM_SHAPES}

  // Pin : sa propre teinte, avec le fil du chêne des cadres. q.y suit le fil.
  vec3 pine(vec2 q) {
    float fibre = dot(texture2D(uMap, q * uTile).rgb, vec3(1.0)) / OAK_MEAN;
    return uPineColor * (1.0 + uPine * (fibre - 1.0));
  }

  // Planche lue en quatre points du pixel : ses mipmaps brouilleraient des lettres de 5 px.
  vec3 fineMarks(vec2 uv) {
    vec2 x = dFdx(uv), y = dFdy(uv);
    vec3 sum = texture2D(uMarks, uv + 0.125 * x - 0.375 * y, -2.0).rgb;
    sum += texture2D(uMarks, uv + 0.375 * x + 0.125 * y, -2.0).rgb;
    sum += texture2D(uMarks, uv - 0.125 * x + 0.375 * y, -2.0).rgb;
    sum += texture2D(uMarks, uv - 0.375 * x - 0.125 * y, -2.0).rgb;
    return 0.25 * sum;
  }

  // Encre d'une marque, à multiplier au tissu : la planche a un fond blanc. at : point vu de dos.
  vec3 ink(vec2 at, vec4 box, vec4 area, bool quarterTurn) {
    vec2 q = (at - box.xy) / box.zw;
    vec2 within = step(vec2(0.0), q) * step(q, vec2(1.0));
    vec2 uv = quarterTurn ? q.yx : vec2(q.x, 1.0 - q.y);
    vec2 onSheet = area.xy + uv * area.zw;
    vec3 printed = quarterTurn ? fineMarks(onSheet) : texture2D(uMarks, onSheet).rgb;
    return mix(vec3(1.0), printed, within.x * within.y);
  }

  // Bord à peine irrégulier : écart en cm le long d'un bord ; la phase distingue les bords.
  float wavy(float along, float phase, float amount) {
    return amount * (sin(along * 1.1 + phase) + 0.6 * sin(along * 2.9 + phase * 0.7));
  }

  // Point exprimé le long du fil (x) et en travers (y).
  vec2 onWire(vec2 d, vec2 axis) {
    return vec2(dot(d, axis), dot(d, vec2(-axis.y, axis.x)));
  }

  float wireDistance(vec2 q) {
    return length(vec2(max(abs(q.x) - uStapleHalf, 0.0), q.y));
  }

  /* Agrafe : center, son milieu ; axis, la direction du fil. L'acier sombre et l'ombre de contact
     la détachent du tissu clair. Le fil garde toujours plus d'un pixel de large, même vu de biais
     pendant le tour ; son bord se lisse sur un pixel mesuré en travers, pour rester net. Assez
     large, il montre un reflet fin sur sa longueur ; trop fin pour cela, un éclat plus clair
     glisse le long du trait quand le tableau tourne, et son ombre s'allège. */
  vec3 staple(vec3 color, vec2 p, vec2 center, vec2 axis, float present) {
    vec2 d = p - center;
    vec2 q = onWire(d, axis);
    // Taille d'un pixel en travers du fil. Mesurée sur p, continu : d et q sautent là où le
    // milieu de l'agrafe la plus proche change, au centre des bandes.
    vec2 crossing = vec2(-axis.y, axis.x);
    float across = max(abs(dot(dFdx(p), crossing)) + abs(dot(dFdy(p), crossing)), 1e-4);
    float wire = max(WIRE * uStapleHalf, 0.75 * across);
    float roomy = smoothstep(2.5, 4.0, 2.0 * wire / across); // le fil est assez large pour ses détails

    vec2 spread = q / (uStapleHalf * vec2(1.8, 0.65));
    vec3 cloth = color * (1.0 - 0.09 * exp(-dot(spread, spread))); // le tissu se creuse un peu autour

    vec2 light = normalize(uLightLocal.xy);
    vec2 towardsLight = light * max(1.2 * wire, across);
    float contact = wireDistance(onWire(d + towardsLight, axis));
    float shadow = clamp((1.25 * wire - contact) / max(across, 0.7 * wire) + 0.5, 0.0, 1.0);
    cloth *= 1.0 - mix(0.25, 0.5, roomy) * shadow;

    float rise = q.y / wire; // de -1 à 1 en travers du fil
    vec3 steel = mix(STEEL, STEEL_EDGE, rise * rise);
    float glint = 1.0 - smoothstep(0.12, 0.3, abs(rise - 0.25));
    steel = mix(steel, vec3(0.92), glint * roomy);
    float sheen = (q.x / uStapleHalf - 0.6 * dot(axis, light)) / 0.2;
    steel = mix(steel, vec3(0.5, 0.51, 0.54), 0.85 * exp(-sheen * sheen) * (1.0 - roomy));

    float cover = clamp((wire - wireDistance(q)) / across + 0.5, 0.0, 1.0);
    return mix(color, mix(cloth, steel, cover), present);
  }

  vec3 ringColor(vec2 p, vec2 c) {
    bool upright = c.x < c.y; // bande le long d'un bord vertical
    float e = min(c.x, c.y);
    float along = upright ? p.y : p.x;
    float side = upright ? (p.x > 0.0 ? 0.0 : 1.0) : (p.y > 0.0 ? 2.0 : 3.0);

    // Pin, avec son onglet à 45° au coin de l'ouverture.
    vec3 color = pine(upright ? p : p.yx);
    color *= 1.0 - 0.5 * inside(0.03 - abs(c.x - c.y));

    // Coin : la bande verticale passe par-dessus et court tout droit jusqu'au bord haut ou bas,
    // son bord s'arrondit à l'approche du coin. La bande horizontale s'arrête contre elle.
    float cutUpright = uBand + wavy(p.y, sign(p.x) * 2.3, 0.03);
    float cutFlat = uBand + wavy(p.x, sign(p.y) * 1.2, 0.03);
    float shoulder = SHOULDER * uBand;
    vec2 rounded = max(vec2(shoulder - (cutUpright - c.x), shoulder - c.y), 0.0);
    float over = shoulder - length(rounded); // > 0 dans la bande du dessus
    float band = max(inside(over), inside(cutFlat - c.y));

    // Les bandes posent une ombre étroite sur le pin.
    color *= 1.0 - 0.22 * exp(-max(min(c.x - cutUpright, c.y - cutFlat), 0.0) / 0.25);

    // Toile repliée : blanc mat, trame fine, ondulations à peine marquées.
    float ripple = 0.6 * sin(p.y * 0.55 + p.x * 0.4) + 0.4 * sin(p.x * 1.35 - p.y * 0.9);
    float grain = texture2D(uWeave, p * uWeaveScale).r;
    vec3 cloth = uBandColor * (1.0 + 0.007 * ripple) * (0.96 + 0.06 * grain);

    // La bande du dessus fait une légère ombre sur l'autre, et son bord attrape la lumière.
    float onTop = inside(over);
    cloth *= 1.0 - 0.16 * exp(-max(-over, 0.0) / 0.4) * (1.0 - onTop);
    cloth *= 1.0 + 0.03 * exp(-max(over, 0.0) / 0.1) * onTop;

    // Ombre discrète du petit rabat de la pointe, peint plus bas.
    vec2 tip = FOLD_TIP * uBand;
    float fold = (1.0 - dot(c, 1.0 / tip)) / length(1.0 / tip); // > 0 dans le rabat
    float onFold = inside(fold);
    cloth *= 1.0 - 0.14 * exp(-max(-fold, 0.0) / 0.22) * (1.0 - onFold);

    // Agrafes le long de la bande, posées à la main. Vue de dos, la bande de droite est à x < 0 :
    // PREMIUM y occupe une case du rang.
    vec4 word = uMarkBoxes[PREMIUM];
    vec3 besideWord = along < word.y + 0.5 * word.w ? uStaplesBelow : uStaplesAbove;
    vec3 row = upright ? (p.x < 0.0 ? besideWord : uStaplesUpright) : uStaplesFlat;
    float k = clamp(floor((along - row.x) / row.y + 0.5), 0.0, row.z - 1.0);
    float jitter = hash(vec2(k, side));
    float at = row.x + k * row.y + (jitter - 0.5) * 2.0 * DRIFT;
    float fromEdge = uBand * (0.52 + 0.1 * (hash(vec2(side, k)) - 0.5));
    float tilt = (jitter - 0.5) * 0.1;
    vec2 center = upright ? vec2(sign(p.x) * (uHalf.x - fromEdge), at) : vec2(at, sign(p.y) * (uHalf.y - fromEdge));
    vec2 axis = upright ? vec2(sin(tilt), cos(tilt)) : vec2(cos(tilt), sin(tilt));
    // Au centre des bandes du haut et du bas, les marques prennent la place de l'agrafe.
    float clear = p.y > 0.0 ? uRowClear.x : uRowClear.y;
    cloth = staple(cloth, p, center, axis, upright || abs(at) >= clear ? 1.0 : 0.0);

    // Une seule agrafe par coin, parallèle au bord vertical, dans la bande qui passe dessus.
    // Vu de dos, le coin bas droit est à x < 0 : c'est celui du code.
    float inset = p.x < 0.0 && p.y < 0.0 ? uMarkedCornerInset : uCornerStapleInset;
    float sway = (hash(sign(p) + 3.0) - 0.5) * 0.08;
    vec2 corner = sign(p) * (uHalf - vec2(uBand * 0.5, inset));
    cloth = staple(cloth, p, corner, vec2(sin(sway), cos(sway)), 1.0);

    // Marques imprimées sur la toile.
    vec2 seen = vec2(-p.x, p.y);
    for (int i = 0; i < ${MARK_COUNT}; i++) cloth *= ink(seen, uMarkBoxes[i], uMarkAreas[i], i == PREMIUM);

    color = mix(color, cloth, band);

    // Au bord, l'image revient sur le dos, sur quelques mm irréguliers, soulignée d'un trait.
    float reach = 0.36 + wavy(along * 0.75, side * 1.9, 0.04);
    color = mix(color, vec3(0.02), 0.8 * inside(0.024 - abs(e - reach - 0.024)));
    vec2 uv = vec2(p.x / (2.0 * uHalf.x) + 0.5, 0.5 - p.y / (2.0 * uHalf.y));
    vec3 returned = mix(uBorder, textureLod(uArt, uv, 1.5).rgb, uSideArt);
    color = mix(color, returned, inside(reach - e));

    // Le rabat se replie par-dessus tout, jusqu'à la pointe du coin.
    return mix(color, uBandColor * 1.02, onFold);
  }

  // Toile brute : blanc cassé, à peine plus grise que la bande, trame très fine, dégradé doux.
  vec3 rawColor(vec2 p) {
    float grain = texture2D(uWeave, p * uWeaveScale).r;
    float slope = 0.035 * p.y / uHalf.y - 0.025 * p.x / uHalf.x;
    return uRawColor * (0.96 + 0.07 * grain) * (1.0 + slope);
  }

  void main() {
    vec2 p = vLocal.xy;
    pixel = max(max(fwidth(p.x), fwidth(p.y)), 1e-4);
    vec2 c = uHalf - abs(p);
    float depth = vLocal.z;

    vec3 albedo;
    float shelter = 1.0; // part de lumière ambiante qui arrive au fond
    if (vPart < 0.5) {
      albedo = ringColor(p, c);
    } else if (vPart < 1.5) {
      bool upright = abs(c.x - uBar) < abs(c.y - uBar);
      albedo = pine(vec2(depth, upright ? p.y : p.x));
      shelter = 0.72;
    } else {
      albedo = rawColor(p);
      shelter = 1.0 - 0.1 * exp(-(min(c.x, c.y) - uBar) / 2.0);
    }

    // Le creux ne reçoit la lumière que par l'ouverture du châssis : un point y voit-il la
    // lumière ? Quand elle vient du côté de la façade, la toile la coupe tout entière.
    float direct = max(dot(normalize(vNormalW), uLight), 0.0);
    if (vPart > 0.5) {
      float toOpening = max(-uLightLocal.z, 0.001);
      vec2 exit = p + uLightLocal.xy * (depth / toOpening);
      vec2 open = uHalf - uBar - abs(exit);
      float lit = smoothstep(-0.5, 0.5, min(open.x, open.y)) * step(uLightLocal.z, 0.0);
      direct *= vPart > 1.5 ? mix(0.72, 1.0, lit) : lit; // la toile claire adoucit son ombre
    }
    float k = (uAmbient * shelter + uDiffuse * direct) * uNorm;
    gl_FragColor = vec4(albedo * min(k, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`

/* ==== DOS DU POSTER ENCADRÉ ==== */

/* Le panneau du dos (POSTER_BACK), peint par son shader en cm comme le dos de la toile : rien à
   télécharger. L'isorel, brun chaud et lisse, ses taches douces, ses fibres fines et son léger lustre ;
   le long des bords, le joint avec la feuillure, l'ombre de la baguette 2,5 mm plus haut et les pattes
   de fixation ; en haut au milieu, le crochet en métal noir. Sa partie dentée est cintrée, décollée du
   panneau pour qu'un clou passe derrière ; ses deux bouts y sont plaqués par un rivet. Les détails plus
   fins qu'un pixel s'effacent : rien ne scintille pendant le tour. Tout se calcule dans le repère du
   tableau (lumière et caméra comprises) : le panneau y regarde vers -z. */
export const BOARD_COLORS = { board: '#7b5a40', hanger: '#151517', tab: '#9a9da3' }

export const BOARD_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const BOARD_FRAGMENT = /* glsl */ `
  uniform vec3 uBoardColor;
  uniform vec3 uHangerColor;
  uniform vec3 uTabColor;
  uniform vec2 uHalf; // demi-tailles du panneau
  uniform float uRecess; // retrait du panneau sous le dos de la baguette
  uniform vec4 uHanger; // crochet : milieu (x, y), largeur, hauteur
  uniform vec3 uTabsAcross; // pattes des bords haut et bas : première, écart, nombre
  uniform vec3 uTabsAlong; // et des bords gauche et droit
  uniform vec2 uTab; // largeur et longueur visible d'une patte
  uniform vec3 uLightLocal; // vers la lumière, dans le repère du tableau
  uniform vec3 uEyeLocal; // la caméra, dans le même repère
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  uniform float uOpacity;
  varying vec3 vLocal;

  const vec3 OUT = vec3(0.0, 0.0, -1.0); // le panneau regarde vers le mur, au repos
  const float SHEET = 0.05; // épaisseur du métal, cm
  const float ARCH = 0.2; // hauteur de la partie dentée, cintrée, au-dessus du panneau
  const float PITCH = 0.16; // pas des dents
  const float TOOTH = 0.09; // profondeur d'une dent
  const float RIVET = 0.13; // rayon d'un rivet

  ${CM_SHAPES}

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // Variation de fréquence f (par cm), de -0,5 à 0,5, effacée avant de tomber sous le pixel.
  float grainAt(vec2 p, float f) {
    return (noise(p * f) - 0.5) * (1.0 - smoothstep(0.15, 0.4, f * pixel));
  }

  // Isorel : nuages larges et doux, fibres fines un peu étirées, de rares points plus sombres.
  vec3 boardColor(vec2 p) {
    float tone = 0.07 * grainAt(p, 0.12) + 0.025 * grainAt(p + 7.3, 0.6) + 0.035 * grainAt(p * vec2(1.0, 2.6), 3.5) + 0.03 * grainAt(p, 12.0);
    float fleck = smoothstep(0.88, 0.97, noise(p * 9.0 + 3.1)) * (1.0 - smoothstep(0.15, 0.4, 9.0 * pixel));
    return uBoardColor * (1.0 + tone) * (1.0 - 0.07 * fleck);
  }

  // Distance signée à un rectangle aux coins arrondis (rayon r), de demi-tailles h, centré.
  float roundedBox(vec2 q, vec2 h, float r) {
    vec2 d = abs(q) - h + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  }

  // Crochet (q : depuis son milieu) : < 0 dedans. Ses dents, au bas de la partie centrale, pointent
  // vers le bas ; moins de 3 pixels par dent, elles s'effacent.
  float hangerShape(vec2 q) {
    vec2 h = 0.5 * uHanger.zw;
    float d = roundedBox(q, h, 0.3 * h.y);
    float saw = abs(fract(q.x / PITCH) - 0.5) * 2.0;
    float toothed = (1.0 - smoothstep(h.x - 0.95, h.x - 0.8, abs(q.x))) * smoothstep(2.0, 4.0, PITCH / pixel);
    return max(d, -h.y + TOOTH * (1.0 - saw) * toothed - q.y);
  }

  // Hauteur du métal au-dessus du panneau : la partie dentée cintrée, les bouts plaqués, les plis doux.
  float hangerHeight(float x) {
    float h = 0.5 * uHanger.z;
    return mix(ARCH, SHEET, smoothstep(h - 1.0, h - 0.45, abs(x)));
  }

  // Rivets, aux deux bouts : distance à leur bord (< 0 dedans) et leur milieu.
  vec3 rivet(vec2 q) {
    vec2 c = vec2(sign(q.x) * (0.5 * uHanger.z - 0.28), 0.0);
    return vec3(length(q - c) - RIVET, c);
  }

  // Patte de fixation la plus proche de p : < 0 dedans. Elle sort de la paroi de la feuillure (le bord
  // du panneau) et s'avance de uTab.y sur lui, son bout arrondi.
  float tabShape(vec2 p) {
    vec2 a = abs(p);
    vec2 h = vec2(0.5 * uTab.x, 0.5 * uTab.y + 0.1);
    float k = clamp(floor((p.x - uTabsAcross.x) / uTabsAcross.y + 0.5), 0.0, uTabsAcross.z - 1.0);
    vec2 across = vec2(p.x - (uTabsAcross.x + k * uTabsAcross.y), a.y - uHalf.y + h.y - 0.2);
    float j = clamp(floor((p.y - uTabsAlong.x) / uTabsAlong.y + 0.5), 0.0, uTabsAlong.z - 1.0);
    vec2 along = vec2(p.y - (uTabsAlong.x + j * uTabsAlong.y), a.x - uHalf.x + h.y - 0.2);
    return min(roundedBox(across, h, 0.5 * uTab.x), roundedBox(along, h, 0.5 * uTab.x));
  }

  // Lumière d'une surface de normale n : la même règle que la façade (luminosité plafonnée), et un
  // reflet de la lumière (shine : sa finesse, gloss : sa force). direct : part de lumière directe reçue.
  vec3 shade(vec3 albedo, vec3 n, float direct, float ao, float shine, float gloss) {
    float facing = max(dot(n, uLightLocal), 0.0);
    float k = (uAmbient * ao + uDiffuse * facing * direct) * uNorm;
    vec3 v = normalize(uEyeLocal - vLocal);
    vec3 h = normalize(uLightLocal + v);
    float spec = pow(max(dot(n, h), 0.0), shine) * gloss * direct * step(0.0, dot(n, uLightLocal));
    return albedo * min(k, 1.0) + vec3(spec);
  }

  // Noir satiné : un peu de lumière, le reflet doux de la pièce (plus clair vers le haut), l'éclat de la
  // lumière, plus vif sur les arêtes et les plis.
  vec3 blackMetal(vec3 n, float gloss) {
    vec3 v = normalize(uEyeLocal - vLocal);
    vec3 r = reflect(-v, n);
    float grazing = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 room = vec3(0.018 + 0.06 * smoothstep(-0.3, 0.9, r.y)) * (0.6 + 0.4 * grazing);
    return shade(uHangerColor, n, 1.0, 1.0, 34.0, gloss) + room;
  }

  void main() {
    vec2 p = vLocal.xy;
    pixel = max(max(fwidth(p.x), fwidth(p.y)), 1e-4);
    vec3 L = uLightLocal;
    // Vers la lumière, le chemin qui monte de h cm au-dessus du panneau (la lumière vient de l'arrière).
    vec2 towardLight = L.xy / max(-L.z, 0.08);

    // La baguette, 2,5 mm plus haut, ombre le bord du panneau du côté opposé à la lumière.
    vec2 exit = p + towardLight * uRecess;
    float open = min(uHalf.x - abs(exit.x), uHalf.y - abs(exit.y));
    float lit = smoothstep(-0.5, 0.5, open / max(pixel, 0.03)) * step(L.z, 0.0);
    float edge = min(uHalf.x - abs(p.x), uHalf.y - abs(p.y));
    float ao = 1.0 - 0.25 * exp(-edge / 0.2);

    // Le crochet : son ombre (la partie cintrée la porte plus loin), un peu de contact autour.
    vec2 q = p - uHanger.xy;
    float rise = hangerHeight(q.x + towardLight.x * ARCH);
    vec2 caster = q + towardLight * rise;
    float soft = max(pixel, 0.03 + 0.2 * rise);
    float hangerShadow = 1.0 - smoothstep(-soft, soft, hangerShape(caster));
    float tabShadow = 1.0 - smoothstep(-0.03, 0.03, tabShape(p + towardLight * SHEET));
    float shape = hangerShape(q);
    ao *= 1.0 - 0.35 * exp(-max(shape, 0.0) / 0.06) * (1.0 - inside(-shape));

    vec3 color = shade(boardColor(p), OUT, lit * (1.0 - 0.85 * hangerShadow) * (1.0 - 0.7 * tabShadow), ao, 14.0, 0.035);
    // Le joint entre le panneau et la paroi de la feuillure.
    color *= 1.0 - 0.6 * inside(0.035 - edge);

    // Pattes : acier galvanisé, posées à plat, leur arête plus sombre.
    float tab = tabShape(p);
    float onTab = inside(-tab);
    if (onTab > 0.0) {
      vec3 metal = shade(uTabColor * (0.92 + 0.16 * grainAt(p * vec2(4.0, 0.6), 6.0)), OUT, lit, 1.0, 40.0, 0.25);
      metal *= 1.0 - 0.35 * inside(0.05 + tab);
      color = mix(color, metal, onTab);
    }

    // Crochet : métal noir, ses plis inclinés, son arête qui accroche la lumière ; ses rivets à peine
    // bombés.
    float onHanger = inside(-shape);
    if (onHanger > 0.0) {
      float e = 0.03;
      vec2 grad = vec2(hangerShape(q + vec2(e, 0.0)) - hangerShape(q - vec2(e, 0.0)), hangerShape(q + vec2(0.0, e)) - hangerShape(q - vec2(0.0, e))) / (2.0 * e);
      float slope = (hangerHeight(q.x + e) - hangerHeight(q.x - e)) / (2.0 * e);
      float bevel = exp(-max(-shape, 0.0) / 0.03);
      vec3 n = normalize(OUT + vec3(-slope, 0.0, 0.0) + vec3(grad * 0.7 * bevel, 0.0));
      vec3 dark = blackMetal(n, 0.22);
      vec3 bolt = rivet(q);
      float onRivet = inside(-bolt.x);
      vec2 dome = (q - bolt.yz) / RIVET;
      vec3 nr = normalize(OUT + vec3(dome, 0.0) * 0.45);
      dark = mix(dark, blackMetal(nr, 0.3) * 1.15, onRivet);
      dark *= 1.0 - 0.5 * inside(0.02 - abs(bolt.x)); // le sertissage autour du rivet
      color = mix(color, dark, onHanger);
    }

    gl_FragColor = vec4(color, uOpacity);
    #include <colorspace_fragment>
  }
`

/* ==== MISE EN SCÈNE ==== */

/* Le « directeur » reçoit les choix d'option et rend, pour un instant et une forme d'écran donnés,
   tout ce que le moteur doit afficher : la caméra, la pose du tableau, l'opacité de la pièce et les
   cotes en cm. Unités : cm, radians, millisecondes. Repère : le mur est le plan z = 0, y monte, x va
   vers la droite, la caméra regarde vers -z.

   Pose du tableau : un objet (l'œuvre et son éventuel cadre) dont le milieu de la face arrière est
   en (x, y, z). Il tourne autour de ce point : d'abord `pitch` autour de l'axe x, puis `yaw` autour
   de l'axe y (ordre 'YXZ' de three.js). `outer` est la boîte extérieure (cadre compris) ; l'œuvre y
   occupe width × height × depth, à partir de `artZ`. `frame` est le profil du cadre, `framed` sa
   présence (0 à 1, pour le fondu), `paper` passe de 0 (toile) à 1 (poster) et `curl` de 0 (à plat) à
   1 (coin enroulé) : tous s'interpolent pendant la transition. La vue porte aussi `product`, les
   choix en cours, pour que le moteur rende tout à partir de la seule vue.

   Passer entre toile et poster est un « acte » : une petite scène qui part de la vue en cours,
   déroule son propre mouvement (tour de la toile ou du poster encadré, coin soulevé du poster) et
   revient de face. Un autre choix ne le coupe pas en plein vol : l'acte se finit vite, sur son propre
   chemin, puis la suite s'enchaîne. Le prix et le bouton, eux, n'attendent jamais. */

const DEG = Math.PI / 180
const FOV_Y = 30 * DEG
const FRONT_FILL = 0.72 // part de l'écran occupée par le tableau vu de face
const WALL_GAP = 1 // cm laissés entre le tableau qui pivote et le mur

/* Les plans de tranche, de coin et de profil montrent le côté que la lumière de la pièce
   éclaire (room.light, vecteur vers la lumière) : -1 si elle vient de la gauche. */
const litSide = (room) => (room.light && room.light[0] < 0 ? -1 : 1)

/* Bordure : le tableau pivote, la caméra regarde entre la tranche et la façade (side et front,
   cosinus des deux angles). Le plan se tient à mi-chemin, en zoom, du tableau entier (fill : part
   de l'écran qu'il remplit) et du gros plan où la tranche prend la part `share` de la largeur
   (field : plus petite hauteur visible, en cm). Assez près pour juger la tranche, assez loin pour
   reconnaître l'œuvre. at : l'arête de la façade se pose à cette part de la demi-largeur, côté
   tranche, pour laisser la place à l'image. Sous un cadre, voir GAP. */
const EDGE = { yaw: 38 * DEG, pitch: -6 * DEG, fill: 0.74, side: 0.8, front: 0.6, share: 0.4, field: 3.2, at: 0.45 }
/* Bordure sous un cadre (retour de Walid sur la version 16) : dans la caisse américaine, la tranche
   ne se voit que dans le jour de 0,6 cm, entre la toile et la paroi du cadre, sous la lèvre qui la
   dépasse. Plan rapproché sur l'angle bas côté lumière, tableau au mur : la caméra se tient de biais
   par rapport à cet angle, `look` vers la tranche éclairée et autant vers le bas. Walid trouvait le
   gros plan à 6 cm trop serré (10/11 : « on voit que c'est de la 3D »), puis encore trop zoomé à
   6,4 cm (version 25 : « effet dessin animé ») : le plan fait 9 cm de haut, la caméra se tient à
   17 cm, et l'image de l'œuvre y est moins grossie que sa photo en 30 × 40. À 15°, la tranche du
   côté et celle du bas se voient sur toute leur profondeur (2 cm), soit 0,46 cm à l'écran, 5 % de sa
   hauteur ; l'optimum est à 16°, la lèvre en cache le fond au-delà de 18°. field : hauteur du plan à l'angle, en cm. spot : place de l'angle sur l'écran, en part de
   la demi-largeur et de la demi-hauteur depuis le milieu ; l'œuvre remplit le reste. Sur un écran
   plus large que `narrow`, l'angle revient vers le milieu, jusqu'au milieu à `wide` (largeur sur
   hauteur) : le cadre prend un côté, l'œuvre l'autre, et la caméra regarde le mur sous le même biais
   que sur un téléphone. Poser l'angle sur le côté d'un écran large la ferait tourner de 36°. */
const GAP = { look: 15 * DEG, field: 9, spot: 0.3, narrow: 1.3, wide: 2.2 }
/* Coin du cadre : caméra au-dessus du coin bas, côté lumière. field : petit côté du plan pour un
   30 × 40, en cm ; il s'élargit un peu avec le tableau, pour garder de l'œuvre. spot : place du
   coin sur l'écran, en part de la demi-largeur et de la demi-hauteur depuis le milieu. L'œuvre et
   le cadre remplissent le reste, quel que soit le format de la vue. */
const CORNER = { yaw: 32 * DEG, pitch: 18 * DEG, field: 16, spot: 0.6 }
/* Toile sans cadre : plus de biais et un peu moins de hauteur que le coin d'un cadre, pour lire la
   tranche. Le plan se tient à mi-chemin, en zoom, du tableau de face et du coin du cadre, et garde
   la même surface sur tous les écrans : un écran large montre moins de haut, mais pas de vide. */
const BARE = { yaw: 44 * DEG, pitch: 10 * DEG, spot: 0.62 }
// Contour blanc : de face, sur le coin bas gauche, 36 % de la hauteur du tirage à l'écran.
const MARGIN = { inX: 0.13, inY: 0.11, field: 0.36 }
// Animations réduites : la caméra tourne autour du tableau resté au mur.
const MATERIAL = { yaw: 40 * DEG, pitch: 8 * DEG, fill: 0.62 }

// Deux clés de tour reliées à vitesse constante (avancement, angle) : de dos, le tableau tourne lentement.
const steady = ([t0, a0], [t1, a1]) => {
  const speed = (a1 - a0) / (t1 - t0)
  return [[t0, a0, speed], [t1, a1, speed]]
}

/* Tour de la toile. keys : avancement (0 à 1), angle du tableau en degrés et vitesse en degrés par
   unité d'avancement ; il démarre, ralentit de dos, repart, s'arrête. leave : part du temps pour
   quitter le mur, et y revenir. */
const TURN = {
  ms: 3600,
  keys: [[0.1, 0, 0], ...steady([0.36, 155], [0.64, 205]), [0.9, 360, 0]],
  leave: 0.16,
  yaw: 14 * DEG,
  pitch: 5 * DEG,
  fill: 0.6,
}
/* Tour du poster encadré (retour de Walid du 11/11 : « quand on [bascule] à poster et que c'est un
   cadre, le poster ne se met pas de face. Il reste penché de profil »). Sous verre, le papier ne peut
   pas se soulever : il fait un tour sur lui-même comme la toile, pour qu'on voie son dos (« un pivot
   sur lui-même […] qu'on puisse voir le dos »), et se recale de face. Ses 15 premiers et ses 15
   derniers degrés passent lentement : le reflet d'une porte-fenêtre (GLASS_ROOM) a le temps de glisser
   sur le verre au départ et au retour, et l'on comprend qu'il y a une vitre (sa première idée :
   « qu'on voie la lumière qui se reflète »). Le milieu du tour va un peu plus vite que celui de la
   toile. La caméra reste en face, sans se décaler sur le côté : décalée, elle chassait le reflet du
   départ en 100 ms et avançait celui du retour dans la partie rapide du tour. */
const GLAZED_TURN = {
  ...TURN,
  ms: 4000,
  keys: [[0.05, 0, 0], [0.2, 15, 150], ...steady([0.4, 155], [0.6, 205]), [0.8, 345, 150], [0.95, 360, 0]],
  yaw: 0,
}
/* Coin soulevé du poster. field : hauteur visible, en part de la hauteur de la feuille.
   inset : visée rentrée depuis le coin, en part du petit côté. near : part du temps pour
   s'approcher du coin, et s'en éloigner. start, rise, fall, land, end : avancement où le
   papier se lève, finit de monter, commence à retomber, touche le mur, et se pose après un
   petit rebond (bounce). */
const CURL_ACT = {
  ms: 3000,
  field: 0.66,
  inset: 0.2,
  yaw: 20 * DEG,
  pitch: 12 * DEG,
  near: 0.26,
  start: 0.17,
  rise: 0.44,
  fall: 0.56,
  land: 0.76,
  end: 0.84,
  bounce: 0.05,
}
const JOIN_MS = 500 // un acte rejoint son mouvement depuis la vue en cours
const HURRY = 1.2 // un acte interrompu se finit un peu plus vite que prévu

const RETURN_MS = 450 // retour de face
const GO_MS = 1000 // vers le plan de l'option (en sinus : glide)

/* Inclinaison au doigt : la caméra tourne autour du point visé (le tableau reste au mur,
   on voit son épaisseur et son ombre bouger). Glisser vers la droite fait tourner le
   tableau vers la droite, comme si on le poussait. Déplacements en fraction de la scène.
   De face et au repos, le geste va bien plus loin qu'ailleurs : jusqu'à 40° de côté, atteints en
   glissant la moitié de la largeur de la scène, et 14° en hauteur (retours de Walid du 11/11 : « quand
   il est de face, j'aimerais qu'on puisse le manipuler plus », 24° de côté ; puis, après un essai avec
   une cliente, « il faudrait qu'on puisse encore le tourner plus à gauche ou à droite »). Au-delà de
   40°, la tranche et le flanc du cadre prennent le pas sur l'œuvre.
   Ailleurs (gros plans des options, transitions et actes), la mesure d'avant : la caméra peut y être
   à quelques cm du cadre. */
const TILT = {
  front: { gainYaw: 80 * DEG, gainPitch: 28 * DEG, maxYaw: 40 * DEG, maxPitch: 14 * DEG },
  close: { gainYaw: 24 * DEG, gainPitch: 16 * DEG, maxYaw: 12 * DEG, maxPitch: 8 * DEG },
}
// Ressort du retour : amortissement 0,6 et 1,6 Hz -> rebond d'environ 10 %, posé en 0,8 s.
const SPRING = { damping: 0.6, omega: 2 * Math.PI * 1.6 }
const SPRING_SETTLED_MS = 1100 // au-delà, l'écart restant est sous le vingtième de degré, même parti de 40°
const TILT_CALM_MS = 200 // le zoom prend la main : l'inclinaison revient de face, sans ressort (calmTilt)

function springFactor(ms) {
  const t = ms / 1000
  const { damping: z, omega: w } = SPRING
  const wd = w * Math.sqrt(1 - z * z)
  return Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

const clamp = (v, max) => Math.max(-max, Math.min(max, v))

function hangingCenter(room, h) {
  const bottom = Math.max(room.hang.minBottom, room.hang.center - h / 2)
  return { x: room.hang.x, y: bottom + h / 2 }
}

// Distance à laquelle une hauteur `field` remplit tout l'écran.
const distanceFor = (field) => field / (2 * Math.tan(FOV_Y / 2))

function fitDistance(w, h, aspect, fill) {
  return Math.max(distanceFor(h / fill), distanceFor(w / (aspect * fill)))
}

const add = (a, b) => a.map((v, i) => v + b[i])
const scale = (a, s) => a.map((v) => v * s)
const unit = (a) => scale(a, 1 / Math.hypot(...a))
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const lerp = (a, b, t) => a + (b - a) * t

function rotate([x, y, z], pitch, yaw) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const y1 = y * cp - z * sp
  const z1 = y * sp + z * cp
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  return [x * cy + z1 * sy, y1, -x * sy + z1 * cy]
}

/* Les 8 coins de l'œuvre (ou, avec 'outer', de la boîte cadre compris) dans le repère du
   mur. `side` dit de quel côté est le coin (x et y : -1 ou 1 ; z : 0 derrière, 1 devant). */
export function paintingCorners(p, which = 'art') {
  const box =
    which === 'outer'
      ? { w: p.outer.width, h: p.outer.height, z0: 0, z1: p.outer.depth }
      : { w: p.width, h: p.height, z0: p.artZ, z1: p.artZ + p.depth }
  const corners = []
  for (const sz of [0, 1]) {
    for (const sy of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const local = [(sx * box.w) / 2, (sy * box.h) / 2, sz ? box.z1 : box.z0]
        const c = add(rotate(local, p.pitch, p.yaw), [p.x, p.y, p.z])
        c.side = { x: sx, y: sy, z: sz }
        corners.push(c)
      }
    }
  }
  return corners
}

// Coin le plus enfoncé dans le mur d'un tableau tourné de (pitch, yaw), posé à z = 0.
const lowestCorner = (painting) => Math.min(...paintingCorners({ ...painting, z: 0 }, 'outer').map((c) => c[2]))

// Recul nécessaire pour qu'un tableau tourné de (pitch, yaw) ne touche pas le mur.
const clearance = (painting) => Math.max(0, WALL_GAP - lowestCorner(painting))

function hungPainting(room, product) {
  const { width: w, height: h } = dimensionsOf(product.size)
  const depth = product.material === 'poster' ? PAPER_DEPTH : CANVAS_DEPTH
  const frame = { ...FRAME_PROFILE[product.material] }
  let outer = { width: w, height: h, depth }
  let artZ = 0
  if (hasFrame(product)) {
    const band = 2 * (frame.gap + frame.face)
    outer = { width: w + band, height: h + band, depth: Math.max(frame.depth, frame.floor + depth) }
    artZ = frame.floor
  }
  const c = room.poses ? poseCenter(room.poses, product.size) : hangingCenter(room, outer.height)
  const paper = product.material === 'poster' ? 1 : 0
  const passe = paper && product.passe ? 1 : 0 // contour blanc, en fondu pendant la transition
  const framed = hasFrame(product) ? 1 : 0 // le cadre aussi : il n'apparaît jamais d'un coup
  return { x: c.x, y: c.y, z: 0, yaw: 0, pitch: 0, width: w, height: h, depth, artZ, outer, frame, framed, paper, passe, curl: 0 }
}

const artFront = (p) => [p.x, p.y, p.z + p.artZ + p.depth]

/* Cotes : une ligne au-dessus du tableau pour la largeur, une à sa droite pour la hauteur,
   posées en façade de l'œuvre. Toujours calculées pour que les fondus restent continus ;
   seule leur opacité dit si on les montre. side : -1 met la cote de hauteur à gauche (avec la
   femme, qui se tient à droite du tableau). */
const DIMS_OFFSET = 6
const DIMS_LABEL = 14 // hauteur à laisser au-dessus de la ligne pour son étiquette, dans la pièce
const ROOM_HEADROOM = 7 // cm gardés au-dessus du tableau dans le cadrage de la pièce
const ROOM_SHARE = 0.25 // part de la hauteur de la vue que le tableau prend au moins, dans la pièce
const WALL_FILL = 0.6 // sur le mur neutre, part de l'écran du plus grand format, cotes comprises à côté
const DIMS_UNDER = 8 // sous le tableau, la ligne descend d'autant pour laisser la place à l'étiquette

function dimsOf(p, opacity, under = false, side = 1) {
  const z = p.z + p.artZ + p.depth
  const left = p.x - p.width / 2, right = p.x + p.width / 2
  const bottom = p.y - p.height / 2, top = p.y + p.height / 2
  const ox = (p.outer.width - p.width) / 2 + DIMS_OFFSET
  const oy = (p.outer.height - p.height) / 2 + DIMS_OFFSET
  const y = under ? bottom - oy - DIMS_UNDER : top + oy
  const x = side > 0 ? right + ox : left - ox
  return {
    opacity,
    under,
    side,
    width: { a: [left, y, z], b: [right, y, z], text: `${p.width} cm` },
    height: { a: [x, bottom, z], b: [x, top, z], text: `${p.height} cm` },
  }
}

/* poses : part de chaque pose dans la vue (photos de la femme, une par taille du produit, dans
   l'ordre de poses.sizes) ; vide hors de la pièce, le directeur la remplit de zéros (createDirector). */
const NO_POSES = []
const NO_TILT = { yaw: 0, pitch: 0 } // inclinaison au doigt appliquée à la vue, en radians (withTilt)

function shotOf(shot, camera, painting, { room = 0, dims = room, dimsUnder = false, poses = NO_POSES } = {}) {
  return { shot, camera, painting, room, dims: dimsOf(painting, dims, dimsUnder), poses }
}

/* Mise en scène de la taille avec la femme (poses.js, choix de Walid du 10/11). Les quatre photos
   ont le même mur, la même plinthe et le même appareil : elles se posent toutes au même endroit
   du mur, bord gauche en x = 0 et pied du mur en y = 0. À côté d'elle, les tableaux paraissent
   poses.scale fois plus grands que sur la photo (retour de Walid sur la version 21 : elle paraissait
   mesurer 1,80 m) : la photo est réduite d'autant (16 × scale px/cm), le tableau garde ses vraies
   mesures et s'accroche par son coin bas côté femme, au coin du rectangle de la photo (rect : sa
   place, à ses vraies mesures, même si le rectangle de la photo est un peu de travers). Ses mains le
   présentent donc toujours au même endroit ; il grandit vers le haut et vers la gauche. Il s'accroche
   ainsi dans tous les plans (hungPainting) : il ne glisse jamais sur le mur, et un changement de
   taille fond une pose dans l'autre sans bouger la pièce. Rend, en cm du mur : la photo, le rectangle
   du tableau, la femme, son corps sans son bras lointain (body), sa tête, la zone de son calque, la
   largeur sans rien devant le mur le long des bords gauche et droit (clean), recopiée en miroir
   au-delà de la photo, et son bras lointain (reach : bord du corps, coude, poignet, bout des doigts),
   s'il s'écarte d'elle. */
export function posePlacement(poses, size) {
  const pose = poses.bySize[size]
  const k = 1 / (poses.pxPerCm * (poses.scale || 1))
  const box = ([left, top, right, bottom]) => ({
    left: left * k, right: right * k, top: (poses.floorPx - top) * k, bottom: (poses.floorPx - bottom) * k,
  })
  const [L, T, W, H] = pose.rect
  const corner = box([L + W, T + H, L + W, T + H])
  const { width, height } = dimensionsOf(size)
  return {
    photo: box([0, 0, ...poses.px]),
    rect: { left: corner.right - width, right: corner.right, top: corner.bottom + height, bottom: corner.bottom },
    person: box(pose.person),
    body: box(pose.reach ? [pose.person[0], pose.person[1], pose.reach.body, pose.person[3]] : pose.person),
    reach: pose.reach ? { body: pose.reach.body * k, elbow: pose.reach.elbow * k, wrist: pose.reach.wrist * k, tip: pose.person[2] * k } : null,
    head: box(pose.head),
    overlay: box(pose.overlay),
    clean: { left: pose.clean.left * k, right: pose.clean.right * k },
  }
}

const poseCenter = (poses, size) => {
  const { rect } = posePlacement(poses, size)
  return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
}

/* Cadrage de la pose, pour la forme réelle de la zone au-dessus de la rangée (screen). Le tableau
   d'abord, puis elle, sa main lointaine en dernier (choix de Walid pour la version 24). Doit se voir :
   le tableau et ses cotes (hauteur à gauche, la femme est à droite), sa tête, et son corps en
   largeur, avec la main qui présente le tableau. Son bras lointain (bras ouverts du 90 × 120, côté
   lampadaire) ne fait jamais reculer la vue : sa main se voit si la vue la contient, sinon le bord
   de la vue coupe le bras loin du coude et du poignet (POSE.joint de chaque segment), jamais la main.
   Le bouton « De face » occupe le coin en haut à gauche de la zone (inset : part de sa hauteur et de
   sa largeur) : si le tableau ou ses cotes y tombent, ils descendent dessous. On cherche à voir :
   la femme en entier. Sur un écran en hauteur, la vue grandit pour la montrer ; sur un écran large,
   le mur vide sur les côtés n'en prend jamais plus d'un cinquième : si elle ne tient pas en
   hauteur, on garde le haut et on la coupe à mi-cuisse, au plus bas un peu au-dessus du genou ; si
   ce qui doit se voir l'interdit, elle se voit entière (jamais coupée aux genoux ni aux chevilles). Autour de la photo, le mur se
   prolonge (scene.js) : en haut, uni, autant qu'il le faut (au plus BEYOND.top), jamais sous le sol
   de la photo ; sur les côtés, en miroir, au plus la bande sans rien devant le mur (clean, un seul
   miroir, au plus BEYOND.side : sur les photos meublées, un objet au bord n'est jamais recopié).
   Si la vue doit être plus large que cela (ordinateur, grands formats), elle se centre sur la photo
   et le mur s'y prolonge uni (scene.js). */
const POSE = { margin: 0.04, label: 7, empty: 0.2, torso: 25, thigh: 0.45, knee: 0.4, lowest: 0.37, dimsAbove: 10, joint: 0.3 } // part de sa hauteur, depuis ses pieds ; joint : part du segment du bras
export const BEYOND = { side: 130, top: 200 }
const NO_INSET = { top: 0, left: 0 }

function poseShot(room, product, aspect, u, screen = aspect, inset = NO_INSET) {
  const painting = hungPainting(room, product)
  const top = painting.y + painting.outer.height / 2
  // La cote de largeur au-dessus du tableau, ou au-dessous : là où le tableau reste le plus grand à
  // l'écran. Au-dessus, jamais à plus de 10 cm au-dessus de la photo.
  const above = top + DIMS_OFFSET + DIMS_LABEL <= posePlacement(room.poses, product.size).photo.top + POSE.dimsAbove
  const views = (above ? [false, true] : [true]).map((under) => poseView(room, product, painting, under, screen, inset))
  const view = views.reduce((best, v) => (v.height < best.height - 1e-6 ? v : best))
  const target = [view.x, view.y, 0]
  const camera = { position: add(target, [0, 0, distanceFor(view.height)]), target, fovY: FOV_Y }
  return shotOf('room', camera, painting, { room: 1, dimsUnder: view.under, poses: room.poses.sizes.map((s) => (s === product.size ? 1 : 0)) })
}

function poseView(room, product, painting, under, screen, inset) {
  const { photo, body, reach, head, clean } = posePlacement(room.poses, product.size)
  const halfW = painting.outer.width / 2, halfH = painting.outer.height / 2
  const top = painting.y + halfH, bottom = painting.y - halfH
  const dims = dimsOf(painting, 1, under, -1)
  const union = (a, b) => ({
    left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom),
  })
  const art = {
    left: dims.height.a[0] - POSE.label,
    right: painting.x + halfW,
    top: under ? top : dims.width.a[1] + DIMS_LABEL,
    bottom: under ? dims.width.a[1] : bottom,
  }
  const core = union(art, head)
  const must = { ...core, left: Math.min(core.left, body.left), right: Math.max(core.right, body.right) }
  const want = union(must, body)
  const keep = (x, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(x, lo), hi))
  // Son bras lointain : le bord droit de la vue au-delà de sa main (au bord de la photo si sa main
  // le touche), ou sur le bras loin du coude et du poignet ; le plus près du centre choisi, x entre
  // lo et hi (ce qui doit se voir, dans la photo prolongée).
  const reachX = (x, width, side, lo, hi) => {
    if (!reach || lo > hi) return x
    const upper = reach.elbow - reach.body, fore = reach.wrist - reach.elbow
    const allowed = [
      [-Infinity, reach.elbow - POSE.joint * upper],
      [reach.elbow + POSE.joint * fore, reach.wrist - POSE.joint * fore],
      [reach.tip >= photo.right - 0.5 ? photo.right : reach.tip + side, Infinity],
    ]
    let best = null
    for (const [a, b] of allowed) {
      const from = Math.max(a - width / 2, lo), to = Math.min(b - width / 2, hi)
      if (from > to) continue
      const at = Math.min(Math.max(x, from), to)
      if (best === null || Math.abs(at - x) < Math.abs(best - x)) best = at
    }
    return best === null ? x : best
  }

  // roof : part du haut de la vue gardée libre au-dessus du tableau.
  function frame(roof) {
    const tall = (box) => Math.max((box.top - box.bottom) / (1 - 2 * POSE.margin), (art.top - box.bottom) / (1 - POSE.margin - roof))
    const fit = (box) => Math.max(tall(box), (box.right - box.left) / screen / (1 - 2 * POSE.margin))
    const most = Math.min(photo.top + BEYOND.top - photo.bottom, (photo.right - photo.left + 2 * BEYOND.side) / screen)
    const roomy = screen <= 1 ? Infinity : (want.right - want.left) / ((1 - POSE.empty) * screen)
    let height = Math.max(fit(must), Math.min(fit(want), roomy, most))
    const whole = tall(want)
    const ceiling = (h) => Math.max(want.top + POSE.margin * h, art.top + roof * h) // haut de la vue, le haut gardé
    const line = (share) => body.bottom + share * (body.top - body.bottom)
    // Hauteur de vue qui, le haut gardé, la coupe juste à cette ligne.
    const cutAt = (y) => Math.max((want.top - y) / (1 - POSE.margin), (art.top - y) / (1 - roof))
    if (height < whole) height = Math.max(fit(must), Math.min(height, cutAt(line(POSE.thigh))))
    // De côté : la femme (sans ses bras tendus) et le tableau au milieu, sans miroir de préférence à
    // droite, et ce qui doit se voir (ses mains comprises), dedans. En hauteur : la femme en entier si
    // elle tient, sinon le haut (tableau, tête).
    const place = (height) => {
      const width = height * screen
      const pad = POSE.margin * height
      let x = (core.left + Math.max(core.right, (head.left + head.right) / 2 + POSE.torso)) / 2
      const left = photo.left - Math.min(BEYOND.side, clean.left), right = photo.right + Math.min(BEYOND.side, clean.right)
      x = keep(x, left + width / 2, right - width / 2)
      x = keep(x, must.right + pad * screen - width / 2, must.left - pad * screen + width / 2)
      x = keep(x, left + width / 2, right - width / 2)
      x = reachX(x, width, pad * screen, Math.max(left + width / 2, must.right + pad * screen - width / 2),
        Math.min(right - width / 2, must.left - pad * screen + width / 2))
      let y = height >= whole ? (want.top + want.bottom) / 2 : ceiling(height) - height / 2
      y = keep(y, Math.max(art.top + roof * height, must.top + pad) - height / 2, must.bottom - pad + height / 2)
      // Coupée : au-dessus de la ligne du genou si la vue peut monter (un peu plus de mur au-dessus).
      if (height < whole) y = Math.max(y, Math.min(line(POSE.knee) + height / 2, must.bottom - pad + height / 2))
      y = Math.max(Math.min(y, photo.top + BEYOND.top - height / 2), photo.bottom + height / 2) // le sol d'abord
      return { x, y, height, width }
    }
    const view = place(height)
    // Coupée plus bas qu'un peu au-dessus du genou (ce qui doit se voir l'impose) : elle se voit entière.
    const bottom = view.y - height / 2
    if (bottom > body.bottom && bottom < line(POSE.lowest)) return place(Math.max(height, whole))
    return view
  }
  let view = frame(POSE.margin)
  // Le tableau ou ses cotes sous le bouton « De face » : ils descendent dessous.
  const roof = inset.top + POSE.margin / 2
  if (roof > POSE.margin) {
    const fromLeft = (art.left - (view.x - view.width / 2)) / view.width
    const fromTop = (view.y + view.height / 2 - art.top) / view.height
    if (fromLeft < inset.left && fromTop < roof) view = frame(roof)
  }
  return { ...view, under }
}

function frontShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, FRONT_FILL)
  const target = artFront(painting)
  return shotOf('front', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

/* Recul dans la pièce : cadrage fixe (du sol jusqu'au-dessus du tableau), réduit si
   l'écran est plus large que la photo, et décalé pour ne jamais sortir de la photo. Un petit
   tableau resserre le cadrage sur le milieu de la pièce : il garde sa vraie échelle, mais on
   ne voit plus qu'une partie du canapé. */
function roomShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const { photo, view } = room
  const whole = Math.min(view.height, (photo.right - photo.left) / aspect)
  const height = Math.min(whole, painting.outer.height / ROOM_SHARE)
  const halfWidth = (height * aspect) / 2
  const x = Math.min(Math.max(painting.x, photo.left + halfWidth), photo.right - halfWidth)
  // Sur un écran large, le cadrage rétrécit : il monte juste assez pour garder le tableau entier.
  const paintingTop = painting.y + painting.outer.height / 2
  const bottom = Math.max(view.bottom + (whole - height) / 2, paintingTop + ROOM_HEADROOM - height)
  const target = [x, bottom + height / 2, 0]
  const d = distanceFor(height)
  // Un grand tableau monte près du haut du cadrage : sa cote de largeur passe dessous.
  const dimsUnder = paintingTop + DIMS_OFFSET + DIMS_LABEL > bottom + height
  return shotOf('room', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting, { room: 1, dimsUnder })
}

/* Mur neutre, sans pièce : aucun meuble pour juger de l'échelle. Le cadrage reste celui du plus grand
   format du produit (fill : la part de l'écran qu'il remplit), et la taille se lit contre lui, avec
   la cote en cm. Comme dans la pièce, un petit tableau resserre le cadrage. */
function wallShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const { width, height } = room.largest
  const d = Math.min(fitDistance(width, height, aspect, WALL_FILL), distanceFor(painting.outer.height / ROOM_SHARE))
  const target = artFront(painting)
  return shotOf('wall', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting, { dims: 1 })
}

/* Caméra posée de biais sur le coin bas du tableau, côté lumière : le coin tombe à la place `spot`
   de l'écran, quel que soit son format. height : hauteur du plan, en cm. */
function cameraOnCorner(room, painting, aspect, { yaw, pitch, spot }, height) {
  const side = litSide(room)
  const direction = orbitDirection(side * yaw, pitch)
  const right = unit(cross([0, 1, 0], direction))
  const up = cross(direction, right)
  const edge = paintingCorners(painting, 'outer').filter((c) => c.side.x === side && c.side.y < 0)
  const across = edge.map((c) => dot(c, right))
  const outermost = side < 0 ? Math.min(...across) : Math.max(...across)
  const lowest = Math.min(...edge.map((c) => dot(c, up)))
  const front = edge.find((c) => c.side.z === 1) // plus près de la caméra, c'est lui qui se voit
  const towards = outermost - (side * spot * height * aspect) / 2 - dot(front, right)
  const above = lowest + (spot * height) / 2 - dot(front, up)
  const target = add(front, add(scale(right, towards), scale(up, above)))
  return { position: add(target, scale(direction, distanceFor(height))), target, fovY: FOV_Y }
}

function cornerShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const field = CORNER.field * (painting.height / 40) ** 0.25
  return shotOf('corner', cameraOnCorner(room, painting, aspect, CORNER, field / Math.min(1, aspect)), painting)
}

// Toile nue : son coin et sa tranche, avec une bonne part de l'œuvre.
function bareShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const span = Math.sqrt((painting.height / FRONT_FILL) * CORNER.field)
  return shotOf('bare', cameraOnCorner(room, painting, aspect, BARE, span / Math.sqrt(aspect)), painting)
}

function marginShot(room, product) {
  const painting = hungPainting(room, product)
  const front = artFront(painting)
  const target = [
    front[0] - painting.width * (0.5 - MARGIN.inX),
    front[1] - painting.height * (0.5 - MARGIN.inY),
    front[2],
  ]
  const d = distanceFor(MARGIN.field * painting.height)
  return shotOf('margin', { position: add(target, [0, 0, d]), target, fovY: FOV_Y }, painting)
}

const orbitDirection = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]

// Caméra placée en orbite autour d'un point : yaw vers la droite, pitch vers le haut.
function orbit(target, yaw, pitch, distance) {
  return add(target, scale(orbitDirection(yaw, pitch), distance))
}

function materialShot(room, product, aspect) {
  const painting = hungPainting(room, product)
  const target = artFront(painting)
  const d = fitDistance(painting.outer.width, painting.outer.height, aspect, MATERIAL.fill)
  const position = orbit(target, litSide(room) * MATERIAL.yaw, MATERIAL.pitch, d)
  return shotOf('material', { position, target, fovY: FOV_Y }, painting)
}

// Bordure sous un cadre : l'angle bas côté lumière, vu de biais dans le jour (GAP).
function gapShot(room, product, aspect) {
  const side = litSide(room)
  const painting = hungPainting(room, product)
  const corner = paintingCorners(painting).find((c) => c.side.x === side && c.side.y === -1 && c.side.z === 1)
  const toward = Math.tan(GAP.look)
  const dir = unit([side * toward, -toward, 1])
  const d = distanceFor(GAP.field)
  // La caméra se place par rapport à l'angle ; la visée se décale vers l'œuvre pour poser l'angle à `spot`.
  const right = unit(cross([0, 1, 0], dir))
  const up = cross(dir, right)
  const half = d * Math.tan(FOV_Y / 2)
  const across = GAP.spot * Math.min(1, Math.max(0, (GAP.wide - aspect) / (GAP.wide - GAP.narrow)))
  const target = add(corner, add(scale(right, -side * across * half * aspect), scale(up, GAP.spot * half)))
  return shotOf('edge', { position: add(corner, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

function edgeShot(room, product, aspect) {
  if (hasFrame(product)) return gapShot(room, product, aspect)
  const side = litSide(room)
  // Le tableau tourne pour avancer sa tranche éclairée vers nous, et s'écarte du mur.
  const base = { ...hungPainting(room, product), yaw: -side * EDGE.yaw, pitch: EDGE.pitch }
  const painting = { ...base, z: clearance(base) }
  const corners = paintingCorners(painting)
  // Visée : milieu de l'arête avant de l'œuvre, côté tranche. Regard entre la normale de
  // la tranche et celle de la façade, pour lire la tranche sans perdre l'image.
  const frontEdge = corners.filter((c) => c.side.x === side && c.side.z === 1)
  const middle = scale(add(frontEdge[0], frontEdge[1]), 0.5)
  const sideNormal = rotate([side, 0, 0], painting.pitch, painting.yaw)
  const frontNormal = rotate([0, 0, 1], painting.pitch, painting.yaw)
  const dir = unit(add(scale(sideNormal, EDGE.side), scale(frontNormal, EDGE.front)))
  const whole = fitDistance(painting.outer.width, painting.outer.height, aspect, EDGE.fill)
  const close = distanceFor(Math.max(EDGE.field, (painting.depth * EDGE.side) / (EDGE.share * aspect)))
  const d = Math.sqrt(whole * close)
  const right = unit(cross([0, 1, 0], dir))
  const target = add(middle, scale(right, -side * EDGE.at * d * Math.tan(FOV_Y / 2) * aspect))
  return shotOf('edge', { position: add(target, scale(dir, d)), target, fovY: FOV_Y }, painting)
}

/* Courbe des étapes : en sinus, accélération et freinage symétriques, sans pointe de vitesse (π/2
   fois la vitesse moyenne, contre 3 fois pour la courbe cubique d'avant, qui restait comme figée
   les 170 premières ms : retour de Walid sur la version 23). La page cadre et décale le canvas sur
   la même courbe. */
export const glide = (t) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2
const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

// Interpole deux valeurs de même forme (nombres, tableaux, objets imbriqués).
function blend(a, b, t) {
  if (typeof b === 'number') return lerp(a, b, t)
  if (Array.isArray(b)) return b.map((v, i) => blend(a[i], v, t))
  if (b && typeof b === 'object') {
    return Object.fromEntries(Object.keys(b).map((k) => [k, blend(a[k], b[k], t)]))
  }
  return t < 1 ? a : b
}

// Monte sur la part `edge` du début, redescend sur la même part à la fin.
const away = (u, edge) => smooth(u / edge) * (1 - smooth((u - 1 + edge) / edge))

// Courbe de Hermite : de p0 à p1, pentes m0 et m1 (rapportées à l'intervalle), s de 0 à 1.
function hermite(p0, p1, m0, m1, s) {
  const s2 = s * s, s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * m1
}

// Angle du tableau (degrés) selon l'avancement : d'une clé à l'autre, à la vitesse de chaque clé.
function turnAngle(u, keys) {
  const last = keys.length - 1
  if (u <= keys[0][0]) return keys[0][1]
  if (u >= keys[last][0]) return keys[last][1]
  const i = keys.findIndex(([t]) => t > u) - 1
  const [t0, a0, m0] = keys[i], [t1, a1, m1] = keys[i + 1]
  return hermite(a0, a1, m0 * (t1 - t0), m1 * (t1 - t0), (u - t0) / (t1 - t0))
}

/* Acte de la toile : elle quitte le mur juste assez pour tourner autour de son axe vertical,
   la caméra recule un peu et se décale pour lire la profondeur du châssis. La tranche
   éclairée passe la première. Le poster encadré joue le même acte sur son propre mouvement
   (motion : TURN ou GLAZED_TURN), sous le nom de plan `shot`. */
const turnShot = (motion, shot) => (room, product, aspect, u) => {
  const rest = frontShot(room, product, aspect)
  const p = rest.painting
  const side = litSide(room)
  const out = away(u, motion.leave)
  const z = out * (Math.hypot(p.outer.width / 2, p.outer.depth) + WALL_GAP)
  const axis = [p.x, p.y, z + p.outer.depth / 2]
  const d = fitDistance(p.outer.width, p.outer.height, aspect, motion.fill)
  const orbiting = { position: orbit(axis, side * motion.yaw, motion.pitch, d), target: axis, fovY: FOV_Y }
  return shotOf(shot, blend(rest.camera, orbiting, out), { ...p, z, yaw: -side * turnAngle(u, motion.keys) * DEG })
}

// Coin soulevé : en bas, à l'opposé de la lumière, pour que le dos du papier la reçoive.
export const curlCorner = (room) => ({ x: -litSide(room), y: -1 })

// Le papier monte vite puis ralentit, retombe en accélérant et rebondit à peine.
function curlAmount(u) {
  const { start, rise, fall, land, end, bounce } = CURL_ACT
  if (u <= start || u >= end) return 0
  if (u < rise) return 1 - Math.pow(1 - (u - start) / (rise - start), 3)
  if (u <= fall) return 1
  if (u < land) return 1 - Math.pow((u - fall) / (land - fall), 2)
  return bounce * Math.sin((Math.PI * (u - land)) / (end - land))
}

/* Acte du poster : la caméra s'approche du coin, de trois-quarts et du côté du coin pour voir
   le papier se détacher du mur, et revient de face quand il est retombé. */
function curlShot(room, product, aspect, u) {
  const rest = frontShot(room, product, aspect)
  const p = rest.painting
  const { x, y } = curlCorner(room)
  const corner = paintingCorners(p).find((c) => c.side.x === x && c.side.y === y && c.side.z === 1)
  const inset = CURL_ACT.inset * Math.min(p.width, p.height)
  const target = add(corner, [-x * inset, -y * inset, 0])
  const d = distanceFor(CURL_ACT.field * p.height)
  const close = { position: orbit(target, x * CURL_ACT.yaw, CURL_ACT.pitch, d), target, fovY: FOV_Y }
  const camera = blend(rest.camera, close, away(u, CURL_ACT.near))
  return shotOf('curl', camera, { ...p, curl: curlAmount(u) })
}

const SHOTS = {
  front: frontShot,
  edge: edgeShot,
  corner: cornerShot,
  bare: bareShot,
  room: roomShot,
  wall: wallShot,
  margin: marginShot,
  material: materialShot,
  turn: turnShot(TURN, 'turn'),
  glazed: turnShot(GLAZED_TURN, 'glazed'),
  curl: curlShot,
}
const SHOT_OF_GROUP = { border: 'edge', frame: 'corner', size: 'room', passe: 'margin', material: 'material' }

// Le plan d'une option. Une toile sans cadre a le sien : il n'y a pas de coin de cadre à montrer.
// Ni poses ni photo de pièce (une photo hors de la page, renderStill) : la taille se montre sur le mur.
function planOf(group, product, room) {
  if (group === 'frame' && !hasFrame(product)) return 'bare'
  if (group === 'size' && !room.photo && !room.poses) return 'wall'
  return SHOT_OF_GROUP[group] || 'front'
}

const sameProduct = (a, b) => Object.keys(b).every((key) => a[key] === b[key])

/* Les actes. exit : où un acte interrompu à l'avancement u s'arrête sur son chemin. La toile, comme
   le poster encadré, revient de face par le plus court ; le papier redescend par où il est monté, ou
   finit de tomber, pour ne jamais se trouver sous le verre d'un cadre qui arrive. */
const nearestFace = (u) => (u < 0.5 ? 0 : 1)
const ACTS = {
  turn: { ms: TURN.ms, exit: nearestFace },
  glazed: { ms: GLAZED_TURN.ms, exit: nearestFace },
  curl: { ms: CURL_ACT.ms, exit: (u) => (u < CURL_ACT.rise ? CURL_ACT.start : Math.max(u, CURL_ACT.land)) },
}

/* Avancement d'une étape à l'instant `at`. Une étape qui finit un acte interrompu (span)
   repart à la vitesse de l'acte, sans à-coup, et s'arrête en douceur sur la sortie. */
function progressOf(leg, at) {
  const t = Math.min(1, Math.max(0, (at - leg.start) / leg.duration))
  if (!leg.span) return t
  return hermite(leg.span[0], leg.span[1], leg.duration / ACTS[leg.shot].ms, 0, t)
}

const frontal = (c) => Math.abs(c.position[0] - c.target[0]) < 1e-9 && Math.abs(c.position[1] - c.target[1]) < 1e-9

/* D'une vue de face à une autre (la pièce et la vue de face) : à l'écran, le tableau grandit et
   glisse selon la courbe même. Sa taille va comme l'inverse du recul : on mêle l'inverse du recul,
   et l'écart du tableau au centre de l'image rapporté au recul. Mêler le recul lui-même faisait
   grandir le tableau à peine au début et d'un coup à la fin (30 × 40 : du mur entier à l'œuvre). */
function frontCamera(a, b, view, t) {
  const face = view.painting.z + view.painting.artZ + view.painting.depth
  const inverse = (v) => 1 / Math.max(v.camera.position[2] - face, 1e-6)
  const ua = inverse(a), ub = inverse(b)
  const u = lerp(ua, ub, t)
  const gap = (v, k) => [(v.painting.x - v.camera.position[0]) * k, (v.painting.y - v.camera.position[1]) * k]
  const ga = gap(a, ua), gb = gap(b, ub)
  const x = view.painting.x - lerp(ga[0], gb[0], t) / u
  const y = view.painting.y - lerp(ga[1], gb[1], t) / u
  return { ...view.camera, position: [x, y, face + 1 / u], target: [x, y, view.camera.target[2]] }
}

/* Passage de la pièce au mur de face : la pièce reste entière pendant le trajet (la femme et les
   meubles sortent du cadre par le mouvement, jamais en fantômes : retour de Walid sur la version 24),
   et ne se fond qu'à la fin du retour, quand le tableau remplit le cadre, ou au début de l'aller, sur
   SWITCH de l'étape (250 ms sur 1 s). La lumière et l'ombre du tableau la suivent (scene.js). */
export const SWITCH = 0.25
function roomShare(a, b, raw) {
  const s = a.room > b.room ? smooth((raw - 1 + SWITCH) / SWITCH) : smooth(raw / SWITCH)
  return { room: lerp(a.room, b.room, s), poses: (a.room > b.room ? a : b).poses }
}

// Vue intermédiaire. Un tableau encore tourné ne doit pas traverser le mur en revenant. raw : la part
// du temps de l'étape (t est sa courbe).
function mix(a, b, t, raw = t) {
  const view = { ...blend(a, b, t), shot: t < 1 ? a.shot : b.shot }
  if (a.room !== b.room) Object.assign(view, roomShare(a, b, raw))
  view.painting.z = Math.max(view.painting.z, -lowestCorner(view.painting))
  if (frontal(a.camera) && frontal(b.camera) && a.camera.fovY === b.camera.fovY) view.camera = frontCamera(a, b, view, t)
  // Une cote qui change de côté du tableau s'efface puis réapparaît : elle ne traverse pas l'œuvre.
  if (a.dims.under !== b.dims.under) {
    const side = t < 0.5 ? a : b
    view.dims = { ...side.dims, opacity: side.dims.opacity * Math.max(0, 2 * Math.abs(1 - 2 * t) - 1) }
  }
  return view
}

// Même vue, l'angle ramené au plus court : la suite ne déroule pas le tour à l'envers.
function unwound(view) {
  const { yaw } = view.painting
  return { ...view, painting: { ...view.painting, yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)) } }
}

// Tourne la caméra autour du point visé (yaw vers la droite, pitch vers le haut). La vue garde
// l'inclinaison appliquée (tilt) : la page n'y voit pas un changement de plan (chips, faceOf).
function withTilt(view, yaw, pitch) {
  const { position, target } = view.camera
  const v = position.map((c, i) => c - target[i])
  const r = Math.hypot(...v)
  const baseYaw = Math.atan2(v[0], v[2])
  const basePitch = Math.asin(v[1] / r)
  const camera = { ...view.camera, position: orbit(target, baseYaw + yaw, basePitch + pitch, r) }
  return { ...view, camera, tilt: { yaw, pitch } }
}

/* reducedMotion : préférence « animations réduites » du visiteur. Les choix coupent alors
   directement sur leur plan et l'inclinaison revient de face d'un coup. */
export function createDirector({ room, product, poses = null, reducedMotion = false }) {
  // Avec les poses, la taille se met en scène avec la femme, et la cote de hauteur passe à gauche
  // dans tous les plans (elle ne se voit qu'avec la pièce) : elle ne traverse jamais l'œuvre.
  const stage = poses ? { ...room, poses } : room
  // Hors de la pièce, aucune pose : une part nulle pour chacune, pour que les fondus restent continus.
  const noPoses = poses ? poses.sizes.map(() => 0) : NO_POSES
  const leftDims = (shot) => (...args) => {
    const view = shot(...args)
    return {
      ...view,
      dims: dimsOf(view.painting, view.dims.opacity, view.dims.under, -1),
      poses: view.poses.length ? view.poses : noPoses,
    }
  }
  const shots = poses
    ? Object.fromEntries(Object.entries({ ...SHOTS, room: poseShot }).map(([name, shot]) => [name, leftDims(shot)]))
    : SHOTS
  // legs : étapes de la transition en cours, jouées l'une après l'autre ; la première
  // part de `from`, la vue figée à l'instant du choix. aspect : la forme que la page donne au
  // directeur ; screen : celle de l'écran réel (la pose ne doit jamais montrer le bord de sa photo) ;
  // inset : le coin en haut à gauche que la page occupe (bouton « De face »), en part de la hauteur
  // (top) et de la largeur (left) de l'écran.
  const state = { product, group: null, shot: 'front', legs: [], from: null, aspect: 0.8, screen: 0.8, inset: NO_INSET, goal: null, reducedMotion }
  // Inclinaison : `held` pendant le glisser, puis `released` décroît selon le ressort. reach : la
  // mesure du geste (TILT), fixée au toucher. calm : le zoom a pris la main (calmTilt), l'inclinaison
  // de cet instant (from) revient de face en TILT_CALM_MS.
  const tilt = { grabbed: false, start: { yaw: 0, pitch: 0 }, held: { yaw: 0, pitch: 0 }, releasedAt: null, reach: TILT.front, calm: null }

  function tiltAt(at) {
    if (tilt.grabbed) return tilt.held
    if (tilt.calm) {
      const k = 1 - glide((at - tilt.calm.at) / TILT_CALM_MS)
      return k > 0 ? { yaw: tilt.calm.from.yaw * k, pitch: tilt.calm.from.pitch * k } : { yaw: 0, pitch: 0 }
    }
    if (tilt.releasedAt === null) return { yaw: 0, pitch: 0 }
    const k = springFactor(at - tilt.releasedAt)
    return { yaw: tilt.held.yaw * k, pitch: tilt.held.pitch * k }
  }

  // goal : la forme de la zone à l'arrivée (la page la fait glisser avec la rangée) ; le plan
  // d'arrivée d'une étape se cadre pour elle, et ne change pas de décision en route.
  function staged(at, aspect, screen, inset, goal = null) {
    let from = state.from
    const g = goal || { aspect, screen, inset }
    for (const leg of state.legs) {
      const to = shots[leg.shot](stage, leg.product || state.product, g.aspect, progressOf(leg, at), g.screen, g.inset)
      if (at < leg.start + leg.duration) {
        const joined = (at - leg.start) / leg.join
        return joined < 1 ? mix(from, to, glide(joined), Math.max(0, joined)) : to
      }
      from = unwound(to)
    }
    return shots[state.shot](stage, state.product, aspect, undefined, screen, inset)
  }

  // Le produit à l'écran : celui d'un acte qui se finit, sinon le dernier choix.
  function shownProduct(at) {
    const finishing = state.legs.find((leg) => leg.product && at < leg.start + leg.duration)
    return finishing ? finishing.product : state.product
  }

  function view(at, aspect, screen = aspect, inset = NO_INSET, goal = null) {
    Object.assign(state, { aspect, screen, inset, goal })
    const base = { ...staged(at, aspect, screen, inset, goal), product: shownProduct(at) }
    const k = 1 - base.room // la photo de la pièce ne s'incline pas
    const offset = tiltAt(at)
    if (k === 0 || (offset.yaw === 0 && offset.pitch === 0)) return { ...base, tilt: NO_TILT }
    return withTilt(base, offset.yaw * k, offset.pitch * k)
  }

  // La mesure du geste se fixe au toucher, pour qu'elle ne change pas sous le doigt : ample de face et
  // au repos, celle d'avant ailleurs (TILT), une transition ou un acte compris.
  function grab(at) {
    tilt.start = tiltAt(at)
    tilt.held = tilt.start
    tilt.grabbed = true
    tilt.calm = null
    tilt.reach = state.shot === 'front' && !isStaging(at) ? TILT.front : TILT.close
  }

  // Repris pendant le rebond d'une inclinaison plus ample que la mesure du geste, le tableau ne saute
  // pas : il garde l'angle déjà là.
  function drag(dx, dy, at) {
    if (!tilt.grabbed) grab(at)
    const { reach, start } = tilt
    tilt.held = {
      yaw: clamp(start.yaw - dx * reach.gainYaw, Math.max(reach.maxYaw, Math.abs(start.yaw))),
      pitch: clamp(start.pitch + dy * reach.gainPitch, Math.max(reach.maxPitch, Math.abs(start.pitch))),
    }
  }

  function release(at) {
    if (!tilt.grabbed) return
    tilt.grabbed = false
    // Un toucher sans glisser (souvent le début d'un défilement) ne lance aucun rebond.
    const moved = tilt.held.yaw !== 0 || tilt.held.pitch !== 0
    tilt.releasedAt = state.reducedMotion || !moved ? null : at
    if (!moved) tilt.held = { yaw: 0, pitch: 0 }
  }

  /* Le zoom prend la main (la page) : l'inclinaison revient de face en TILT_CALM_MS, sans ressort ni
     rebond, pour que la caméra du zoom parte de face. Déjà en route, elle continue. */
  function calmTilt(at) {
    if (tilt.calm && !tilt.grabbed) return
    const from = tiltAt(at)
    tilt.grabbed = false
    tilt.releasedAt = null
    tilt.held = { yaw: 0, pitch: 0 }
    tilt.calm = !state.reducedMotion && (from.yaw !== 0 || from.pitch !== 0) ? { from, at } : null
  }

  function isStaging(at) {
    const last = state.legs[state.legs.length - 1]
    return !!last && at < last.start + last.duration
  }

  function isMoving(at) {
    if (isStaging(at)) return true
    if (tilt.grabbed) return true
    if (tilt.calm && at - tilt.calm.at < TILT_CALM_MS) return true
    return tilt.releasedAt !== null && at - tilt.releasedAt < SPRING_SETTLED_MS
  }

  // Passer à la toile la fait tourner ; passer au poster sans cadre lui soulève un coin, et sous verre,
  // où le papier ne peut pas se soulever, le fait tourner aussi (retour de Walid du 11/11).
  function actOf(group, nextProduct) {
    if (group !== 'material' || state.reducedMotion) return null
    if (nextProduct.material === 'toile') return 'turn'
    return hasFrame(nextProduct) ? 'glazed' : 'curl'
  }

  // L'acte en cours, quand il a rejoint son chemin : il se finira avec le produit qu'il montrait.
  const actUnderway = (at) =>
    state.legs.find((leg) => ACTS[leg.shot] && at >= leg.start + leg.join && at < leg.start + leg.duration)

  function choose(group, nextProduct, at) {
    // Retoucher l'option en cours rejoue sa mise en scène. Pendant qu'elle se joue, le toucher ne
    // compte pas : un double clic ne doit pas la couper.
    const replay = group === state.group && sameProduct(state.product, nextProduct)
    if (replay && isStaging(at)) return
    // Départ figé sans l'inclinaison : celle-ci continue à part, par-dessus la transition.
    const from = unwound(staged(at, state.aspect, state.screen, state.inset, state.goal))
    const act = actOf(group, nextProduct)
    const shot = act ? 'front' : planOf(group, nextProduct, stage)
    const legs = []
    let start = at
    const running = actUnderway(at)
    if (running) {
      const { ms, exit } = ACTS[running.shot]
      const u = progressOf(running, at)
      const end = exit(u)
      // Finir son geste va un peu plus vite ; revenir sur ses pas prend le temps de s'inverser.
      const duration = end > u ? ((end - u) * ms) / HURRY : (u - end) * ms
      if (duration > 0) {
        const product = running.product || state.product
        legs.push({ shot: running.shot, product, start, duration, join: 0, span: [u, end] })
        start += duration
      }
    }
    if (act) {
      legs.push({ shot: act, start, duration: ACTS[act].ms, join: JOIN_MS })
    } else if (!state.reducedMotion) {
      if ((replay || group !== state.group) && state.shot !== 'front' && shot !== 'front') {
        legs.push({ shot: 'front', start, duration: RETURN_MS, join: RETURN_MS })
        start += RETURN_MS
      }
      legs.push({ shot, start, duration: GO_MS, join: GO_MS })
    }
    Object.assign(state, { product: nextProduct, group, shot, legs, from })
  }

  /* Un acte de la matière (la toile qui tourne, le coin du poster, le poster encadré qui tourne) prévu
     ou en cours, jusqu'à son retour de face ; interrompu par un autre choix, il compte jusqu'au bout de
     son chemin. La page efface les légendes pendant ce temps (chips.setSwitching). */
  function isActing(at) {
    return state.legs.some((leg) => ACTS[leg.shot] && at < leg.start + leg.duration)
  }

  // isStaging : une mise en scène ou un acte en cours (le ressort de l'inclinaison n'en est pas une).
  return { view, choose, grab, drag, release, calmTilt, isMoving, isStaging, isActing }
}

/* ==== ZOOM SUR L'ŒUVRE ==== */

/* Le visiteur zoome sur l'œuvre de face (retour de Walid du 11/11, après un essai : « première chose
   qu'il a essayé de faire, c'est de zoomer dessus et de dézoomer »). Le zoom est une couche de la vue,
   comme l'inclinaison : la caméra s'approche du tableau en restant de face (withZoom). Son état et sa
   physique (ancrage sous les doigts, bornes, élastique, élan, retours) sont dans createZoom, en px de
   l'écran ; la page lui passe les gestes. La pièce de détail (tilePlan) apporte, au repos, la vraie
   résolution de la source là où l'on regarde. */

/* Réglages. sourcePx : un pixel de la source s'étale sur 1,5 pixel de l'écran au plus (au-delà, le
   flou se voit) ; floor et ceil : bornes de ce zoom maximal. rubber : raideur de l'élastique (celle
   d'iOS) ; under et over : de combien l'échelle peut passer sous ×1 et au-dessus du maximum, au plus,
   en facteur. glide : décroissance de l'élan (ms) ; spring : raideur du ressort des bords (par ms) ;
   back : retour d'une échelle hors bornes (ms) ; still : un doigt immobile depuis autant de ms ne
   lance rien ; window : les ms du geste qui donnent sa vitesse. zoomed : au-delà de cette échelle,
   l'œuvre est zoomée (un doigt la déplace, l'inclinaison s'arrête, les chips s'effacent) ; en deçà,
   au repos, elle revient exactement à ×1 : jamais entre les deux. toggle : l'échelle du double toucher,
   et tap la durée de son glissé (ms) ; reset : celle du retour à ×1 par le bouton, Échap ou un choix
   (ms) ; settle : une rafale de molette compte comme un mouvement jusqu'à autant de ms après son
   dernier pas. */
export const ZOOM = {
  sourcePx: 1.5, floor: 2, ceil: 4,
  rubber: 0.55, under: 0.6, over: 1.4,
  glide: 325, spring: 0.012, back: 320, still: 60, window: 100,
  zoomed: 1.02, toggle: 2.5, tap: 300, reset: 240, settle: 150,
}

const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/* Le zoom maximal, pour une œuvre et un écran. native : la source ({ width, height }, px) ; art : l'œuvre
   de face à l'écran, en px CSS ({ w, h }) ; dpr : pixels de l'écran par px CSS. */
export function zoomLimit({ native, art, dpr }) {
  if (!native || !(native.width > 0) || !(native.height > 0)) return ZOOM.floor
  const sourcePerDevice = Math.min(native.width / art.w, native.height / art.h) / Math.max(1, dpr)
  return Math.min(ZOOM.ceil, Math.max(ZOOM.floor, ZOOM.sourcePx * sourcePerDevice))
}

/* La couche du zoom sur une vue : la caméra avance vers le point visé, factor fois plus près, et glisse
   de shift (cm, vers sa droite et son haut) sans tourner, l'objectif inchangé. Une vue de face le
   reste : la façade s'y agrandit de factor autour du centre de l'image, comme une photo (sa matière,
   le cadre et le reflet du verre restent ceux d'un tableau que l'on regarde de près). */
export function withZoom(view, factor, [sx, sy]) {
  if (factor === 1 && sx === 0 && sy === 0) return view
  const { position, target } = view.camera
  const back = position.map((c, i) => c - target[i])
  const forward = unit(scale(back, -1))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const aim = add(target, add(scale(right, sx), scale(up, sy)))
  return { ...view, camera: { ...view.camera, position: add(aim, scale(back, 1 / factor)), target: aim } }
}

/* Px de l'image par cm, au point visé d'une vue, pour une image de height px de haut : à ×1 et de face,
   ceux de la façade de l'œuvre (la page y convertit le zoom, en px de l'écran, en cm pour withZoom). */
export function pxPerCm(view, height) {
  const { position, target, fovY } = view.camera
  const distance = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
  return height / 2 / (distance * Math.tan(fovY / 2))
}

/* Le zoom et son geste. Unités : px de l'écran, comptés depuis le centre de l'image de la 3D, où se
   trouve le milieu de l'œuvre de face ; ms. L'état : l'échelle (scale) et le centre (x, y), le point de
   l'œuvre vue à ×1 qui se trouve au centre de l'image : un point vu en u à ×1 se voit alors en
   scale × (u − centre). À ×1, le centre est (0, 0).
   frame : la mise en page, à redonner quand elle change. half : demi-largeur et demi-hauteur de l'œuvre
   à ×1 ; view : l'écran utile (left, top, right, bottom) ; max : le zoom maximal (zoomLimit).
   Geste : grab(x, y, écart, at) quand le nombre de doigts change (x, y : leur milieu ; écart : leur
   distance, 0 pour un seul doigt), drag(x, y, écart, at) quand ils bougent, release(at) quand ils sont
   tous levés. Le point de l'œuvre sous leur milieu y reste, tant que l'œuvre couvre l'écran ; au-delà
   de ses bords, sous ×1 ou au-dessus du maximum, elle résiste (élastique), puis revient en place. Lâchée
   en mouvement, elle file sur son élan et rebondit sur ses bords.
   Rien n'est alloué pendant le geste : la page l'appelle à chaque mouvement du doigt.
   reducedMotion : préférence « animations réduites » du visiteur ; le zoom suit toujours les doigts,
   mais double toucher, retours et élan sont immédiats. */
export function createZoom({ reducedMotion = false } = {}) {
  const layout = { half: [1, 1], view: { left: -1, top: -1, right: 1, bottom: 1 }, max: ZOOM.floor }
  const shown = { scale: 1, x: 0, y: 0 } // ce que rend at() : un seul objet, réécrit
  /* Le geste en cours, sans élastique (raw) : le point de ×1 sous les doigts (under), le logarithme de
     l'échelle et l'écart des doigts au toucher. last : leur dernier milieu. */
  const hold = { active: false, under: [0, 0], log: 0, spread: 0, last: [0, 0] }
  const range = [0, 0] // bornes d'un axe, réécrites (bounds)
  // Les derniers milieux des doigts (instant, x, y), pour la vitesse au lâcher : un anneau.
  const SAMPLES = 8
  const samples = new Float64Array(SAMPLES * 3)
  let sampleCount = 0
  /* Le mouvement en cours, doigts levés : null, un glissé vers un état (glide), ou l'élan d'un axe et
     de l'autre (fling). Chacun est une fonction du temps : at() peut être appelé pour n'importe quel
     instant. quietUntil : la fin de la rafale de molette en cours (ZOOM.settle après son dernier pas). */
  let motion = null
  let quietUntil = -Infinity

  function frame({ half, view, max }) {
    layout.half = half
    layout.view = view
    layout.max = max
  }

  /* Les centres permis sur un axe (0 : x, 1 : y), à l'échelle s, dans range. Une œuvre plus grande que
     l'écran le couvre : ses bords ne rentrent jamais. Plus petite, elle ne bouge pas : son milieu va de
     sa place de face, à ×1, au milieu de l'écran, quand elle l'atteint. */
  function bounds(axis, s) {
    const h = layout.half[axis]
    const v0 = axis ? layout.view.top : layout.view.left
    const v1 = axis ? layout.view.bottom : layout.view.right
    const span = v1 - v0
    if (2 * s * h >= span) {
      range[0] = -v0 / s - h
      range[1] = h - v1 / s
      return range
    }
    const t = span > 2 * h ? clampTo((2 * h * (s - 1)) / (span - 2 * h), 0, 1) : 1
    range[0] = range[1] = 0 - (t * (v0 + v1)) / (2 * s) // 0 − … : jamais −0 à sa place de face
    return range
  }

  const viewSpan = (axis) => (axis ? layout.view.bottom - layout.view.top : layout.view.right - layout.view.left)

  // L'élastique : un dépassement e se voit d × (1 − 1 / (1 + 0,55 e / d)), jamais plus que d.
  const rubber = (e, d) => d * (1 - 1 / (1 + (ZOOM.rubber * e) / d))
  const unrubber = (r, d) => (d * Math.min(r, d * 0.999)) / (ZOOM.rubber * (d - Math.min(r, d * 0.999)))

  // Logarithme de l'échelle : borné entre 0 (×1) et celui du maximum, élastique au-delà.
  const logMax = () => Math.log(layout.max)
  const LOG_UNDER = -Math.log(ZOOM.under)
  const LOG_OVER = Math.log(ZOOM.over)
  function elasticLog(log) {
    if (log < 0) return -rubber(-log, LOG_UNDER)
    if (log > logMax()) return logMax() + rubber(log - logMax(), LOG_OVER)
    return log
  }
  function rawLog(log) {
    if (log < 0) return -unrubber(-log, LOG_UNDER)
    if (log > logMax()) return logMax() + unrubber(log - logMax(), LOG_OVER)
    return log
  }

  // Le centre sur un axe, élastique hors de ses bornes (le dépassement compté en px de l'écran).
  function elasticCenter(axis, c, s) {
    const [lo, hi] = bounds(axis, s)
    if (c < lo) return lo - rubber(s * (lo - c), viewSpan(axis)) / s
    if (c > hi) return hi + rubber(s * (c - hi), viewSpan(axis)) / s
    return c
  }
  function rawCenter(axis, c, s) {
    const [lo, hi] = bounds(axis, s)
    if (c < lo) return lo - unrubber(s * (lo - c), viewSpan(axis)) / s
    if (c > hi) return hi + unrubber(s * (c - hi), viewSpan(axis)) / s
    return c
  }
  const clampCenter = (axis, c, s) => {
    const [lo, hi] = bounds(axis, s)
    return clampTo(c, lo, hi)
  }
  /* Le centre d'un axe quand l'échelle passe de s à s1, le point de l'écran p (px depuis le centre de
     l'image) gardé fixe autant que les bords le permettent. */
  const keepPoint = (axis, c, p, s, s1) => clampCenter(axis, c + p / s - p / s1, s1)
  // L'échelle permise au repos : entre ×1 et le maximum, et ×1 exactement en deçà de ZOOM.zoomed.
  const restScale = (s) => {
    const bounded = clampTo(s, 1, layout.max)
    return bounded < ZOOM.zoomed ? 1 : bounded
  }

  function sample(at, x, y) {
    const i = (sampleCount % SAMPLES) * 3
    samples[i] = at
    samples[i + 1] = x
    samples[i + 2] = y
    sampleCount += 1
  }

  // Vitesse des doigts au lâcher (px par ms), sur leurs dernières ms ; nulle s'ils s'étaient arrêtés.
  function velocity(at, axis) {
    if (sampleCount < 2) return 0
    const newest = ((sampleCount - 1) % SAMPLES) * 3
    if (at - samples[newest] > ZOOM.still) return 0
    let oldest = newest
    for (let k = 1; k < Math.min(sampleCount, SAMPLES); k++) {
      const i = ((sampleCount - 1 - k) % SAMPLES) * 3
      if (samples[newest] - samples[i] > ZOOM.window) break
      oldest = i
    }
    const dt = samples[newest] - samples[oldest]
    return dt >= 8 ? (samples[newest + 1 + axis] - samples[oldest + 1 + axis]) / dt : 0
  }

  // Les doigts se posent, ou leur nombre change : l'état affiché devient le point de départ.
  function grab(x, y, spread, at) {
    settle(at)
    motion = null
    hold.active = true
    const s = shown.scale
    hold.log = rawLog(Math.log(s))
    hold.under[0] = rawCenter(0, shown.x, s) + x / s
    hold.under[1] = rawCenter(1, shown.y, s) + y / s
    hold.spread = spread
    hold.last[0] = x
    hold.last[1] = y
    sampleCount = 0
    sample(at, x, y)
  }

  function drag(x, y, spread, at) {
    if (!hold.active) return
    const log = hold.spread > 0 && spread > 0 ? hold.log + Math.log(spread / hold.spread) : hold.log
    const s = Math.exp(elasticLog(log))
    shown.scale = s
    shown.x = elasticCenter(0, hold.under[0] - x / s, s)
    shown.y = elasticCenter(1, hold.under[1] - y / s, s)
    hold.last[0] = x
    hold.last[1] = y
    sample(at, x, y)
  }

  /* Doigts levés. Une échelle hors bornes revient à la borne (à ×1 sous ×1,02), le point sous les doigts
     gardé autant que possible ; sinon l'œuvre file sur son élan, et revient sur ses bords si elle les a
     passés. */
  function release(at) {
    if (!hold.active) return
    hold.active = false
    const s = shown.scale
    const target = restScale(s)
    if (Math.abs(target - s) > 1e-6) {
      const [mx, my] = hold.last
      glideTo(target, keepPoint(0, shown.x, mx, s, target), keepPoint(1, shown.y, my, s, target), at, ZOOM.back)
      return
    }
    motion = { kind: 'fling', t0: at, scale: s, axes: [flingOf(0, s, velocity(at, 0)), flingOf(1, s, velocity(at, 1))] }
    motion.end = at + Math.max(motion.axes[0].ms, motion.axes[1].ms)
    if (reducedMotion) {
      // Ni élan ni rebond : l'œuvre se cale tout de suite dans ses bornes.
      for (const f of motion.axes) f.target = clampTo(f.c0, f.lo, f.hi)
      motion.end = at
    }
  }

  /* L'élan d'un axe, lâché à la vitesse v (px de l'écran par ms) : il décroît (glide) ; s'il doit passer
     un bord, il l'atteint puis un ressort amorti l'y ramène. Un centre déjà hors bornes y revient. */
  function flingOf(axis, s, v) {
    const c0 = axis ? shown.y : shown.x
    const [lo, hi] = bounds(axis, s)
    // Le centre va à l'envers du contenu, en px de ×1 ; une œuvre qui ne peut pas bouger sur cet axe
    // (plus petite que l'écran) n'y prend pas d'élan.
    const vc = hi - lo > 1e-9 ? -v / s : 0
    const tau = ZOOM.glide
    const fling = { c0, vc, lo, hi, hit: Infinity, from: c0, vHit: 0, target: c0, ms: 0 }
    if (c0 < lo || c0 > hi) {
      fling.hit = 0
      fling.target = clampTo(c0, lo, hi)
      fling.vHit = vc
      fling.ms = springMs(c0 - fling.target, vc, s)
      return fling
    }
    const end = c0 + vc * tau
    if (end >= lo && end <= hi) {
      // Il finit où il tend, quand il ne reste qu'un vingtième de pixel à parcourir.
      fling.target = end
      fling.ms = Math.max(0, tau * Math.log((Math.abs(vc) * tau * s) / 0.05))
      return fling
    }
    const edge = end > hi ? hi : lo
    const q = (edge - c0) / (vc * tau)
    fling.hit = -tau * Math.log(1 - q)
    fling.from = edge
    fling.target = edge
    fling.vHit = vc * (1 - q)
    fling.ms = fling.hit + springMs(0, fling.vHit, s)
    return fling
  }

  // Ressort amorti au plus juste, de l'écart a et de la vitesse v : le temps qu'il reste sous 0,05 px.
  function springMs(a, v, s) {
    const w = ZOOM.spring
    const size = (Math.abs(a) + Math.abs(v + w * a) / w) * s
    return size > 0.05 ? (Math.log(size / 0.05) + 1.5) / w : 0
  }

  function flingAt(f, t) {
    if (t < f.hit) return f.c0 + f.vc * ZOOM.glide * (1 - Math.exp(-t / ZOOM.glide))
    const w = ZOOM.spring
    const u = t - f.hit
    const a = f.from - f.target
    return f.target + (a + (f.vHit + w * a) * u) * Math.exp(-w * u)
  }

  /* Glissé vers (s1, x1, y1) en ms, ralenti à l'arrivée. Quand l'échelle change, un point de l'écran
     reste fixe (celui que les deux états y mettent) : l'œuvre grandit ou rapetisse autour de lui, sans
     dériver. */
  function glideTo(s1, x1, y1, at, duration) {
    const ms = reducedMotion ? 0 : duration
    const s0 = shown.scale
    const ratio = s1 / s0
    const fixed = Math.abs(1 - ratio) > 1e-3
    motion = {
      kind: 'glide', t0: at, end: at + ms, ms, s0, s1,
      from: [shown.x, shown.y], to: [x1, y1], under: [0, 0], fixed: [0, 0], scaled: fixed,
    }
    if (fixed) {
      for (const axis of [0, 1]) {
        const c0 = motion.from[axis], c1 = motion.to[axis]
        motion.fixed[axis] = (s1 * (c0 - c1)) / (1 - ratio)
        motion.under[axis] = c0 + motion.fixed[axis] / s0
      }
    }
  }

  const easeOut = (t) => 1 - (1 - t) ** 3

  // Fait avancer l'état affiché jusqu'à l'instant `now` ; fige le mouvement fini.
  function settle(now) {
    if (!motion) return
    const t = now - motion.t0
    if (motion.kind === 'glide') {
      const k = motion.ms > 0 ? easeOut(Math.min(1, Math.max(0, t / motion.ms))) : 1
      const s = motion.s0 * (motion.s1 / motion.s0) ** k
      shown.scale = s
      for (const axis of [0, 1]) {
        const c = motion.scaled ? motion.under[axis] - motion.fixed[axis] / s : motion.from[axis] + (motion.to[axis] - motion.from[axis]) * k
        if (axis) shown.y = c
        else shown.x = c
      }
      if (k >= 1) {
        Object.assign(shown, { scale: motion.s1, x: motion.to[0], y: motion.to[1] })
        motion = null
      }
      return
    }
    const done = now >= motion.end
    shown.scale = motion.scale
    shown.x = done ? motion.axes[0].target : flingAt(motion.axes[0], t)
    shown.y = done ? motion.axes[1].target : flingAt(motion.axes[1], t)
    if (done) motion = null
  }

  function at(now) {
    if (!hold.active) settle(now)
    return shown
  }

  const isMoving = (now) => hold.active || (!!motion && now < motion.end) || now < quietUntil
  // Zoomée (un doigt la déplace, la molette la zoome) ; loin de sa place de face (zoomée ou rapetissée).
  const isZoomed = (now) => at(now).scale > ZOOM.zoomed
  const isAway = (now) => Math.abs(at(now).scale - 1) > ZOOM.zoomed - 1

  /* Où l'œuvre va se poser : la fin du glissé ou de l'élan en cours, sinon l'état affiché ; null tant que
     des doigts la tiennent. La page y demande la pièce de détail pendant le mouvement. */
  const landed = { scale: 1, x: 0, y: 0 }
  function landing() {
    if (hold.active) return null
    if (!motion) return shown
    if (motion.kind === 'glide') return Object.assign(landed, { scale: motion.s1, x: motion.to[0], y: motion.to[1] })
    return Object.assign(landed, { scale: motion.scale, x: motion.axes[0].target, y: motion.axes[1].target })
  }

  // Vers l'échelle s1, le point de l'écran (x, y) gardé autant que les bords le permettent.
  function zoomAround(s1, x, y, at, ms) {
    const s = shown.scale
    glideTo(s1, keepPoint(0, shown.x, x, s, s1), keepPoint(1, shown.y, y, s, s1), at, ms)
  }

  // Double toucher (ou double clic) en (x, y) : vers ×2,5 (ou le maximum), ou retour à ×1.
  function toggle(x, y, at) {
    settle(at)
    hold.active = false
    if (shown.scale > ZOOM.zoomed) zoomAround(1, x, y, at, ZOOM.tap)
    else zoomAround(Math.min(ZOOM.toggle, layout.max), x, y, at, ZOOM.tap)
  }

  // Retour à ×1, en ms (0 : d'un coup).
  function reset(at, ms = ZOOM.reset) {
    settle(at)
    hold.active = false
    zoomAround(1, 0, 0, at, ms)
  }

  /* Molette ou pincement du pavé tactile : l'échelle multipliée par factor sous le pointeur (x, y),
     entre ×1 et le maximum (×1 exactement sous ×1,02), sans élastique (aucun doigt à lâcher). ms : un cran
     de souris glisse ; un cran qui arrive pendant le glissé du précédent part de l'arrivée de celui-ci.
     La rafale reste un mouvement jusqu'à ZOOM.settle après son dernier pas. Rend l'échelle visée. */
  function wheel(factor, x, y, at, ms = 0) {
    settle(at)
    if (hold.active) return shown.scale
    const going = motion && motion.kind === 'glide' && motion.wheel && at < motion.end
    const from = going ? { scale: motion.s1, x: motion.to[0], y: motion.to[1] } : shown
    const s1 = restScale(from.scale * factor)
    const x1 = keepPoint(0, from.x, x, from.scale, s1)
    const y1 = keepPoint(1, from.y, y, from.scale, s1)
    quietUntil = at + ZOOM.settle
    if (ms > 0) {
      glideTo(s1, x1, y1, at, ms)
      motion.wheel = true
      return s1
    }
    motion = null
    shown.scale = s1
    shown.x = x1
    shown.y = y1
    return s1
  }

  return { frame, grab, drag, release, toggle, reset, wheel, at, isMoving, isZoomed, isAway, landing }
}

/* La pièce de détail : zoomée et au repos, la région de la source que l'on regarde, recadrée par le CDN
   de Shopify, à la résolution de l'écran et jamais au-delà de la source. Le moteur la pose sur l'œuvre
   par-dessus l'image en place (showTile). Réglages : margin, la marge autour de la vue, en part de sa
   taille de chaque côté ; grid, le pas de la grille où se calent ses bords (en part du petit côté de
   la vue, arrondi à une puissance de 2, au moins minGrid px de la source) : deux vues voisines
   demandent la même pièce, que le CDN garde en cache ; slack : une résolution à 5 % près suffit. Sa
   résolution va par paliers de √2. */
export const TILE = { margin: 0.25, grid: 0.125, minGrid: 32, slack: 0.95 }

// Le plus petit palier de √2 (1, 0,71, 0,5…) qui donne au moins 95 % de la résolution voulue.
const tileStep = (want) => Math.min(1, 2 ** (Math.ceil(2 * Math.log2(TILE.slack * want)) / 2))

/* visible : la région de l'image que l'on voit, en coordonnées d'image (u0, v0, u1, v1 ; 0 à 1, origine
   en haut à gauche ; elle peut déborder). native : la source ({ width, height }, px). density : les px
   du canvas par px de la source, à ce zoom. base : l'image en place ({ width }). maxSide : la plus grande
   texture permise ; maxPixels : le budget de mémoire. Rend null si l'image en place suffit, sinon la
   pièce : sa région de la source (left, top, width, height, px), sa taille (out), son rectangle en
   coordonnées d'image (rect) et sa résolution (scale, px de la pièce par px de la source). */
export function tilePlan({ visible, native, density, base, maxSide, maxPixels }) {
  const W = native.width, H = native.height
  const want = Math.min(1, density)
  if (base && base.width >= TILE.slack * want * W) return null
  const x0 = clampTo(visible.u0 * W, 0, W), x1 = clampTo(visible.u1 * W, 0, W)
  const y0 = clampTo(visible.v0 * H, 0, H), y1 = clampTo(visible.v1 * H, 0, H)
  if (x1 - x0 < 1 || y1 - y0 < 1) return null
  const grid = 2 ** Math.floor(Math.log2(Math.max(TILE.minGrid, TILE.grid * Math.min(x1 - x0, y1 - y0))))
  const region = (margin) => {
    const mx = margin * (x1 - x0), my = margin * (y1 - y0)
    const left = Math.max(0, Math.floor((x0 - mx) / grid) * grid)
    const top = Math.max(0, Math.floor((y0 - my) / grid) * grid)
    return {
      left, top,
      width: Math.min(W, Math.ceil((x1 + mx) / grid) * grid) - left,
      height: Math.min(H, Math.ceil((y1 + my) / grid) * grid) - top,
    }
  }
  let scale = tileStep(want)
  let r = region(TILE.margin)
  const fits = (box, k) => box.width * box.height * k * k <= maxPixels && Math.max(box.width, box.height) * k <= maxSide
  if (!fits(r, scale)) r = region(0)
  if (!fits(r, scale)) {
    const room = Math.min(Math.sqrt(maxPixels / (r.width * r.height)), maxSide / Math.max(r.width, r.height))
    scale = Math.floor(room * 1024) / 1024
  }
  return {
    ...r,
    out: { width: Math.round(r.width * scale), height: Math.round(r.height * scale) },
    rect: [r.left / W, r.top / H, (r.left + r.width) / W, (r.top + r.height) / H],
    scale,
  }
}

/* Le contour blanc du poster : une marge de papier égale en cm (PASSE_RATIO du petit côté), et l'œuvre
   recadrée pour remplir l'intérieur sans se déformer. margin et cover : en part de la feuille et de
   l'image (le shader de l'œuvre, uMargin et uCover). */
function passeCrop(width, height, imageRatio) {
  const m = PASSE_RATIO * Math.min(width, height)
  const inner = (width - 2 * m) / (height - 2 * m)
  return {
    margin: [m / width, m / height],
    cover: inner < imageRatio ? [inner / imageRatio, 1] : [1, imageRatio / inner],
  }
}

/* La région de l'image que l'on voit, d'après celle de la façade : box = [x0, y0, x1, y1], en cm depuis
   le milieu de l'œuvre, y vers le haut. Les coordonnées de la façade sont celles d'artBox (la bordure
   pliée en montre le milieu), recadrées comme le fait le shader sous le contour blanc. imageRatio :
   largeur sur hauteur de l'image. Rend { u0, v0, u1, v1 }, origine en haut à gauche. */
export function visibleImage(p, border, imageRatio, [x0, y0, x1, y1]) {
  const fold = border === 'pliee' ? p.depth : 0
  const u = (x) => (x + p.width / 2 + fold) / (p.width + 2 * fold)
  const v = (y) => 1 - (y + p.height / 2 + fold) / (p.height + 2 * fold)
  const rect = { u0: u(x0), v0: v(y1), u1: u(x1), v1: v(y0) }
  if (!(p.paper >= 0.999 && p.passe >= 0.999)) return rect
  const { margin, cover } = passeCrop(p.width, p.height, imageRatio)
  const crop = (t, axis) => ((t - margin[axis]) / (1 - 2 * margin[axis]) - 0.5) * cover[axis] + 0.5
  return { u0: crop(rect.u0, 0), v0: crop(rect.v0, 1), u1: crop(rect.u1, 0), v1: crop(rect.v1, 1) }
}

// La bordure que montre la tranche : celle du produit, ou le papier nu d'une feuille de poster arrivée.
export const borderShown = (p, product) => (p.paper >= 0.999 ? 'papier' : product.border)

/* Ce que l'on voit de l'image au zoom : zoom, l'état de createZoom ; view, l'écran utile (px depuis le
   centre de l'image) ; k, ses px par cm de la façade à ×1 (pxPerCm) ; density, les px du canvas par px
   CSS. Rend la région vue de l'image (visibleImage) et les px du canvas par px de la source. */
export function zoomRegion({ zoom, view, k, painting, border, native, density }) {
  const s = zoom.scale
  const box = [(zoom.x + view.left / s) / k, -(zoom.y + view.bottom / s) / k, (zoom.x + view.right / s) / k, -(zoom.y + view.top / s) / k]
  const visible = visibleImage(painting, border, native.width / native.height, box)
  return { visible, density: ((view.right - view.left) * density) / ((visible.u1 - visible.u0) * native.width) }
}

/* La pièce en place sert-elle encore cette vue : la couvre-t-elle, assez finement ? Ou aussi finement
   que la pièce qu'on demanderait (plan, celle de tilePlan pour cette vue) : plafonnée par le budget de
   mémoire, une pièce n'est pas redemandée en boucle. */
export function tileServes(tile, visible, density, plan = null) {
  if (!tile) return false
  const [u0, v0, u1, v1] = tile.rect
  const e = 1e-6
  const covers = clampTo(visible.u0, 0, 1) >= u0 - e && clampTo(visible.u1, 0, 1) <= u1 + e &&
    clampTo(visible.v0, 0, 1) >= v0 - e && clampTo(visible.v1, 0, 1) <= v1 + e
  return covers && (tile.scale >= TILE.slack * Math.min(1, density) - e || (!!plan && tile.scale >= plan.scale - e))
}

/* ==== RELIEFS ==== */

/* Reliefs procéduraux (calcul pur, sans DOM : ils tournent dans un worker, hors du fil de la page).
   Trame de la toile et grain du papier : hauteur dans R, normale (x, y) dans G et B. */

export const RELIEF_SIZE = 256
export const WEAVE_TILE_CM = 32 / 7 // 32 fils par tuile, posés à 7 fils par cm
export const PAPER_TILE_CM = 6

// Bruit de valeur répétable (périodes px, py).
function hash(ix, iy, px, py) {
  ix = ((ix % px) + px) % px
  iy = ((iy % py) + py) % py
  let h = (ix * 374761393 + iy * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

export function noise(x, y, px, py) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, px, py) + (hash(ix + 1, iy, px, py) - hash(ix, iy, px, py)) * sx
  const b = hash(ix, iy + 1, px, py) + (hash(ix + 1, iy + 1, px, py) - hash(ix, iy + 1, px, py)) * sx
  return a + (b - a) * sy
}

export function fbm(u, v, cu, cv, octaves) {
  let s = 0, amp = 0.5, a = cu, b = cv
  for (let o = 0; o < octaves; o++) {
    s += amp * noise(u * a, v * b, a, b)
    a *= 2
    b *= 2
    amp *= 0.5
  }
  return s
}

// Carte de relief RGBA (hauteur + normale) à partir d'une fonction de hauteur.
function reliefPixels(heightAt, strength) {
  const size = RELIEF_SIZE
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = heightAt(x, y)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      pixels[i] = Math.round(at(x, y) * 255)
      pixels[i + 1] = Math.round((0.5 - (0.5 * dx) / len) * 255)
      pixels[i + 2] = Math.round((0.5 - (0.5 * dy) / len) * 255)
      pixels[i + 3] = 255
    }
  }
  return pixels
}

// Toile : armure toile (un fil dessus, un fil dessous), fils légèrement irréguliers.
export function weavePixels() {
  const T = 8 // pixels par fil
  const slub = (i) => 0.88 + 0.12 * hash(i, 7, 32, 32)
  return reliefPixels((x, y) => {
    const ix = Math.floor(x / T), iy = Math.floor(y / T)
    const fx = ((x % T) + 0.5) / T, fy = ((y % T) + 0.5) / T
    const warpOver = ((ix + iy) & 1) === 0
    const warp = Math.sin(Math.PI * fx) * slub(ix) * (warpOver ? 1 : 0.55) * (0.8 + 0.2 * Math.sin(Math.PI * fy))
    const weft = Math.sin(Math.PI * fy) * slub(iy + 40) * (warpOver ? 0.55 : 1) * (0.8 + 0.2 * Math.sin(Math.PI * fx))
    const fibre = (hash(x, y, RELIEF_SIZE, RELIEF_SIZE) - 0.5) * 0.06
    return Math.min(1, Math.max(0, 0.22 + 0.74 * Math.max(warp, weft) + fibre))
  }, 2.2)
}

// Papier mat : grain fin et fibres à peine visibles.
export function paperPixels() {
  return reliefPixels((x, y) => {
    const u = x / RELIEF_SIZE, v = y / RELIEF_SIZE
    return 0.6 + 0.3 * (fbm(u, v, 48, 48, 3) - 0.5) + 0.25 * (fbm(u, v, 8, 64, 2) - 0.5)
  }, 1.2)
}

const SILENT_WORKER_MS = 3000 // un worker muet ne doit pas priver de 3D
const PAPER_DELAY_MS = 1500

/* Reliefs calculés dans un worker, en parallèle du chargement de three.js. Ce fichier est son propre
   worker (voir la fin du fichier) : pas d'autre asset à versionner. Sans worker, la trame est
   calculée ici et le papier attend que la page soit posée. Renvoie deux promesses de pixels et de quoi
   arrêter le calcul : { weave, paper, stop }. */
export function startReliefs() {
  const done = {}
  let worker = null
  let silent = 0
  let paperTimer = 0
  const reliefs = {
    weave: new Promise((resolve) => { done.weave = resolve }),
    paper: new Promise((resolve) => { done.paper = resolve }),
    stop() {
      clearTimeout(silent)
      clearTimeout(paperTimer)
      if (worker) worker.terminate()
    },
  }
  let inPageStarted = false
  const inPage = () => {
    if (inPageStarted) return
    inPageStarted = true
    done.weave(weavePixels())
    paperTimer = setTimeout(() => done.paper(paperPixels()), PAPER_DELAY_MS)
  }
  try {
    worker = new Worker(import.meta.url, { type: 'module' })
    silent = setTimeout(inPage, SILENT_WORKER_MS)
    worker.onmessage = ({ data }) => {
      clearTimeout(silent)
      done[data.name](data.pixels)
      if (data.name === 'paper') worker.terminate()
    }
    worker.onerror = () => {
      clearTimeout(silent)
      inPage()
    }
  } catch {
    inPage()
  }
  return reliefs
}

/* ==== QUALITÉ ==== */

/* La densité est le nombre de pixels du tampon par pixel CSS. Sous la densité de l'écran, c'est
   l'écran qui agrandit l'image : bords et œuvre s'amollissent. */

const MAX_DENSITY = 3 // au-delà, le gain ne se voit plus
const BASE_DENSITY = 2 // toujours permise, quelle que soit la taille de la scène
const EXTRA_PIXELS = 2.6e6 // au-delà de 2, seulement sous ce budget (téléphone en densité 3 : 1,7 million)
const MIN_DENSITY = 1.5
const FRAME_BUDGET_MS = 18 // coût mesuré d'une image, attente du GPU comprise

export function renderDensity({ dpr, width, height }) {
  const extra = Math.sqrt(EXTRA_PIXELS / (width * height))
  return Math.min(dpr, MAX_DENSITY, Math.max(BASE_DENSITY, extra))
}

/* Calibrage, une fois, avant la première animation : si une image coûte trop cher sur cet
   appareil, on retire ce qu'il faut de pixels pour tenir dans le budget. */
export function densityForCost(density, frameMs) {
  if (frameMs <= FRAME_BUDGET_MS) return density
  return Math.min(density, Math.max(MIN_DENSITY, density * Math.sqrt(FRAME_BUDGET_MS / frameMs)))
}

const SLOW_FRAME_MS = 1000 / 24 // sous 24 images par seconde, la fiche reste sur les photos
const RUN_MIN_FRAMES = 20 // en deçà, une animation ne dit rien de l'appareil

// Une fois la densité baissée (fittedDensity), une image coûte-t-elle encore trop cher ?
export function isTooSlow(density, frameMs, fittedDensity) {
  return frameMs * (fittedDensity / density) ** 2 > SLOW_FRAME_MS
}

/* times : instants des images d'une animation. L'écart médian, et non la moyenne : une pause isolée
   (onglet masqué, appel reçu) n'a rien à voir avec la force de l'appareil. */
export function isSluggishRun(times) {
  if (times.length < RUN_MIN_FRAMES) return false
  const gaps = times.slice(1).map((time, i) => time - times[i]).sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)] > SLOW_FRAME_MS
}

/* ==== IMAGES ==== */

/* Images décodées hors du fil de la page. Par un ImageBitmap, l'envoi au GPU est 6 fois plus court
   que par un <img> (27 ms contre 178 ms pour 1904 × 2544 px) et ne bloque presque rien. Les deux
   chemins donnent une image à l'endroit : les textures ne sont jamais retournées (voir artBox), car
   l'option de retournement n'est pas suivie partout. */

function viaElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = async () => {
      await Promise.race([image.decode().catch(() => {}), new Promise((done) => setTimeout(done, 300))])
      resolve(image)
    }
    image.onerror = reject
    image.src = url
  })
}

/* Le CDN de Shopify choisit le format d'après cet en-tête, comme pour un <img>. Sans lui, fetch reçoit
   le fichier d'origine : pour le Bonsaï, un PNG de 8 Mo au lieu d'un WebP de 840 Ko. */
const LIGHT_IMAGES = { accept: 'image/avif,image/webp,image/*;q=0.8' }

// source : adresse d'une image, ou <img> déjà chargée (rien n'est retéléchargé). options : celles
// de createImageBitmap (un calque détouré garde son alpha non prémultiplié).
export async function decodeImage(source, options) {
  const loaded = typeof source !== 'string'
  if (!('createImageBitmap' in globalThis)) return loaded ? source : viaElement(source)
  try {
    if (loaded) return await createImageBitmap(source, options)
    const response = await fetch(source, { headers: LIGHT_IMAGES })
    return await createImageBitmap(await response.blob(), options)
  } catch {
    return loaded ? source : viaElement(source)
  }
}

// Un ImageBitmap garde sa mémoire tant qu'on ne le ferme pas ; un <img> n'a rien à fermer.
export function closeImage(image) {
  if (image.close) image.close()
}

/* L'adresse d'une pièce de détail (tilePlan) : la source (adresse absolue de image_url, sans taille),
   recadrée et réduite par le CDN de Shopify, qui n'agrandit jamais. Le format suit l'en-tête Accept de
   loadTile : WebP ou AVIF, 70 Ko pour 512 × 512 px du Bonsaï (le PNG d'origine en pèserait 375). */
export function tileUrl(source, plan) {
  const url = new URL(source)
  url.searchParams.delete('width')
  url.searchParams.delete('height')
  url.searchParams.set('crop', 'region')
  url.searchParams.set('crop_left', String(plan.left))
  url.searchParams.set('crop_top', String(plan.top))
  url.searchParams.set('crop_width', String(plan.width))
  url.searchParams.set('crop_height', String(plan.height))
  url.searchParams.set('width', String(plan.out.width))
  return url.href
}

/* Une pièce de détail : téléchargée (signal l'abandonne), décodée hors du fil de la page. Rend l'image
   et son poids en octets. Pas decodeImage : une pièce refusée (429 du CDN) ou abandonnée ne doit pas être
   redemandée par un <img>, qu'on ne pourrait plus arrêter ; l'erreur remonte, l'image en place reste. */
export async function loadTile(url, signal) {
  const response = await fetch(url, { headers: LIGHT_IMAGES, signal })
  if (!response.ok) throw new Error(`pièce de détail : ${response.status}`)
  const blob = await response.blob()
  if ('createImageBitmap' in globalThis) return { image: await createImageBitmap(blob), bytes: blob.size }
  const local = URL.createObjectURL(blob)
  try {
    return { image: await viaElement(local), bytes: blob.size }
  } finally {
    URL.revokeObjectURL(local)
  }
}

export function imageSize(image) {
  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
}

/* ==== MOTEUR ==== */

/* Rend la vue que calcule le directeur.

   Fidélité des couleurs : l'œuvre n'est éclairée que par un facteur de luminosité, le même sur les
   trois canaux et plafonné à 1, sans mappage de tons. De face et au repos, ce facteur vaut 1 : chaque
   pixel garde la couleur de l'image à plat (seul le grain de la toile l'assombrit de quelques %). La
   teinte ne bouge donc jamais.
   Netteté : l'anticrénelage matériel ne lisse que les arêtes de géométrie. Tout bord calculé dans un
   shader est donc lissé sur un pixel par sa couverture ; l'image grossie est lue en bicubique
   (Catmull-Rom), l'image réduite garde ses mipmaps et le filtrage anisotrope.
   Ombre : calculée sur le mur (projection du tableau le long de la lumière, pénombre qui s'élargit
   avec la distance au mur), sans carte d'ombre.
   Aucun à-coup : tout se prépare avant que la 3D soit visible (prepare), et rien de lourd n'attend
   le clic. Les cadres ont leur propre matériau, léger : ni environnement précalculé ni lumières
   three.js ; le bois est une image, chargée au repos.
   Dos de la toile, dos du poster encadré et coin du poster : une coquille de quelques faces et un
   panneau peints par leur shader, une grille unique déformée par le GPU. Rien à calculer pendant le
   geste. */

const PASSE_RATIO = 0.08 // contour blanc : 8 % du petit côté, égal en cm sur les 4 côtés
const SHADE = { ambient: 0.55, diffuse: 0.45, weave: 0.075, bump: 0.38 }
const SHADOW = {
  key: 0.34, keyFade: 55, penumbra: 0.35, penumbraPerCm: 0.42, ao: 0.12, aoRadius: 1.6,
  flap: 0.32, flapPenumbraPerCm: 0.3, // coin soulevé du poster
}
// Ombre du tableau dans la pièce des poses : celle du montage que Walid a trouvé plus réaliste.
const POSE_SHADOW = { key: 0.32, penumbra: 0.9 }
const WOOD_TILE_CM = [10, 30] // l'image du chêne couvre 10 cm en travers, 30 cm le long du fil
/* La pièce que le verre reflète : le mur d'en face, à `wall` cm du tableau, avec sa petite fenêtre (de
   face, en haut du côté de la lumière : GLASS_FRAGMENT) et deux portes-fenêtres (bays) que le verre ne
   montre qu'en tournant, à x cm de part et d'autre du tableau, leur milieu y cm plus haut que lui ;
   demi-tailles et luminosité. Elles sont placées pour passer sur le verre pendant les degrés lents de
   GLAZED_TURN (scripts/oeuvre-3d-staging.test.cjs le vérifie). */
export const GLASS_ROOM = { wall: 240, bays: { x: 130, y: 10, half: [40, 110], glow: 4 } }
const REHEARSAL_FRAMES = 48 // images de répétition de l'arrivée, invisibles : 12 pour chacune des 4 poses (rehearse)
const TRIAL_FRAMES = 3 // images chronométrées de l'arrivée, invisibles

const ART_VERTEX = /* glsl */ `
  attribute vec2 fab;
  attribute float art;
  varying vec2 vUv;
  varying vec2 vFab;
  varying float vArt;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vFab = fab;
    vArt = art;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Feuille du poster au coin soulevé : le même calcul que curlPoint. position
// porte la grille unité : (0, 0) au coin soulevé.
const CURL_VERTEX = /* glsl */ `
  uniform vec2 uCurlHalf;
  uniform vec2 uCurlCorner;
  uniform vec2 uCurlDir;
  uniform float uCurlFold;
  uniform float uCurlRadius;
  uniform float uCurlRoll;
  uniform float uCurlCone;
  uniform float uCurlZ;
  varying vec2 vUv;
  varying vec2 vFab;
  varying float vArt;
  varying vec3 vNormalW;
  varying float vBeyond;
  varying vec2 vWallXY;
  varying vec3 vWorldPos;
  void main() {
    vec2 tip = uCurlCorner * uCurlHalf;
    vec2 flatPoint = tip - uCurlCorner * position.xy * 2.0 * uCurlHalf;
    vUv = vec2(0.5 + flatPoint.x / (2.0 * uCurlHalf.x), 0.5 - flatPoint.y / (2.0 * uCurlHalf.y));
    vFab = flatPoint;
    vArt = 1.0;
    vWallXY = (modelMatrix * vec4(flatPoint, 0.0, 1.0)).xy;

    vec2 fromTip = flatPoint - tip;
    float beyond = dot(fromTip, uCurlDir) + uCurlFold;
    vBeyond = beyond;
    vec3 place = vec3(flatPoint, uCurlZ);
    vec3 normalLocal = vec3(0.0, 0.0, 1.0);
    if (beyond > 0.0) {
      float across = dot(fromTip, vec2(-uCurlDir.y, uCurlDir.x));
      float r = uCurlRadius * (1.0 + uCurlCone * abs(across) / max(uCurlFold, 0.001));
      float phi = min(beyond / r, uCurlRoll);
      float rest = beyond - phi * r;
      place.xy += uCurlDir * (r * sin(phi) + rest * cos(phi) - beyond);
      place.z += r * (1.0 - cos(phi)) + rest * sin(phi);
      normalLocal = vec3(-uCurlDir * sin(phi), cos(phi));
    }
    vNormalW = normalize(mat3(modelMatrix) * normalLocal);
    vWorldPos = (modelMatrix * vec4(place, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(place, 1.0);
  }
`

// Ombres projetées sur le mur et sur le papier.
const SHADOW_SHAPES = /* glsl */ `
  // 1 au cœur de l'ombre, 0 passé sa pénombre, selon la distance signée à son contour.
  float inShadow(float distance, float penumbra) {
    return 1.0 - smoothstep(-penumbra, penumbra, distance);
  }

  // Distance signée à un polygone convexe (sens trigonométrique).
  float hullDistance(vec2 hull[8], int count, vec2 p) {
    float d = -1e6;
    for (int i = 0; i < 8; i++) {
      if (i >= count) break;
      vec2 a = hull[i];
      vec2 e = normalize(hull[i + 1 < count ? i + 1 : 0] - a);
      d = max(d, (p.x - a.x) * e.y - (p.y - a.y) * e.x);
    }
    return d;
  }
`

/* Dans la pose, le tableau doit sembler photographié dans la même pièce que la femme (retours de
   Walid sur la version 21) : la lumière du mur à son emplacement (les deux poses en fondu ; un blanc
   n'y est jamais plus clair que le mur), contraste 0,94, saturation 0,95 et luminosité 0,93 comme le
   montage qu'il a trouvé plus réaliste, et le grain de la photo, à la taille de ses pixels sur le mur. */
const PHOTO_SHAPES = /* glsl */ `
  uniform float uPoseMix;
  uniform vec4 uPoseRect;
  uniform vec2 uPoseW;
  uniform sampler2D uLightA;
  uniform sampler2D uLightB;
  uniform float uPhotoTexels; // texels de la photo par cm du mur
  vec3 wallLightAt(vec2 p) {
    vec2 uv = (p - uPoseRect.xy) / (uPoseRect.zw - uPoseRect.xy);
    vec2 st = vec2(clamp(uv.x, 0.0, 1.0), clamp(1.0 - uv.y, 0.0, 1.0));
    float w = uPoseW.x + uPoseW.y;
    vec3 l = texture2D(uLightA, st).rgb * uPoseW.x + texture2D(uLightB, st).rgb * uPoseW.y;
    return w > 0.0 ? l / w : vec3(1.0);
  }
  float photoNoise(vec2 p) {
    vec2 cell = floor(p * uPhotoTexels);
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) - 0.5;
  }
  vec3 photographed(vec3 color, vec2 p) {
    vec3 s = pow(max(color, 0.0), vec3(1.0 / 2.2));
    s = (s - 0.5) * 0.94 + 0.5;
    s = mix(vec3(dot(s, vec3(0.2126, 0.7152, 0.0722))), s, 0.95);
    vec3 c = pow(max(s, 0.0), vec3(2.2)) * 0.93 * wallLightAt(p);
    return c * (1.0 + photoNoise(p) * 0.035);
  }
  /* Le papier blanc du contour, dans la pièce (retour de Walid du 12/11 : il sortait gris, plus sombre
     que le mur beige ; l'œuvre, elle, garde son montage). Un papier blanc photographié contre un mur
     beige paraît plus clair que lui et moins teinté : la lumière du mur à sa place, sa teinte gardée à
     PAPER_TINT, PAPER_LIFT fois plus haute, puis le grain de la photo. Au-delà de PAPER_KNEE, ses hauts
     se tassent en douceur vers PAPER_TOP, teinte gardée : ni blanc pur, ni aplat là où la lumière est
     forte. shade : le modelé du papier (lumière, relief, fil du bord), 1 à plat. */
  const float PAPER_TINT = 0.4;
  const float PAPER_LIFT = 1.25;
  const float PAPER_KNEE = 0.8;
  const float PAPER_TOP = 0.94;
  vec3 paperPhotographed(vec3 shade, vec2 p) {
    vec3 light = wallLightAt(p);
    vec3 tone = mix(vec3(dot(light, vec3(0.2126, 0.7152, 0.0722))), light, PAPER_TINT) * PAPER_LIFT;
    float high = max(tone.r, max(tone.g, tone.b));
    if (high > PAPER_KNEE) {
      float room = PAPER_TOP - PAPER_KNEE;
      tone *= (PAPER_KNEE + room * (1.0 - exp((PAPER_KNEE - high) / room))) / high;
    }
    return tone * shade * (1.0 + photoNoise(p) * 0.035);
  }
`

const ART_FRAGMENT = /* glsl */ `
  uniform sampler2D uArt;
  uniform sampler2D uArtPrev; // version précédente, pendant le fondu d'un changement de source
  uniform float uArtMix;
  // Pièces de détail du zoom (showTile) : la nouvelle, en fondu, sur l'ancienne ; rectangle en
  // coordonnées d'image (u0, v0, u1, v1) et présence.
  uniform sampler2D uTile;
  uniform vec4 uTileRect;
  uniform float uTileMix;
  uniform sampler2D uTileOld;
  uniform vec4 uTileOldRect;
  uniform float uTileOldMix;
  uniform sampler2D uWeave;
  uniform sampler2D uPaperTex;
  uniform float uWeaveScale;
  uniform float uPaperScale;
  uniform vec3 uBorder;
  uniform vec3 uPaperWhite;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  uniform float uWeaveAmt;
  uniform float uBump;
  uniform float uPaper;
  uniform float uPasse;
  uniform vec2 uMargin;
  uniform vec2 uCover;
  uniform float uArtCm; // largeur de l'œuvre, cm
  uniform vec2 uArtHalf; // demi-largeur et demi-hauteur de la façade, cm
  uniform float uShadeSide; // côté de l'ombre (-1 : à gauche), pour le fil sombre du bord
  uniform float uRelief; // relief de la toile qui accroche la lumière, dans la pièce
  varying vec2 vUv;
  varying vec2 vFab;
  varying float vArt;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  ${PHOTO_SHAPES}
  #ifdef CURL
    uniform float uCurlRadius;
    uniform vec2 uFlapHull[8];
    uniform int uFlapHullN;
    uniform float uFlapPenumbra;
    uniform float uFlapKey;
    varying float vBeyond;
    varying vec2 vWallXY;
    ${SHADOW_SHAPES}
  #endif

  // Lecture bicubique (Catmull-Rom en 5 lectures) : une image grossie reste nette et ne
  // montre ni les losanges de l'interpolation bilinéaire ni ses pixels.
  vec3 cubicArt(sampler2D tex, vec2 uv, vec2 size) {
    vec2 pos = uv * size;
    vec2 c1 = floor(pos - 0.5) + 0.5;
    vec2 f = pos - c1;
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;
    vec2 w0 = -0.5 * f3 + f2 - 0.5 * f;
    vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
    vec2 w2 = -1.5 * f3 + 2.0 * f2 + 0.5 * f;
    vec2 w3 = 0.5 * f3 - 0.5 * f2;
    vec2 w12 = w1 + w2;
    vec2 t0 = (c1 - 1.0) / size;
    vec2 t3 = (c1 + 2.0) / size;
    vec2 t12 = (c1 + w2 / w12) / size;
    vec3 sum = textureLod(tex, vec2(t12.x, t0.y), 0.0).rgb * (w12.x * w0.y)
             + textureLod(tex, vec2(t0.x, t12.y), 0.0).rgb * (w0.x * w12.y)
             + textureLod(tex, t12, 0.0).rgb * (w12.x * w12.y)
             + textureLod(tex, vec2(t3.x, t12.y), 0.0).rgb * (w3.x * w12.y)
             + textureLod(tex, vec2(t12.x, t3.y), 0.0).rgb * (w12.x * w3.y);
    float total = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
    return max(sum / total, 0.0);
  }

  // dx, dy : variation des coordonnées d'un pixel à l'autre, donnée à part car un calcul
  // de coordonnées (recadrage, bornes) fausserait les dérivées automatiques. L'image réduite
  // lit un niveau de mipmap plus fin que la règle (facteur 0,6) : sans quoi la 3D de face
  // serait plus molle que la photo qu'elle remplace. Ce gain ne fait pas scintiller : en
  // inclinaison vive, 0,009 % des pixels bougent de plus de 12 niveaux sur 255 d'une image à
  // l'autre. L'image grossie passe en bicubique.
  // Dans la pièce, l'œuvre n'est pas plus nette que la photo : au moins un texel de la photo par
  // lecture (la taille de ses pixels sur le mur), en fondu avec la pièce.
  vec3 readArt(sampler2D tex, vec2 uv, vec2 dx, vec2 dy) {
    vec2 size = vec2(textureSize(tex, 0));
    float texelsPerPixel = max(length(dx * size), length(dy * size));
    float photoFoot = uPoseMix * size.x / max(uArtCm * uPhotoTexels, 1e-3);
    float boost = max(0.6, photoFoot / max(texelsPerPixel, 1e-6));
    vec3 plain = textureGrad(tex, uv, dx * boost, dy * boost).rgb;
    float magnified = 1.0 - smoothstep(0.7, 1.0, texelsPerPixel * boost / 0.6);
    if (magnified <= 0.0) return plain;
    return mix(plain, cubicArt(tex, uv, size), magnified);
  }

  // Part d'une pièce de détail en uv : 1 dedans, 0 dehors. Ses bords intérieurs à l'image se fondent
  // sur 3 % de sa taille : là où elle s'arrête, l'image en place la prolonge sans marche. Les bords
  // posés sur ceux de l'image restent francs.
  float tileWeight(vec2 uv, vec4 rect) {
    vec2 t = (uv - rect.xy) / (rect.zw - rect.xy);
    vec2 lo = mix(smoothstep(0.0, 0.03, t), step(0.0, t), step(rect.xy, vec2(0.0)));
    vec2 hi = mix(smoothstep(0.0, 0.03, 1.0 - t), step(t, vec2(1.0)), step(vec2(1.0), rect.zw));
    return lo.x * lo.y * hi.x * hi.y;
  }

  vec3 readTile(sampler2D tex, vec4 rect, vec2 uv, vec2 dx, vec2 dy) {
    vec2 size = rect.zw - rect.xy;
    return readArt(tex, (uv - rect.xy) / size, dx / size, dy / size);
  }

  vec3 sampleArt(vec2 uv, vec2 dx, vec2 dy) {
    float fresh = uTileMix > 0.0 ? uTileMix * tileWeight(uv, uTileRect) : 0.0;
    vec3 color = vec3(0.0);
    // Au cœur de la pièce en place, elle seule : l'image d'en dessous ne se lit pas.
    if (fresh < 1.0) {
      color = readArt(uArt, uv, dx, dy);
      if (uArtMix < 1.0) color = mix(readArt(uArtPrev, uv, dx, dy), color, uArtMix);
      float old = uTileOldMix > 0.0 ? uTileOldMix * tileWeight(uv, uTileOldRect) : 0.0;
      if (old > 0.0) color = mix(color, readTile(uTileOld, uTileOldRect, uv, dx, dy), old);
    }
    if (fresh > 0.0) color = mix(color, readTile(uTile, uTileRect, uv, dx, dy), fresh);
    return color;
  }

  // Part du pixel dans l'intervalle [0, 1] : 1 dedans, 0 dehors, bord lissé sur un pixel.
  float coverage(float v) {
    float pixel = max(length(vec2(dFdx(v), dFdy(v))), 1e-6);
    return clamp(min(v, 1.0 - v) / pixel + 0.5, 0.0, 1.0);
  }

  void main() {
    vec2 dx = dFdx(vUv);
    vec2 dy = dFdy(vUv);
    vec3 art;
    float margin = 0.0; // part du papier du contour blanc dans le pixel (la pièce l'éclaire à part)
    if (uPasse <= 0.0) {
      art = sampleArt(vUv, dx, dy);
    } else {
      // Contour blanc : marge de papier égale en cm, œuvre recadrée pour remplir l'intérieur.
      vec2 inner = (vUv - uMargin) / (1.0 - 2.0 * uMargin);
      vec2 toCrop = uCover / (1.0 - 2.0 * uMargin);
      vec2 cropUv = clamp((inner - 0.5) * uCover + 0.5, 0.0, 1.0);
      float inside = coverage(inner.x) * coverage(inner.y);
      vec3 framed = mix(uPaperWhite, sampleArt(cropUv, dx * toCrop, dy * toCrop), inside);
      art = uPasse >= 1.0 ? framed : mix(sampleArt(vUv, dx, dy), framed, uPasse);
      margin = uPasse * (1.0 - inside) * vArt;
    }
    vec3 base = mix(uBorder, art, vArt);
    vec3 N = normalize(vNormalW);
    #ifdef CURL
      // Le dos de la feuille est blanc, sa face regarde de l'autre côté.
      if (!gl_FrontFacing) {
        base = uPaperWhite;
        N = -N;
      }
    #endif

    // Grain : trame de la toile ou papier, en relief (normale) et en luminosité.
    vec4 grain = mix(texture2D(uWeave, vFab * uWeaveScale), texture2D(uPaperTex, vFab * uPaperScale), uPaper);
    vec3 T = normalize(abs(N.y) < 0.95 ? cross(vec3(0.0, 1.0, 0.0), N) : cross(N, vec3(1.0, 0.0, 0.0)));
    vec3 B = cross(N, T);
    vec2 slope = grain.gb * 2.0 - 1.0;
    vec3 Np = normalize(N + mix(uBump, uBump * 0.3, uPaper) * (slope.x * T + slope.y * B));

    // Luminosité seule, ramenée à 1 pour la façade de face : la teinte ne change jamais.
    float k = (uAmbient + uDiffuse * max(dot(Np, uLight), 0.0)) * uNorm;
    k *= 1.0 - mix(uWeaveAmt, uWeaveAmt * 0.3, uPaper) * (1.0 - grain.r);
    float brightest = 1.0;
    #ifdef CURL
      // Le papier courbé se modèle dans la lumière. Le dos, blanc, n'a pas à garder de couleurs.
      brightest = 1.15;
      if (gl_FrontFacing) {
        // Le coin levé ombre la feuille restée à plat, et plus du tout le haut de sa courbe.
        float lifted = hullDistance(uFlapHull, uFlapHullN, vWallXY);
        float shadow = uFlapKey * inShadow(lifted, uFlapPenumbra);
        k *= 1.0 - shadow * (1.0 - smoothstep(0.0, uCurlRadius, vBeyond));
      } else {
        k = (uAmbient + uDiffuse * max(dot(Np, uLight), 0.0)) * 1.08;
      }
    #endif
    vec3 color = base * min(k, brightest);
    if (uPoseMix > 0.0) {
      // La toile imprimée dans la pièce : sa trame plus marquée, son relief qui accroche la lumière
      // de biais, un fil sombre au bord de la façade du côté de l'ombre, puis la photo.
      float threads = 1.0 - 0.6 * mix(uWeaveAmt, uWeaveAmt * 0.3, uPaper) * (1.0 - grain.r);
      vec2 toLight = normalize(uLight.xy + vec2(1e-4));
      float relief = 1.0 + uRelief * mix(1.0, 0.4, uPaper) * dot(slope, toLight);
      float front = step(0.9, N.z);
      float fromEdge = uArtHalf.x - uShadeSide * vFab.x; // distance au bord du côté de l'ombre
      float thread = 1.0 - 0.32 * front * (1.0 - smoothstep(0.0, max(0.12, 1.5 * fwidth(vFab.x)), fromEdge));
      vec3 shaded = color * threads * relief * thread;
      vec3 lit = photographed(shaded, vWorldPos.xy);
      if (margin > 0.0) lit = mix(lit, paperPhotographed(shaded / uPaperWhite, vWorldPos.xy), margin);
      color = mix(color, lit, uPoseMix);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const WALL_VERTEX = /* glsl */ `
  varying vec2 vXY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXY = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

/* La femme des poses : ses couleurs sans le mur et son détourage (calque de poses.js), posés sur le
   mur en cm. Deux places, comme les photos. */
const FIGURE_SHAPES = /* glsl */ `
  uniform sampler2D uFigureA;
  uniform sampler2D uFigureB;
  uniform vec4 uFigureRectA; // le calque sur le mur, en cm : gauche, bas, droite, haut
  uniform vec4 uFigureRectB;
  vec4 figureAt(sampler2D figure, vec4 rect, vec2 p) {
    vec2 uv = (p - rect.xy) / (rect.zw - rect.xy);
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    vec4 c = texture2D(figure, vec2(clamp(uv.x, 0.0, 1.0), 1.0 - clamp(uv.y, 0.0, 1.0)));
    return vec4(c.rgb, c.a * inside);
  }
`

// Reposée sur le tableau, là seulement où il cache le mur (uOver, sa silhouette ramenée au mur) :
// la main de la femme passe devant l'œuvre. Ailleurs, la photo la montre déjà.
const FIGURE_FRAGMENT = /* glsl */ `
  ${FIGURE_SHAPES}
  uniform vec2 uPoseW;
  uniform float uPoseMix;
  uniform vec4 uOver;
  varying vec2 vXY;
  void main() {
    if (uPoseMix <= 0.0 || vXY.x < uOver.x || vXY.x > uOver.z || vXY.y < uOver.y || vXY.y > uOver.w) discard;
    vec4 a = figureAt(uFigureA, uFigureRectA, vXY);
    vec4 b = figureAt(uFigureB, uFigureRectB, vXY);
    float wa = a.a * uPoseW.x, wb = b.a * uPoseW.y;
    float alpha = (wa + wb) * uPoseMix;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4((a.rgb * wa + b.rgb * wb) / (wa + wb), alpha);
    #include <colorspace_fragment>
  }
`

const WALL_FRAGMENT = /* glsl */ `
  uniform vec3 uWall;
  uniform float uSlope;
  uniform float uRefX;
  uniform sampler2D uRoom;
  uniform float uRoomMix;
  uniform vec4 uRoomRect;
  uniform float uFeather;
  uniform vec2 uHull[8];
  uniform int uHullN;
  uniform float uPenumbra;
  uniform float uKey;
  uniform vec4 uAo;
  uniform float uAoAmt;
  uniform float uAoRadius;
  uniform vec2 uFlapHull[8];
  uniform int uFlapHullN;
  uniform float uFlapPenumbra;
  uniform float uFlapKey;
  uniform sampler2D uPoseA; // poses de la taille (poses.js) : deux places, pour fondre l'une dans l'autre
  uniform sampler2D uPoseB;
  uniform sampler2D uLightA; // lumière de leur mur, sans la femme
  uniform sampler2D uLightB;
  uniform vec2 uCleanA; // bandes sans rien devant le mur le long des bords gauche et droit (part de la photo)
  uniform vec2 uCleanB;
  uniform vec4 uPoseRect; // la photo sur le mur, en cm : gauche, bas, droite, haut
  uniform vec2 uPoseW; // parts des deux places
  uniform float uPoseMix; // part de la pièce
  uniform vec3 uShadowTint; // dans la pièce, l'ombre du tableau tire vers cette couleur
  uniform float uShadowTintMix;
  ${FIGURE_SHAPES}
  varying vec2 vXY;
  ${SHADOW_SHAPES}

  float boxDistance(vec2 p, vec2 c, vec2 h) {
    vec2 q = abs(p - c) - h;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }

  uniform float uPhotoTexels; // texels de la photo par cm du mur
  // Au-delà de ses bords gauche et droit, la photo se prolonge par un miroir de sa bande sans rien
  // devant le mur, à la lumière du bord : ni creux ni bosse au raccord, malgré l'assombrissement des
  // coins. Au-dessus, et sur un bord où un objet touche la photo (olivier, lampadaire), le mur se
  // prolonge uni, à la lumière du mur sans les meubles, avec le grain de la photo ; la photo s'y fond
  // sur ses POSE_FADE derniers cm.
  const float POSE_FADE = 8.0;
  float grain(vec2 p) {
    vec2 cell = floor(p * uPhotoTexels);
    float n = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) - 0.5;
    return n * 0.012 / max(fwidth(p.x * uPhotoTexels), 1.0); // plusieurs texels par pixel : moyennés
  }
  // Une rangée de la lumière du mur (v : 0 en haut, 1 en bas), lissée en largeur sur ± 18 cm.
  vec3 smoothRow(sampler2D light, float x, float v) {
    float spread = 6.0 / (uPoseRect.z - uPoseRect.x);
    vec3 sum = vec3(0.0);
    for (int k = -3; k <= 3; k++) sum += texture2D(light, vec2(x + float(k) * spread, v)).rgb * (4.0 - abs(float(k)));
    return sum / 16.0;
  }
  // Au-dessus : la lumière du haut de la photo, ses stries lissées en montant (sur 40 cm).
  vec3 topLight(sampler2D light, float x, float above) {
    return mix(texture2D(light, vec2(x, 0.0)).rgb, smoothRow(light, x, 0.0), smoothstep(0.0, 40.0, above));
  }
  // Sous la photo (derrière la rangée, dévoilé quand elle s'efface) : le parquet, sa lumière lissée,
  // sans les traînées de la dernière rangée de pixels étirée, puis le fond neutre (POSE_FLOOR cm).
  const float POSE_FLOOR = 20.0;
  float fold(float t, float m) {
    float k = mod(t, 2.0 * m);
    return k < m ? k : 2.0 * m - k;
  }
  // rgb : la photo prolongée ; a : sa part, qui s'efface sous elle dans le fond neutre.
  vec4 posePhoto(sampler2D photo, sampler2D light, vec2 clean) {
    vec2 uv = (vXY - uPoseRect.xy) / (uPoseRect.zw - uPoseRect.xy);
    vec2 edge = vec2(clamp(uv.x, 0.0, 1.0), clamp(1.0 - uv.y, 0.0, 1.0));
    vec2 st = edge;
    if (uv.x < 0.0) st.x = clean.x > 0.0 ? fold(-uv.x, clean.x) : 0.0;
    if (uv.x > 1.0) st.x = clean.y > 0.0 ? 1.0 - fold(uv.x - 1.0, clean.y) : 1.0;
    vec3 lit = texture2D(light, edge).rgb;
    vec3 c = texture2D(photo, st).rgb * lit / max(texture2D(light, st).rgb, vec3(0.02));
    if (uv.y > 1.0) lit = topLight(light, edge.x, (uv.y - 1.0) * (uPoseRect.w - uPoseRect.y));
    vec2 fade = POSE_FADE / (uPoseRect.zw - uPoseRect.xy);
    float plain = max(1.0 - smoothstep(0.0, fade.y, 1.0 - uv.y), max(
      clean.x <= 0.0 ? 1.0 - smoothstep(0.0, fade.x, uv.x) : 0.0,
      clean.y <= 0.0 ? 1.0 - smoothstep(0.0, fade.x, 1.0 - uv.x) : 0.0));
    c = mix(c, lit * (1.0 + grain(vXY)), plain);
    float high = uPoseRect.w - uPoseRect.y;
    vec3 floorLight = smoothRow(light, edge.x, 1.0);
    c = mix(c, floorLight, 1.0 - smoothstep(0.0, POSE_FADE * 0.5, uv.y * high));
    return vec4(c, 1.0 - smoothstep(0.0, POSE_FLOOR, -uv.y * high));
  }

  void main() {
    vec3 col = uWall * (1.0 + uSlope * (vXY.x - uRefX));
    if (uRoomMix > 0.0) {
      vec2 ruv = (vXY - uRoomRect.xy) / (uRoomRect.zw - uRoomRect.xy);
      // Bords de la photo lissés sur un pixel ; le haut se fond dans le mur.
      vec2 edge = clamp(min(ruv, 1.0 - ruv) / max(fwidth(ruv), vec2(1e-6)) + 0.5, 0.0, 1.0);
      float feather = 1.0 - smoothstep(uRoomRect.w - uFeather, uRoomRect.w, vXY.y);
      vec3 photo = texture2D(uRoom, vec2(ruv.x, 1.0 - ruv.y)).rgb;
      col = mix(col, photo, uRoomMix * edge.x * edge.y * feather);
    }
    // La femme est devant le mur : l'ombre du tableau ne tombe pas sur elle.
    float person = 0.0;
    if (uPoseMix > 0.0) {
      float shown = uPoseW.x + uPoseW.y;
      vec4 photo = vec4(0.0);
      if (uPoseW.x > 0.0) photo += posePhoto(uPoseA, uLightA, uCleanA) * uPoseW.x;
      if (uPoseW.y > 0.0) photo += posePhoto(uPoseB, uLightB, uCleanB) * uPoseW.y;
      col = mix(col, photo.rgb / max(shown, 1e-4), uPoseMix * photo.a);
      person = (figureAt(uFigureA, uFigureRectA, vXY).a * uPoseW.x + figureAt(uFigureB, uFigureRectB, vXY).a * uPoseW.y) * uPoseMix;
    }
    // Pénombres : jamais plus fines qu'un pixel, même vues de loin.
    float hull = hullDistance(uHull, uHullN, vXY);
    float penumbra = max(uPenumbra, fwidth(hull));
    float key = uKey * inShadow(hull, penumbra);
    float box = boxDistance(vXY, uAo.xy, uAo.zw);
    float ao = uAoAmt * (1.0 - smoothstep(0.0, max(uAoRadius, fwidth(box)), box));
    // Ombre du coin soulevé du poster, sur le mur qu'il découvre.
    float flap = 0.0;
    if (uFlapKey > 0.0) {
      float lifted = hullDistance(uFlapHull, uFlapHullN, vXY);
      flap = uFlapKey * inShadow(lifted, uFlapPenumbra);
    }
    float bare = 1.0 - person;
    float dropped = key * bare; // ombre portée du tableau
    vec3 lit = col * (1.0 - ao * bare) * (1.0 - flap * bare);
    gl_FragColor = vec4(mix(lit * (1.0 - dropped), mix(lit, uShadowTint, dropped), uShadowTintMix), 1.0);
    #include <colorspace_fragment>
  }
`

const FRAME_VERTEX = /* glsl */ `
  attribute float shade;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vShade;
  void main() {
    vUv = uv;
    vShade = shade;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

// Cadres : diffus (lumière principale et ambiance haut/bas), brillance et reflet d'une pièce
// simplifiée (plafond clair, sol chaud, fenêtre du côté de la lumière), calculés à la volée.
const FRAME_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTile;
  uniform float uWood;
  uniform vec3 uTint;
  uniform float uRelief;
  uniform float uRough;
  uniform vec3 uLight;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vShade;
  ${PHOTO_SHAPES}

  float height(vec2 st) {
    return dot(texture2D(uMap, st).rgb, vec3(0.3333));
  }

  vec3 roomLight(vec3 d) {
    vec3 room = mix(vec3(0.30, 0.25, 0.20), vec3(0.78, 0.77, 0.75), smoothstep(0.3, 0.72, d.y * 0.5 + 0.5));
    return room + vec3(1.1) * smoothstep(0.55, 0.97, dot(d, uLight));
  }

  void main() {
    vec2 st = vUv * uTile;
    vec2 step1 = 1.5 / vec2(textureSize(uMap, 0));
    vec3 wood = texture2D(uMap, st).rgb;
    float h = dot(wood, vec3(0.3333));
    vec3 albedo = mix(uTint, wood, uWood);

    // Axes de l'image de bois sur la surface, tirés des dérivées (aucune tangente à stocker) :
    // le relief suit le fil sur les quatre baguettes, quelle que soit leur direction.
    vec3 N = normalize(vNormalW);
    vec3 alongX = cross(dFdy(vWorld), N);
    vec3 alongY = cross(N, dFdx(vWorld));
    vec3 T = alongX * dFdx(st).x + alongY * dFdy(st).x;
    vec3 B = alongX * dFdx(st).y + alongY * dFdy(st).y;
    T *= inversesqrt(max(dot(T, T), 1e-20));
    B *= inversesqrt(max(dot(B, B), 1e-20));
    N = normalize(N + uRelief * ((h - height(st + vec2(step1.x, 0.0))) * T + (h - height(st + vec2(0.0, step1.y))) * B));

    vec3 V = normalize(cameraPosition - vWorld);
    float ndl = max(dot(N, uLight), 0.0);
    vec3 ambient = mix(vec3(0.27, 0.24, 0.21), vec3(0.70), N.y * 0.5 + 0.5);
    vec3 color = albedo * (0.64 * ndl + ambient);

    float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
    float shine = mix(70.0, 12.0, uRough);
    float glint = pow(max(dot(N, normalize(uLight + V)), 0.0), shine) * (shine + 8.0) * 0.0035;
    color += roomLight(reflect(-V, N)) * fresnel * mix(0.8, 0.5, uRough) + vec3(glint * ndl);

    color *= vShade;
    if (uPoseMix > 0.0) color = mix(color, photographed(color, vWorld.xy), uPoseMix);
    gl_FragColor = vec4(color, uOpacity);
    #include <colorspace_fragment>
  }
`

const GLASS_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

/* Verre : voile très léger, reflet d'une fenêtre à petits carreaux (fixe dans la pièce,
   il glisse donc quand on incline) et brillance rasante (Fresnel). Ajouté à l'image.
   Pendant le tour du poster encadré (retour de Walid du 11/11 : « qu'on voie la lumière qui se
   reflète […], qu'on comprenne qu'il y a une vitre »), deux portes-fenêtres, de part et d'autre de la
   pièce (GLASS_ROOM), passent sur le verre : l'une quand il quitte la face, l'autre quand il y revient,
   pendant ses degrés lents (GLAZED_TURN). Leur éclat suit Fresnel. Elles ne s'allument que si le verre
   lui-même a tourné : de face, incliné au doigt ou dans les gros plans, il reste tel qu'avant. */
const GLASS_FRAGMENT = /* glsl */ `
  uniform vec3 uNormal;
  uniform float uOpacity;
  uniform vec3 uWin;
  uniform vec2 uWinHalf;
  uniform vec3 uBays; // grandes fenêtres, sur le mur d'en face : x de celle de gauche, de celle de droite, y de leur milieu
  uniform vec2 uBayHalf;
  uniform float uBayGlow; // leur luminosité, en part du blanc de l'œuvre
  varying vec3 vWorld;

  // Fenêtre vue en q (de -1 à 1 sur sa largeur et sa hauteur), cells carreaux : 1 sur les vitres,
  // barLight sur les montants, 0 au-dehors ; ses bords s'adoucissent sur la part soft.
  float windowAt(vec2 q, float soft, vec2 cells, float barLight) {
    float inside = (1.0 - smoothstep(1.0 - soft, 1.0, abs(q.x))) * (1.0 - smoothstep(1.0 - soft, 1.0, abs(q.y)));
    vec2 cell = fract((q * 0.5 + 0.5) * cells);
    vec2 barWidth = vec2(0.12, 0.1) * vec2(cells.x / 2.0, cells.y / 3.0); // en part d'un carreau
    float panes = smoothstep(0.0, barWidth.x, cell.x) * smoothstep(0.0, barWidth.x, 1.0 - cell.x)
                * smoothstep(0.0, barWidth.y, cell.y) * smoothstep(0.0, barWidth.y, 1.0 - cell.y);
    return inside * mix(barLight, 1.0, panes);
  }

  // Une porte-fenêtre : le ciel plus clair en haut.
  float bayAt(vec2 q) {
    return windowAt(q, 0.12, vec2(2.0, 4.0), 0.22) * mix(0.7, 1.0, smoothstep(-1.0, 1.0, q.y));
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - clamp(dot(uNormal, V), 0.0, 1.0), 5.0);
    vec3 R = reflect(-V, uNormal);
    float t = (uWin.z - vWorld.z) / max(R.z, 0.05);
    vec2 hit = vWorld.xy + R.xy * t;
    float facing = smoothstep(0.02, 0.08, R.z);
    float window = windowAt((hit - uWin.xy) / uWinHalf, 0.25, vec2(2.0, 3.0), 0.45) * facing;
    float turned = smoothstep(0.0005, 0.004, 1.0 - uNormal.z); // nul à moins de 2° de la face
    float bays = turned * facing * (bayAt((hit - vec2(uBays.x, uBays.z)) / uBayHalf) + bayAt((hit - vec2(uBays.y, uBays.z)) / uBayHalf));
    float a = (0.012 + window * 0.06 + (0.04 + 0.96 * fresnel) * uBayGlow * bays + fresnel * 0.24) * uOpacity;
    gl_FragColor = vec4(vec3(a), 1.0);
  }
`

const FADE_MS = 350
const fadeSince = (at, now, ms = FADE_MS) => Math.min(1, Math.max(0, (now - at) / ms))

// Rend la main à la page : un doigt posé pendant la préparation de la 3D n'attend pas.
export const breathe = () => new Promise((resolve) => { setTimeout(resolve) })

// Une toile de dessin, dans une page ou dans un worker.
const blankCanvas = () => (globalThis.document ? document.createElement('canvas') : new OffscreenCanvas(1, 1))

/* canvas : là où dessiner, dans la page ou non. artImage : l'image à plat, décodée. weave : pixels de
   la trame (startReliefs). room : mur et lumière (neutralRoom). woodImage : adresse de l'image du
   chêne. sizes : tailles du produit (« 30x40 »), imprimées au dos. Renvoie de quoi dessiner une vue,
   et dispose() pour tout rendre à la carte graphique. Sans WebGL2, three.js lève une erreur ici. */
export function createScene(THREE, { canvas, artImage, weave, room, woodImage, sizes, poses = null }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  const anisotropy = renderer.capabilities.getMaxAnisotropy()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 5000)
  /* La lumière : celle de la pièce de face, celle des photos dans la pose (poses.light, venue de la
     droite de l'image), en fondu avec la pièce. Le même tableau sert à l'ombre (castOnWall). */
  const roomLight = unit(room.light)
  const poseLight = poses && poses.light ? unit(poses.light) : roomLight
  const light = [...roomLight]
  let poseK = 0 // part de la pièce des poses dans la vue en cours
  const poseSizes = poses ? poses.sizes : [] // les tailles du produit, une pose chacune

  const reliefTexture = (pixels) => {
    const t = new THREE.DataTexture(new Uint8Array(pixels.buffer), RELIEF_SIZE, RELIEF_SIZE, THREE.RGBAFormat)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = anisotropy
    t.needsUpdate = true
    return t
  }

  // Images à l'endroit : jamais retournées à l'envoi, ce sont les coordonnées qui s'adaptent.
  const imageTexture = (image) => {
    const t = new THREE.Texture(image)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    t.anisotropy = anisotropy
    t.needsUpdate = true
    return t
  }

  // ---- Mur (uni, puis photo de la pièce en fondu) et ombre ----
  const hull = Array.from({ length: 8 }, () => new THREE.Vector2())
  const flapHull = Array.from({ length: 8 }, () => new THREE.Vector2())
  const wallUniforms = {
    // Avec les poses, le mur de face est celui de leurs photos autour du tableau (poses.js).
    uWall: { value: new THREE.Color().setRGB(...((poses && poses.wall) || room.wall).map((c) => c / 255), THREE.SRGBColorSpace) },
    uShadowTint: { value: new THREE.Color().setRGB(70 / 255, 55 / 255, 40 / 255, THREE.SRGBColorSpace) },
    uShadowTintMix: { value: 0 },
    uPhotoTexels: { value: 8 },
    uSlope: { value: room.wallSlope },
    uRefX: { value: room.hang.x },
    uRoom: { value: null },
    uRoomMix: { value: 0 },
    uRoomRect: { value: room.photo ? new THREE.Vector4(room.photo.left, room.photo.bottom, room.photo.right, room.photo.top) : new THREE.Vector4(0, 0, 1, 1) },
    uFeather: { value: 18 },
    uHull: { value: hull },
    uHullN: { value: 0 },
    uPenumbra: { value: 1 },
    uKey: { value: 0 },
    uAo: { value: new THREE.Vector4() },
    uAoAmt: { value: 0 },
    uAoRadius: { value: SHADOW.aoRadius },
    uFlapHull: { value: flapHull },
    uFlapHullN: { value: 0 },
    uFlapPenumbra: { value: 1 },
    uFlapKey: { value: 0 },
    uPoseA: { value: null },
    uPoseB: { value: null },
    uLightA: { value: null },
    uLightB: { value: null },
    uCleanA: { value: new THREE.Vector2(1, 1) },
    uCleanB: { value: new THREE.Vector2(1, 1) },
    uPoseRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uPoseW: { value: new THREE.Vector2() },
    uPoseMix: { value: 0 },
    uFigureA: { value: null },
    uFigureB: { value: null },
    uFigureRectA: { value: new THREE.Vector4(0, 0, 1, 1) },
    uFigureRectB: { value: new THREE.Vector4(0, 0, 1, 1) },
  }
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 1400),
    new THREE.ShaderMaterial({ uniforms: wallUniforms, vertexShader: WALL_VERTEX, fragmentShader: WALL_FRAGMENT }),
  )
  wall.position.set(room.hang.x, 150, 0)
  scene.add(wall)

  /* ---- La femme des poses, reposée sur le tableau : un plan au mur (aucun décalage de
          perspective avec la photo), dessiné en dernier, sans test de profondeur. Toujours là,
          pour être compilé avec le reste : hors de la pièce, il ne dessine rien. ---- */
  const figureUniforms = {
    uFigureA: wallUniforms.uFigureA,
    uFigureB: wallUniforms.uFigureB,
    uFigureRectA: wallUniforms.uFigureRectA,
    uFigureRectB: wallUniforms.uFigureRectB,
    uPoseW: wallUniforms.uPoseW,
    uPoseMix: wallUniforms.uPoseMix,
    uOver: { value: new THREE.Vector4(0, 0, -1, -1) },
  }
  if (poses) {
    const zones = poseSizes.map((size) => posePlacement(poses, size).overlay)
    const left = Math.min(...zones.map((z) => z.left)), right = Math.max(...zones.map((z) => z.right))
    const bottom = Math.min(...zones.map((z) => z.bottom)), top = Math.max(...zones.map((z) => z.top))
    const figureMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(right - left, top - bottom),
      new THREE.ShaderMaterial({
        uniforms: figureUniforms, vertexShader: WALL_VERTEX, fragmentShader: FIGURE_FRAGMENT,
        transparent: true, depthTest: false, depthWrite: false,
      }),
    )
    figureMesh.position.set((left + right) / 2, (bottom + top) / 2, 0)
    figureMesh.renderOrder = 3
    scene.add(figureMesh)
    const { photo } = posePlacement(poses, poseSizes[0])
    wallUniforms.uPoseRect.value.set(photo.left, photo.bottom, photo.right, photo.top)
    wallUniforms.uPhotoTexels.value = (poses.px[0] / 2) / (photo.right - photo.left) // photos publiées à 2400 px
  }

  // Uniformes du traitement « photographié » : les mêmes objets que ceux du mur.
  const photoUniforms = () => ({
    uPoseMix: wallUniforms.uPoseMix,
    uPoseRect: wallUniforms.uPoseRect,
    uPoseW: wallUniforms.uPoseW,
    uLightA: wallUniforms.uLightA,
    uLightB: wallUniforms.uLightB,
    uPhotoTexels: wallUniforms.uPhotoTexels,
  })

  // ---- Œuvre (toile ou papier) ----
  const artUniforms = {
    uArt: { value: imageTexture(artImage) },
    uArtPrev: { value: null },
    uArtMix: { value: 1 },
    uTile: { value: null },
    uTileRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uTileMix: { value: 0 },
    uTileOld: { value: null },
    uTileOldRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uTileOldMix: { value: 0 },
    uWeave: { value: reliefTexture(weave) },
    uPaperTex: { value: null }, // reçu du worker juste après la trame (setPaperRelief)
    uWeaveScale: { value: 1 / WEAVE_TILE_CM },
    uPaperScale: { value: 1 / PAPER_TILE_CM },
    uBorder: { value: new THREE.Color(borderOf('blanche').color) },
    uPaperWhite: { value: new THREE.Color(PAPER_WHITE) },
    uLight: { value: new THREE.Vector3(...light) },
    uAmbient: { value: SHADE.ambient },
    uDiffuse: { value: SHADE.diffuse },
    uNorm: { value: 1 / (SHADE.ambient + SHADE.diffuse * light[2]) },
    uWeaveAmt: { value: SHADE.weave },
    uBump: { value: SHADE.bump },
    uPaper: { value: 0 },
    uPasse: { value: 0 },
    uMargin: { value: new THREE.Vector2() },
    uCover: { value: new THREE.Vector2(1, 1) },
    uArtCm: { value: 30 },
    uArtHalf: { value: new THREE.Vector2(15, 20) },
    uShadeSide: { value: -1 },
    uRelief: { value: 0.07 },
    ...photoUniforms(),
  }
  const group = new THREE.Group()
  group.rotation.order = 'YXZ'
  const artMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({ uniforms: artUniforms, vertexShader: ART_VERTEX, fragmentShader: ART_FRAGMENT }),
  )
  group.add(artMesh)
  scene.add(group)

  // ---- Cadre (toujours le même matériau : un seul programme, compilé dès le départ) ----
  const frameUniforms = {
    uMap: { value: null },
    uTile: { value: new THREE.Vector2(1 / WOOD_TILE_CM[0], 1 / WOOD_TILE_CM[1]) },
    uWood: { value: 0 },
    uTint: { value: new THREE.Color() },
    uRelief: { value: 0 },
    uRough: { value: 0.6 },
    uLight: { value: new THREE.Vector3(...light) },
    uOpacity: { value: 1 },
    ...photoUniforms(),
  }
  const frameMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({
      uniforms: frameUniforms, vertexShader: FRAME_VERTEX, fragmentShader: FRAME_FRAGMENT, transparent: true,
    }),
  )
  frameMesh.visible = false
  frameMesh.renderOrder = 1
  group.add(frameMesh)

  const glassUniforms = {
    uNormal: { value: new THREE.Vector3(0, 0, 1) },
    uOpacity: { value: 0 },
    uWin: { value: new THREE.Vector3() },
    uWinHalf: { value: new THREE.Vector2(20, 30) },
    uBays: { value: new THREE.Vector3() },
    uBayHalf: { value: new THREE.Vector2(...GLASS_ROOM.bays.half) },
    uBayGlow: { value: GLASS_ROOM.bays.glow },
  }
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: glassUniforms, vertexShader: GLASS_VERTEX, fragmentShader: GLASS_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  glass.renderOrder = 2
  group.add(glass)

  // ---- Dos de la toile : quelques faces, tout le détail est peint par son shader ----
  const marksCanvas = blankCanvas()
  const marksAreas = paintMarks(marksCanvas, sizes)
  const marksTexture = imageTexture(marksCanvas)
  const backUniforms = {
    uArt: artUniforms.uArt,
    uWeave: artUniforms.uWeave,
    uWeaveScale: artUniforms.uWeaveScale,
    uBorder: artUniforms.uBorder,
    uLight: artUniforms.uLight,
    uAmbient: artUniforms.uAmbient,
    uDiffuse: artUniforms.uDiffuse,
    uNorm: artUniforms.uNorm,
    uMap: frameUniforms.uMap,
    uTile: frameUniforms.uTile,
    uPine: { value: 0 },
    uBandColor: { value: new THREE.Color(BACK_COLORS.band) },
    uRawColor: { value: new THREE.Color(BACK_COLORS.raw) },
    uPineColor: { value: new THREE.Color(BACK_COLORS.pine) },
    uSideArt: { value: 0 },
    uHalf: { value: new THREE.Vector2(1, 1) },
    uBand: { value: 1 },
    uBar: { value: 1 },
    uStaplesUpright: { value: new THREE.Vector3() },
    uStaplesFlat: { value: new THREE.Vector3() },
    uStaplesBelow: { value: new THREE.Vector3() },
    uStaplesAbove: { value: new THREE.Vector3() },
    uCornerStapleInset: { value: 1 },
    uMarkedCornerInset: { value: 1 },
    uStapleHalf: { value: 1 },
    uRowClear: { value: new THREE.Vector2() },
    uMarks: { value: marksTexture },
    uMarkBoxes: { value: Array.from({ length: MARK_COUNT }, () => new THREE.Vector4()) },
    uMarkAreas: { value: Array.from({ length: MARK_COUNT }, () => new THREE.Vector4()) },
    uLightLocal: { value: new THREE.Vector3(...light) },
  }
  const backMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({ uniforms: backUniforms, vertexShader: BACK_VERTEX, fragmentShader: BACK_FRAGMENT }),
  )
  group.add(backMesh)

  // ---- Dos du poster encadré : le panneau d'isorel, peint par son shader. Il suit le cadre et n'existe
  //      que pour le poster, comme le verre. ----
  const boardUniforms = {
    uBoardColor: { value: new THREE.Color(BOARD_COLORS.board) },
    uHangerColor: { value: new THREE.Color(BOARD_COLORS.hanger) },
    uTabColor: { value: new THREE.Color(BOARD_COLORS.tab) },
    uHalf: { value: new THREE.Vector2(1, 1) },
    uRecess: { value: POSTER_BACK.recess },
    uHanger: { value: new THREE.Vector4() },
    uTabsAcross: { value: new THREE.Vector3() },
    uTabsAlong: { value: new THREE.Vector3() },
    uTab: { value: new THREE.Vector2() },
    uLightLocal: backUniforms.uLightLocal,
    uEyeLocal: { value: new THREE.Vector3() },
    uAmbient: artUniforms.uAmbient,
    uDiffuse: artUniforms.uDiffuse,
    uNorm: artUniforms.uNorm,
    uOpacity: { value: 1 },
  }
  const board = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({ uniforms: boardUniforms, vertexShader: BOARD_VERTEX, fragmentShader: BOARD_FRAGMENT, transparent: true }),
  )
  board.visible = false
  board.renderOrder = 1
  group.add(board)

  // ---- Géométries, recalculées seulement quand leurs dimensions changent. Pendant une
  //      animation (taille, épaisseur), le nombre de sommets ne bouge pas : on réécrit les
  //      tampons en place au lieu d'en créer de nouveaux. ----
  let artKey = '', frameKey = ''
  const setGeometry = (mesh, data, extra) => {
    const names = ['position', 'normal', 'uv', ...(extra || [])]
    const current = mesh.geometry
    const sameShape = names.every((n) => current.getAttribute(n) && current.getAttribute(n).array.length === data[n].length) &&
      current.index && current.index.array.length === data.index.length
    if (sameShape) {
      for (const n of names) {
        const attribute = current.getAttribute(n)
        attribute.array.set(data[n])
        attribute.needsUpdate = true
      }
      current.index.array.set(data.index)
      current.index.needsUpdate = true
      current.computeBoundingSphere()
      return
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.position, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2))
    if (extra) for (const name of extra) g.setAttribute(name, new THREE.BufferAttribute(data[name], name === 'fab' ? 2 : 1))
    g.setIndex(new THREE.BufferAttribute(data.index, 1))
    mesh.geometry.dispose()
    mesh.geometry = g
  }

  // ---- Feuille du coin soulevé : une seule grille pour tous les formats, déformée par le GPU.
  //      Elle remplace la boîte du poster le temps du geste. ----
  const curlAt = curlCorner(room)
  const curlUniforms = {
    uCurlHalf: { value: new THREE.Vector2(1, 1) },
    uCurlCorner: { value: new THREE.Vector2(curlAt.x, curlAt.y) },
    uCurlDir: { value: new THREE.Vector2() },
    uCurlFold: { value: 0 },
    uCurlRadius: { value: 1 },
    uCurlRoll: { value: CURL.roll },
    uCurlCone: { value: CURL.cone },
    uCurlZ: { value: 0 },
    uFlapHull: wallUniforms.uFlapHull,
    uFlapHullN: wallUniforms.uFlapHullN,
    uFlapPenumbra: wallUniforms.uFlapPenumbra,
    uFlapKey: wallUniforms.uFlapKey,
  }
  const sheet = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({
      uniforms: { ...artUniforms, ...curlUniforms }, defines: { CURL: 1 },
      vertexShader: CURL_VERTEX, fragmentShader: ART_FRAGMENT, side: THREE.DoubleSide,
    }),
  )
  setGeometry(sheet, curlSheet(curlAt))
  sheet.frustumCulled = false // la grille unité ne dit rien de la taille réelle
  sheet.visible = false
  group.add(sheet)

  // Point projeté sur le mur le long de la lumière.
  const castOnWall = ([x, y, z]) => [x - (light[0] * z) / light[2], y - (light[1] * z) / light[2]]

  function updateCurl(p) {
    const curling = p.curl > 0.001
    artMesh.visible = !curling
    sheet.visible = curling
    wallUniforms.uFlapKey.value = 0
    if (!curling) return
    const shape = curlShape(p.curl, p.width, p.height, curlAt)
    sheet.position.z = p.artZ
    curlUniforms.uCurlHalf.value.set(p.width / 2, p.height / 2)
    curlUniforms.uCurlDir.value.set(...shape.dir)
    curlUniforms.uCurlFold.value = shape.fold
    curlUniforms.uCurlRadius.value = shape.radius
    curlUniforms.uCurlZ.value = p.depth

    // Ombre sur le mur et la feuille : le contour du coin levé, projeté le long de la lumière.
    const lifted = curlOutline(shape).map((q) => curlPoint(q, shape))
    const front = p.z + p.artZ + p.depth
    const shadow = convexHull(lifted.map(([x, y, z]) => castOnWall([p.x + x, p.y + y, front + z])))
    shadow.forEach((q, i) => flapHull[i].set(q[0], q[1]))
    wallUniforms.uFlapHullN.value = shadow.length
    const rise = Math.max(...lifted.map((q) => q[2]))
    wallUniforms.uFlapKey.value = SHADOW.flap * Math.min(1, rise / 1.5)
    wallUniforms.uFlapPenumbra.value = SHADOW.penumbra + SHADOW.flapPenumbraPerCm * rise
  }

  const borderColor = new THREE.Color()
  const towardsLocal = new THREE.Quaternion()
  let shownFrame = 'noir' // dernier cadre choisi : il reste dessiné pendant qu'il s'efface

  function updatePainting(p, product, now) {
    group.position.set(p.x, p.y, p.z)
    group.rotation.set(p.pitch, p.yaw, 0)

    // La bordure de la toile reste en place pendant tout l'affinage (la tranche d'une toile
    // pliée rétrécit avec l'épaisseur) ; la feuille ne devient du papier nu qu'à l'arrivée.
    const border = borderShown(p, product)
    // Sans arrondi : la dernière image d'une animation doit reconstruire le tableau à sa vraie taille,
    // pour qu'il soit au pixel près celui d'une photo rendue hors de la page.
    const key = [p.width, p.height, p.depth].join('x') + border + product.size
    if (key !== artKey) {
      setGeometry(artMesh, artBox({ width: p.width, height: p.height, depth: p.depth, border, paper: p.paper }), ['fab', 'art'])
      setGeometry(backMesh, backShell({ width: p.width, height: p.height, depth: p.depth }), ['part'])
      backUniforms.uHalf.value.set(p.width / 2, p.height / 2)
      const { band, bar, cornerStapleInset, stapleLength } = backLayout(p.width, p.height)
      backUniforms.uBand.value = band
      backUniforms.uBar.value = bar
      backUniforms.uCornerStapleInset.value = cornerStapleInset
      backUniforms.uStapleHalf.value = stapleLength / 2
      const { upright, flat } = stapleRows(p.width, p.height)
      backUniforms.uStaplesUpright.value.set(upright.first, upright.gap, upright.count)
      backUniforms.uStaplesFlat.value.set(flat.first, flat.gap, flat.count)
      const format = marksAreas.format[product.size]
      const marks = marksLayout(p.width, p.height, format.length, marksAreas.premium)
      const boxes = [marks.logo, marks.cornerCode, marks.centerCode, marks.format, marks.premium]
      const areas = [marksAreas.logo, marksAreas.cornerCode, marksAreas.centerCode, format.area, marksAreas.premium.area]
      boxes.forEach(({ x, y, width: w, height: h }, i) => backUniforms.uMarkBoxes.value[i].set(x, y, w, h))
      areas.forEach((area, i) => backUniforms.uMarkAreas.value[i].set(...area))
      backUniforms.uMarkedCornerInset.value = marks.markedCornerInset
      backUniforms.uRowClear.value.set(marks.rowClear.top, marks.rowClear.bottom)
      const { below, above } = marks.rightRows
      backUniforms.uStaplesBelow.value.set(below.first, below.gap, below.count)
      backUniforms.uStaplesAbove.value.set(above.first, above.gap, above.count)
      artKey = key
    }
    artMesh.position.z = p.artZ
    updateCurl(p)

    backMesh.visible = p.paper < 0.999
    backMesh.position.z = p.artZ
    backUniforms.uPine.value = wood.fade(now)
    backUniforms.uSideArt.value = borderTakesImage(product.border) ? 1 : 0
    // Du repère de la pièce à celui du tableau : la lumière (dos de la toile, panneau du poster) et la
    // caméra (panneau du poster) y sont lues par leur shader.
    const toLocal = towardsLocal.copy(group.quaternion).invert()
    backUniforms.uLightLocal.value.set(...light).applyQuaternion(toLocal)

    borderColor.set(borderOf(product.border).color || PAPER_WHITE)
    artUniforms.uBorder.value.copy(borderColor).lerp(artUniforms.uPaperWhite.value, p.paper)
    // Tant que le papier n'est pas arrivé du worker, le poster garde la trame sans son relief.
    artUniforms.uPaper.value = artUniforms.uPaperTex.value ? p.paper : 0
    artUniforms.uPasse.value = p.passe
    artUniforms.uArtCm.value = p.width
    artUniforms.uArtHalf.value.set(p.width / 2, p.height / 2)
    // Recadrage de l'œuvre dans l'intérieur du contour (remplir sans déformer).
    const { width: artWidth, height: artHeight } = imageSize(artImage)
    const { margin, cover } = passeCrop(p.width, p.height, artWidth / artHeight)
    artUniforms.uMargin.value.set(...margin)
    artUniforms.uCover.value.set(...cover)

    frameMesh.visible = p.framed > 0.001
    glass.visible = frameMesh.visible && p.paper > 0.01
    board.visible = glass.visible
    if (!frameMesh.visible) return
    // p.frame glisse de la caisse américaine à la baguette sous verre avec `paper`.
    const f = p.frame
    const kind = p.paper > 0.5 ? 'poster' : 'toile'
    const fk = [p.width, p.height, f.gap, f.face, f.depth, f.floor].join('x') + kind
    if (fk !== frameKey) {
      const opening = frameOpening(p.width, p.height, f)
      setGeometry(frameMesh, frameRing({ ...opening, profile: frameProfile(kind, f) }), ['shade'])
      glass.scale.set(2 * opening.hw, 2 * opening.hh, 1)
      glass.position.set(0, 0, f.floor + 0.1)
      setGeometry(board, posterBoard(p))
      const { half, hanger, tabs } = posterBackLayout(p.width, p.height)
      boardUniforms.uHalf.value.set(...half)
      boardUniforms.uHanger.value.set(hanger.x, hanger.y, hanger.width, hanger.height)
      boardUniforms.uTabsAcross.value.set(tabs.across.first, tabs.across.gap, tabs.across.count)
      boardUniforms.uTabsAlong.value.set(tabs.along.first, tabs.along.gap, tabs.along.count)
      boardUniforms.uTab.value.set(tabs.width, tabs.length)
      frameKey = fk
    }
    boardUniforms.uOpacity.value = p.framed
    boardUniforms.uEyeLocal.value.copy(camera.position).sub(group.position).applyQuaternion(toLocal)
    if (hasFrame(product)) shownFrame = product.frame
    const look = frameOf(shownFrame)
    const woodShown = wood.fade(now)
    frameUniforms.uTint.value.set(look.color)
    frameUniforms.uWood.value = look.wood * woodShown
    frameUniforms.uRelief.value = look.relief * woodShown
    frameUniforms.uRough.value = look.rough
    frameUniforms.uOpacity.value = p.framed
    glassUniforms.uOpacity.value = p.paper * p.framed
    glassUniforms.uNormal.value.set(0, 0, 1).applyEuler(group.rotation)
    glassUniforms.uWin.value.set(p.x + 28 * Math.sign(light[0] || -1), p.y + 36, p.z + GLASS_ROOM.wall) // la fenêtre, du côté de la lumière
    const { bays } = GLASS_ROOM
    glassUniforms.uBays.value.set(p.x - bays.x, p.x + bays.x, p.y + bays.y)
  }

  function updateShadow(p) {
    const corners = paintingCorners(p, 'outer')
    const h = convexHull(corners.map(castOnWall))
    h.forEach((q, i) => hull[i].set(q[0], q[1]))
    wallUniforms.uHullN.value = h.length
    const front = corners.filter((c) => c.side.z === 1)
    const height = front.reduce((s, c) => s + c[2], 0) / front.length
    const penumbra = SHADOW.penumbra + SHADOW.penumbraPerCm * height
    const key = SHADOW.key * Math.exp(-height / SHADOW.keyFade) * Math.min(1, p.outer.depth / 0.6)
    wallUniforms.uPenumbra.value = penumbra + (POSE_SHADOW.penumbra - penumbra) * poseK
    wallUniforms.uKey.value = key + (POSE_SHADOW.key * Math.min(1, p.outer.depth / 0.6) - key) * poseK
    wallUniforms.uShadowTintMix.value = poseK
    wallUniforms.uAo.value.set(p.x, p.y, p.outer.width / 2, p.outer.height / 2)
    wallUniforms.uAoAmt.value = SHADOW.ao * Math.exp(-p.z / 2.5) * Math.min(1, p.outer.depth / 2)
  }

  /* Image chargée à la demande : décodée hors du fil de la page, envoyée tout de suite à la
     carte graphique (jamais en pleine animation), puis montrée en fondu. `receive` la range. */
  function lazyTexture(url, receive) {
    let state = 'none', shownAt = 0, loading = null
    return {
      load() {
        if (loading) return loading
        state = 'loading'
        loading = decodeImage(url).then((image) => {
          if (disposed) {
            closeImage(image)
            return
          }
          const texture = imageTexture(image)
          receive(texture)
          renderer.initTexture(texture)
          state = 'ready'
          shownAt = performance.now()
          if (onNeedsRender) onNeedsRender()
        }, () => { state = 'error' })
        return loading
      },
      fade: (now) => (state === 'ready' ? fadeSince(shownAt, now) : 0),
      isFading: (now) => state === 'ready' && now - shownAt < FADE_MS,
      ready: () => state === 'ready',
      // Arrivée et fondu finis, ou échec : rien ne changera plus son rendu.
      settled: (now) => state === 'error' || (state === 'ready' && now - shownAt >= FADE_MS),
    }
  }

  // Bois des cadres : chargé au repos de la page. Tant qu'il n'est pas là, le cadre a sa teinte.
  const wood = lazyTexture(woodImage, (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    frameUniforms.uMap.value = texture
  })
  // Pièce : chargée quand on touche aux tailles (la page l'annonce), sinon au premier recul.
  const roomPhoto = lazyTexture(room.image, (texture) => { wallUniforms.uRoom.value = texture })
  /* Poses de la taille (poses.js) : la photo, la femme et la lumière du mur arrivent ensemble,
     décodées hors du fil de la page, envoyées tout de suite à la carte graphique, puis montrées en
     fondu. Sans mipmaps : la photo n'est jamais beaucoup réduite à l'écran, la mémoire reste
     raisonnable (environ 17 Mo par pose). */
  const flatTexture = (image) => {
    const t = imageTexture(image)
    t.generateMipmaps = false
    t.minFilter = THREE.LinearFilter
    return t
  }
  function poseSet(size) {
    const pose = poses.bySize[size]
    const set = {
      state: 'none', shownAt: 0, photo: null, figure: null, light: null,
      clean: [pose.clean.left / poses.px[0], pose.clean.right / poses.px[0]],
      overlay: posePlacement(poses, size).overlay,
    }
    set.load = () => {
      if (set.state !== 'none') return
      set.state = 'loading'
      // Le calque garde ses couleurs telles quelles (alpha non prémultiplié) : pas de liseré sombre.
      Promise.all([decodeImage(pose.image), decodeImage(pose.figure, { premultiplyAlpha: 'none' }), decodeImage(pose.light)]).then((images) => {
        if (disposed) {
          images.forEach(closeImage)
          return
        }
        [set.photo, set.figure, set.light] = images.map(flatTexture)
        for (const texture of [set.photo, set.figure, set.light]) renderer.initTexture(texture)
        set.state = 'ready'
        set.shownAt = performance.now()
        if (onNeedsRender) onNeedsRender()
      }, () => { set.state = 'error' })
    }
    set.fade = (now) => (set.state === 'ready' ? fadeSince(set.shownAt, now) : 0)
    set.isFading = (now) => set.state === 'ready' && now - set.shownAt < FADE_MS
    set.settled = (now) => set.state === 'error' || (set.state === 'ready' && now - set.shownAt >= FADE_MS)
    set.dispose = () => {
      for (const texture of [set.photo, set.figure, set.light]) {
        if (!texture) continue
        texture.dispose()
        closeImage(texture.image)
      }
    }
    return set
  }
  const poseSets = poses ? Object.fromEntries(poseSizes.map((size) => [size, poseSet(size)])) : null

  // La pose d'une taille tout de suite ; sans taille, la suivante qui n'est pas partie, une à la fois.
  function prefetchPoses(size) {
    if (!poseSets) return
    if (size) {
      poseSets[size].load()
      return
    }
    if (poseSizes.some((s) => poseSets[s].state === 'loading')) return
    const next = poseSizes.find((s) => poseSets[s].state === 'none')
    if (next) poseSets[next].load()
  }

  /* Les deux poses les plus présentes dans la vue vont dans les places A et B (une troisième, au
     milieu de choix très rapides, leur cède sa part). Le calque de la femme ne se dessine que sur
     la silhouette du tableau, ramenée au mur depuis la caméra (sa tranche comprise). */
  const SLOTS = [
    ['uPoseA', 'uLightA', 'uCleanA', 'uFigureA', 'uFigureRectA'],
    ['uPoseB', 'uLightB', 'uCleanB', 'uFigureB', 'uFigureRectB'],
  ]
  let posesShown = poseSizes.map(() => 0) // parts des poses dans la dernière vue : seul leur fondu compte
  function updatePoses(view, now) {
    posesShown = poseSizes.map((_, i) => (view.room > 0 && view.poses ? view.poses[i] : 0))
    const shares = poseSizes.map((size, i) => {
      if (posesShown[i] > 0) poseSets[size].load()
      return posesShown[i] * poseSets[size].fade(now)
    })
    const order = poseSizes.map((_, i) => i).filter((i) => shares[i] > 0).sort((a, b) => shares[b] - shares[a]).slice(0, 2)
    const kept = order.reduce((sum, i) => sum + shares[i], 0)
    const total = shares.reduce((sum, share) => sum + share, 0)
    const weights = [0, 0]
    order.forEach((i, k) => {
      const set = poseSets[poseSizes[i]]
      const [photo, light, clean, figure, rect] = SLOTS[k]
      wallUniforms[photo].value = set.photo
      wallUniforms[light].value = set.light
      wallUniforms[clean].value.set(...set.clean)
      wallUniforms[figure].value = set.figure
      wallUniforms[rect].value.set(set.overlay.left, set.overlay.bottom, set.overlay.right, set.overlay.top)
      weights[k] = shares[i] / kept
    })
    // Les poses gardées font un tout ; la pièce est là autant que la plus prête des poses montrées
    // (une pose qui arrive se fond, une qui cède la place à une pose pas encore prête reste entière :
    // jamais d'image délavée, version 25).
    const presence = Math.max(0, ...poseSizes.map((size, i) => (posesShown[i] > 0 ? poseSets[size].fade(now) : 0)))
    wallUniforms.uPoseW.value.set(...weights)
    wallUniforms.uPoseMix.value = kept > 0 ? view.room * presence : 0
    if (kept > 0) {
      const c = camera.position
      let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity
      for (const [x, y, z] of paintingCorners(view.painting, 'outer')) {
        const k = c.z / (c.z - z)
        const wx = c.x + (x - c.x) * k, wy = c.y + (y - c.y) * k
        l = Math.min(l, x, wx)
        r = Math.max(r, x, wx)
        b = Math.min(b, y, wy)
        t = Math.max(t, y, wy)
      }
      figureUniforms.uOver.value.set(l - 0.2, b - 0.2, r + 0.2, t + 0.2)
    }
  }

  let onNeedsRender = null
  let disposed = false
  let width = 1, height = 1
  let roomShown = false

  // density : pixels du tampon par pixel CSS (voir renderDensity).
  function resize(w, h, density) {
    width = Math.max(1, w)
    height = Math.max(1, h)
    renderer.setPixelRatio(density)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
  }

  // Tout vient de la vue du directeur : caméra, pose, pièce et choix en cours (view.product).
  function useLight(k) {
    poseK = k
    const mixed = unit(roomLight.map((v, i) => v + (poseLight[i] - v) * k))
    for (let i = 0; i < 3; i++) light[i] = mixed[i]
    artUniforms.uLight.value.set(...light)
    frameUniforms.uLight.value.set(...light)
    artUniforms.uNorm.value = 1 / (SHADE.ambient + SHADE.diffuse * light[2])
    artUniforms.uShadeSide.value = light[0] > 0 ? -1 : 1
  }

  function render(view, now) {
    useLight(poseSets ? view.room : 0)
    camera.fov = (view.camera.fovY * 180) / Math.PI
    camera.position.set(...view.camera.position)
    camera.lookAt(...view.camera.target)
    camera.updateProjectionMatrix()
    updatePainting(view.painting, view.product, now)
    updateShadow(view.painting)
    roomShown = view.room > 0
    if (poseSets) {
      updatePoses(view, now) // avec les poses, la pièce ne sert pas
    } else {
      if (roomShown) roomPhoto.load()
      wallUniforms.uRoomMix.value = view.room * roomPhoto.fade(now)
    }
    finishArtSwap(now)
    updateTiles(now)
    renderer.render(scene, camera)
  }

  /* Tout se prépare ici, avant que la 3D soit visible : l'œuvre part au GPU, les programmes se
     compilent hors du fil de la page, puis une répétition installe le reste. Le premier clic
     n'a plus rien à attendre. Renvoie le coût d'une image complète (voir frameCost). */
  async function prepare(view, now) {
    renderer.initTexture(artUniforms.uArt.value)
    renderer.initTexture(marksTexture)
    await renderer.compileAsync(scene, camera)
    await rehearse(view, now)
    const framed = { ...view.painting, framed: 1 }
    const facing = { ...view, painting: { ...framed, paper: 1 } }
    // Les deux dos : la toile et son châssis, le poster encadré et son panneau (qui tourne depuis le 11/11).
    const backs = [0, 1].map((paper) => ({ ...view, painting: { ...framed, paper, yaw: Math.PI, z: view.painting.width } }))
    let cost = frameCost(facing, now)
    for (const back of backs) {
      await breathe()
      cost = Math.max(cost, frameCost(back, now))
    }
    return cost
  }

  /* Répétition : des images complètes (cadre et verre, dos de la toile, coin du poster, dos du poster
     encadré, tailles qui changent comme pendant une animation) limitées à un seul pixel. Elles ne
     coûtent rien à la carte graphique mais rodent le code : sans elles, chaque image demande 1 à 2 ms
     au lieu de 0,3 ms, et le navigateur s'interrompt 15 ms au début du premier mouvement. */
  async function rehearse(view, now) {
    const { width: w, depth: d } = view.painting
    const stances = [
      { framed: 1, paper: 0.5 },
      { yaw: 3, z: w },
      { paper: 1, curl: 0.5 },
      { framed: 1, paper: 1, yaw: 3, z: w },
    ]
    renderer.setScissorTest(true)
    renderer.setScissor(0, 0, 1, 1)
    for (let i = 0; i < REHEARSAL_FRAMES; i++) {
      const sizes = { width: w + i * 0.002, depth: d - i * 0.002 }
      render({ ...view, painting: { ...view.painting, ...sizes, ...stances[i % stances.length] } }, now)
      if (i % stances.length === stances.length - 1) await breathe()
    }
    renderer.setScissorTest(false)
  }

  // Coût d'une image, attente du GPU comprise : le meilleur de quelques essais.
  function frameCost(view, now) {
    const gl = renderer.getContext()
    const pixel = new Uint8Array(4)
    let cost = Infinity
    for (let i = 0; i < TRIAL_FRAMES; i++) {
      const start = performance.now()
      render(view, now)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      cost = Math.min(cost, performance.now() - start)
    }
    return cost
  }

  // Le papier arrive du worker après la première image : envoyé tout de suite au GPU.
  function setPaperRelief(pixels) {
    if (disposed) return
    const texture = reliefTexture(pixels)
    renderer.initTexture(texture)
    artUniforms.uPaperTex.value = texture
    if (onNeedsRender) onNeedsRender()
  }

  /* Remplace l'œuvre par une version plus détaillée, en fondu : la netteté ne saute pas.
     L'envoi au GPU prend quelques dizaines de ms : la page ne l'appelle qu'à l'arrêt. */
  let artSwap = null
  function useArtImage(image) {
    const texture = imageTexture(image)
    renderer.initTexture(texture)
    artUniforms.uArtPrev.value = artUniforms.uArt.value
    artUniforms.uArt.value = texture
    artUniforms.uArtMix.value = 0
    artSwap = { image: artImage, at: performance.now() }
    artImage = image
  }

  function finishArtSwap(now) {
    if (!artSwap) return
    artUniforms.uArtMix.value = fadeSince(artSwap.at, now)
    if (artUniforms.uArtMix.value < 1) return
    artUniforms.uArtPrev.value.dispose()
    artUniforms.uArtPrev.value = null
    closeImage(artSwap.image)
    artSwap = null
  }

  /* Pièces de détail du zoom (tilePlan) : posées sur l'œuvre dans leur rectangle (coordonnées d'image),
     par-dessus l'image en place, en fondu court. La nouvelle arrive sur l'ancienne, qui reste entière
     dessous puis s'en va : ni saut ni éclair. L'envoi au GPU prend quelques ms : la page ne l'appelle
     qu'au repos. tiles.shown : la pièce en place (leaving : l'instant où elle a commencé à s'effacer) ;
     tiles.under : la précédente. */
  const TILE_FADE_MS = 220
  const tiles = { shown: null, under: null }

  function dropTile(tile) {
    if (!tile) return
    tile.texture.dispose()
    closeImage(tile.image)
  }

  function showTile(image, rect) {
    const texture = imageTexture(image)
    renderer.initTexture(texture)
    dropTile(tiles.under)
    tiles.under = tiles.shown && tiles.shown.leaving === null ? tiles.shown : null
    if (tiles.shown && !tiles.under) dropTile(tiles.shown)
    tiles.shown = { texture, image, rect, at: performance.now(), leaving: null }
    if (onNeedsRender) onNeedsRender()
  }

  // La pièce s'efface (retour à ×1) ; sa mémoire est rendue à la fin du fondu.
  function hideTile() {
    dropTile(tiles.under)
    tiles.under = null
    if (tiles.shown && tiles.shown.leaving === null) tiles.shown.leaving = performance.now()
    if (onNeedsRender) onNeedsRender()
  }

  function updateTiles(now) {
    const { shown } = tiles
    let mix = 0
    if (shown) {
      mix = shown.leaving === null ? fadeSince(shown.at, now, TILE_FADE_MS) : 1 - fadeSince(shown.leaving, now, TILE_FADE_MS)
      if (shown.leaving !== null && mix <= 0) {
        dropTile(shown)
        tiles.shown = null
      } else if (mix >= 1 && tiles.under) {
        dropTile(tiles.under)
        tiles.under = null
      }
    }
    const current = tiles.shown
    artUniforms.uTile.value = current ? current.texture : null
    artUniforms.uTileMix.value = current ? mix : 0
    if (current) artUniforms.uTileRect.value.set(...current.rect)
    const under = tiles.under
    artUniforms.uTileOld.value = under ? under.texture : null
    artUniforms.uTileOldMix.value = under ? 1 : 0
    if (under) artUniforms.uTileOldRect.value.set(...under.rect)
  }

  const tileFading = (now) => !!tiles.shown && (tiles.shown.leaving === null ? now - tiles.shown.at < TILE_FADE_MS : true)

  // Projette un point du mur ou du tableau en pixels CSS dans le canvas.
  const tmp = new THREE.Vector3()
  function toScreen(point) {
    tmp.set(...point).project(camera)
    return { x: ((tmp.x + 1) / 2) * width, y: ((1 - tmp.y) / 2) * height }
  }

  /* Rend tout à la carte graphique : un navigateur ne garde qu'une quinzaine de contextes WebGL. La
     scène ne sert plus après. */
  function dispose() {
    disposed = true
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) object.material.dispose()
    })
    const textures = [
      artUniforms.uArt, artUniforms.uArtPrev, artUniforms.uWeave, artUniforms.uPaperTex,
      frameUniforms.uMap, wallUniforms.uRoom, backUniforms.uMarks,
    ]
    for (const { value } of textures) if (value) value.dispose()
    for (const set of Object.values(poseSets || {})) set.dispose()
    dropTile(tiles.shown)
    dropTile(tiles.under)
    closeImage(artImage)
    renderer.dispose()
    renderer.forceContextLoss()
  }

  // Seul ce qui se voit compte : un fondu hors du champ ne réclame aucune image.
  // art : compter les fondus de l'œuvre elle-même (source complète, pièce de détail : la même image,
  // plus nette), qui ne sont pas un mouvement pour la page (ses plaques, « De face »), mais demandent
  // encore des images.
  function isFading(now, { art = true } = {}) {
    const posesFading = !!poseSets && poseSizes.some((size, i) => posesShown[i] > 0 && poseSets[size].isFading(now))
    return (art && (!!artSwap || tileFading(now))) || (roomShown && (roomPhoto.isFading(now) || posesFading)) || (frameMesh.visible && wood.isFading(now))
  }

  return {
    resize,
    render,
    toScreen,
    prepare,
    setPaperRelief,
    loadWood: wood.load,
    useArtImage,
    showTile,
    hideTile,
    // L'image de l'œuvre en place (px), et la plus grande texture que la carte graphique accepte.
    artTexels: () => imageSize(artImage),
    maxTextureSize: () => renderer.capabilities.maxTextureSize,
    // La pièce de détail en place, pour les vérifications : son rectangle et sa taille, ou null.
    tile: () => (tiles.shown ? { rect: tiles.shown.rect, ...imageSize(tiles.shown.image), leaving: tiles.shown.leaving !== null } : null),
    prefetchRoom: roomPhoto.load,
    prefetchPoses,
    density: () => renderer.getPixelRatio(),
    isFading,
    dispose,
    set onNeedsRender(fn) { onNeedsRender = fn },
  }
}

/* ==== PHOTOS, HORS DE LA PAGE ==== */

/* La vue finie d'un plan, sans transition : ce que montre la fiche une fois le mouvement posé.
   group : l'option dont on veut le plan ('border', 'frame', 'size'…), rien pour la vue de face. */
export function stillView({ room, product, group, aspect }) {
  const director = createDirector({ room, product, reducedMotion: true })
  if (group) director.choose(group, product, 0)
  return director.view(0, aspect)
}

/* Une photo de la scène, pour le serveur (ticket 08) : le même createScene et la même vue que la
   fiche, sur un canvas qui n'a pas besoin d'être dans une page. Renvoie un Blob.
   options : celles de createScene, plus product, group, width, height et density. */
export async function renderStill(THREE, { product, group, width, height, density = 1, type = 'image/png', quality, ...assets }) {
  const scene = createScene(THREE, assets)
  try {
    scene.resize(width, height, density)
    await scene.loadWood()
    const view = stillView({ room: assets.room, product, group, aspect: width / height })
    // Bien après le fondu d'arrivée du bois : la photo montre son état final.
    scene.render(view, performance.now() + FADE_MS)
    const { canvas } = assets
    if (canvas.convertToBlob) return await canvas.convertToBlob({ type, quality })
    return await new Promise((resolve) => { canvas.toBlob(resolve, type, quality) })
  } finally {
    scene.dispose()
  }
}

/* ==== WORKER ==== */

// Lancé comme worker par startReliefs : la trame d'abord, le papier ensuite.
if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  const send = (name, pixels) => postMessage({ name, pixels }, [pixels.buffer])
  send('weave', weavePixels())
  send('paper', paperPixels())
}
