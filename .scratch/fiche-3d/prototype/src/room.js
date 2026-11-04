/*
 * Pièce provisoire, en attendant la bibliothèque du ticket 11. Réglée une fois, à la main :
 * position du mur, échelle en cm, lumière, zone d'accrochage (méthode à confirmer pour les
 * pièces générées par Gemini).
 *
 * Photo : « a couch with pillows and a potted plant », dada design, sur Unsplash, sous la
 * licence Unsplash (usage commercial permis, sans attribution obligatoire ; interdit de la
 * revendre telle quelle). C'est un rendu photoréaliste, pas une photo de reportage.
 */

const PX = [2400, 1350] // taille du fichier publié
const PX_PER_CM = 6.6 // au plan du mur : dossier du canapé (91 cm) et assise (42 cm)
const FLOOR_PX = 1216 // ligne du pied du mur, depuis le haut de l'image

export const ROOM = {
  image: 'assets/piece-salon-canape.jpg',
  // Où est le mur sur la photo (tools/mur-piece.js) : le mur choisi y remplace celui de la photo.
  wallMask: 'assets/piece-salon-canape-mur.png',
  credit: {
    title: 'a couch with pillows and a potted plant',
    author: 'dada design',
    url: 'https://unsplash.com/photos/a-couch-with-pillows-and-a-potted-plant-o5GiFSl5iYw',
    license: 'https://unsplash.com/license',
  },
  // Rectangle de la photo sur le mur, en cm : x depuis son bord gauche, y depuis le sol.
  photo: {
    left: 0,
    right: PX[0] / PX_PER_CM,
    bottom: -(PX[1] - FLOOR_PX) / PX_PER_CM,
    top: FLOOR_PX / PX_PER_CM,
  },
  // Accrochage au-dessus du milieu du canapé : bas du tableau à 20 cm du dossier (91 cm),
  // quelle que soit la taille (un centre à 145 cm laissait le 30 × 40 flotter trop haut).
  hang: { x: 121, minBottom: 111, center: 130 },
  // Cadrage du recul : du sol jusqu'à 238 cm.
  view: { bottom: -12, height: 250 },
  // Vers la lumière : fenêtre à gauche (le mur passe de 236 à 229 de gauche à droite).
  light: [-0.5, 0.45, 0.74],
  // Couleur du mur au droit de l'accrochage (sRGB) et pente de luminosité par cm vers la
  // droite : le mur uni de l'arrivée se fond ainsi dans la photo.
  wall: [233, 233, 232],
  wallSlope: -0.00023,
}
