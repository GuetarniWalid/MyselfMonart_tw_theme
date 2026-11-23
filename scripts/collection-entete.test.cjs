/*
 * Tests de l'en-tête qui suit le doigt, sur la nouvelle page collection (ticket 07 de .scratch/collection-design) :
 * - le calcul d'une image (assets/collection-entete.js, sous Node) : le décalage de l'en-tête, la hauteur où la ligne
 *   des filtres se colle, son état collé, la fermeture d'un menu ;
 * - le gabarit (layout/collection.liquid), qui charge le script sur cette page seulement.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { image } = require('../assets/collection-entete.js')

// L'en-tête de la boutique : 90 px de haut, sous le bandeau d'annonce de 33 px (relevé en ligne le 23/11/2026, à 390
// et à 1280 px). La page : 6 000 px de défilement au plus.
const H = 90
const BANDEAU = 33
const MAX = 6000
const lu = (y, plus = {}) => ({ y, max: MAX, hauteur: H, colle: BANDEAU, saut: null, retenu: false, ancre: null, ligne: null, ...plus })

/* Une suite d'images : chaque position du défilement (ou { y, … } pour ce que l'image lit en plus), à partir d'un
   en-tête posé à `depart`. Rend le décalage de chaque image. */
function suivre(positions, depart = { decalage: 0, y: 0, haut: H }) {
  let avant = depart
  return positions.map((p) => {
    const { y, ...plus } = typeof p === 'number' ? { y: p } : p
    const suite = image(avant, lu(y, plus))
    avant = { decalage: suite.decalage, y: suite.y, haut: suite.haut }
    return suite.decalage
  })
}

/* ---------- Le décalage de l'en-tête ---------- */

test('l’en-tête suit le doigt : il part de ce qu’on descend, revient de ce qu’on remonte, image par image', () => {
  // Plus bas que le bandeau, l'en-tête là : 30 px plus bas, il est parti de 30 px ; 20 de plus, 50 ; 15 px plus haut, 35.
  assert.deepEqual(suivre([530, 550, 535, 500], { decalage: 0, y: 500, haut: H }), [30, 50, 35, 0])
})

test('bornes : l’en-tête part tout entier, sans aller plus loin, et revient tout entier, sans descendre plus bas', () => {
  // 800 px plus bas : parti de sa hauteur, 90 px ; encore plus bas, il y reste. 60 px plus haut, 30 ; 200 px plus
  // haut, revenu, 0 ; et le moindre pas vers le bas compte de nouveau à partir de là.
  assert.deepEqual(suivre([1300, 1500, 1440, 1240, 1250], { decalage: 0, y: 500, haut: H }), [90, 90, 30, 0, 10])
})

test('le bandeau d’annonce encore visible : l’en-tête ne part pas ; ensuite, il ne part que de ce qu’il a dépassé', () => {
  // Du haut de la page : 20 px plus bas, le bandeau de 33 px se voit encore, l'en-tête reste ; à 40 px, il ne part que
  // de 7 px, à 100 px de 67 ; d'un coup à 500 px, tout entier.
  assert.deepEqual(suivre([20, 40, 100, 500]), [0, 7, 67, 90])
})

test('le rebond de Safari : au-delà du haut ou du bas de la page, le défilement compte pour 0', () => {
  // En haut, le défilement passe sous 0 puis revient : l'en-tête ne bouge pas, et la position gardée est 0.
  const enHaut = image({ decalage: 0, y: 0, haut: H }, lu(-40))
  assert.equal(enHaut.decalage, 0)
  assert.equal(enHaut.y, 0)
  // En bas (6 000 px au plus), l'en-tête parti : le rebond va 45 px plus loin et revient ; l'en-tête ne revient pas.
  assert.deepEqual(suivre([MAX, MAX + 45, MAX + 12, MAX], { decalage: H, y: MAX - 300, haut: 0 }), [90, 90, 90, 90])
  // Puis le doigt remonte de 30 px : l'en-tête revient de 30 px.
  assert.deepEqual(suivre([MAX + 20, MAX, MAX - 30], { decalage: H, y: MAX, haut: 0 }), [90, 90, 60])
})

test('un saut voulu du script des filtres ne compte pas comme un geste : l’en-tête reste, ou revient en entier', () => {
  // Faire de la place à un menu : la page descend de 240 px d'un coup, l'en-tête reste où il était (là, ou parti de
  // 37 px) ; ensuite, le doigt compte de nouveau, à partir de la nouvelle position.
  assert.deepEqual(suivre([{ y: 740, saut: 'reste' }, 750], { decalage: 0, y: 500, haut: H }), [0, 10])
  assert.deepEqual(suivre([{ y: 740, saut: 'reste' }, 730], { decalage: 37, y: 500, haut: H - 37 }), [37, 27])
  // Remonter au début des résultats après un filtre : l'en-tête parti revient en entier, même pour un saut de 40 px.
  assert.deepEqual(suivre([{ y: 2960, saut: 'revient' }, 2970], { decalage: H, y: 3000, haut: 0 }), [0, 10])
  // Le bandeau garde le dernier mot : un saut qui remonte près du haut de la page ramène l'en-tête autant qu'il le faut.
  assert.deepEqual(suivre([{ y: 60, saut: 'reste' }], { decalage: H, y: 1200, haut: 0 }), [27])
})

test('preventHeaderReveal : retenu, l’en-tête ne revient pas en remontant, mais part toujours en descendant', () => {
  assert.deepEqual(suivre([{ y: 1950, retenu: true }, { y: 1900, retenu: true }, { y: 1920, retenu: true }], { decalage: 40, y: 2000, haut: H - 40 }), [40, 40, 60])
})

test('l’en-tête change de hauteur (la fenêtre change de taille) : son décalage ne la dépasse pas', () => {
  const plusPetit = image({ decalage: H, y: 2000, haut: 0 }, lu(2000, { hauteur: 70 }))
  assert.deepEqual([plusPetit.decalage, plusPetit.haut], [70, 0])
  const plusGrand = image({ decalage: H, y: 2000, haut: 0 }, lu(2000, { hauteur: 110 }))
  assert.deepEqual([plusGrand.decalage, plusGrand.haut], [90, 20])
})

/* ---------- La ligne des filtres ---------- */

/* La ligne de 390 px : son ancre (#ancre-barre) à 464 px dans la page (relevé en ligne le 23/11/2026). Ce que l'image
   lit d'elle : le haut de l'ancre et celui de la ligne dans l'écran, à la hauteur où la ligne se colle (`haut`) posée
   par l'image d'avant. */
const ANCRE = 464
const surLigne = (y, ligne) => ({ ancre: ANCRE - y, ligne })

test('la ligne se colle juste sous l’en-tête, puis en haut quand il est parti, « collee » tant qu’elle est à cette place', () => {
  // Plus haut que la grille, l'en-tête là : la ligne est à sa place dans la page (164 px), pas collée ; elle se
  // collera à 90 px, sous l'en-tête.
  const avantGrille = image({ decalage: 0, y: 300, haut: H }, lu(300, surLigne(300, 164)))
  assert.deepEqual([avantGrille.haut, avantGrille.collee], [90, false])
  // 800 px plus bas, l'en-tête parti : la ligne collée en haut (0), son ancre passée au-dessus.
  const enHaut = image({ decalage: H, y: 790, haut: 0 }, lu(800, surLigne(800, 0)))
  assert.deepEqual([enHaut.haut, enHaut.collee], [0, true])
  // 150 px plus haut, l'en-tête revenu : la ligne se colle dessous (90), toujours collée.
  const dessous = image({ decalage: H, y: 800, haut: 0 }, lu(650, surLigne(650, 0)))
  assert.deepEqual([dessous.decalage, dessous.haut, dessous.collee], [0, 90, true])
  // Au bas de la grille, la dernière rangée l'emporte : elle est 20 px plus haut que sa place collée, plus collée.
  assert.equal(image({ decalage: H, y: 3490, haut: 0 }, lu(3500, surLigne(3500, -20))).collee, false)
  // Au début des résultats (après un filtre), à sa place dans la page, juste sous l'en-tête : pas collée.
  assert.equal(image({ decalage: 0, y: 374, haut: H }, lu(374, surLigne(374, 90))).collee, false)
  // Une page sans ligne des filtres : rien de collé.
  assert.equal(image({ decalage: H, y: 790, haut: 0 }, lu(800)).collee, false)
})

test('un menu ouvert de l’ordinateur se ferme quand l’en-tête part (plus de 2 px), jamais pendant un saut voulu', () => {
  const ferme = (avant, y, plus) => image(avant, lu(y, plus)).fermer
  // On descend : à 2 px, l'en-tête est encore là ; à 3 px, il part, le menu se ferme.
  assert.equal(ferme({ decalage: 0, y: 600, haut: H }, 602), false)
  assert.equal(ferme({ decalage: 0, y: 600, haut: H }, 603), true)
  // L'en-tête déjà parti : le défilement le ferme aussi.
  assert.equal(ferme({ decalage: H, y: 2000, haut: 0 }, 2040), true)
  // Faire de la place au menu qui s'ouvre (la page descend, l'en-tête reste parti de 37 px) : il reste ouvert.
  assert.equal(ferme({ decalage: 37, y: 600, haut: H - 37 }, 840, { saut: 'reste' }), false)
  // Rien n'a défilé (la fenêtre change de taille) : rien ne se ferme.
  assert.equal(ferme({ decalage: H, y: 2000, haut: 0 }, 2000), false)
  // Le bandeau encore visible, l'en-tête ne part pas : le menu reste ouvert.
  assert.equal(ferme({ decalage: 0, y: 0, haut: H }, 30), false)
})

/* ---------- Le gabarit : le script sur la nouvelle page seulement ---------- */

/* Le gabarit des pages collection (layout/collection.liquid) rendu avec des repères à la place de ce qu'il rend
   d'ailleurs (sections, snippets), comme scripts/collection-filtres.test.cjs. La nouvelle page se reconnaît à la
   marque de sa section (data-refonte) ; ailleurs, le gabarit rend le HTML d'avant (scripts/collection-refonte.test.cjs). */
const { SKIP, engine, read } = require('./galerie-banc.cjs')
const gabarit = (contenu) => engine('fr').parseAndRender(read('layout/collection.liquid')
  .replace(/{%\s*section\s+'([\w-]+)'\s*%}/g, '[section $1]')
  .replace(/{%\s*render\s+'(head-base|tw-filter-drawer|open-cart-drawer-button|cookie-banner|collection-refonte-police)'\s*%}/g, '[render $1]'), {
  content_for_layout: contenu,
  content_for_header: '',
}, { globals: { request: { locale: { iso_code: 'fr' }, origin: 'https://www.myselfmonart.com' }, routes: {}, settings: {} } })
const MARQUE = '<div id="shopify-section-template--1__collection_refonte" class="shopify-section"><div hidden data-refonte></div></div>'
const SCRIPT = /<script src="\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/collection-entete\.js\?v=1" defer="defer"><\/script>/g

test('le gabarit charge le script de l’en-tête sur la nouvelle page seulement, dans <head>, en différé', { skip: SKIP }, async () => {
  const page = await gabarit(MARQUE)
  const head = page.slice(0, page.indexOf('</head>'))
  assert.equal((head.match(SCRIPT) || []).length, 1)
  assert.equal((page.match(/collection-entete\.js/g) || []).length, 1)
  assert.doesNotMatch(await gabarit('<h1>Tableaux Nature</h1>'), /collection-entete/)
})

/* ---------- Ce que le script pose, ce que la feuille et la ligne en font ---------- */

const { rules, blocs } = require('./galerie-banc.cjs')
const CSS = 'assets/collection-refonte.css'
const HOOK = ':root[data-refonte-page]'
// Le bloc « L'en-tête qui suit le doigt (ticket 07) » de la feuille, sans ses commentaires, en règles.
function blocCss() {
  const reperes = blocs(CSS).filter((m) => m.ticket === '07')
  assert.deepEqual(reperes.map((m) => `${m.name} : ${m.side}`), ['L\'en-tête qui suit le doigt : début', 'L\'en-tête qui suit le doigt : fin'])
  return rules(read(CSS).slice(reperes[0].end, reperes[1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (bloc, head, context = '') => bloc.find((r) => r.head === head && r.context.join(' / ') === context)
const SOURCE = read('assets/collection-entete.js')

test('la feuille : la ligne « collee » a son ombre, et le focus ne se cache pas sous l’en-tête et la ligne', () => {
  const bloc = blocCss()
  // La classe que pose le script : le trait encre à 12 % et l'ombre douce de la maquette.
  assert.match(SOURCE, /classList\.toggle\('collee'/)
  assert.equal(regle(bloc, `${HOOK} .filtres-ligne.collee`).body.trim(), 'box-shadow: 0 1px 0 var(--encre-12), 0 10px 18px -14px color-mix(in srgb, var(--encre) 35%, transparent);')
  // La hauteur que mesure le script (--tete-h), plus la ligne : 56 px, 68 px sur ordinateur.
  assert.match(SOURCE, /setProperty\('--tete-h'/)
  assert.equal(regle(bloc, HOOK).body.trim(), 'scroll-padding-top: calc(var(--tete-h, 0px) + 56px);')
  assert.equal(regle(bloc, HOOK, '@media (min-width: 900px)').body.trim(), 'scroll-padding-top: calc(var(--tete-h, 0px) + 68px);')
  // L'en-tête déplacé sur sa couche.
  assert.equal(regle(bloc, `${HOOK} #shopify-section-tw-header`).body.trim(), 'will-change: transform;')
  // La ligne lit la hauteur que pose le script (--barre-top, ticket 06).
  assert.match(SOURCE, /setProperty\('--barre-top'/)
  assert.match(read(CSS), /top: var\(--barre-top, 0px\);/)
})

test('le script des filtres annonce ses sauts sous le nom qu’écoute l’en-tête : remonter le fait revenir, un menu le laisse', () => {
  const filtres = read('assets/collection-filtres.js')
  assert.match(SOURCE, /addEventListener\('mma:saut-voulu'/)
  assert.match(filtres, /dispatchEvent\(new CustomEvent\('mma:saut-voulu', \{ detail: \{ entete \} \}\)\)/)
  // Chaque saut dit ce que fait l'en-tête : au début des résultats, il revient ; pour faire de la place à un menu, il reste.
  const sauts = [...filtres.matchAll(/defiler\(([^;]*), '(\w+)'\);/g)].map((m) => m[2])
  assert.deepEqual(sauts.sort(), ['reste', 'revient'])
  assert.equal((filtres.match(/\bdefiler\(/g) || []).length, 3, 'la fonction et ses deux sauts, rien d’autre')
})
