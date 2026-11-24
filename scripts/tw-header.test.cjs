/*
 * Tests de l'en-tête du site (assets/tw-header.js) : son mode « suit le doigt », sur la nouvelle page collection
 * (ticket 07 de .scratch/collection-design).
 * - Le calcul d'une image (EnteteQuiSuit.calculerImage, pur) : le décalage de l'en-tête, la hauteur où la ligne des
 *   filtres se colle, son état collé, la fermeture des menus.
 * - Ce que le mode pose, et ce que la feuille de la page et la ligne des filtres en font.
 * Les essais dans un navigateur (la vraie page, les autres pages inchangées) sont dans les notes du ticket.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('vm')
const { read, rules, blocs } = require('./galerie-banc.cjs')

/* Le script de l'en-tête, tel que le navigateur le lit (ce n'est pas un module) : dans un bac à sable, avec ce que
   touchent ses lignes de premier niveau (les éléments qu'il définit, window, la grille de la page de recherche, ici
   absente). Le mode « suit le doigt » se lit ensuite dans le bac. */
function enteteQuiSuit() {
  const bac = { HTMLElement: class {}, customElements: { define() {}, get() {} }, document: { querySelector: () => null } }
  bac.window = bac
  vm.createContext(bac)
  vm.runInContext(read('assets/tw-header.js'), bac, { filename: 'assets/tw-header.js' })
  return vm.runInContext('EnteteQuiSuit', bac)
}
const { calculerImage } = enteteQuiSuit()

// L'en-tête de la boutique : 90 px de haut, sous le bandeau d'annonce de 33 px (relevé en ligne le 23/11/2026, à 390
// et à 1280 px). La page : 6 000 px de défilement au plus.
const H = 90
const BANDEAU = 33
const MAX = 6000
const lu = (y, plus = {}) => ({ y, max: MAX, hauteur: H, bandeau: BANDEAU, saut: null, retenu: false, ancre: null, fin: null, ...plus })

/* Une suite d'images : chaque position du défilement (ou { y, … } pour ce que l'image lit en plus), à partir d'un
   en-tête posé à `depart`. Rend le décalage de chaque image. */
function suivre(positions, depart = { decalage: 0, y: 0 }) {
  let avant = depart
  return positions.map((p) => {
    const { y, ...plus } = typeof p === 'number' ? { y: p } : p
    const suite = calculerImage(avant, lu(y, plus))
    avant = { decalage: suite.decalage, y: suite.y }
    return suite.decalage
  })
}

/* ---------- Le décalage de l'en-tête ---------- */

test('l’en-tête suit le doigt : il part de ce qu’on descend, revient de ce qu’on remonte, image par image', () => {
  // Plus bas que le bandeau, l'en-tête là : 30 px plus bas, il est parti de 30 px ; 20 de plus, 50 ; 15 px plus haut, 35.
  assert.deepEqual(suivre([530, 550, 535, 500], { decalage: 0, y: 500 }), [30, 50, 35, 0])
})

test('bornes : l’en-tête part tout entier, sans aller plus loin, et revient tout entier, sans descendre plus bas', () => {
  // 800 px plus bas : parti de sa hauteur, 90 px ; encore plus bas, il y reste. 60 px plus haut, 30 ; 200 px plus
  // haut, revenu, 0 ; et le moindre pas vers le bas compte de nouveau à partir de là.
  assert.deepEqual(suivre([1300, 1500, 1440, 1240, 1250], { decalage: 0, y: 500 }), [90, 90, 30, 0, 10])
})

test('le bandeau d’annonce encore visible : l’en-tête ne part pas ; ensuite, il ne part que de ce qu’il a dépassé', () => {
  // Du haut de la page : 20 px plus bas, le bandeau de 33 px se voit encore, l'en-tête reste ; à 40 px, il ne part que
  // de 7 px, à 100 px de 67 ; d'un coup à 500 px, tout entier.
  assert.deepEqual(suivre([20, 40, 100, 500]), [0, 7, 67, 90])
})

test('le rebond de Safari : au-delà du haut ou du bas de la page, le défilement compte pour 0', () => {
  // En haut, le défilement passe sous 0 puis revient : l'en-tête ne bouge pas, et la position gardée est 0.
  const enHaut = calculerImage({ decalage: 0, y: 0 }, lu(-40))
  assert.equal(enHaut.decalage, 0)
  assert.equal(enHaut.y, 0)
  // En bas (6 000 px au plus), l'en-tête parti : le rebond va 45 px plus loin et revient ; l'en-tête ne revient pas.
  assert.deepEqual(suivre([MAX, MAX + 45, MAX + 12, MAX], { decalage: H, y: MAX - 300 }), [90, 90, 90, 90])
  // Puis le doigt remonte de 30 px : l'en-tête revient de 30 px.
  assert.deepEqual(suivre([MAX + 20, MAX, MAX - 30], { decalage: H, y: MAX }), [90, 90, 60])
})

test('un saut voulu d’un script de la page ne compte pas comme un geste : l’en-tête reste, ou revient en entier', () => {
  // Faire de la place à un menu : la page descend de 240 px d'un coup, l'en-tête reste où il était (là, ou parti de
  // 37 px) ; ensuite, le doigt compte de nouveau, à partir de la nouvelle position.
  assert.deepEqual(suivre([{ y: 740, saut: 'reste' }, 750], { decalage: 0, y: 500 }), [0, 10])
  assert.deepEqual(suivre([{ y: 740, saut: 'reste' }, 730], { decalage: 37, y: 500 }), [37, 27])
  // Remonter au début des résultats après un filtre : l'en-tête parti revient en entier, même pour un saut de 40 px.
  assert.deepEqual(suivre([{ y: 2960, saut: 'revient' }, 2970], { decalage: H, y: 3000 }), [0, 10])
  // Le bandeau garde le dernier mot : un saut qui remonte près du haut de la page ramène l'en-tête autant qu'il le faut.
  assert.deepEqual(suivre([{ y: 60, saut: 'reste' }], { decalage: H, y: 1200 }), [27])
})

test('preventHeaderReveal : retenu, l’en-tête ne revient pas en remontant, mais part toujours en descendant', () => {
  assert.deepEqual(suivre([{ y: 1950, retenu: true }, { y: 1900, retenu: true }, { y: 1920, retenu: true }], { decalage: 40, y: 2000 }), [40, 40, 60])
})

test('l’en-tête change de hauteur (la fenêtre change de taille) : son décalage ne la dépasse pas', () => {
  const plusPetit = calculerImage({ decalage: H, y: 2000 }, lu(2000, { hauteur: 70 }))
  assert.deepEqual([plusPetit.decalage, plusPetit.haut], [70, 0])
  const plusGrand = calculerImage({ decalage: H, y: 2000 }, lu(2000, { hauteur: 110 }))
  assert.deepEqual([plusGrand.decalage, plusGrand.haut], [90, 20])
})

/* ---------- La ligne des filtres ---------- */

/* La ligne de 390 px : son ancre (#ancre-barre) à 464 px dans la page (relevé en ligne le 23/11/2026). Ce que l'image
   lit d'elle, dans l'écran : le haut de son ancre (sa place dans la page) et sa fin, la plus haute place où la ligne
   se colle avant que la fin de sa section (la grille) ne l'emporte. */
const ANCRE = 464
const surLigne = (y, fin = 3000) => ({ ancre: ANCRE - y, fin })

test('la ligne se colle juste sous l’en-tête, puis en haut quand il est parti, « collee » tant qu’elle est à cette place', () => {
  const image = (avant, y, fin) => calculerImage(avant, lu(y, surLigne(y, fin)))
  // Plus haut que la grille, l'en-tête là : la ligne est à sa place dans la page (164 px), pas collée ; elle se
  // collera à 90 px, sous l'en-tête.
  const avantGrille = image({ decalage: 0, y: 300 }, 300)
  assert.deepEqual([avantGrille.haut, avantGrille.collee], [90, false])
  // 800 px plus bas, l'en-tête parti : la ligne collée en haut (0), son ancre passée au-dessus.
  const enHaut = image({ decalage: H, y: 790 }, 800)
  assert.deepEqual([enHaut.haut, enHaut.collee], [0, true])
  // 150 px plus haut, l'en-tête revenu : la ligne se colle dessous (90), toujours collée.
  const dessous = image({ decalage: H, y: 800 }, 650)
  assert.deepEqual([dessous.decalage, dessous.haut, dessous.collee], [0, 90, true])
  // Au début des résultats (après un filtre), la ligne à sa place juste sous l'en-tête : pas collée. Puis 20 px plus
  // bas : l'en-tête part de 20 px, la ligne descend avec lui à sa place, toujours pas collée.
  assert.equal(image({ decalage: 0, y: 374 }, 374).collee, false)
  const ensemble = image({ decalage: 0, y: 374 }, 394)
  assert.deepEqual([ensemble.haut, ensemble.collee], [70, false])
  // L'en-tête parti, la ligne collée en haut depuis 10 px : 20 px plus haut, l'en-tête revient de 20, la ligne se
  // colle dessous (son ancre à 10 px, au-dessus de 20) : collée.
  const revient = image({ decalage: H, y: 474 }, 454)
  assert.deepEqual([revient.haut, revient.collee], [20, true])
  // Au bas de la grille, la dernière rangée l'emporte : sa fin est 20 px plus haut que sa place collée, plus collée.
  assert.equal(image({ decalage: H, y: 3490 }, 3500, -20).collee, false)
  // Une page sans ligne des filtres : rien de collé.
  assert.equal(calculerImage({ decalage: H, y: 790 }, lu(800)).collee, false)
})

test('quand l’en-tête part (plus de 2 px), les menus se ferment ; jamais pendant un saut voulu', () => {
  const ferme = (avant, y, plus) => calculerImage(avant, lu(y, plus)).fermer
  // On descend : à 2 px, l'en-tête est encore là ; à 3 px, il part, le menu se ferme.
  assert.equal(ferme({ decalage: 0, y: 600 }, 602), false)
  assert.equal(ferme({ decalage: 0, y: 600 }, 603), true)
  // L'en-tête déjà parti : le défilement le ferme aussi.
  assert.equal(ferme({ decalage: H, y: 2000 }, 2040), true)
  // Faire de la place au menu qui s'ouvre (la page descend, l'en-tête reste parti de 37 px) : il reste ouvert.
  assert.equal(ferme({ decalage: 37, y: 600 }, 840, { saut: 'reste' }), false)
  // Rien n'a défilé (la fenêtre change de taille) : rien ne se ferme.
  assert.equal(ferme({ decalage: H, y: 2000 }, 2000), false)
  // Le bandeau encore visible, l'en-tête ne part pas : le menu reste ouvert.
  assert.equal(ferme({ decalage: 0, y: 0 }, 30), false)
})

/* ---------- Ce que le mode pose, ce que la feuille et la ligne en font ---------- */

const CSS = 'assets/collection-refonte.css'
const HOOK = ':root[data-refonte-page]'
const SOURCE = read('assets/tw-header.js')
// Le bloc « L'en-tête qui suit le doigt (ticket 07) » de la feuille, sans ses commentaires, en règles.
function blocCss() {
  const reperes = blocs(CSS).filter((m) => m.ticket === '07')
  assert.deepEqual(reperes.map((m) => `${m.name} : ${m.side}`), ['L\'en-tête qui suit le doigt : début', 'L\'en-tête qui suit le doigt : fin'])
  return rules(read(CSS).slice(reperes[0].end, reperes[1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (bloc, head, context = '') => bloc.find((r) => r.head === head && r.context.join(' / ') === context)

test('le mode suit le doigt sur la nouvelle page seulement ; ailleurs, l’en-tête écoute le défilement comme avant', () => {
  assert.match(SOURCE, /if \(document\.documentElement\.hasAttribute\('data-refonte-page'\)\) \{\n\s*this\.suivi = new EnteteQuiSuit\(this\);\n\s*\} else \{\n\s*window\.addEventListener\('scroll', this\.onScroll, false\);\n\s*\}/)
  assert.equal((SOURCE.match(/addEventListener\('scroll'/g) || []).length, 2, 'un écouteur par mode')
  assert.match(SOURCE, /window\.addEventListener\('scroll', this\.planifier, \{ passive: true \}\)/)
})

test('la feuille : la ligne « collee » a son ombre ; le focus ne se cache pas sous l’en-tête et la ligne, et la ligne ne saute pas', () => {
  const bloc = blocCss()
  // La classe que pose le mode : le trait encre à 12 % et l'ombre douce de la maquette.
  assert.match(SOURCE, /classList\.toggle\('collee'/)
  assert.equal(regle(bloc, `${HOOK} .filtres-ligne.collee`).body.trim(), 'box-shadow: 0 1px 0 var(--encre-12), 0 10px 18px -14px color-mix(in srgb, var(--encre) 35%, transparent);')
  // Ce qui prend le focus dans la page, hors de la ligne, s'arrête sous l'en-tête (--tete-h, que mesure le mode) et la
  // ligne : 56 px, 68 px sur ordinateur. Pas de scroll-padding-top sur la page : la ligne collée sauterait au clavier.
  assert.match(SOURCE, /setProperty\('--tete-h'/)
  // La feuille la donne déjà, et le script part d'elle : il ne l'écrit sur :root (qui refait les styles de toute la
  // page) que si l'en-tête a une autre hauteur.
  assert.match(read(CSS), /^ {2}--tete-h: 90px;$/m)
  assert.equal(H, 90)
  assert.match(SOURCE, /if \(this\.pose\.hauteur === null\) \{\r?\n\s*this\.pose\.hauteur = parseFloat\(window\.getComputedStyle\(document\.documentElement\)\.getPropertyValue\('--tete-h'\)\);/)
  const FOCUS = `${HOOK} #MainContent :is(a[href], button, input, select, textarea, summary, [tabindex]):not(#barre *)`
  assert.equal(regle(bloc, FOCUS).body.trim(), 'scroll-margin-top: calc(var(--tete-h, 0px) + 56px);')
  assert.equal(regle(bloc, FOCUS, '@media (min-width: 900px)').body.trim(), 'scroll-margin-top: calc(var(--tete-h, 0px) + 68px);')
  assert.doesNotMatch(read(CSS).replace(/\/\*[\s\S]*?\*\//g, ''), /scroll-padding-top/)
  // L'en-tête déplacé sur sa couche.
  assert.equal(regle(bloc, `${HOOK} #shopify-section-tw-header`).body.trim(), 'will-change: transform;')
  // La ligne lit la hauteur que pose le mode (--barre-top, ticket 06).
  assert.match(SOURCE, /setProperty\('--barre-top'/)
  assert.match(read(CSS), /top: var\(--barre-top, var\(--tete-h, 0px\)\);/)
  // Une ligne neuve n'a rien de posé : elle est déjà sous l'en-tête entier.
  assert.match(SOURCE, /const la = barre === this\.pose\.barre \? this\.pose\.haut : this\.hauteur;\r?\n\s*if \(haut !== la\) barre\.style\.setProperty\('--barre-top'/)
})

test('les scripts de la page annoncent leurs sauts sous le nom qu’écoute l’en-tête', () => {
  assert.match(SOURCE, /addEventListener\('mma:saut-voulu'/)
  // La ligne des filtres : au début des résultats, l'en-tête revient ; pour faire de la place à un menu, il reste.
  const filtres = read('assets/collection-filtres.js')
  assert.match(filtres, /dispatchEvent\(new CustomEvent\('mma:saut-voulu', \{ detail: \{ entete: modeEntete \} \}\)\)/)
  const sauts = [...filtres.matchAll(/defiler\(([^;]*), '(\w+)'\);/g)].map((m) => m[2])
  assert.deepEqual(sauts.sort(), ['reste', 'revient'])
  assert.equal((filtres.match(/\bdefiler\(/g) || []).length, 3, 'la fonction et ses deux sauts, rien d’autre')
})
