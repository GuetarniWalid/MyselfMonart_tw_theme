// La page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie, ticket 22) : « L'histoire » et « En pratique ».
// Sous la scène, un bloc en deux colonnes (sections/galerie-histoire.liquid) : à gauche le texte de présentation du
// produit, découpé par le serveur (son titre, son début, et la suite repliée derrière « Lire la suite ») ; à
// droite quatre volets, ceux du produit (toile ou poster), et quatre engagements.
// Le rendu Liquid (liquidjs) demande le module : sans lui, ces tests-là sont sautés et le reste passe. Le banc les
// lance avec NODE_PATH vers un node_modules qui a liquidjs.
// Lancer : node --test scripts/galerie-histoire.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { read, code, json, schemaOf, rules, mainOf, LANGS, SKIP, engine, product, globals, renderSectionFile } = require('./galerie-banc.cjs')

const SECTION = 'sections/galerie-histoire.liquid'

/* Les deux textes relevés en ligne le 20/11/2026 : la toile a un titre (h2), le poster n'en a pas. */
const TOILE = `<h2>Quand Superman rencontre le street art — et que ça explose</h2><p>Certaines toiles murmurent. Celle-ci hurle de joie.</p>

<p>Vous reconnaissez ce S iconique. Superman, le héros en collants qui ne vieillit jamais. Sauf qu'ici, il n'a rien de sage. Il est explosé, réinventé, bombardé de rose fuchsia, de bleu électrique, de jaune soleil et de graffiti sauvages. C'est du street art décomplexé, du genre qui mélange tout : le mythe américain, la culture pop, et cette énergie brute qui vient directement de la rue.</p>

<p>Les coulures, les éclaboussures, les aplats qui se chevauchent — tout ça pulse. Ça bouge. On dirait que la peinture vient juste de sécher, que l'artiste est encore là, bombe en main. Cette texture, ce chaos maîtrisé, c'est la signature du street art quand il est à son meilleur : spontané en apparence, mais drôlement bien pensé.</p>

<p>Ce n'est pas un poster de super-héros pour chambre d'enfant. C'est une pièce d'affirmation pour adultes qui refusent de choisir entre l'art et le fun.</p>

<p>Dans votre salon, elle sera le point de départ de toutes les conversations. Dans votre bureau, elle rappelle que l'audace est un super-pouvoir. Vos invités souriront. Et vous demanderont où diable vous l'avez dénichée.</p>

<p>Le genre de toile qui ne plaira pas à tout le monde. Mais vous, vous ne décorez pas pour tout le monde.</p>`

const POSTER = `<p>Certaines affiches murmurent. Celle-ci crie sa joie à pleins poumons.</p>

<p>Vous reconnaissez immédiatement ce S mythique. Superman, l'icône en cape qui traverse les décennies sans prendre une ride. Mais ici, il n'a rien de classique. Il est déconstruit, bombardé de rose fuchsia, de bleu électrique, de jaune éclatant et de tags furieux. C'est du street art sans filtre, celui qui fait exploser les codes : le mythe des super-héros, la culture pop américaine, et cette énergie rebelle tout droit venue du bitume.</p>

<p>Les coulures qui dégoulinent, les projections sauvages, les aplats qui se télescopent — tout vibre. Tout bouge. On jurerait que la peinture vient à peine de sécher, que l'artiste est encore au pied du mur, bombe à la main. Cette spontanéité apparente, ce désordre maîtrisé, c'est l'essence même du street art quand il frappe fort : impulsif à l'œil, redoutablement construit dans le fond.</p>

<p>Ce n'est pas une affiche de héros pour décorer une chambre d'ado. C'est une déclaration graphique pour celles et ceux qui refusent de séparer l'art de l'attitude.</p>

<p>Dans votre salon, ce poster deviendra le centre de gravité visuel, celui qui capte les regards et lance les discussions. Dans votre espace de travail, il rappelle chaque jour que l'audace reste le meilleur des super-pouvoirs. Vos invités s'arrêteront net. Et vous demanderont où vous avez déniché cette pépite.</p>

<p>Cette impression plaira aux amateurs d'art urbain qui assument leurs goûts. Si vous cherchez du consensuel, passez votre chemin. Vous, vous décorez pour vous.</p>`

/* ---------- La section ---------- */

// Les fichiers Liquid de la section.
const PIECES = [SECTION, 'snippets/galerie-histoire-recit.liquid', 'snippets/galerie-histoire-titre.liquid', 'snippets/galerie-histoire-coupe.liquid', 'snippets/galerie-histoire-gage.liquid']

test('la section : pour une fiche produit, des blocs « volet » qui disent leur support', () => {
  const schema = schemaOf(SECTION)
  assert.ok(schema.name.length <= 25, 'Shopify limite le nom d’une section à 25 caractères')
  assert.equal(schema.tag, 'section')
  assert.deepEqual(schema.enabled_on, { templates: ['product'] })
  // Sa feuille est chargée par le bloc principal en page galerie : la section ne se pose que dans ce modèle, à la main.
  assert.equal(schema.presets, undefined)
  assert.deepEqual(schema.blocks.map((b) => b.type), ['volet'])
  const [block] = schema.blocks
  assert.ok(block.name.length <= 25, 'Shopify limite le nom d’un bloc à 25 caractères')
  const setting = (id) => block.settings.find((s) => s.id === id)
  assert.equal(setting('support').type, 'select')
  assert.deepEqual(setting('support').options.map((o) => o.value), ['tous', 'toile', 'poster'])
  assert.equal(setting('support').default, 'tous')
  assert.equal(setting('heading').type, 'text')
  assert.equal(setting('content').type, 'richtext')
})

test('aucun script : la suite du texte est un <details>, les volets sont ceux du thème', () => {
  for (const file of PIECES) assert.doesNotMatch(code(file), /<script|onclick|javascript:/, file)
  // « Lire la suite » : un <details> du navigateur. Il se déplie au clavier comme au doigt, et tient après la
  // bascule Toile / Poster sans rien rejouer.
  assert.match(code('snippets/galerie-histoire-recit.liquid'), /<details class="galerie-histoire-suite">\s*<summary class="galerie-histoire-lire">/)
  // Les volets : <collapsible-tab>, défini par assets/tw-global.js, que toute page charge (snippets/head-base.liquid).
  // Il cherche ses volets par la classe accordion, à son arrivée dans la page : après la bascule aussi.
  assert.match(code(SECTION), /<collapsible-tab class="galerie-histoire-volets">/)
  assert.match(code(SECTION), /<details class="accordion galerie-histoire-volet" {{ block\.shopify_attributes }}>/)
  const theme = read('assets/tw-global.js')
  assert.match(theme, /customElements\.define\('collapsible-tab', CollapsibleTab\)/)
  assert.match(theme, /this\.accordions = this\.querySelectorAll\('\.accordion'\)/)
  assert.match(code('snippets/head-base.liquid'), /<script src="{{ 'tw-global\.js' \| asset_url }}" defer="defer"><\/script>/)
  // Le script de la page n'a rien à faire pour cette section.
  assert.doesNotMatch(read('assets/oeuvre-galerie.js'), /histoire|pratique|volet/i)
})

test('la feuille commune du site ne porte rien de la section : ses classes sont les siennes et celles du socle', () => {
  // Les classes de la section (galerie-histoire…), celles que le socle partage avec toute la page (typo, marges,
  // montée, surtitre), et « accordion », que lit <collapsible-tab> : Tailwind n'a rien de neuf à compiler.
  for (const file of PIECES) {
    const classes = [...code(file).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
    for (const name of classes) assert.match(name, /^(galerie-histoire(-[a-z]+)*|galerie|galerie-bande|galerie-monte|galerie-surtitre|accordion)$/, `${file} : classe « ${name} »`)
  }
  assert.doesNotMatch(read('input.css'), /galerie-/)
})

/* ---------- La feuille de la page : le bloc de la section ---------- */

const CSS = 'assets/oeuvre-galerie.css'
const LARGE = '@media (min-width: 900px)'
const MOTION = '@media (prefers-reduced-motion: no-preference)'
// Les règles du bloc « Histoire et pratique », entre ses deux repères, sans ses commentaires.
const sheet = () => {
  const css = read(CSS)
  const start = css.indexOf('/* === Histoire et pratique (ticket 22) : début ===')
  const end = css.indexOf('/* === Histoire et pratique (ticket 22) : fin === */')
  assert.ok(start > 0 && end > start, 'le bloc de la section, entre ses deux repères')
  return rules(css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, ''))
}
// Le corps d'une règle du bloc, blancs réduits.
const body = (head, context = '') => {
  const found = sheet().find((r) => r.head.replace(/\s+/g, ' ') === head && r.context.join() === context)
  assert.ok(found, `règle « ${head} »${context ? ` dans ${context}` : ''}`)
  return found.body.replace(/\s+/g, ' ').trim()
}

test('la feuille : chaque règle du bloc porte le nom de la section, galerie-histoire', () => {
  // D'autres sections de la page ont des volets (les questions fréquentes, ticket 23) : rien ici ne les touche.
  assert.ok(sheet().length > 20)
  for (const { head } of sheet()) {
    assert.doesNotMatch(head, /^@keyframes/, 'aucune image clé : la section reprend celles du socle')
    for (const selector of head.split(',')) assert.match(selector, /^\s*\.galerie-histoire(-[a-z-]+)?(?![\w-])/, `sélecteur « ${selector.trim()} »`)
  }
})

test('la feuille : les mesures du bloc sont celles de la maquette', () => {
  // La bande : blanche, 64 et 70 px ; 104 et 110 px sur ordinateur. Deux colonnes de 7 et 5 parts à 90 px.
  assert.equal(body('.galerie-histoire'), 'background: var(--blanc); padding-top: 64px; padding-bottom: 70px;')
  assert.equal(body('.galerie-histoire', LARGE), 'padding-top: 104px; padding-bottom: 110px;')
  assert.equal(body('.galerie-histoire-colonnes'), 'max-width: 1240px; margin-inline: auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 52px;')
  assert.equal(body('.galerie-histoire-colonnes', LARGE), 'grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 90px; align-items: start;')
  // « L'histoire » : en capitales, 23 px puis 30 px, comme la maquette l'affiche. Le titre : maigre, de 30 à 42 px,
  // puis de 40 à 60 px.
  assert.equal(body('.galerie-histoire-surtitre'), 'margin: 0 0 0.8em; font: 500 23px/1.28 var(--sans); letter-spacing: -0.022em; text-transform: uppercase; color: var(--encre-70);')
  assert.equal(body('.galerie-histoire-surtitre', LARGE), 'font-size: 30px;')
  assert.match(body('.galerie-histoire-titre'), /^margin: 14px 0 22px; font: 300 clamp\(30px, 8\.2vw, 42px\)\/1\.02 var\(--sans\); letter-spacing: -0\.042em; text-wrap: balance;/)
  assert.equal(body('.galerie-histoire-titre', LARGE), 'font-size: clamp(40px, 3.7vw, 60px); line-height: 1;')
  assert.equal(body('.galerie-histoire-titre b'), 'font-weight: 700;')
  // Le texte : 17 px puis 18,5 px, des paragraphes de 34 em au plus.
  assert.match(body('.galerie-histoire-texte'), /^font: 400 17px\/1\.6 var\(--sans\);/)
  assert.equal(body('.galerie-histoire-texte', LARGE), 'font-size: 18.5px;')
  assert.equal(body('.galerie-histoire-texte p'), 'margin: 0 0 1em; max-width: 34em;')
  // « Lire la suite » : une pastille de 40 px de haut, 8 px sous le texte.
  assert.match(body('.galerie-histoire-lire'), /display: inline-flex; align-items: center; gap: 10px; padding: 13px 18px; border-radius: 999px; background: var\(--encre-06\); font: 600 14px\/1 var\(--sans\);/)
  assert.equal(body('.galerie-histoire-suite'), 'position: relative; padding-bottom: 48px;')
  assert.equal(body('.galerie-histoire-lire svg'), 'width: 12px; height: 12px;')
  // La carte : crème, arrondie ; sur ordinateur, elle suit le défilement à 40 px du haut.
  assert.equal(body('.galerie-histoire-pratique'), 'background: var(--creme); border-radius: 28px; padding: 26px 20px;')
  assert.equal(body('.galerie-histoire-pratique', LARGE), 'position: sticky; top: 40px; padding: 36px 34px;')
  assert.equal(body('.galerie-histoire-pratique-titre'), 'margin: 12px 0 0; font: 300 clamp(30px, 8vw, 40px)/1 var(--sans); letter-spacing: -0.04em;')
  assert.equal(body('.galerie-histoire-pratique-titre b'), 'font-weight: 700;')
  // Les volets : un filet entre eux, un titre de 17 px, le « + » dans une pastille blanche de 28 px.
  assert.equal(body('.galerie-histoire-volets'), 'display: block; margin-top: 20px; border-top: 1px solid var(--encre-12);')
  assert.equal(body('.galerie-histoire-volet'), 'border-bottom: 1px solid var(--encre-12);')
  assert.match(body('.galerie-histoire-volet-titre'), /^display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 17px;/)
  assert.equal(body('.galerie-histoire-volet-titre h3'), 'margin: 0; font: 500 17px/1.28 var(--sans); letter-spacing: -0.012em;')
  assert.equal(body('.galerie-histoire-volet-titre i'), 'flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--blanc); position: relative;')
  assert.equal(body('.galerie-histoire-volet-titre i::before, .galerie-histoire-volet-titre i::after'), 'content: ""; position: absolute; left: 50%; top: 50%; width: 11px; height: 1.6px; margin: -0.8px 0 0 -5.5px; background: currentColor; border-radius: 2px;')
  assert.equal(body('.galerie-histoire-volet[open] .galerie-histoire-volet-titre i'), 'background: var(--encre); color: var(--blanc); transform: rotate(45deg);')
  assert.match(body('.galerie-histoire-volet-texte'), /^padding-bottom: 18px; font: 400 15px\/1\.6 var\(--sans\); color: var\(--encre-70\);/)
  assert.equal(body('.galerie-histoire-volet-texte p'), 'margin: 0 0 0.9em; max-width: 38em;')
  // Les engagements : deux colonnes, un dessin de 24 px dans une pastille de 46 px.
  assert.match(body('.galerie-histoire-gages'), /^margin: 26px 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 20px 16px;/)
  assert.match(body('.galerie-histoire-gages li'), /^display: grid; gap: 4px; align-content: start; font: 400 13\.5px\/1\.4 var\(--sans\); color: var\(--encre-70\);/)
  assert.equal(body('.galerie-histoire-gage-dessin'), 'display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: var(--ciel); margin-bottom: 6px;')
  assert.equal(body('.galerie-histoire-gage-dessin svg'), 'width: 24px; height: 24px; stroke: var(--encre); fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round;')
  assert.equal(body('.galerie-histoire-gages b'), 'display: block; font: 600 15.5px/1.2 var(--sans); letter-spacing: -0.012em; color: var(--encre);')
  // Une couleur par engagement, dans l'ordre de la page : ciel, rose, soleil, menthe.
  for (const [n, color] of [[2, 'rose'], [3, 'soleil'], [4, 'menthe']]) assert.equal(body(`.galerie-histoire-gages li:nth-child(${n}) .galerie-histoire-gage-dessin`), `background: var(--${color});`)
})

test('la feuille : rien ne bouge si le visiteur demande moins de mouvement ; les plis sont ceux du navigateur', () => {
  const animated = sheet().filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  assert.ok(animated.length >= 4, 'la flèche, le « + », et les deux plis')
  for (const r of animated) assert.deepEqual(r.context, [MOTION], r.head)
  // Un <details> se déplie en douceur là où le navigateur sait animer son contenu (::details-content) : une ligne de
  // grille qui passe de 0 à sa hauteur. Ailleurs, il s'ouvre d'un coup. Ces règles restent seules : un navigateur qui
  // ne connaît pas ce pseudo-élément écarte toute la règle.
  for (const [name, duration] of [['.galerie-histoire-suite', '0.5s'], ['.galerie-histoire-volet', '0.45s']]) {
    assert.equal(body(`${name}::details-content`, MOTION), `display: grid; grid-template-rows: 0fr; transition: grid-template-rows ${duration} cubic-bezier(0.22, 0.8, 0.2, 1), content-visibility ${duration} allow-discrete;`)
    assert.equal(body(`${name}[open]::details-content`, MOTION), 'grid-template-rows: 1fr;')
  }
  // Ce qui se plie est coupé pendant le mouvement, sans rogner le contour de focus d'un lien au bord du texte.
  assert.equal(body('.galerie-histoire-suite-corps, .galerie-histoire-volet-corps', MOTION), 'min-height: 0; overflow: hidden; margin: -6px; padding: 6px;')
})

test('la feuille : les textes de la carte se lisent sur son fond crème (contraste AA, 4,5 pour 1)', () => {
  // L'encre est la couleur principale du thème ; un texte gris est cette encre, en partie transparente, sur la crème.
  const all = rules(read(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))
  const tokens = all.find((r) => r.head === ':root[data-galerie-page]' && !r.context.length).body
  const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16))
  const ink = hex(json('config/settings_data.json').current.main_color)
  const cream = hex(/--creme:\s*(#[0-9a-f]{6});/.exec(tokens)[1])
  const alpha = Number(/--encre-70:\s*rgba\(var\(--color-main-rgb\), ([\d.]+)\);/.exec(tokens)[1])
  const linear = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
  const grey = ink.map((c, i) => cream[i] + (c - cream[i]) * alpha)
  // Le texte des volets et des engagements, et le surtitre « En pratique », sont en encre-70 sur la crème.
  for (const head of ['.galerie-histoire-volet-texte', '.galerie-histoire-gages li']) assert.match(body(head), /color: var\(--encre-70\);/)
  assert.ok(contrast(grey, cream) >= 4.5, `encre-70 sur crème : ${contrast(grey, cream).toFixed(2)} pour 1`)
  assert.ok(contrast(ink, cream) > 12)
  // Le calcul est le bon : noir sur blanc, 21 pour 1.
  assert.equal(Math.round(contrast([0, 0, 0], [255, 255, 255])), 21)
})

/* ---------- Le rendu ---------- */

// Le balisage sans les blancs entre deux balises, ni celui qui précède la fin d'une balise (les attributs de
// l'éditeur de thème, vides hors de lui) : ils ne comptent pas. Ceux d'un texte restent. Sans non plus les
// identifiants qui nomment les deux parties de la section : un test à part les vérifie.
const tight = (html) => html.replace(/>\s+</g, '><').replace(/"\s+>/g, '">').replace(/ (id|aria-labelledby)="galerie-histoire-(titre|pratique)-[^"]*"/g, '').trim()
// Le texte d'un balisage, blancs réduits.
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const render = (description, { poster = false, blocks = [], lang = 'fr' } = {}) =>
  renderSectionFile(SECTION, { blocks }, { ...product({ poster }), description }, { lang, suffix: 'oeuvre-galerie' }).then(tight)
// La colonne du texte : de son ouverture à celle de la carte « En pratique ».
const recitOf = (html) => /<section class="galerie-histoire-recit">[\s\S]*?(?=<section class="galerie-histoire-pratique)/.exec(html)[0]

test('rendu de l’histoire, toile : le titre du texte en grand, son début à l’écran, la suite repliée', { skip: SKIP }, async () => {
  const recit = recitOf(await render(TOILE))
  // « L'histoire », puis le h2 du texte : maigre, la fin en gras après le tiret, dans l'élément qui fait arriver ses mots.
  assert.match(recit, /^<section class="galerie-histoire-recit"><p class="galerie-histoire-surtitre">L’histoire<\/p><h2 class="galerie-histoire-titre"><galerie-mots>Quand Superman rencontre le street art — <b>et que ça explose<\/b><\/galerie-mots><\/h2>/)
  // Le premier paragraphe monte à son entrée dans l'écran ; le second reste à l'écran avec lui.
  assert.match(recit, /<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Certaines toiles murmurent\. Celle-ci hurle de joie\.<\/p><\/div><p>Vous reconnaissez ce S iconique\.[^<]*de la rue\.<\/p><details class="galerie-histoire-suite">/)
  // La suite : les quatre derniers paragraphes, dans la page, repliés derrière « Lire la suite ».
  const suite = /<details class="galerie-histoire-suite">([\s\S]*?)<\/details>/.exec(recit)[1]
  assert.match(suite, /^<summary class="galerie-histoire-lire"><span class="galerie-histoire-lire-plus">Lire la suite<\/span><span class="galerie-histoire-lire-moins">Réduire<\/span><svg[^>]*aria-hidden="true"[^>]*><path d="m2 4 4 4 4-4"\/><\/svg><\/summary><div class="galerie-histoire-suite-corps"><p>Les coulures,/)
  assert.equal(suite.match(/<p>/g).length, 4)
  assert.match(suite, /<p>Le genre de toile qui ne plaira pas à tout le monde\. Mais vous, vous ne décorez pas pour tout le monde\.<\/p><\/div>$/)
  // Tout le texte est là, une fois, dans l'ordre : le titre, puis les six paragraphes.
  assert.equal(text(recit).replace('L’histoire ', '').replace(' Lire la suite Réduire', ''), text(TOILE))
})

test('rendu de l’histoire, poster : sans titre, le premier paragraphe du texte en tient lieu', { skip: SKIP }, async () => {
  const recit = recitOf(await render(POSTER, { poster: true }))
  // La première phrase en maigre, la suite du paragraphe en gras, comme dans la maquette.
  assert.match(recit, /^<section class="galerie-histoire-recit"><p class="galerie-histoire-surtitre">L’histoire<\/p><h2 class="galerie-histoire-titre"><galerie-mots>Certaines affiches murmurent\. <b>Celle-ci crie sa joie à pleins poumons\.<\/b><\/galerie-mots><\/h2>/)
  // Ce paragraphe n'est écrit qu'une fois : le texte reprend au suivant, seul à l'écran avant la suite.
  assert.match(recit, /<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Vous reconnaissez immédiatement ce S mythique\.[^<]*venue du bitume\.<\/p><\/div><details class="galerie-histoire-suite">/)
  const suite = /<details class="galerie-histoire-suite">([\s\S]*?)<\/details>/.exec(recit)[1]
  assert.equal(suite.match(/<p>/g).length, 4)
  assert.match(suite, /<div class="galerie-histoire-suite-corps"><p>Les coulures qui dégoulinent,/)
  assert.equal(text(recit).replace('L’histoire ', '').replace(' Lire la suite Réduire', ''), text(POSTER))
})

/* -- D'autres formes de texte : rien ne se perd, rien ne s'écrit deux fois -- */

// Le texte de la colonne, sans ses libellés fixes : celui de la description, dans l'ordre.
const told = (recit) => text(recit).replace(/^L’histoire ?/, '').replace(/ ?Lire la suite Réduire/, '')
// Une phrase de 137 caractères, et un paragraphe de deux phrases (275) : à lui seul, plus que le début à l'écran.
const PHRASE = 'Un bonsaï centenaire déploie ses branches au-dessus d’un jardin de pierres, dans la lumière dorée d’un matin d’automne où rien ne presse.'
const LONG = `${PHRASE} ${PHRASE}`

test('rendu de l’histoire : un texte court ne se replie pas', { skip: SKIP }, async () => {
  // Un titre et un seul paragraphe : rien à replier.
  const one = recitOf(await render('<h2>Le calme, tout simplement</h2><p>Un seul paragraphe.</p>'))
  assert.match(one, /<h2 class="galerie-histoire-titre"><galerie-mots>Le calme, tout <b>simplement<\/b><\/galerie-mots><\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Un seul paragraphe\.<\/p><\/div><\/div><\/section>$/)
  assert.doesNotMatch(one, /<details|Lire la suite/)
  // Une suite de quelques mots ne vaut pas un bouton : elle reste à l'écran.
  const short = recitOf(await render(`<h2>Titre</h2><p>${PHRASE}</p><p>${PHRASE}</p><p>Et c’est tout.</p>`))
  assert.doesNotMatch(short, /<details|Lire la suite/)
  assert.match(short, /<\/div><p>Un bonsaï[^<]*<\/p><p>Et c’est tout\.<\/p><\/div><\/section>$/)
  assert.equal(told(short), `Titre ${PHRASE} ${PHRASE} Et c’est tout.`)
  // Une vraie suite se replie : le début s'arrête au paragraphe qui passe les 250 caractères.
  const folded = recitOf(await render(`<h2>Titre</h2><p>${PHRASE}</p><p>${PHRASE}</p><p>${PHRASE}</p>`))
  assert.match(folded, /<\/div><p>Un bonsaï[^<]*<\/p><details class="galerie-histoire-suite">.*<div class="galerie-histoire-suite-corps"><p>Un bonsaï[^<]*<\/p><\/div><\/details><\/div><\/section>$/)
  // Un premier paragraphe long reste seul à l'écran.
  const alone = recitOf(await render(`<h2>Titre</h2><p>${LONG}</p><p>${PHRASE}</p>`))
  assert.match(alone, /<div class="galerie-histoire-chapo galerie-monte"><p>[^<]*<\/p><\/div><details class="galerie-histoire-suite">/)
})

test('rendu de l’histoire, sans titre : la première phrase d’un long paragraphe ; sinon « L’histoire » est le titre', { skip: SKIP }, async () => {
  // Un premier paragraphe trop long pour un titre : sa première phrase seule ; le reste demeure un paragraphe.
  const sentence = recitOf(await render(`<p class="intro">Il y a des passions qu’on n’explique pas. ${PHRASE}</p><p>${LONG}</p>`))
  assert.match(sentence, /<h2 class="galerie-histoire-titre"><galerie-mots>Il y a des passions qu’on n’explique <b>pas\.<\/b><\/galerie-mots><\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p class="intro">Un bonsaï centenaire[^<]*<\/p><\/div>/)
  assert.equal(told(sentence), `Il y a des passions qu’on n’explique pas. ${PHRASE} ${LONG}`)
  // Un seul paragraphe court : il reste un paragraphe, et « L'histoire » devient le titre (h2) du bloc.
  const one = recitOf(await render('<p>Une description.</p>'))
  assert.match(one, /^<section class="galerie-histoire-recit"><h2 class="galerie-histoire-surtitre">L’histoire<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Une description\.<\/p><\/div><\/div><\/section>$/)
  // Deux phrases courtes, seules : la première est le titre, la seconde le texte.
  const two = recitOf(await render('<p>Le calme. Rien d’autre.</p>'))
  assert.match(two, /<galerie-mots>Le <b>calme\.<\/b><\/galerie-mots><\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Rien d’autre\.<\/p><\/div><\/div><\/section>$/)
  // Une phrase unique, trop longue pour un titre : pas de titre tiré du texte.
  const endless = recitOf(await render(`<p>${PHRASE}</p><p>${LONG}</p>`))
  assert.match(endless, /^<section class="galerie-histoire-recit"><h2 class="galerie-histoire-surtitre">L’histoire<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Un bonsaï/)
  assert.doesNotMatch(endless, /galerie-histoire-titre|galerie-mots/)
  // Un premier paragraphe qui porte du balisage (un lien, du gras) n'est pas démonté : il reste entier.
  const tagged = recitOf(await render(`<p>Voir <a href="/collections/zen">la collection zen</a>. Elle apaise.</p><p>${LONG}</p>`))
  assert.match(tagged, /^<section class="galerie-histoire-recit"><h2 class="galerie-histoire-surtitre">L’histoire<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Voir <a href="\/collections\/zen">la collection zen<\/a>\. Elle apaise\.<\/p><\/div>/)
  for (const recit of [one, two, endless, tagged]) assert.equal((recit.match(/<h2[\s>]/g) || []).length, 1)
})

test('rendu de l’histoire : un balisage imprévu ne casse rien, tout le texte reste', { skip: SKIP }, async () => {
  const texte = (recit) => /<div class="galerie-histoire-texte">([\s\S]*)<\/div><\/section>$/.exec(recit)[1]
  // Le texte ne commence pas par un paragraphe (une liste, du texte nu, un bloc) : il s'écrit tel quel, en entier.
  for (const html of [`<ul><li>Un</li><li>Deux</li></ul><p>${LONG}</p><p>${LONG}</p>`, 'Juste une phrase, sans balise.', `<div><p>${LONG}</p><p>${LONG}</p></div>`]) {
    const recit = recitOf(await render(html))
    assert.equal(texte(recit), html)
    assert.match(recit, /^<section class="galerie-histoire-recit"><h2 class="galerie-histoire-surtitre">/)
  }
  // Une citation après le début : la coupe ne passe jamais au travers d'un bloc.
  const quote = `<blockquote><p>${PHRASE}</p><p>${PHRASE}</p></blockquote><p>${PHRASE}</p>`
  assert.equal(texte(recitOf(await render(`<h2>Titre</h2><p>${PHRASE}</p>${quote}`))).replace(/<summary[\s\S]*?<\/summary>/, ''), `<div class="galerie-histoire-chapo galerie-monte"><p>${PHRASE}</p></div><details class="galerie-histoire-suite"><div class="galerie-histoire-suite-corps">${quote}</div></details>`)
  // Ce qui suit le dernier paragraphe (une liste, un paragraphe resté ouvert) est gardé, une fois.
  const list = `<ul><li>${PHRASE}</li></ul>`
  assert.equal(texte(recitOf(await render(`<h2>Titre</h2><p>${PHRASE}</p>${list}`))).replace(/<summary[\s\S]*?<\/summary>/, ''), `<div class="galerie-histoire-chapo galerie-monte"><p>${PHRASE}</p></div><details class="galerie-histoire-suite"><div class="galerie-histoire-suite-corps">${list}</div></details>`)
  assert.equal(texte(recitOf(await render(`<h2>Titre</h2><p>${PHRASE}</p><p>Resté ouvert`))), `<div class="galerie-histoire-chapo galerie-monte"><p>${PHRASE}</p></div><p>Resté ouvert`)
  // Le titre : ses balises et ses retours à la ligne tombent, son texte reste. Un second titre demeure dans le texte.
  const styled = recitOf(await render(`<h2 class="x" data-y="z">Le <em>grand</em>\ncalme</h2><p>${LONG}</p><h2>Un second titre</h2><p>${LONG}</p>`))
  assert.match(styled, /<h2 class="galerie-histoire-titre"><galerie-mots>Le grand <b>calme<\/b><\/galerie-mots><\/h2>/)
  assert.match(styled, /<div class="galerie-histoire-suite-corps"><h2>Un second titre<\/h2><p>/)
  // Un paragraphe avant le titre reste dans le texte.
  const late = recitOf(await render(`<p>Avant le titre.</p><h2>Le titre</h2><p>${LONG}</p>`))
  assert.match(late, /<galerie-mots>Le <b>titre<\/b><\/galerie-mots><\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Avant le titre\.<\/p><\/div><p>Un bonsaï/)
  // Un h1 dans une description : il devient le titre du bloc, jamais un second h1 dans la page.
  const h1 = recitOf(await render(`<h1>Grand titre</h1><p>${LONG}</p><h1 class="x">Autre</h1>`))
  assert.doesNotMatch(h1, /<\/?h1/)
  assert.match(h1, /<h2 class="galerie-histoire-titre"><galerie-mots>Grand <b>titre<\/b><\/galerie-mots><\/h2>/)
  assert.match(h1, /<h2 class="x">Autre<\/h2>/)
  // Un titre vide ou resté ouvert n'est pas un titre.
  for (const html of [`<h2> </h2><p>${LONG}</p>`, `<h2><br></h2><p>${LONG}</p>`]) assert.match(recitOf(await render(html)), /^<section class="galerie-histoire-recit"><h2 class="galerie-histoire-surtitre">L’histoire<\/h2><div class="galerie-histoire-texte"><div class="galerie-histoire-chapo galerie-monte"><p>Un bonsaï/)
  assert.equal(texte(recitOf(await render(`<h2>Resté ouvert <p>${LONG}</p>`))), `<h2>Resté ouvert <p>${LONG}</p>`)
})

test('rendu du titre : maigre, sa fin en gras, trouvée seule pour n’importe quel titre', { skip: SKIP }, async () => {
  const titled = async (h2) => /<galerie-mots>([\s\S]*?)<\/galerie-mots>/.exec(recitOf(await render(`<h2>${h2}</h2><p>${LONG}</p>`)))[1]
  const CASES = [
    // Une incise : ce qui suit le premier tiret entouré d'espaces, ou les deux-points.
    ['Quand Superman rencontre le street art — et que ça explose', 'Quand Superman rencontre le street art — <b>et que ça explose</b>'],
    ['Le zèbre – roi de la savane', 'Le zèbre – <b>roi de la savane</b>'],
    ['Bonsaï zen - Sérénité &amp; équilibre', 'Bonsaï zen - <b>Sérénité &amp; équilibre</b>'],
    ['Bonsaï zen : la sérénité au mur', 'Bonsaï zen : <b>la sérénité au mur</b>'],
    ['Bonsaï zen : la sérénité — au mur', 'Bonsaï zen : <b>la sérénité — au mur</b>'],
    // Plusieurs phrases : la première en maigre, la suite en gras ; elles passent avant une incise.
    ['Certaines affiches murmurent. Celle-ci crie sa joie à pleins poumons.', 'Certaines affiches murmurent. <b>Celle-ci crie sa joie à pleins poumons.</b>'],
    ['Et si la nuit vous attendait ? Elle est là — tout près.', 'Et si la nuit vous attendait ? <b>Elle est là — tout près.</b>'],
    ['Regardez ! Il neige. Enfin.', 'Regardez ! <b>Il neige. Enfin.</b>'],
    // Sinon le dernier mot, avec la ponctuation qui en est détachée.
    ['Quand l’élégance se fait silencieuse et vous attend au détour d’un regard', 'Quand l’élégance se fait silencieuse et vous attend au détour d’un <b>regard</b>'],
    ['Le calme, tout simplement.', 'Le calme, tout <b>simplement.</b>'],
    ['Et si la nuit vous attendait ?', 'Et si la nuit vous <b>attendait ?</b>'],
    ['Le fameux effet « waouh »', 'Le fameux effet « <b>waouh »</b>'],
    ['Un week-end au bord de l’eau', 'Un week-end au bord de <b>l’eau</b>'],
    ['Sérénité', '<b>Sérénité</b>'],
    ['Zen !', '<b>Zen !</b>'],
    // Un signe en tête n'ouvre pas une phrase vide.
    ['. Et pourtant elle tourne', '. Et pourtant elle <b>tourne</b>'],
  ]
  for (const [h2, expected] of CASES) assert.equal(await titled(h2), expected, h2)
})

test('rendu de l’histoire : la note Trustpilot vient du réglage du thème, les liens restent dans la langue de la page', { skip: SKIP }, async () => {
  // Le texte d'un produit n'a pas à citer la note ; s'il la cite, ce sont les jetons, remplacés partout, titre compris.
  const noted = `<h2>Notre note : [[TP_SCORE]]/5</h2><p>Une note de [[TP_SCORE]]/5 sur [[TP_COUNT]] avis. ${PHRASE}</p><p>${LONG}</p><p>Encore [[TP_COUNT]] avis. ${PHRASE}</p>`
  const fr = recitOf(await render(noted))
  assert.match(fr, /<galerie-mots>Notre note : <b>4,2\/5<\/b><\/galerie-mots>/)
  assert.match(fr, /<p>Une note de 4,2\/5 sur 86 avis\. /)
  assert.match(fr, /<div class="galerie-histoire-suite-corps"><p>Encore 86 avis\. /)
  assert.doesNotMatch(fr, /\[\[TP_/)
  // En anglais, la note s'écrit avec un point.
  assert.match(recitOf(await render(noted, { lang: 'en' })), /<p>Une note de 4\.2\/5 sur 86 avis\. /)
  // Hors de la racine française, un lien interne garde la langue de la page (snippets/localized-links.liquid).
  const linked = `<h2>Titre</h2><p>Voir <a href="/collections/tableau-zen">nos tableaux zen</a>. ${PHRASE}</p><p>${LONG}</p><p>Et <a href="https://www.myselfmonart.com/products/bonsai">ce tableau</a>. ${PHRASE}</p>`
  const p = { ...product(), description: linked }
  const source = read(SECTION).slice(0, read(SECTION).indexOf('{% schema %}'))
  const at = (root) => engine('en').parseAndRender(source, {}, { globals: { ...globals(p, { lang: 'en', suffix: 'oeuvre-galerie', section: { id: 's', settings: {}, blocks: [] } }), routes: { root_url: root } } })
  const en = await at('/en')
  assert.match(en, /<a href="\/en\/collections\/tableau-zen">nos tableaux zen<\/a>/)
  assert.match(en, /<a href="\/en\/products\/bonsai">ce tableau<\/a>/)
  assert.match(await at('/'), /<a href="\/collections\/tableau-zen">nos tableaux zen<\/a>/)
})

/* -- « En pratique » -- */

// La carte : de son ouverture à la fin de la section.
const pratiqueOf = (html) => /<section class="galerie-histoire-pratique galerie-monte">[\s\S]*<\/section>(?=<\/div><\/div>$)/.exec(html)[0]
const volet = (id, support, heading, content) => ({ id, type: 'volet', settings: { support, heading, content } })
// Des volets comme ceux du modèle : le premier vaut pour les deux, les autres ont une version par support.
const VOLETS = [
  volet('choisir', 'tous', 'Poster ou toile : lequel choisir ?', '<p><strong>Le poster, c’est la liberté.</strong> La toile, la pièce forte.</p>'),
  volet('livraison_poster', 'poster', 'Livraison, paiement & délais', '<p>Votre poster est imprimé à la commande.</p>'),
  volet('livraison_toile', 'toile', 'Livraison, paiement & délais', '<p>Votre tableau est imprimé à la commande, sa toile tendue sur son châssis.</p>'),
  volet('details_poster', 'poster', 'Détails du produit', '<p>Un vrai papier photo de 250 g/m².</p>'),
  volet('details_toile', 'toile', 'Détails du produit', '<p>Tendue à la main sur un châssis en bois massif.</p>'),
]
// Les volets rendus : [titre, texte].
const voletsOf = (html) => [...html.matchAll(/<details class="accordion galerie-histoire-volet"><summary class="galerie-histoire-volet-titre"><h3>([^<]*)<\/h3><i data-allow-empty aria-hidden="true"><\/i><\/summary><div class="galerie-histoire-volet-corps"><div class="galerie-histoire-volet-texte">([\s\S]*?)<\/div><\/div><\/details>/g)].map((m) => [m[1], text(m[2])])

test('rendu de « En pratique » : son titre, puis les volets du produit seulement, dans l’élément du thème', { skip: SKIP }, async () => {
  const toile = pratiqueOf(await render(TOILE, { blocks: VOLETS }))
  assert.match(toile, /^<section class="galerie-histoire-pratique galerie-monte"><p class="galerie-surtitre">En pratique<\/p><h2 class="galerie-histoire-pratique-titre">Tout ce qu’il <b>faut savoir<\/b><\/h2><collapsible-tab class="galerie-histoire-volets"><details class="accordion galerie-histoire-volet">/)
  // Une toile : le volet commun et ceux de la toile, dans l'ordre du modèle.
  assert.deepEqual(voletsOf(toile), [
    ['Poster ou toile : lequel choisir ?', 'Le poster, c’est la liberté. La toile, la pièce forte.'],
    ['Livraison, paiement &amp; délais', 'Votre tableau est imprimé à la commande, sa toile tendue sur son châssis.'],
    ['Détails du produit', 'Tendue à la main sur un châssis en bois massif.'],
  ])
  // Un poster : le volet commun et ceux du poster. Plus un mot écrit pour la toile.
  const poster = pratiqueOf(await render(POSTER, { poster: true, blocks: VOLETS }))
  assert.deepEqual(voletsOf(poster), [
    ['Poster ou toile : lequel choisir ?', 'Le poster, c’est la liberté. La toile, la pièce forte.'],
    ['Livraison, paiement &amp; délais', 'Votre poster est imprimé à la commande.'],
    ['Détails du produit', 'Un vrai papier photo de 250 g/m².'],
  ])
  assert.doesNotMatch(poster, /châssis|tableau/)
  // Tous les volets sont dans <collapsible-tab> (assets/tw-global.js), qui cherche ses volets par la classe accordion.
  for (const html of [toile, poster]) {
    const tab = /<collapsible-tab class="galerie-histoire-volets">([\s\S]*?)<\/collapsible-tab>/.exec(html)[1]
    assert.equal(tab.match(/<details class="accordion galerie-histoire-volet">/g).length, 3)
    assert.equal(html.match(/<details/g).length, 3)
  }
})

test('rendu de « En pratique » : un bloc d’un autre type, ou sans support connu, ne s’affiche pas ; sans volet, pas de liste', { skip: SKIP }, async () => {
  const odd = [{ id: 'x', type: 'autre', settings: { support: 'tous', heading: 'Autre', content: '<p>Rien.</p>' } }, volet('y', 'aluminium', 'Aluminium', '<p>Rien.</p>'), volet('z', 'toile', 'Pour la toile', '<p>Oui.</p>')]
  assert.deepEqual(voletsOf(pratiqueOf(await render(TOILE, { blocks: odd }))), [['Pour la toile', 'Oui.']])
  const none = pratiqueOf(await render(POSTER, { poster: true, blocks: odd }))
  assert.doesNotMatch(none, /collapsible-tab|<details/)
  assert.match(none, /<\/h2><ul class="galerie-histoire-gages">/)
})

test('rendu d’un volet : la note vient du réglage du thème, titre compris ; un sous-titre du texte descend sous le titre du volet', { skip: SKIP }, async () => {
  const blocks = [volet('avis', 'tous', 'Nos [[TP_COUNT]] avis & le reste', '<h3>Notre engagement</h3><p>Noté [[TP_SCORE]]/5 sur [[TP_COUNT]] avis.</p><h2 class="x">Autre</h2><h1>Encore</h1><h4>Déjà plus bas</h4>')]
  const fr = await render(TOILE, { blocks })
  // Le titre du volet est du texte libre : ses jetons sont remplacés, et il est écrit en texte (escape).
  assert.match(fr, /<summary class="galerie-histoire-volet-titre"><h3>Nos 86 avis &amp; le reste<\/h3>/)
  assert.match(fr, /<div class="galerie-histoire-volet-texte"><h4>Notre engagement<\/h4><p>Noté 4,2\/5 sur 86 avis\.<\/p><h4 class="x">Autre<\/h4><h4>Encore<\/h4><h4>Déjà plus bas<\/h4><\/div>/)
  assert.match(await render(TOILE, { blocks, lang: 'en' }), /<p>Noté 4\.2\/5 sur 86 avis\.<\/p>/)
  assert.doesNotMatch(fr, /\[\[TP_/)
  // La structure des titres de la section : pas de h1, deux h2 (le texte, la carte), un h3 par volet, le reste dessous.
  const levels = [...fr.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
  assert.deepEqual(levels, [2, 2, 3, 4, 4, 4, 4])
})

/* Les cinq petits dessins de la maquette validée, tels qu'elle les trace : le cadre, les trois couleurs, la trame
   de la toile, la feuille de papier (poster), la bulle. Aucun autre. */
const DESSINS = {
  cadre: '<rect x="5" y="7" width="22" height="18" rx="1"/><rect x="9" y="11" width="14" height="10"/><path d="M16 7V4"/>',
  couleurs: '<circle cx="12" cy="13" r="7"/><circle cx="20" cy="13" r="7"/><circle cx="16" cy="20" r="7"/>',
  trame: '<path d="M5 9h22M5 14h22M5 19h22M5 24h22M9 5v22M14 5v22M19 5v22M24 5v22"/>',
  feuille: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6"/>',
  bulle: '<path d="M6 8h20v13H14l-5 4v-4H6z"/><path d="M11 13h10M11 17h6"/>',
}
// Les engagements rendus : [dessin, titre, texte].
const gagesOf = (html) => {
  const list = /<ul class="galerie-histoire-gages">([\s\S]*?)<\/ul>/.exec(html)[1]
  // Une espace entre le titre et le texte : ils ne se collent pas pour Google ni pour un lecteur d'écran.
  const items = [...list.matchAll(/<li><span class="galerie-histoire-gage-dessin" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false">(.*?)<\/svg><\/span><b>([^<]*)<\/b> ([^<\s][^<]*)<\/li>/g)]
  // Rien d'autre dans la liste que ces lignes.
  assert.equal(items.map((m) => m[0]).join(''), list)
  return items.map((m) => [Object.keys(DESSINS).find((name) => DESSINS[name] === m[1]), m[2], m[3]])
}

test('rendu des engagements : quatre lignes, celles de la toile ou celles du poster, avec les dessins de la maquette', { skip: SKIP }, async () => {
  assert.deepEqual(gagesOf(await render(TOILE)), [
    ['cadre', 'Prête à accrocher', 'Livrée montée sur son châssis.'],
    ['couleurs', 'Couleurs fidèles', 'Riches, nettes, garanties 75 ans.'],
    ['trame', 'Vraie toile d’art', 'Un grain délicat, doux au toucher.'],
    ['bulle', 'Une vraie personne', 'Vous répond 7 jours sur 7.'],
  ])
  const poster = await render(POSTER, { poster: true })
  assert.deepEqual(gagesOf(poster), [
    ['cadre', 'Avec ou sans cadre', 'À encadrer vous-même, ou livré sous verre.'],
    ['couleurs', 'Couleurs fidèles', 'Riches et nettes, en haute définition.'],
    ['feuille', 'Vrai papier photo', '250 g/m², un tirage HD.'],
    ['bulle', 'Une vraie personne', 'Vous répond 7 jours sur 7.'],
  ])
  // Un poster ne dit rien de la toile : ni châssis, ni toile, ni garantie de 75 ans.
  assert.doesNotMatch(text(pratiqueOf(poster)), /toile|châssis|75 ans|tableau/i)
})

/* -- Les textes fixes -- */

const fixed = (lang) => json(`locales/${LANGS[lang]}`).sections.mma.galerie.histoire

test('textes fixes : sous sections.mma.galerie.histoire, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const fr = fixed('fr')
  const keys = Object.keys(fr).sort()
  assert.deepEqual(keys, [
    'pledge_canvas', 'pledge_canvas_text', 'pledge_colors', 'pledge_colors_text_canvas', 'pledge_colors_text_poster', 'pledge_frame', 'pledge_frame_text',
    'pledge_hang', 'pledge_hang_text', 'pledge_paper', 'pledge_paper_text', 'pledge_person', 'pledge_person_text',
    'practical', 'practical_title', 'practical_title_strong', 'read_less', 'read_more', 'story',
  ])
  for (const lang of Object.keys(LANGS)) {
    const texts = fixed(lang)
    assert.deepEqual(Object.keys(texts).sort(), keys, lang)
    for (const [key, value] of Object.entries(texts)) {
      assert.equal(typeof value, 'string', `${lang}.${key}`)
      assert.ok(value.trim().length > 0, `${lang}.${key} : vide`)
      assert.equal(value, value.trim(), `${lang}.${key} : un blanc de trop`)
      if (lang !== 'fr') assert.notEqual(value, fr[key], `${lang}.${key} : resté en français`)
      // Du texte, sans balise : Shopify l'écrit tel quel dans la page.
      assert.doesNotMatch(value, /[<>]/, `${lang}.${key}`)
    }
    // Le poids du papier se dit partout pareil ; un poster ne promet ni toile ni 75 ans.
    assert.match(texts.pledge_paper_text, /250 g\/m²/, lang)
    assert.match(texts.pledge_colors_text_canvas, /75/, lang)
    assert.doesNotMatch(texts.pledge_colors_text_poster, /75/, lang)
  }
})

test('rendu dans chaque langue : les textes fixes de la section sont traduits', { skip: SKIP }, async () => {
  const EXPECTED = {
    en: { story: 'The story', more: 'Read more', less: 'Show less', title: 'Everything you <b>need to know</b>', hang: 'Ready to hang', paper: 'Real photo paper' },
    de: { story: 'Die Geschichte', more: 'Weiterlesen', less: 'Weniger anzeigen', title: 'Alles, was Sie <b>wissen müssen</b>', hang: 'Fertig zum Aufhängen', paper: 'Echtes Fotopapier' },
    es: { story: 'La historia', more: 'Leer más', less: 'Ver menos', title: 'Todo lo que <b>hay que saber</b>', hang: 'Listo para colgar', paper: 'Auténtico papel fotográfico' },
    nl: { story: 'Het verhaal', more: 'Verder lezen', less: 'Minder tonen', title: 'Alles wat je <b>moet weten</b>', hang: 'Klaar om op te hangen', paper: 'Echt fotopapier' },
  }
  for (const [lang, expected] of Object.entries(EXPECTED)) {
    const toile = await render(TOILE, { lang })
    assert.match(toile, new RegExp(`<p class="galerie-histoire-surtitre">${expected.story}</p>`), lang)
    assert.match(toile, new RegExp(`<span class="galerie-histoire-lire-plus">${expected.more}</span><span class="galerie-histoire-lire-moins">${expected.less}</span>`), lang)
    assert.match(toile, new RegExp(`<h2 class="galerie-histoire-pratique-titre">${expected.title}</h2>`), lang)
    assert.equal(gagesOf(toile)[0][1], expected.hang, lang)
    assert.equal(gagesOf(await render(POSTER, { poster: true, lang }))[2][1], expected.paper, lang)
    // Plus un mot des textes fixes français (le texte du produit, lui, est traduit par Shopify).
    assert.doesNotMatch(text(pratiqueOf(toile)), /En pratique|faut savoir|accrocher|Couleurs|toile|personne|jours/, lang)
    assert.doesNotMatch(toile, /L’histoire|Lire la suite|Réduire/, lang)
  }
})

/* ---------- Le modèle caché ---------- */

// Le modèle en page galerie : la fiche 3D depuis la bascule du 21/11/2026 (avant : le modèle caché product.oeuvre-galerie).
const MODEL = 'templates/product.oeuvre-3d.json'
const model = json(MODEL)
const placed = Object.entries(model.sections).find(([, section]) => section.type === 'galerie-histoire')
// Le modèle arrive par un second commit : Shopify refuse un modèle qui cite une section qu'il ne connaît pas encore.
const LATER = placed ? false : 'la section arrive dans le modèle par un second commit'
// Les blocs de la section dans le modèle, tels que Shopify les donne à la section.
const modelBlocks = () => placed[1].block_order.map((id) => ({ id, type: placed[1].blocks[id].type, settings: placed[1].blocks[id].settings }))
// Ce que la boutique dit déjà d'un poster (.scratch/fiche-3d/galerie/poster/textes.json) : les trois volets du poster.
const POSTER_TEXTS = {
  'Livraison, paiement & délais': "<p><strong>Livraison offerte partout.</strong> Aucun minimum, en colis suivi jusqu'à votre porte.</p><p>Votre poster est imprimé à la commande dans nos ateliers, puis contrôlé avant d'être expédié. Comptez 7 jours ouvrés.</p><p><strong>Paiement en 3 fois sans frais</strong> avec Klarna dès 50 €.</p>",
  'Détails du produit': "<p>Chaque poster est imprimé spécialement pour vous, en haute définition, sur un vrai papier photo de 250 g/m².</p><p>Sans cadre, il s'encadre avec un cadre standard du commerce, ou se pose tel quel. Avec cadre, il arrive encadré, sous verre et prêt à accrocher : blanc, noir, chêne vieilli ou noyer.</p>",
  'Retour et échange': "<p>Si votre poster arrivait endommagé ou ne correspondait pas à nos exigences de qualité, nous vous envoyons une nouvelle pièce sans aucun frais. Nous restons à vos côtés jusqu'à votre entière satisfaction.</p>",
}
// Les mots qui ne valent que pour une toile.
const CANVAS_WORDS = /toile|tableau|châssis|tendue|285|75 ans/i

// Le volet « Poster ou toile » finit, sur la fiche d'aujourd'hui, par une phrase qui ne vaut que pour un poster.
// Décision du 20/11/2026 : la toile a ce volet sans elle, le poster le garde entier. Deux blocs au lieu d'un commun.
const DECOUVRIR = '<p>Envie de la découvrir sur toile ? Utilisez la bascule <em>Poster / Toile</em> en haut de page pour voir la même œuvre en version durable.</p>'

test('le modèle caché : la section suit le bloc principal ; quatre volets pour la toile, quatre pour le poster', { skip: LATER }, () => {
  const [id, section] = placed
  assert.ok(model.order.indexOf(id) > model.order.indexOf('main'), 'après le bloc principal')
  assert.deepEqual(section.settings, {})
  assert.deepEqual(modelBlocks().map((b) => [b.type, b.settings.support, b.settings.heading]), [
    ['volet', 'toile', 'Poster ou toile : lequel choisir ?'],
    ['volet', 'poster', 'Poster ou toile : lequel choisir ?'],
    ['volet', 'toile', 'Livraison, paiement & délais'],
    ['volet', 'poster', 'Livraison, paiement & délais'],
    ['volet', 'toile', 'Détails du produit'],
    ['volet', 'poster', 'Détails du produit'],
    ['volet', 'toile', 'Retour et échange'],
    ['volet', 'poster', 'Retour et échange'],
  ])
  // Chaque bloc n'a que les réglages que la section connaît : Shopify refuse les autres.
  const known = schemaOf(SECTION).blocks[0].settings.map((s) => s.id).sort()
  for (const block of modelBlocks()) assert.deepEqual(Object.keys(block.settings).sort(), known, block.id)
})

test('le modèle caché : les volets de la toile sont ceux de la fiche d’aujourd’hui, à la lettre ; ceux du poster ne disent rien de la toile', { skip: LATER }, () => {
  // La fiche d'aujourd'hui : les quatre volets du bloc principal de product.oeuvre-3d.json, dans leur ordre.
  const today = mainOf(json('scripts/fixtures/product.oeuvre-3d.avant-galerie.json'))
  const tabs = today.block_order.map((id) => today.blocks[id]).filter((b) => b.type === 'collapsible_tab').map((b) => [b.settings.heading, b.settings.content])
  assert.equal(tabs.length, 4)
  const texts = (support) => modelBlocks().filter((b) => b.settings.support === 'tous' || b.settings.support === support).map((b) => [b.settings.heading, b.settings.content])
  // La toile : les quatre volets d'aujourd'hui, à la lettre, sauf la phrase qui ne vaut que pour un poster.
  assert.ok(tabs[0][1].endsWith(DECOUVRIR), 'la phrase est à la fin du volet commun d’aujourd’hui')
  assert.deepEqual(texts('toile'), [[tabs[0][0], tabs[0][1].slice(0, -DECOUVRIR.length)], ...tabs.slice(1)])
  // Le poster : le volet commun entier, phrase comprise, puis ses trois textes, ceux de la maquette validée.
  assert.deepEqual(texts('poster'), [tabs[0], ...Object.entries(POSTER_TEXTS)])
  for (const [heading, content] of Object.entries(POSTER_TEXTS)) assert.doesNotMatch(content, CANVAS_WORDS, heading)
  // Aucune note Trustpilot en chiffres dans ces textes.
  for (const block of modelBlocks()) assert.doesNotMatch(block.settings.content, /\d[.,]\d\s*(\/|sur)\s*5|\b\d{2,}\s*avis/, block.id)
})

test('rendu du modèle caché : une toile et un poster affichent chacun leurs quatre volets ; plus un mot de toile sur un poster', { skip: SKIP || LATER }, async () => {
  const TITLES = ['Poster ou toile : lequel choisir ?', 'Livraison, paiement &amp; délais', 'Détails du produit', 'Retour et échange']
  const toile = pratiqueOf(await render(TOILE, { blocks: modelBlocks() }))
  assert.deepEqual(voletsOf(toile).map(([heading]) => heading), TITLES)
  assert.match(text(toile), /sa toile est tendue à la main sur son châssis/)
  const poster = pratiqueOf(await render(POSTER, { poster: true, blocks: modelBlocks() }))
  assert.deepEqual(voletsOf(poster).map(([heading]) => heading), TITLES)
  assert.match(text(poster), /Votre poster est imprimé à la commande dans nos ateliers, puis contrôlé/)
  // Hors du volet qui compare le poster et la toile, la carte d'un poster ne dit plus rien d'une toile.
  const [, ...own] = voletsOf(poster)
  for (const [heading, content] of own) assert.doesNotMatch(content, CANVAS_WORDS, heading)
  assert.doesNotMatch(text(/<ul class="galerie-histoire-gages">[\s\S]*<\/ul>/.exec(poster)[0]), CANVAS_WORDS)
  // Le délai de retour n'est écrit nulle part ici, comme sur la fiche d'aujourd'hui, dont le volet « Retour et
  // échange » parle d'une pièce abîmée : il vient du réglage return_days du bloc principal (données Google, gardé dans
  // le modèle caché) et des questions fréquentes (ticket 23). Les seuls jours de la carte : la livraison et le service.
  for (const html of [toile, poster]) assert.deepEqual([...new Set([...text(html).matchAll(/(\d+)\s*jours/g)].map((m) => m[1]))], ['7'])
  assert.equal(mainOf(model).settings.return_days, 14)
  // Les sous-titres des textes d'aujourd'hui passent sous le titre de leur volet : le h2 de la carte, un h3 par
  // volet, et les sous-titres de « Détails du produit » (trois) et de « Retour et échange » (un) en h4.
  assert.deepEqual([...toile.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1])), [2, 3, 3, 3, 4, 4, 4, 3, 4])
  assert.match(toile, /<h4>Notre engagement qualité<\/h4>/)
  assert.deepEqual([...poster.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1])), [2, 3, 3, 3, 3])
})

test('rendu : les deux parties de la section sont nommées par leur titre, sous un identifiant propre à la section', { skip: SKIP }, async () => {
  // Brut, sans tight() : ses identifiants sont ce qu'on vérifie ici. Celui de la section, donné par Shopify, les rend uniques.
  const raw = (description, poster = false) => renderSectionFile(SECTION, { blocks: [] }, { ...product({ poster }), description }, { suffix: 'oeuvre-galerie' })
  const STORY = 'galerie-histoire-titre-template--1__galerie-histoire'
  const CARD = 'galerie-histoire-pratique-template--1__galerie-histoire'
  for (const [description, poster, heading] of [[TOILE, false, 'galerie-histoire-titre'], [POSTER, true, 'galerie-histoire-titre'], ['<p>Une description.</p>', false, 'galerie-histoire-surtitre']]) {
    const html = await raw(description, poster)
    // Le texte : son grand titre, ou « L'histoire » quand le texte n'en donne pas.
    assert.match(html, new RegExp(`<section class="galerie-histoire-recit" aria-labelledby="${STORY}">`))
    assert.match(html, new RegExp(`<h2 class="${heading}" id="${STORY}">`))
    // La carte : « Tout ce qu'il faut savoir ».
    assert.match(html, new RegExp(`<section class="galerie-histoire-pratique galerie-monte" aria-labelledby="${CARD}">`))
    assert.match(html, new RegExp(`<h2 class="galerie-histoire-pratique-titre" id="${CARD}">`))
    // Chaque identifiant n'est porté qu'une fois.
    for (const id of [STORY, CARD]) assert.equal(html.split(`id="${id}"`).length, 2, id)
  }
  // Sans description, seule la carte, toujours nommée.
  const alone = await raw('')
  assert.doesNotMatch(alone, /galerie-histoire-recit|galerie-histoire-titre-/)
  assert.match(alone, new RegExp(`aria-labelledby="${CARD}"`))
})

test('rendu de l’histoire : sans description, pas de colonne de texte', { skip: SKIP }, async () => {
  for (const description of ['', '  \n ', null]) {
    const html = await render(description)
    assert.doesNotMatch(html, /galerie-histoire-recit|L’histoire|<h2 class="galerie-histoire-(titre|surtitre)"/)
    assert.match(html, /^<div class="galerie galerie-bande galerie-histoire"><div class="galerie-histoire-colonnes"><section class="galerie-histoire-pratique galerie-monte">/)
  }
})
