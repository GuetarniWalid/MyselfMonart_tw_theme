// Les couleurs à toucher de la page galerie (dossier .scratch/fiche-3d/galerie, ticket 28) : « Chaque couleur agit
// sur vous », une section à part, juste après la scène (sections/galerie-couleurs.liquid). L'œuvre en couleurs, une
// pastille et une phrase par couleur ; toucher une pastille, ou l'œuvre, montre la phrase de la couleur et pose ses
// points là où elle se trouve, après un éclat de ses zones. L'élément <galerie-couleurs> (assets/oeuvre-galerie.js)
// trouve les zones dans un travailleur, avec le moteur de la page d'essai (assets/galerie-couleurs.js, le même que
// celui du serveur), puis calcule ce qu'il y ajoute (points, contours, carte des couleurs) à partir de ses masques.
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
const { ROOT, read, exists, code, rules, LANGS, json, schemaOf, SKIP, product, renderSectionFile } = require('./galerie-banc.cjs')
const {
  entreeDuMoteur, lireLesZones, texteDuTravailleur, planDesOnglets, ongletAuPoint, ongletVise, volDuRepere, eclatDe,
} = require('../assets/oeuvre-galerie.js')

const CSS = 'assets/oeuvre-galerie.css'
const JS = 'assets/oeuvre-galerie.js'
const MOTEUR = 'assets/galerie-couleurs.js'
// Le moteur de la page d'essai, tel que Walid l'a validé le 20/11/2026, et son empreinte : celle que vérifie le
// serveur pour sa copie (dépôt du backend, tests/golden/artwork-colors.js, app/Services/ArtworkColors/couleurs.ts).
const ESSAI = '.scratch/fiche-3d/galerie/couleurs/couleurs.js'
const EMPREINTE = '58c19596165179587ae3285b7f58ed970f93c7b25209dfb4fc12353ea570729e'
const MOTION = '@media (prefers-reduced-motion: no-preference)'
const LINKED = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
const LARGE = '@media (min-width: 900px)'

// Le moteur, chargé comme dans une page : il se pose sur l'objet global.
require(`../${MOTEUR}`)
const Couleurs = globalThis.Couleurs

/* Le bloc des couleurs dans la feuille ou le script de la page : entre ses deux repères. */
const blockOf = (file) => {
  const source = read(file)
  const start = source.indexOf('/* === Couleurs à toucher (ticket 28) : début ===')
  const end = source.indexOf('/* === Couleurs à toucher (ticket 28) : fin === */')
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

/* ---------- Ce que la page donne au moteur ---------- */

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

/* ---------- La lecture des zones (dans le travailleur) ---------- */

test('la lecture : les couleurs données, dans leur ordre, chacune avec sa couleur lue, sa clarté, sa part et son masque', () => {
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  const lu = lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['bleu', 'rose', 'jaune'])
  lu.couleurs.forEach((c) => assert.match(c.css, /^rgb\(\d+,\d+,\d+\)$/))
  assert.deepEqual(lu.couleurs.map((c) => Math.round(c.part * 100)), [45, 35, 20])
  // La clarté (OKLab, 0 à 1) : le jaune bien plus clair que le bleu.
  const [bleu, , jaune] = lu.couleurs.map((c) => c.L)
  assert.ok(bleu > 0.3 && bleu < 0.6 && jaune > 0.8, `bleu ${bleu}, jaune ${jaune}`)
  // Un masque par couleur, de la taille de l'image : plein sur sa bande, vide sur les autres.
  assert.equal(lu.masques.length, 3)
  for (const alpha of lu.masques) assert.equal(alpha.length, largeur * hauteur)
  assert.ok(moyenne(lu.masques[0], largeur, 10, 130) > 250 && moyenne(lu.masques[0], largeur, 160, 250) < 5)
  assert.ok(moyenne(lu.masques[1], largeur, 160, 250) > 250 && moyenne(lu.masques[1], largeur, 270, 320) < 5)
  assert.ok(moyenne(lu.masques[2], largeur, 270, 320) > 250 && moyenne(lu.masques[2], largeur, 10, 130) < 5)
  // L'ordre est celui de la liste, pas celui de l'image.
  assert.deepEqual(lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['jaune', 'bleu'], completer: false }).couleurs.map((c) => c.handle), ['jaune', 'bleu'])
})

test('la lecture : les points d’une couleur se posent sur elle, loin des bords ; un, deux ou trois selon sa place dans l’œuvre', () => {
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  const lu = lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  const BANDES = { bleu: [0, 0.45], rose: [0.45, 0.8], jaune: [0.8, 1] }
  for (const c of lu.couleurs) {
    assert.ok(c.reperes.length >= 1 && c.reperes.length <= 3, `${c.handle} : ${c.reperes.length} points`)
    for (const { x, y } of c.reperes) {
      // Sur sa bande, et dans les marges de l'œuvre (9 % de son petit côté).
      assert.ok(x > BANDES[c.handle][0] && x < BANDES[c.handle][1], `${c.handle} : x = ${x}`)
      assert.ok(y > 0.09 && y < 0.91, `${c.handle} : y = ${y}`)
    }
  }
  // Une couleur qui tient la moitié de l'œuvre ou plus : un seul point.
  const grande = lireLesZones(Couleurs, ...Object.values(bandes([['bleu', 0.7], ['jaune', 0.3]])), { lire: ['bleu', 'jaune'], completer: false })
  assert.equal(grande.couleurs[0].reperes.length, 1)
  // Des taches éparses d'une couleur : plusieurs points, loin les uns des autres (un quart de la diagonale au moins).
  const W = 320
  const H = 240
  const taches = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) taches.set([...TEINTES.bleu, 255], i * 4)
  for (const [cx, cy] of [[50, 50], [270, 50], [160, 200]]) {
    for (let y = cy - 14; y < cy + 14; y++) for (let x = cx - 14; x < cx + 14; x++) taches.set([...TEINTES.rouge, 255], (y * W + x) * 4)
  }
  const rouge = lireLesZones(Couleurs, taches, W, H, { lire: ['bleu', 'rouge'], completer: false }).couleurs.find((c) => c.handle === 'rouge')
  assert.equal(rouge.reperes.length, 3)
  for (const [i, p] of rouge.reperes.entries()) {
    // Chaque point sur une tache, et loin des autres points.
    assert.ok([[50, 50], [270, 50], [160, 200]].some(([cx, cy]) => Math.abs(p.x * W - cx) < 14 && Math.abs(p.y * H - cy) < 14), `point ${p.x}, ${p.y}`)
    for (const q of rouge.reperes.slice(i + 1)) assert.ok(Math.hypot((p.x - q.x) * W, (p.y - q.y) * H) > 0.26 * Math.hypot(W, H) - 2)
  }
})

test('la lecture : le contour d’une couleur est un trait d’un pixel juste autour de ses zones', () => {
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  const lu = lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.equal(lu.contours.length, 3)
  // Le bleu tient les colonnes 0 à 143 : son trait est juste après, colonne 144 (à un pixel près), sur toute la hauteur.
  const colonnes = (alpha) => [...new Set([...alpha.keys()].filter((i) => alpha[i] > 0).map((i) => i % largeur))].sort((a, b) => a - b)
  const bleu = colonnes(lu.contours[0])
  assert.ok(bleu.length >= 1 && bleu.length <= 2 && bleu.every((x) => x >= 143 && x <= 145), `colonnes ${bleu}`)
  assert.equal(lu.contours[0].filter((v) => v > 0).length, hauteur * bleu.length)
  // Le rose a deux bords : un de chaque côté.
  const rose = colonnes(lu.contours[1])
  assert.ok(rose.some((x) => x >= 142 && x <= 144) && rose.some((x) => x >= 256 && x <= 258), `colonnes ${rose}`)
  // Jamais à l'intérieur d'une zone.
  assert.ok(lu.contours[0].every((v, i) => !v || lu.masques[0][i] < 128))
})

test('la lecture : la carte dit quelle couleur est où, une case pour 4 × 4 pixels', () => {
  const { pixels, largeur, hauteur } = bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]])
  const lu = lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.deepEqual([lu.cw, lu.ch], [80, 60])
  assert.equal(lu.carte.length, 80 * 60)
  assert.ok(lu.carte instanceof Uint8Array)
  // Le rang de la couleur dans la lecture : le bleu à gauche, le rose au milieu, le jaune à droite.
  for (const y of [0, 30, 59]) assert.deepEqual([10, 50, 75].map((x) => lu.carte[y * 80 + x]), [0, 1, 2])
  // Une case sans couleur montrée : 255. Le noir n'est pas lu ici.
  const avecNoir = bandes([['bleu', 0.5], ['noir', 0.5]])
  const sans = lireLesZones(Couleurs, avecNoir.pixels, 320, 240, { lire: ['bleu'], completer: false })
  assert.deepEqual([sans.carte[30 * 80 + 10], sans.carte[30 * 80 + 70]], [0, 255])
})

test('la lecture : une couleur que l’image n’a pas n’est pas rendue ; le doré s’appelle « or » dans la boutique', () => {
  const deux = bandes([['bleu', 0.5], ['rose', 0.5]])
  const lu = lireLesZones(Couleurs, deux.pixels, deux.largeur, deux.hauteur, { lire: ['vert', 'bleu'], completer: false })
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['bleu'])
  assert.deepEqual([lu.masques.length, lu.contours.length], [1, 1])
  const dore = bandes([['dore', 0.7], ['noir', 0.3]])
  assert.deepEqual(lireLesZones(Couleurs, dore.pixels, dore.largeur, dore.hauteur, { lire: ['or', 'noir'], completer: false }).couleurs.map((c) => c.handle), ['or', 'noir'])
})

test('le zèbre : avec « blanc-noir », le noir puis le blanc, chacun avec ses points ; le blanc séparé, il n’en resterait presque rien', () => {
  const { pixels, largeur, hauteur } = zebre()
  assert.deepEqual([largeur, hauteur], [160, 120])
  // Ce que le serveur a écrit pour lui : déclaré « Noir & Blanc », arrêté noir puis blanc.
  const lu = lireLesZones(Couleurs, pixels, largeur, hauteur, entreeDuMoteur({ arretees: ['noir', 'blanc'], declarees: ['blanc-noir'] }))
  assert.deepEqual(lu.couleurs.map((c) => c.handle), ['noir', 'blanc'])
  const [noir, blanc] = lu.couleurs.map((c) => c.part)
  assert.ok(noir > 0.75 && blanc > 0.1, `noir ${(noir * 100).toFixed(1)} %, blanc ${(blanc * 100).toFixed(1)} %`)
  for (const c of lu.couleurs) assert.ok(c.reperes.length >= 1, c.handle)
  // Ses deux pastilles, noir puis blanc, gardent chacune sa couleur.
  assert.deepEqual(planDesOnglets(['noir', 'blanc'], lu.couleurs.map((c) => c.handle)), { duMoteur: [0, 1], cachees: [] })
  // Sans la règle : le même zèbre, le noir et le blanc donnés à part. Les rayures sépia ne sont plus du blanc.
  const separes = lireLesZones(Couleurs, pixels, largeur, hauteur, { lire: ['noir', 'blanc'], completer: false })
  const blancSepare = separes.couleurs.find((c) => c.handle === 'blanc')
  assert.ok(!blancSepare || blancSepare.part < 0.03, `blanc à part : ${blancSepare && (blancSepare.part * 100).toFixed(1)} %`)
})

/* ---------- Le travailleur ---------- */

/* Joue le texte du travailleur dans un bac à sable : ce qu'un Worker a (self, importScripts, fetch,
   createImageBitmap, OffscreenCanvas, ImageData), et rien de la page. Une image de 640 × 480 en bandes. */
function travailleur({ image = { ok: true }, liste = [['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]] } = {}) {
  const journal = []
  class FausseToile {
    constructor(largeur, hauteur) {
      Object.assign(this, { largeur, hauteur, pixels: new Uint8ClampedArray(largeur * hauteur * 4) })
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
  // Ce qui sort du bac à sable, ramené à des valeurs simples (ses objets ne sont pas ceux de ce fichier) ; la carte,
  // un tableau d'octets, en liste.
  const reponse = new Promise((resolve) => {
    bac.postMessage = (message, transfert = []) => resolve({
      message: JSON.parse(JSON.stringify({ ...message, carte: message.carte ? Array.from(message.carte) : undefined })),
      transfert: Array.from(transfert, (objet) => objet === (message.carte && message.carte.buffer)),
    })
  })
  return { bac, journal: () => JSON.parse(JSON.stringify(journal)), reponse }
}

test('le travailleur : il charge le moteur, lit l’image ramenée à 320 px, et rend les couleurs, leurs masques et leurs contours en PNG, et la carte', async () => {
  const { bac, journal, reponse } = travailleur()
  bac.onmessage({ data: { moteur: 'https://boutique.test/assets/galerie-couleurs.js', image: 'https://boutique.test/files/oeuvre.jpg?width=320', lire: ['bleu', 'rose', 'jaune'], completer: false } })
  const { message, transfert } = await reponse
  assert.equal(message.erreur, undefined)
  assert.deepEqual(message.couleurs.map((c) => c.handle), ['bleu', 'rose', 'jaune'])
  // Le moteur et la copie de l'image qu'on lui donne ; l'image lue à 320 px de large, à ses proportions.
  const fait = journal()
  assert.deepEqual(fait.filter(([nom]) => nom === 'importScripts' || nom === 'fetch'), [['importScripts', 'https://boutique.test/assets/galerie-couleurs.js'], ['fetch', 'https://boutique.test/files/oeuvre.jpg?width=320']])
  assert.deepEqual(fait.find(([nom]) => nom === 'drawImage'), ['drawImage', 640, 480, 320, 240])
  assert.deepEqual(fait.find(([nom]) => nom === 'getContext'), ['getContext', '2d', { willReadFrequently: true }])
  assert.ok(fait.some(([nom]) => nom === 'close'), 'l’image décodée est rendue')
  // Ce que la page lit : la lecture faite ici, à l'identique.
  const attendu = lireLesZones(Couleurs, bandes([['bleu', 0.45], ['rose', 0.35], ['jaune', 0.2]]).pixels, 320, 240, { lire: ['bleu', 'rose', 'jaune'], completer: false })
  assert.deepEqual(message.couleurs, JSON.parse(JSON.stringify(attendu.couleurs)))
  // Chaque masque et chaque contour en PNG, dans le canal alpha.
  assert.deepEqual([message.masques.length, message.contours.length], [3, 3])
  message.masques.forEach((masque, rang) => { assert.equal(masque.type, 'image/png'); assert.deepEqual(masque.alpha, Array.from(attendu.masques[rang]), `masque ${rang}`) })
  message.contours.forEach((trait, rang) => { assert.equal(trait.type, 'image/png'); assert.deepEqual(trait.alpha, Array.from(attendu.contours[rang]), `contour ${rang}`) })
  // La carte, transférée (pas copiée), et sa taille.
  assert.deepEqual([message.cw, message.ch, message.carte.length], [80, 60, 4800])
  assert.deepEqual(message.carte, Array.from(attendu.carte))
  assert.deepEqual(transfert, [true])
})

test('le travailleur : une image qui ne vient pas, une erreur ; rien d’autre', async () => {
  const { bac, reponse } = travailleur({ image: { ok: false } })
  bac.onmessage({ data: { moteur: 'https://boutique.test/m.js', image: 'https://boutique.test/i.jpg', lire: [], completer: true } })
  assert.deepEqual((await reponse).message, { erreur: 'image 404' })
})

/* ---------- Les calculs de la page ---------- */

test('les pastilles et la lecture : chaque pastille retrouve sa couleur ; une couleur que l’œuvre n’a pas perd sa pastille', () => {
  // L'ordre de la page (celui des pastilles) n'est pas forcément celui du moteur.
  assert.deepEqual(planDesOnglets(['bleu', 'rose', 'jaune'], ['bleu', 'rose', 'jaune']), { duMoteur: [0, 1, 2], cachees: [] })
  assert.deepEqual(planDesOnglets(['bleu', 'rose', 'jaune'], ['rose', 'bleu']), { duMoteur: [1, 0, -1], cachees: [2] })
  // Une couleur lue sans pastille (arrêtée sans texte) : rien à montrer pour elle.
  assert.deepEqual(planDesOnglets(['bleu', 'rose'], ['bleu', 'or', 'rose']), { duMoteur: [0, 2], cachees: [] })
  // Aucune pastille retrouvée (une lecture qui a mal tourné) : rien n'est caché, la page reste sans zones.
  assert.deepEqual(planDesOnglets(['bleu', 'or'], ['vert']), { duMoteur: [-1, -1], cachees: [] })
  assert.deepEqual(planDesOnglets(['bleu'], []), { duMoteur: [-1], cachees: [] })
})

test('toucher l’œuvre : la couleur sous le doigt, ou la plus proche à quatre cases au plus ; sinon aucune', () => {
  // Une carte de 4 × 3 cases : le rang de la couleur lue, ou 255. Le rang 2 n'a pas de pastille.
  const zones = { cw: 4, ch: 3, carte: Uint8Array.from([0, 0, 1, 1, 0, 255, 1, 1, 255, 255, 255, 2]) }
  const versOnglet = new Map([[0, 0], [1, 2]])
  assert.equal(ongletAuPoint(zones, versOnglet, 0.1, 0.1), 0)
  assert.equal(ongletAuPoint(zones, versOnglet, 0.9, 0.1), 2)
  // Une case vide : la case la plus proche qui a une pastille (à égalité, la première en lisant).
  assert.equal(ongletAuPoint(zones, versOnglet, 0.3, 0.5), 0)
  // Une case dont la couleur n'a pas de pastille : la plus proche qui en a une.
  assert.equal(ongletAuPoint(zones, versOnglet, 0.95, 0.9), 2)
  // Hors de l'œuvre (le bord d'un doigt) : ramené au bord.
  assert.equal(ongletAuPoint(zones, versOnglet, -0.2, 1.3), 0)
  // Rien à quatre cases : aucune.
  const loin = { cw: 12, ch: 1, carte: Uint8Array.from([0, ...Array(11).fill(255)]) }
  assert.equal(ongletAuPoint(loin, new Map([[0, 0]]), 0.99, 0.5), -1)
  assert.equal(ongletAuPoint(loin, new Map([[0, 0]]), 0.3, 0.5), 0)
})

test('au clavier : les flèches vont d’une pastille à la voisine, en boucle ; Début et Fin vont aux bouts ; le reste ne fait rien', () => {
  assert.equal(ongletVise(0, 'ArrowRight', 3), 1)
  assert.equal(ongletVise(2, 'ArrowRight', 3), 0)
  assert.equal(ongletVise(1, 'ArrowDown', 3), 2)
  assert.equal(ongletVise(0, 'ArrowLeft', 3), 2)
  assert.equal(ongletVise(1, 'ArrowUp', 3), 0)
  assert.equal(ongletVise(2, 'Home', 3), 0)
  assert.equal(ongletVise(0, 'End', 3), 2)
  assert.equal(ongletVise(0, 'ArrowRight', 1), 0)
  for (const touche of ['Enter', ' ', 'Tab', 'a', 'Escape']) assert.equal(ongletVise(1, touche, 3), -1, touche)
})

test('le vol d’un point : il part de la pastille, monte en arc, et se pose ; l’arc ne dépasse pas 120 px', () => {
  // Un point posé 100 px à gauche et 200 px au-dessus de la pastille : il part d'elle (100, 200), gros et invisible.
  assert.deepEqual(volDuRepere(100, 200), [
    { transform: 'translate(100px, 200px) scale(2.2)', opacity: 0 },
    { transform: 'translate(100px, 200px) scale(2)', opacity: 1, offset: 0.06 },
    { transform: 'translate(42px, 12.4px) scale(1.25)', offset: 0.6 },
    { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
  ])
  // De loin, l'arc plafonne à 120 px au-dessus de la ligne droite.
  assert.equal(volDuRepere(0, 600)[2].transform, 'translate(0px, 132px) scale(1.25)')
})

test('l’éclat d’une zone : d’autant plus vif que la couleur est sombre ; aucun pour une couleur très claire', () => {
  assert.equal(eclatDe(0), '1.85')
  assert.equal(eclatDe(0.2), '1.68')
  assert.equal(eclatDe(0.79), '1.18')
  // Un blanc ne s'éclaircit pas : son contour suffit.
  assert.equal(eclatDe(0.8), null)
  assert.equal(eclatDe(0.97), null)
})

/* ---------- Le script : l'élément ---------- */

test('le script : l’élément galerie-couleurs, défini une fois, démarre à son arrivée et arrête tout à son départ', () => {
  const js = script()
  assert.match(js, /if \(customElements\.get\('galerie-couleurs'\)\) return;/)
  assert.match(js, /customElements\.define\('galerie-couleurs', /)
  assert.match(js, /connectedCallback\(\) {/)
  assert.match(js, /disconnectedCallback\(\) {/)
  assert.match(js, /if \(typeof window === 'undefined'\) {\s*Object\.assign\(module\.exports, { entreeDuMoteur, flou, labDemi, reperes, contour, carte, lireLesZones, texteDuTravailleur, planDesOnglets, ongletAuPoint, ongletVise, volDuRepere, eclatDe }\);\s*return;\s*}/)
  // La bascule Toile / Poster ne rejoue ni script en ligne ni chargement de page : rien n'y compte ; aucun objet global.
  assert.doesNotMatch(js, /DOMContentLoaded|addEventListener\('load'|readyState|window\.\w+ = /)
  // Chaque écouteur posé est retiré au départ.
  const added = [...js.matchAll(/([\w.]+)\.addEventListener\('(\w+)', (this\.\w+)/g)].map((m) => m.slice(1).join(' '))
  const removed = [...js.matchAll(/([\w.]+)\.removeEventListener\('(\w+)', (this\.\w+)/g)].map((m) => m.slice(1).join(' '))
  assert.deepEqual(added.sort(), ['this.figure click this.auToucher', 'this.figure pointerleave this.horsSurvol', 'this.figure pointermove this.auSurvol', 'this.liste click this.auClic', 'this.liste keydown this.auClavier'])
  assert.deepEqual(removed.sort(), added)
  assert.equal(js.match(/\.addEventListener\(/g).length, added.length, 'chaque écouteur a une fonction gardée, qu’on peut retirer')
  // L'approche (un observateur), le travailleur et son texte, la tranche en attente, les animations, l'image demandée,
  // la minuterie des mouvements réduits, les adresses des masques : tout s'arrête au départ.
  const depart = /disconnectedCallback\(\) {([\s\S]*?)\n    }\n/.exec(js)[1]
  for (const geste of [/this\.approche\.disconnect\(\)/, /this\.arreter\(\)/, /this\.animations\.forEach\(\(animation\) => animation\.cancel\(\)\)/, /cancelAnimationFrame\(this\.attenteSurvol\)/, /clearTimeout\(this\.minuterie\)/, /this\.rendre\(\)/]) assert.match(depart, geste)
  const arret = /arreter\(\) {([\s\S]*?)\n    }\n/.exec(js)[1]
  for (const geste of [/annuler\(this\.tranche\)/, /this\.travailleur\.terminate\(\)/, /URL\.revokeObjectURL\(this\.source\)/]) assert.match(arret, geste)
  assert.match(/rendre\(\) {([\s\S]*?)\n    }\n/.exec(js)[1], /this\.liens\.forEach\(\(lien\) => URL\.revokeObjectURL\(lien\)\)/)
})

test('le script : rien pendant le défilement ; la lecture se fait à l’approche du bloc, dans un travailleur', () => {
  const js = script()
  // Aucun écouteur de défilement ni de taille, rien qui revient : l'arrivée du bloc suit le défilement dans la feuille.
  assert.doesNotMatch(js, /'scroll'|'resize'|setInterval/)
  // Un écran et demi avant le bloc (le prototype), une fois.
  assert.match(js, /this\.approche = new IntersectionObserver\(/)
  assert.match(js, /{ rootMargin: '150% 0px' }/)
  assert.match(js, /new Worker\(this\.source\)/)
  assert.match(js, /new Blob\(\[texteDuTravailleur\(\)\], { type: 'text\/javascript' }\)/)
  // Le travailleur lit le moteur et l'image du serveur, à des adresses complètes (un travailleur fait d'un texte ne
  // sait pas lire une adresse relative) ; la liste donnée au moteur.
  assert.match(js, /postMessage\({ moteur: absolue\(this\.dataset\.moteur\), image: absolue\(this\.dataset\.image\), \.\.\.entree }\)/)
  assert.match(js, /entreeDuMoteur\({ arretees: liste\(this\.dataset\.arretees\), declarees: liste\(this\.dataset\.declarees\) }\)/)
  // Ce qu'il rend se pose dans un temps mort du fil principal (au plus tard 120 ms après, comme le prototype).
  assert.match(js, /const plusTard = \(tranche\) => \(window\.requestIdleCallback \? window\.requestIdleCallback\(tranche, { timeout: 120 }\) : window\.setTimeout\(tranche, 0\)\);/)
  // La souris ne fait qu'une mise à jour par image ; quand elle quitte l'œuvre, la mise à jour en attente est annulée
  // (sinon l'étiquette reviendrait hors de l'œuvre).
  assert.match(js, /if \(!this\.attenteSurvol\) this\.attenteSurvol = requestAnimationFrame\(/)
  assert.match(js, /this\.horsSurvol = \(\) => {\s*cancelAnimationFrame\(this\.attenteSurvol\);\s*this\.attenteSurvol = 0;\s*this\.figure\.removeAttribute\('data-survol'\);\s*};/)
  // Le toucher et la souris trouvent la couleur sous le pointeur de la même façon.
  assert.equal((js.match(/ongletAuPoint\(this\.zones, this\.versOnglet,/g) || []).length, 1)
})

test('le texte du travailleur : ses fonctions, puis son départ, sans dépendre du nom de la fonction qui part', () => {
  const texte = texteDuTravailleur()
  // Un outil qui raccourcirait les noms garde ceux des déclarations et de leurs appels ensemble ; un nom écrit dans
  // une chaîne, non : le travailleur part donc par l'expression de sa fonction.
  assert.match(texte, /\n\(function travail\(\) {[\s\S]*}\)\(\);$/)
  for (const nom of ['flou', 'labDemi', 'reperes', 'contour', 'carte', 'lireLesZones']) assert.match(texte, new RegExp(`^function ${nom}\\(`, 'm'), nom)
  assert.doesNotMatch(texte, /\ntravail\(\);/)
})

test('le script : les pastilles et les phrases deviennent des onglets ; une couleur introuvable perd sa pastille et sa phrase', () => {
  const js = script()
  // Le script montre les pastilles, fait des phrases des panneaux liés à leur pastille, et dit à la feuille qu'il est là.
  assert.match(js, /setAttribute\('role', 'tabpanel'\)/)
  assert.match(js, /setAttribute\('aria-labelledby', /)
  assert.match(js, /this\.liste\.hidden = false;/)
  assert.match(js, /this\.bloc\.setAttribute\('data-pret', ''\);/)
  // La couleur choisie : aria-selected, seule dans l'ordre du clavier ; les autres phrases cachées.
  assert.match(js, /setAttribute\('aria-selected', String\(/)
  assert.match(js, /setAttribute\('aria-hidden', String\(/)
  // Une couleur que le moteur n'a pas retrouvée : sa pastille part ; sa phrase ne se montrera plus, mais reste dans la
  // pile (invisible), pour que rien ne bouge dans la page quand le travailleur répond.
  assert.match(js, /this\.onglets\.forEach\(\(onglet, i\) => {\s*onglet\.hidden = plan\.cachees\.includes\(i\);\s*}\);/)
  assert.doesNotMatch(js, /panneaux\[i\]\.hidden|panneau\.hidden/)
  // Les zones : la couleur lue sur l'œuvre remplace celle de la boutique, sur la pastille et dans la phrase.
  assert.match(js, /this\.onglets\[i\]\.style\.setProperty\('--c', c\.css\)/)
  // Les calques d'une couleur viennent de la même image que l'œuvre (même requête : mêmes paliers, crossorigin).
  assert.match(js, /eclat\.crossOrigin = 'anonymous';/)
  assert.match(js, /eclat\.sizes = this\.image\.sizes;\s*eclat\.srcset = this\.image\.srcset;/)
  // Les éléments vides que le script ajoute gardent leur place (le thème cache tout élément vide).
  assert.ok((js.match(/setAttribute\('data-allow-empty', ''\)/g) || []).length >= 3)
  // En mouvements réduits : ni vol ni fondu, les zones un moment, puis seulement les points.
  assert.match(js, /if \(this\.reduit\.matches\) {/)
})

/* ---------- La feuille ---------- */

test('la feuille : un mouvement en « mouvements voulus » seulement ; ce qui suit le défilement, là où le navigateur sait le faire', () => {
  for (const r of sheet()) {
    if (!/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body)) continue
    assert.equal(r.context[0], MOTION, r.head)
    if (/animation-timeline|animation-range/.test(r.body)) assert.deepEqual(r.context, [MOTION, LINKED], r.head)
  }
  // L'arrivée du bloc, liée à son défilement : l'œuvre monte, les pastilles sortent une à une, les points de la première
  // couleur tombent sur l'œuvre.
  assert.equal(body('.galerie-couleurs[data-pret]', [MOTION, LINKED].join()), 'view-timeline: --galerie-couleurs block;')
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-oeuvre', [MOTION, LINKED].join()), 'animation: galerie-monte linear both; animation-timeline: --galerie-couleurs; animation-range: entry 0% entry 50%;')
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-pastille', [MOTION, LINKED].join()), 'animation: galerie-couleurs-pop linear both; animation-timeline: --galerie-couleurs; animation-range: entry calc(56% + var(--i) * 8%) entry calc(76% + var(--i) * 8%);')
  assert.equal(body('.galerie-couleurs[data-zones]:not([data-touche]) .galerie-couleurs-reperes[data-entree] .galerie-couleurs-repere', [MOTION, LINKED].join()), 'animation: galerie-couleurs-tombe linear both; animation-timeline: --galerie-couleurs; animation-range: entry calc(64% + var(--j) * 7%) entry calc(84% + var(--j) * 7%);')
  // Les images clés : à elles, sauf la montée du socle ; rien que transform et opacity.
  const frames = sheet().filter((r) => /^@keyframes /.test(r.head))
  assert.deepEqual(frames.map((f) => f.head).sort(), ['@keyframes galerie-couleurs-pop', '@keyframes galerie-couleurs-tombe'])
  assert.equal(body('@keyframes galerie-couleurs-pop'), '0% { opacity: 0; transform: translateY(18px) scale(0.5); } 70% { opacity: 1; transform: translateY(-3px) scale(1.06); } 100% { opacity: 1; transform: none; }')
  assert.equal(body('@keyframes galerie-couleurs-tombe'), '0% { opacity: 0; transform: translateY(-34px) scale(0.4); } 65% { opacity: 1; transform: translateY(3px) scale(1.12); } 100% { opacity: 1; transform: none; }')
  assert.match(read(CSS), /@keyframes galerie-monte {\s*from { opacity: 0; transform: translateY\(44px\); }\s*to { opacity: 1; transform: none; }\s*}/)
  // Les transitions du prototype, en « mouvements voulus ».
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-phrase', MOTION), 'transition: opacity 0.26s ease, transform 0.26s ease, visibility 0s linear 0s;')
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-phrase[aria-hidden="true"]', MOTION), 'transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0.14s;')
  assert.equal(body('.galerie-couleurs-point', MOTION), 'transition: transform 0.18s ease;')
  assert.equal(body('.galerie-couleurs-pastille::before', MOTION), 'transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.3, 1.6, 0.5, 1);')
  assert.equal(body('.galerie-couleurs-survol', MOTION), 'transition: opacity 0.12s ease;')
})

test('la feuille : sur téléphone, le titre, l’œuvre, la phrase, puis les pastilles sur la bande soleil, aux tailles du prototype', () => {
  assert.equal(body('.galerie-couleurs'), 'position: relative; background: var(--creme); overflow: hidden;')
  assert.equal(body('.galerie-couleurs-element'), 'display: grid; grid-template-areas: "tete" "oeuvre" "phrases" "pastilles"; padding-top: 40px; padding-left: var(--gout); padding-right: var(--goutd);')
  assert.equal(body('.galerie-couleurs:not([data-pret]) .galerie-couleurs-element'), 'padding-bottom: 56px;')
  assert.equal(body('.galerie-couleurs-surtitre'), 'margin: 0; font: 400 13px/1.2 var(--sans); letter-spacing: 0.08em; text-transform: uppercase; color: var(--encre);')
  assert.equal(body('.galerie-couleurs-titre'), 'margin: 12px 0 0; font: 300 clamp(31px, 9vw, 42px)/1 var(--sans); letter-spacing: -0.042em; text-wrap: balance;')
  assert.equal(body('.galerie-couleurs-phrase'), 'margin: 0; max-width: 31em; font: 400 14.5px/1.45 var(--sans); color: var(--encre-70);')
  assert.equal(body('.galerie-couleurs-phrase b'), 'display: flex; align-items: center; gap: 8px; margin-bottom: 3px; font: 700 16px/1.25 var(--sans); letter-spacing: -0.015em; color: var(--encre);')
  // Les phrases empilées à la même place (la plus longue donne la hauteur) : changer de couleur ne fait pas bouger la page.
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-phrase'), 'grid-area: 1 / 1;')
  assert.equal(body('.galerie-couleurs[data-pret] .galerie-couleurs-phrase[aria-hidden="true"]'), 'visibility: hidden; opacity: 0; transform: translateY(8px);')
  // L'œuvre : ce qui reste d'un écran une fois le texte et les pastilles posés, sans dépasser la largeur.
  assert.match(body('.galerie-couleurs-oeuvre'), /^grid-area: oeuvre; justify-self: center; position: relative; margin: 20px 0 0; --oh: min\(clamp\(250px, calc\(100svh - 450px\), 560px\), calc\(\(100vw - 40px\) \/ var\(--ratio\)\)\); height: var\(--oh\); width: calc\(var\(--oh\) \* var\(--ratio\)\); max-width: 100%;/)
  // Les pastilles, sur la bande soleil, d'un bord à l'autre ; leur nom à 15 px de l'anneau (retouche du 22/11).
  assert.equal(body('.galerie-couleurs-pastilles'), 'grid-area: pastilles; display: flex; justify-content: center; gap: 20px; margin: 18px calc(-1 * var(--goutd)) 0 calc(-1 * var(--gout)); padding: 16px var(--goutd) 22px var(--gout); background: var(--soleil);')
  assert.match(body('.galerie-couleurs-pastille'), /^position: relative; display: grid; justify-items: center; gap: 15px; min-width: 64px; padding-top: 6px; font: 600 12\.5px\/1 var\(--sans\); color: var\(--encre\);/)
  assert.match(body('.galerie-couleurs-point'), /^width: 50px; height: 50px; border-radius: 50%; background: var\(--c, var\(--encre-12\)\);/)
  assert.match(body('.galerie-couleurs-pastille::before'), /^content: ""; position: absolute; left: 50%; top: 31px; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; box-shadow: 0 0 0 2\.5px var\(--encre\); opacity: 0; transform: scale\(0\.8\);$/)
  assert.equal(body('.galerie-couleurs-pastille[aria-selected="true"]::before'), 'opacity: 1; transform: none;')
  // Les points d'une couleur sur l'œuvre : sa couleur, cerclée de blanc.
  assert.match(body('.galerie-couleurs-repere'), /^position: absolute; left: calc\(var\(--x\) \* 100%\); top: calc\(var\(--y\) \* 100%\); width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; background: var\(--c\); box-shadow: 0 0 0 3px var\(--blanc\), /)
  // Cachées : une pastille dont la couleur n'est pas dans l'œuvre, la rangée sans script.
  assert.equal(body('.galerie-couleurs-pastilles[hidden], .galerie-couleurs-pastille[hidden]'), 'display: none;')
  // L'éclat d'une zone : la zone avivée, d'autant plus que sa couleur est sombre (--luminosite, posé par l'élément).
  assert.match(body('.galerie-couleurs-eclat'), /filter: brightness\(var\(--luminosite\)\) saturate\(1\.3\);/)
})

test('la feuille : sur ordinateur (900 px), le texte, la phrase et les pastilles à gauche, l’œuvre à droite au-dessus du sol soleil', () => {
  assert.equal(body('.galerie-couleurs[data-pret]::after', LARGE), 'content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 15svh; background: var(--soleil);')
  assert.equal(body('.galerie-couleurs-element', LARGE), 'position: relative; z-index: 1; min-height: 100svh; grid-template-columns: minmax(0, 32vw) minmax(0, 1fr); grid-template-rows: 1fr auto auto auto 1fr; grid-template-areas: ". oeuvre" "tete oeuvre" "phrases oeuvre" "pastilles oeuvre" ". oeuvre"; column-gap: 6vw; padding: 10svh 10vw 0 6vw;')
  assert.equal(body('.galerie-couleurs-titre', LARGE), 'margin-top: 18px; font-size: clamp(44px, 4.7vw, 80px); line-height: 0.97;')
  assert.equal(body('.galerie-couleurs-oeuvre', LARGE), 'align-self: end; justify-self: center; margin: 0 0 calc(15svh + 5svh); --oh: min(66svh, calc(44vw / var(--ratio)));')
  assert.equal(body('.galerie-couleurs-pastilles', LARGE), 'justify-content: flex-start; gap: 26px; margin: 34px 0 0 -8px; padding: 0; background: none;')
  assert.equal(body('.galerie-couleurs-point', LARGE), 'width: 58px; height: 58px;')
  assert.equal(body('.galerie-couleurs-pastille::before', LARGE), 'top: 35px; width: 72px; height: 72px; margin: -36px 0 0 -36px;')
  assert.equal(body('.galerie-couleurs-repere', LARGE), 'width: 24px; height: 24px; margin: -12px 0 0 -12px;')
  // Sans script : le titre et les phrases à gauche, l'œuvre à droite, sans hauteur d'écran imposée.
  assert.equal(body('.galerie-couleurs:not([data-pret]) .galerie-couleurs-element', LARGE), 'min-height: 0; padding-bottom: 8svh; grid-template-areas: "tete oeuvre" "phrases oeuvre"; grid-template-rows: auto 1fr;')
})

test('la feuille : aucune couleur écrite, aucune adresse ; les ombres par color-mix sur les couleurs du socle', () => {
  for (const { head, body: text } of sheet()) assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|url\(/i, head)
  const ombres = sheet().flatMap((r) => [...r.body.matchAll(/color-mix\(in srgb, var\(--([\w-]+)\) \d+%, transparent\)/g)].map((m) => m[1]))
  assert.ok(ombres.length >= 6)
  assert.deepEqual([...new Set(ombres)].sort(), ['encre', 'noir'])
  // Le mur et le sol du temps 2 validé : crème et soleil.
  assert.match(body('.galerie-couleurs'), /background: var\(--creme\);/)
  // Rien du bloc hors de la feuille de la page : la feuille commune du site ne change pas.
  assert.doesNotMatch(read('input.css'), /galerie-couleurs/)
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
