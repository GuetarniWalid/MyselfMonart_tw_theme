// Les couleurs du temps 2 de la scène de la page galerie (dossier .scratch/fiche-3d/galerie, ticket 21) : « Chaque
// couleur agit sur vous ». L'œuvre passe en gris pâle, puis chacune de ses couleurs revient seule, avec sa pastille
// et sa phrase. Le serveur écrit les phrases dans la section (sections/galerie-scene.liquid) ; l'élément
// <galerie-couleurs> (assets/oeuvre-galerie.js) trouve les couleurs dans l'image, hors du fil principal, avec le
// moteur de la page d'essai (assets/galerie-couleurs.js, le même que celui du serveur).
// Ici : le moteur, les calculs purs du script, le texte du travailleur (joué dans un bac à sable), les contrats de la
// feuille et du script, puis le rendu Liquid (liquidjs), quand le module est là.
// Lancer : node --test scripts/galerie-couleurs.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const zlib = require('zlib')
const { ROOT, read, exists, code, rules, LANGS, json, schemaOf, SKIP, engine, globals, product, renderSectionFile } = require('./galerie-banc.cjs')
const { entreeDuMoteur, momentsDesCouleurs, lireLesCouleurs, planDesCouleurs, texteDuTravailleur } = require('../assets/oeuvre-galerie.js')

const SECTION = 'sections/galerie-scene.liquid'
const CSS = 'assets/oeuvre-galerie.css'
const JS = 'assets/oeuvre-galerie.js'
const MOTEUR = 'assets/galerie-couleurs.js'
// Le moteur de la page d'essai, tel que Walid l'a validé le 20/11/2026, et son empreinte : celle que vérifie le
// serveur pour sa copie (dépôt du backend, tests/golden/artwork-colors.js, app/Services/ArtworkColors/couleurs.ts).
const ESSAI = '.scratch/fiche-3d/galerie/couleurs/couleurs.js'
const EMPREINTE = '58c19596165179587ae3285b7f58ed970f93c7b25209dfb4fc12353ea570729e'
const LARGE = '@media (min-width: 900px)'

// Le moteur, chargé comme dans une page : il se pose sur l'objet global.
require(`../${MOTEUR}`)
const Couleurs = globalThis.Couleurs

/* Le bloc des couleurs dans la feuille ou le script de la page : entre ses deux repères. */
const blockOf = (file) => {
  const source = read(file)
  const start = source.indexOf('/* === Couleurs de la scène (ticket 21) : début ===')
  const end = source.indexOf('/* === Couleurs de la scène (ticket 21) : fin === */')
  assert.ok(start >= 0 && end > start, `${file} : le bloc des couleurs, entre ses deux repères`)
  return source.slice(start, end)
}
const sheet = () => rules(blockOf(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))
const script = () => blockOf(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
const body = (head, context = '') => {
  const found = sheet().find((r) => r.head.replace(/\s+/g, ' ') === head && r.context.join() === context)
  assert.ok(found, `règle « ${head} »${context ? ` dans ${context}` : ''}`)
  return found.body.replace(/\s+/g, ' ').trim()
}
const value = (text, name) => (new RegExp(`(?:^|[;\\s])--${name}:\\s*([^;]+);`).exec(text) || [])[1]

/* ---------- Des images d'essai ---------- */

// Des couleurs franches, prises dans celles que le moteur range sous chaque couleur principale.
const TEINTES = { noir: [0, 0, 0], blanc: [255, 255, 255], bleu: [21, 101, 192], rose: [233, 30, 99], jaune: [255, 215, 0], rouge: [211, 47, 47], vert: [46, 125, 50], dore: [212, 154, 6] }
/* Une image de 320 × 240 en bandes unies, de gauche à droite : chaque teinte et sa part. */
function bandes(liste, largeur = 320, hauteur = 240) {
  const pixels = new Uint8ClampedArray(largeur * hauteur * 4)
  const bornes = []
  let cumul = 0
  for (const [teinte, part] of liste) bornes.push([(cumul += part) * largeur, TEINTES[teinte]])
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const [r, g, b] = (bornes.find(([borne]) => x < borne) || bornes[bornes.length - 1])[1]
      pixels.set([r, g, b, 255], (y * largeur + x) * 4)
    }
  }
  return { pixels, largeur, hauteur }
}
/* La moyenne d'un masque sur des colonnes [de, à[ de l'image. */
const moyenne = (alpha, largeur, de, a) => {
  let somme = 0
  let nombre = 0
  for (let i = 0; i < alpha.length; i++) {
    const x = i % largeur
    if (x >= de && x < a) { somme += alpha[i]; nombre++ }
  }
  return somme / nombre
}

/* Le zèbre de la page d'essai (« Noir & Blanc » déclaré), ramené à 160 px de large dans Chrome comme la page lit une
   image, en PNG (scripts/fixtures/galerie-zebre-160.png, 40 Ko). À 160 px, le moteur y lit ce qu'il lit à 320 px :
   avec « blanc-noir », le noir 85 % et le blanc 15 % ; avec le noir et le blanc à part, le blanc à peine 1 %. */
function zebre() {
  const png = fs.readFileSync(path.join(__dirname, 'fixtures/galerie-zebre-160.png'))
  assert.equal(png.toString('latin1', 1, 4), 'PNG')
  let offset = 8
  let largeur = 0
  let hauteur = 0
  let type = 0
  const donnees = []
  while (offset < png.length) {
    const longueur = png.readUInt32BE(offset)
    const nom = png.toString('latin1', offset + 4, offset + 8)
    const contenu = png.subarray(offset + 8, offset + 8 + longueur)
    if (nom === 'IHDR') {
      largeur = contenu.readUInt32BE(0)
      hauteur = contenu.readUInt32BE(4)
      assert.equal(contenu[8], 8, 'huit bits par canal')
      type = contenu[9]
      assert.equal(contenu[12], 0, 'sans entrelacement')
    }
    if (nom === 'IDAT') donnees.push(contenu)
    offset += 12 + longueur
  }
  const parPixel = { 2: 3, 6: 4 }[type]
  assert.ok(parPixel, 'RVB ou RVBA')
  const brut = zlib.inflateSync(Buffer.concat(donnees))
  const ligne = largeur * parPixel
  const plat = new Uint8Array(hauteur * ligne)
  for (let y = 0; y < hauteur; y++) {
    const filtre = brut[y * (ligne + 1)]
    for (let x = 0; x < ligne; x++) {
      const v = brut[y * (ligne + 1) + 1 + x]
      const a = x >= parPixel ? plat[y * ligne + x - parPixel] : 0
      const b = y > 0 ? plat[(y - 1) * ligne + x] : 0
      const c = x >= parPixel && y > 0 ? plat[(y - 1) * ligne + x - parPixel] : 0
      const p = a + b - c
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      plat[y * ligne + x] = (v + [0, a, b, (a + b) >> 1, paeth][filtre]) & 255
    }
  }
  const pixels = new Uint8ClampedArray(largeur * hauteur * 4)
  for (let i = 0; i < largeur * hauteur; i++) {
    pixels[i * 4] = plat[i * parPixel]
    pixels[i * 4 + 1] = plat[i * parPixel + 1]
    pixels[i * 4 + 2] = plat[i * parPixel + 2]
    pixels[i * 4 + 3] = parPixel === 4 ? plat[i * parPixel + 3] : 255
  }
  return { pixels, largeur, hauteur }
}

/* ---------- Le moteur ---------- */

test('le moteur du thème est celui de la page d’essai, à l’octet près, avec l’empreinte que vérifie le serveur', () => {
  const theme = fs.readFileSync(path.join(ROOT, MOTEUR))
  assert.ok(theme.equals(fs.readFileSync(path.join(ROOT, ESSAI))), `${MOTEUR} : une copie de ${ESSAI}, sans rien y retoucher`)
  // Le serveur en a une copie dont il vérifie l'empreinte : changer le moteur, c'est changer les deux, ensemble.
  assert.equal(crypto.createHash('sha256').update(theme).digest('hex'), EMPREINTE, 'le moteur a changé : le changer aussi sur le serveur (couleurs.ts et son test doré), puis l’empreinte ici')
  // Il se pose seul sur l'objet global, dans une page comme dans un travailleur.
  assert.equal(typeof Couleurs.lire, 'function')
  assert.equal(typeof Couleurs.masques, 'function')
  assert.equal(Couleurs.HANDLES.or, 'dore')
})

/* ---------- Le script : ses calculs ---------- */

test('ce que la page donne au moteur : les couleurs arrêtées, sans rien ajouter ; sinon les déclarées, qu’il complète ; sinon rien', () => {
  // Les couleurs arrêtées par le serveur (artwork.colors) : leur liste, close.
  assert.deepEqual(entreeDuMoteur({ arretees: ['bleu', 'rose', 'jaune'], declarees: ['multicolore', 'bleu', 'rose'] }), { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.deepEqual(entreeDuMoteur({ arretees: ['or'], declarees: ['or'] }), { lire: ['or'], completer: false })
  // Trois au plus.
  assert.deepEqual(entreeDuMoteur({ arretees: ['bleu', 'rose', 'jaune', 'vert'] }).lire, ['bleu', 'rose', 'jaune'])
  // Sans couleurs arrêtées : les déclarées, telles quelles (« multicolore », « blanc-noir » : le moteur sait les lire).
  assert.deepEqual(entreeDuMoteur({ arretees: [], declarees: ['multicolore', 'bleu', 'rose'] }), { lire: ['multicolore', 'bleu', 'rose'], completer: true })
  assert.deepEqual(entreeDuMoteur({ declarees: ['blanc-noir'] }), { lire: ['blanc-noir'], completer: true })
  // Sans rien : l'image seule.
  assert.deepEqual(entreeDuMoteur({}), { lire: [], completer: true })
})

test('noir et blanc : un produit qui déclare « blanc-noir » a le noir et le blanc arrêtés, la page donne « blanc-noir » au moteur à leur place', () => {
  // Le zèbre : déclaré « Noir & Blanc », arrêté noir puis blanc.
  assert.deepEqual(entreeDuMoteur({ arretees: ['noir', 'blanc'], declarees: ['blanc-noir'] }), { lire: ['blanc-noir'], completer: false })
  // À la place du premier des deux, quel que soit leur ordre ; les autres couleurs restent où elles sont.
  assert.deepEqual(entreeDuMoteur({ arretees: ['noir', 'blanc', 'rouge'], declarees: ['blanc-noir', 'rouge'] }).lire, ['blanc-noir', 'rouge'])
  assert.deepEqual(entreeDuMoteur({ arretees: ['rouge', 'blanc', 'noir'], declarees: ['rouge', 'blanc-noir'] }).lire, ['rouge', 'blanc-noir'])
  // Un seul des deux arrêté, ou « blanc-noir » pas déclaré : rien ne change.
  assert.deepEqual(entreeDuMoteur({ arretees: ['noir', 'rouge'], declarees: ['blanc-noir', 'rouge'] }).lire, ['noir', 'rouge'])
  assert.deepEqual(entreeDuMoteur({ arretees: ['noir', 'blanc'], declarees: ['noir', 'beige'] }).lire, ['noir', 'blanc'])
})

test('les moments des couleurs : le déroulé de la maquette, une couleur à la fois, la dernière jusqu’à la fin du temps 2', () => {
  // Trois couleurs : les valeurs que la maquette calcule (début 0,9 + 0,32 par rang).
  assert.deepEqual(momentsDesCouleurs(3), [
    { teinte: [0.9, 1.32], phrase: [0.88, 1.2], pastille: [0.88, 1], anneau: [0.88, 1.26] },
    { teinte: [1.22, 1.64], phrase: [1.2, 1.52], pastille: [1.2, 1.32], anneau: [1.2, 1.58] },
    { teinte: [1.54, 1.98], phrase: [1.52, 2], pastille: [1.52, 1.64], anneau: [1.52, 1.96] },
  ])
  // Moins de couleurs : la dernière tient jusqu'à la fin du temps 2.
  assert.deepEqual(momentsDesCouleurs(2).map((m) => [m.teinte, m.phrase, m.anneau]), [[[0.9, 1.32], [0.88, 1.2], [0.88, 1.26]], [[1.22, 1.98], [1.2, 2], [1.2, 1.96]]])
  assert.deepEqual(momentsDesCouleurs(1), [{ teinte: [0.9, 1.98], phrase: [0.88, 2], pastille: [0.88, 1], anneau: [0.88, 1.96] }])
  assert.deepEqual(momentsDesCouleurs(0), [])
  // Tout le temps 2 : de 0,76 (le gris arrive) à 2,04 (le temps 3).
  for (const n of [1, 2, 3]) for (const m of momentsDesCouleurs(n)) for (const [debut, fin] of Object.values(m)) assert.ok(debut >= 0.76 && fin <= 2.04 && debut < fin)
})

test('la lecture : les couleurs arrêtées dans leur ordre, chacune avec sa couleur, sa part et son masque', () => {
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  const lu = lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['bleu', 'rose', 'jaune'])
  lu.couleurs.forEach((c) => assert.match(c.css, /^rgb\(\d+,\d+,\d+\)$/))
  assert.deepEqual(lu.couleurs.map((c) => Math.round(c.part * 100)), [45, 35, 20])
  // Un masque par couleur, de la taille de l'image : plein sur sa bande, vide sur les autres.
  assert.equal(lu.masques.length, 3)
  for (const alpha of lu.masques) assert.equal(alpha.length, largeur * hauteur)
  assert.ok(moyenne(lu.masques[0], largeur, 10, 130) > 250 && moyenne(lu.masques[0], largeur, 160, 250) < 5)
  assert.ok(moyenne(lu.masques[1], largeur, 160, 250) > 250 && moyenne(lu.masques[1], largeur, 270, 320) < 5)
  assert.ok(moyenne(lu.masques[2], largeur, 270, 320) > 250 && moyenne(lu.masques[2], largeur, 10, 130) < 5)
  // L'ordre est celui de la liste, pas celui de l'image.
  assert.deepEqual(lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: ['jaune', 'bleu'], completer: false }).couleurs.map((c) => c.handle), ['jaune', 'bleu'])
})

test('la lecture : une couleur arrêtée que l’image n’a pas n’est pas montrée ; la liste arrêtée ne se complète pas', () => {
  const deux = bandes([['bleu', 0.5], ['rose', 0.5]])
  const lu = lireLesCouleurs(Couleurs, deux.pixels, deux.largeur, deux.hauteur, { lire: ['vert', 'bleu'], completer: false })
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['bleu'])
  assert.equal(lu.masques.length, 1)
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  // Les déclarées seules (« multicolore » n'en est pas une) : la page complète jusqu'à trois, avec ce que l'image a de plus.
  assert.deepEqual(lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: ['multicolore', 'bleu', 'rose'], completer: true }).couleurs.map((c) => c.handle), ['bleu', 'rose', 'jaune'])
  // Rien de déclaré : l'image seule.
  assert.deepEqual(lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: [], completer: true }).couleurs.map((c) => c.handle).sort(), ['bleu', 'jaune', 'rose'])
})

test('la lecture : le doré s’appelle « or » dans la boutique, « dore » dans le moteur', () => {
  const { pixels, largeur, hauteur } = bandes([['dore', 0.7], ['noir', 0.3]])
  const lu = lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: ['or', 'noir'], completer: false })
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['or', 'noir'])
})

test('le zèbre : avec « blanc-noir », le noir puis le blanc, chacun avec sa phrase ; le blanc séparé, il n’en resterait presque rien', () => {
  const { pixels, largeur, hauteur } = zebre()
  assert.deepEqual([largeur, hauteur], [160, 120])
  // Ce que le serveur a écrit pour lui : déclaré « Noir & Blanc », arrêté noir puis blanc, une phrase pour chacun.
  const entree = entreeDuMoteur({ arretees: ['noir', 'blanc'], declarees: ['blanc-noir'] })
  const lu = lireLesCouleurs(Couleurs, pixels, largeur, hauteur, entree)
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['noir', 'blanc'])
  const [noir, blanc] = lu.couleurs.map((c) => c.part)
  assert.ok(noir > 0.75 && blanc > 0.1, `noir ${(noir * 100).toFixed(1)} %, blanc ${(blanc * 100).toFixed(1)} %`)
  // Ses deux pastilles, noir puis blanc, chacune avec son texte.
  const plan = planDesCouleurs({ couleurs: lu.couleurs, phrases: ['noir', 'blanc'], noms: { noir: 'Noir', blanc: 'Blanc' } })
  assert.deepEqual(plan.couleurs.map((c) => [c.handle, c.nom, c.phrase]), [['noir', 'Noir', 0], ['blanc', 'Blanc', 1]])
  assert.deepEqual(plan.cachees, [])
  // Sans la règle : le même zèbre, le noir et le blanc donnés à part. Les rayures sépia ne sont plus du blanc.
  const separes = lireLesCouleurs(Couleurs, pixels, largeur, hauteur, { lire: ['noir', 'blanc'], completer: false })
  const blancSepare = separes.couleurs.find((c) => c.handle === 'blanc')
  assert.ok(!blancSepare || blancSepare.part < 0.03, `blanc à part : ${blancSepare && (blancSepare.part * 100).toFixed(1)} %`)
})

test('le plan : chaque couleur lue dans l’ordre du moteur, sa pastille, sa phrase s’il y en a une ; une phrase sans sa couleur est cachée', () => {
  const lues = [{ handle: 'rose', css: 'rgb(215,74,136)', part: 0.3 }, { handle: 'bleu', css: 'rgb(32,65,139)', part: 0.25 }]
  const plan = planDesCouleurs({ couleurs: lues, phrases: ['bleu', 'jaune', 'rose'], noms: { bleu: 'Bleu', rose: 'Rose', jaune: 'Jaune' } })
  // L'ordre du moteur ; chaque phrase retrouvée par sa couleur, où qu'elle soit dans la page.
  assert.deepEqual(plan.couleurs.map((c) => [c.handle, c.nom, c.css, c.phrase]), [['rose', 'Rose', 'rgb(215,74,136)', 2], ['bleu', 'Bleu', 'rgb(32,65,139)', 0]])
  // Les moments suivent le rang à l'écran : la deuxième, la dernière, tient jusqu'à la fin du temps 2.
  assert.deepEqual(plan.couleurs.map((c) => c.moments.phrase), [[0.88, 1.2], [1.2, 2]])
  // Le jaune n'a pas été retrouvé dans l'image : sa phrase est cachée.
  assert.deepEqual(plan.cachees, [1])
  // Une couleur lue sans phrase (pas de texte) garde sa pastille ; sans nom connu, une pastille sans nom.
  const sans = planDesCouleurs({ couleurs: [{ handle: 'vert', css: 'rgb(0,90,40)', part: 0.2 }], phrases: [], noms: {} })
  assert.deepEqual(sans.couleurs.map((c) => [c.handle, c.nom, c.phrase]), [['vert', '', -1]])
  // Rien de lu : aucune couleur, et aucune phrase montrée.
  assert.deepEqual(planDesCouleurs({ couleurs: [], phrases: ['bleu', 'rose'] }), { couleurs: [], cachees: [0, 1] })
  // Trois couleurs au plus.
  assert.equal(planDesCouleurs({ couleurs: ['a', 'b', 'c', 'd'].map((handle) => ({ handle, css: '', part: 0.1 })) }).couleurs.length, 3)
})

/* ---------- Le travailleur ---------- */

/* Joue le texte du travailleur dans un bac à sable : ce qu'un Worker a (self, importScripts, fetch,
   createImageBitmap, OffscreenCanvas, ImageData), et rien de la page. Une image de 640 × 480 en bandes. */
function travailleur({ image = { ok: true }, liste = [['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]] } = {}) {
  const journal = []
  const toiles = []
  class FausseToile {
    constructor(largeur, hauteur) {
      Object.assign(this, { largeur, hauteur, pixels: new Uint8ClampedArray(largeur * hauteur * 4) })
      toiles.push(this)
    }

    getContext(type, options) {
      journal.push(['getContext', type, options])
      const toile = this
      return {
        imageSmoothingQuality: 'low',
        drawImage(source, x, y, largeur, hauteur) {
          journal.push(['drawImage', source.width, source.height, largeur, hauteur])
          toile.pixels = bandes(liste, largeur, hauteur).pixels
        },
        getImageData: (x, y, largeur, hauteur) => ({ data: toile.pixels.slice(0, largeur * hauteur * 4) }),
        putImageData: (donnees) => { toile.pixels = donnees.data.slice() },
      }
    }

    async convertToBlob(options) {
      return { type: options.type, alpha: Array.from(this.pixels.filter((_, i) => i % 4 === 3)) }
    }
  }
  const bac = {
    importScripts: (adresse) => { journal.push(['importScripts', adresse]); vm.runInContext(read(MOTEUR), bac) },
    fetch: async (adresse) => { journal.push(['fetch', adresse]); return { ok: image.ok, status: image.ok ? 200 : 404, blob: async () => ({ image: adresse }) } },
    createImageBitmap: async () => ({ width: 640, height: 480, close() { journal.push(['close']) } }),
    OffscreenCanvas: FausseToile,
    ImageData: class { constructor(largeur, hauteur) { this.data = new Uint8ClampedArray(largeur * hauteur * 4) } },
  }
  bac.self = bac
  vm.createContext(bac)
  vm.runInContext(texteDuTravailleur(), bac)
  // Ce qui sort du bac à sable, ramené à des valeurs simples (ses objets ne sont pas ceux de ce fichier).
  const reponse = new Promise((resolve) => { bac.postMessage = (message) => resolve(JSON.parse(JSON.stringify(message))) })
  return { bac, journal: { lire: () => JSON.parse(JSON.stringify(journal)) }, toiles, reponse }
}

test('le travailleur : il charge le moteur, lit l’image ramenée à 320 px, et rend chaque couleur avec son masque en PNG', async () => {
  const { bac, journal, reponse } = travailleur()
  bac.onmessage({ data: { moteur: 'https://boutique.test/assets/galerie-couleurs.js', image: 'https://boutique.test/files/oeuvre.jpg?width=320', lire: ['bleu', 'rose', 'jaune'], completer: false } })
  const { couleurs, masques, erreur } = await reponse
  assert.equal(erreur, undefined)
  assert.deepEqual(couleurs.map((c) => c.handle), ['bleu', 'rose', 'jaune'])
  // Le moteur et la copie de l'image qu'on lui donne ; l'image lue à 320 px de large, à ses proportions.
  const fait = journal.lire()
  assert.deepEqual(fait.filter(([nom]) => nom === 'importScripts' || nom === 'fetch'), [['importScripts', 'https://boutique.test/assets/galerie-couleurs.js'], ['fetch', 'https://boutique.test/files/oeuvre.jpg?width=320']])
  assert.deepEqual(fait.find(([nom]) => nom === 'drawImage'), ['drawImage', 640, 480, 320, 240])
  assert.deepEqual(fait.find(([nom]) => nom === 'getContext'), ['getContext', '2d', { willReadFrequently: true }])
  assert.ok(fait.some(([nom]) => nom === 'close'), 'l’image décodée est rendue')
  // Un masque par couleur, en PNG : le masque de la lecture, dans le canal alpha.
  assert.equal(masques.length, 3)
  masques.forEach((masque) => { assert.equal(masque.type, 'image/png'); assert.equal(masque.alpha.length, 320 * 240) })
  const attendu = lireLesCouleurs(Couleurs, bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]]).pixels, 320, 240, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  masques.forEach((masque, rang) => assert.deepEqual(masque.alpha, Array.from(attendu.masques[rang]), `masque ${rang}`))
})

test('le travailleur : une image qui ne vient pas, une erreur ; rien d’autre', async () => {
  const { bac, reponse } = travailleur({ image: { ok: false } })
  bac.onmessage({ data: { moteur: 'https://boutique.test/m.js', image: 'https://boutique.test/i.jpg', lire: [], completer: true } })
  assert.deepEqual(await reponse, { erreur: 'image 404' })
})

/* ---------- Le script : l'élément ---------- */

test('le script : l’élément galerie-couleurs, défini une fois, démarre à son arrivée et défait tout à son départ', () => {
  const js = script()
  assert.match(js, /if \(customElements\.get\('galerie-couleurs'\)\) return;/)
  assert.match(js, /customElements\.define\('galerie-couleurs', /)
  assert.match(js, /connectedCallback\(\) {/)
  assert.match(js, /disconnectedCallback\(\) {/)
  assert.match(js, /if \(typeof window === 'undefined'\) {\s*Object\.assign\(module\.exports, { entreeDuMoteur, momentsDesCouleurs, lireLesCouleurs, planDesCouleurs, texteDuTravailleur }\);\s*return;\s*}/)
  assert.doesNotMatch(js, /DOMContentLoaded|addEventListener\('load'|readyState|window\.\w+ = /)
  // Chaque écouteur posé est retiré ; l'observateur est arrêté ; le travailleur est arrêté ; chaque adresse faite
  // pour une image (le texte du travailleur, les masques) est rendue.
  const added = [...js.matchAll(/([\w.]+)\.addEventListener\('(\w+)', (this\.\w+)/g)].map((m) => m.slice(1).join(' '))
  const removed = [...js.matchAll(/([\w.]+)\.removeEventListener\('(\w+)', (this\.\w+)/g)].map((m) => m.slice(1).join(' '))
  assert.deepEqual(added, ['this.reduit change this.regler'])
  assert.deepEqual(removed, added)
  assert.equal(js.match(/\.addEventListener\(/g).length, 1)
  assert.match(js, /this\.approche = new IntersectionObserver\(/)
  assert.match(js, /if \(this\.approche\) this\.approche\.disconnect\(\);/)
  assert.match(js, /if \(this\.travailleur\) this\.travailleur\.terminate\(\);/)
  assert.match(js, /if \(this\.source\) URL\.revokeObjectURL\(this\.source\);/)
  assert.match(js, /this\.liens\.forEach\(\(lien\) => URL\.revokeObjectURL\(lien\)\);/)
  assert.equal(js.match(/URL\.createObjectURL\(/g).length, 2)
  // Au départ : arrêter la lecture, puis défaire ce qui a été posé.
  assert.match(js, /disconnectedCallback\(\) {\s*if \(!this\.reduit\) return;\s*this\.reduit\.removeEventListener\('change', this\.regler\);\s*this\.reduit = null;\s*this\.arreter\(\);\s*this\.defaire\(\);\s*}/)
})

test('le script : rien pendant le défilement ; la lecture se fait à l’approche de la scène, hors du fil principal', () => {
  const js = script()
  // Aucun écouteur de défilement, rien image par image, aucune minuterie qui revient : le calcul est dans un
  // travailleur.
  assert.doesNotMatch(js, /'scroll'|requestAnimationFrame|setInterval/)
  assert.match(js, /new Worker\(this\.source\)/)
  assert.match(js, /new Blob\(\[texteDuTravailleur\(\)\], { type: 'text\/javascript' }\)/)
  // Ce qui reste au fil principal se fait par tranches, dans ses temps morts (au plus tard 150 ms après) : le départ
  // du travailleur, chaque couleur, puis la pose. Une tranche en attente est annulée à l'arrêt.
  assert.match(js, /const plusTard = \(tranche\) => \(window\.requestIdleCallback \? window\.requestIdleCallback\(tranche, { timeout: 150 }\) : window\.setTimeout\(tranche, 0\)\);/)
  assert.match(js, /const annuler = \(numero\) => \(window\.cancelIdleCallback \? window\.cancelIdleCallback\(numero\) : window\.clearTimeout\(numero\)\);/)
  assert.equal(js.match(/requestIdleCallback\(|setTimeout\(/g).length, 2, 'une seule façon de remettre à plus tard')
  assert.match(js, /this\.suivre\(\[\(\) => this\.ecrire\(\), \(\) => this\.lire\(\)\]\);/)
  assert.match(js, /this\.travailleur\.onmessage = \({ data }\) => {\s*this\.arreter\(\);\s*this\.suivre\(\[\(\) => this\.poser\(data\)\]\);\s*};/)
  assert.match(js, /if \(this\.etapes\) this\.etapes\.push\(\.\.\.etapes\);\s*else this\.suivre\(etapes\);/)
  assert.match(js, /if \(this\.tranche\) annuler\(this\.tranche\);/)
  // À un quart d'écran de la scène, comme ses personnages (rien pendant le haut de la page), et seulement si elle est
  // animée (pas de « mouvements réduits »).
  assert.match(js, /{ rootMargin: '25% 0px' }/)
  assert.match(js, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(js, /if \(!this\.reduit \|\| this\.reduit\.matches \|\| this\.approche \|\| this\.travailleur \|\| this\.etapes \|\| this\.posees\) return;/)
  // Le travailleur lit le moteur et l'image du serveur, à des adresses complètes (un travailleur fait d'un texte ne
  // sait pas lire une adresse relative).
  assert.match(js, /postMessage\({ moteur: absolue\(this\.dataset\.moteur\), image: absolue\(this\.dataset\.image\), \.\.\.entree }\)/)
  assert.match(js, /entreeDuMoteur\({ arretees: liste\(this\.dataset\.arretees\), declarees: liste\(this\.dataset\.declarees\) }\)/)
})

test('le script : il n’ajoute rien à la page, il montre les places du serveur : chaque couleur sous son masque, sa pastille, le moment de sa phrase', () => {
  const js = script()
  // Sur cette page, chaque ajout ou retrait d'élément (et l'attribut hidden) fait refaire les styles de toute la
  // scène : l'élément ne change que des styles et des attributs à lui, sur les places écrites par le serveur.
  assert.doesNotMatch(js, /\.append\(|appendChild|insertBefore|insertAdjacent|replaceWith|replaceChildren|\.remove\(|cloneNode|createElement|innerHTML|outerHTML|textContent =|\.hidden\b/)
  assert.match(js, /const teintes = Array\.from\(this\.querySelectorAll\('\.galerie-scene-teinte'\)\);/)
  assert.match(js, /const pastilles = Array\.from\(this\.scene\.querySelectorAll\('\.galerie-scene-pastille'\)\);/)
  // Une couleur : la même image, sous son masque, et son moment ; la couleur et le moment de sa pastille, et de son cercle.
  assert.match(js, /this\.changer\(teinte, '-webkit-mask-image', `url\("\${lien}"\)`\);\s*this\.changer\(teinte, 'mask-image', `url\("\${lien}"\)`\);/)
  assert.match(js, /if \(couleur\.css\) this\.changer\(pastille, '--c', couleur\.css\);/)
  assert.match(js, /this\.changer\(anneau, '--a', String\(couleur\.moments\.anneau\[0\]\)\);/)
  // Le nom de la pastille, dans un attribut (la feuille l'écrit) ; puis tout paraît d'un coup : les places prennent
  // leur couleur, l'élément dit que les couleurs sont là.
  assert.match(js, /this\.marquer\(pastille, 'data-nom', couleur\.nom\);/)
  assert.match(js, /montrees\.forEach\(\(\[place, handle\]\) => this\.marquer\(place, 'data-couleur', handle\)\);/)
  assert.match(js, /if \(plan\.couleurs\.length\) this\.marquer\(this, 'data-pretes', ''\);/)
  assert.doesNotMatch(js, /this\.scene\.setAttribute/)
  // Une place de pastille restée vide sort de la rangée ; une phrase sans sa couleur est cachée ; les autres prennent
  // leur moment, et la couleur lue à leur pastille.
  assert.match(js, /pastilles\.slice\(plan\.couleurs\.length\)\.forEach\(\(pastille\) => this\.marquer\(pastille, 'data-vide', ''\)\);/)
  assert.match(js, /plan\.cachees\.forEach\(\(rang\) => this\.marquer\(phrases\[rang\], 'data-absente', ''\)\);/)
  assert.match(js, /if \(point && couleur\.css\) this\.changer\(point, '--c', couleur\.css\);/)
  // Tout ce qui est changé se remet : chaque changement note son retour.
  assert.match(js, /changer\(element, nom, valeur\) {\s*const avant = element\.style\.getPropertyValue\(nom\);/)
  assert.match(js, /marquer\(element, nom, valeur\) {\s*const avant = element\.getAttribute\(nom\);/)
  assert.match(js, /defaire\(\) {\s*this\.retours\.reverse\(\)\.forEach\(\(retour\) => retour\(\)\);/)
})

/* ---------- La feuille ---------- */

test('la feuille : le bloc des couleurs pose des moments et des images clés ; un seul mouvement à lui, le fondu de leur arrivée', () => {
  // Les animations sont celles de la scène (classe galerie-scene-a) : natif ou secours, rien de plus ici. Seul
  // mouvement à lui, en « mouvements voulus » : la place des couleurs paraît en fondu quand elles sont lues.
  const moving = sheet().filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  assert.deepEqual(moving.map((r) => [r.head, r.context.join(), r.body.replace(/\s+/g, ' ').trim()]), [['.galerie-scene-teintes', '@media (prefers-reduced-motion: no-preference)', 'transition: opacity 0.4s ease;']])
  assert.equal(body('.galerie-scene-teintes'), 'opacity: 0;')
  assert.equal(body('.galerie-scene-teintes[data-pretes]'), 'opacity: 1;')
  // L'attribut qui fait paraître les couleurs est sur l'élément : les styles à refaire sont les siens, pas toute la scène.
  for (const r of sheet()) assert.doesNotMatch(r.head, /galerie-scene\[data-|galerie-scene:not\(\[data-(?!mouvement)/, r.head)
  // Chaque suite d'images clés nommée existe dans le bloc, et chacune sert ; rien que transform et opacity.
  const frames = sheet().filter((r) => /^@keyframes /.test(r.head))
  const defined = new Set(frames.map((f) => f.head.replace('@keyframes ', '')))
  const named = new Set(sheet().flatMap((r) => [...r.body.matchAll(/(?:^|[;\s])--n:\s*([\w-]+);/g)].map((m) => m[1])))
  assert.deepEqual([...named].sort(), [...defined].sort())
  assert.deepEqual([...defined].sort(), ['galerie-scene-actif', 'galerie-scene-pop', 'galerie-scene-teinte', 'galerie-scene-voile'])
  for (const f of frames) {
    assert.deepEqual(f.context, [], f.head)
    const properties = [...f.body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])
    assert.deepEqual([...new Set(properties)].filter((p) => !['opacity', 'transform'].includes(p)), [], f.head)
  }
  // Ces noms ne sont pas déjà ceux de la scène.
  const scene = read(CSS).slice(0, read(CSS).indexOf('/* === Couleurs de la scène (ticket 21) : début ==='))
  for (const name of defined) assert.doesNotMatch(scene, new RegExp(`@keyframes ${name} `), name)
  // Aucune couleur écrite, aucune adresse : les masques sont posés par l'élément.
  for (const { head, body: text } of sheet()) assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|url\(/i, head)
})

test('la feuille : l’œuvre en gris pâle, puis chaque couleur seule, avec les images clés de la maquette', () => {
  // Le gris plus pâle que dans la maquette (la page d'essai des couleurs) : un noir ou un blanc qui revient s'y voit.
  const gris = body('.galerie-scene-gris')
  assert.match(gris, /^filter: grayscale\(1\) contrast\(0\.42\) brightness\(1\.22\);/)
  assert.deepEqual([value(gris, 'a'), value(gris, 'b'), value(gris, 'n')], ['0.76', '2', 'galerie-scene-voile'])
  assert.equal(body('@keyframes galerie-scene-voile'), '0% { opacity: 0; } 11% { opacity: 1; } 89% { opacity: 1; } 100% { opacity: 0; }')
  // Une couleur : l'image sous son masque, étiré sur toute l'œuvre.
  assert.equal(body('.galerie-scene-teinte'), '-webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; --n: galerie-scene-teinte;')
  // Le gris ne se dessine que si des couleurs sont là, une place que si une couleur y est posée : cachés, mais dans la
  // page (les montrer ne fait refaire que leurs styles) ; à plat, le gris n'est pas dans la page.
  assert.equal(body('.galerie-scene-teintes:not([data-pretes]) .galerie-scene-gris, .galerie-scene-teinte:not([data-couleur])'), 'visibility: hidden;')
  assert.equal(body('galerie-scene:not([data-mouvement]) .galerie-scene-gris'), 'display: none;')
  // La phrase d'une couleur que l'image n'a pas.
  assert.equal(body('.galerie-scene-couleurs .galerie-scene-msg[data-absente]'), 'display: none;')
  assert.equal(body('@keyframes galerie-scene-teinte'), '0% { opacity: 0; } 24% { opacity: 1; } 76% { opacity: 1; } 100% { opacity: 0; }')
  // Les phrases : les moments de la maquette, la dernière jusqu'à la fin du temps 2 (sans script, ou avant la lecture).
  const moments = [1, 2, 3].map((n) => body(`.galerie-scene-couleurs .galerie-scene-msg:nth-child(${n})`))
  assert.deepEqual(moments.map((m) => [value(m, 'a'), value(m, 'b')]), [['0.88', '1.2'], ['1.2', '1.52'], ['1.52', '2']])
  assert.equal(body('.galerie-scene-couleurs .galerie-scene-msg:last-child'), '--b: 2;')
  assert.deepEqual(momentsDesCouleurs(3).map((m) => m.phrase.map(String)), moments.map((m) => [value(m, 'a'), value(m, 'b')]))
  // La pastille du titre d'une phrase, cerclée d'un trait léger (un blanc se voit sur le mur clair).
  assert.equal(body('.galerie-scene-couleurs .galerie-scene-msg b i'), 'flex: none; width: 13px; height: 13px; border-radius: 50%; background: var(--c, var(--encre)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--encre) 12%, transparent);')
})

test('la feuille : les pastilles de la maquette, sous l’œuvre sur téléphone, en colonne à sa droite sur ordinateur', () => {
  assert.equal(body('.galerie-scene-pastille'), 'position: relative; display: grid; justify-items: center; gap: 7px; font: 600 12px/1 var(--sans); color: var(--encre); --n: galerie-scene-pop;')
  // Une place qui n'a pas encore sa couleur ne se voit pas ; restée vide, elle ne prend plus de place. Le nom d'une
  // pastille vient de l'élément (data-nom).
  assert.equal(body('.galerie-scene-pastille:not([data-couleur])'), 'visibility: hidden;')
  assert.equal(body('.galerie-scene-pastille[data-vide]'), 'display: none;')
  assert.equal(body('.galerie-scene-pastille::after'), 'content: attr(data-nom);')
  assert.match(body('.galerie-scene-point'), /^width: 50px; height: 50px; border-radius: 50%; background: var\(--c, var\(--encre-12\)\);/)
  assert.equal(body('.galerie-scene-anneau'), 'position: absolute; left: 50%; top: 25px; width: 62px; height: 62px; margin: -31px 0 0 -31px; border-radius: 50%; box-shadow: 0 0 0 2.5px var(--encre); --n: galerie-scene-actif;')
  assert.equal(body('@keyframes galerie-scene-pop'), '0% { opacity: 0; transform: translateY(18px) scale(0.5); } 70% { opacity: 1; transform: translateY(-3px) scale(1.06); } 100% { opacity: 1; transform: none; }')
  assert.equal(body('@keyframes galerie-scene-actif'), '0% { opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }')
  assert.equal(body('.galerie-scene-pastille', LARGE), 'grid-auto-flow: column; align-items: center; gap: 14px; font-size: 14px; justify-items: start;')
  assert.equal(body('.galerie-scene-point', LARGE), 'width: 62px; height: 62px;')
  assert.equal(body('.galerie-scene-anneau', LARGE), 'left: 31px; top: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px;')
  // Rien du bloc hors de la feuille de la page : la feuille commune du site ne change pas.
  assert.doesNotMatch(read('input.css'), /galerie-scene-(gris|teinte|pastille|point|anneau)/)
})

/* ---------- La section ---------- */

test('la section : les couleurs arrêtées et leurs textes, sinon les déclarées ; jamais painting.color ; le moteur chargé par l’élément', () => {
  const source = code(SECTION)
  assert.match(source, /for couleur in product\.metafields\.artwork\.colors\.value/)
  assert.match(source, /assign cle_texte = 'color_text_' \| append: forloop\.index/)
  assert.match(source, /product\.metafields\.artwork\[cle_texte\]\.value/)
  assert.match(source, /for couleur in product\.metafields\.shopify\['color-pattern'\]\.value/)
  assert.match(source, /shop\.metaobjects\['shopify--color-pattern'\]\.values/)
  assert.doesNotMatch(source, /painting\.color/)
  // Le moteur n'est pas dans la page : l'élément le donne à son travailleur, à l'approche de la scène.
  assert.doesNotMatch(source, /<script/)
  assert.match(source, /data-moteur="{{ 'galerie-couleurs\.js' \| asset_url }}"/)
  assert.match(source, /data-image="{{ art \| image_url: width: 320 }}"/)
  // Un texte libre : échappé, puis ses jetons de la note Trustpilot remplacés.
  assert.match(source, /assign texte_sur = texte \| escape\s+capture texte_pret\s+render 'trustpilot-tokens', text: texte_sur\s+endcapture/)
})

/* ---------- Le rendu ---------- */

// Les seize couleurs de la boutique (métaobjets shopify--color-pattern), relevées le 20/11/2026 : identifiant,
// libellé, pastille.
const BOUTIQUE = [
  ['gris', 'Gris', '#808080'], ['blanc', 'Blanc', '#FFFFFF'], ['multicolore', 'Multicolore', null], ['vert', 'Vert', '#05AA3D'],
  ['jaune', 'Jaune / Ocre', '#D6C52E'], ['noir', 'Noir', '#000000'], ['beige', 'Beige / Crème', '#EAD8AB'], ['marron', 'Marron / Terre', '#9A5630'],
  ['bleu', 'Bleu', '#005BD3'], ['or', 'Doré / Or', '#D49A06'], ['blanc-noir', 'Noir & Blanc', null], ['rouge', 'Rouge', '#D62929'],
  ['rose', 'Rose', '#FFC0CB'], ['bronze', 'Bronze', '#CD7F32'], ['orange', 'Orange', '#FF8A00'], ['violet', 'Violet', '#A54DCF'],
].map(([handle, label, color]) => ({ system: { handle }, label, color }))
const couleur = (handle) => BOUTIQUE.find((c) => c.system.handle === handle)

// Les textes que le serveur a écrits pour la toile Superman, le 20/11/2026 (ticket 25).
const SUPERMAN = [
  'Le bleu : la force. Il dessine les muscles et l\'emblème du super-héros. Dans votre pièce, il donne du caractère et de l\'énergie.',
  'Le rose : l\'explosion. Il éclabousse le portrait comme un graffiti sauvage. Chez vous, il met de la vie et fait vibrer le mur.',
  'Le jaune : l\'éclair. Il traverse le tableau en coups de pinceau rapides. Un coup de peps qui réveille la pièce.',
]

/* Un produit d'essai et ses couleurs : arrêtées (artwork.colors) et leurs textes, déclarées (shopify.color-pattern). */
function avecCouleurs({ poster = false, arretees = null, textes = [], declarees = [] } = {}) {
  const p = product({ poster })
  p.metafields.shopify = { 'color-pattern': { value: declarees.map(couleur) } }
  p.metafields.artwork = {}
  if (arretees) {
    p.metafields.artwork.colors = { value: arretees.map((h) => (typeof h === 'string' ? couleur(h) : h)) }
    textes.forEach((texte, rang) => { if (texte != null) p.metafields.artwork[`color_text_${rang + 1}`] = { value: texte } })
  }
  return p
}
const tight = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
/* La scène rendue, la boutique donnant (ou non) ses couleurs à shop.metaobjects. */
async function render(p, { lang = 'fr', boutique = BOUTIQUE } = {}) {
  const source = read(SECTION)
  const g = globals(p, { suffix: 'oeuvre-galerie', lang, section: { id: 'template--1__galerie-scene', settings: {}, blocks: [] } })
  if (boutique) g.shop = { ...g.shop, metaobjects: { 'shopify--color-pattern': { values: boutique } } }
  return tight(await engine(lang).parseAndRender(source.slice(0, source.indexOf('{% schema %}')), {}, { globals: g }))
}
/* Le temps 2 rendu : ses phrases, son élément (ses attributs) et le nom des pastilles. */
function tempsDeux(html) {
  const article = /<article class="galerie-scene-chap galerie-scene-couleurs galerie-scene-a">([\s\S]*?)<\/article>/.exec(html)[1]
  const phrases = [...article.matchAll(/<p class="galerie-scene-msg galerie-scene-a" data-couleur="([^"]+)"><b><i data-allow-empty(?: style="--c: ([^"]+)")?><\/i>([^<]*)<\/b>(?: ([^<]*))?<\/p>/g)]
    .map((m) => ({ couleur: m[1], pastille: m[2] || null, titre: m[3], texte: m[4] || '' }))
  const element = /<galerie-couleurs class="galerie-scene-teintes"((?: [\w-]+="[^"]*")*)>([\s\S]*?)<\/galerie-couleurs>/.exec(html)
  assert.ok(element, 'l’élément des couleurs')
  const attributs = Object.fromEntries([...element[1].matchAll(/ ([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  const noms = [...element[2].matchAll(/<span data-couleur="([^"]+)">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]])
  return { article, phrases, attributs, noms, modele: element[2] }
}

test('rendu, couleurs arrêtées : une phrase par couleur, dans l’ordre, son titre en gras avec sa pastille, puis son texte', { skip: SKIP }, async () => {
  const html = await render(avecCouleurs({ arretees: ['bleu', 'rose', 'jaune'], textes: SUPERMAN, declarees: ['multicolore', 'bleu', 'rose'] }))
  const { article, phrases, attributs, noms } = tempsDeux(html)
  assert.match(article, /^<p class="galerie-surtitre"><i>2<\/i> Les couleurs<\/p><h2>Chaque couleur <b>agit sur vous\.<\/b><\/h2><div class="galerie-scene-messages"><p /)
  assert.deepEqual(phrases, [
    { couleur: 'bleu', pastille: '#005BD3', titre: 'Le bleu : la force.', texte: 'Il dessine les muscles et l&#39;emblème du super-héros. Dans votre pièce, il donne du caractère et de l&#39;énergie.' },
    { couleur: 'rose', pastille: '#FFC0CB', titre: 'Le rose : l&#39;explosion.', texte: 'Il éclabousse le portrait comme un graffiti sauvage. Chez vous, il met de la vie et fait vibrer le mur.' },
    { couleur: 'jaune', pastille: '#D6C52E', titre: 'Le jaune : l&#39;éclair.', texte: 'Il traverse le tableau en coups de pinceau rapides. Un coup de peps qui réveille la pièce.' },
  ])
  // L'élément : le moteur, la copie de 320 px, les couleurs arrêtées et les déclarées ; le nom des pastilles, coupé
  // avant « / », hors de la page (un modèle).
  assert.deepEqual(attributs, {
    'data-moteur': '//www.myselfmonart.com/cdn/shop/t/25/assets/galerie-couleurs.js?v=1',
    'data-image': '//www.myselfmonart.com/cdn/shop/files/bonsai-zen-oeuvre.jpg?v=1&width=320',
    'data-arretees': 'bleu rose jaune',
    'data-declarees': 'multicolore bleu rose',
  })
  assert.deepEqual(noms, [['bleu', 'Bleu'], ['rose', 'Rose'], ['jaune', 'Jaune']])
  // L'œuvre, puis la place des couleurs : son gris, les trois places des couleurs (la même image, sans masque tant
  // qu'aucune couleur n'y est posée), puis le nom des pastilles ; et les trois places des pastilles, sous l'œuvre.
  assert.match(html, /<img class="galerie-scene-image" [^>]*><galerie-couleurs class="galerie-scene-teintes" [^>]*><img class="galerie-scene-gris galerie-scene-a" [^>]*>(<img class="galerie-scene-teinte galerie-scene-a" [^>]*>){3}<template>/)
  assert.match(html, /<div class="galerie-scene-palette galerie-scene-a" aria-hidden="true">(<span class="galerie-scene-pastille galerie-scene-a"><i class="galerie-scene-point" data-allow-empty><\/i><i class="galerie-scene-anneau galerie-scene-a" data-allow-empty><\/i><\/span>){3}<\/div>/)
  const oeuvre = /<img class="galerie-scene-image"( [^>]*)>/.exec(html)[1]
  for (const place of html.matchAll(/<img class="galerie-scene-(?:gris|teinte) galerie-scene-a"( [^>]*)>/g)) assert.equal(place[1], oeuvre, 'la même image que l’œuvre : un seul téléchargement')
  // Un seul titre de niveau 2 dans le temps 2, et un texte que Google lit sans script.
  assert.equal((article.match(/<h2>/g) || []).length, 1)
})

test('rendu, le zèbre : « Noir & Blanc » déclaré, le noir puis le blanc arrêtés, chacun avec son texte', { skip: SKIP }, async () => {
  const html = await render(avecCouleurs({
    arretees: ['noir', 'blanc'],
    textes: ['Le noir : la nuit de la savane. Il enveloppe le zèbre et fait le silence autour de lui. Dans la pièce, il donne de la profondeur.', 'Le blanc : le trait de lumière. Chaque rayure accroche la lumière et dessine l\'animal. Le regard n\'en décroche plus.'],
    declarees: ['blanc-noir'],
  }))
  const { phrases, attributs, noms } = tempsDeux(html)
  assert.deepEqual(phrases.map((p) => [p.couleur, p.titre]), [['noir', 'Le noir : la nuit de la savane.'], ['blanc', 'Le blanc : le trait de lumière.']])
  assert.equal(attributs['data-arretees'], 'noir blanc')
  assert.equal(attributs['data-declarees'], 'blanc-noir')
  assert.deepEqual(noms, [['noir', 'Noir'], ['blanc', 'Blanc']])
  // Ce que l'élément en fera : « blanc-noir » pour le moteur.
  assert.deepEqual(entreeDuMoteur({ arretees: attributs['data-arretees'].split(' '), declarees: attributs['data-declarees'].split(' ') }), { lire: ['blanc-noir'], completer: false })
})

test('rendu, couleurs arrêtées : un texte manquant, une couleur à part ; le texte libre échappé, ses jetons remplacés, ses lignes jointes', { skip: SKIP }, async () => {
  const html = await render(avecCouleurs({
    arretees: ['bleu', 'multicolore', 'or', 'rose'],
    textes: [
      'Le bleu : <b>l’aplomb</b> & la force.\nIl sculpte le visage.\r\nChez vous, il pose la pièce.',
      'Plusieurs couleurs.',
      null,
      'Le rose : l’audace, [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.',
    ],
    declarees: ['bleu'],
  }))
  const { phrases, attributs, noms } = tempsDeux(html)
  // « multicolore » n'est pas une couleur à montrer ; le doré n'a pas de texte : pas de phrase, mais il reste arrêté.
  assert.equal(attributs['data-arretees'], 'bleu or rose')
  assert.deepEqual(noms, [['bleu', 'Bleu'], ['or', 'Doré'], ['rose', 'Rose']])
  assert.deepEqual(phrases.map((p) => p.couleur), ['bleu', 'rose'])
  // Le texte est du texte : son balisage écrit tel quel ; ses lignes jointes par une espace.
  assert.equal(phrases[0].titre, 'Le bleu : &lt;b&gt;l’aplomb&lt;/b&gt; &amp; la force.')
  assert.equal(phrases[0].texte, 'Il sculpte le visage. Chez vous, il pose la pièce.')
  // Un texte d'une seule phrase : son titre seul. La note vient du réglage du thème.
  assert.deepEqual(phrases[1], { couleur: 'rose', pastille: '#FFC0CB', titre: 'Le rose : l’audace, 4,2/5 sur 86 avis.', texte: '' })
  assert.match(html, /<b><i data-allow-empty style="--c: #FFC0CB"><\/i>Le rose : l’audace, 4,2\/5 sur 86 avis\.<\/b><\/p>/)
})

test('rendu, couleurs déclarées seules : aucune phrase, la page complète avec les couleurs de la boutique', { skip: SKIP }, async () => {
  const html = await render(avecCouleurs({ declarees: ['multicolore', 'bleu', 'rose'] }))
  const { article, phrases, attributs, noms } = tempsDeux(html)
  assert.equal(article, '<p class="galerie-surtitre"><i>2</i> Les couleurs</p><h2>Chaque couleur <b>agit sur vous.</b></h2>')
  assert.deepEqual(phrases, [])
  assert.equal(attributs['data-arretees'], undefined)
  assert.equal(attributs['data-declarees'], 'multicolore bleu rose')
  // Le nom de toutes les couleurs qu'elle peut montrer (ni « Multicolore » ni « Noir & Blanc »), coupé avant « / ».
  assert.deepEqual(noms, [['gris', 'Gris'], ['blanc', 'Blanc'], ['vert', 'Vert'], ['jaune', 'Jaune'], ['noir', 'Noir'], ['beige', 'Beige'], ['marron', 'Marron'], ['bleu', 'Bleu'], ['or', 'Doré'], ['rouge', 'Rouge'], ['rose', 'Rose'], ['bronze', 'Bronze'], ['orange', 'Orange'], ['violet', 'Violet']])
  // Une boutique qui ne donne pas ses couleurs : les noms des couleurs du produit, à défaut.
  assert.deepEqual(tempsDeux(await render(avecCouleurs({ declarees: ['multicolore', 'bleu', 'rose'] }), { boutique: null })).noms, [['bleu', 'Bleu'], ['rose', 'Rose']])
})

test('rendu, rien de déclaré : la page lit l’image seule ; sans aucun nom, pas de modèle de noms', { skip: SKIP }, async () => {
  const { attributs, noms, phrases } = tempsDeux(await render(avecCouleurs()))
  assert.deepEqual(Object.keys(attributs), ['data-moteur', 'data-image'])
  assert.equal(noms.length, 14)
  assert.deepEqual(phrases, [])
  assert.match(tempsDeux(await render(avecCouleurs(), { boutique: null })).modele, /^<img class="galerie-scene-gris galerie-scene-a" [^>]*>(<img class="galerie-scene-teinte galerie-scene-a" [^>]*>){3}$/)
})

test('rendu, poster : la même structure, ses propres couleurs et ses propres textes', { skip: SKIP }, async () => {
  const poster = await render(avecCouleurs({ poster: true, arretees: ['rose', 'bleu', 'jaune'], textes: ['Le rose : l’énergie de la rue. Il éclabousse le torse.', 'Le bleu : la force. Il dessine les bras.', 'Le jaune : l’emblème. Le S brille au centre.'], declarees: ['multicolore', 'rose', 'bleu'] }))
  const { phrases, attributs } = tempsDeux(poster)
  assert.match(poster, /^<galerie-scene [^>]*data-support="poster"/)
  assert.deepEqual(phrases.map((p) => [p.couleur, p.titre]), [['rose', 'Le rose : l’énergie de la rue.'], ['bleu', 'Le bleu : la force.'], ['jaune', 'Le jaune : l’emblème.']])
  assert.equal(attributs['data-arretees'], 'rose bleu jaune')
})

test('rendu : dans une autre langue, les libellés et les textes traduits par Shopify, tels quels', { skip: SKIP }, async () => {
  const anglais = BOUTIQUE.map((c) => ({ ...c, label: { or: 'Gold', bleu: 'Blue', rose: 'Pink' }[c.system.handle] || c.label }))
  const p = avecCouleurs({ arretees: [], declarees: [] })
  p.metafields.artwork.colors = { value: ['bleu', 'or'].map((h) => anglais.find((c) => c.system.handle === h)) }
  p.metafields.artwork.color_text_1 = { value: 'Blue: confidence. It shapes the hero’s face.' }
  p.metafields.artwork.color_text_2 = { value: 'Gold: the glow. A soft light, like a lamp left on.' }
  const { phrases, noms } = tempsDeux(await render(p, { lang: 'en' }))
  assert.deepEqual(noms, [['bleu', 'Blue'], ['or', 'Gold']])
  assert.deepEqual(phrases.map((ph) => [ph.titre, ph.texte]), [['Blue: confidence.', 'It shapes the hero’s face.'], ['Gold: the glow.', 'A soft light, like a lamp left on.']])
})

test('les textes de la scène ne changent pas : le temps 2 n’a besoin d’aucun texte fixe de plus', () => {
  for (const file of Object.values(LANGS)) {
    const scene = json(`locales/${file}`).sections.mma.galerie.scene
    assert.ok(scene.colors && scene.colors_title_html, file)
  }
})

/* ---------- La section des couleurs à toucher (ticket 28) ----------
   sections/galerie-couleurs.liquid, juste après la scène : l'œuvre en couleurs, une pastille et une phrase par couleur
   arrêtée qui a son texte. Le serveur écrit tout ce qui se lit (Google, sans script) ; les pastilles, cachées, ne
   paraissent qu'avec l'élément. */

const COULEURS = 'sections/galerie-couleurs.liquid'
const MODELE = 'templates/product.oeuvre-3d.json'
// L'identifiant de la section dans le banc (renderSectionFile) : les identifiants de la section en dérivent.
const IDS = 'GalerieCouleurs-template--1__galerie-couleurs'

const renderCouleurs = async (p, { lang = 'fr', suffix = 'oeuvre-3d' } = {}) => tight(await renderSectionFile(COULEURS, {}, p, { suffix, lang }))
/* La section rendue, lue : sa racine, l'élément (ses attributs), ses pastilles, ses phrases, son œuvre. */
function lireCouleurs(html) {
  const racine = /^<section class="galerie galerie-couleurs" aria-labelledby="([^"]+)"><galerie-couleurs class="galerie-couleurs-element"((?: [\w-]+="[^"]*")*)>([\s\S]*)<\/galerie-couleurs><\/section>$/.exec(html)
  assert.ok(racine, `la section, sa racine et son élément : ${html.slice(0, 300)}`)
  const attributs = Object.fromEntries([...racine[2].matchAll(/ ([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
  const liste = /<div class="galerie-couleurs-pastilles" role="tablist" aria-label="([^"]+)" hidden>([\s\S]*?)<\/div>/.exec(racine[3])
  assert.ok(liste, 'les pastilles : une liste d’onglets, cachée')
  const pastilles = [...liste[2].matchAll(/<button class="galerie-couleurs-pastille" type="button" role="tab" id="([^"]+)" aria-controls="([^"]+)" aria-selected="(true|false)" tabindex="(0|-1)" data-couleur="([^"]+)" style="([^"]*)"><i class="galerie-couleurs-point" data-allow-empty aria-hidden="true"><\/i><span>([^<]*)<\/span><\/button>/g)]
    .map((m) => ({ id: m[1], controle: m[2], choisie: m[3] === 'true', tabindex: m[4], couleur: m[5], style: m[6], nom: m[7] }))
  assert.equal((liste[2].match(/<button /g) || []).length, pastilles.length, 'chaque pastille a la forme attendue')
  const bloc = /<div class="galerie-couleurs-phrases">([\s\S]*?)<\/div>/.exec(racine[3])
  const phrases = [...bloc[1].matchAll(/<p class="galerie-couleurs-phrase" id="([^"]+)" data-couleur="([^"]+)"><b><i data-allow-empty aria-hidden="true"(?: style="--c: ([^"]+)")?><\/i>([^<]*)<\/b>(?: ([^<]*))?<\/p>/g)]
    .map((m) => ({ id: m[1], couleur: m[2], pastille: m[3] || null, titre: m[4], texte: m[5] || '' }))
  assert.equal((bloc[1].match(/<p /g) || []).length, phrases.length, 'chaque phrase a la forme attendue')
  const image = /<img class="galerie-couleurs-image"( [^>]*)>/.exec(racine[3])
  return { titre: racine[1], attributs, etiquette: liste[1], pastilles, phrases, image: image && image[1], contenu: racine[3] }
}

test('la section des couleurs : sur les fiches produit seulement, une seule, sans réglage ; un texte d’aide que Shopify accepte', () => {
  const schema = schemaOf(COULEURS)
  assert.equal(schema.name, 'Galerie : les couleurs')
  assert.ok(schema.name.length <= 25, 'Shopify limite le nom d’une section à 25 caractères')
  assert.deepEqual(schema.enabled_on, { templates: ['product'] })
  assert.equal(schema.limit, 1)
  assert.equal(schema.blocks, undefined)
  assert.equal(schema.presets, undefined, 'elle ne s’ajoute pas depuis l’éditeur : elle a besoin du bloc principal en page galerie')
  // Un seul réglage : le texte d'aide, 500 caractères au plus (scripts/sections-schema.test.cjs), qui dit à quoi elle
  // sert, où la placer et d'où viennent ses couleurs et ses phrases.
  assert.deepEqual(schema.settings.map((s) => s.type), ['paragraph'])
  const aide = schema.settings[0].content
  assert.ok(aide.length <= 500, `${aide.length} caractères`)
  assert.match(aide, /après la scène/)
  assert.match(aide, /page galerie/)
  assert.match(aide, /Couleurs montrées sur la fiche/)
  assert.match(aide, /Texte de la couleur 1/)
})

test('la section des couleurs : les couleurs arrêtées et leurs textes, le moteur et la copie de 320 px pour l’élément, ni script ni style', () => {
  const source = code(COULEURS)
  // Les mêmes règles que la scène : le type d'œuvre, l'image à plat, le support.
  assert.match(source, /render 'artwork-kind', product: product, suffix: template\.suffix/)
  assert.match(source, /render 'artwork-flat-index', product: product/)
  assert.match(source, /product\.metafields\.painting_options\.frames_poster != blank/)
  // Les couleurs : celles que le serveur a arrêtées, leurs textes ; les déclarées, pour « blanc-noir » ; jamais
  // painting.color (la même liste, tenue pour les filtres des collections), ni le nom d'un modèle de page.
  assert.match(source, /for couleur in product\.metafields\.artwork\.colors\.value/)
  assert.match(source, /assign cle_texte = 'color_text_' \| append: forloop\.index/)
  assert.match(source, /product\.metafields\.artwork\[cle_texte\]\.value/)
  assert.match(source, /for couleur in product\.metafields\.shopify\['color-pattern'\]\.value/)
  assert.doesNotMatch(source, /painting\.color|shop\.metaobjects|oeuvre-galerie|oeuvre-3d|template_suffix/)
  // Un texte libre : échappé, puis ses jetons de la note Trustpilot remplacés.
  assert.match(source, /assign texte_sur = texte \| escape\s+capture texte_pret\s+render 'trustpilot-tokens', text: texte_sur\s+endcapture/)
  // Le moteur n'est pas dans la page : l'élément le donne à son travailleur, avec la copie de l'image que lit le serveur.
  assert.match(source, /data-moteur="{{ 'galerie-couleurs\.js' \| asset_url }}"/)
  assert.match(source, /data-image="{{ art \| image_url: width: 320 }}"/)
  // Aucun style ni script en ligne ; les seules valeurs passées à la feuille : la proportion de l'œuvre, la couleur
  // d'une pastille et son rang.
  assert.doesNotMatch(source, /<style|<script|{%-?\s*style/)
  const valeurs = [...source.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/{%[^%]*%}|{{[^}]*}}/g, '').replace(/[\s;:]+/g, ' ').trim())
  assert.deepEqual([...new Set(valeurs)].sort(), ['--c', '--c --i', '--ratio'])
  // Des classes de la page seulement : la feuille commune du site ne change pas.
  const classes = [...source.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
  for (const name of classes) assert.match(name, /^galerie(-[a-z]+)*$/, `classe « ${name} »`)
  assert.doesNotMatch(read('input.css'), /galerie-couleurs/)
})

test('rendu des couleurs, la toile Superman : le titre, puis une phrase et une pastille par couleur, dans l’ordre, la première choisie', { skip: SKIP }, async () => {
  const html = await renderCouleurs(avecCouleurs({ arretees: ['bleu', 'rose', 'jaune'], textes: SUPERMAN, declarees: ['multicolore', 'bleu', 'rose'] }))
  const lu = lireCouleurs(html)
  // La section se nomme par son titre, un h2 : le seul titre de la section (le h1 est celui du bloc principal).
  assert.equal(lu.titre, `${IDS}-titre`)
  assert.ok(lu.contenu.startsWith(`<div class="galerie-couleurs-tete"><p class="galerie-couleurs-surtitre">Les couleurs</p><h2 class="galerie-couleurs-titre" id="${IDS}-titre">Chaque couleur <b>agit sur vous.</b></h2></div><div class="galerie-couleurs-pastilles" `), lu.contenu.slice(0, 300))
  assert.deepEqual(html.match(/<h\d/g), ['<h2'])
  // Les phrases, toutes dans la page (Google les lit sans script) : le titre en gras avec la pastille de la couleur
  // dans la boutique, puis la suite.
  assert.deepEqual(lu.phrases, [
    { id: `${IDS}-phrase-1`, couleur: 'bleu', pastille: '#005BD3', titre: 'Le bleu : la force.', texte: 'Il dessine les muscles et l&#39;emblème du super-héros. Dans votre pièce, il donne du caractère et de l&#39;énergie.' },
    { id: `${IDS}-phrase-2`, couleur: 'rose', pastille: '#FFC0CB', titre: 'Le rose : l&#39;explosion.', texte: 'Il éclabousse le portrait comme un graffiti sauvage. Chez vous, il met de la vie et fait vibrer le mur.' },
    { id: `${IDS}-phrase-3`, couleur: 'jaune', pastille: '#D6C52E', titre: 'Le jaune : l&#39;éclair.', texte: 'Il traverse le tableau en coups de pinceau rapides. Un coup de peps qui réveille la pièce.' },
  ])
  // Les pastilles : des onglets, chacun lié à sa phrase ; la première choisie (seule dans l'ordre du clavier) ; leur
  // nom, le libellé de la couleur coupé avant « / » ; leur couleur dans la boutique et leur rang.
  assert.equal(lu.etiquette, 'Les couleurs du tableau')
  assert.deepEqual(lu.pastilles, [
    { id: `${IDS}-onglet-1`, controle: `${IDS}-phrase-1`, choisie: true, tabindex: '0', couleur: 'bleu', style: '--c: #005BD3; --i: 0', nom: 'Bleu' },
    { id: `${IDS}-onglet-2`, controle: `${IDS}-phrase-2`, choisie: false, tabindex: '-1', couleur: 'rose', style: '--c: #FFC0CB; --i: 1', nom: 'Rose' },
    { id: `${IDS}-onglet-3`, controle: `${IDS}-phrase-3`, choisie: false, tabindex: '-1', couleur: 'jaune', style: '--c: #D6C52E; --i: 2', nom: 'Jaune' },
  ])
  // Pour l'élément : le moteur, la copie de 320 px, les couleurs arrêtées et les déclarées ; la proportion de l'œuvre.
  assert.deepEqual(lu.attributs, {
    'data-moteur': '//www.myselfmonart.com/cdn/shop/t/25/assets/galerie-couleurs.js?v=1',
    'data-image': '//www.myselfmonart.com/cdn/shop/files/bonsai-zen-oeuvre.jpg?v=1&width=320',
    'data-arretees': 'bleu rose jaune',
    'data-declarees': 'multicolore bleu rose',
    style: '--ratio: 0.7484',
  })
  // L'œuvre, en couleurs : la place de ses calques et l'étiquette du survol, vides, que l'élément remplit.
  assert.match(lu.contenu, /<figure class="galerie-couleurs-oeuvre"><img class="galerie-couleurs-image" [^>]*><div class="galerie-couleurs-calques" data-allow-empty aria-hidden="true"><\/div><div class="galerie-couleurs-survol" aria-hidden="true"><i data-allow-empty><\/i><span data-allow-empty><\/span><\/div><\/figure>$/)
  // Tout élément vide garde sa place (le thème cache tout élément vide, sauf data-allow-empty).
  for (const [vide, , attrs] of html.matchAll(/<([a-z][\w-]*)((?:\s+[^<>]*?)?)><\/\1>/g)) assert.match(attrs, / data-allow-empty/, vide)
})

test('rendu des couleurs : l’œuvre est l’image de la scène, avec les mêmes attributs (une seule requête), lisible par l’élément', { skip: SKIP }, async () => {
  const p = avecCouleurs({ arretees: ['bleu'], textes: [SUPERMAN[0]] })
  const { image } = lireCouleurs(await renderCouleurs(p))
  const scene = tight(await renderSectionFile('sections/galerie-scene.liquid', {}, p, { suffix: 'oeuvre-3d' }))
  const oeuvre = /<img class="galerie-scene-image"( [^>]*)>/.exec(scene)[1]
  assert.equal(image, oeuvre, 'les mêmes paliers, la même taille annoncée : le navigateur choisit la même image')
  assert.match(image, / src="\/\/www\.myselfmonart\.com\/cdn\/shop\/files\/bonsai-zen-oeuvre\.jpg\?v=1&width=750"/)
  assert.match(image, / sizes="\(min-width: 900px\) 45vw, 86vw" width="1904" height="2544" alt="" loading="lazy" decoding="async" crossorigin="anonymous"$/)
})

test('rendu des couleurs : sans phrase à montrer, la section ne rend rien', { skip: SKIP }, async () => {
  // Les couleurs arrêtées sans leurs textes (le serveur ne les a pas encore écrits) ; les seules couleurs déclarées ;
  // rien du tout ; des textes vides.
  assert.equal(await renderCouleurs(avecCouleurs({ arretees: ['bleu', 'rose', 'jaune'], declarees: ['multicolore', 'bleu', 'rose'] })), '')
  assert.equal(await renderCouleurs(avecCouleurs({ declarees: ['multicolore', 'bleu', 'rose'] })), '')
  assert.equal(await renderCouleurs(avecCouleurs()), '')
  assert.equal(await renderCouleurs(avecCouleurs({ arretees: ['bleu', 'rose'], textes: ['  ', '\n'] })), '')
  // « multicolore » ou « blanc-noir » ne se montrent jamais, même avec un texte.
  assert.equal(await renderCouleurs(avecCouleurs({ arretees: ['multicolore', 'blanc-noir'], textes: ['Plusieurs couleurs.', 'Noir et blanc.'] })), '')
})

test('rendu des couleurs, le zèbre : « Noir & Blanc » déclaré, deux pastilles, le noir puis le blanc, et « blanc-noir » pour le moteur', { skip: SKIP }, async () => {
  const lu = lireCouleurs(await renderCouleurs(avecCouleurs({
    arretees: ['noir', 'blanc'],
    textes: ['Le noir : la nuit de la savane. Il enveloppe le zèbre et fait le silence autour de lui.', 'Le blanc : le trait de lumière. Chaque rayure accroche la lumière et dessine l’animal.'],
    declarees: ['blanc-noir'],
  })))
  assert.deepEqual(lu.pastilles.map((p) => [p.couleur, p.nom, p.style]), [['noir', 'Noir', '--c: #000000; --i: 0'], ['blanc', 'Blanc', '--c: #FFFFFF; --i: 1']])
  assert.deepEqual(lu.phrases.map((p) => [p.couleur, p.titre]), [['noir', 'Le noir : la nuit de la savane.'], ['blanc', 'Le blanc : le trait de lumière.']])
  assert.equal(lu.attributs['data-arretees'], 'noir blanc')
  assert.equal(lu.attributs['data-declarees'], 'blanc-noir')
  // Ce que l'élément en fera : « blanc-noir » pour le moteur, qui rend toujours le noir puis le blanc.
  assert.deepEqual(entreeDuMoteur({ arretees: lu.attributs['data-arretees'].split(' '), declarees: lu.attributs['data-declarees'].split(' ') }), { lire: ['blanc-noir'], completer: false })
})

test('rendu des couleurs : un texte libre, échappé, ses jetons Trustpilot remplacés, ses lignes jointes ; une couleur sans texte n’a ni pastille ni phrase', { skip: SKIP }, async () => {
  const lu = lireCouleurs(await renderCouleurs(avecCouleurs({
    arretees: ['bleu', 'multicolore', 'or', 'rose'],
    textes: [
      'Le bleu : <b>l’aplomb</b> & la force.\nIl sculpte le visage.\r\nChez vous, il pose la pièce.',
      'Plusieurs couleurs.',
      null,
      'Le rose : l’audace, [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.',
    ],
    declarees: ['bleu'],
  })))
  // Le moteur range l'image d'après toutes les couleurs arrêtées, comme le serveur (« multicolore » n'en est pas une) ;
  // ne se montrent que celles qui ont un texte, numérotées à la suite.
  assert.equal(lu.attributs['data-arretees'], 'bleu or rose')
  assert.deepEqual(lu.pastilles.map((p) => [p.id, p.couleur, p.nom, p.style]), [[`${IDS}-onglet-1`, 'bleu', 'Bleu', '--c: #005BD3; --i: 0'], [`${IDS}-onglet-2`, 'rose', 'Rose', '--c: #FFC0CB; --i: 1']])
  assert.deepEqual(lu.phrases.map((p) => p.couleur), ['bleu', 'rose'])
  // Le texte est du texte : son balisage écrit tel quel ; ses lignes jointes par une espace.
  assert.equal(lu.phrases[0].titre, 'Le bleu : &lt;b&gt;l’aplomb&lt;/b&gt; &amp; la force.')
  assert.equal(lu.phrases[0].texte, 'Il sculpte le visage. Chez vous, il pose la pièce.')
  // Un texte d'une seule phrase : son titre seul. La note vient du réglage du thème, jamais d'un chiffre écrit.
  assert.deepEqual(lu.phrases[1], { id: `${IDS}-phrase-2`, couleur: 'rose', pastille: '#FFC0CB', titre: 'Le rose : l’audace, 4,2/5 sur 86 avis.', texte: '' })
})

test('rendu des couleurs : le libellé d’une couleur est du texte ; sans libellé ni pastille dans la boutique, la couleur garde un nom', { skip: SKIP }, async () => {
  const p = avecCouleurs({ arretees: [], declarees: [] })
  p.metafields.artwork.colors = { value: [{ system: { handle: 'bleu' }, label: 'Bleu <nuit> & co / Marine', color: '#005BD3' }, { system: { handle: 'vert' }, label: '', color: null }] }
  p.metafields.artwork.color_text_1 = { value: 'Le bleu : la nuit. Il tombe.' }
  p.metafields.artwork.color_text_2 = { value: 'Le vert : la forêt. Il pousse.' }
  const lu = lireCouleurs(await renderCouleurs(p))
  assert.deepEqual(lu.pastilles.map((x) => [x.nom, x.style]), [['Bleu &lt;nuit&gt; &amp; co', '--c: #005BD3; --i: 0'], ['Vert', '--i: 1']])
  // Une couleur sans pastille dans la boutique : sa phrase sans couleur ; l'élément pose celle qu'il lit dans l'œuvre.
  assert.equal(lu.phrases[1].pastille, null)
})

test('rendu des couleurs, toile et poster : chacun sa liste, ses couleurs et ses textes ; « tableau » ou « poster »', { skip: SKIP }, async () => {
  const poster = lireCouleurs(await renderCouleurs(avecCouleurs({ poster: true, arretees: ['rose', 'bleu', 'jaune'], textes: ['Le rose : l’énergie de la rue. Il éclabousse le torse.', 'Le bleu : la force. Il dessine les bras.', 'Le jaune : l’emblème. Le S brille au centre.'], declarees: ['multicolore', 'rose', 'bleu'] })))
  assert.equal(poster.etiquette, 'Les couleurs du poster')
  assert.deepEqual(poster.pastilles.map((p) => p.couleur), ['rose', 'bleu', 'jaune'])
  assert.deepEqual(poster.phrases.map((p) => p.titre), ['Le rose : l’énergie de la rue.', 'Le bleu : la force.', 'Le jaune : l’emblème.'])
  assert.equal(poster.attributs['data-arretees'], 'rose bleu jaune')
  const toile = lireCouleurs(await renderCouleurs(avecCouleurs({ arretees: ['bleu'], textes: [SUPERMAN[0]] })))
  assert.equal(toile.etiquette, 'Les couleurs du tableau')
})

test('rendu des couleurs : dans chaque langue, ses textes fixes ; les libellés et les phrases tels que Shopify les traduit', { skip: SKIP }, async () => {
  const ATTENDU = {
    en: ['The colours', 'Every colour <b>does something to you.</b>', 'The colours of the canvas', 'The colours of the poster'],
    de: ['Die Farben', 'Jede Farbe <b>wirkt auf Sie.</b>', 'Die Farben des Wandbilds', 'Die Farben des Posters'],
    es: ['Los colores', 'Cada color <b>actúa sobre ti.</b>', 'Los colores del cuadro', 'Los colores del póster'],
    nl: ['De kleuren', 'Elke kleur <b>doet iets met je.</b>', 'De kleuren van het schilderij', 'De kleuren van de poster'],
  }
  const anglais = BOUTIQUE.map((c) => ({ ...c, label: { or: 'Gold', bleu: 'Blue' }[c.system.handle] || c.label }))
  for (const [lang, [surtitre, titre, toile, poster]] of Object.entries(ATTENDU)) {
    for (const estPoster of [false, true]) {
      const p = avecCouleurs({ poster: estPoster, arretees: [], declarees: [] })
      p.metafields.artwork.colors = { value: ['bleu', 'or'].map((h) => anglais.find((c) => c.system.handle === h)) }
      p.metafields.artwork.color_text_1 = { value: 'Blue: confidence. It shapes the hero’s face.' }
      p.metafields.artwork.color_text_2 = { value: 'Gold: the glow. A soft light, like a lamp left on.' }
      const lu = lireCouleurs(await renderCouleurs(p, { lang }))
      assert.ok(lu.contenu.includes(`<p class="galerie-couleurs-surtitre">${surtitre}</p><h2 class="galerie-couleurs-titre" id="${IDS}-titre">${titre}</h2>`), lang)
      assert.equal(lu.etiquette, estPoster ? poster : toile, lang)
      assert.deepEqual(lu.pastilles.map((x) => x.nom), ['Blue', 'Gold'], lang)
      assert.deepEqual(lu.phrases.map((x) => [x.titre, x.texte]), [['Blue: confidence.', 'It shapes the hero’s face.'], ['Gold: the glow.', 'A soft light, like a lamp left on.']], lang)
    }
  }
})

test('rendu des couleurs : hors d’une fiche d’œuvre, ou sans image à plat, la section ne rend rien', { skip: SKIP }, async () => {
  const p = (options) => {
    const produit = avecCouleurs({ arretees: ['bleu'], textes: [SUPERMAN[0]] })
    return options ? { ...product(options), metafields: produit.metafields } : produit
  }
  // Un produit sans image.
  assert.equal(await renderCouleurs(p({ files: [] })), '')
  // Un autre modèle de page (un produit personnalisé, une tapisserie, le modèle par défaut) : pas une fiche d'œuvre.
  for (const suffix of ['personalized', 'tapestry', null]) assert.equal(await renderCouleurs(p(), { suffix }), '', String(suffix))
  // Les fiches d'œuvre de toujours, si la section y était posée : leur image à plat.
  assert.match(await renderCouleurs(p(), { suffix: 'painting' }), /^<section class="galerie galerie-couleurs" /)
})

test('les autres pages ne changent pas : la section n’entre que dans la fiche 3D, entre la scène et l’histoire', () => {
  for (const name of fs.readdirSync(path.join(ROOT, 'templates')).filter((n) => /\.json$/.test(n))) {
    if (`templates/${name}` === MODELE) continue
    assert.doesNotMatch(read(`templates/${name}`), /galerie-couleurs|galerie_couleurs/, name)
  }
  assert.ok(exists(MODELE))
  const modele = json(MODELE)
  const types = modele.order.map((id) => modele.sections[id].type)
  // Le modèle la reçoit par un second commit : Shopify refuse un modèle qui cite une section qu'il ne connaît pas encore.
  if (!types.includes('galerie-couleurs')) return
  assert.deepEqual(types.slice(types.indexOf('galerie-scene'), types.indexOf('galerie-scene') + 3), ['galerie-scene', 'galerie-couleurs', 'galerie-histoire'])
  assert.deepEqual(modele.sections.galerie_couleurs, { type: 'galerie-couleurs', settings: {} })
  assert.equal(types.filter((t) => t === 'galerie-couleurs').length, 1)
})

/* ---------- Les textes de la section (ticket 28) ---------- */

const textesCouleurs = (lang) => json(`locales/${LANGS[lang]}`).sections.mma.galerie.couleurs

test('textes des couleurs : sous sections.mma.galerie.couleurs, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const CLES = ['colors', 'colors_title_html', 'swatches_canvas', 'swatches_poster']
  const fr = textesCouleurs('fr')
  // Le surtitre et le titre du temps 2 de la scène, repris tels quels ; le nom de la liste des pastilles.
  assert.deepEqual(fr, { colors: 'Les couleurs', colors_title_html: 'Chaque couleur <b>agit sur vous.</b>', swatches_canvas: 'Les couleurs du tableau', swatches_poster: 'Les couleurs du poster' })
  for (const lang of Object.keys(LANGS)) {
    const t = textesCouleurs(lang)
    assert.ok(t, `${lang} : sections.mma.galerie.couleurs`)
    assert.deepEqual(Object.keys(t).sort(), CLES, lang)
    for (const [cle, texte] of Object.entries(t)) {
      assert.ok(typeof texte === 'string' && texte.trim(), `${lang}.${cle}`)
      if (lang !== 'fr') assert.notEqual(texte, fr[cle], `${lang}.${cle} : resté en français`)
      if (cle.endsWith('_html')) assert.match(texte, /^[^<>]*<b>[^<>]+<\/b>[^<>]*$/, `${lang}.${cle}`)
      else assert.doesNotMatch(texte, /[<>]/, `${lang}.${cle}`)
      assert.doesNotMatch(texte, /'/, `${lang}.${cle} : apostrophe droite`)
    }
    assert.notEqual(t.swatches_canvas, t.swatches_poster, lang)
    assert.match(t.swatches_poster, /poster|póster/i, lang)
  }
})
