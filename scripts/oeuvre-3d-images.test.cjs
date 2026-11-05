// Téléchargement des images du moteur : le CDN de Shopify choisit le format d'après l'en-tête Accept.
// Lancer : node --test scripts/oeuvre-3d-images.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { decodeImage } = require('../assets/oeuvre-3d-engine.js')

test('une image demandée par adresse annonce les formats légers : sinon le CDN renvoie le PNG d’origine', async (t) => {
  const asked = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    asked.push({ url, accept: new Headers(options && options.headers).get('accept') })
    return { blob: async () => 'octets' }
  })
  globalThis.createImageBitmap = async (blob) => ({ blob })
  t.after(() => { delete globalThis.createImageBitmap })

  const image = await decodeImage('https://example.test/oeuvre.png?width=2000')

  assert.equal(image.blob, 'octets')
  assert.equal(asked[0].url, 'https://example.test/oeuvre.png?width=2000')
  assert.match(asked[0].accept, /image\/webp/)
  assert.match(asked[0].accept, /image\/avif/)
})

test('une image déjà affichée n’est pas retéléchargée', async (t) => {
  const fetched = t.mock.method(globalThis, 'fetch', async () => { throw new Error('rien à télécharger') })
  globalThis.createImageBitmap = async (source) => ({ source })
  t.after(() => { delete globalThis.createImageBitmap })

  const shown = { naturalWidth: 750 }
  const image = await decodeImage(shown)

  assert.equal(image.source, shown)
  assert.equal(fetched.mock.callCount(), 0)
})
