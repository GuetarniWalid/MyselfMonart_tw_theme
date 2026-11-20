// La page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie, ticket 19) : le socle et la présentation.
// Un modèle caché, product.oeuvre-galerie, se voit avec ?view=oeuvre-galerie sur un produit du modèle oeuvre-3d :
// la scène 3D, la pilule et le fil d'Ariane d'aujourd'hui, puis la présentation de la maquette. Un réglage du bloc
// principal, « Page galerie », y accroche les styles (assets/oeuvre-galerie.css) et le script
// (assets/oeuvre-galerie.js) : jamais le nom du modèle. Réglage éteint, la fiche est celle de toujours.
// Ici, les contrats du code ; puis le rendu Liquid (liquidjs), quand le module est là : sans lui, ces tests-là sont
// sautés et le reste passe. Le banc les lance avec NODE_PATH vers un node_modules qui a liquidjs.
// Lancer : node --test scripts/oeuvre-galerie.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
// La lecture des fichiers du thème et le rendu Liquid : le banc partagé avec les tests des sections de la page.
const {
  ROOT, read, exists, code, json, schemaOf, SECTION, LANGS, rules, mainOf,
  SKIP, locales, engine, FLAT, OLD, MOTHER,
  product, globals, sectionOf, galerieSection, renderSection, renderSnippet, ldOf, blocksOf,
} = require('./galerie-banc.cjs')
const { motsDe } = require('../assets/oeuvre-galerie.js')

const INTRO = 'snippets/galerie-intro.liquid'
const REVIEWS = 'snippets/galerie-intro-avis.liquid'
const SHEET = 'snippets/galerie-intro-fiche.liquid'
// Les trois snippets de la présentation.
const PIECES = [INTRO, REVIEWS, SHEET]
const CSS = 'assets/oeuvre-galerie.css'
const JS = 'assets/oeuvre-galerie.js'
const MODEL = 'templates/product.oeuvre-galerie.json'
// Ce qui trahit la page galerie dans le HTML d'une fiche.
const TRACES = /data-galerie|oeuvre-galerie\.|class="[^"]*\bgalerie\b|galerie-[a-z]|<galerie-/

/* ---------- Le script de la page ---------- */

test('titres mot à mot : un texte se découpe en mots, un blanc entre deux mots devient une espace', () => {
  assert.deepEqual(motsDe('Superman explosif'), ['Superman', ' ', 'explosif'])
  assert.deepEqual(motsDe('\n  Deux\tmots  '), [' ', 'Deux', ' ', 'mots', ' '])
  assert.deepEqual(motsDe('Seul'), ['Seul'])
  assert.deepEqual(motsDe(''), [])
  // Une espace insécable ne coupe pas : « Pourquoi ? » reste d'un bloc, comme à l'écran.
  assert.deepEqual(motsDe('Pourquoi\u00a0? Ici'), ['Pourquoi\u00a0?', ' ', 'Ici'])
})

test('le script : des éléments personnalisés, définis une fois, qui ne comptent ni sur le chargement de la page ni sur un script en ligne', () => {
  // Le code du script, sans ses commentaires (ils disent ce qu'il ne faut pas faire).
  const js = read(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
  assert.match(js, /if \(customElements\.get\('galerie-mots'\)\) return;/)
  assert.match(js, /customElements\.define\('galerie-mots', /)
  assert.match(js, /connectedCallback\(\)/)
  assert.doesNotMatch(js, /DOMContentLoaded|addEventListener\('load'|readyState/)
  // Les mêmes conditions que la feuille : sans animation liée au défilement, ou en mouvements réduits, rien n'est découpé.
  assert.match(js, /connectedCallback\(\) {\s*if \(this\.decoupe \|\| !mouvementLie\(\)\) return;/)
  const linked = /const mouvementLie = \(\) =>([\s\S]*?);\n/.exec(js)[1]
  assert.match(linked, /!window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches &&/)
  assert.match(linked, /CSS\.supports\('animation-timeline: view\(\)'\) && CSS\.supports\('animation-range-start', 'contain 10svh'\)/)
  // Rien n'est posé pour plus tard : ni objet global, ni mode que ce ticket n'emploie pas.
  assert.doesNotMatch(js, /window\.\w+ = /)
  // Un titre découpé se lit d'une traite : son texte entier pour les lecteurs d'écran, ses mots cachés pour eux.
  assert.match(js, /className = 'sr-only'/)
  assert.match(js, /setAttribute\('aria-hidden', 'true'\)/)
  // La feuille tient pendant la bascule Toile / Poster : une copie dans <head> du <link> que le bloc principal
  // porte en premier enfant (trouvé par le crochet, pas par un nom de fichier).
  assert.match(js, /document\.querySelector\('main-product-blocks\[data-galerie\] > link\[rel="stylesheet"\]'\)/)
  assert.match(js, /document\.head\.append\(feuille\.cloneNode\(\)\)/)
  // Aucun script en ligne dans la présentation : après la bascule Toile / Poster, il ne serait pas rejoué.
  for (const file of PIECES) assert.doesNotMatch(code(file), /<script(?![^>]*\bsrc=)/, file)
})

/* ---------- La feuille de la page ---------- */

const sheet = () => rules(read(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))

test('la feuille : les couleurs et la typo de la maquette, posées une fois sur la page qui porte le crochet', () => {
  const tokens = sheet().find((r) => r.head === ':root:has(main-product-blocks[data-galerie])' && !r.context.length)
  assert.ok(tokens, 'les variables, sur la page qui a un bloc principal data-galerie')
  const value = (name) => (new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens.body) || [])[1]
  // L'encre et le saumon sont les couleurs du thème (réglages main_color et brand_color) ; les aplats, ceux de la maquette.
  assert.equal(value('encre'), 'rgb(var(--color-main-rgb))')
  assert.equal(value('encre-70'), 'rgba(var(--color-main-rgb), 0.72)')
  // 0,58 dans la maquette : un rien trop pâle pour un petit texte sur blanc (test du contraste, plus bas).
  assert.equal(value('encre-55'), 'rgba(var(--color-main-rgb), 0.6)')
  assert.equal(value('encre-12'), 'rgba(var(--color-main-rgb), 0.12)')
  assert.equal(value('encre-06'), 'rgba(var(--color-main-rgb), 0.06)')
  assert.equal(value('saumon'), 'rgb(var(--color-buy-button-rgb))')
  assert.equal(value('terra'), 'rgb(var(--color-terra-rgb))')
  const APLATS = { blanc: '#ffffff', creme: '#f7f2ea', ciel: '#a5d3f7', rose: '#ffb6d2', soleil: '#ffdd6e', menthe: '#b9e9d0', lilas: '#d9c9ff', peche: '#ffcaa8', chene: '#ead3ab', sauge: '#cbdcbc', 'ciel-pale': '#cde3f6', poudre: '#f8d2dd', corail: '#ff5436', achat: '#d8361b', 'achat-texte': '#ffffff', etoile: '#00b67a', 'etoile-vide': '#dcdce6' }
  for (const [name, hex] of Object.entries(APLATS)) assert.equal(value(name), hex, `--${name}`)
  assert.equal(value('pied-fond'), 'var(--menthe)')
  assert.equal(value('pied-encre'), 'var(--encre)')
  assert.equal(value('annonce-fond'), 'var(--peche)')
  assert.equal(value('annonce-encre'), 'var(--encre)')
  assert.equal(value('sans'), '"Albert Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif')
  assert.equal(value('gout'), 'max(20px, env(safe-area-inset-left, 0px))')
  assert.equal(value('goutd'), 'max(20px, env(safe-area-inset-right, 0px))')
  // Sur ordinateur (900 px, comme la maquette), les marges passent à 48 px.
  const large = sheet().find((r) => r.head === ':root:has(main-product-blocks[data-galerie])' && r.context.join() === '@media (min-width: 900px)')
  assert.match(large.body, /--gout:\s*max\(48px, env\(safe-area-inset-left, 0px\)\);/)
  assert.match(large.body, /--goutd:\s*max\(48px, env\(safe-area-inset-right, 0px\)\);/)
})

test('la feuille : chaque règle porte le crochet ou un nom « galerie », rien ne déborde sur le reste du site', () => {
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '')
  for (const { head } of sheet()) {
    if (/^@keyframes /.test(head)) {
      assert.match(head, /^@keyframes galerie-[a-z-]+$/, head)
      continue
    }
    for (const selector of head.split(',')) assert.match(selector, /galerie/, `sélecteur « ${selector.trim()} »`)
  }
  // Ni police, ni import, ni adresse : Albert Sans est déclarée par la scène 3D seule (scripts/oeuvre-3d-police.test.cjs).
  assert.doesNotMatch(css, /@font-face|@import|url\(/)
  // Le crochet est le réglage (data-galerie), jamais le nom du modèle.
  assert.doesNotMatch(css, /data-layout|oeuvre-galerie|data-template/)
})

test('la feuille : aucun mouvement hors « mouvements voulus » et hors des navigateurs qui lient une animation au défilement', () => {
  const MOTION = '@media (prefers-reduced-motion: no-preference)'
  const LINKED = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
  const animated = sheet().filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  assert.ok(animated.length >= 2, 'le titre mot à mot et la fiche qui monte')
  for (const r of animated) assert.deepEqual(r.context, [MOTION, LINKED], r.head)
  // Les mots arrivent l'un après l'autre (--i, posé par le script), la fiche monte : seulement transform et opacity.
  const word = animated.find((r) => r.head === 'galerie-mots .galerie-mot')
  assert.match(word.body, /animation: galerie-mot linear both;\s*animation-timeline: view\(\);\s*animation-range: cover calc\(1% \+ var\(--i\) \* 2\.4%\) cover calc\(16% \+ var\(--i\) \* 2\.4%\);/)
  const rise = animated.find((r) => r.head === '.galerie-monte')
  assert.match(rise.body, /animation: galerie-monte linear both;\s*animation-timeline: view\(\);\s*animation-range: cover 0% cover 22%;/)
  for (const frames of sheet().filter((r) => /^@keyframes /.test(r.head))) {
    const properties = [...frames.body.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1])
    assert.deepEqual([...new Set(properties)].sort(), ['opacity', 'transform'], frames.head)
  }
})

test('la feuille : les mesures de la présentation sont celles de la maquette', () => {
  const css = sheet()
  const body = (head, context = '') => {
    const found = css.find((r) => r.head === head && r.context.join() === context)
    assert.ok(found, `règle « ${head} »${context ? ` dans ${context}` : ''}`)
    return found.body.replace(/\s+/g, ' ').trim()
  }
  const LARGE = '@media (min-width: 900px)'
  // La bande : blanche, 40 et 52 px ; 72 et 84 px sur ordinateur. La section qui la porte n'ajoute rien dessous.
  assert.equal(body('main-product-blocks[data-galerie]'), 'background: var(--blanc); padding-top: 40px; padding-bottom: 52px;')
  assert.equal(body('main-product-blocks[data-galerie]', LARGE), 'padding-top: 72px; padding-bottom: 84px;')
  assert.equal(body('.tw-main-product-image:has(main-product-blocks[data-galerie])'), 'padding-bottom: 0;')
  // La grille : 1240 px au plus, l'un sous l'autre à 34 px ; sur ordinateur, 7 parts et 4 parts à 70 px, alignées en bas.
  assert.equal(body('.galerie-intro'), 'max-width: 1240px; margin-inline: auto; display: grid; gap: 34px;')
  assert.equal(body('.galerie-intro', LARGE), 'grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); gap: 70px; align-items: end;')
  // La typo : une seule police, le nom court en maigre de 56 à 138 px, le h1 de 17 à 22 px.
  assert.match(body('.galerie-court'), /^margin: 18px 0 0; font: 300 clamp\(56px, 17vw, 138px\)\/0\.88 var\(--sans\); letter-spacing: -0\.058em; text-wrap: balance;/)
  assert.equal(body('.galerie-court b'), 'font-weight: 700;')
  assert.equal(body('.galerie-titre'), 'margin: 20px 0 0; font: 400 clamp(17px, 4.6vw, 22px)/1.32 var(--sans); letter-spacing: -0.012em; color: var(--encre-70); max-width: 30em; text-wrap: balance;')
  assert.equal(body('.galerie-surtitre a'), 'text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 999px; background: var(--soleil); color: var(--encre); letter-spacing: 0.06em;')
  assert.equal(body('.galerie-avis'), 'margin-top: 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; font: 500 13.5px/1 var(--sans);')
  // La fiche : une ligne par définition, son libellé sur 7,6 em, une pastille de couleur par ligne.
  assert.equal(body('.galerie-fiche div'), 'display: grid; grid-template-columns: 7.6em 1fr; gap: 14px; padding-block: 13px; border-top: 1px solid var(--encre-12); align-items: baseline;')
  assert.equal(body('.galerie-fiche dd'), 'margin: 0; font: 500 16.5px/1.3 var(--sans); letter-spacing: -0.012em;')
  assert.match(body('.galerie-fiche dt::before'), /background: var\(--ciel\);$/)
  for (const [n, color] of [[2, 'rose'], [3, 'soleil'], [4, 'menthe'], [5, 'lilas']]) assert.equal(body(`.galerie-fiche div:nth-child(${n}) dt::before`), `background: var(--${color});`)
})

test('la feuille : le nom court ne sort ni de l’écran ni de sa colonne', () => {
  const court = sheet().filter((r) => r.head === '.galerie-court')
  const base = court.find((r) => !r.context.length)
  const large = court.find((r) => r.context.join() === '@media (min-width: 900px)')
  // Un mot plus large que sa place passe à la ligne au lieu d'être coupé par le bord de l'écran.
  assert.match(base.body, /overflow-wrap:\s*anywhere;/)
  // Ordinateur : il peut déborder dans la gouttière de 70 px, de 50 px au plus ; et il grandit avec l'écran entre
  // 900 px et la largeur où il atteint les 138 px de la maquette, avant 1024 px.
  assert.match(large.body, /margin-right:\s*-50px;/)
  const size = /font-size:\s*clamp\(56px, ([\d.]+)vw, 138px\);/.exec(large.body)
  assert.ok(size, 'la taille du nom court sur ordinateur')
  assert.ok(138 / (size[1] / 100) < 1024, 'les 138 px de la maquette sont atteints avant 1024 px de large')
  assert.ok(900 * (size[1] / 100) < 138, 'à 900 px de large, le nom est plus petit')
})

test('la feuille : le focus se voit, sur le fond clair de la page, et un lien se reconnaît à son trait', () => {
  const focus = sheet().find((r) => r.head === ':where(.galerie) *:focus-visible')
  assert.ok(focus, 'un contour de focus pour toute partie de la page')
  assert.match(focus.body, /outline:\s*2px solid var\(--encre\);/)
  assert.match(focus.body, /outline-offset:\s*3px;/)
  // Le mot « Trustpilot » mène à la page des avis : souligné, comme sur la fiche de toujours.
  assert.match(sheet().find((r) => r.head === '.galerie-avis-texte a').body, /text-decoration:\s*underline;/)
})

test('la feuille : aucune couleur ne s’écrit hors de ses variables', () => {
  const TOKENS = ':root:has(main-product-blocks[data-galerie])'
  for (const { head, body, context } of sheet()) {
    if (head === TOKENS && !context.length) continue
    assert.doesNotMatch(body, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, `${head} : une couleur écrite en dur`)
  }
})

test('la feuille et le script : un bloc par partie de la page, entre deux repères « début » et « fin »', () => {
  for (const file of [CSS, JS]) {
    const source = read(file)
    const marks = [...source.matchAll(/\/\* === (.+?) \(ticket (\d+)\) : (début|fin) ===/g)].map((m) => ({ name: m[1], ticket: m[2], side: m[3], start: m.index, end: source.indexOf('*/', m.index) + 2 }))
    assert.ok(marks.length >= 2 && marks.length % 2 === 0, `${file} : des repères, par paires`)
    for (let i = 0; i < marks.length; i += 2) {
      assert.equal(`${marks[i].side}, ${marks[i + 1].side}`, 'début, fin', `${file} : « ${marks[i].name} »`)
      assert.equal(`${marks[i + 1].name} (${marks[i + 1].ticket})`, `${marks[i].name} (${marks[i].ticket})`, `${file} : le même nom au début et à la fin`)
    }
    // Rien hors des blocs : l'en-tête du fichier avant le premier, des blancs entre deux blocs et après le dernier.
    const outside = [source.slice(0, marks[0].start)]
    for (let i = 1; i < marks.length; i += 2) outside.push(source.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : source.length))
    for (const part of outside) assert.equal(part.replace(/\/\*[\s\S]*?\*\//g, '').trim(), '', `${file} : du code hors d’un bloc`)
  }
})

/* La maquette écrit en Albert Sans de 300 à 800 (Google Fonts). Le thème sert 500, 600 et 700 pour la scène 3D, et
   300 et 400 pour cette page depuis le 20/11/2026 (scripts/oeuvre-3d-police.test.cjs) : le nom court « maigre » et
   le h1 ont leur graisse. Une graisse que la feuille demanderait sans que le thème la serve sortirait dans la plus
   proche : ce test le signale (« todo »), sans faire échouer la suite. */
test('police : chaque graisse que la feuille demande est servie par le thème', (t) => {
  const asked = new Set()
  for (const { body } of sheet()) {
    for (const m of body.matchAll(/font:\s*(\d{3})\s/g)) asked.add(Number(m[1]))
    for (const m of body.matchAll(/font-weight:\s*(\d{3})/g)) asked.add(Number(m[1]))
  }
  assert.ok(asked.has(300) && asked.has(700), 'la feuille demande bien du maigre et du gras')
  // Les @font-face d'Albert Sans du thème : une graisse, ou une plage (police variable).
  const served = []
  for (const dir of ['layout', 'sections', 'snippets', 'assets']) {
    for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((n) => /\.(liquid|css)$/.test(n))) {
      const faces = read(`${dir}/${name}`).replace(/{{[\s\S]*?}}/g, '').match(/@font-face\s*{[^}]*}/g) || []
      for (const face of faces.filter((f) => /Albert Sans/.test(f))) {
        const weight = /font-weight:\s*(\d+)(?:\s+(\d+))?/.exec(face)
        if (weight) served.push([Number(weight[1]), Number(weight[2] || weight[1])])
      }
    }
  }
  assert.ok(served.length >= 3, 'les graisses de la scène 3D')
  const missing = [...asked].filter((w) => !served.some(([from, to]) => w >= from && w <= to)).sort()
  if (missing.length) t.todo(`Albert Sans ${missing.join(' et ')} : graisses demandées par la feuille, que le thème ne sert pas (fichiers woff2 et @font-face à poser)`)
})

test('la feuille : les textes de la présentation se lisent sur blanc (contraste AA, 4,5 pour 1)', () => {
  // L'encre est la couleur principale du thème (réglage main_color) ; un texte gris est cette encre, en partie
  // transparente, sur le blanc de la bande.
  const hex = json('config/settings_data.json').current.main_color
  const ink = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const linear = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  const onWhite = (alpha) => 1.05 / (luminance(ink.map((c) => 255 + (c - 255) * alpha)) + 0.05)
  const tokens = sheet().find((r) => r.head === ':root:has(main-product-blocks[data-galerie])' && !r.context.length).body
  const alpha = (name) => Number(new RegExp(`--${name}:\\s*rgba\\(var\\(--color-main-rgb\\), ([\\d.]+)\\);`).exec(tokens)[1])
  // Les deux gris qui portent du texte : le h1 (encre-70) et les libellés de la fiche (encre-55).
  const color = (head) => /(?:^|;)\s*color:\s*var\(--([\w-]+)\);/.exec(sheet().find((r) => r.head === head).body)[1]
  assert.equal(color('.galerie-titre'), 'encre-70')
  assert.equal(color('.galerie-fiche dt'), 'encre-55')
  for (const name of ['encre-70', 'encre-55']) assert.ok(onWhite(alpha(name)) >= 4.5, `--${name} : ${onWhite(alpha(name)).toFixed(2)} pour 1`)
  // Le calcul est le bon : l'encre pleine sur blanc, et le 0,58 de la maquette, juste en dessous du seuil.
  assert.ok(onWhite(1) > 15)
  assert.ok(onWhite(0.58) < 4.5)
})

test('la feuille commune du site ne porte rien de la page galerie', () => {
  assert.doesNotMatch(read('input.css'), /galerie-|data-galerie/)
  // Les classes de la présentation sont celles de la page, plus « like », que lit le cœur de la fiche
  // (assets/my-like-button.js) : Tailwind n'a rien de neuf à compiler.
  for (const file of PIECES) {
    const classes = [...code(file).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
    for (const name of classes) assert.match(name, /^(galerie(-[a-z]+)*|like)$/, `${file} : classe « ${name} »`)
  }
})

/* ---------- Le bloc principal ---------- */

test('réglage « Page galerie » : une case du bloc principal, éteinte par défaut', () => {
  const setting = schemaOf(SECTION).settings.find((s) => s.id === 'page_galerie')
  assert.ok(setting, 'réglage page_galerie')
  assert.equal(setting.type, 'checkbox')
  assert.equal(setting.default, false)
})

test('bloc « fiche en cinq lignes » : un type de bloc du bloc principal, un seul par page', () => {
  const block = schemaOf(SECTION).blocks.find((b) => b.type === 'fact_sheet')
  assert.ok(block, 'bloc fact_sheet')
  assert.equal(block.limit, 1)
  assert.ok(block.name.length <= 25, 'Shopify limite le nom d’un bloc à 25 caractères')
})

test('le crochet : data-galerie sur main-product-blocks, si la case est cochée et que la scène 3D est là', () => {
  const section = code(SECTION)
  assert.match(section, /{%-\s*assign page_galerie = false\s*-%}\s*{%-\s*if section\.settings\.page_galerie and stage_3d\s*-%}{%-\s*assign page_galerie = true\s*-%}{%-\s*endif\s*-%}/)
  const tag = /<main-product-blocks[\s\S]*?>\s*{%-/.exec(section)[0]
  assert.match(tag, /{% if page_galerie %} data-galerie{% endif %}>/)
  // Sa base de typo et ses marges : les classes communes à toutes les parties de la page.
  assert.match(tag, /class="{% if stage_3d %}block{% else %}grow{% endif %}{% if page_galerie %} galerie galerie-bande{% endif %}"/)
  // Le réglage ne se lit qu'une fois : tout le reste passe par la variable.
  assert.equal(section.match(/section\.settings\.page_galerie/g).length, 1)
})

test('rien ne s’accroche au nom du modèle : la section, la présentation et le script ne le citent pas', () => {
  for (const file of [SECTION, ...PIECES]) assert.doesNotMatch(code(file), /oeuvre-galerie(?!\.(css|js))/, file)
  assert.doesNotMatch(read(JS).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /oeuvre-galerie|data-layout|data-template/)
})

test('règle unique : oeuvre-galerie est nommé une fois dans artwork-kind, sur la ligne de oeuvre-3d', () => {
  const kind = code('snippets/artwork-kind.liquid')
  assert.match(kind, /when 'oeuvre-3d', 'oeuvre-galerie'\s+if product\.metafields\.painting_options\.frames_poster != blank\s+echo 'poster'\s+else\s+echo 'toile'\s+endif/)
  assert.equal(kind.match(/oeuvre-galerie/g).length, 1)
  // Hors de la règle, seuls le fil d'Ariane et le bouton du panier nomment un modèle : une fois chacun.
  const named = []
  for (const dir of ['sections', 'snippets', 'layout']) {
    for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.liquid'))) {
      const count = (code(`${dir}/${name}`).match(/'oeuvre-galerie'/g) || []).length
      if (count) named.push(`${dir}/${name}:${count}`)
    }
  }
  assert.deepEqual(named.sort(), ['sections/breadcrumb.liquid:1', 'snippets/artwork-kind.liquid:1', 'snippets/open-cart-drawer-button.liquid:1'])
})

/* ---------- Les textes ---------- */

const intro = (lang) => json(`locales/${LANGS[lang]}`).sections.mma.galerie.intro

test('textes de la présentation : sous sections.mma.galerie.intro, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const fr = intro('fr')
  const keys = Object.keys(fr).sort()
  assert.deepEqual(keys, ['delivery', 'delivery_value', 'frame', 'frame_value', 'like', 'liked', 'making', 'making_value', 'sizes', 'sizes_one', 'sizes_range', 'stretcher', 'stretcher_value', 'support', 'support_canvas', 'support_poster'])
  // Les textes de la maquette.
  assert.equal(fr.support_canvas, 'Toile d’art tendue à la main')
  assert.equal(fr.stretcher_value, 'Bois massif, 2 cm')
  assert.equal(fr.support_poster, 'Papier photo 250 g/m²')
  assert.equal(fr.frame_value, 'En option : blanc, noir, chêne vieilli ou noyer')
  assert.equal(fr.making_value, 'Conçu en France, imprimé en Europe')
  assert.equal(fr.delivery_value, 'Offerte, sous 7 jours ouvrés')
  for (const lang of Object.keys(LANGS)) {
    const texts = intro(lang)
    assert.deepEqual(Object.keys(texts).sort(), keys, lang)
    for (const [key, text] of Object.entries(texts)) {
      assert.equal(typeof text, 'string', `${lang}.${key}`)
      assert.ok(text.trim().length > 0, `${lang}.${key} : vide`)
      // « {{ size }} cm » s'écrit pareil partout ; tout le reste se traduit.
      if (lang !== 'fr' && key !== 'sizes_one') assert.notEqual(text, fr[key], `${lang}.${key} : resté en français`)
    }
    assert.match(texts.sizes_range, /{{ first }}.*{{ last }}/, `${lang} : les deux tailles`)
    assert.match(texts.sizes_one, /{{ size }}/, `${lang} : la taille`)
  }
  // Aucune promesse « fabriqué en France » : conçu en France, imprimé en Europe.
  assert.match(intro('en').making_value, /Designed in France, printed in Europe/)
})

/* ---------- Le modèle caché ---------- */


test('le modèle caché : le fil d’Ariane puis le bloc principal de la fiche 3D, en page galerie, sans volets ni description', { skip: exists(MODEL) ? false : 'le modèle arrive par un second commit : Shopify refuse un modèle dont il ne connaît pas encore le réglage' }, () => {
  const galerie = json(MODEL)
  const fiche3d = json('templates/product.oeuvre-3d.json')
  // Les sections qui suivent le bloc principal sont celles de la page galerie (tickets 20 à 24), chacune dans
  // son fichier sections/galerie-….liquid : elles s'ajoutent ici sans que ce test change.
  const sectionTypes = galerie.order.map((id) => galerie.sections[id].type)
  assert.deepEqual(sectionTypes.slice(0, 2), ['breadcrumb', 'main-product'])
  for (const type of sectionTypes.slice(2)) assert.match(type, /^galerie-/)
  assert.equal(galerie.layout, 'product')
  const main = mainOf(galerie)
  // Les réglages de la fiche 3D (scène, bascule, données Google), plus la page galerie.
  assert.deepEqual(main.settings, { ...mainOf(fiche3d).settings, page_galerie: true })
  const types = main.block_order.map((id) => main.blocks[id].type)
  assert.deepEqual([...types].sort(), ['buy', 'fact_sheet', 'short_title', 'title', 'trustpilot_review', 'variant_picker'])
  // Le bloc principal s'appelle « main », comme sur la fiche 3D : Shopify et les scripts le trouvent par ce nom.
  assert.ok(galerie.sections.main)
})


/* -- Le modèle caché marche comme la fiche 3D -- */

test('rendu de la règle unique : oeuvre-galerie répond comme oeuvre-3d, toile ou poster d’après le produit', { skip: SKIP }, async () => {
  const kind = (suffix, p, unique = false) => engine().parseAndRender(`{% render 'artwork-kind', product: product, suffix: suffix, image_unique: unique %}`, { suffix, unique }, { globals: globals(p) })
  for (const unique of [false, true]) {
    assert.equal(await kind('oeuvre-galerie', product(), unique), 'toile')
    assert.equal(await kind('oeuvre-galerie', product({ poster: true }), unique), 'poster')
    assert.equal(await kind('oeuvre-3d', product(), unique), 'toile')
    assert.equal(await kind('oeuvre-3d', product({ poster: true }), unique), 'poster')
  }
  // Les autres modèles ne changent pas.
  assert.equal(await kind('painting', product()), 'toile')
  assert.equal(await kind('painting', product(), true), '')
  assert.equal(await kind('poster', product({ poster: true })), 'poster')
  assert.equal(await kind('personalized', product()), '')
  assert.equal(await kind('galerie', product()), '')
})

test('rendu du fil d’Ariane : la capsule de la fiche 3D dans la vue galerie, avec la même liste pour Google', { skip: SKIP }, async () => {
  const source = read('sections/breadcrumb.liquid')
  const body = source.slice(0, source.indexOf('{% schema %}'))
  const crumb = (name, suffix) => engine().parseAndRender(body, {}, { globals: { ...globals(product(), { name, suffix }), collection: { title: 'Tableau Zen', url: '/collections/tableau-zen', handle: 'tableau-zen', metafields: { custom: {}, breadcrumb: {} } } } })
  const galerie = await crumb('product', 'oeuvre-galerie')
  const fiche3d = await crumb('product', 'oeuvre-3d')
  assert.match(galerie, /<oeuvre-3d-crumb class="oeuvre-3d-crumb">/)
  assert.doesNotMatch(galerie, /<breadcrumb-popup>/)
  assert.equal(galerie, fiche3d, 'la même capsule et la même liste que sur la fiche 3D')
  assert.equal(ldOf(galerie).length, 1)
  assert.equal(JSON.parse(ldOf(galerie)[0])['@type'], 'BreadcrumbList')
  // Ailleurs, le fil de toujours : une autre fiche produit, et une collection qui porterait ce nom de modèle.
  for (const [name, suffix] of [['product', 'painting'], ['product', null], ['collection', 'oeuvre-galerie']]) {
    const html = await crumb(name, suffix)
    assert.match(html, /<breadcrumb-popup>/, `${name}.${suffix}`)
    assert.doesNotMatch(html, /<oeuvre-3d-crumb/, `${name}.${suffix}`)
  }
})

test('rendu du bouton du panier : le dessin de la pilule dans la vue galerie, le dessin de toujours ailleurs', { skip: SKIP }, async () => {
  const button = (suffix) => renderSnippet('open-cart-drawer-button', {}, null, { suffix })
  assert.match(await button('oeuvre-galerie'), /class="cart-fab cart-fab--pilule"/)
  assert.equal(await button('oeuvre-galerie'), await button('oeuvre-3d'))
  for (const suffix of ['painting', 'poster', null]) assert.doesNotMatch(await button(suffix), /cart-fab/, String(suffix))
})

test('rendu de la scène : la bascule Toile / Poster garde la vue de test dans l’adresse du jumeau', { skip: SKIP }, async () => {
  const p = product()
  const stage = await renderSnippet('oeuvre-3d-stage', { product: p, start_from: 3 }, p, { suffix: 'oeuvre-galerie' })
  const config = JSON.parse(/<script type="application\/json" data-config>([\s\S]*?)<\/script>/.exec(stage)[1])
  assert.equal(config.view, 'oeuvre-galerie')
  // La scène ajoute cette vue à l'adresse du jumeau (assets/component-oeuvre-3d.js, toTwin).
  assert.match(read('assets/component-oeuvre-3d.js'), /url\.searchParams\.set\('view', this\.config\.view\);/)
})

/* -- Réglage éteint : la fiche de toujours -- */

/* Pour prouver qu'un changement de la section laisse les fiches de toujours à l'octet près : relever leur HTML dans
   deux copies du thème, puis comparer les deux dossiers.
     RELEVE_FICHES=<dossier> node --test scripts/oeuvre-galerie.test.cjs    (dans chaque copie, avec liquidjs)
     diff -r <dossier d'avant> <dossier d'après>
   Le relevé écrit, pour chaque modèle produit, la section entière (fiche et données Google) d'une toile et d'un
   poster. */
const RELEVE = process.env.RELEVE_FICHES

test('rendu, réglage éteint : aucune trace de la page galerie, sur aucun modèle produit', { skip: SKIP }, async () => {
  const models = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^product.*\.json$/.test(name) && `templates/${name}` !== MODEL)
  assert.ok(models.length >= 13, 'tous les modèles produit du thème')
  if (RELEVE) fs.mkdirSync(RELEVE, { recursive: true })
  for (const name of models) {
    const suffix = name.replace(/^product\.?/, '').replace(/\.json$/, '') || null
    const section = sectionOf(`templates/${name}`)
    assert.ok(!section.settings.page_galerie, `${name} : la case reste éteinte`)
    for (const poster of RELEVE || suffix === 'oeuvre-3d' ? [false, true] : [suffix === 'poster']) {
      const p = product({ suffix, poster, files: suffix === 'oeuvre-3d' ? [FLAT] : OLD })
      const html = await renderSection(p, { section })
      if (RELEVE) fs.writeFileSync(path.join(RELEVE, `${name}.${poster ? 'poster' : 'toile'}.html`), html)
      assert.doesNotMatch(html, TRACES, name)
      assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${name} : un seul h1`)
    }
  }
})

test('rendu, réglage éteint : la fiche 3D garde son balisage empilé, blancs compris', { skip: SKIP }, async () => {
  const blocks = blocksOf(await renderSection(product(), { section: sectionOf('templates/product.oeuvre-3d.json') }))
  assert.match(blocks, /^<main-product-blocks\s+class="block"\s+id="ProductInfo-template--1__main"\s+data-layout="oeuvre-3d" data-buy-pill><div class="max-w-lg sm:px-0 mx-auto my-4"><div class="mb-4 mx-4">/)
  // Le seul blanc que la section écrit entre deux blocs : celui qui suit la note Trustpilot, tel quel.
  assert.match(blocks, /<p class="flex items-center ml-2 text-main-70">Score: 4,2<\/p>\n {14}<\/div>\n {12}<\/div>\n {12}<div class="flex justify-between items-center mb-2 mx-4"><p class="font-heading font-semibold text-xl"><span class="title-highlight">Bonsaï zen<\/span><\/p>/)
  assert.match(blocks, /<h1 class="text-xs font-normal text-brand-700 leading-relaxed tracking-wide mb-2 mx-4">Tableau Bonsaï zen - Sérénité &amp; équilibre<\/h1>/)
})

test('rendu, case cochée sans scène 3D : la fiche de toujours, à l’octet près', { skip: SKIP }, async () => {
  // Un modèle en galerie de photos, une œuvre sans image à plat : la case n'a aucun effet.
  for (const [file, p] of [
    ['templates/product.painting.json', product({ suffix: 'painting', files: OLD })],
    ['templates/product.poster.json', product({ suffix: 'poster', poster: true, files: OLD })],
    ['templates/product.json', product({ suffix: null, files: OLD })],
    ['templates/product.oeuvre-3d.json', product({ files: [] })],
  ]) {
    const off = await renderSection(p, { section: sectionOf(file) })
    const on = await renderSection(p, { section: sectionOf(file, { settings: { page_galerie: true } }) })
    assert.equal(on, off, file)
    assert.doesNotMatch(on, TRACES, file)
  }
  // Le bloc « fiche en cinq lignes », posé sur une fiche qui n'est pas en page galerie, ne rend rien.
  const p = product({ suffix: 'painting', files: OLD })
  const plain = await renderSection(p, { section: sectionOf('templates/product.painting.json') })
  const withSheet = await renderSection(p, { section: sectionOf('templates/product.painting.json', { blocks: (list) => [...list, { id: 'fact_sheet', type: 'fact_sheet', settings: {} }] }) })
  assert.equal(withSheet, plain)
})

/* -- La page galerie -- */

test('rendu de la page galerie : le crochet, puis la feuille et le script dans le bloc principal', { skip: SKIP }, async () => {
  const html = await renderSection(product(), { suffix: 'oeuvre-galerie', section: galerieSection() })
  const blocks = tight(blocksOf(html))
  assert.match(blocks, /^<main-product-blocks\s+class="block galerie galerie-bande"\s+id="ProductInfo-template--1__main"\s+data-layout="oeuvre-galerie" data-buy-pill data-galerie>/)
  // Dans le bloc : la bascule Toile / Poster les remplace avec lui, et la scène s'affiche sans les attendre.
  assert.match(blocks, /^<main-product-blocks[^>]*><link href="[^"]*\/oeuvre-galerie\.css\?v=1" rel="stylesheet" type="text\/css" media="all" \/><script src="[^"]*\/oeuvre-galerie\.js\?v=1" defer="defer"><\/script><div class="galerie-blocs">/)
  assert.equal(html.match(/oeuvre-galerie\.css/g).length, 1)
  assert.equal(html.match(/oeuvre-galerie\.js/g).length, 1)
  assert.ok(html.indexOf('</oeuvre-3d>') < html.indexOf('oeuvre-galerie.css'), 'après la scène 3D')
})

test('rendu de la page galerie : un seul h1, le titre du produit, le même que sur la fiche 3D', { skip: SKIP }, async () => {
  for (const poster of [false, true]) {
    const p = product({ poster })
    const galerie = await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() })
    const fiche3d = await renderSection(p, { section: sectionOf('templates/product.oeuvre-3d.json') })
    const h1 = (html) => [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1])
    assert.deepEqual(h1(galerie), [p.title.replace('&', '&amp;')])
    assert.deepEqual(h1(galerie), h1(fiche3d))
    assert.match(galerie, /<h1 class="galerie-titre">/)
  }
})

test('rendu de la page galerie : les données Google sont celles de la fiche 3D, note comprise', { skip: SKIP }, async () => {
  for (const poster of [false, true]) {
    const p = product({ poster })
    const galerie = ldOf(await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() }))
    const fiche3d = ldOf(await renderSection(p, { section: sectionOf('templates/product.oeuvre-3d.json') }))
    assert.equal(galerie.length, 1)
    assert.deepEqual(galerie, fiche3d)
    const [group] = JSON.parse(galerie[0])
    assert.equal(group['@type'], 'ProductGroup')
    assert.deepEqual(group.aggregateRating, { '@type': 'AggregateRating', ratingValue: '4.2', ratingCount: '86', worstRating: '1', bestRating: '5' })
  }
})

test('rendu de la page galerie : la scène 3D, la pilule, l’achat et le sélecteur cachés sont ceux de la fiche 3D', { skip: SKIP }, async () => {
  for (const poster of [false, true]) {
    const p = product({ poster })
    const galerie = await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() })
    const fiche3d = await renderSection(p, { section: sectionOf('templates/product.oeuvre-3d.json') })
    // Tout ce qui précède le bloc principal : la scène, la pilule. Seul le nom de la vue change (adresse du jumeau, mesure).
    const before = (html) => html.slice(0, html.indexOf('<main-product-blocks'))
    assert.equal(before(galerie).replaceAll('oeuvre-galerie', 'oeuvre-3d'), before(fiche3d))
    // L'achat et le sélecteur de la fiche, cachés, que la pilule et les chips pilotent : du bloc d'achat à la fin du
    // sélecteur, que suit le premier volet sur la fiche 3D et la présentation en page galerie.
    const hidden = (html, next) => {
      const blocks = blocksOf(html)
      const start = blocks.indexOf('<div class="relative hidden ')
      const end = blocks.indexOf(next)
      assert.ok(start > 0 && end > start, `le bloc d’achat caché, puis ${next}`)
      return blocks.slice(start, end)
    }
    const kept = hidden(galerie, '<div class="galerie-intro">')
    assert.equal(kept.replaceAll('oeuvre-galerie', 'oeuvre-3d'), hidden(fiche3d, '<details class="accordion'))
    assert.match(kept, /<button\s+class="buy-button cart-button/)
    assert.match(kept, /<div class="hidden" data-oeuvre-3d-picker>/)
    assert.match(kept, /<script type="application\/json" id="variants-data-json">/)
    // Plus de volets, de description ni d'arguments, ni le balisage empilé des trois blocs repris par la présentation.
    assert.doesNotMatch(blocksOf(galerie), /<details|product-description|shop-arguments|title-highlight|text-brand-700|bg-main-10 h-8 w-8/)
  }
})

/* -- La présentation -- */

// Le balisage sans les blancs entre deux balises (ils ne comptent pas : grilles et rangées) ; ceux d'un texte restent.
const tight = (html) => html.replace(/>\s+</g, '><')
// La présentation : de sa colonne de gauche à la fin de la fiche.
const introOf = (html) => /<div class="galerie-intro-tete">[\s\S]*<\/dl>/.exec(tight(blocksOf(html)))[0]
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const lines = (html) => [...tight(html).matchAll(/<div><dt>([^<]*)<\/dt><dd>([^<]*)<\/dd><\/div>/g)].map((m) => [m[1], m[2]])

test('rendu de la présentation, toile : la collection, le nom court, le h1, la note, le « j’aime », puis la fiche', { skip: SKIP }, async () => {
  const p = product()
  const html = introOf(await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() }))
  // La collection mère, en pastille, qui y mène.
  assert.match(html, /<p class="galerie-surtitre"><a href="\/collections\/tableau-zen">Tableau Zen &amp; Nature<\/a><\/p>/)
  // Le nom court en grand, son dernier mot en gras, dans l'élément qui fait arriver ses mots.
  assert.match(html, /<p class="galerie-court"><galerie-mots>Bonsaï <b>zen<\/b><\/galerie-mots><\/p>/)
  // Dans l'ordre de la maquette : l'ordre du code est celui de l'écran et du clavier.
  const order = ['galerie-surtitre', 'galerie-court', '<h1', 'galerie-etoiles', 'galerie-avis-texte', '<my-like-button', '<dl']
  assert.deepEqual([...order].sort((a, b) => html.indexOf(a) - html.indexOf(b)), order)
  for (const mark of order) assert.ok(html.includes(mark), mark)
  // La note : cinq étoiles décoratives, remplies d'après le réglage du thème, puis le libellé et la note, avec le lien.
  assert.match(html, /<span class="galerie-etoiles" style="--note: 4\.2" aria-hidden="true">(<i><svg[^>]*><path d="[^"]+"\/><\/svg><\/i>){5}<\/span>/)
  assert.match(html, /<span class="galerie-avis-texte"><a href="https:\/\/fr\.trustpilot\.com\/review\/myselfmonart\.com" target="_blank" rel="noopener">Trustpilot<\/a> · Bien · 4,2<\/span>/)
  // Le « j'aime » : le cœur de la fiche (assets/my-like-button.js), nommé par son texte, qui change une fois aimé.
  assert.match(html, /<my-like-button class="galerie-aime" data-product-id="1" data-product-handle="[\w-]+"><button type="button" class="like"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span class="galerie-aime-non">J’aime<\/span><span class="galerie-aime-oui">Aimé<\/span><\/button><\/my-like-button>/)
  assert.match(html, /<script src="[^"]*\/my-like-button\.js\?v=1" defer="defer"><\/script>/)
  assert.doesNotMatch(html, /aria-label|title=|alt=/)
  // La fiche : une liste de définitions, cinq lignes.
  assert.match(html, /<dl class="galerie-fiche galerie-monte">(<div><dt>[^<]+<\/dt><dd>[^<]+<\/dd><\/div>){5}<\/dl>$/)
  assert.deepEqual(lines(html), [
    ['Support', 'Toile d’art tendue à la main'],
    ['Châssis', 'Bois massif, 2 cm'],
    ['Formats', 'De 30 × 40 à 90 × 120 cm'],
    ['Fabrication', 'Conçu en France, imprimé en Europe'],
    ['Livraison', 'Offerte, sous 7 jours ouvrés'],
  ])
})

test('rendu de la présentation, poster : le papier et le cadre en option à la place de la toile et du châssis', { skip: SKIP }, async () => {
  const p = product({ poster: true })
  const html = introOf(await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() }))
  assert.deepEqual(lines(html), [
    ['Support', 'Papier photo 250 g/m²'],
    ['Cadre', 'En option : blanc, noir, chêne vieilli ou noyer'],
    ['Formats', 'De 30 × 40 à 90 × 120 cm'],
    ['Fabrication', 'Conçu en France, imprimé en Europe'],
    ['Livraison', 'Offerte, sous 7 jours ouvrés'],
  ])
  // Une seule version dans la page : rien de la toile.
  assert.doesNotMatch(text(html), /Toile|Châssis/)
  assert.match(html, /<h1 class="galerie-titre">Poster Bonsaï zen - Patience &amp; harmonie<\/h1>/)
})

test('rendu de la présentation : dans chaque langue, ses textes et sa note', { skip: SKIP }, async () => {
  const EXPECTED = {
    en: { sizes: 'From 30 × 40 to 90 × 120 cm', score: '4.2', like: 'Like' },
    de: { sizes: 'Von 30 × 40 bis 90 × 120 cm', score: '4,2', like: 'Gefällt mir' },
    es: { sizes: 'De 30 × 40 a 90 × 120 cm', score: '4,2', like: 'Me gusta' },
    nl: { sizes: 'Van 30 × 40 tot 90 × 120 cm', score: '4,2', like: 'Vind ik leuk' },
  }
  for (const [lang, expected] of Object.entries(EXPECTED)) {
    const html = introOf(await renderSection(product(), { suffix: 'oeuvre-galerie', section: galerieSection(), lang }))
    assert.equal(lines(html)[2][1], expected.sizes, lang)
    assert.match(html, new RegExp(`</a> · ${locales[lang].sections.trustpilot.great} · ${expected.score.replace('.', '\\.')}</span>`), lang)
    assert.match(html, new RegExp(`<span class="galerie-aime-non">${expected.like}</span>`), lang)
    // Plus un mot de français dans la fiche.
    assert.doesNotMatch(text(html), /Toile d’art|Châssis|Fabrication|Livraison|Offerte|J’aime|Aimé/, lang)
  }
})

test('rendu de la présentation : la note vient du réglage du thème, jamais d’un chiffre écrit', { skip: SKIP }, async () => {
  const html = introOf(await renderSection(product(), { suffix: 'oeuvre-galerie', section: galerieSection(), score: 47 }))
  assert.match(html, /style="--note: 4\.7"/)
  assert.match(html, /<\/a> · Excellent · 4,7<\/span>/)
  for (const file of PIECES) assert.doesNotMatch(read(file), /\d[.,]\d\s*(\/|sur)\s*5|\b\d{2,}\s*avis/, file)
  // Le remplissage des étoiles se calcule dans la feuille, d'après cette note : la n-ième étoile, de 0 à 4.
  const star = sheet().find((r) => r.head === '.galerie-etoiles i')
  assert.match(star.body, /background:\s*linear-gradient\(90deg, var\(--etoile\) calc\(clamp\(0, var\(--note\) - var\(--i\), 1\) \* 100%\), var\(--etoile-vide\) 0\);/)
  for (const n of [2, 3, 4, 5]) assert.match(sheet().find((r) => r.head === `.galerie-etoiles i:nth-child(${n})`).body, new RegExp(`--i:\\s*${n - 1};`))
})

test('rendu de la présentation : le nom court manque, le titre du produit le remplace ; pas de collection mère, pas de pastille', { skip: SKIP }, async () => {
  const p = product({ short: '', mother: null })
  const html = introOf(await renderSection(p, { suffix: 'oeuvre-galerie', section: galerieSection() }))
  assert.doesNotMatch(html, /galerie-surtitre/)
  // Le h1 redit ce titre juste dessous : les lecteurs d'écran ne le lisent qu'une fois.
  const FALLBACK = /<p class="galerie-court" aria-hidden="true"><galerie-mots>Tableau Bonsaï zen - Sérénité &amp; <b>équilibre<\/b><\/galerie-mots><\/p><h1 class="galerie-titre">Tableau Bonsaï zen - Sérénité &amp; équilibre<\/h1>/
  assert.match(html, FALLBACK)
  assert.match(introOf(await renderSection(product({ short: '   ' }), { suffix: 'oeuvre-galerie', section: galerieSection() })), FALLBACK)
  // Un seul mot : il est en gras. Des espaces en trop : aucun mot vide.
  const one = introOf(await renderSection(product({ short: 'Bonsaï' }), { suffix: 'oeuvre-galerie', section: galerieSection() }))
  assert.match(one, /<galerie-mots><b>Bonsaï<\/b><\/galerie-mots>/)
  const spaced = introOf(await renderSection(product({ short: ' Bonsaï zen ' }), { suffix: 'oeuvre-galerie', section: galerieSection() }))
  assert.match(spaced, /<galerie-mots>Bonsaï <b>zen<\/b><\/galerie-mots>/)
  // Un titre court qui porte du balisage est écrit tel quel, en texte.
  const tagged = introOf(await renderSection(product({ short: 'Zen <i>&</i> calme' }), { suffix: 'oeuvre-galerie', section: galerieSection() }))
  assert.match(tagged, /<galerie-mots>Zen &lt;i&gt;&amp;&lt;\/i&gt; <b>calme<\/b><\/galerie-mots>/)
})

test('rendu de la présentation : un bloc retiré du modèle, sa pièce disparaît, le reste tient', { skip: SKIP }, async () => {
  const without = async (type, change = (list) => list.filter((b) => b.type !== type)) => tight(blocksOf(await renderSection(product(), { suffix: 'oeuvre-galerie', section: galerieSection(change) })))
  const noTitle = await without('title')
  assert.doesNotMatch(noTitle, /<h1/)
  assert.match(noTitle, /galerie-court/)
  const noReviews = await without('trustpilot_review')
  assert.doesNotMatch(noReviews, /galerie-etoiles|Trustpilot/)
  assert.match(noReviews, /<div class="galerie-avis"><my-like-button/)
  const noShort = await without('short_title')
  assert.doesNotMatch(noShort, /galerie-court|galerie-surtitre|my-like-button/)
  assert.match(noShort, /<h1 class="galerie-titre">/)
  const noLikes = await without(null, (list) => list.map((b) => (b.type === 'short_title' ? { ...b, settings: { ...b.settings, show_likes: false } } : b)))
  assert.doesNotMatch(noLikes, /my-like-button/)
  assert.match(noLikes, /galerie-court/)
  const noSheet = await without('fact_sheet')
  assert.doesNotMatch(noSheet, /<dl/)
  assert.match(noSheet, /<div class="galerie-intro-tete">/)
  // Sans lien Trustpilot, le mot reste, sans lien.
  const noLink = await without(null, (list) => list.map((b) => (b.type === 'trustpilot_review' ? { ...b, settings: { ...b.settings, link: '' } } : b)))
  assert.match(noLink, /<span class="galerie-avis-texte">Trustpilot · Bien · 4,2<\/span>/)
})

test('rendu de la présentation : sa grille n’a que deux enfants, quels que soient l’ordre et le nombre des blocs', { skip: SKIP }, async () => {
  const GRID = /<div class="galerie-intro"><div class="galerie-intro-tete">(?:(?!<div class="galerie-intro)[\s\S])*<\/div><dl class="galerie-fiche galerie-monte">(?:(?!<\/dl>)[\s\S])*<\/dl><\/div><\/div><\/main-product-blocks>$/
  const blocks = async (change) => tight(blocksOf(await renderSection(product(), { suffix: 'oeuvre-galerie', section: galerieSection(change) })))
  const plain = await blocks()
  assert.match(plain, GRID)
  // L'ordre des blocs dans le modèle ne change rien à la présentation.
  const reversed = await blocks((list) => [...list].reverse())
  assert.equal(introOf(reversed), introOf(plain))
  // Un bloc ajouté au modèle (un texte, la description) garde son balisage de toujours, avant la présentation.
  const more = await blocks((list) => [{ id: 'text', type: 'text', settings: { text: '<p>Un mot de plus.</p>' } }, ...list, { id: 'description', type: 'description', settings: { show_collapse_button: false } }])
  assert.match(more, GRID)
  assert.equal(introOf(more), introOf(plain))
  assert.ok(more.indexOf('Un mot de plus.') < more.indexOf('<div class="galerie-intro">'))
  assert.ok(more.indexOf('product-description') < more.indexOf('<div class="galerie-intro">'))
  assert.equal((more.match(/<h1[\s>]/g) || []).length, 1)
})

test('rendu de la fiche : « Formats » se lit dans les tailles du produit, de la première à la dernière', { skip: SKIP }, async () => {
  const formats = async (sizes, poster = false) => {
    const p = product({ sizes, poster })
    const row = lines(await renderSnippet('galerie-intro-fiche', { product: p, is_poster: poster }, p)).find(([label]) => label === 'Formats')
    return row ? row[1] : null
  }
  assert.equal(await formats(['30x40 cm', '60x80 cm', '75x100 cm', '90x120 cm']), 'De 30 × 40 à 90 × 120 cm')
  assert.equal(await formats(['40x30 cm', '120x90 cm'], true), 'De 40 × 30 à 120 × 90 cm')
  // Une seule taille : elle seule.
  assert.equal(await formats(['30x40 cm']), '30 × 40 cm')
  assert.equal(await formats(['50x50 cm', '50x50 cm']), '50 × 50 cm')
  // La croix déjà typographique, la majuscule, les espaces autour de la croix, la virgule : la même ligne.
  assert.equal(await formats(['30×40 cm', '90X120 cm']), 'De 30 × 40 à 90 × 120 cm')
  assert.equal(await formats(['30 x 40 cm', '90 × 120 cm']), 'De 30 × 40 à 90 × 120 cm')
  assert.equal(await formats(['29,7x42 cm', '59,4x84 cm']), 'De 29,7 × 42 à 59,4 × 84 cm')
  // Une taille qui n'est pas « largeur x hauteur » : pas de ligne, plutôt qu'une ligne fausse ; les quatre autres restent.
  assert.equal(await formats(['Petit', 'Grand']), null)
  assert.equal(await formats(['XL', 'XXL']), null)
  assert.equal(await formats(['Extra', '90x120 cm']), null)
  assert.equal(await formats(['30x40x2 cm', '90x120 cm']), null)
  assert.equal(await formats(['30xL cm', '90x120 cm']), null)
  assert.equal(await formats(['30x40 cm', 'Lx120 cm']), null)
  assert.equal(await formats([]), null)
  const p = product({ sizes: ['Sur mesure'] })
  assert.deepEqual(lines(await renderSnippet('galerie-intro-fiche', { product: p, is_poster: false }, p)).map(([label]) => label), ['Support', 'Châssis', 'Fabrication', 'Livraison'])
})

test('rendu du modèle caché : la page galerie, toile et poster', { skip: SKIP || (exists(MODEL) ? false : 'le modèle arrive par un second commit') }, async () => {
  for (const poster of [false, true]) {
    const p = product({ poster })
    const html = await renderSection(p, { suffix: 'oeuvre-galerie', section: sectionOf(MODEL) })
    assert.match(blocksOf(html), /data-layout="oeuvre-galerie" data-buy-pill data-galerie>/)
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1)
    assert.equal(lines(introOf(html)).length, 5)
    // Les mêmes données Google que le modèle de la fiche 3D.
    assert.deepEqual(ldOf(html), ldOf(await renderSection(p, { section: sectionOf('templates/product.oeuvre-3d.json') })))
  }
})
