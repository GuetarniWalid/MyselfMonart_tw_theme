// La scène en quatre temps de la page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie, ticket 20) :
// sous la présentation, une scène épinglée qui suit le défilement (le regard, les couleurs, la lumière, la matière).
// La section sections/galerie-scene.liquid, son bloc dans la feuille et dans le script de la page, ses textes.
// Trois états, posés par l'élément <galerie-scene> : « natif » (le navigateur lie les animations au défilement),
// « secours » (un script donne la position, mêmes images clés), et à plat (mouvements réduits, script coupé).
// La lecture des couleurs du temps 2 est le ticket 21 : ici, sa place seulement.
// Ici, les calculs purs du script, les contrats du code, puis le rendu Liquid (liquidjs), quand le module est là.
// Lancer : node --test scripts/galerie-scene.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const {
  ROOT, read, exists, code, json, schemaOf, LANGS, rules,
  SKIP, FLAT, OLD, product, renderSectionFile,
} = require('./galerie-banc.cjs')
const { modeDeScene, echelleDeScene, placesDeScene, tempsDeScene, departDuTemps } = require('../assets/oeuvre-galerie.js')

const SECTION = 'sections/galerie-scene.liquid'
const CSS = 'assets/oeuvre-galerie.css'
const JS = 'assets/oeuvre-galerie.js'
const MODEL = 'templates/product.oeuvre-galerie.json'
const MOTION = '@media (prefers-reduced-motion: no-preference)'
const LINKED = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
const LARGE = '@media (min-width: 900px)'
// Les personnages : des images détourées, sous des noms neutres (README de la maquette), à leur taille.
const GUESTS = { 'galerie-public.webp': [1687, 680], 'galerie-oiseau.webp': [176, 176], 'galerie-dame.webp': [1118, 560], 'galerie-main.webp': [729, 440] }

/* Le bloc de la scène dans la feuille ou le script de la page : entre ses deux repères. */
const blockOf = (file) => {
  const source = read(file)
  const start = source.indexOf('/* === Scène en quatre temps (ticket 20) : début ===')
  const end = source.indexOf('/* === Scène en quatre temps (ticket 20) : fin === */')
  assert.ok(start >= 0 && end > start, `${file} : le bloc de la scène, entre ses deux repères`)
  return source.slice(start, end)
}
const sheet = () => rules(blockOf(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))
const script = () => blockOf(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
// Le corps d'une règle de la scène, ses blancs réduits.
const body = (head, context = '') => {
  const found = sheet().find((r) => r.head.replace(/\s+/g, ' ') === head && r.context.join() === context)
  assert.ok(found, `règle « ${head} »${context ? ` dans ${context}` : ''}`)
  return found.body.replace(/\s+/g, ' ').trim()
}
// La valeur d'une variable dans le corps d'une règle.
const value = (text, name) => (new RegExp(`(?:^|[;\\s])--${name}:\\s*([^;]+);`).exec(text) || [])[1]

/* ---------- Le script : ses calculs ---------- */

test('état de la scène : natif si le navigateur lie une animation au défilement, secours sinon, à plat en mouvements réduits', () => {
  assert.equal(modeDeScene({ reduit: false, lie: true }), 'natif')
  assert.equal(modeDeScene({ reduit: false, lie: false }), 'secours')
  assert.equal(modeDeScene({ reduit: true, lie: true }), '')
  assert.equal(modeDeScene({ reduit: true, lie: false }), '')
})

test('échelle de la scène sur téléphone : le plus grand possible entre le bas du texte et le sol, sans sortir de l’écran', () => {
  // La maquette à 390 × 844 : le sol à 768 px, le bas du texte à 246 px, 2,42 m du sol au haut de la lampe.
  assert.equal(echelleDeScene({ largeur: 390, ecran: 844, pied: 768, bas: 246, ratio: 0.7466 }), 2.099)
  // Un texte court : la dame et son lit (1,86 m) tiennent toute la largeur de l'écran, pas plus.
  assert.equal(echelleDeScene({ largeur: 390, ecran: 844, pied: 768, bas: 180, ratio: 0.7466 }), 2.106)
  assert.equal(echelleDeScene({ largeur: 320, ecran: 700, pied: 637, bas: 150, ratio: 0.7466 }), 1.728)
  // Un écran large et bas : trois millièmes de sa hauteur par centimètre, au plus.
  assert.equal(echelleDeScene({ largeur: 800, ecran: 400, pied: 364, bas: 20, ratio: 0.7466 }), 1.2)
  // Jamais moins d'un pixel par centimètre.
  assert.equal(echelleDeScene({ largeur: 320, ecran: 480, pied: 437, bas: 300, ratio: 0.7466 }), 1)
  // Une œuvre plus large a une lampe plus large, donc plus haute : il lui faut plus de place au-dessus d'elle.
  assert.equal(echelleDeScene({ largeur: 390, ecran: 844, pied: 768, bas: 246, ratio: 1 }), 2.059)
  assert.equal(echelleDeScene({ largeur: 390, ecran: 844, pied: 768, bas: 246, ratio: 4 / 3 }), 2.008)
  // Une œuvre très large est bornée en largeur (1,50 m) : elle est moins haute, la lampe ne monte pas plus.
  assert.equal(echelleDeScene({ largeur: 390, ecran: 844, pied: 768, bas: 246, ratio: 2 }), 2.099)
})

test('places de l’œuvre : au-dessus du lit au temps 3, en gros plan au temps 4', () => {
  // La maquette à 390 × 844 (ses valeurs relevées dans un navigateur) : l'œuvre de 282 × 378 px, à 54 px du bord et
  // 274 px du haut de l'écran ; 2,10 px par centimètre.
  assert.deepEqual(
    placesDeScene({ grand: false, largeur: 390, hauteur: 844, ecran: 844, pied: 768, cm: 2.1, x: 54, y: 274, l: 282, h: 378 }),
    { '--yc': '-46px', '--e3': '0.6111', '--zoom': '2.344', '--zx': '0px', '--zy': '-41px' },
  )
  // La maquette à 1440 × 900 : l'œuvre de 419 × 561 px ; le gros plan est celui de la feuille (--zoom), un peu décalé.
  assert.deepEqual(
    placesDeScene({ grand: true, largeur: 1440, hauteur: 900, ecran: 900, pied: 828, cm: 3.33, x: 727, y: 120, l: 419, h: 561 }),
    { '--yc': '-129px', '--e3': '0.6529', '--zoom': null, '--zx': '43px', '--zy': '27px' },
  )
  // Téléphone, œuvre en paysage : haute de 1,10 m au-dessus du lit ; le gros plan remplit l'écran en hauteur.
  const paysage = placesDeScene({ grand: false, largeur: 390, hauteur: 844, ecran: 844, pied: 768, cm: 2, x: 45, y: 350, l: 300, h: 225 })
  assert.equal(paysage['--e3'], '0.9778')
  assert.equal(paysage['--zoom'], '3.939')
  assert.equal(paysage['--zx'], '0px')
  // Œuvre carrée : la même hauteur ; le gros plan remplit l'écran en hauteur, encore.
  const carre = placesDeScene({ grand: false, largeur: 390, hauteur: 844, ecran: 844, pied: 768, cm: 2, x: 45, y: 300, l: 300, h: 300 })
  assert.equal(carre['--e3'], '0.7333')
  assert.equal(carre['--zoom'], '2.954')
  // Œuvre très large : bornée à 1,50 m de large, pour rester moins large que le lit (1,86 m).
  assert.equal(placesDeScene({ grand: false, largeur: 390, hauteur: 844, ecran: 844, pied: 768, cm: 2, x: 45, y: 380, l: 300, h: 150 })['--e3'], '1.0000')
  // Écran paysage étroit en hauteur : le gros plan remplit l'écran en largeur.
  assert.equal(placesDeScene({ grand: false, largeur: 800, hauteur: 400, ecran: 400, pied: 364, cm: 1.2, x: 300, y: 80, l: 150, h: 200 })['--zoom'], '5.600')
})

test('mode de secours : la position de la scène, en écrans depuis son épinglage', () => {
  assert.equal(tempsDeScene(0, 844), '0.0000')
  assert.equal(tempsDeScene(-422, 844), '0.5000')
  assert.equal(tempsDeScene(844, 844), '-1.0000')
  assert.equal(tempsDeScene(-3224.08, 844), '3.8200')
  // Un écran sans hauteur (page cachée) : rien de cassé.
  assert.equal(tempsDeScene(-100, 0), '0.0000')
})

test('le repère : un trait mène au début de son temps', () => {
  // La scène à 1500 px du haut de la page ; l'écran défilé de 400 px, donc le haut de la scène à 1100 px du haut de l'écran.
  assert.equal(departDuTemps({ haut: 1100, defilement: 400, ecran: 844, temps: 0.02 }), 1517)
  assert.equal(departDuTemps({ haut: 1100, defilement: 400, ecran: 844, temps: 2.2 }), 3357)
  assert.equal(departDuTemps({ haut: -2000, defilement: 3500, ecran: 844, temps: 1 }), 2344)
})

/* ---------- Le script : l'élément ---------- */

test('le script : l’élément galerie-scene, défini une fois, démarre à son arrivée dans la page et se nettoie à son départ', () => {
  const js = script()
  assert.match(js, /if \(customElements\.get\('galerie-scene'\)\) return;/)
  assert.match(js, /customElements\.define\('galerie-scene', /)
  assert.match(js, /connectedCallback\(\)/)
  assert.match(js, /disconnectedCallback\(\)/)
  // Pour les tests, les calculs purs, puis rien d'autre sans navigateur.
  assert.match(js, /if \(typeof window === 'undefined'\) {\s*Object\.assign\(module\.exports, { modeDeScene, echelleDeScene, placesDeScene, tempsDeScene, departDuTemps }\);\s*return;\s*}/)
  // La bascule Toile / Poster ne rejoue ni script en ligne ni chargement de page : rien n'y compte.
  assert.doesNotMatch(js, /DOMContentLoaded|addEventListener\('load'|readyState/)
  assert.doesNotMatch(js, /window\.\w+ = /)
  assert.doesNotMatch(code(SECTION), /<script/)
  // Chaque écouteur posé est retiré, chaque observateur est arrêté, l'image demandée est annulée.
  const added = [...js.matchAll(/([\w.]+)\.addEventListener\('(\w+)', (this\.\w+)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)
  const removed = [...js.matchAll(/([\w.]+)\.removeEventListener\('(\w+)', (this\.\w+)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)
  assert.ok(added.length >= 4, 'le repère, les mouvements réduits, le défilement et la taille de l’écran du secours')
  assert.deepEqual([...new Set(added)].sort(), [...new Set(removed)].sort())
  assert.equal(js.match(/\.addEventListener\(/g).length, added.length, 'chaque écouteur a une fonction gardée, qu’on peut retirer')
  const observers = [...js.matchAll(/this\.(\w+) = new (?:Resize|Intersection)Observer\(/g)].map((m) => m[1])
  assert.ok(observers.length >= 2, 'les mesures et l’approche de la scène')
  for (const name of observers) assert.match(js, new RegExp(`this\\.${name}\\.disconnect\\(\\)`), name)
  assert.match(js, /cancelAnimationFrame\(/)
})

test('le script : rien ne suit le défilement hors du mode de secours', () => {
  const js = script()
  // Un seul écouteur de défilement, passif, posé par le secours seul.
  assert.equal(js.match(/addEventListener\('scroll'/g).length, 1)
  assert.match(js, /window\.addEventListener\('scroll', this\.suivre, { passive: true }\);/)
  const secours = /suivreDefilement\(\) {([\s\S]*?)\n    }\n/.exec(js)
  assert.ok(secours, 'la méthode du secours')
  assert.match(secours[1], /addEventListener\('scroll'/)
  assert.match(js, /if \(this\.mode === 'secours'\) this\.suivreDefilement\(\);/)
  assert.equal(js.match(/this\.suivreDefilement\(\)/g).length, 1)
  // Il n'écrit qu'une variable, la position, une fois par image.
  assert.match(js, /requestAnimationFrame\(this\.placer\)/)
  assert.match(js, /this\.style\.setProperty\('--t', tempsDeScene\(/)
})

test('le script : la même condition que le socle pour lier le mouvement au défilement, et l’état posé sur l’élément', () => {
  const linked = (source) => /const mouvementLie = \(\) =>([\s\S]*?);\n/.exec(source)[1].replace(/\s+/g, ' ')
  const whole = read(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  assert.equal(linked(script()), linked(whole), 'la condition du socle, à l’identique')
  const js = script()
  assert.match(js, /modeDeScene\({ reduit: this\.reduit\.matches, lie: mouvementLie\(\) }\)/)
  assert.match(js, /this\.setAttribute\('data-mouvement', /)
  assert.match(js, /this\.removeAttribute\('data-mouvement'\)/)
  // Le réglage « mouvements réduits » peut changer pendant la visite : la scène suit.
  assert.match(js, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(js, /this\.reduit\.addEventListener\('change', this\.regler\)/)
  // Les mesures se refont quand l'écran ou la hauteur des textes change.
  assert.match(js, /new ResizeObserver\(/)
  // Les images des personnages : demandées quand la scène approche (à un quart d'écran), pas avant.
  assert.match(js, /new IntersectionObserver\(/)
  assert.match(js, /{ rootMargin: '25% 0px' }/)
  assert.match(js, /this\.setAttribute\('data-proche', ''\);/)
  assert.match(js, /image\.loading = 'eager'/)
})

test('la feuille : les personnages ne sont dans la page qu’à l’approche de la scène, pour que le navigateur ne les charge pas avant', () => {
  // Une image différée hors de la page (display: none) ne se charge pas ; sans cela, le navigateur demande toute image
  // à moins de 1 250 px de l'écran, donc dès le chargement du haut de la page.
  const hidden = sheet().find((r) => r.head.includes('galerie-scene:not([data-proche])'))
  assert.ok(hidden, 'les personnages, cachés jusqu’à l’approche')
  assert.equal(hidden.body.replace(/\s+/g, ' ').trim(), 'display: none;')
  assert.deepEqual(hidden.context, [])
  const gone = hidden.head.split(',').map((s) => s.trim().replace('galerie-scene:not([data-proche]) ', ''))
  assert.deepEqual(gone.sort(), ['.galerie-scene-invite', '.galerie-scene-lit', '.galerie-scene-oiseau'])
})

/* ---------- La feuille ---------- */

test('la feuille : natif, les animations suivent le défilement de la scène ; secours, les mêmes en pause, placées par le script', () => {
  const animated = sheet().filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  assert.deepEqual(animated.map((r) => r.head.replace(/\s+/g, ' ')).sort(), ['galerie-scene[data-mouvement="natif"] .galerie-scene-a', 'galerie-scene[data-mouvement="secours"] .galerie-scene-a'])
  // Natif : seulement là où le navigateur lie une animation au défilement, et si le visiteur ne demande pas moins de mouvement.
  const natif = body('galerie-scene[data-mouvement="natif"] .galerie-scene-a', [MOTION, LINKED].join())
  assert.equal(natif, 'animation-name: var(--n); animation-duration: 1s; animation-timing-function: linear; animation-fill-mode: both; animation-timeline: --galerie-scene; animation-range: contain calc(var(--a) * 100svh) contain calc(var(--b) * 100svh);')
  assert.equal(body('galerie-scene[data-mouvement="natif"]', [MOTION, LINKED].join()), 'view-timeline: --galerie-scene block;')
  // Secours : en mouvements voulus aussi, mais sans rien de lié au défilement. Le script écrit --t.
  const secours = body('galerie-scene[data-mouvement="secours"] .galerie-scene-a', MOTION)
  assert.equal(secours, 'animation-name: var(--n); animation-duration: 1s; animation-timing-function: linear; animation-fill-mode: both; animation-play-state: paused; animation-delay: calc(clamp(0, (var(--t, 0) - var(--a)) / (var(--b) - var(--a)), 1) * -1s);')
  assert.doesNotMatch(secours, /timeline|animation-range/)
  // Rien de lié au défilement hors du bloc « natif ».
  for (const r of sheet()) if (/timeline|animation-range/.test(r.body)) assert.deepEqual(r.context, [MOTION, LINKED], r.head)
  // Un élément mobile sans images clés à lui n'hérite pas de celles de son parent.
  assert.equal(body('.galerie-scene-a'), '--n: none;')
})

test('la feuille : seulement transform et opacity, et chaque suite d’images clés nommée existe', () => {
  const frames = sheet().filter((r) => /^@keyframes /.test(r.head))
  assert.ok(frames.length >= 20, 'les images clés de la maquette')
  for (const f of frames) {
    assert.match(f.head, /^@keyframes galerie-scene-[a-z-]+$/, f.head)
    assert.deepEqual(f.context, [], `${f.head} : hors de toute condition, pour les deux états`)
    const properties = [...f.body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])
    assert.deepEqual([...new Set(properties)].filter((p) => !['opacity', 'transform'].includes(p)), [], f.head)
  }
  const defined = new Set(frames.map((f) => f.head.replace('@keyframes ', '')))
  const named = new Set(sheet().flatMap((r) => [...r.body.matchAll(/(?:^|[;\s])--n:\s*([\w-]+);/g)].map((m) => m[1])).filter((name) => name !== 'none'))
  for (const name of named) assert.ok(defined.has(name), `images clés « ${name} »`)
  for (const name of defined) assert.ok(named.has(name), `« ${name} » : des images clés que rien ne joue`)
})

test('la feuille : la scène dure 3,82 écrans, et ses quatre temps sont ceux de la maquette', () => {
  // 3,82 écrans de défilement, plus l'écran épinglé.
  assert.match(body('galerie-scene'), /height: 482vh; height: calc\(100lvh \+ 382svh\);/)
  assert.match(body('.galerie-scene-ecran'), /^position: sticky; top: 0; height: 100vh; height: 100lvh; overflow: hidden; overflow: clip; isolation: isolate; contain: layout paint;$/)
  const range = (head, context) => { const b = body(head, context); return [Number(value(b, 'a')), Number(value(b, 'b')), value(b, 'n')] }
  // Les textes : temps 1 jusqu'à 0,78 ; temps 2 jusqu'à 2,04 ; temps 3 jusqu'à 3,2 ; temps 4 jusqu'à 3,82.
  assert.deepEqual(range('.galerie-scene-regard'), [-0.4, 0.78, 'galerie-scene-passe-debut'])
  assert.deepEqual(range('.galerie-scene-couleurs'), [0.78, 2.04, 'galerie-scene-passe-long'])
  assert.deepEqual(range('.galerie-scene-lumiere'), [2.04, 3.2, 'galerie-scene-passe-long'])
  assert.deepEqual(range('.galerie-scene-matiere'), [3.2, 3.82, 'galerie-scene-passe-fin'])
  // Le repère : quatre traits qui se remplissent.
  const rail = [[0, 0.78], [0.78, 2.02], [2.02, 3.18], [3.18, 3.82]]
  rail.forEach(([a, b], i) => assert.deepEqual(range(`.galerie-scene-rail li:nth-child(${i + 1}) .galerie-scene-plein`).slice(0, 2), [a, b]))
  assert.equal(value(body('.galerie-scene-plein'), 'n'), 'galerie-scene-remplit')
  // Le mur et le sol : crème et soleil au temps 2, la nuit au temps 3, lilas et menthe au temps 4.
  assert.deepEqual(range('.galerie-scene-mur-creme'), [0.64, 0.82, 'galerie-scene-fondu'])
  assert.deepEqual(range('.galerie-scene-sol-soleil'), [0.64, 0.82, 'galerie-scene-fondu'])
  assert.deepEqual(range('.galerie-scene-mur-nuit'), [1.98, 3.24, 'galerie-scene-nuit'])
  assert.deepEqual(range('.galerie-scene-sol-nuit'), [1.98, 3.24, 'galerie-scene-nuit'])
  assert.deepEqual(range('.galerie-scene-mur-lilas'), [3.1, 3.24, 'galerie-scene-fondu'])
  assert.deepEqual(range('.galerie-scene-sol-menthe'), [3.1, 3.24, 'galerie-scene-fondu'])
  // Le temps 3 : la lampe arrive vers 2,3, s'allume à 2,5, la dame parle à 2,8.
  assert.deepEqual(range('.galerie-scene-lampe'), [2.26, 3.2, 'galerie-scene-lampe'])
  assert.deepEqual(range('.galerie-scene-lampe .galerie-scene-lampe-feu'), [2.5, 3.2, 'galerie-scene-allume'])
  assert.deepEqual(range('.galerie-scene-lueur'), [2.5, 3.2, 'galerie-scene-allume'])
  assert.deepEqual(range('.galerie-scene-cache'), [1.98, 3.2, 'galerie-scene-cache'])
  assert.deepEqual(range('.galerie-scene-vive'), [2.5, 3.14, 'galerie-scene-allume'])
  assert.deepEqual(range('.galerie-scene-lit'), [2, 3.2, 'galerie-scene-lit'])
  assert.deepEqual(range('.galerie-scene-lit > .galerie-scene-mot'), [2.8, 2.9, 'galerie-scene-mot'])
  const messages = [[2.1, 2.3], [2.3, 2.5], [2.5, 3.22]]
  messages.forEach(([a, b], i) => assert.deepEqual(range(`.galerie-scene-lumiere .galerie-scene-msg:nth-child(${i + 1})`).slice(0, 2), [a, b]))
  // Le temps 1 : le public de -0,2 à 0,86, l'oiseau de 0,06 à 0,86.
  for (const group of ['gauche', 'milieu', 'droite']) assert.deepEqual(range(`.galerie-scene-public-${group}`), [-0.2, 0.86, `galerie-scene-public-${group}`])
  assert.deepEqual(range('.galerie-scene-oiseau'), [0.06, 0.86, 'galerie-scene-oiseau'])
  // Le temps 4 : l'œuvre grossit de 3,18 à 3,62, la main avance, puis l'étincelle.
  assert.deepEqual(range('.galerie-scene-oeuvre'), [3.18, 3.62, 'galerie-scene-zoom'])
  assert.deepEqual(range('.galerie-scene-centre'), [3.18, 3.62, 'galerie-scene-centre'])
  assert.deepEqual(range('.galerie-scene-main'), [3.34, 3.76, 'galerie-scene-main'])
  assert.deepEqual(range('.galerie-scene-touche'), [3.72, 3.82, 'galerie-scene-touche'])
  assert.deepEqual(range('.galerie-scene-trame'), [3.32, 3.62, 'galerie-scene-fondu'])
  // L'œuvre dérive tout au long de la scène, et se place au-dessus du lit au temps 3.
  assert.deepEqual(range('.galerie-scene-derive'), [-1, 4.82, 'galerie-scene-derive'])
  assert.deepEqual(range('.galerie-scene-place'), [1.94, 3.3, 'galerie-scene-place'])
})

test('la feuille : les images clés de la maquette', () => {
  const frames = (name) => body(`@keyframes galerie-scene-${name}`)
  assert.equal(frames('nuit'), '0% { opacity: 0; } 10% { opacity: 1; } 89% { opacity: 1; } 100% { opacity: 0; }')
  assert.equal(frames('passe-debut'), '0%, 34% { opacity: 1; transform: none; } 88% { opacity: 1; transform: translateY(-14px); } 100% { opacity: 0; transform: translateY(-40px); }')
  assert.equal(frames('passe-long'), '0% { opacity: 0; transform: translateY(40px); } 11% { opacity: 1; transform: translateY(6px); } 90% { opacity: 1; transform: translateY(-6px); } 100% { opacity: 0; transform: translateY(-40px); }')
  assert.equal(frames('passe-fin'), '0% { opacity: 0; transform: translateY(40px); } 26% { opacity: 1; transform: translateY(6px); } 100% { opacity: 1; transform: none; }')
  // L'œuvre, plus petite et plus haute au temps 1 (--e1, --y1), reprend sa taille ; elle s'accroche au-dessus du lit
  // (--yc, --e3), puis grossit (--zoom, --zx, --zy) : les valeurs que mesure le script.
  assert.equal(frames('derive'), '0%, 17.2% { transform: translateY(var(--y1)) scale(var(--e1)); } 28.2% { transform: translateY(var(--y1)) scale(calc(var(--e1) * 1.035)); } 33.2% { transform: translateY(0.8svh) scale(1); } 100% { transform: translateY(-2.4svh) scale(1); }')
  assert.equal(frames('place'), '0% { transform: none; } 14%, 88% { transform: translateY(var(--yc)) scale(var(--e3)); } 100% { transform: none; }')
  assert.equal(frames('centre'), 'from { transform: none; } to { transform: translate(var(--zx), var(--zy)); }')
  assert.equal(frames('zoom'), 'from { transform: none; } to { transform: scale(var(--zoom)); }')
  // La lampe s'allume : un battement, puis la pleine lumière.
  assert.equal(frames('allume'), '0% { opacity: 0; } 7% { opacity: 0.62; } 11% { opacity: 0.22; } 30% { opacity: 0.9; } 80% { opacity: 1; } 100% { opacity: 0; }')
  assert.equal(frames('cache'), '0% { opacity: 0; } 9.8% { opacity: 0.82; } 42.6% { opacity: 0.82; } 46.6% { opacity: 0.32; } 48.9% { opacity: 0.64; } 59.8% { opacity: 0; } 100% { opacity: 0; }')
  assert.equal(frames('lit'),'0% { opacity: 0; transform: translateY(calc(70 * var(--cm))); } 6% { opacity: 0.2; } 14% { opacity: 0.2; transform: none; } 41.7% { opacity: 0.2; } 45.75% { opacity: 0.72; } 48.1% { opacity: 0.38; } 59.2% { opacity: 1; } 85% { opacity: 1; transform: none; } 96% { opacity: 0; } 100% { opacity: 0; transform: translateY(calc(70 * var(--cm))); }')
  // Le public marche en penchant d'un côté puis de l'autre : réuni vers 0,2, reparti à partir de 0,66.
  assert.match(frames('public-milieu'), /^0%, 4% { transform: translate\(var\(--px\), var\(--py\)\) rotate\(var\(--pr\)\); } 12% .* 38% { transform: none; } 81% { transform: none; } 100% { transform: translate\(var\(--px\), var\(--py\)\) rotate\(var\(--pr\)\); }$/)
  assert.match(frames('public-droite'), /^0%, 8% { .* 42% { transform: none; } 81% { transform: none; } 100% /)
  assert.match(frames('public-gauche'), /^0%, 13% { .* 47% { transform: none; } 81% { transform: none; } 100% /)
  assert.match(frames('oiseau'), /^0% { opacity: 0; transform: translate\(48vw, -7svh\) rotate\(20deg\); } 6% { opacity: 1; } .* 100% { opacity: 0; transform: translate\(52vw, -12svh\) rotate\(-16deg\); }$/)
  assert.equal(frames('main'), 'from { transform: translateX(106%) rotate(7deg); } to { transform: none; }')
})

test('la feuille : les couleurs de la nuit et de la lampe sont des variables du socle, une par ligne', () => {
  const source = read(CSS)
  const NEW = { nuit: '#0b0a10', 'nuit-sol': '#15131c', laiton: '#cfa85a', ampoule: '#fff0b8', 'ampoule-halo': '#ffe696', lueur: '#ffe6a5', 'lueur-moyenne': '#fada96', 'lueur-lointaine': '#d6aa78', reflet: '#fff6d6', 'reflet-halo': '#ffe296', noir: '#000000' }
  const tokens = rules(source.replace(/\/\*[\s\S]*?\*\//g, '')).find((r) => r.head === ':root:has(main-product-blocks[data-galerie])' && !r.context.length).body
  for (const [name, hex] of Object.entries(NEW)) {
    assert.equal(value(tokens, name), hex, `--${name}`)
    assert.match(source, new RegExp(`^  --${name}: ${hex};$`, 'm'), `--${name} : sur sa propre ligne`)
  }
  // Le mur et le sol de la nuit, le cache de l'œuvre dans le noir.
  assert.match(body('.galerie-scene-mur-nuit'), /background: var\(--nuit\);/)
  assert.match(body('.galerie-scene-sol-nuit'), /background: var\(--nuit-sol\);/)
  assert.match(body('.galerie-scene-cache'), /background: var\(--nuit\);/)
  // Aucune couleur écrite dans le bloc : des variables, et leur transparence par color-mix.
  for (const { head, body: text } of sheet()) assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, head)
  // Le texte du temps 3, sur le noir : blanc, dans les deux états animés seulement ; à plat, il reste à l'encre.
  assert.equal(body('galerie-scene[data-mouvement] .galerie-scene-lumiere, galerie-scene[data-mouvement] .galerie-scene-lumiere .galerie-surtitre, galerie-scene[data-mouvement] .galerie-scene-lumiere .galerie-scene-msg b'), 'color: var(--blanc);')
  // Là où color-mix manque, le texte reste blanc plein : jamais d'encre sur le noir. Le repli ne vaut que si la
  // seconde déclaration est refusée dès la lecture, donc sans var() (currentColor : le blanc qu'elle hérite).
  assert.equal(body('galerie-scene[data-mouvement] .galerie-scene-lumiere .galerie-scene-msg'), 'color: var(--blanc); color: color-mix(in srgb, currentColor 76%, transparent);')
  // Le fond des traits du repère, de même : 18 % de l'encre, ou 12 % sans color-mix.
  assert.match(body('.galerie-scene-rail button::before'), /background: var\(--encre-12\); background: color-mix\(in srgb, currentColor 18%, transparent\);/)
  // Ailleurs, une transparence sans repli : un navigateur sans color-mix perd une ombre ou un halo, rien de lisible.
  for (const { head, body: text } of sheet()) {
    const declarations = text.split(';').map((d) => d.trim()).filter(Boolean)
    declarations.forEach((d, i) => {
      if (!/color-mix\(/.test(d) || !/var\(/.test(d)) return
      const property = d.split(':')[0]
      assert.ok(!declarations.slice(0, i).some((p) => p.split(':')[0] === property), `${head} : un repli que la ligne suivante annule toujours (${property})`)
    })
  }
})

test('la feuille : à plat (mouvements réduits, script coupé), la scène se déplie, l’œuvre puis tous les textes', () => {
  const FLAT_STATE = 'galerie-scene:not([data-mouvement])'
  assert.equal(body(FLAT_STATE), 'height: auto;')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-ecran`), 'position: relative; height: auto; overflow: visible; contain: none;')
  // Ni foule, ni nuit, ni lampe, ni repère : seuls le mur de jour, l'œuvre et les textes restent.
  const hidden = sheet().find((r) => /display: none;/.test(r.body) && r.head.includes(`${FLAT_STATE} .galerie-scene-lit`))
  assert.ok(hidden, 'ce qui ne se montre pas à plat')
  const gone = hidden.head.split(',').map((s) => s.trim().replace(`${FLAT_STATE} `, ''))
  assert.deepEqual(gone.sort(), ['.galerie-scene-brillance', '.galerie-scene-cache', '.galerie-scene-invite', '.galerie-scene-lampe', '.galerie-scene-lit', '.galerie-scene-lueur', '.galerie-scene-murs i:not(.galerie-scene-mur-ciel)', '.galerie-scene-oiseau', '.galerie-scene-palette', '.galerie-scene-rail', '.galerie-scene-reflet', '.galerie-scene-sols', '.galerie-scene-sonde', '.galerie-scene-teintes', '.galerie-scene-trame', '.galerie-scene-vive'].sort())
  // Les textes à la suite, l'œuvre d'abord, à ses proportions.
  assert.equal(body(`${FLAT_STATE} .galerie-scene-zone`), 'position: relative; height: auto; display: grid; gap: 30px; padding-block: 56px;')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-chap`), 'grid-area: auto;')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-chap .galerie-scene-msg`), 'grid-area: auto;')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-cadre`), 'order: -1; container-type: normal;')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-derive`), 'position: relative; top: auto; left: auto; margin-inline: auto; width: min(76vw, 420px); height: auto; aspect-ratio: var(--ratio);')
  assert.equal(body(`${FLAT_STATE} .galerie-scene-matiere`), 'background: none; box-shadow: none; padding: 0; margin: 0;')
})

test('la feuille : l’œuvre garde ses proportions, portrait, paysage ou carré, et ne passe jamais sous le texte', () => {
  // Sa hauteur : toute la place sous le texte, ou 86 % de la largeur de sa colonne, selon ses proportions (--ratio,
  // que la section écrit d'après l'image).
  const fit = sheet().find((r) => r.head.replace(/\s+/g, ' ') === '.galerie-scene-derive, .galerie-scene-palette' && r.context.join() === '@supports (width: 1cqw)')
  assert.match(fit.body, /--oh:\s*min\(calc\(100cqh - 6px\), calc\(86cqw \/ var\(--ratio\)\)\);/)
  assert.match(body('.galerie-scene-derive'), /top: calc\(50% - var\(--oh\) \/ 2\); left: calc\(50% - var\(--oh\) \* var\(--ratio\) \/ 2\); height: var\(--oh\); width: calc\(var\(--oh\) \* var\(--ratio\)\);/)
  assert.match(body('.galerie-scene-cadre'), /container-type: size;/)
  // Sans unités de conteneur : bornée par la largeur de l'écran aussi, pour une œuvre en paysage.
  assert.match(body('.galerie-scene-derive, .galerie-scene-palette'), /--oh: min\(40svh, calc\(76vw \/ var\(--ratio\)\)\);/)
  // L'image remplit son cadre sans se déformer.
  assert.match(body('.galerie-scene-oeuvre img'), /object-fit: cover;/)
  // Rien ne dépasse de la scène : pas de défilement de côté.
  assert.match(body('.galerie-scene-ecran'), /overflow: clip;/)
})

test('la feuille : sur ordinateur (900 px), le texte à gauche, l’œuvre à droite', () => {
  const host = body('galerie-scene', LARGE)
  assert.equal(value(host, 'pied'), '92svh')
  assert.equal(value(host, 'cm'), 'min(0.37svh, 0.26vw)')
  assert.equal(value(host, 'zoom'), '1.85')
  assert.equal(value(host, 'lx'), '65vw')
  assert.equal(value(host, 'e1'), '0.86')
  assert.equal(body('.galerie-scene-zone', LARGE), 'grid-template-rows: minmax(0, 1fr); grid-template-columns: minmax(0, 30vw) minmax(0, 1fr); column-gap: 6vw; row-gap: 0; padding: 13svh 12vw calc(100svh - var(--sol) + 4svh) 6vw;')
  assert.equal(body('.galerie-scene-chap h2', LARGE), 'font-size: clamp(44px, 4.7vw, 80px); line-height: 0.97; margin-top: 18px;')
  assert.equal(body('.galerie-scene-rail', LARGE), 'right: auto; width: 30vw; left: 6vw; top: 5svh;')
  // Sur téléphone : le texte en haut, l'œuvre dans la place qui reste.
  assert.match(body('.galerie-scene-zone'), /grid-template-rows: auto minmax\(0, 1fr\); row-gap: 1\.8svh; padding: calc\(6\.8svh \+ env\(safe-area-inset-top, 0px\)\) var\(--goutd\) calc\(100svh - var\(--sol\) \+ 2\.4svh\) var\(--gout\);/)
  assert.equal(body('.galerie-scene-chap h2'), 'margin: 12px 0 0; font: 300 clamp(31px, 9vw, 42px)/1 var(--sans); letter-spacing: -0.042em; text-wrap: balance;')
})

test('la feuille : un poster est une feuille, ombre courte, et son temps 4 montre le reflet du papier', () => {
  assert.match(body('galerie-scene[data-support="poster"] .galerie-scene-oeuvre'), /^box-shadow: 0 0 0 0\.5px color-mix\(in srgb, var\(--encre\) 14%, transparent\), 0 8px 12px -6px color-mix\(in srgb, var\(--encre\) 38%, transparent\), 0 1px 3px color-mix\(in srgb, var\(--encre\) 18%, transparent\);$/)
  const shine = body('.galerie-scene-brillance')
  assert.deepEqual([value(shine, 'a'), value(shine, 'b'), value(shine, 'n')], ['3.3', '3.5', 'galerie-scene-fondu'])
  const slide = body('.galerie-scene-glisse')
  assert.deepEqual([value(slide, 'a'), value(slide, 'b'), value(slide, 'n')], ['3.3', '3.82', 'galerie-scene-glisse'])
  assert.equal(body('@keyframes galerie-scene-glisse'), 'from { transform: translateX(-34%); } to { transform: translateX(30%); }')
})

test('la feuille : le repère passe au blanc pendant la nuit sans animer de couleur, et son focus se voit sur le noir', () => {
  // Un trait blanc par-dessus chaque trait, qui apparaît avec la nuit (opacity) : huit petits traits.
  const white = body('.galerie-scene-blanc')
  assert.deepEqual([value(white, 'a'), value(white, 'b'), value(white, 'n')], ['1.98', '3.24', 'galerie-scene-nuit'])
  assert.match(white, /background: var\(--blanc\);/)
  // Le focus : un contour à l'encre doublé de blanc, lisible sur les murs clairs comme dans le noir.
  assert.equal(body('.galerie-scene-rail button:focus-visible'), 'outline: 2px solid var(--encre); outline-offset: 2px; box-shadow: 0 0 0 2px var(--blanc);')
})

/* ---------- La section ---------- */

test('la section : sur les fiches produit seulement, sans réglage, une seule par page', () => {
  const schema = schemaOf(SECTION)
  assert.ok(schema.name.length <= 25, 'Shopify limite le nom d’une section à 25 caractères')
  assert.deepEqual(schema.enabled_on, { templates: ['product'] })
  assert.equal(schema.limit, 1)
  assert.equal(schema.blocks, undefined)
  assert.equal(schema.presets, undefined, 'elle ne s’ajoute pas depuis l’éditeur : elle a besoin du bloc principal en page galerie')
  // Les textes fixes du design sont dans les fichiers de langue : aucun texte à régler.
  assert.deepEqual((schema.settings || []).filter((s) => !['header', 'paragraph'].includes(s.type)), [])
})

test('la section : l’image à plat et le type d’œuvre viennent des règles du thème, rien n’est recopié', () => {
  const source = code(SECTION)
  assert.match(source, /render 'artwork-kind', product: product, suffix: template\.suffix/)
  assert.match(source, /render 'artwork-flat-index', product: product/)
  assert.match(source, /product\.media\[flat_index\]/)
  assert.match(source, /product\.metafields\.painting_options\.frames_poster != blank/)
  // Ni le nom d'un modèle de page, ni une place d'image écrite en dur.
  assert.doesNotMatch(source, /oeuvre-galerie|oeuvre-3d|template_suffix|product\.media\[\d\]|product\.images\[\d\]|featured_/)
  // Le temps 2 ne lit aucune couleur : c'est le ticket 21.
  assert.doesNotMatch(source, /color-pattern|color_pattern|artwork\.colors|color_text|painting\.color/)
  // Aucun style ni script en ligne ; la seule valeur passée à la feuille est la proportion de l'œuvre.
  assert.doesNotMatch(source, /<style|<script|{%-?\s*style/)
  assert.deepEqual([...source.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/{{[^}]*}}/, 'x')), ['--ratio: x'])
})

test('la feuille commune du site ne porte rien de la scène', () => {
  assert.doesNotMatch(read('input.css'), /galerie-scene/)
  const classes = [...code(SECTION).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
  assert.ok(classes.length > 40)
  for (const name of classes) assert.match(name, /^galerie(-[a-z]+)*$/, `classe « ${name} »`)
})

test('aucun tableau ancien, aucun artiste n’est nommé : ni dans la section, ni dans la feuille, ni dans le script, ni dans les textes', () => {
  // Les noms des notes de la maquette (README, « Tableaux anciens ») et les anciens noms de fichiers.
  const NAMED = /boilly|goya|maja|michel-?ange|michelangelo|fabritius|chardonneret|goldfinch|louvre|\bsalon\b|\bsacre\b|\badam\b|friedrich|vermeer|joconde|allong[ée]e|foule|1810/i
  for (const [file, text] of [[SECTION, read(SECTION)], [CSS, blockOf(CSS)], [JS, blockOf(JS)]]) assert.doesNotMatch(text, NAMED, file)
  for (const file of Object.values(LANGS)) assert.doesNotMatch(JSON.stringify(json(`locales/${file}`).sections.mma.galerie.scene), NAMED, file)
  for (const name of Object.keys(GUESTS)) assert.ok(exists(`assets/${name}`), `assets/${name}`)
  const assets = fs.readdirSync(path.join(ROOT, 'assets')).filter((name) => /^galerie-/.test(name))
  for (const name of assets) assert.doesNotMatch(name, NAMED, name)
})

/* ---------- Les textes ---------- */

const texts = (lang) => json(`locales/${LANGS[lang]}`).sections.mma.galerie.scene
const KEYS = ['colors', 'colors_title_html', 'label', 'light', 'light_lamp', 'light_lamp_text', 'light_off', 'light_off_text', 'light_on', 'light_on_text_canvas', 'light_on_text_poster', 'light_quote', 'light_title_html', 'look', 'look_text', 'look_title_html', 'matter', 'matter_text_canvas', 'matter_text_poster', 'matter_title_canvas_html', 'matter_title_poster_html', 'steps']

test('textes de la scène : sous sections.mma.galerie.scene, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const fr = texts('fr')
  assert.deepEqual(Object.keys(fr).sort(), KEYS)
  // Les textes de la maquette.
  assert.equal(fr.look_title_html, 'Impossible de passer devant <b>sans s’arrêter.</b>')
  assert.equal(fr.look_text, 'Un regard suffit pour être happé. Et on y revient : il reste toujours un détail à découvrir.')
  assert.equal(fr.colors_title_html, 'Chaque couleur <b>agit sur vous.</b>')
  assert.equal(fr.light_title_html, 'Éclairé <b>comme au musée.</b>')
  assert.equal(fr.light_off, 'Le soir, sans lumière.')
  assert.equal(fr.light_off_text, 'Les couleurs s’endorment avec le jour.')
  assert.equal(fr.light_lamp, 'Une lampe de tableau.')
  assert.equal(fr.light_lamp_text, 'Fixée juste au-dessus, comme dans les musées.')
  assert.equal(fr.light_on, 'Lampe allumée.')
  assert.equal(fr.light_on_text_canvas, 'Les couleurs se réveillent : le tableau prend toute sa prestance.')
  assert.equal(fr.light_on_text_poster, 'Les couleurs se réveillent : le poster prend toute sa prestance.')
  assert.equal(fr.light_quote, 'Laissez allumé.')
  assert.equal(fr.matter_title_canvas_html, 'Le grain d’une <b>vraie toile.</b>')
  assert.equal(fr.matter_text_canvas, 'Épaisse, tendue à la main sur un châssis en bois massif. On a envie d’y toucher.')
  assert.equal(fr.matter_title_poster_html, 'Un vrai <b>papier photo.</b>')
  assert.equal(fr.matter_text_poster, 'Épais, 250 g/m², pour un tirage net aux couleurs éclatantes. À encadrer, ou à poser tel quel.')
  assert.deepEqual([fr.look, fr.colors, fr.light, fr.matter], ['Le regard', 'Les couleurs', 'La lumière', 'La matière'])
  for (const lang of Object.keys(LANGS)) {
    const t = texts(lang)
    assert.deepEqual(Object.keys(t).sort(), KEYS, lang)
    for (const [key, text] of Object.entries(t)) {
      assert.equal(typeof text, 'string', `${lang}.${key}`)
      assert.ok(text.trim().length > 0, `${lang}.${key} : vide`)
      if (lang !== 'fr') assert.notEqual(text, fr[key], `${lang}.${key} : resté en français`)
      // Un titre a un passage en gras, un seul, bien fermé ; les autres textes n'ont aucun balisage (Shopify les
      // écrit tels quels dans la page seulement si leur clé finit par _html).
      if (key.endsWith('_html')) assert.match(text, /^[^<>]*<b>[^<>]+<\/b>[^<>]*$/, `${lang}.${key}`)
      else assert.doesNotMatch(text, /[<>]/, `${lang}.${key}`)
      // L'apostrophe typographique, comme dans tout le thème.
      assert.doesNotMatch(text, /'/, `${lang}.${key} : apostrophe droite`)
    }
    // Chaque page ne dit que son support : la toile d'un côté, le poster de l'autre.
    assert.notEqual(t.light_on_text_canvas, t.light_on_text_poster, lang)
    assert.match(t.light_on_text_poster, /poster|póster/i, lang)
    assert.doesNotMatch(t.light_on_text_canvas, /poster|póster/i, lang)
    assert.match(t.matter_text_poster, /250 g\/m²/, lang)
  }
})

/* ---------- Le modèle caché ---------- */

const inModel = exists(MODEL) && Object.values(json(MODEL).sections).some((s) => s.type === 'galerie-scene')

test('le modèle caché : la scène suit le bloc principal', { skip: inModel ? false : 'la scène arrive dans le modèle par un second commit : Shopify refuse un modèle qui cite une section qu’il ne connaît pas encore' }, () => {
  const model = json(MODEL)
  const types = model.order.map((id) => model.sections[id].type)
  assert.equal(types[types.indexOf('main-product') + 1], 'galerie-scene')
  assert.equal(types.filter((type) => type === 'galerie-scene').length, 1)
  const id = model.order[types.indexOf('galerie-scene')]
  assert.deepEqual(model.sections[id], { type: 'galerie-scene', settings: {} })
  // La fiche actuelle ne la reçoit pas : rien ne change pour elle avant la bascule.
  for (const name of fs.readdirSync(path.join(ROOT, 'templates')).filter((n) => /\.json$/.test(n) && `templates/${n}` !== MODEL)) {
    assert.doesNotMatch(read(`templates/${name}`), /galerie-scene/, name)
  }
})

/* ---------- Le rendu ---------- */

// Le balisage, ses blancs réduits à une espace (une balise écrite sur plusieurs lignes), et sans ceux qui séparent
// deux balises ; ceux d'un texte restent.
const tight = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const render = async (p = product(), options = {}) => tight(await renderSectionFile(SECTION, {}, p, { suffix: 'oeuvre-galerie', ...options }))
// Les balises ouvrantes d'un rendu : { tag, attrs, classes }.
const tags = (html) => [...html.matchAll(/<([a-z][\w-]*)((?:\s+[^<>]*?)?)\/?>/g)].map((m) => ({ tag: m[1], attrs: m[2], classes: ((/\sclass="([^"]*)"/.exec(m[2]) || [])[1] || '').split(/\s+/).filter(Boolean) }))
const chapters = (html) => [...html.matchAll(/<article class="([^"]*)">([\s\S]*?)<\/article>/g)].map((m) => ({ classes: m[1], html: m[2] }))

test('rendu, toile : la scène, ses quatre temps dans l’ordre, un titre de niveau 2 par temps', { skip: SKIP }, async () => {
  const html = await render()
  // L'élément de la scène : une région nommée, son support, la proportion de l'œuvre pour la feuille.
  assert.match(html, /^<galerie-scene class="galerie galerie-scene" role="region" aria-label="L’œuvre en quatre temps : le regard, les couleurs, la lumière, la matière" data-support="toile" style="--ratio: 0\.7484"><div class="galerie-scene-ecran">/)
  assert.match(html, /<\/div><\/galerie-scene>$/)
  assert.doesNotMatch(html, /data-mouvement/, 'l’état est posé par le script : sans lui, la scène est à plat')
  const parts = chapters(html)
  assert.deepEqual(parts.map((c) => c.classes), ['regard', 'couleurs', 'lumiere', 'matiere'].map((name) => `galerie-scene-chap galerie-scene-${name} galerie-scene-a`))
  // Le numéro et le nom du temps : une espace entre les deux, pour les lecteurs d'écran (« 1 Le regard ») ; à l'écran,
  // la pastille et le nom gardent leur écart.
  assert.equal(parts[0].html, '<p class="galerie-surtitre"><i>1</i> Le regard</p><h2>Impossible de passer devant <b>sans s’arrêter.</b></h2><p>Un regard suffit pour être happé. Et on y revient : il reste toujours un détail à découvrir.</p>')
  // Le temps 2 : son titre, et la place des phrases des couleurs (ticket 21), sans rien d'autre.
  assert.equal(parts[1].html, '<p class="galerie-surtitre"><i>2</i> Les couleurs</p><h2>Chaque couleur <b>agit sur vous.</b></h2>')
  assert.equal(parts[2].html, '<p class="galerie-surtitre"><i>3</i> La lumière</p><h2>Éclairé <b>comme au musée.</b></h2><div class="galerie-scene-messages">'
    + '<p class="galerie-scene-msg galerie-scene-a"><b>Le soir, sans lumière.</b> Les couleurs s’endorment avec le jour.</p>'
    + '<p class="galerie-scene-msg galerie-scene-a"><b>Une lampe de tableau.</b> Fixée juste au-dessus, comme dans les musées.</p>'
    + '<p class="galerie-scene-msg galerie-scene-a"><b>Lampe allumée.</b> Les couleurs se réveillent : le tableau prend toute sa prestance.</p></div>')
  assert.equal(parts[3].html, '<p class="galerie-surtitre"><i>4</i> La matière</p><h2>Le grain d’une <b>vraie toile.</b></h2><p>Épaisse, tendue à la main sur un châssis en bois massif. On a envie d’y toucher.</p>')
  // Un seul h1 dans la page, celui du bloc principal : ici, quatre h2 et rien d'autre.
  assert.deepEqual(tags(html).filter((t) => /^h\d$/.test(t.tag)).map((t) => t.tag), ['h2', 'h2', 'h2', 'h2'])
  // La trame de la toile, pas le reflet du papier ; rien du poster.
  assert.match(html, /<div class="galerie-scene-trame galerie-scene-a" data-allow-empty><\/div>/)
  assert.doesNotMatch(html, /galerie-scene-brillance|galerie-scene-glisse/)
  assert.doesNotMatch(text(html), /poster|papier photo/i)
  // Le mot de la dame, dans son décor (caché aux lecteurs d'écran, comme tous les personnages).
  assert.match(html, /<div class="galerie-scene-lit galerie-scene-a" aria-hidden="true"><div class="galerie-scene-dame"><img [^>]*><\/div><p class="galerie-scene-mot galerie-scene-a">Laissez allumé\.<\/p><\/div>/)
})

test('rendu, poster : « le poster » au temps 3, le papier photo au temps 4, rien de la toile', { skip: SKIP }, async () => {
  const html = await render(product({ poster: true }))
  assert.match(html, /^<galerie-scene class="galerie galerie-scene" role="region" aria-label="[^"]+" data-support="poster" style="--ratio: 0\.7484">/)
  const parts = chapters(html)
  assert.match(parts[2].html, /<b>Lampe allumée\.<\/b> Les couleurs se réveillent : le poster prend toute sa prestance\.<\/p><\/div>$/)
  assert.equal(parts[3].html, '<p class="galerie-surtitre"><i>4</i> La matière</p><h2>Un vrai <b>papier photo.</b></h2><p>Épais, 250 g/m², pour un tirage net aux couleurs éclatantes. À encadrer, ou à poser tel quel.</p>')
  // Les temps 1 à 3 sont ceux de la toile, à un mot près.
  const toile = chapters(await render())
  assert.equal(parts[0].html, toile[0].html)
  assert.equal(parts[1].html, toile[1].html)
  assert.equal(parts[2].html, toile[2].html.replace('le tableau', 'le poster'))
  // Le reflet du papier, pas la trame ; une seule version dans la page.
  assert.match(html, /<div class="galerie-scene-brillance galerie-scene-a"><i class="galerie-scene-glisse galerie-scene-a" data-allow-empty><\/i><\/div>/)
  assert.doesNotMatch(html, /galerie-scene-trame/)
  assert.doesNotMatch(text(html), /toile|châssis|tableau prend/i)
})

test('rendu : l’œuvre est l’image à plat du produit, celle de la scène 3D, chargée en différé, sans texte alternatif', { skip: SKIP }, async () => {
  const html = await render()
  const images = tags(html).filter((t) => t.tag === 'img')
  const art = images.filter((t) => /bonsai-zen-oeuvre\.jpg/.test(t.attrs))
  // Deux fois : l'œuvre, et sa copie avivée sous la lampe (temps 3).
  assert.deepEqual(art.map((t) => t.classes.join(' ')), ['galerie-scene-image', 'galerie-scene-vive galerie-scene-a'])
  for (const { attrs } of art) {
    assert.match(attrs, / src="\/\/www\.myselfmonart\.com\/cdn\/shop\/files\/bonsai-zen-oeuvre\.jpg\?v=1&width=750"/)
    // Les paliers de la scène 3D, que le navigateur a souvent déjà ; jamais plus large que l'image, ni que 2000 px.
    assert.deepEqual([...attrs.matchAll(/(?:width=(\d+)|\?v=1) (\d+)w/g)].map((m) => [Number(m[1] || 0), Number(m[2])]), [[400, 400], [550, 550], [750, 750], [1100, 1100], [1500, 1500], [0, 1904]])
    assert.match(attrs, / sizes="\(min-width: 900px\) 45vw, 86vw"/)
    // crossorigin, comme l'image de la scène 3D : la même requête quand le navigateur choisit la même taille, et des
    // pixels lisibles pour les couleurs du temps 2 (ticket 21).
    assert.match(attrs, / width="1904" height="2544" alt="" loading="lazy" decoding="async" crossorigin="anonymous"/)
  }
  assert.equal(art[0].attrs.replace(/ class="[^"]*"/, ''), art[1].attrs.replace(/ class="[^"]*"/, ''), 'la même source : un seul téléchargement')
  // Aucune autre image du produit, aucun texte alternatif, aucun titre : un décor.
  assert.equal(images.length, 2 + 6)
  for (const { attrs } of images) assert.match(attrs, / alt=""/)
  assert.doesNotMatch(html, / title="| aria-describedby=/)
  // Un produit de toujours vu dans cette page : son image à plat est sa 2e image.
  const old = await render(product({ suffix: 'painting', files: OLD }))
  assert.equal(tags(old).filter((t) => t.tag === 'img' && /bonsai-zen-oeuvre\.jpg/.test(t.attrs)).length, 2)
  assert.doesNotMatch(old, /bonsai-zen-salon|bonsai-zen-chambre/)
  // Une image plus petite que les paliers : les seuls qu'elle atteint, puis elle-même. Une très grande : 2000 px au plus.
  const widths = async (file) => [...tags(await render(product({ files: [file] }))).find((t) => t.classes.includes('galerie-scene-image')).attrs.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]))
  assert.deepEqual(await widths(['petite.jpg', 600, 800]), [400, 550, 600])
  assert.deepEqual(await widths(['grande.jpg', 4500, 6000]), [400, 550, 750, 1100, 1500, 2000])
})

test('rendu : les personnages, sous des noms neutres, à leur taille, chargés en différé, cachés aux lecteurs d’écran', { skip: SKIP }, async () => {
  const html = await render()
  const guests = tags(html).filter((t) => t.tag === 'img' && /\/assets\/galerie-/.test(t.attrs))
  const file = (t) => /\/assets\/([\w-]+\.webp)\?v=1"/.exec(t.attrs)[1]
  // Le public trois fois (la même image, découpée en trois groupes), l'oiseau, la dame, la main.
  assert.deepEqual(guests.map(file), ['galerie-oiseau.webp', 'galerie-public.webp', 'galerie-public.webp', 'galerie-public.webp', 'galerie-dame.webp', 'galerie-main.webp'])
  for (const t of guests) {
    const [width, height] = GUESTS[file(t)]
    assert.match(t.attrs, new RegExp(` width="${width}" height="${height}" alt="" loading="lazy" decoding="async"`), file(t))
  }
  assert.deepEqual(guests.filter((t) => file(t) === 'galerie-public.webp').map((t) => t.classes.join(' ')), ['gauche', 'milieu', 'droite'].map((g) => `galerie-scene-public-${g} galerie-scene-a`))
  // Les fichiers sont ceux de la maquette, à l'octet près, à leur taille.
  const webpSize = (name) => {
    const bytes = fs.readFileSync(path.join(ROOT, 'assets', name))
    assert.equal(bytes.toString('ascii', 0, 4) + bytes.toString('ascii', 8, 12), 'RIFFWEBP', name)
    // VP8X : la toile de l'image, largeur et hauteur moins un, sur trois octets chacune.
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X', `${name} : un WebP avec transparence`)
    return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]
  }
  for (const [name, size] of Object.entries(GUESTS)) assert.deepEqual(webpSize(name), size, name)
  // Tout le décor est caché aux lecteurs d'écran : murs, sols, personnages ; les textes et le repère restent.
  for (const mark of ['galerie-scene-murs', 'galerie-scene-sols', 'galerie-scene-invite galerie-scene-public', 'galerie-scene-lit galerie-scene-a','galerie-scene-invite galerie-scene-main galerie-scene-a', 'galerie-scene-oiseau galerie-scene-a', 'galerie-scene-lampe galerie-scene-a', 'galerie-scene-palette galerie-scene-a']) {
    assert.match(html, new RegExp(`class="${mark}"[^>]* aria-hidden="true"`), mark)
  }
  assert.doesNotMatch(/<article[\s\S]*<\/article>/.exec(html)[0], /aria-hidden/)
})

test('rendu : le repère, quatre boutons nommés qui mènent chacun à son temps', { skip: SKIP }, async () => {
  const html = await render()
  const rail = /<ol class="galerie-scene-rail" aria-label="Les quatre temps">([\s\S]*?)<\/ol>/.exec(html)
  assert.ok(rail, 'le repère')
  const buttons = [...rail[1].matchAll(/<li><button type="button" data-temps="([\d.]+)" aria-label="([^"]+)"><i class="galerie-scene-blanc galerie-scene-a" data-allow-empty><\/i><i class="galerie-scene-plein galerie-scene-a"><i class="galerie-scene-blanc galerie-scene-a" data-allow-empty><\/i><\/i><\/button><\/li>/g)]
  assert.deepEqual(buttons.map((m) => [m[1], m[2]]), [['0.02', '1, Le regard'], ['1', '2, Les couleurs'], ['2.2', '3, La lumière'], ['3.78', '4, La matière']])
  assert.equal(rail[1].match(/<li>/g).length, 4)
})

test('rendu : portrait, paysage ou carré, la proportion de l’œuvre est celle de son image', { skip: SKIP }, async () => {
  const ratio = async (file) => /^<galerie-scene [^>]* style="--ratio: ([\d.]+)">/.exec(await render(product({ files: [file] })))[1]
  assert.equal(await ratio(['portrait.jpg', 1904, 2544]), '0.7484')
  assert.equal(await ratio(['paysage.jpg', 2544, 1904]), '1.3361')
  // Un nombre rond s'écrit « 1.0 » dans Shopify et « 1 » dans le banc : le même pour la feuille.
  assert.match(await ratio(['carre.jpg', 2000, 2000]), /^1(\.0)?$/)
  assert.match(await ratio(['panorama.jpg', 3000, 1000]), /^3(\.0)?$/)
})

test('rendu : un élément vide garde sa place (data-allow-empty), et chaque élément mobile a ses images clés et son moment', { skip: SKIP }, async () => {
  // Le thème cache tout élément vide (input.css, *:empty), sauf ceux qui portent data-allow-empty.
  const VOID = new Set(['img', 'path'])
  // Les deux places des couleurs (ticket 21) restent vides, donc cachées, jusqu'à ce qu'il les remplisse.
  const LATER = ['galerie-scene-teintes', 'galerie-scene-palette']
  const css = sheet().filter((r) => !/^@keyframes /.test(r.head))
  // Le dernier maillon d'un sélecteur vaut-il pour cet élément ? Sa balise, ses classes ; le reste est ignoré.
  const applies = (selector, el) => {
    const last = selector.trim().split(/\s*[>+~]\s*|\s+/).pop().replace(/::?[\w-]+(\([^)]*\))?|\[[^\]]*\]/g, '')
    const tag = /^[a-z][\w-]*/.exec(last)
    const classes = [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1])
    if (!tag && !classes.length) return false
    return (!tag || tag[0] === el.tag) && classes.every((name) => el.classes.includes(name))
  }
  const declares = (el, name, accept = () => true) => css.some((r) => new RegExp(`(?:^|[;\\s])--${name}:\\s*([^;]+);`).test(r.body) && accept(value(r.body, name)) && r.head.split(',').some((selector) => applies(selector, el)))
  for (const poster of [false, true]) {
    const html = await render(product({ poster }))
    const empty = [...html.matchAll(/<([a-z][\w-]*)((?:\s+[^<>]*?)?)><\/\1>/g)].map((m) => ({ tag: m[1], attrs: m[2] }))
    assert.ok(empty.length >= 20, 'les murs, les sols, la lampe, les traits du repère…')
    for (const { tag, attrs } of empty) {
      if (LATER.some((name) => attrs.includes(`class="${name}`))) assert.doesNotMatch(attrs, /data-allow-empty/, attrs)
      else assert.match(attrs, / data-allow-empty/, `<${tag}${attrs}> : vide, il serait caché`)
    }
    const moving = tags(html).filter((t) => t.classes.includes('galerie-scene-a') && !VOID.has(t.tag))
    assert.ok(moving.length >= 35, 'tout ce qui bouge')
    for (const el of [...moving, ...tags(html).filter((t) => t.tag === 'img' && t.classes.includes('galerie-scene-a'))]) {
      const name = `<${el.tag} class="${el.classes.join(' ')}">`
      assert.ok(declares(el, 'n', (v) => v !== 'none'), `${name} : ses images clés (--n)`)
      assert.ok(declares(el, 'a'), `${name} : son début (--a)`)
      assert.ok(declares(el, 'b'), `${name} : sa fin (--b)`)
    }
  }
})

test('rendu : la place des couleurs du temps 2 (ticket 21), vide, entre l’œuvre et son cache de nuit, et à côté de l’œuvre', { skip: SKIP }, async () => {
  const html = await render()
  // Dans l'œuvre : l'image, puis la place des teintes, puis le cache de la nuit, la copie avivée, le reflet, la trame.
  assert.match(html, /<div class="galerie-scene-oeuvre galerie-scene-a"><img class="galerie-scene-image" [^>]*><div class="galerie-scene-teintes"><\/div><i class="galerie-scene-cache galerie-scene-a" data-allow-empty><\/i><img class="galerie-scene-vive galerie-scene-a" [^>]*><i class="galerie-scene-reflet galerie-scene-a" data-allow-empty><\/i><div class="galerie-scene-trame galerie-scene-a" data-allow-empty><\/div><\/div>/)
  // À côté de l'œuvre, dans sa colonne : la place des pastilles, qui s'efface à la fin du temps 2.
  assert.match(html, /<div class="galerie-scene-palette galerie-scene-a" aria-hidden="true"><\/div><\/div><\/div><div class="galerie-scene-invite galerie-scene-public"/)
  const palette = body('.galerie-scene-palette')
  assert.deepEqual([value(palette, 'a'), value(palette, 'b'), value(palette, 'n')], ['1.9', '2.02', 'galerie-scene-efface'])
  assert.match(palette, /^position: absolute; z-index: 2; left: 0; right: 0; top: calc\(100% \+ 4\.4svh\); display: flex; justify-content: center; gap: 20px; pointer-events: none;/)
  assert.equal(body('.galerie-scene-palette', LARGE), 'left: calc(50% + var(--oh) * var(--ratio) / 2 + 3vw); right: auto; top: 50%; margin-top: -120px; flex-direction: column; gap: 22px;')
})

test('rendu : dans chaque langue, ses textes, toile et poster, sans un mot de français', { skip: SKIP }, async () => {
  const EXPECTED = {
    en: { label: 'The artwork in four moments: first glance, the colours, the light, the material', h2: 'Lit like a museum piece.', canvas: 'the canvas', poster: 'the poster', quote: 'Leave it on.' },
    de: { label: 'Das Werk in vier Momenten: der Blick, die Farben, das Licht, das Material', h2: 'Beleuchtet wie im Museum.', canvas: 'Das Wandbild', poster: 'Das Poster', quote: 'Lassen Sie es an.' },
    es: { label: 'La obra en cuatro tiempos: la mirada, los colores, la luz, la materia', h2: 'Iluminado como en un museo.', canvas: 'el cuadro', poster: 'el póster', quote: 'Déjala encendida.' },
    nl: { label: 'Het kunstwerk in vier momenten: de blik, de kleuren, het licht, het materiaal', h2: 'Verlicht zoals in het museum.', canvas: 'het schilderij', poster: 'de poster', quote: 'Laat maar aan.' },
  }
  for (const [lang, expected] of Object.entries(EXPECTED)) {
    for (const poster of [false, true]) {
      const html = await render(product({ poster }), { lang })
      assert.match(html, new RegExp(`aria-label="${expected.label}"`), lang)
      const parts = chapters(html)
      assert.equal(text(/<h2>[\s\S]*?<\/h2>/.exec(parts[2].html)[0]), expected.h2, lang)
      assert.match(parts[2].html, new RegExp(expected[poster ? 'poster' : 'canvas']), lang)
      assert.doesNotMatch(parts[2].html, new RegExp(expected[poster ? 'canvas' : 'poster']), lang)
      assert.match(html, new RegExp(`<p class="galerie-scene-mot galerie-scene-a">${expected.quote}</p>`), lang)
      // Tous les textes de la langue sont dans la page, sauf ceux de l'autre support.
      const page = text(html) + ' ' + [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]).join(' ')
      for (const [key, value] of Object.entries(texts(lang))) {
        const other = poster ? /_canvas(_html)?$/ : /_poster(_html)?$/
        if (other.test(key)) continue
        assert.ok(page.includes(text(value)), `${lang}.${key} : « ${value} »`)
      }
      assert.doesNotMatch(page, /Le regard|Les couleurs|La lumière|La matière|sans s’arrêter|agit sur vous|comme au musée|Laissez allumé|Lampe allumée|quatre temps/, lang)
    }
  }
})

test('rendu : hors d’une fiche d’œuvre, ou sans image à plat, la section ne rend rien', { skip: SKIP }, async () => {
  // Un produit sans image.
  assert.equal(await render(product({ files: [] })), '')
  // Un autre modèle de page (un produit personnalisé, la carte cadeau…) : pas une fiche d'œuvre.
  for (const suffix of ['personalized', 'tapestry', null]) assert.equal(await render(product(), { suffix }), '', String(suffix))
  // Les fiches d'œuvre de toujours, si la section y était posée : leur image à plat, leur support.
  assert.match(await render(product({ suffix: 'painting', files: OLD }), { suffix: 'painting' }), /^<galerie-scene [^>]*data-support="toile"/)
  assert.match(await render(product({ suffix: 'poster', poster: true, files: OLD }), { suffix: 'poster' }), /^<galerie-scene [^>]*data-support="poster"/)
})
