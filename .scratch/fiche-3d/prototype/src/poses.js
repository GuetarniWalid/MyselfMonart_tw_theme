/*
 * Mise en scène de la taille (choix de Walid du 10/11) : une femme se tient à côté du tableau, sur
 * un mur clair, avec une pose par taille. Elle remplace le grand salon, où le 30 × 40 semblait
 * ridicule sur un mur immense.
 *
 * Photos générées par Gemini avec le banc des pièces du backend, validées par Walid : 4800 × 3584 px
 * (4:3), 16 px/cm dans le plan du mur (300 cm de mur sur la largeur), même mur, même plinthe, même
 * parquet et même appareil sur les quatre. Le pied du mur est à 3222 px du haut (mesuré sur les
 * quatre photos ; le centre du 90 × 120 tombe ainsi à 140 cm du sol).
 *
 * Préparées sur le PC par tools/poses-detourer.py et tools/poses-preparer.py (ticket 12) : le
 * rectangle blanc qui marquait la place du tableau et un trait de crayon sous lui sont effacés (le
 * mur refait à leur place), la femme est détourée par BiRefNet (licence MIT), et les fichiers
 * publiés font 2400 px de large :
 * - image : la photo, la femme comprise ;
 * - figure : la femme seule (ses couleurs sans le mur, et son détourage), là seulement où le tableau
 *   et son ombre peuvent passer. Le moteur la repose sur le tableau (sa main passe devant le
 *   90 × 120) et l'ombre du tableau ne tombe pas sur elle ;
 * - light : la lumière du mur sans la femme, en cases d'environ 3 cm, pour prolonger la photo
 *   au-delà de ses bords sans creux de lumière.
 *
 * Valeurs en px de la photo d'origine. rect : le rectangle du tableau (left, top, width, height).
 * person, head : la femme et sa tête, cheveux compris (left, top, right, bottom), pour le cadrage.
 * overlay : la zone du calque figure. clean : largeur sans la femme le long des bords gauche, droit
 * et haut, recopiée en miroir au-delà de la photo.
 */

const pose = (size, data) => ({
  image: `assets/poses/pose-${size}.jpg`,
  figure: `assets/poses/pose-${size}-femme.png`,
  light: `assets/poses/pose-${size}-lumiere.png`,
  ...data,
})

export const POSES = {
  px: [4800, 3584],
  pxPerCm: 16,
  floorPx: 3222,
  bySize: {
    '30x40': pose('30x40', {
      rect: [1776, 504, 480, 640],
      person: [2290, 592, 3765, 3543],
      head: [3120, 592, 3626, 976],
      overlay: [2286, 1160, 2808, 1636],
      clean: { left: 2242, right: 987, top: 544 },
    }),
    '60x80': pose('60x80', {
      rect: [1320, 184, 960, 1280],
      person: [2330, 640, 3860, 3547],
      head: [3165, 640, 3700, 1024],
      overlay: [2326, 1424, 2808, 1708],
      clean: { left: 2282, right: 892, top: 592 },
    }),
    '75x100': pose('75x100', {
      rect: [1200, 24, 1200, 1600],
      person: [2267, 639, 3684, 3549],
      head: [3089, 639, 3583, 1023],
      overlay: [2262, 1608, 2808, 1784],
      clean: { left: 2219, right: 1068, top: 591 },
    }),
    '90x120': pose('90x120', {
      rect: [1080, 26, 1440, 1920],
      person: [2205, 623, 4563, 3535],
      head: [3151, 623, 3640, 1007],
      overlay: [2200, 1416, 2808, 1728],
      clean: { left: 2157, right: 189, top: 575 },
    }),
  },
}
