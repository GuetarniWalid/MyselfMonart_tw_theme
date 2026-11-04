/*
 * Outil de cuisson (jamais publié) : trouve le mur de la photo d'une pièce. L'image obtenue
 * devient assets/piece-salon-canape-mur.png, un masque en niveaux de gris : blanc sur le mur,
 * noir sur le reste. Le moteur y pose le mur choisi en gardant la lumière de la photo.
 * Le mur est lisse et le meuble a un bord : on part de points posés à la main sur le mur (un par
 * morceau, les pieds du canapé le coupent) et on s'étend tant que l'image ne marque pas de bord.
 * Cuisson, dans une page du navigateur : dessiner la photo sur un canvas 2D de 1200 × 675, passer
 * ses pixels à wallMask avec SALON, poser le résultat sur un canvas, puis toBlob(save, 'image/png').
 */

const EDGE = 2 // écart de luminosité où l'image marque un bord
const WARM = 22 // écart rouge-bleu au-delà duquel ce n'est plus le mur

// Réglages de la pièce provisoire : ligne du sol, et un point par morceau de mur.
export const SALON = {
  floor: 1216 / 1350,
  seeds: [[0.5, 0.2], [0.9, 0.5], [0.9, 0.85], [0.5, 0.875], [0.03, 0.874], [0.06, 0.874], [0.627, 0.874]],
}

// Luminosité adoucie sur 3 × 3 pixels : le grain de la photo ne doit pas faire de faux bords.
function softLuminosity(rgba, width, height) {
  const raw = new Float32Array(width * height)
  for (let i = 0; i < raw.length; i++) raw[i] = 0.2126 * rgba[4 * i] + 0.7152 * rgba[4 * i + 1] + 0.0722 * rgba[4 * i + 2]
  return average(raw, width, height, 1)
}

// Force du bord en chaque pixel : plus grand écart de luminosité à deux pixels de distance.
function edgeStrength(soft, width, height) {
  const edge = new Float32Array(soft.length)
  const at = (x, y) => soft[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      edge[y * width + x] = Math.max(Math.abs(at(x + 2, y) - at(x - 2, y)), Math.abs(at(x, y + 2) - at(x, y - 2)))
    }
  }
  return edge
}

// Moyenne d'une zone sur un carré de rayon donné.
function average(zone, width, height, radius) {
  const out = new Float32Array(zone.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, n = 0
      for (let v = Math.max(0, y - radius); v <= Math.min(height - 1, y + radius); v++) {
        for (let u = Math.max(0, x - radius); u <= Math.min(width - 1, x + radius); u++) {
          sum += zone[v * width + u]
          n++
        }
      }
      out[y * width + x] = sum / n
    }
  }
  return out
}

// Grandit (ou rétrécit) une zone d'un pixel, en croix.
function morph(zone, width, height, widen) {
  const out = new Uint8Array(zone.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const around = [zone[i], x > 0 ? zone[i - 1] : zone[i], x + 1 < width ? zone[i + 1] : zone[i],
        y > 0 ? zone[i - width] : zone[i], y + 1 < height ? zone[i + width] : zone[i]]
      out[i] = widen ? Math.max(...around) : Math.min(...around)
    }
  }
  return out
}

/* rgba : pixels de la photo. seeds : points [x, y] posés sur le mur, en part de la largeur et de
   la hauteur. floor : au-dessous de cette part de la hauteur, plus de mur. grow : pixels gagnés à
   la fin, pour rejoindre le milieu du bord. Renvoie un octet par pixel. */
export function wallMask(rgba, width, height, { seeds, floor = 1, grow = 2 }) {
  const strength = edgeStrength(softLuminosity(rgba, width, height), width, height)
  const lowest = Math.floor(floor * height)
  const open = (i) => {
    const y = Math.floor(i / width)
    return y < lowest && strength[i] < EDGE && rgba[4 * i] - rgba[4 * i + 2] < WARM
  }
  let zone = new Uint8Array(width * height)
  const stack = seeds.map(([x, y]) => Math.floor(y * height) * width + Math.floor(x * width))
  while (stack.length) {
    const i = stack.pop()
    if (zone[i] || !open(i)) continue
    zone[i] = 1
    const x = i % width
    if (x > 0) stack.push(i - 1)
    if (x + 1 < width) stack.push(i + 1)
    if (i >= width) stack.push(i - width)
    if (i + width < zone.length) stack.push(i + width)
  }
  // Referme les petits trous du grain, puis rejoint le bord des meubles.
  for (let k = 0; k < 2; k++) zone = morph(zone, width, height, true)
  for (let k = 0; k < 2; k++) zone = morph(zone, width, height, false)
  for (let k = 0; k < grow; k++) zone = morph(zone, width, height, true)
  // Le contour suivait le grain de la photo : on l'arrondit, puis son bord se lisse sur trois pixels.
  zone = average(zone, width, height, 3).map((v) => (v > 0.5 ? 1 : 0))
  const mask = Uint8Array.from(average(zone, width, height, 1), (v) => Math.round(255 * v))
  return mask.fill(0, lowest * width) // rien sous la ligne du sol, même lissé
}
