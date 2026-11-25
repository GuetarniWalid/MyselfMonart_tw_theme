// La nouvelle page collection, ticket 01 (dossier .scratch/collection-design) : le socle. Un modèle caché,
// templates/collection.refonte.json, se voit avec ?view=refonte sur n'importe quelle collection. Sa section
// sections/collection-refonte.liquid écrit data-refonte ; layout/collection.liquid le lit dans la page rendue, pose
// data-refonte-page sur <html> et charge la feuille de la page (assets/collection-refonte.css) et sa police. Toute
// autre page de collection rend exactement le même HTML qu'avant (copie du gabarit d'avant :
// scripts/fixtures/layout-collection.avant-refonte.liquid).
// Ici, le rendu Liquid (liquidjs) : sans lui, ces tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-refonte.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, schemaOf, rules, blocs, modeleNouvellePage, SKIP, engine, renderSectionFile } = require('./galerie-banc.cjs')

const LAYOUT = 'layout/collection.liquid'
const AVANT = 'scripts/fixtures/layout-collection.avant-refonte.liquid'
const SECTION = 'sections/collection-refonte.liquid'

/* ---------- Le modèle caché et sa section ---------- */

test('le modèle caché : le fil d’Ariane, la section de la page, puis celles de collection.json, sans bannière ni badges', () => {
  const modele = json('templates/collection.refonte.json')
  const defaut = json('templates/collection.json')
  assert.equal(modele.layout, 'collection')
  // L'ordre : le fil d'Ariane, puis la section de la page, qui en est l'entrée depuis le ticket 02.
  assert.deepEqual(modele.order.map((key) => modele.sections[key].type), ['breadcrumb', 'collection-refonte', 'sous-collections', 'collection-grille', 'collection-sujets', 'collection-guide', 'collection-questions'])
  assert.deepEqual(Object.keys(modele.sections).sort(), [...modele.order].sort(), 'aucune section hors de l’ordre')
  // La section de la page : sans réglage ni bloc.
  assert.deepEqual(modele.sections.collection_refonte, { type: 'collection-refonte', settings: {} })
  // Les sections d'aujourd'hui : mêmes clés, mêmes réglages, plus ceux que la refonte leur donne. Les tickets suivants
  // les remplacent une à une (ce test suit) : les sous-collections en emblèmes au ticket 03
  // (scripts/collection-emblemes.test.cjs), la grille au ticket 05 (scripts/collection-grille.test.cjs), le bas de page
  // au ticket 08 (scripts/collection-bas.test.cjs).
  const REGLAGES = {
    // Ticket 02 : le fil d'Ariane complet.
    'cf6565ea-5338-4b92-985b-b5b0824700db': { affichage: 'complet' },
    // Ticket 03 : les sous-collections en emblèmes.
    sous_collections: { style: 'emblemes' },
  }
  for (const key of modele.order.filter((k) => k in defaut.sections)) {
    assert.deepEqual(modele.sections[key], { ...defaut.sections[key], settings: { ...defaut.sections[key].settings, ...REGLAGES[key] } }, key)
  }
})

test('la section de la page : une marque cachée, sans réglage ni préréglage, un nom de schéma que Shopify accepte', { skip: SKIP }, async () => {
  const schema = schemaOf(SECTION)
  // Shopify refuse un nom de plus de 25 caractères (le fichier refusé fait réimporter l'ancienne version).
  assert.ok(schema.name.length <= 25, schema.name)
  assert.deepEqual(Object.keys(schema).sort(), ['enabled_on', 'limit', 'name'])
  assert.deepEqual(schema.enabled_on, { templates: ['collection'] })
  assert.equal(schema.limit, 1)
  // La marque : un élément caché, en tête de la section, une seule fois. L'entrée de la page la suit (ticket 02 :
  // scripts/collection-entree.test.cjs).
  const html = await renderSectionFile(SECTION, {}, null)
  assert.match(html, /^\s*<div hidden data-refonte><\/div>/)
  assert.equal(html.match(/ data-refonte>/g).length, 1)
})

/* ---------- Le gabarit des pages collection ---------- */

/* Ce que Shopify rend hors du gabarit devient un repère : chaque {% section %}, et chaque {% render %} du gabarit
   d'avant (head-base, le tiroir des filtres, le bouton du panier, le bandeau des cookies). Le reste se rend pour de
   vrai, la police de la page comprise. */
const AILLEURS = ['head-base', 'tw-filter-drawer', 'open-cart-drawer-button', 'cookie-banner']
const reperes = (source) => source
  .replace(/{%\s*section\s+'([\w-]+)'\s*%}/g, '[section $1]')
  .replace(/{%\s*render\s+'([\w-]+)'(?:\s*,[^%]*)?\s*%}/g, (tag, name) => (AILLEURS.includes(name) ? `[render ${name}]` : tag))

/* Le gabarit rendu avec ce que Shopify lui donne : la page déjà rendue (content_for_layout), et des repères pour
   content_for_header. */
const renderLayout = (file, content, { lang = 'fr', cookie = true } = {}) => engine(lang).parseAndRender(reperes(read(file)), {
  content_for_layout: content,
  content_for_header: '[content_for_header]',
}, {
  globals: {
    request: { locale: { iso_code: lang }, origin: 'https://www.myselfmonart.com' },
    routes: { cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', cart_url: '/cart', predictive_search_url: '/search/suggest' },
    settings: { enable_cookie: cookie },
  },
})

/* Le bouton du panier de la nouvelle page : la pilule de la fiche 3D (choix de Walid du 24/11/2026). Le gabarit, qui
   reconnaît la page à sa marque, le dit au bouton ; ailleurs, le paramètre est faux et le bouton reste le même. */
test('le gabarit dit au bouton du panier s’il est sur la nouvelle page', () => {
  assert.match(read('layout/collection.liquid'), /{%\s*render\s+'open-cart-drawer-button',\s*pilule:\s*refonte_page\s*%}/)
  // Sur ordinateur, la pilule reste dans le coin : la page n'a pas de pilule d'achat au-dessus de laquelle monter.
  assert.match(read('assets/collection-refonte.css'), /@media \(min-width: 720px\) \{\s*:root\[data-refonte-page\] \.cart-fab \{\s*bottom: calc\(28px \+ env\(safe-area-inset-bottom, 0px\)\);\s*\}\s*\}/)
})

/* Une section telle que Shopify la pose dans la page : dans son enveloppe. */
const enveloppe = (key, html) => `<div id="shopify-section-template--1__${key}" class="shopify-section">${html}</div>`
// La page d'une collection d'aujourd'hui, et des pages qui ressemblent à la marque sans l'être.
const PAGES = {
  collection: enveloppe('main', '<nav class="breadcrumb"><a href="/">Accueil</a></nav><h1>Tableaux Nature</h1>'),
  'la marque de la page galerie': enveloppe('main', '<main-product-blocks class="block" data-galerie></main-product-blocks>'),
  'un attribut voisin': enveloppe('main', '<div data-refonte-page></div><div data-refonte="1"></div><p data-refontes></p>'),
  'le mot seul': enveloppe('main', '<p>La refonte de la page : data-refonte, bientôt.</p>'),
}
// La page de la nouvelle vue : sa section, puis celles d'aujourd'hui.
const pageRefonte = async (lang = 'fr') => enveloppe('collection_refonte', await renderSectionFile(SECTION, {}, null, { lang })) + PAGES.collection

test('le gabarit des pages collection : sans la marque, exactement le HTML d’avant', { skip: SKIP }, async () => {
  for (const [name, content] of Object.entries(PAGES)) {
    for (const lang of ['fr', 'en']) {
      for (const cookie of [true, false]) {
        const html = await renderLayout(LAYOUT, content, { lang, cookie })
        assert.equal(html, await renderLayout(AVANT, content, { lang, cookie }), `${name}, ${lang}, cookies ${cookie}`)
        // Rien de la page refonte autour de la page : ni marque, ni feuille, ni police.
        assert.doesNotMatch(html.replace(content, ''), /refonte|Albert Sans/, name)
      }
    }
  }
})

test('le gabarit des pages collection : avec la marque, <html data-refonte-page> et la feuille dans <head>', { skip: SKIP }, async () => {
  const page = await pageRefonte()
  assert.ok(page.includes(' data-refonte>'), 'la section écrit la marque que le gabarit cherche')
  const html = await renderLayout(LAYOUT, page)
  assert.match(html, /^<!DOCTYPE html>\n<html lang="fr" data-refonte-page>\n {2}<head>\n/)
  const head = html.slice(0, html.indexOf('</head>'))
  // La feuille juste après celles du thème, avant les scripts de la boutique (content_for_header) : la page s'affiche
  // plus tôt (ticket 10, relevé du 24/11/2026). La police après eux.
  assert.match(head, /\[render head-base\]\n {4}<link href="\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/collection-refonte\.css\?v=1" rel="stylesheet" type="text\/css" media="all" \/>\n/)
  assert.equal(html.match(/collection-refonte\.css/g).length, 1)
  assert.ok(head.indexOf('collection-refonte.css') < head.indexOf('[content_for_header]'))
  assert.ok(head.indexOf('[content_for_header]') < head.indexOf('Albert Sans'))
  // Sa demande part aussi dans l'en-tête de la réponse (stylesheet_tag: preload: true).
  assert.match(read(LAYOUT), /{{ 'collection-refonte\.css' \| asset_url \| stylesheet_tag: preload: true }}/)
  // Rien d'autre ne change : sans la marque de <html> et sans ce qui s'ajoute à <head>, le HTML d'avant, moins le
  // tiroir des filtres, que la ligne des filtres de la page remplace (ticket 06, scripts/collection-filtres.test.cjs).
  const rest = html.replace('<html lang="fr" data-refonte-page>', '<html lang="fr">')
    .replace(/(\[render head-base\])[\s\S]*?(\n {4}\[content_for_header\])/, '$1$2')
    .replace(/(\[content_for_header\])[\s\S]*?(\n\n {4}<script src=)/, '$1$2')
  assert.equal(rest, (await renderLayout(AVANT, page)).replace('[render tw-filter-drawer]', ''))
})

/* ---------- La police ---------- */

// Le préchargement tel que Shopify l'écrit, attributs compris (le banc commun les laisse de côté).
for (const lang of ['fr', 'en']) {
  if (!SKIP) engine(lang).registerFilter('preload_tag', (url, ...args) => `<link href="${url}"${args.filter(Array.isArray).map(([key, value]) => ` ${key}="${value}"`).join('')} rel="preload">`)
}
const ALBERT = (weight) => `//www.myselfmonart.com/cdn/shop/t/25/assets/oeuvre-3d-albert-sans-${weight}.woff2?v=1`
// Les blocs @font-face d'Albert Sans d'un HTML rendu.
const fontFaces = (html) => (html.match(/@font-face\s*{[^}]*}/g) || []).filter((face) => /Albert Sans/.test(face))

test('la police de la page : Albert Sans de 300 à 700, fichiers du thème, déclarée dans <head> de cette page seulement', { skip: SKIP }, async () => {
  const html = await renderLayout(LAYOUT, await pageRefonte())
  const head = html.slice(0, html.indexOf('</head>'))
  const faces = fontFaces(head)
  assert.deepEqual(faces.map((face) => /font-weight:\s*(\d+)/.exec(face)[1]), ['300', '400', '500', '600', '700'])
  for (const face of faces) {
    const weight = /font-weight:\s*(\d+)/.exec(face)[1]
    assert.match(face, /font-family:\s*'Albert Sans';/, weight)
    assert.match(face, /font-style:\s*normal;/, weight)
    // L'écran ne reste jamais vide : le texte s'affiche tout de suite, dans la police de secours.
    assert.match(face, /font-display:\s*swap;/, weight)
    assert.ok(face.includes(`src: url(${ALBERT(weight)}) format('woff2');`), `${weight} : le fichier du thème`)
  }
  // Le titre (700) et le texte (400) partent en avance ; les autres graisses, à la demande.
  const preloads = [...head.matchAll(/<link href="([^"]+)"([^>]*) rel="preload">/g)]
  assert.deepEqual(preloads.map((m) => m[1]), [ALBERT(400), ALBERT(700)])
  // Une police préchargée sans crossorigin serait téléchargée deux fois.
  for (const [, , attrs] of preloads) assert.equal(attrs, ' as="font" type="font/woff2" crossorigin="anonymous"')
  // Rien de la police dans le corps de la page.
  assert.doesNotMatch(html.slice(html.indexOf('</head>')), /Albert Sans|albert-sans/)
})

test('la police de la page : les déclarations de la scène 3D, à l’identique, pour une seule police sur les deux pages', () => {
  // Les @font-face du snippet de la page et ceux de la scène 3D (snippets/oeuvre-3d-stage.liquid) : une retouche de
  // l'un se reporte sur l'autre. Les accolades des balises Liquid {{ … }} ne ferment aucun bloc.
  const faces = (file) => fontFaces(read(file).replace(/{{[\s\S]*?}}/g, (tag) => tag.replace(/[{}]/g, ''))).map((face) => face.replace(/\s+/g, ' '))
  const own = faces('snippets/collection-refonte-police.liquid')
  assert.equal(own.length, 5)
  assert.deepEqual(own, faces('snippets/oeuvre-3d-stage.liquid'))
})

test('la police de la page : seul le gabarit des pages collection la rend', () => {
  const callers = []
  for (const dir of ['layout', 'sections', 'snippets', 'templates']) {
    for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.liquid'))) {
      if (/render\s+'collection-refonte-police'/.test(read(`${dir}/${name}`))) callers.push(`${dir}/${name}`)
    }
  }
  assert.deepEqual(callers, [LAYOUT])
})

/* ---------- La feuille de la page ---------- */

const CSS = 'assets/collection-refonte.css'
const GALERIE = 'assets/oeuvre-galerie.css'
const HOOK = ':root[data-refonte-page]'
const LARGE = '@media (min-width: 900px)'
const sheet = (file = CSS) => rules(read(file).replace(/\/\*[\s\S]*?\*\//g, ''))
const tight = (body) => body.replace(/\s+/g, ' ').trim()
// Les règles du bloc d'un ticket (repères vérifiés par paires : scripts/galerie-banc.cjs).
function blocDe(ticket) {
  const marques = blocs(CSS).filter((m) => m.ticket === ticket)
  assert.equal(marques.length, 2, `le bloc du ticket ${ticket}`)
  return rules(read(CSS).slice(marques[0].end, marques[1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
// Les sélecteurs d'une règle : coupés aux virgules de premier niveau, pas à celles d'un :is(…) ou d'un :has(…).
function selecteurs(head) {
  const out = ['']
  let depth = 0
  for (const c of head) {
    if (c === '(') depth++
    else if (c === ')') depth--
    if (c === ',' && !depth) out.push('')
    else out[out.length - 1] += c
  }
  return out.map((s) => s.trim())
}

test('la feuille : chaque règle commence par la page qui porte la marque, rien ne touche le reste du site', () => {
  const all = sheet()
  assert.ok(all.length >= 10, 'la feuille a ses règles')
  for (const { head } of all) {
    if (/^@keyframes /.test(head)) {
      assert.match(head, /^@keyframes refonte-[a-z-]+$/, head)
      continue
    }
    // :root[data-refonte-page] d'abord, ou une classe de la page (.refonte, .refonte-…).
    for (const selector of selecteurs(head)) {
      assert.match(selector, /^(:root\[data-refonte-page\](?=$|[\s:.[#>~+])|\.refonte(?:-[\w-]+)?\b)/, `sélecteur « ${selector} »`)
      // Pas de :has() sur la racine : il fait refaire les styles de toute la page à chaque changement.
      assert.doesNotMatch(selector, /^:root\S*:has\(/, `sélecteur « ${selector} »`)
    }
  }
  // Ni police ni import : Albert Sans est déclarée par le gabarit (snippets/collection-refonte-police.liquid).
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(css, /@font-face|@import/)
  // Le crochet est la marque de la section, jamais le nom du modèle (grid-template-columns n'en est pas un).
  assert.doesNotMatch(css, /collection\.refonte|data-template|(?<![\w-])template-/)
})

test('la feuille : les couleurs et la typo de la maquette, posées une fois, les mêmes que sur la fiche 3D', () => {
  const tokens = sheet().find((r) => r.head === HOOK && !r.context.length)
  assert.ok(tokens, 'les variables, sur la page qui porte la marque')
  const value = (name, body = tokens.body) => (new RegExp(`--${name}:\\s*([^;]+);`).exec(body) || [])[1]
  // L'encre est la couleur principale du thème (réglage main_color) : #21150c, celle de la maquette.
  assert.equal(json('config/settings_data.json').current.main_color, '#21150c')
  assert.equal(value('encre'), 'rgb(var(--color-main-rgb))')
  const NUANCES = { 'encre-70': 0.72, 'encre-55': 0.6, 'encre-16': 0.16, 'encre-12': 0.12, 'encre-06': 0.06 }
  for (const [name, alpha] of Object.entries(NUANCES)) assert.equal(value(name), `rgba(var(--color-main-rgb), ${alpha})`, `--${name}`)
  const APLATS = { blanc: '#ffffff', creme: '#f7f2ea', ciel: '#a5d3f7', rose: '#ffb6d2', soleil: '#ffdd6e', menthe: '#b9e9d0', lilas: '#d9c9ff', peche: '#ffcaa8', corail: '#ff5436' }
  for (const [name, hex] of Object.entries(APLATS)) assert.equal(value(name), hex, `--${name}`)
  // Le bandeau en pêche, le pied de page en menthe, à texte encre.
  assert.equal(value('annonce-fond'), 'var(--peche)')
  assert.equal(value('annonce-encre'), 'var(--encre)')
  assert.equal(value('pied-fond'), 'var(--menthe)')
  assert.equal(value('pied-encre'), 'var(--encre)')
  // Une seule police de secours : en chercher plusieurs retardait la première mise en page (24/11/2026).
  assert.equal(value('sans'), '"Albert Sans", sans-serif')
  // Les marges de côté : 20 px, 48 px dès 900 px, écran à encoche compris.
  assert.equal(value('gout'), 'max(20px, env(safe-area-inset-left, 0px))')
  assert.equal(value('goutd'), 'max(20px, env(safe-area-inset-right, 0px))')
  const large = sheet().find((r) => r.head === HOOK && r.context.join() === LARGE)
  assert.ok(large, 'les marges de l’ordinateur')
  assert.equal(value('gout', large.body), 'max(48px, env(safe-area-inset-left, 0px))')
  assert.equal(value('goutd', large.body), 'max(48px, env(safe-area-inset-right, 0px))')
  // Une variable que la fiche 3D a aussi (assets/oeuvre-galerie.css) a sa valeur : un seul système pour les deux pages.
  const galerie = sheet(GALERIE).find((r) => r.head === ':root[data-galerie-page]' && !r.context.length).body
  const shared = [...tokens.body.matchAll(/--([\w-]+):\s*([^;]+);/g)].filter(([, name]) => value(name, galerie) !== undefined)
  assert.ok(shared.length >= 20, 'les variables du socle sont celles de la fiche 3D')
  // Sauf la police de secours, plus courte ici (la première mise en page attend moins) ; la fiche 3D n'a pas bougé.
  for (const [, name, own] of shared.filter(([, name]) => name !== 'sans')) assert.equal(own, value(name, galerie), `--${name} : la valeur de la fiche 3D`)
  assert.match(value('sans', galerie), /^"Albert Sans", /)
})

test('la feuille : aucun mouvement hors de « mouvements voulus »', () => {
  const moving = sheet().filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  for (const r of moving) assert.equal(r.context[0], '@media (prefers-reduced-motion: no-preference)', r.head)
})

test('la feuille : aucune couleur ne s’écrit hors de ses variables', () => {
  for (const { head, body, context } of sheet()) {
    if (head === HOOK && !context.length) continue
    assert.doesNotMatch(body, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, `${head} : une couleur écrite en dur`)
  }
})

test('la feuille : le bandeau d’annonce pêche et le pied de page menthe, les règles de la fiche 3D', () => {
  // Les règles du bandeau et du pied de page de la fiche 3D, dans leur ordre, chacune à la marque de cette page : celles du
  // socle (le bloc du ticket 10 pose ensuite le pied de page sur les marges de cette page-ci).
  const AUTOUR = /#shopify-section-tw-(announcement-bar|footer)\b/
  const own = blocDe('01').filter((r) => AUTOUR.test(r.head)).map((r) => [r.context.join(' / '), r.head, tight(r.body)])
  const galerie = sheet(GALERIE).filter((r) => AUTOUR.test(r.head)).map((r) => [r.context.join(' / '), r.head.replaceAll(':root[data-galerie-page]', HOOK), tight(r.body)])
  assert.ok(galerie.length >= 10, 'les règles de la fiche 3D')
  assert.deepEqual(own, galerie)
})

/* Retour de Walid du 25/11/2026 : entre les questions (crème) et le pied de page (menthe), une seule couleur. La marge que
   le thème garde au-dessus de son pied de page y laissait une bande blanche. */
test('la feuille : des questions au pied de page, une seule couleur ; la marge du thème et la vague sont celles du thème', () => {
  const bloc = blocDe('10')
  const regle = (head, context = '') => bloc.find((r) => r.head === head && r.context.join() === context)
  // La marge du pied de page est celle du thème (mt-28 : 112 px, xl:mt-48 : 192 px dès 1280 px), posée ici pour que la
  // marge négative des questions soit toujours la même.
  const footer = /\.footer \{\s*@apply ([^;]+);/.exec(read('input.css'))[1]
  assert.match(footer, /(^|\s)mt-28(\s|$)/)
  assert.match(footer, /(^|\s)xl:mt-48(\s|$)/)
  assert.match(regle(HOOK).body, /--pied-marge: 112px;/)
  assert.match(regle(HOOK, '@media (min-width: 1280px)').body, /--pied-marge: 192px;/)
  assert.match(regle(`${HOOK} #shopify-section-tw-footer`).body, /margin-top: var\(--pied-marge\);/)
  // Les questions, quand elles finissent la page, prennent cette marge ; l'air sous leur carte, puis la vague.
  const FIN = `${HOOK} #MainContent > :last-child > .c-questions`
  assert.match(regle(FIN).body, /margin-bottom: calc\(-1 \* var\(--pied-marge\)\);\s*padding-bottom: calc\(60px \+ var\(--vague\)\);/)
  assert.match(regle(FIN, LARGE).body, /padding-bottom: calc\(104px \+ var\(--vague\)\);/)
  // La vague : toute la largeur, 1470 × 89, 8 px dans le pied (top-2).
  assert.match(regle(HOOK).body, /--vague: calc\(100vw \* 89 \/ 1470 - 8px\);/)
  assert.match(read('sections/tw-footer.liquid'), /<svg class="absolute top-2 right-0 left-0 -translate-y-full w-full"[^>]*viewBox="0 0 1470 89"/)
  // Le gabarit ne met rien après les sections de la page : « la dernière » est bien la section des questions, qui finit
  // chacun des modèles de la nouvelle page.
  assert.match(read('layout/collection.liquid'), /\{\{ content_for_layout \}\}\s*<\/main>\s*\{% section 'tw-footer' %\}/)
  const modeles = fs.readdirSync(path.join(ROOT, 'templates')).filter(modeleNouvellePage)
  assert.ok(modeles.length >= 19, `${modeles.length} modèles`)
  for (const file of modeles) {
    const modele = json(`templates/${file}`)
    assert.equal(modele.sections[modele.order.at(-1)].type, 'collection-questions', file)
  }
})

test('la feuille : le pied de page sur les marges de la page ; ses blocs sont ceux que la feuille vise', () => {
  const bloc = blocDe('10')
  const PIED = `${HOOK} #shopify-section-tw-footer footer-logic > div`
  const boite = bloc.find((r) => r.head === PIED)
  assert.match(boite.body, /max-width: calc\(1240px \+ var\(--gout\) \+ var\(--goutd\)\);\s*padding: 44px var\(--goutd\) 0 var\(--gout\);/)
  // Le pied de page du thème : dans sa boîte, d'abord les menus, en dernier les sélecteurs puis les paiements.
  const pied = read('sections/tw-footer.liquid').replace(/{%-?\s*comment[\s\S]*?endcomment\s*-?%}/g, '')
  const dans = pied.slice(pied.indexOf('</svg>') + 6, pied.indexOf('</footer-logic>'))
  assert.match(dans, /^\s*<div class="[^"]*max-w-7xl[^"]*">\s*(?:{%[^%]*%}\s*)*<div class="[^"]*px-8">\s*(?:{%[^%]*%}\s*)*<nav>/)
  const fin = dans.slice(dans.lastIndexOf('<div class="sm:flex'))
  assert.match(fin, /^<div class="sm:flex sm:justify-between sm:items-center sm:mx-auto">\s*<div class="[^"]*justify-center mb-8 px-3">[\s\S]*<localization-form[\s\S]*<\/localization-form>[\s\S]*<ul class="flex justify-center flex-wrap gap-2 px-3" role="list">/)
})

test('la feuille : le corps de la page passe en Albert Sans, l’en-tête et le menu gardent leur police', () => {
  const main = sheet().find((r) => r.head === `${HOOK} #MainContent` && !r.context.length)
  assert.ok(main, 'une règle pour le corps de la page')
  assert.match(main.body, /font-family:\s*var\(--sans\);/)
  // Ses titres aussi (la feuille commune les met en « heading »), et les textes dont une section fixe la police par
  // une classe du thème (font-heading, font-roboto, font-limelight) : une seule police, comme la maquette.
  const titres = sheet().find((r) => r.head === `${HOOK} #MainContent :is(h1, h2, h3, h4, h5, h6, .font-heading, .font-roboto, .font-limelight)` && !r.context.length)
  assert.ok(titres, 'une règle pour les titres et les classes de police du corps')
  assert.match(titres.body, /font-family:\s*var\(--sans\);/)
  // L'en-tête et son menu (sections/tw-header.liquid : <sticky-header>, snippets/tw-sticky-header.liquid) : aucune
  // règle ne leur donne une police, ni ne pose une police sur ce qui les contient (la page entière).
  for (const { head, body } of sheet()) {
    if (!/font(-family)?\s*:/.test(body)) continue
    assert.doesNotMatch(head, /tw-header|sticky-header|\bheader\b|\bbody\b|^:root\[data-refonte-page\](\s+\*)?$/, `${head} : une police pour l’en-tête`)
  }
})

test('la feuille : un bloc par ticket, entre deux repères « début » et « fin », le socle d’abord', () => {
  // Chaque début a sa fin, au même nom ; rien hors des blocs (scripts/galerie-banc.cjs). Un ticket suivant ajoute
  // son bloc à la fin.
  const [first] = blocs(CSS)
  assert.equal(`${first.name} (${first.ticket})`, 'Socle (01)')
})

/* La feuille commune du site (assets/output.css) est ce que Tailwind construit de input.css et des fichiers du thème
   (le déploiement la reconstruit de même). Construite à nouveau, elle doit être celle du dépôt, à l'octet près : la
   page refonte n'y ajoute rien, pas même une classe qu'un mot de ses commentaires ferait naître. Sans Tailwind
   (node_modules de la copie principale du dépôt), ce test se saute. */
let tailwindCli = null
try {
  tailwindCli = path.join(path.dirname(require.resolve('tailwindcss/package.json', { paths: [ROOT] })), 'lib', 'cli.js')
} catch {
  tailwindCli = null
}

test('la feuille commune n’a pas changé : Tailwind la reconstruit à l’identique, sans rien de la page', { skip: tailwindCli ? false : 'tailwindcss absent (npm install dans la copie principale)' }, () => {
  const os = require('os')
  const { execFileSync } = require('child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refonte-tw-'))
  try {
    const out = path.join(dir, 'output.css')
    execFileSync(process.execPath, [tailwindCli, '-i', './input.css', '-o', out, '--minify'], { cwd: ROOT, stdio: 'pipe' })
    const lf = (text) => text.replace(/\r\n/g, '\n')
    assert.ok(lf(fs.readFileSync(out, 'utf8')) === lf(read('assets/output.css')), 'assets/output.css n’est plus ce que Tailwind construit du thème (npx tailwindcss -i ./input.css -o ./assets/output.css --minify)')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  for (const file of ['input.css', 'assets/output.css']) assert.doesNotMatch(read(file), /refonte/, file)
})
