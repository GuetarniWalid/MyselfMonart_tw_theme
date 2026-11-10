/*
 * Images décodées hors du fil de la page. Par un ImageBitmap, l'envoi au GPU est 6 fois plus
 * court que par un <img> (27 ms contre 178 ms pour 1904 × 2544 px) et ne bloque presque
 * rien. Les deux chemins donnent une image à l'endroit : les textures ne sont jamais
 * retournées (voir artBox), car l'option de retournement n'est pas suivie partout.
 */

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

// source : adresse d'une image, ou <img> déjà chargée (rien n'est retéléchargé). options : celles
// de createImageBitmap (un calque détouré garde son alpha non prémultiplié).
export async function decodeImage(source, options) {
  const loaded = typeof source !== 'string'
  if (!('createImageBitmap' in window)) return loaded ? source : viaElement(source)
  try {
    if (loaded) return await createImageBitmap(source, options)
    const response = await fetch(source)
    return await createImageBitmap(await response.blob(), options)
  } catch {
    return loaded ? source : viaElement(source)
  }
}

export function imageSize(image) {
  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
}
