/*
 * Données du Bonsaï et des matières (module pur). Prix lus le 03/11/2026 dans Shopify
 * (toile 10807148708187, poster 10807154082139). Dimensions en cm.
 */

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

export const SIZES = ['30x40', '75x100']

// Taille d'option (« 30x40 ») : largeur et hauteur en cm, et libellé affiché.
export function dimensionsOf(size) {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

export const sizeLabel = (size) => `${size.replace('x', ' × ')} cm`

/* Bordures et cadres. `color` (sRGB) sert à la fois à la pastille de l'option et au
   moteur ; null : la bordure reprend l'image, ou il n'y a pas de cadre. */
export const BORDERS = [
  { id: 'blanche', label: 'Blanche', add: 0, color: '#efede8' },
  { id: 'noire', label: 'Noire', add: 2, color: '#272727' },
  { id: 'etiree', label: 'Étirée', add: 4, color: null },
  { id: 'miroir', label: 'Miroir', add: 6, color: null },
  { id: 'pliee', label: 'Pliée', add: 8, color: null },
]

export const PAPER_WHITE = '#f7f6f2'

/* Matière des cadres. wood : part de l'image de bois ; relief : fil du bois sous la
   lumière ; rough : 0 brillant, 1 mat. */
export const FRAMES = [
  { id: 'sans', label: 'Sans cadre', posterLabel: 'Sans cadre', color: null },
  { id: 'noir', label: 'Noir mat', posterLabel: 'Noir', color: '#1f1f21', wood: 0, relief: 0.5, rough: 0.68 },
  { id: 'chene', label: 'Chêne clair', posterLabel: 'Chêne clair', color: '#c9a77c', wood: 1, relief: 0.9, rough: 0.55 },
]

export const borderOf = (id) => BORDERS.find((b) => b.id === id) || BORDERS[0]
export const frameOf = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0]

const TOILE_BASE = { '30x40': 62.5, '75x100': 136.5 } // bordure blanche, sans cadre
const TOILE_FRAME_ADD = { sans: 0, noir: 40, chene: 50 }
const POSTER_PRICE = {
  '30x40': { sans: 24.9, avec: 47.9 },
  '75x100': { sans: 64.9, avec: 159.9 },
}

export function hasFrame(product) {
  return product.frame !== 'sans'
}

export function priceOf(product) {
  if (product.material === 'poster') return POSTER_PRICE[product.size][hasFrame(product) ? 'avec' : 'sans']
  return TOILE_BASE[product.size] + borderOf(product.border).add + TOILE_FRAME_ADD[product.frame]
}

// Résumé affiché sous le titre, et lu par le lecteur d'écran sur la 3D.
export function describe(product) {
  const size = sizeLabel(product.size)
  const frame = frameOf(product.frame)
  if (product.material === 'poster') {
    const framing = hasFrame(product) ? `cadre ${frame.posterLabel.toLowerCase()}` : 'sans cadre'
    return `Poster ${size} · ${framing} · ${product.passe ? 'contour blanc' : 'sans contour'}`
  }
  const framing = hasFrame(product) ? `cadre ${frame.label.toLowerCase()}` : 'sans cadre'
  return `Toile ${size} · bordure ${borderOf(product.border).label.toLowerCase()} · ${framing}`
}
