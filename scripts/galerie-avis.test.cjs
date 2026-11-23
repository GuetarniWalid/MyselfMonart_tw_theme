// La page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie, ticket 23) : les avis, « Vous aimerez aussi »
// et les questions fréquentes. Trois sections, une par bloc de la maquette : sections/galerie-avis.liquid,
// sections/galerie-recos.liquid et sections/galerie-questions.liquid. Elles reprennent les éléments du thème
// (rangée qui glisse, recommandations de Shopify, carte de produit, volets) et le contenu de la fiche 3D
// d'aujourd'hui (templates/product.oeuvre-3d.json) : mêmes photos et mots de clients, mêmes œuvres proposées,
// mêmes questions pour une toile ; un poster a ses réponses.
// Ici, les contrats du code ; puis le rendu Liquid (liquidjs), quand le module est là : sans lui, ces tests-là
// sont sautés et le reste passe. Le banc les lance avec NODE_PATH vers un node_modules qui a liquidjs.
// Lancer : node --test scripts/galerie-avis.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const {
  ROOT, read, exists, code, json, schemaOf, LANGS, rules,
  SKIP, locales, engine, image, FLAT, OLD, product, globals, ldOf,
} = require('./galerie-banc.cjs')

const AVIS = 'sections/galerie-avis.liquid'
const CARTE = 'snippets/galerie-avis-carte.liquid'
const RECOS = 'sections/galerie-recos.liquid'
const QUESTIONS = 'sections/galerie-questions.liquid'
// Les quatre fichiers Liquid du ticket.
const PIECES = [AVIS, CARTE, RECOS, QUESTIONS]
const CSS = 'assets/oeuvre-galerie.css'
const JS = 'assets/oeuvre-galerie.js'
// Le modèle en page galerie : la fiche 3D depuis la bascule du 21/11/2026 (avant : le modèle caché product.oeuvre-galerie).
const MODEL = 'templates/product.oeuvre-3d.json'
// La fiche 3D d'avant la bascule, figée dans le banc (scripts/galerie-banc.cjs).
const TODAY = 'scripts/fixtures/product.oeuvre-3d.avant-galerie.json'
const BLOCK = 'Avis, recommandations, questions (ticket 23)'

// Les sections de la fiche 3D d'aujourd'hui que ce ticket remplace, par leur nom dans son modèle.
const TODAY_AVIS = 'customer_testimonial_myiwee'
const TODAY_RECOS = 'product_recommendations_TX9rdQ'
const TODAY_QUESTIONS = '7ae13aad-330c-4fa7-94cf-fafc1c13cf60'

// Le balisage sans les blancs entre deux balises (ils ne comptent pas : grilles et rangées), et une seule espace
// là où une balise ou un texte en a plusieurs (attributs écrits sur plusieurs lignes). Une espace insécable
// reste ce qu'elle est : elle compte.
const NBSP = ' '
const tight = (html) => html.replace(/>[ \t\r\n]+</g, '><').replace(/[ \t\r\n]+/g, ' ').trim()
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim()
const count = (html, pattern) => (html.match(pattern) || []).length

/* ---------- Le rendu d'une section (liquidjs) ----------
   Comme renderSectionFile du banc, avec ce que ces sections lisent en plus : le nombre d'avis du réglage du thème
   (count), l'adresse des recommandations de Shopify, et l'objet recommendations (extra). */
const parsed = new Map()
function render(file, section = {}, p = product(), { lang = 'fr', score = 42, reviews = 86, extra = {} } = {}) {
  const e = engine(lang)
  const key = `${lang} ${file}`
  if (!parsed.has(key)) {
    const source = read(file)
    const end = source.indexOf('{% schema %}')
    parsed.set(key, e.parse(end < 0 ? source : source.slice(0, end)))
  }
  const base = globals(p, { lang, score, section: { id: 'template--1__' + path.basename(file, '.liquid'), settings: {}, blocks: [], ...section } })
  return e.render(parsed.get(key), {}, {
    globals: {
      ...base,
      settings: { ...base.settings, trustpilot_review_count_global: reviews },
      routes: { ...base.routes, product_recommendations_url: '/recommendations/products' },
      ...extra,
    },
  })
}

// Les blocs d'une section d'un modèle, tels que Shopify les donne : dans l'ordre, sans ceux qui sont éteints. Une
// image choisie dans l'éditeur (« shopify://shop_images/… ») arrive en objet image.
function blocksOf(file, name) {
  const section = json(file).sections[name]
  return (section.block_order || []).filter((id) => !section.blocks[id].disabled).map((id, i) => {
    const settings = { ...section.blocks[id].settings }
    if (typeof settings.image === 'string' && settings.image) settings.image = image(100 + i, settings.image.split('/').pop(), 1200, 1600)
    return { id, type: section.blocks[id].type, settings }
  })
}
const sectionOf = (file, name) => ({ settings: json(file).sections[name].settings || {}, blocks: blocksOf(file, name) })

/* ---------- La feuille : le bloc du ticket ---------- */

function blockOf(file) {
  const source = read(file)
  const start = source.indexOf(`/* === ${BLOCK} : début ===`)
  const end = source.indexOf(`/* === ${BLOCK} : fin === */`)
  assert.ok(start >= 0 && end > start, `${file} : le bloc « ${BLOCK} », entre ses deux repères`)
  return source.slice(start, end)
}
const sheet = () => rules(blockOf(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))
const LARGE = '@media (min-width: 900px)'
const MOTION = '@media (prefers-reduced-motion: no-preference)'
const LINKED = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
// Le corps d'une règle du bloc, sur une ligne : body, la règle de ce seul sélecteur ; shared, celle qu'il
// partage avec d'autres (une liste de sélecteurs).
function ruleOf(head, context, list) {
  const here = sheet().filter((r) => r.context.join() === context)
  const found = list ? here.find((r) => r.head.includes(',') && r.head.split(',').map((s) => s.trim()).includes(head)) : here.find((r) => r.head === head)
  assert.ok(found, `règle « ${head} »${list ? ', partagée' : ''}${context ? ` dans ${context}` : ''}`)
  return found.body.replace(/\s+/g, ' ').trim()
}
const body = (head, context = '') => ruleOf(head, context, false)
const shared = (head, context = '') => ruleOf(head, context, true)

// Le bloc du ticket est complet, entre ses deux repères. D'autres sections de la page ajoutent leur bloc après lui :
// l'ordre des blocs n'importe pas (scripts/oeuvre-galerie.test.cjs vérifie qu'aucun code n'est hors d'un bloc).
const completeBlock = (file) => {
  const source = read(file)
  const start = source.indexOf(`/* === ${BLOCK} : début ===`)
  const end = source.indexOf(`/* === ${BLOCK} : fin === */`)
  assert.ok(start >= 0 && end > start, `${file} : le bloc du ticket, entre ses deux repères`)
}

test('la feuille : le bloc du ticket est complet, et ne redéfinit rien de la présentation', () => {
  completeBlock(CSS)
  // .galerie-avis et .galerie-avis-texte sont la note de la présentation (ticket 19) : la section des avis a ses
  // propres noms, et aucune règle du bloc ne touche à une classe du socle.
  const taken = ['.galerie', '.galerie-bande', '.galerie-monte', '.galerie-mot', '.galerie-surtitre', '.galerie-avis', '.galerie-avis-texte', '.galerie-titre', '.galerie-court', '.galerie-intro', '.galerie-fiche', '.galerie-etoiles', '.galerie-aime']
  for (const { head } of sheet()) {
    for (const selector of head.split(',')) {
      for (const name of taken) assert.doesNotMatch(selector, new RegExp(`\\${name}(?![\\w-])`), `« ${selector.trim()} » touche à ${name}, du socle`)
    }
  }
  for (const file of PIECES) assert.doesNotMatch(code(file), /class="[^"]*\bgalerie-avis(-texte)?(?![\w-])/, `${file} : .galerie-avis est la note de la présentation`)
})

test('la feuille : les avis ont les mesures de la maquette', () => {
  assert.equal(body('.galerie-avis-clients'), 'background: var(--soleil); padding-block: 64px 0; overflow: hidden; overflow: clip;')
  assert.equal(body('.galerie-avis-clients', LARGE), 'padding-top: 104px;')
  assert.equal(body('.galerie-avis-tete'), 'max-width: 1240px; margin-inline: auto;')
  // Le grand titre des trois sections : maigre, un mot en gras, de 38 à 64 px ; de 56 à 96 px sur ordinateur.
  assert.equal(shared('.galerie-avis-titre'), 'margin: 14px 0 0; font: 300 clamp(38px, 10.8vw, 64px)/0.98 var(--sans); letter-spacing: -0.042em; text-wrap: balance;')
  assert.equal(shared('.galerie-avis-titre b'), 'font-weight: 700;')
  assert.equal(shared('.galerie-avis-titre', LARGE), 'font-size: clamp(56px, 5.6vw, 96px); line-height: 0.96;')
  for (const name of ['recos', 'questions']) {
    assert.equal(shared(`.galerie-${name}-titre`), shared('.galerie-avis-titre'))
    assert.equal(shared(`.galerie-${name}-titre b`), shared('.galerie-avis-titre b'))
    assert.equal(shared(`.galerie-${name}-titre`, LARGE), shared('.galerie-avis-titre', LARGE))
  }
  assert.equal(body('.galerie-avis-chapo'), 'margin: 16px 0 20px; max-width: 30em; font: 400 15.5px/1.5 var(--sans); color: var(--encre-70);')
  // Le bouton à l'encre des trois sections.
  assert.equal(shared('.galerie-avis-bouton'), 'display: inline-flex; align-items: center; gap: 8px; padding: 14px 20px; border-radius: 999px; background: var(--encre); color: var(--blanc); font: 600 14px/1 var(--sans); text-decoration: none;')
  for (const name of ['recos', 'questions']) assert.equal(shared(`.galerie-${name}-bouton`), shared('.galerie-avis-bouton'))
  // La rangée : plus large que l'écran des deux côtés, pour glisser sans montrer ses bords.
  assert.match(body('.galerie-avis-rangee'), /^display: flex; gap: 14px; width: calc\(100% \+ 30vw\); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: calc\(var\(--gout\) \+ 14vw\) 0; margin: 34px 0 0 -14vw; padding: 0 calc\(var\(--goutd\) \+ 16vw\) 6px calc\(var\(--gout\) \+ 14vw\); list-style: none; scrollbar-width: none;/)
  assert.equal(body('.galerie-avis-rangee', LARGE), 'gap: 22px; margin-top: 54px;')
  assert.equal(body('.galerie-avis-carte'), 'flex: 0 0 min(66vw, 280px); scroll-snap-align: start;')
  assert.equal(body('.galerie-avis-carte', LARGE), 'flex-basis: 300px;')
  assert.equal(body('.galerie-avis-carte img'), 'width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 20px;')
  assert.equal(body('.galerie-avis-carte blockquote'), 'margin: 14px 0 0; font: 500 16px/1.36 var(--sans); letter-spacing: -0.012em;')
  assert.equal(body('.galerie-avis-carte cite'), 'display: block; margin-top: 8px; font: 600 13px/1 var(--sans); font-style: normal; color: var(--encre-70);')
  assert.equal(body('.galerie-avis-pied'), 'max-width: 1240px; margin: 26px auto 0; display: flex; justify-content: center;')
  assert.equal(body('.galerie-avis-pied', LARGE), 'justify-content: flex-end; margin-top: 40px; padding-right: 4vw;')
  assert.equal(body('.galerie-avis-anges'), 'width: min(74vw, 380px); height: auto;')
  assert.equal(body('.galerie-avis-anges', LARGE), 'width: 420px;')
})

test('la feuille : « Vous aimerez aussi » a les mesures de la maquette', () => {
  // La largeur d'une carte, posée une fois : les cartes et la place gardée la suivent.
  assert.equal(body('.galerie-recos'), '--galerie-recos-carte: min(58vw, 250px); background: var(--blanc); padding-block: 22px 60px;')
  assert.equal(body('.galerie-recos', LARGE), '--galerie-recos-carte: 270px; padding-block: 32px 96px;')
  assert.equal(body('.galerie-recos-tete'), 'position: relative; max-width: 1240px; margin-inline: auto; background: var(--rose); border-radius: 28px; padding: 26px 22px 0; overflow: hidden; overflow: clip; display: grid;')
  assert.equal(body('.galerie-recos-tete', LARGE), 'padding: 54px 56px 0;')
  // Sur ordinateur, le titre tient en deux lignes à gauche du personnage.
  assert.equal(body('.galerie-recos-titre', LARGE), 'max-width: 11em;')
  assert.equal(body('.galerie-recos-bas'), 'display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 10px;')
  assert.equal(body('.galerie-recos-bas', LARGE), 'margin-top: -30px;')
  assert.equal(body('.galerie-recos-bouton'), 'margin-bottom: 24px;')
  assert.equal(body('.galerie-recos-bouton', LARGE), 'margin-bottom: 54px;')
  // Le personnage et l'étoile de sa perle. Sans bouton (pas de collection mère), il reste à droite.
  assert.equal(body('.galerie-recos-perle'), 'position: relative; height: clamp(150px, 44vw, 250px); aspect-ratio: 507 / 810; flex: none; margin: 0 -4px 0 auto;')
  assert.equal(body('.galerie-recos-perle', LARGE), 'height: 330px; margin-right: 3vw;')
  assert.equal(body('.galerie-recos-perle img'), 'height: 100%; width: auto;')
  assert.equal(body('.galerie-recos-eclat'), 'position: absolute; left: 49.7%; top: 48.4%; width: 24%; margin: -12% 0 0 -12%; overflow: visible; fill: var(--blanc); filter: drop-shadow(0 0 3px var(--blanc));')
  // La rangée et ses cartes.
  assert.equal(body('.galerie-recos-rangee'), 'display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--gout); margin: 22px 0 0; padding: 0 var(--goutd) 10px var(--gout); list-style: none; scrollbar-width: none;')
  assert.equal(body('.galerie-recos-rangee', LARGE), 'gap: 22px; margin-top: 30px;')
  assert.match(body('.galerie-recos-carte'), /flex: 0 0 var\(--galerie-recos-carte\);.*scroll-snap-align: start;/)
  assert.ok(!sheet().some((r) => r.head === '.galerie-recos-carte' && r.context.length), 'sa largeur ne se règle qu’une fois, par la variable')
  // Le nom et le prix de la carte du thème, dans la typo de la page.
  assert.equal(body('.galerie-recos-carte .product-card-title'), 'font: 600 16px/1.2 var(--sans); letter-spacing: -0.012em;')
  assert.equal(body('.galerie-recos-carte h3 + p'), 'margin: 4px 0 0; font: 500 14px/1 var(--sans); color: var(--encre-70); font-variant-numeric: tabular-nums;')
})

test('la feuille : les tuiles pastel de la maquette, sur la vignette d’œuvre du thème', () => {
  // Six aplats, à la suite, comme dans la maquette.
  assert.match(body('.galerie-recos-carte'), /--tuile: var\(--ciel\);/)
  for (const [n, color] of [['6n + 2', 'soleil'], ['6n + 3', 'menthe'], ['6n + 4', 'lilas'], ['6n + 5', 'peche'], ['6n', 'poudre']]) {
    assert.equal(body(`.galerie-recos-carte:nth-child(${n})`), `--tuile: var(--${color});`)
  }
  // La scène de la vignette (snippets/artwork-object.liquid, input.css « Vignette d'œuvre ») devient la tuile :
  // son mur prend l'aplat, à 4 / 5, coins arrondis. Plus précis que les règles du thème, toile ou poster.
  const stage = sheet().find((r) => /\.oeuvre-card-stage$/.test(r.head))
  assert.ok(stage, 'la règle de la scène')
  assert.equal(stage.head, '.galerie-recos-carte .oeuvre-card[data-kind] .oeuvre-card-stage')
  assert.equal(stage.body.replace(/\s+/g, ' ').trim(), 'aspect-ratio: 4 / 5; border-radius: 22px; background: var(--tuile);')
  const input = read('input.css')
  assert.match(input, /\.oeuvre-card\[data-kind="poster"\] \.oeuvre-card-stage { aspect-ratio: 1; background: var\(--wall-poster\); }/)
  // Un produit de toujours : sa photo dans une tuile au même format, coins arrondis. La carte écrit le format de la
  // photo en style : seul !important le remplace. La photo remplit la tuile ; le décalage que la carte lui donne
  // dans une collection (translate-x-1) laisserait un liseré, il est retiré une fois l'image chargée.
  assert.equal(body('.galerie-recos-carte [style*="aspect-ratio"]'), 'aspect-ratio: 4 / 5 !important; border-radius: 22px;')
  assert.equal(body('.galerie-recos-carte [style*="aspect-ratio"] img'), 'object-fit: cover;')
  assert.equal(body('.galerie-recos-carte [style*="aspect-ratio"]:not(.skeleton) img'), 'transform: none;')
  assert.match(code('snippets/card-product.liquid'), /<div class="skeleton overflow-hidden relative w-full duration-100" style="aspect-ratio: {{ primary_image\.width }} \/ {{ primary_image\.height }}">/)
  assert.match(code('snippets/card-product.liquid'), /class="lqip w-full h-full object-contain translate-x-1"/)
  // Le nom de la carte : la classe que la feuille vise est bien celle de la carte.
  assert.match(code('snippets/card-product-info.liquid'), /class="product-card-title /)
})

test('la feuille : les questions ont les mesures de la maquette', () => {
  assert.equal(body('.galerie-questions'), 'background: var(--creme); padding-block: 64px 70px;')
  assert.equal(body('.galerie-questions', LARGE), 'padding-block: 104px 110px;')
  assert.equal(body('.galerie-questions-in'), 'max-width: 1240px; margin-inline: auto; display: grid; gap: 26px;')
  assert.equal(body('.galerie-questions-in', LARGE), 'grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); grid-template-rows: auto 1fr; gap: 40px 90px; align-items: start;')
  assert.equal(body('.galerie-questions-volets', LARGE), 'grid-column: 2; grid-row: 1 / 3;')
  assert.equal(body('.galerie-questions-aide', LARGE), 'grid-column: 1; grid-row: 2;')
  // Un volet : sa question, son rond à « + », sa réponse.
  assert.match(body('.galerie-questions-volets'), /border-top: 1px solid var\(--encre-12\);/)
  assert.equal(body('.galerie-questions-volet'), 'border-bottom: 1px solid var(--encre-12);')
  assert.match(body('.galerie-questions-volet summary'), /^display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 17px; font: 500 17px\/1\.28 var\(--sans\); letter-spacing: -0\.012em;/)
  assert.equal(body('.galerie-questions-plus'), 'flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--blanc); position: relative;')
  assert.equal(shared('.galerie-questions-plus::before'), 'content: ""; position: absolute; left: 50%; top: 50%; width: 11px; height: 1.6px; margin: -0.8px 0 0 -5.5px; background: currentColor; border-radius: 2px;')
  assert.equal(body('.galerie-questions-plus::after'), 'transform: rotate(90deg);')
  assert.equal(body('.galerie-questions-volet[open] .galerie-questions-plus'), 'background: var(--encre); color: var(--blanc); transform: rotate(45deg);')
  assert.match(body('.galerie-questions-reponse'), /^padding-bottom: 18px; max-width: 38em; font: 400 15px\/1\.6 var\(--sans\); color: var\(--encre-70\);/)
  assert.equal(shared('.galerie-questions-reponse p'), 'margin: 0 0 0.9em;')
  // La carte « Une autre question ? ».
  assert.equal(body('.galerie-questions-carte'), 'position: relative; background: var(--ciel); border-radius: 28px; padding: 24px 22px 0; overflow: hidden; overflow: clip;')
  assert.equal(body('.galerie-questions-carte', LARGE), 'padding: 34px 34px 0;')
  assert.equal(body('.galerie-questions-carte-titre'), 'margin: 0; font: 300 30px/1 var(--sans); letter-spacing: -0.04em;')
  assert.equal(body('.galerie-questions-carte-titre', LARGE), 'font-size: 40px;')
  assert.equal(body('.galerie-questions-carte-texte'), 'margin: 10px 0 16px; font: 400 15px/1.5 var(--sans); color: var(--encre-70); max-width: 20em;')
  assert.equal(body('.galerie-questions-bas'), 'display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; margin-top: 4px;')
  assert.equal(body('.galerie-questions-ecoute'), 'position: relative; height: clamp(170px, 50vw, 270px); aspect-ratio: 572 / 810; flex: none;')
  assert.equal(body('.galerie-questions-ecoute', LARGE), 'height: 300px;')
  assert.equal(body('.galerie-questions-bulle'), 'position: relative; margin: 0 0 clamp(96px, 29vw, 150px); padding: 11px 15px; border-radius: 18px 18px 4px 18px; background: var(--blanc); font: 600 15px/1.25 var(--sans); letter-spacing: -0.012em; white-space: nowrap; box-shadow: 0 8px 18px var(--encre-12);')
  assert.equal(body('.galerie-questions-bulle', LARGE), 'font-size: 17px; margin-bottom: 170px;')
  // Le casque : ses couleurs sont celles de la page, pas des attributs du dessin.
  assert.match(body('.galerie-questions-casque'), /fill: var\(--encre\);/)
  assert.equal(body('.galerie-questions-arceau'), 'fill: none; stroke: var(--corail); stroke-width: 13; stroke-linecap: round;')
  assert.equal(body('.galerie-questions-tige'), 'fill: none; stroke: var(--encre); stroke-width: 6; stroke-linecap: round;')
})

test('la feuille : le mouvement de la maquette, là où le navigateur le lie au défilement', () => {
  const both = `${MOTION},${LINKED}`
  // Les trois personnages sortent du bas de leur bloc ; la rangée d'avis glisse avec la page.
  assert.equal(shared('.galerie-avis-anges', both), 'animation: galerie-avis-surgit linear both; animation-timeline: view(); animation-range: cover 0% cover 40%;')
  assert.equal(shared('.galerie-recos-perle', both), shared('.galerie-avis-anges', both))
  assert.equal(shared('.galerie-questions-ecoute', both), shared('.galerie-avis-anges', both))
  assert.equal(body('.galerie-avis-rangee', both), 'animation: galerie-avis-derive linear both; animation-timeline: view(); animation-range: cover 0% cover 100%;')
  // L'étoile de la perle scintille, la bulle hoche : en boucle, sans suivre le défilement.
  assert.equal(body('.galerie-recos-eclat', both), 'animation: galerie-recos-scintille 1.7s ease-in-out infinite alternate;')
  assert.equal(body('.galerie-questions-bulle', both), 'animation: galerie-questions-hoche 2.2s ease-in-out infinite alternate;')
  assert.equal(body('.galerie-questions-plus', both), 'transition: background-color 0.25s ease, color 0.25s ease, transform 0.35s ease;')
  const frames = Object.fromEntries(sheet().filter((r) => /^@keyframes /.test(r.head)).map((r) => [r.head.slice(11), r.body.replace(/\s+/g, ' ').trim()]))
  assert.deepEqual(Object.keys(frames).sort(), ['galerie-avis-derive', 'galerie-avis-surgit', 'galerie-questions-hoche', 'galerie-recos-scintille'])
  assert.match(frames['galerie-avis-surgit'], /from { [^}]*transform: translateY\(62%\); } to { [^}]*transform: none; }/)
  assert.match(frames['galerie-avis-derive'], /from { [^}]*transform: translateX\(8vw\); } to { [^}]*transform: translateX\(-5vw\); }/)
  assert.equal(frames['galerie-recos-scintille'], 'from { opacity: 0.5; transform: scale(0.35) rotate(0deg); } to { opacity: 1; transform: scale(1) rotate(45deg); }')
  assert.match(frames['galerie-questions-hoche'], /from { [^}]*transform: translateY\(0\) rotate\(-1\.5deg\); } to { [^}]*transform: translateY\(-5px\) rotate\(1\.5deg\); }/)
  // La rangée avance en douceur quand la rangée du thème la fait glisser, sauf en « mouvements réduits ».
  assert.equal(body('.galerie-avis-rangee', MOTION), 'scroll-behavior: smooth;')
  assert.equal(body('.galerie-recos-rangee', MOTION), 'scroll-behavior: smooth;')
})

/* ---------- Le script ---------- */

/* Une page réduite à ce que le script de la page touche : le registre des éléments personnalisés, un
   observateur de mutations (qu'on déclenche à la main), et le dé-floutage des images du thème
   (window.removeSkeletonOnImagesLoad, assets/tw-global.js). */
function page({ unveil = true } = {}) {
  const defined = new Map()
  const observers = []
  const unveiled = []
  class HTMLElement {}
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.target = null; observers.push(this) }
    observe(target, options) { this.target = target; this.options = options }
    disconnect() { this.target = null }
  }
  const win = {
    customElements: { get: (name) => defined.get(name), define: (name, element) => { assert.ok(!defined.has(name), `${name} défini deux fois`); defined.set(name, element) } },
    HTMLElement, MutationObserver,
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    matchMedia: () => ({ matches: false }),
    CSS: { supports: () => false },
    document: { querySelector: () => null, head: { append() {} }, addEventListener() {} },
  }
  if (unveil) win.removeSkeletonOnImagesLoad = (container) => unveiled.push(container)
  win.window = win
  const run = () => vm.runInNewContext(read(JS), win, { filename: JS })
  run()
  return { defined, observers, unveiled, run }
}

test('le script : le bloc du ticket est complet, et ne pose rien de global', () => {
  completeBlock(JS)
  const js = blockOf(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  assert.match(js, /^\s*\(function \(\) {\s*'use strict';/)
  // Sous Node (les tests du socle chargent le fichier), le bloc s'arrête avant de toucher au navigateur.
  assert.match(js, /if \(typeof window === 'undefined'\) return;\s*if \(customElements\.get\('galerie-recos'\)\) return;/)
  assert.doesNotMatch(js, /window\.\w+ = |DOMContentLoaded|addEventListener\('load'|readyState/)
  assert.doesNotThrow(() => require('../assets/oeuvre-galerie.js'))
})

test('le script : <galerie-recos> dé-floute les cartes que les recommandations de Shopify déposent en lui', () => {
  const { defined, observers, unveiled, run } = page()
  const Recos = defined.get('galerie-recos')
  assert.ok(Recos, 'élément galerie-recos')
  const recos = new Recos()
  recos.connectedCallback()
  // Il guette ses propres enfants : assets/product-recommendations.js remplace son contenu.
  assert.equal(observers.length, 1)
  assert.equal(observers[0].target, recos)
  assert.deepEqual({ ...observers[0].options }, { childList: true })
  assert.deepEqual(unveiled, [], 'rien à dé-flouter avant l’arrivée des cartes')
  observers[0].callback([{ type: 'childList' }])
  assert.deepEqual(unveiled, [recos])
  // À son départ (bascule Toile / Poster), il ne guette plus rien ; revenu, il guette de nouveau.
  recos.disconnectedCallback()
  assert.equal(observers[0].target, null)
  recos.disconnectedCallback()
  recos.connectedCallback()
  assert.equal(observers.length, 2)
  assert.equal(observers[1].target, recos)
  // Le fichier chargé une seconde fois ne redéfinit rien.
  assert.doesNotThrow(run)
  assert.equal(defined.get('galerie-recos'), Recos)
})

test('le script : sans le dé-floutage du thème, <galerie-recos> ne casse rien', () => {
  const { defined, observers } = page({ unveil: false })
  const recos = new (defined.get('galerie-recos'))()
  recos.connectedCallback()
  assert.doesNotThrow(() => observers[0].callback([]))
})

/* ---------- Les images des personnages ---------- */

// La taille d'un fichier WebP, lue dans son en-tête (VP8X, VP8L ou VP8).
function webpSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file))
  assert.equal(b.toString('ascii', 0, 4) + b.toString('ascii', 8, 12), 'RIFFWEBP', `${file} : un fichier WebP`)
  const kind = b.toString('ascii', 12, 16)
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)] }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
}

test('les trois personnages : des fichiers aux noms neutres, aux tailles que le balisage annonce', () => {
  const FILES = { 'galerie-anges.webp': [865, 330, AVIS], 'galerie-perle.webp': [507, 810, RECOS], 'galerie-ecoute.webp': [572, 810, QUESTIONS] }
  for (const [name, [width, height, file]] of Object.entries(FILES)) {
    assert.ok(exists(`assets/${name}`), `assets/${name}`)
    assert.deepEqual(webpSize(`assets/${name}`), [width, height], name)
    assert.ok(fs.statSync(path.join(ROOT, 'assets', name)).size < 70000, `${name} : moins de 70 Ko`)
    // Décor : sans texte alternatif, en différé, avec ses dimensions.
    const tag = new RegExp(`<img(?:\\s+class="[\\w-]+")?\\s+src="{{ '${name.replace('.', '\\.')}' \\| asset_url }}"\\s+width="${width}"\\s+height="${height}"\\s+alt=""\\s+loading="lazy"\\s+decoding="async">`)
    assert.match(code(file), tag, `${file} : ${name}`)
  }
  // Aucun tableau ancien ni auteur n'est nommé : fichiers, classes, commentaires, clés et textes.
  const NAMES = /\b(joconde|mona lisa|vinci|vermeer|rapha[eë]l|sixtine|madone|angelots?|ch[ée]rubins?|putti)\b|jeune fille|l[ée]onard de/i
  for (const file of [...PIECES, 'scripts/galerie-avis.test.cjs']) {
    const source = file.endsWith('.cjs') ? read(file).replace(/const NAMES = .*\n/, '') : read(file)
    assert.doesNotMatch(source, NAMES, file)
  }
  assert.doesNotMatch(blockOf(CSS), NAMES)
  assert.doesNotMatch(blockOf(JS), NAMES)
  for (const lang of Object.keys(LANGS)) assert.doesNotMatch(JSON.stringify(galerie(lang)), NAMES, lang)
})

/* ---------- Les textes ---------- */

function galerie(lang) {
  const { avis, recos, questions } = json(`locales/${LANGS[lang]}`).sections.mma.galerie
  return { avis, recos, questions }
}

test('textes : sous sections.mma.galerie.avis, .recos et .questions, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const fr = galerie('fr')
  // La phrase sous le titre des avis est celle de la section d'avis du thème : sa clé, pas une copie.
  assert.deepEqual(Object.keys(fr.avis).sort(), ['eyebrow', 'reviews', 'thousands', 'title_html', 'title_plain_html'])
  assert.match(code(AVIS), /{{ 'sections\.testimonials_carousel\.lead_default' \| t }}/)
  assert.deepEqual(Object.keys(fr.recos).sort(), ['button', 'eyebrow', 'title_canvas_html', 'title_poster_html'])
  assert.deepEqual(Object.keys(fr.questions).sort(), ['bubble', 'eyebrow', 'help_button', 'help_text', 'help_title_html', 'title_html'])
  // Les textes de la maquette.
  assert.equal(fr.avis.eyebrow, 'Avis clients')
  assert.equal(fr.avis.title_html, '+{{ total }} clients <b>aux anges</b>')
  assert.equal(fr.avis.reviews, '[[TP_COUNT]] retours vérifiés sur Trustpilot')
  assert.equal(fr.recos.eyebrow, 'Vous aimerez aussi')
  assert.equal(fr.recos.title_canvas_html, 'D’autres tableaux, d’autres <b>perles.</b>')
  assert.equal(fr.recos.title_poster_html, 'D’autres posters, d’autres <b>perles.</b>')
  assert.equal(fr.recos.button, 'Voir la collection')
  assert.equal(fr.questions.eyebrow, 'Vos questions')
  assert.equal(fr.questions.title_html, 'Questions <b>fréquentes</b>')
  assert.equal(fr.questions.help_title_html, `Une autre <b>question${NBSP}?</b>`)
  assert.equal(fr.questions.help_text, 'Une vraie personne vous répond 7 jours sur 7.')
  assert.equal(fr.questions.help_button, 'Nous écrire')
  assert.equal(fr.questions.bubble, `Allô, j’écoute${NBSP}!`)
  for (const lang of Object.keys(LANGS)) {
    const texts = galerie(lang)
    for (const name of ['avis', 'recos', 'questions']) {
      assert.deepEqual(Object.keys(texts[name]).sort(), Object.keys(fr[name]).sort(), `${lang}.${name}`)
      for (const [key, value] of Object.entries(texts[name])) {
        assert.equal(typeof value, 'string', `${lang}.${name}.${key}`)
        assert.ok(value.trim().length > 0, `${lang}.${name}.${key} : vide`)
        if (lang !== 'fr') assert.notEqual(value, fr[name][key], `${lang}.${name}.${key} : resté en français`)
        // Du balisage dans les seules clés « _html » (Shopify échappe les autres) : un mot en gras, rien d'autre.
        if (key.endsWith('_html')) assert.match(value, /^[^<]*<b>[^<]+<\/b>[^<]*$/, `${lang}.${name}.${key}`)
        else assert.doesNotMatch(value, /[<>]/, `${lang}.${name}.${key}`)
      }
    }
    // Le nombre de clients et le nombre d'avis ne s'écrivent jamais : un trou et un jeton.
    assert.match(texts.avis.title_html, /{{ total }}/, lang)
    assert.match(texts.avis.thousands, /^{{ thousands }}[^{]{1}{{ units }}$/, lang)
    assert.match(texts.avis.reviews, /\[\[TP_COUNT\]\]/, lang)
    for (const key of ['title_html', 'title_plain_html', 'thousands', 'reviews', 'eyebrow']) assert.doesNotMatch(texts.avis[key], /\d/, `${lang}.avis.${key} : un chiffre écrit`)
    // La bulle tient sur une ligne dans la carte d'un petit écran : pas plus longue que 18 signes.
    assert.ok(texts.questions.bubble.length <= 18, `${lang} : bulle « ${texts.questions.bubble} »`)
  }
  // Le séparateur des milliers de chaque langue.
  assert.deepEqual(Object.keys(LANGS).map((lang) => galerie(lang).avis.thousands.replace(/{{ \w+ }}/g, '')), [NBSP, ',', '.', '.', '.'])
})

/* ---------- Les schémas ---------- */

test('schémas : trois sections de fiche produit, une fois par page, qui ne se proposent pas ailleurs', () => {
  for (const [file, name] of [[AVIS, 'Galerie : avis clients'], [RECOS, 'Galerie : recommandations'], [QUESTIONS, 'Galerie : questions']]) {
    const schema = schemaOf(file)
    assert.equal(schema.name, name)
    assert.ok(schema.name.length <= 25, 'Shopify limite le nom d’une section à 25 caractères')
    assert.equal(schema.limit, 1)
    assert.deepEqual(schema.enabled_on, { templates: ['product'] })
    // Sans préréglage : la section ne s'ajoute pas depuis l'éditeur, où elle n'aurait pas la feuille de la page.
    assert.equal(schema.presets, undefined)
  }
})

test('schéma des avis : les blocs de la section d’avis du thème, et le nombre de clients en réglage', () => {
  const schema = schemaOf(AVIS)
  const theme = schemaOf('sections/testimonials-carousel.liquid')
  assert.equal(schema.max_blocks, theme.max_blocks)
  assert.deepEqual(schema.blocks.map((b) => b.type), ['image-text'])
  const settings = Object.fromEntries(schema.blocks[0].settings.map((s) => [s.id, s.type]))
  assert.deepEqual(settings, { image: 'image_picker', message: 'textarea' })
  // Les mêmes identifiants que le bloc du thème : ses blocs se reprennent tels quels.
  const themeSettings = Object.fromEntries(theme.blocks[0].settings.map((s) => [s.id, s.type]))
  for (const [id, type] of Object.entries(settings)) assert.equal(themeSettings[id], type, id)
  const own = Object.fromEntries(schema.settings.filter((s) => s.id).map((s) => [s.id, s]))
  assert.deepEqual(Object.keys(own).sort(), ['customers', 'trustpilot_link'])
  assert.equal(own.customers.type, 'number')
  // Aucun nombre par défaut : il vit dans le modèle, comme le titre de la section d'avis d'aujourd'hui.
  assert.equal(own.customers.default, undefined)
  assert.equal(own.trustpilot_link.type, 'url')
})

test('schéma des recommandations : le nombre d’œuvres proposées, comme la section du thème', () => {
  const own = schemaOf(RECOS).settings.filter((s) => s.id)
  assert.deepEqual(own.map((s) => [s.id, s.type]), [['number_products_to_display', 'number']])
  const theme = schemaOf('sections/product-recommendations.liquid').settings.find((s) => s.id === 'number_products_to_display')
  assert.equal(theme.type, 'number')
})

test('schéma des questions : les blocs de la section de questions du thème, plus le support', () => {
  const schema = schemaOf(QUESTIONS)
  assert.deepEqual(schema.blocks.map((b) => b.type), ['collapsible_row'])
  const settings = Object.fromEntries(schema.blocks[0].settings.map((s) => [s.id, s]))
  assert.deepEqual(Object.keys(settings).sort(), ['heading', 'row_content', 'support'])
  assert.equal(settings.heading.type, 'text')
  assert.equal(settings.row_content.type, 'richtext')
  assert.equal(settings.support.type, 'select')
  assert.equal(settings.support.default, 'tous')
  assert.deepEqual(settings.support.options.map((o) => o.value), ['tous', 'toile', 'poster'])
  assert.ok(schema.max_blocks >= 19 && schema.max_blocks <= 50, 'la place des questions d’aujourd’hui et de leurs versions poster')
  assert.deepEqual(schema.settings.filter((s) => s.id).map((s) => [s.id, s.type]), [['contact_link', 'url']])
})

/* ---------- Contrats du balisage ---------- */

test('aucun script en ligne, aucun style en ligne, aucun texte en dur', () => {
  for (const file of PIECES) {
    const source = code(file).replace(/{% schema %}[\s\S]*$/, '')
    // Après la bascule Toile / Poster, un script en ligne ne serait pas rejoué.
    assert.doesNotMatch(source, /<script(?![^>]*\bsrc=)/, file)
    assert.doesNotMatch(source, /<style|{% style|\sstyle="/, file)
    // Ni nom de modèle, ni titre : le h1 de la page est celui du bloc principal.
    assert.doesNotMatch(source, /oeuvre-galerie|oeuvre-3d(?!-)|<h1/, file)
    // Tout texte passe par les fichiers de langue ou par un réglage : hors balises et hors Liquid, il ne reste rien.
    const leftover = source.replace(/{%-?[\s\S]*?-?%}/g, '').replace(/{{-?[\s\S]*?-?}}/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, '')
    assert.equal(leftover, '', `${file} : du texte en dur`)
    assert.doesNotMatch(source, /(aria-label|alt|title)="[^"{]*\p{L}/u, `${file} : un libellé en dur`)
  }
})

test('un élément vide que la feuille dessine dit data-allow-empty : la feuille commune cache les autres', () => {
  // input.css : *:empty:not(…, [data-allow-empty]) { display: none; }. Sans l'attribut, le rond à « + » d'un volet
  // et la place gardée aux recommandations disparaîtraient.
  assert.match(read('input.css'), /^\*:empty:not\(\s*[\s\S]*?\[data-allow-empty\]\s*\) {\s*display: none;\s*}/m)
  const empty = []
  for (const file of PIECES) {
    const source = code(file).replace(/{% schema %}[\s\S]*$/, '')
    // Une balise aussitôt refermée, hors du dessin d'un <svg> (que la règle laisse en paix) et des scripts.
    for (const m of source.replace(/<svg[\s\S]*?<\/svg>/g, '').matchAll(/<(\w[\w-]*)([^<>]*)><\/\1>/g)) if (m[1] !== 'script') empty.push([file, m[1], m[2].trim()])
  }
  assert.deepEqual(empty.map(([, tag, attributes]) => `${tag} ${attributes}`).sort(), [
    'div class="galerie-recos-attente" data-allow-empty',
    'span class="galerie-questions-plus" aria-hidden="true" data-allow-empty',
    // Le repère « rien à proposer » : il n'a rien à montrer.
    'span hidden',
  ])
})

test('les classes : celles de la page, et celles que les éléments du thème demandent', () => {
  // carrousel-item : la rangée qui glisse (assets/component-carrousel.js) ; accordion : les volets
  // (assets/tw-global.js) ; product-recommendations : là où assets/product-recommendations.js dépose les œuvres ;
  // sr-only : un texte pour les lecteurs d'écran (feuille commune).
  const THEME = ['carrousel-item', 'accordion', 'product-recommendations', 'sr-only']
  const used = new Set()
  for (const file of PIECES) {
    for (const m of code(file).matchAll(/class="([^"]*)"/g)) for (const name of m[1].split(/\s+/).filter(Boolean)) used.add(name)
  }
  for (const name of used) assert.ok(THEME.includes(name) || /^galerie(-[a-z]+)+$/.test(name) || name === 'galerie', `classe « ${name} »`)
  for (const name of THEME) assert.ok(used.has(name), name)
  // Chaque classe de la page que le balisage emploie a sa règle dans la feuille (ou vient du socle), et l'inverse.
  const css = read(CSS)
  for (const name of used) if (!THEME.includes(name)) assert.match(css, new RegExp(`\\.${name}(?![\\w-])`), `.${name} : sans règle`)
  const mine = new Set([...blockOf(CSS).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(galerie-(?:avis|recos|questions)-[a-z-]+)/g)].map((m) => m[1]))
  for (const name of mine) assert.ok(used.has(name), `.${name} : une règle sans balisage`)
  // La feuille commune du site ne porte rien de ces sections.
  assert.doesNotMatch(read('input.css'), /galerie-/)
})

test('les éléments du thème sont repris tels quels, avec leurs scripts', () => {
  // La rangée qui glisse : un <ul> dans <snap-carrousel>, ses cartes en .carrousel-item.
  assert.match(read('assets/component-carrousel.js'), /this\.ul = this\.querySelector\('ul'\);\s*this\.liList = this\.ul\.querySelectorAll\('\.carrousel-item'\);/)
  for (const file of [AVIS, RECOS]) {
    assert.match(code(file), /<snap-carrousel[^>]*>\s*<ul class="galerie-(avis|recos)-rangee">/, file)
    assert.equal(count(code(file), /<script src="{{ 'component-carrousel\.js' \| asset_url }}" defer="defer"><\/script>/g), 1, file)
  }
  assert.match(code(CARTE), /<li class="carrousel-item galerie-avis-carte"/)
  assert.match(code(RECOS), /<li class="carrousel-item galerie-recos-carte">/)
  // Les recommandations : <product-recommendations data-url> remplace le contenu de son .product-recommendations.
  assert.match(read('assets/product-recommendations.js'), /this\.querySelector\('\.product-recommendations'\)\.innerHTML =\s*recommendations\.innerHTML;/)
  assert.equal(count(code(RECOS), /<script src="{{ 'product-recommendations\.js' \| asset_url }}" defer="defer"><\/script>/g), 1)
  // Les volets : <collapsible-tab> et ses <details class="accordion">, définis par le script commun, déjà chargé.
  assert.match(read('assets/tw-global.js'), /this\.accordions = this\.querySelectorAll\('\.accordion'\);/)
  assert.match(code(QUESTIONS), /<collapsible-tab class="galerie-questions-volets">/)
  assert.match(code(QUESTIONS), /<details class="accordion galerie-questions-volet"/)
  assert.doesNotMatch(code(QUESTIONS), /tw-global\.js/)
  // La carte de produit du thème, et ce qu'il lui faut : le cœur, et le reflet des vitres des posters, qu'un script
  // déposé avec les cartes ne lancerait pas.
  assert.match(code(RECOS), /{% render 'card-product'\s*, product: recommendation/)
  assert.equal(count(code(RECOS), /<script src="{{ 'my-like-button\.js' \| asset_url }}" defer="defer"><\/script>/g), 1)
  assert.equal(count(code(RECOS), /<script type="module" src="{{ 'oeuvre-card-reflet\.js' \| asset_url }}"><\/script>/g), 1)
  // Aucune des sections communes n'est retouchée par ce ticket : elles ne nomment pas la page.
  for (const file of ['sections/testimonials-carousel.liquid', 'sections/product-recommendations.liquid', 'sections/collapsible-content.liquid', 'snippets/card-product.liquid', 'snippets/card-product-info.liquid', 'snippets/customer-testimonial-card.liquid']) assert.doesNotMatch(read(file), /galerie/, file)
})

test('note Trustpilot : jamais un chiffre écrit, ni dans les sections, ni dans les textes', () => {
  // La règle du contrôle des traductions (scripts/i18n-lint.cjs), sur tout le fichier et non ses seules lignes
  // « Trustpilot », plus le nombre de clients du titre.
  const FIGURE = /\b[0-5][.,]\d\s*(?:\/|sur|out of|of|von|aus|de|sobre|van|op|uit)\s*5\b|\b\d{2,}\s*(?:avis|reviews?|Bewertungen|rese(?:ñ|n)as|opiniones|valoraciones|beoordelingen|recensies|retours|évaluations|evaluations|clients|customers|Kunden|clientes|klanten)\b/i
  for (const file of PIECES) assert.doesNotMatch(read(file), FIGURE, file)
  for (const lang of Object.keys(LANGS)) assert.doesNotMatch(JSON.stringify(galerie(lang)), FIGURE, lang)
  assert.match(code(AVIS), /render 'trustpilot-tokens', text: reviews_text/)
})

/* ---------- Rendu : les avis ---------- */

const reviewBlocks = (messages) => messages.map((message, i) => ({ id: `avis_${i}`, type: 'image-text', settings: { image: image(10 + i, `photo-${i}.jpg`, 1200, 1600), message } }))
const AVIS_SECTION = { settings: { customers: 1000, trustpilot_link: 'https://fr.trustpilot.com/review/myselfmonart.com' }, blocks: reviewBlocks(['Très beau tableau ! Je suis ravie de mon achat, merci. Léa M', 'Trop contente\nLes coulures sont trop belles. \nMarie L']) }
const titleOf = (html) => /<galerie-mots>([\s\S]*?)<\/galerie-mots>/.exec(html)[1]

test('rendu des avis : la bande, son titre, sa phrase, son bouton, la rangée, puis les deux personnages', { skip: SKIP }, async () => {
  const html = tight(await render(AVIS, AVIS_SECTION))
  const id = 'galerie-avis-titre-template--1__galerie-avis'
  assert.match(html, new RegExp(`^<section class="galerie galerie-avis-clients" aria-labelledby="${id}"><div class="galerie-bande"><div class="galerie-avis-tete">`))
  assert.match(html, /<p class="galerie-surtitre">Avis clients<\/p>/)
  // Le titre : un h2, ses mots arrivent un à un (élément du socle) ; le nombre et ses milliers d'un seul tenant.
  assert.match(html, new RegExp(`<h2 class="galerie-avis-titre" id="${id}"><galerie-mots>\\+1${NBSP}000 clients <b>aux anges</b></galerie-mots></h2>`))
  assert.match(html, /<p class="galerie-avis-chapo galerie-monte">Le meilleur portrait de notre travail, ce sont les photos que nos clients nous envoient une fois leur tableau accroché\.<\/p>/)
  assert.match(html, /<a class="galerie-avis-bouton galerie-monte" href="https:\/\/fr\.trustpilot\.com\/review\/myselfmonart\.com" target="_blank" rel="noopener">86 retours vérifiés sur Trustpilot<\/a>/)
  // La rangée du thème, nommée pour les lecteurs d'écran, comme la section d'avis d'aujourd'hui.
  assert.match(html, /<snap-carrousel class="galerie-avis-glisse" role="region" aria-label="Avis et photos de nos clients"><ul class="galerie-avis-rangee">(<li class="carrousel-item galerie-avis-carte">.*?<\/li>){2}<\/ul><\/snap-carrousel>/)
  assert.match(html, /<p class="sr-only">2 avis clients défilent horizontalement\. Utilisez les flèches du clavier pour naviguer\.<\/p>/)
  assert.match(html, /<script src="[^"]*\/component-carrousel\.js\?v=1" defer="defer"><\/script>/)
  assert.match(html, /<div class="galerie-bande"><div class="galerie-avis-pied"><img class="galerie-avis-anges" src="[^"]*\/galerie-anges\.webp\?v=1" width="865" height="330" alt="" loading="lazy" decoding="async"><\/div><\/div><\/section>$/)
  // Dans l'ordre de la maquette : c'est aussi l'ordre de lecture et du clavier.
  const order = ['galerie-surtitre', '<h2', 'galerie-avis-chapo', 'galerie-avis-bouton', '<snap-carrousel', 'galerie-avis-anges']
  assert.deepEqual([...order].sort((a, b) => html.indexOf(a) - html.indexOf(b)), order)
  assert.equal(count(html, /<h[1-6][\s>]/g), 1)
  // Une toile ou un poster : la même bande.
  assert.equal(tight(await render(AVIS, AVIS_SECTION, product({ poster: true }))), html)
})

test('rendu des avis : une carte par client, sa photo en différé, ses mots, son nom', { skip: SKIP }, async () => {
  const html = tight(await render(AVIS, AVIS_SECTION))
  const cards = [...html.matchAll(/<li class="carrousel-item galerie-avis-carte">(.*?)<\/li>/g)].map((m) => m[1])
  assert.equal(cards.length, 2)
  // La photo : recadrée à 4 / 5 par Shopify, en trois largeurs, jamais chargée avant d'approcher de l'écran.
  const src = (width, height) => `//www\\.myselfmonart\\.com/cdn/shop/files/photo-0\\.jpg\\?v=1&width=${width}&height=${height}&crop=center`
  assert.match(cards[0], new RegExp(`^<figure><img srcset="${src(300, 375)} 300w, ${src(450, 563)} 450w, ${src(600, 750)} 600w" src="${src(300, 375)}" sizes="\\(min-width: 900px\\) 300px, \\(min-width: 425px\\) 280px, 66vw" alt="Photo de tableau partagée par Léa M" width="480" height="600" loading="lazy" decoding="async"><figcaption>`))
  // Les deux derniers mots sont le nom, comme sur la carte d'avis du thème ; le reste, les mots du client.
  assert.match(cards[0], /<figcaption><blockquote>Très beau tableau ! Je suis ravie de mon achat, merci\.<\/blockquote><cite>Léa M\.<\/cite><\/figcaption><\/figure>$/)
  // Un message sur plusieurs lignes se lit d'une traite.
  assert.match(cards[1], /<blockquote>Trop contente Les coulures sont trop belles\.<\/blockquote><cite>Marie L\.<\/cite>/)
  assert.match(cards[1], /alt="Photo de tableau partagée par Marie L"/)
  assert.equal(count(html, /loading="lazy"/g), 3, 'les deux photos et les personnages')
  assert.doesNotMatch(html, /loading="eager"|fetchpriority/)
})

test('rendu des avis : le nom du client, tel que le message le finit', { skip: SKIP }, async () => {
  const card = async (message, withImage = true) => {
    const block = { id: 'a', type: 'image-text', settings: { image: withImage ? image(1, 'photo.jpg', 800, 800) : null, message } }
    return tight(await engine().renderFile('galerie-avis-carte', { block }, { globals: globals(product()) }))
  }
  // Une initiale déjà suivie de son point : un seul point.
  assert.match(await card('Je l adore!\nPatricia G.'), /<blockquote>Je l adore!<\/blockquote><cite>Patricia G\.<\/cite>/)
  // Des espaces et une tabulation en trop : aucun mot vide.
  assert.match(await card('Parfait\nSuper rendu. \tMariane B'), /<blockquote>Parfait Super rendu\.<\/blockquote><cite>Mariane B\.<\/cite>/)
  // Un point ou une virgule seuls sur leur ligne se recollent au mot d'avant ; un « ! » garde son espace.
  assert.match(await card('Mon fils va faire de beaux rêves de super-héros\n. Eugene D'), /<blockquote>Mon fils va faire de beaux rêves de super-héros\.<\/blockquote><cite>Eugene D\.<\/cite>/)
  assert.match(await card('Superbe\n, vraiment ! Léa M'), /<blockquote>Superbe, vraiment !<\/blockquote>/)
  assert.match(await card('  Top,  rien à dire de plus.   Guillaume  H '), /<blockquote>Top, rien à dire de plus\.<\/blockquote><cite>Guillaume H\.<\/cite>/)
  // Un seul mot : pas de nom. Deux mots : un nom, sans citation vide.
  const one = await card('Magnifique')
  assert.match(one, /<blockquote>Magnifique<\/blockquote><\/figcaption>/)
  assert.doesNotMatch(one, /<cite>/)
  assert.match(one, /alt="Photo de tableau partagée par un client"/)
  const two = await card('Sarah F')
  assert.doesNotMatch(two, /<blockquote>/)
  assert.match(two, /<figcaption><cite>Sarah F\.<\/cite><\/figcaption>/)
  // Les mots du client sont écrits en texte.
  assert.match(await card('Super <b>toile</b> & cadre. Hugo G'), /<blockquote>Super &lt;b&gt;toile&lt;\/b&gt; &amp; cadre\.<\/blockquote>/)
  // Du texte libre : la note et le nombre d'avis ne s'y écrivent que par leurs jetons (CLAUDE.md, note Trustpilot).
  assert.match(await card('Noté [[TP_SCORE]]/5 sur [[TP_COUNT]] avis, et c’est mérité. Paul D'), /<blockquote>Noté 4,2\/5 sur 86 avis, et c’est mérité\.<\/blockquote>/)
  // Sans photo : les mots seuls.
  const bare = await card('Le tableau est magnifique! Alexandre V', false)
  assert.doesNotMatch(bare, /<img/)
  assert.match(bare, /^<li class="carrousel-item galerie-avis-carte"><figure><figcaption>/)
})

test('rendu des avis : le nombre de clients suit le réglage de la section, écrit dans la langue de la page', { skip: SKIP }, async () => {
  const title = async (customers, lang = 'fr') => titleOf(await render(AVIS, { ...AVIS_SECTION, settings: { ...AVIS_SECTION.settings, customers } }, product(), { lang }))
  assert.equal(await title(1000), `+1${NBSP}000 clients <b>aux anges</b>`)
  assert.equal(await title(1015), `+1${NBSP}015 clients <b>aux anges</b>`)
  assert.equal(await title(2500), `+2${NBSP}500 clients <b>aux anges</b>`)
  assert.equal(await title(12000), `+12${NBSP}000 clients <b>aux anges</b>`)
  assert.equal(await title(950), '+950 clients <b>aux anges</b>')
  // Sans nombre : le titre sans nombre, jamais un zéro.
  for (const none of [null, undefined, 0, '']) assert.equal(await title(none), 'Des clients <b>aux anges</b>')
  // Les milliers de chaque langue, et le jeu de mots adapté.
  assert.equal(await title(1000, 'en'), '1,000+ customers <b>on cloud nine</b>')
  assert.equal(await title(1000, 'de'), 'Über 1.000 Kunden <b>im siebten Himmel</b>')
  assert.equal(await title(1000, 'es'), '+1.000 clientes <b>en el séptimo cielo</b>')
  assert.equal(await title(1000, 'nl'), '1.000+ klanten <b>in de zevende hemel</b>')
  assert.equal(await title(null, 'en'), 'Customers <b>on cloud nine</b>')
})

test('rendu des avis : le nombre d’avis vient du réglage Trustpilot du thème', { skip: SKIP }, async () => {
  const button = async (options) => />([^<]*)<\/a>/.exec(tight(await render(AVIS, AVIS_SECTION, product(), options)))[1]
  assert.equal(await button({ reviews: 86 }), '86 retours vérifiés sur Trustpilot')
  assert.equal(await button({ reviews: 131 }), '131 retours vérifiés sur Trustpilot')
  assert.equal(await button({ reviews: 131, lang: 'en' }), '131 verified reviews on Trustpilot')
  assert.equal(await button({ reviews: 131, lang: 'de' }), '131 verifizierte Bewertungen auf Trustpilot')
  // Sans lien : la même phrase, en texte.
  const plain = tight(await render(AVIS, { ...AVIS_SECTION, settings: { customers: 1000, trustpilot_link: '' } }))
  assert.match(plain, /<p class="galerie-avis-retours galerie-monte">86 retours vérifiés sur Trustpilot<\/p>/)
  assert.doesNotMatch(plain, /<a /)
})

test('rendu des avis : sans aucun avis, pas de rangée ni de script ; un bloc sans message est passé', { skip: SKIP }, async () => {
  const empty = tight(await render(AVIS, { ...AVIS_SECTION, blocks: [] }))
  assert.doesNotMatch(empty, /snap-carrousel|<ul|<script|sr-only/)
  assert.match(empty, /galerie-avis-titre/)
  assert.match(empty, /galerie-avis-anges/)
  const some = tight(await render(AVIS, { ...AVIS_SECTION, blocks: [...reviewBlocks(['', 'Très belle toile. Marie K']), { id: 'x', type: 'autre', settings: { message: 'Un autre bloc. Paul D' } }] }))
  assert.equal(count(some, /<li /g), 1)
  assert.match(some, /<p class="sr-only">1 avis/)
})

/* ---------- Rendu : « Vous aimerez aussi » ---------- */

// Un produit proposé : un nouveau produit (l'œuvre à plat seule) ou un produit de toujours (sa photo d'abord).
const proposed = (n, { suffix = 'oeuvre-3d', poster = false, hide = false } = {}) => {
  const p = product({ suffix, poster, files: suffix === 'oeuvre-3d' ? [FLAT] : OLD, short: `Œuvre ${n}` })
  return { ...p, id: 100 + n, title: `Tableau œuvre ${n} - Titre complet`, handle: `oeuvre-${n}`, url: `/products/oeuvre-${n}`, price_min: 6250, metafields: { ...p.metafields, recommandation: { hide } } }
}
const recommended = (products) => ({ recommendations: { 'performed?': true, products_count: products.length, products } })
const RECOS_ID = 'template--1__galerie-recos'

test('rendu de « Vous aimerez aussi » : le titre, le bouton vers la collection mère, le personnage, puis les recommandations de Shopify', { skip: SKIP }, async () => {
  const html = tight(await render(RECOS, { settings: { number_products_to_display: 10 } }))
  const id = `galerie-recos-titre-${RECOS_ID}`
  assert.match(html, new RegExp(`^<section class="galerie galerie-recos" aria-labelledby="${id}"><div class="galerie-bande"><div class="galerie-recos-tete"><p class="galerie-surtitre">Vous aimerez aussi</p><h2 class="galerie-recos-titre" id="${id}"><galerie-mots>D’autres tableaux, d’autres <b>perles\\.</b></galerie-mots></h2>`))
  // Le bouton mène à la collection mère du produit, que les lecteurs d'écran entendent nommée.
  assert.match(html, /<div class="galerie-recos-bas"><a class="galerie-recos-bouton" href="\/collections\/tableau-zen">Voir la collection<span class="sr-only"> Tableau Zen &amp; Nature<\/span><\/a>/)
  // Le personnage et l'étoile de sa perle : un décor.
  assert.match(html, /<div class="galerie-recos-perle" aria-hidden="true"><img src="[^"]*\/galerie-perle\.webp\?v=1" width="507" height="810" alt="" loading="lazy" decoding="async"><svg class="galerie-recos-eclat" viewBox="0 0 40 40" focusable="false"><path d="M20 0C21 12 28 19 40 20 28 21 21 28 20 40 19 28 12 21 0 20 12 19 19 12 20 0Z"\/><\/svg><\/div><\/div><\/div><\/div>/)
  // Les recommandations : l'élément du thème, la même adresse que la section d'aujourd'hui, et l'endroit où il
  // dépose les œuvres, qui tient leur place en attendant.
  assert.match(html, new RegExp(`<product-recommendations data-url="/recommendations/products\\?section_id=${RECOS_ID}&product_id=1&limit=10&intent=related"><galerie-recos class="product-recommendations galerie-recos-liste"><div class="galerie-recos-attente" data-allow-empty></div></galerie-recos></product-recommendations>`))
  const today = await render('sections/product-recommendations.liquid', { id: RECOS_ID, settings: { number_products_to_display: 10 } })
  assert.equal(/data-url="([^"]*)"/.exec(html)[1], /data-url="([^"]*)"/.exec(today)[1])
  // Les scripts : aucun ne bloque la page.
  const scripts = [...html.matchAll(/<script ([^>]*)><\/script>/g)].map((m) => m[1].replace(/\/\/[^"]*\/assets\//, '').replace(/\?v=1/, ''))
  assert.deepEqual(scripts, ['src="product-recommendations.js" defer="defer"', 'src="component-carrousel.js" defer="defer"', 'src="my-like-button.js" defer="defer"', 'type="module" src="oeuvre-card-reflet.js"'])
  assert.match(html, /<\/script><\/section>$/)
  assert.equal(count(html, /<h[1-6][\s>]/g), 1)
})

test('rendu de « Vous aimerez aussi », poster : « D’autres posters », le reste pareil', { skip: SKIP }, async () => {
  const toile = tight(await render(RECOS, { settings: { number_products_to_display: 10 } }))
  const poster = tight(await render(RECOS, { settings: { number_products_to_display: 10 } }, product({ poster: true })))
  assert.equal(titleOf(poster), 'D’autres posters, d’autres <b>perles.</b>')
  assert.doesNotMatch(text(poster), /tableaux/)
  assert.equal(poster.replace('posters, d’autres', 'tableaux, d’autres').replace('product_id=2', 'product_id=1'), toile)
  // Dans chaque langue, le jeu de mots adapté.
  // Dans chaque langue, « perle » dit aussi une trouvaille (a pearl, eine Perle, una perla, een pareltje) : le jeu de
  // mots tient, dans la tournure de chaque langue.
  const EXPECTED = { en: ['More artworks, more <b>pearls.</b>', 'More posters, more <b>pearls.</b>'], de: ['Noch mehr Bilder, noch mehr <b>Perlen.</b>', 'Noch mehr Poster, noch mehr <b>Perlen.</b>'], es: ['Más cuadros, más <b>perlas.</b>', 'Más pósteres, más <b>perlas.</b>'], nl: ['Meer schilderijen, meer <b>pareltjes.</b>', 'Meer posters, meer <b>pareltjes.</b>'] }
  for (const [lang, [canvas, print]] of Object.entries(EXPECTED)) {
    assert.equal(titleOf(await render(RECOS, {}, product(), { lang })), canvas, lang)
    assert.equal(titleOf(await render(RECOS, {}, product({ poster: true }), { lang })), print, lang)
  }
})

test('rendu de « Vous aimerez aussi » : sans collection mère, pas de bouton ; dix œuvres si le réglage manque', { skip: SKIP }, async () => {
  const html = tight(await render(RECOS, {}, product({ mother: null })))
  assert.doesNotMatch(html, /galerie-recos-bouton|<a /)
  assert.match(html, /<div class="galerie-recos-bas"><div class="galerie-recos-perle" aria-hidden="true">/)
  assert.match(html, /&limit=10&intent=related"/)
  assert.match(tight(await render(RECOS, { settings: { number_products_to_display: 6 } })), /&limit=6&intent=related"/)
})

test('rendu des recommandations de Shopify : la rangée du thème et sa carte de produit, sans rien redire du haut', { skip: SKIP }, async () => {
  const products = [proposed(1), proposed(2, { poster: true }), proposed(3, { suffix: 'painting' }), proposed(4, { hide: true })]
  const html = tight(await render(RECOS, {}, product(), { extra: recommended(products) }))
  // La réponse ne porte que l'endroit où les œuvres se déposent : ni titre, ni personnage, ni script. La rangée est
  // nommée pour les lecteurs d'écran, comme celle des avis.
  assert.match(html, /^<galerie-recos class="product-recommendations galerie-recos-liste"><snap-carrousel class="galerie-recos-glisse" role="region" aria-label="Vous aimerez aussi"><ul class="galerie-recos-rangee">(<li class="carrousel-item galerie-recos-carte">.*?<\/li>){3}<\/ul><\/snap-carrousel><\/galerie-recos>$/)
  assert.doesNotMatch(html, /<section|<h2|galerie-perle|<script src="[^"]*(product-recommendations|component-carrousel|my-like-button)/)
  const cards = html.split('<li class="carrousel-item galerie-recos-carte">').slice(1)
  assert.equal(cards.length, 3, 'une œuvre cachée des recommandations (métachamp) n’est pas proposée, comme aujourd’hui')
  // Un nouveau produit : la vignette d'œuvre du thème, la toile de face, le poster sous verre.
  assert.match(cards[0], /<div\s+class="oeuvre-card"\s+data-kind="toile"\s+style="--r: 0\.7484">/)
  assert.match(cards[1], /<div\s+class="oeuvre-card no-contour"\s+data-kind="poster"\s+data-look="verre"\s+data-frame="noir"/)
  // Un produit de toujours : sa photo, comme sur sa carte de collection.
  assert.doesNotMatch(cards[2], /oeuvre-card/)
  assert.match(cards[2], /<div class="skeleton overflow-hidden relative w-full duration-100" style="aspect-ratio: 1588 \/ 1865">/)
  // Chaque carte est celle du thème : rendue seule, elle sort pareil, et mène à son produit.
  for (const [i, p] of products.slice(0, 3).entries()) {
    const card = tight(await engine().renderFile('card-product', { product: p, primary_image_index: 1, next_image_index: 0, lazy_load: true, section_id: RECOS_ID }, { globals: globals(product()) }))
    assert.equal(cards[i].replace(/<\/li>.*$/, ''), card, p.handle)
    assert.match(cards[i], new RegExp(`<a href="/products/oeuvre-${i + 1}" class="product-card-title `))
    // left-0 top-0 : le titre entier invisible reste collé au coin de la carte (scripts/card-titre.test.cjs).
    assert.match(cards[i], />\s*ŒUVRE [123]\s*<span class="sr-only left-0 top-0">Tableau œuvre [123] - Titre complet<\/span>/)
    assert.match(cards[i], /62,50 €/)
    assert.match(cards[i], new RegExp(`<my-like-button data-product-id="${100 + i + 1}" data-product-handle="oeuvre-${i + 1}">`))
    // Les images arrivent floues, en différé : <galerie-recos> les dé-floute (le script, plus haut).
    assert.match(cards[i], /class="lqip /)
    assert.doesNotMatch(cards[i], /loading="eager"/)
  }
})

test('rendu des recommandations de Shopify : aucune œuvre à proposer, la place gardée se referme', { skip: SKIP }, async () => {
  const MARK = /^<galerie-recos class="product-recommendations galerie-recos-liste"><span hidden><\/span><\/galerie-recos>$/
  assert.match(tight(await render(RECOS, {}, product(), { extra: recommended([]) })), MARK)
  // Toutes cachées : pareil, et pas de rangée vide (la rangée du thème n'en veut pas).
  assert.match(tight(await render(RECOS, {}, product(), { extra: recommended([proposed(1, { hide: true })]) })), MARK)
  // Ce que le script du thème dépose n'est jamais vide : il ne remplace que par un contenu qui a du texte.
  assert.match(read('assets/product-recommendations.js'), /if \(recommendations && recommendations\.innerHTML\.trim\(\)\.length\)/)
})

test('la place des recommandations : gardée seulement quand le script est là, à la hauteur d’une carte', () => {
  // Sans script, rien ne viendra : pas de vide. :defined : l'élément est connu du navigateur.
  const hold = sheet().filter((r) => /galerie-recos-attente/.test(r.head))
  assert.ok(hold.length >= 1)
  for (const r of hold) assert.match(r.head, /^\.galerie-recos-liste:defined \.galerie-recos-attente$/, r.head)
  // La hauteur d'une rangée : la tuile (4 / 5 de la largeur d'une carte, toutes les tuiles ont ce format), puis le
  // nom et le prix. Elle suit la variable : rien à recalculer à la main sur ordinateur.
  assert.equal(body('.galerie-recos-liste:defined .galerie-recos-attente'), 'margin-top: 22px; height: calc(var(--galerie-recos-carte) * 1.25 + 60px);')
  assert.equal(body('.galerie-recos-liste:defined .galerie-recos-attente', LARGE), 'margin-top: 30px;')
})

/* ---------- Rendu : les questions ---------- */

const row = (id, heading, row_content, support) => ({ id, type: 'collapsible_row', settings: { heading, row_content, ...(support ? { support } : {}) } })
const QUESTIONS_SECTION = {
  settings: { contact_link: '/pages/contactez-nous' },
  blocks: [
    row('a', 'Une vraie toile ?', '<p>Une vraie toile, sur son châssis.</p>', 'toile'),
    row('b', 'Un vrai tirage photo ?', '<p>Un vrai papier photo.</p>', 'poster'),
    row('c', 'Le paiement est-il sécurisé ?', '<p>Oui. <strong>100 %</strong> sécurisé.</p><ul><li>Visa</li></ul>', 'tous'),
    row('d', 'Comment vous contacter ?', '<p>Notre note : [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.</p>'),
  ],
}
const questionsOf = (html) => [...tight(html).matchAll(/<details class="accordion galerie-questions-volet"><summary><h3>(.*?)<\/h3><span class="galerie-questions-plus" aria-hidden="true" data-allow-empty><\/span><\/summary><div class="galerie-questions-reponse">(.*?)<\/div><\/details>/g)].map((m) => [m[1], m[2]])

test('rendu des questions : le titre, les volets du thème, puis la carte « Une autre question ? »', { skip: SKIP }, async () => {
  const html = tight(await render(QUESTIONS, QUESTIONS_SECTION))
  const id = 'galerie-questions-titre-template--1__galerie-questions'
  assert.match(html, new RegExp(`^<section class="galerie galerie-bande galerie-questions" aria-labelledby="${id}"><div class="galerie-questions-in"><div><p class="galerie-surtitre">Vos questions</p><h2 class="galerie-questions-titre" id="${id}"><galerie-mots>Questions <b>fréquentes</b></galerie-mots></h2></div><collapsible-tab class="galerie-questions-volets"><details `))
  // Une toile : ses questions et celles de tous, dans l'ordre des blocs ; chaque question est un h3.
  assert.deepEqual(questionsOf(html), [
    ['Une vraie toile ?', '<p>Une vraie toile, sur son châssis.</p>'],
    ['Le paiement est-il sécurisé ?', '<p>Oui. <strong>100 %</strong> sécurisé.</p><ul><li>Visa</li></ul>'],
    ['Comment vous contacter ?', '<p>Notre note : 4,2/5 sur 86 avis.</p>'],
  ])
  assert.equal(count(html, /<details /g), 3)
  // La carte : sa phrase, son bouton, puis le personnage au casque et sa bulle, qui sont un décor.
  assert.match(html, new RegExp(`</collapsible-tab><div class="galerie-questions-aide"><div class="galerie-questions-carte"><p class="galerie-questions-carte-titre">Une autre <b>question${NBSP}\\?</b></p><p class="galerie-questions-carte-texte">Une vraie personne vous répond 7 jours sur 7\\.</p><a class="galerie-questions-bouton" href="/pages/contactez-nous">Nous écrire</a><div class="galerie-questions-bas"><p class="galerie-questions-bulle" aria-hidden="true">Allô, j’écoute${NBSP}!</p><div class="galerie-questions-ecoute" aria-hidden="true"><img src="[^"]*/galerie-ecoute\\.webp\\?v=1" width="572" height="810" alt="" loading="lazy" decoding="async"><svg class="galerie-questions-casque" viewBox="0 0 572 810" focusable="false">`))
  assert.match(html, /<\/svg><\/div><\/div><\/div><\/div><\/div><\/section>$/)
  // Le casque est dessiné sans couleur écrite : la feuille les donne.
  const svg = /<svg class="galerie-questions-casque"[\s\S]*?<\/svg>/.exec(html)[0]
  assert.doesNotMatch(svg, /#[0-9a-f]{3,6}|fill=|stroke=/i)
  assert.match(svg, /<path class="galerie-questions-arceau" d="M197 152C188 48 240 4 287 4s107 44 100 148"\/><rect x="178" y="130" width="32" height="58" rx="14"\/><rect x="372" y="130" width="32" height="58" rx="14"\/><path class="galerie-questions-tige" d="M194 184c-4 38 20 44 44 30"\/><ellipse cx="246" cy="210" rx="12" ry="9"\/>/)
  // Un h2 pour la section, un h3 par question : aucun autre titre.
  assert.equal(count(html, /<h2[\s>]/g), 1)
  assert.equal(count(html, /<h3[\s>]/g), 3)
  assert.equal(count(html, /<h[1456][\s>]/g), 0)
})

test('rendu des questions, poster : ses réponses et celles de tous, rien de la toile', { skip: SKIP }, async () => {
  const html = await render(QUESTIONS, QUESTIONS_SECTION, product({ poster: true }))
  assert.deepEqual(questionsOf(html).map(([question]) => question), ['Un vrai tirage photo ?', 'Le paiement est-il sécurisé ?', 'Comment vous contacter ?'])
  assert.doesNotMatch(text(html), /toile|châssis/)
  // Hors des volets, la section est la même.
  const outside = (h) => tight(h).replace(/<collapsible-tab[\s\S]*<\/collapsible-tab>/, '')
  assert.equal(outside(html), outside(await render(QUESTIONS, QUESTIONS_SECTION)))
})

test('rendu des questions : la question est écrite en texte ; un bloc sans question ou sans réponse est passé', { skip: SKIP }, async () => {
  const blocks = [row('a', 'Toile & <i>cadre</i> ?', '<p>Oui.</p>'), row('b', '', '<p>Sans question.</p>'), row('c', 'Sans réponse ?', ''), { id: 'd', type: 'autre', settings: { heading: 'Autre bloc ?', row_content: '<p>Non.</p>' } }]
  const html = await render(QUESTIONS, { ...QUESTIONS_SECTION, blocks })
  assert.deepEqual(questionsOf(html), [['Toile &amp; &lt;i&gt;cadre&lt;/i&gt; ?', '<p>Oui.</p>']])
  // Une question est du texte libre, comme sa réponse : ses jetons Trustpilot sont remplacés.
  const tokens = await render(QUESTIONS, { ...QUESTIONS_SECTION, blocks: [row('t', 'Pourquoi [[TP_SCORE]]/5 sur [[TP_COUNT]] avis ?', '<p>Merci.</p>')] })
  assert.deepEqual(questionsOf(tokens).map(([question]) => question), ['Pourquoi 4,2/5 sur 86 avis ?'])
  // Aucune question : pas de volets, la carte reste.
  const none = tight(await render(QUESTIONS, { ...QUESTIONS_SECTION, blocks: [] }))
  assert.doesNotMatch(none, /collapsible-tab|<details/)
  assert.match(none, /galerie-questions-carte/)
  // Sans lien de contact : pas de bouton.
  const noLink = tight(await render(QUESTIONS, { ...QUESTIONS_SECTION, settings: {} }))
  assert.doesNotMatch(noLink, /galerie-questions-bouton|<a /)
  assert.match(noLink, /galerie-questions-bulle/)
})

test('rendu des trois sections : dans chaque langue, ses textes, plus un mot de français', { skip: SKIP }, async () => {
  const EXPECTED = {
    en: ['Customer reviews', 'You may also like', 'See the collection', 'Your questions', 'Frequently asked <b>questions</b>', 'Another <b>question?</b>', 'Write to us', 'I’m all ears!'],
    de: ['Kundenbewertungen', 'Das könnte Ihnen auch gefallen', 'Zur Kollektion', 'Ihre Fragen', 'Häufige <b>Fragen</b>', 'Noch eine <b>Frage?</b>', 'Schreiben Sie uns', 'Ich bin ganz Ohr!'],
    es: ['Opiniones de clientes', 'También te gustará', 'Ver la colección', 'Tus preguntas', 'Preguntas <b>frecuentes</b>', '¿Otra <b>pregunta?</b>', 'Escríbenos', '¡Soy toda oídos!'],
    nl: ['Klantreviews', 'Dit vind je vast ook mooi', 'Bekijk de collectie', 'Je vragen', 'Veelgestelde <b>vragen</b>', 'Nog een <b>vraag?</b>', 'Schrijf ons', 'Zeg het maar!'],
  }
  for (const [lang, expected] of Object.entries(EXPECTED)) {
    const html = tight(await render(AVIS, AVIS_SECTION, product(), { lang })) + tight(await render(RECOS, {}, product(), { lang })) + tight(await render(QUESTIONS, { ...QUESTIONS_SECTION, blocks: [] }, product(), { lang }))
    for (const phrase of expected) assert.ok(html.includes(`>${phrase}<`), `${lang} : « ${phrase} »`)
    // La phrase sous le titre des avis : celle de la section d'avis du thème, dans la langue.
    assert.ok(html.includes(`<p class="galerie-avis-chapo galerie-monte">${locales[lang].sections.testimonials_carousel.lead_default}</p>`), `${lang} : la phrase des avis`)
    // Les blocs du modèle (mots des clients, questions) restent ceux du modèle : traduits ailleurs.
    assert.doesNotMatch(text(html.replace(/<blockquote>.*?<\/blockquote>/g, '')), /Avis clients|aux anges|meilleur portrait|retours vérifiés|Vous aimerez|D’autres|perles|Voir la collection|Vos questions|fréquentes|Une autre|vraie personne|Nous écrire|Allô/, lang)
  }
})

/* ---------- Les données pour Google ---------- */

test('données pour Google : ni la fiche 3D d’aujourd’hui ni la page galerie ne publient les questions ou les avis', { skip: SKIP }, async () => {
  // Aujourd'hui : les trois sections du thème, avec les réglages du modèle de la fiche 3D. Ses deux cases
  // (emit_review_jsonld, emit_faq_jsonld) sont éteintes : aucune donnée structurée.
  const today = json(TODAY).sections
  assert.equal(today[TODAY_AVIS].settings.emit_review_jsonld, false)
  assert.equal(today[TODAY_QUESTIONS].settings.emit_faq_jsonld, false)
  const before = []
  for (const [file, name] of [['sections/testimonials-carousel.liquid', TODAY_AVIS], ['sections/product-recommendations.liquid', TODAY_RECOS], ['sections/collapsible-content.liquid', TODAY_QUESTIONS]]) {
    for (const poster of [false, true]) before.push(...ldOf(await render(file, { id: `template--1__${name}`, ...sectionOf(TODAY, name) }, product({ poster }))))
  }
  assert.deepEqual(before, [], 'la fiche 3D d’aujourd’hui')
  // Le contrôle voit bien ces données quand elles sont publiées : la case cochée, la section du thème les écrit.
  const published = ldOf(await render('sections/collapsible-content.liquid', { ...sectionOf(TODAY, TODAY_QUESTIONS), settings: { ...today[TODAY_QUESTIONS].settings, emit_faq_jsonld: true } }))
  assert.equal(published.length, 1)
  assert.equal(JSON.parse(published[0])['@type'], 'FAQPage')
  // La page galerie : pareil, pour une toile comme pour un poster, recommandations déposées comprises.
  const after = []
  for (const poster of [false, true]) {
    const p = product({ poster })
    after.push(...ldOf(await render(AVIS, AVIS_SECTION, p)), ...ldOf(await render(RECOS, {}, p)), ...ldOf(await render(RECOS, {}, p, { extra: recommended([proposed(1)]) })), ...ldOf(await render(QUESTIONS, QUESTIONS_SECTION, p)))
  }
  assert.deepEqual(after, [], 'la page galerie')
  for (const file of PIECES) assert.doesNotMatch(read(file), /ld\+json|itemscope|itemprop|schema\.org/, file)
})

/* ---------- Le modèle caché ---------- */

// Les sections du ticket arrivent dans le modèle par un second commit : Shopify refuse un modèle qui cite une
// section qu'il ne connaît pas encore.
const model = () => json(MODEL)
const inModel = () => Object.values(model().sections).some((s) => s.type === 'galerie-avis')
const LATER = inModel() ? false : 'les trois sections arrivent dans le modèle par un second commit'

test('le modèle caché : les avis, les recommandations et les questions suivent le bloc principal, dans cet ordre', { skip: LATER }, () => {
  const { sections, order } = model()
  const types = order.map((id) => sections[id].type)
  const mine = types.filter((type) => ['galerie-avis', 'galerie-recos', 'galerie-questions'].includes(type))
  assert.deepEqual(mine, ['galerie-avis', 'galerie-recos', 'galerie-questions'])
  assert.ok(types.indexOf('galerie-avis') > types.indexOf('main-product'))
  // Elles gardent le nom des sections qu'elles remplacent dans le modèle de la fiche 3D.
  assert.equal(sections[TODAY_AVIS].type, 'galerie-avis')
  assert.equal(sections[TODAY_RECOS].type, 'galerie-recos')
  assert.equal(sections[TODAY_QUESTIONS].type, 'galerie-questions')
  // Leurs réglages : ceux que les schémas connaissent, rien d'autre.
  for (const [name, file] of [[TODAY_AVIS, AVIS], [TODAY_RECOS, RECOS], [TODAY_QUESTIONS, QUESTIONS]]) {
    const schema = schemaOf(file)
    const known = schema.settings.filter((s) => s.id).map((s) => s.id)
    for (const id of Object.keys(sections[name].settings || {})) assert.ok(known.includes(id), `${name} : réglage ${id}`)
    const blockSettings = Object.fromEntries((schema.blocks || []).map((b) => [b.type, b.settings.map((s) => s.id)]))
    for (const [id, block] of Object.entries(sections[name].blocks || {})) {
      assert.ok(blockSettings[block.type], `${name}.${id} : type ${block.type}`)
      for (const setting of Object.keys(block.settings)) assert.ok(blockSettings[block.type].includes(setting), `${name}.${id} : réglage ${setting}`)
    }
    assert.deepEqual([...(sections[name].block_order || [])].sort(), Object.keys(sections[name].blocks || {}).sort(), `${name} : block_order`)
    assert.ok((sections[name].block_order || []).length <= (schema.max_blocks || 50), `${name} : pas plus de blocs que le schéma n’en permet`)
  }
  assert.deepEqual(sections[TODAY_AVIS].settings, { customers: 1000, trustpilot_link: 'https://fr.trustpilot.com/review/myselfmonart.com' })
  assert.deepEqual(sections[TODAY_RECOS].settings, { number_products_to_display: json(TODAY).sections[TODAY_RECOS].settings.number_products_to_display })
  assert.deepEqual(sections[TODAY_QUESTIONS].settings, { contact_link: 'shopify://pages/contactez-nous' })
  // Le lien Trustpilot est celui de la note du bloc principal.
  assert.equal(sections[TODAY_AVIS].settings.trustpilot_link, Object.values(sections.main.blocks).find((b) => b.type === 'trustpilot_review').settings.link)
})

test('le modèle caché : les photos et les mots des clients sont ceux de la fiche 3D d’aujourd’hui', { skip: LATER }, () => {
  const before = json(TODAY).sections[TODAY_AVIS]
  const after = model().sections[TODAY_AVIS]
  assert.deepEqual(after.block_order, before.block_order)
  assert.equal(after.block_order.length, 25)
  for (const id of before.block_order) {
    assert.equal(after.blocks[id].type, 'image-text', id)
    assert.deepEqual(after.blocks[id].settings, { image: before.blocks[id].settings.image, message: before.blocks[id].settings.message }, id)
    assert.equal(Boolean(after.blocks[id].disabled), Boolean(before.blocks[id].disabled), `${id} : éteint ou non, comme aujourd’hui`)
  }
})

test('le modèle caché : les questions d’aujourd’hui pour la toile, mot pour mot ; ses réponses pour le poster', { skip: LATER }, () => {
  const before = json(TODAY).sections[TODAY_QUESTIONS]
  const after = model().sections[TODAY_QUESTIONS]
  const shown = (support) => after.block_order.map((id) => ({ id, ...after.blocks[id] })).filter((b) => !b.disabled && ['tous', support].includes(b.settings.support))
  // La toile : les treize questions d'aujourd'hui, dans leur ordre, sous les mêmes noms de blocs.
  const toile = shown('toile')
  assert.deepEqual(toile.map((b) => b.id), before.block_order)
  for (const b of toile) {
    assert.equal(b.type, 'collapsible_row')
    assert.equal(b.settings.heading, before.blocks[b.id].settings.heading, b.id)
    assert.equal(b.settings.row_content, before.blocks[b.id].settings.row_content, b.id)
  }
  // Le poster : ses six réponses (textes de la maquette), et les quatre questions qui valent pour tout support.
  const poster = shown('poster')
  assert.deepEqual(poster.map((b) => b.settings.heading), [
    'Les couleurs seront-elles fidèles à ce que je vois sur mon écran ?',
    'C\'est un vrai tirage photo ?',
    'Comment choisir la bonne taille pour mon mur ?',
    'Et si la taille ne convient pas une fois accroché ?',
    'Quels sont les délais et le prix de la livraison ?',
    'Que faire si le poster ne me plaît pas ?',
    'Faut-il acheter un cadre en plus ?',
    'Le paiement est-il sécurisé ?',
    'Puis-je payer en plusieurs fois ?',
    'Comment vous contacter si j\'ai une question ?',
  ])
  const own = poster.filter((b) => b.settings.support === 'poster')
  assert.equal(own.length, 6)
  // Rien de ce que la boutique ne dit que des toiles : châssis, toile de 285 g/m², couleurs garanties 75 ans.
  for (const b of poster) assert.doesNotMatch(b.settings.heading + b.settings.row_content, /châssis|toile|285|75 ans|tableau/i, b.id)
  for (const b of own) assert.match(b.settings.row_content, /^<p>[^<]+<\/p>$/, b.id)
  assert.equal(own.filter((b) => /poster/.test(b.settings.heading + b.settings.row_content)).length, 5)
  assert.equal(own.filter((b) => /papier photo de 250 g\/m²/.test(b.settings.row_content)).length, 2)
  // Chaque version poster suit la question de la toile qu'elle remplace.
  const order = after.block_order
  for (const b of own) assert.equal(after.blocks[order[order.indexOf(b.id) - 1]].settings.support, 'toile', b.id)
  // Tout bloc dit son support.
  for (const id of order) assert.ok(['tous', 'toile', 'poster'].includes(after.blocks[id].settings.support), id)
})

test('rendu du modèle caché : une toile lit les questions d’aujourd’hui, un poster les siennes ; les avis sont ceux d’aujourd’hui', { skip: SKIP || LATER }, async () => {
  const today = json(TODAY).sections
  // Les questions : mêmes titres et mêmes réponses que la section du thème rend aujourd'hui.
  const before = tight(await render('sections/collapsible-content.liquid', sectionOf(TODAY, TODAY_QUESTIONS)))
  const beforeQuestions = [...before.matchAll(/<h3 [^>]*>(.*?)<\/h3>/g)].map((m) => m[1].trim())
  assert.equal(beforeQuestions.length, 13)
  const toile = questionsOf(await render(QUESTIONS, sectionOf(MODEL, TODAY_QUESTIONS)))
  assert.deepEqual(toile.map(([question]) => question), beforeQuestions)
  for (const [question, answer] of toile) {
    const block = Object.values(today[TODAY_QUESTIONS].blocks).find((b) => b.settings.heading.replace(/'/g, '&#39;') === question)
    assert.ok(block, question)
    assert.equal(answer, tight(block.settings.row_content), question)
  }
  const poster = questionsOf(await render(QUESTIONS, sectionOf(MODEL, TODAY_QUESTIONS), product({ poster: true })))
  assert.equal(poster.length, 10)
  assert.doesNotMatch(poster.map(([question, answer]) => question + answer).join(' '), /châssis|toile|285|75 ans/i)
  // Les avis : autant de cartes que la section d'aujourd'hui, les mêmes photos, les mêmes noms.
  const beforeAvis = tight(await render('sections/testimonials-carousel.liquid', sectionOf(TODAY, TODAY_AVIS)))
  const afterAvis = tight(await render(AVIS, sectionOf(MODEL, TODAY_AVIS)))
  assert.equal(count(afterAvis, /<li class="carrousel-item /g), 24)
  assert.equal(count(afterAvis, /<li class="carrousel-item /g), count(beforeAvis, /<li class="carrousel-item /g))
  const photos = (html) => [...html.matchAll(/ src="[^"]*\/files\/([^"?]+)\?/g)].map((m) => m[1])
  assert.deepEqual(photos(afterAvis), photos(beforeAvis))
  const names = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1].replace(/\.$/, '').trim())
  assert.deepEqual(names(afterAvis, /<cite>(.*?)<\/cite>/g), names(beforeAvis, /<p class="[^"]*">— (.*?)<\/p>/g))
  assert.match(afterAvis, new RegExp(`\\+1${NBSP}000 clients <b>aux anges</b>`))
})
