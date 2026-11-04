/*
 * Marques imprimées au dos de la toile : le logo de MyselfMonArt au milieu de la bande du bas ;
 * en bas à droite, sur la bande verticale, un code carré décoratif et le format. Elles gardent
 * la même taille réelle sur tous les formats. Tout est dessiné ici : rien à télécharger.
 */

import { backLayout } from './geometry.js'
import { SIZES } from './catalog.js'

// Tailles réelles, en cm. free : distance au bord où finit le retour d'image.
export const MARKS = { logo: 1.5, code: 1.1, textHeight: 0.4, gap: 0.1, free: 0.5 }
const ABOVE_FREE = 0.15 // le code se pose un peu au-dessus du retour d'image
const STAPLE_CLEARANCE = 1.3 // de la dernière marque au milieu de l'agrafe du coin

/* Boîtes des marques, en cm, telles qu'on les voit de dos : x vers la droite du regard, y vers
   le haut, origine au milieu du tableau. Le texte, tourné d'un quart de tour, longe le code. */
export function marksLayout(W, H, textLength) {
  const { band, cornerStapleInset } = backLayout(W, H)
  const { logo, code, textHeight, gap, free } = MARKS
  const middle = (free + band) / 2 // milieu de la partie libre d'une bande
  const bottom = -H / 2
  const codeX = W / 2 - middle + (code + gap + textHeight) / 2 - code
  const codeY = bottom + free + ABOVE_FREE
  const markedHeight = free + ABOVE_FREE + Math.max(code, textLength)
  return {
    logo: { x: -logo / 2, y: bottom + middle - logo / 2, width: logo, height: logo },
    code: { x: codeX, y: codeY, width: code, height: code },
    text: { x: codeX - gap - textHeight, y: codeY, width: textHeight, height: textLength },
    markedCornerInset: Math.max(cornerStapleInset, markedHeight + STAPLE_CLEARANCE),
  }
}

export const sizeText = (size) => `${size.replace('x', '×')} cm`

const CODE_CELLS = 16

/* Code carré de type Datamatrix : bords gauche et bas pleins, bords haut et droit en pointillés,
   et un motif fixe sans aucun contenu. Il est décoratif : il ne se lit pas. */
export function dataMatrixCells() {
  const n = CODE_CELLS
  let seed = 20261104
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

const CODE_BLUE = '#1b2c54'
const ATLAS = { width: 1024, logo: 256, codeCell: 11, textRow: 64, textPxPerCm: 160, margin: 16 }

/* Planche des marques sur fond blanc : le shader la multiplie au tissu, comme une encre. Le
   texte de chaque format y a sa ligne, pour que changer de taille ne redessine rien.
   Renvoie les zones de la planche (x, y, largeur, hauteur, de 0 à 1) et la longueur de chaque
   texte en cm. */
export function paintMarks(canvas) {
  const { width: W, logo, codeCell, textRow, textPxPerCm, margin } = ATLAS
  const H = Math.max(logo, SIZES.length * textRow)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  const area = (x, y, w, h) => [x / W, y / H, w / W, h / H]

  drawLogo(ctx, logo)

  const cells = dataMatrixCells()
  const codeX = logo + margin
  const code = cells.length * codeCell
  ctx.fillStyle = CODE_BLUE
  cells.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) ctx.fillRect(codeX + x * codeCell, y * codeCell, codeCell, codeCell)
  }))

  const textX = codeX + code + margin
  ctx.font = `600 ${textRow * 0.7}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  const text = {}
  SIZES.forEach((size, i) => {
    const words = sizeText(size)
    const length = Math.ceil(ctx.measureText(words).width)
    ctx.fillText(words, textX, (i + 0.5) * textRow)
    text[size] = { area: area(textX, i * textRow, length, textRow), length: length / textPxPerCm }
  })
  return { logo: area(0, 0, logo, logo), code: area(codeX, 0, code, code), text }
}
