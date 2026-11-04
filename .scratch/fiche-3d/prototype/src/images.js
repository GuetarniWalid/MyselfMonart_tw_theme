/*
 * Image décodée hors du fil de la page. Par un ImageBitmap, l'envoi au GPU est 6 fois plus
 * court que par un <img> (27 ms contre 178 ms pour 1904 × 2544 px), et ne bloque presque
 * rien. Les deux chemins donnent une image à l'endroit : les textures ne sont jamais
 * retournées (voir artBox), car l'option de retournement n'est pas suivie partout.
 */

function viaElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

export async function decodeImage(url) {
  if (!('createImageBitmap' in window)) return viaElement(url)
  try {
    const response = await fetch(url)
    return await createImageBitmap(await response.blob())
  } catch {
    return viaElement(url)
  }
}
