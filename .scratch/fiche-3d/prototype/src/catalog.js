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

export const BORDERS = [
  { id: 'blanche', label: 'Blanche', add: 0 },
  { id: 'noire', label: 'Noire', add: 2 },
  { id: 'etiree', label: 'Étirée', add: 4 },
  { id: 'miroir', label: 'Miroir', add: 6 },
  { id: 'pliee', label: 'Pliée', add: 8 },
]

export const FRAMES = [
  { id: 'sans', label: 'Sans cadre' },
  { id: 'noir', label: 'Noir mat' },
  { id: 'chene', label: 'Chêne clair' },
]

const TOILE_BASE = { '30x40': 62.5, '75x100': 136.5 } // bordure blanche, sans cadre
const TOILE_FRAME_ADD = { sans: 0, noir: 40, chene: 50 }
const POSTER_PRICE = {
  '30x40': { sans: 24.9, avec: 47.9 },
  '75x100': { sans: 64.9, avec: 159.9 },
}

export function priceOf(product) {
  if (product.material === 'poster') {
    return POSTER_PRICE[product.size][product.frame === 'sans' ? 'sans' : 'avec']
  }
  const border = BORDERS.find((b) => b.id === product.border)
  return TOILE_BASE[product.size] + (border ? border.add : 0) + TOILE_FRAME_ADD[product.frame]
}

export function hasFrame(product) {
  return product.frame !== 'sans'
}
