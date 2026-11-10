/*
 * Mise en scène de la taille (choix de Walid du 10/11) : une femme se tient à côté du tableau, une
 * pose par taille. Elle remplace le grand salon, où le 30 × 40 semblait ridicule sur un mur immense.
 *
 * Photos de la version 23 : la vraie photo de chaque pose, retouchée par Gemini et validée par Walid,
 * pièce meublée (olivier à gauche, banc en chêne sous le tableau avec livres, bol et vase à branches
 * sèches, lampadaire et panier à droite), mur propre. 4800 × 3584 px, 16 px/cm dans le plan du mur
 * (300 cm de mur sur la largeur), même appareil sur les quatre ; pied du mur vers 3222 px (3226 mesurés,
 * 0,25 cm d'écart). Rectangle blanc aux places d'avant, sauf en 60 × 80 (sans rectangle, même place).
 *
 * Préparées sur le PC par tools/poses-detourer.py et tools/poses-preparer.py (ticket 12), publiées à
 * 2400 px de large : balance des blancs (le mur des quatre au même blanc chaud), rectangle blanc
 * effacé (le mur refait à sa place), et
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
  px: [4800, 3584],
  pxPerCm: 16,
  floorPx: 3222,
  // À côté d'elle, les tableaux paraissent 20 % plus grands que sur ses photos (retour de Walid sur la
  // version 21 : elle paraissait mesurer 1,80 m). Les cotes gardent les vraies mesures.
  scale: 1.2,
  // Vers la lumière des photos : elle vient de la droite de l'image (de la gauche de la femme) ; son
  // ombre tombe sur le mur à sa droite. L'ombre du tableau tombe donc à gauche et vers le bas (0,9 et
  // 1,1 cm pour une toile de 2 cm). Pour l'inverser : changer le signe du premier nombre.
  light: [0.36, 0.44, 0.82],
  bySize: {
    '30x40': pose('30x40', {
      rect: [1776, 504, 480, 640],
      person: [2361, 640, 3846, 3540],
      head: [3198, 640, 3703, 1024],
      overlay: [1584, 280, 1588, 284],
      clean: { left: 0, right: 0 },
    }),
    '60x80': pose('60x80', {
      rect: [1320, 184, 960, 1280],
      person: [2337, 639, 3868, 3546],
      head: [3175, 639, 3702, 1023],
      overlay: [1032, 1380, 2376, 1492],
      clean: { left: 0, right: 0 },
    }),
    '75x100': pose('75x100', {
      rect: [1200, 24, 1200, 1600],
      person: [2374, 637, 3783, 3542],
      head: [3232, 637, 3714, 1021],
      overlay: [864, 1080, 2496, 1760],
      clean: { left: 0, right: 0 },
    }),
    '90x120': pose('90x120', {
      rect: [1080, 26, 1440, 1920],
      person: [2219, 663, 4800, 3542],
      head: [3211, 663, 3711, 1047],
      overlay: [696, 950, 2616, 2100],
      clean: { left: 0, right: 0 },
      reach: { body: 3710, elbow: 4110, wrist: 4420 },
    }),
  },
}
