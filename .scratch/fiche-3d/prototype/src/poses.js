/*
 * Mise en scène de la taille (choix de Walid du 10/11) : une femme se tient à côté du tableau, une
 * pose par taille. Elle remplace le grand salon, où le 30 × 40 semblait ridicule sur un mur immense.
 *
 * Photos de la version 24 : la vraie photo de chaque pose, retouchée par Gemini et validée par Walid,
 * pièce meublée (olivier entier à gauche, banc en chêne sous le tableau avec livres, bol et vase à
 * branches sèches, panier et lampadaire entier à droite), mur propre ; en 21:9 (choix de Walid pour
 * la version 24), pour que l'ordinateur ne voie plus le bord des photos : mur, plinthe et parquet nus
 * jusqu'aux deux bords. 6336 × 2688 px, 12 px/cm dans le plan du mur (528 cm de mur sur la largeur ;
 * mesuré sur la hauteur des rectangles blancs, de 11,96 à 12,1), pied du mur vers 2422 px (2420 à
 * 2427 mesurés). Gemini a recomposé la pièce : les meubles bougent un peu d'une photo à l'autre.
 *
 * Préparées sur le PC par tools/poses-detourer.py et tools/poses-preparer.py (ticket 12), publiées à
 * 3168 px de large (6 px par cm de mur) : balance des blancs (le mur des quatre au même blanc chaud),
 * rectangle blanc effacé (le mur refait à sa place), et
 * - image : la photo, la femme et les meubles compris ;
 * - figure : ce qui passe devant le tableau, là seulement où il peut aller : la femme (détourée par
 *   BiRefNet, licence MIT), les feuilles de l'olivier et les branches du vase (clé de couleur sur le
 *   mur blanc), leurs couleurs estimées sans le mur. Le moteur les repose sur le tableau (sa main
 *   passe devant le 90 × 120, les feuilles devant le 75 × 100 et le 90 × 120) ;
 * - light : la lumière du mur sans eux, en cases d'environ 3 cm, pour prolonger la photo au-delà de
 *   ses bords sans creux de lumière, et éclairer le tableau comme le mur.
 *
 * Le tableau paraît scale fois plus grand à côté d'elle (la photo est réduite d'autant autour de lui,
 * staging.js) ; il garde ses vraies mesures et son coin bas côté femme, au coin du rectangle : ses
 * mains le présentent comme sur la photo.
 *
 * Valeurs en px de la photo d'origine. rect : le rectangle du tableau (left, top, width, height).
 * person, head : la femme et sa tête, cheveux compris (left, top, right, bottom), pour le cadrage.
 * overlay : la zone du calque figure. clean : largeur sans rien devant le mur le long des bords
 * gauche et droit, recopiée en miroir au-delà de la photo (0 : un objet au bord, le mur s'y prolonge
 * uni, la photo s'y fond). Au-dessus de la photo, le mur se prolonge toujours uni.
 * reach : son bras lointain (à droite de l'image, côté lampadaire), quand il s'écarte d'elle (bras
 * ouverts du 90 × 120) : le bord de son corps, son coude et son poignet (x), mesurés sur le masque
 * (profil des colonnes : le coude au plus bas du bras, le poignet là où il est le plus fin). Le
 * cadrage peut le couper (staging.js), jamais à un coude ni à un poignet.
 */

const pose = (size, data) => ({
  image: `assets/poses/pose-${size}.jpg`,
  figure: `assets/poses/pose-${size}-femme.webp`,
  light: `assets/poses/pose-${size}-lumiere.png`,
  ...data,
})

export const POSES = {
  px: [6336, 2688],
  pxPerCm: 12,
  floorPx: 2422,
  // À côté d'elle, les tableaux paraissent 20 % plus grands que sur ses photos (retour de Walid sur la
  // version 21 : elle paraissait mesurer 1,80 m). Les cotes gardent les vraies mesures.
  scale: 1.2,
  // Vers la lumière des photos : elle vient de la droite de l'image (de la gauche de la femme) ; son
  // ombre tombe sur le mur à sa droite. L'ombre du tableau tombe donc à gauche et vers le bas (0,9 et
  // 1,1 cm pour une toile de 2 cm). Pour l'inverser : changer le signe du premier nombre.
  light: [0.36, 0.44, 0.82],
  // Le mur de face (sRGB), celui des photos autour du tableau : leur balance des blancs l'y ramène
  // sur les quatre (blanc chaud, luminosité 218 ; tools/poses-preparer.py). Le passage de la pièce au
  // mur de face, à la fin du retour, se voit ainsi à peine (version 25).
  wall: [223, 217, 207],
  bySize: {
    '30x40': pose('30x40', {
      rect: [2676, 376, 378, 484],
      person: [3138, 479, 4298, 2651],
      head: [3792, 479, 4183, 767],
      overlay: [2528, 208, 2532, 212],
      clean: { left: 1000, right: 1030 },
    }),
    '60x80': pose('60x80', {
      rect: [2362, 141, 717, 957],
      person: [3121, 479, 4262, 2663],
      head: [3750, 479, 4131, 767],
      overlay: [2146, 1036, 3152, 1118],
      clean: { left: 976, right: 1128 },
    }),
    '75x100': pose('75x100', {
      rect: [2267, 21, 878, 1198],
      person: [3145, 479, 4184, 2652],
      head: [3770, 479, 4135, 767],
      overlay: [2020, 814, 3216, 1320],
      clean: { left: 1014, right: 1104 },
    }),
    '90x120': pose('90x120', {
      rect: [2175, 20, 1075, 1441],
      person: [3250, 497, 4957, 2667],
      head: [3759, 497, 4142, 785],
      overlay: [1888, 716, 3322, 1576],
      clean: { left: 1002, right: 1130 },
      reach: { body: 4180, elbow: 4414, wrist: 4665 },
    }),
  },
}
