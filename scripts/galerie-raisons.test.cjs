// La page galerie des œuvres 3D (dossier .scratch/fiche-3d/galerie, ticket 24) : sa dernière section, « Ce qu'un
// tableau change chez vous » (sections/galerie-raisons.liquid), et les couleurs de ce qui entoure la page, sur
// cette page seulement : le bouton d'achat de la pilule en vermillon, le pied de page en menthe, le bandeau
// d'annonce en pêche. Ces trois éléments sont ceux de tout le site : leurs fichiers ne changent pas, tout passe
// par la feuille de la page (assets/oeuvre-galerie.css), sous son crochet.
// Ici : les contrats du code ; puis le rendu Liquid (liquidjs) ; puis un vrai navigateur (puppeteer-core et
// Chrome), qui applique la feuille au vrai balisage du pied de page, du bandeau et de la pilule. Sans liquidjs, ou
// sans navigateur, ces tests-là sont sautés et le reste passe. Le banc les lance avec NODE_PATH vers un
// node_modules qui a liquidjs et puppeteer-core ; Chrome se trouve à sa place habituelle, ou par CHROME_PATH.
// Lancer : node --test scripts/galerie-raisons.test.cjs
const test = require('node:test')
const { after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const {
  ROOT, read, exists, code, json, schemaOf, LANGS, rules,
  SKIP, locales, engine, product, globals, sectionOf, galerieSection, renderSection, renderSectionFile,
} = require('./galerie-banc.cjs')

const SECTION = 'sections/galerie-raisons.liquid'
const CSS = 'assets/oeuvre-galerie.css'
const MODEL = 'templates/product.oeuvre-galerie.json'
const HOOK = ':root:has(main-product-blocks[data-galerie])'
// Les quatre raisons, dans l'ordre de la page : le nom neutre de leur personnage, la taille de son image, la
// couleur de sa carte, et si le personnage parle (une bulle).
const CARDS = [
  { name: 'ton', width: 333, height: 720, color: 'ciel', quote: false },
  { name: 'travaux', width: 567, height: 380, color: 'soleil', quote: true },
  { name: 'bouquet', width: 428, height: 520, color: 'rose', quote: true },
  { name: 'waouh', width: 317, height: 620, color: 'lilas', quote: true },
]
// Le mot qui change entre la toile et le poster, dans chaque langue.
const WORDS = {
  fr: { canvas: /tableau/i, poster: /poster/i },
  en: { canvas: /wall art/i, poster: /poster/i },
  de: { canvas: /Wandbild/, poster: /Poster/ },
  es: { canvas: /cuadro/i, poster: /póster/i },
  nl: { canvas: /schilderij/i, poster: /poster/i },
}
// Les textes qui nomment le support, ou s'accordent avec lui : un jeu pour la toile, un pour le poster.
const OWN_KEYS = ['eyebrow', 'title_html', 'lead', 'ton_title_html', 'ton_text', 'travaux_text', 'bouquet_text', 'waouh_text', 'waouh_quote']
// Ceux qui le nomment en toutes lettres.
const NAMING_KEYS = ['eyebrow', 'title_html', 'lead', 'ton_text', 'travaux_text', 'bouquet_text', 'waouh_text']
// Les textes qui ne dépendent de rien : les mêmes pour la toile et le poster.
const SHARED_KEYS = ['travaux_title_html', 'travaux_quote', 'bouquet_title_html', 'bouquet_quote', 'waouh_title_html', 'closing_html']

const texts = (lang) => json(`locales/${LANGS[lang]}`).sections.mma.galerie.raisons
// La feuille sans ses commentaires, et l'un de ses blocs (entre ses deux repères).
const sheet = () => rules(read(CSS).replace(/\/\*[\s\S]*?\*\//g, ''))
const blockOf = (name) => {
  const css = read(CSS)
  const start = css.indexOf(`/* === ${name} (ticket 24) : début ===`)
  const end = css.indexOf(`/* === ${name} (ticket 24) : fin === */`)
  assert.ok(start > 0 && end > start, `bloc « ${name} (ticket 24) » dans la feuille de la page`)
  return rules(css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, ''))
}
// Le corps d'une règle d'un bloc, ses blancs resserrés.
const bodyIn = (block, head, context = '') => {
  const found = block.find((r) => r.head === head && r.context.join() === context)
  assert.ok(found, `règle « ${head} »${context ? ` dans ${context}` : ''}`)
  return found.body.replace(/\s+/g, ' ').trim()
}
const LARGE = '@media (min-width: 900px)'
const MOTION = '@media (prefers-reduced-motion: no-preference)'
const LINKED = '@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)'
// La taille d'une image WebP, lue dans son en-tête.
const webpSize = (file) => {
  const b = fs.readFileSync(path.join(ROOT, file))
  assert.equal(b.toString('latin1', 0, 4) + b.toString('latin1', 8, 12), 'RIFFWEBP', `${file} : un fichier WebP`)
  const kind = b.toString('latin1', 12, 16)
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (kind === 'VP8L') return [1 + (b.readUInt32LE(21) & 0x3fff), 1 + ((b.readUInt32LE(21) >> 14) & 0x3fff)]
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
}
// Le contraste de deux couleurs opaques (WCAG 2.1), chacune en [rouge, vert, bleu].
const linear = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// Une couleur à demi transparente posée sur un fond opaque.
const over = (color, alpha, background) => color.map((c, i) => background[i] + (c - background[i]) * alpha)
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/* ---------- La section ---------- */

test('la section : sur les fiches produit seulement, une fois par page, sans réglage', () => {
  const schema = schemaOf(SECTION)
  assert.ok(schema.name.length <= 25, 'Shopify limite le nom d’une section à 25 caractères')
  assert.deepEqual(schema.enabled_on, { templates: ['product'] })
  assert.equal(schema.limit, 1)
  // Ses textes sont ceux du design, dans les fichiers de langue : rien à régler, rien qui dépende du produit.
  assert.equal(schema.settings, undefined)
  assert.equal(schema.blocks, undefined)
  // Pas de préréglage : l'éditeur ne la propose pas sur une fiche qui n'a pas la feuille de la page.
  assert.equal(schema.presets, undefined)
})

test('la section : ses textes viennent des fichiers de langue, ses classes sont celles de la page', () => {
  const source = code(SECTION)
  const body = source.slice(0, source.indexOf('{% schema %}'))
  // Aucun texte écrit dans le balisage : hors de Liquid et des balises, il ne reste que des blancs.
  const literal = body.replace(/{%-?[\s\S]*?-?%}|{{[\s\S]*?}}/g, '').replace(/<[^>]+>/g, '')
  assert.equal(literal.trim(), '', 'du texte écrit en dur dans la section')
  // Deux jeux de textes, choisis une fois d'après le produit : la toile, ou le poster (métachamp frames_poster).
  assert.match(body, /assign own_texts = texts \| append: 'canvas\.'\s+if product\.metafields\.painting_options\.frames_poster != blank\s+assign own_texts = texts \| append: 'poster\.'\s+endif/)
  assert.equal(body.match(/\bproduct\b/g).length, 1, 'le produit ne se lit qu’une fois, pour son support')
  // Rien de Tailwind : la feuille commune du site n'a rien de neuf à compiler.
  const classes = [...body.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean)
  assert.ok(classes.length > 20)
  for (const name of classes) assert.match(name, /^galerie(-[a-z]+)*$/, `classe « ${name} »`)
  // Les classes communes de la page sur sa racine, et celles du socle pour ce qui monte au défilement.
  assert.match(body, /<section class="galerie galerie-bande galerie-raisons" aria-labelledby="GalerieRaisons-{{ section\.id }}">/)
  // Ni script en ligne (la bascule Toile / Poster ne le rejouerait pas), ni style écrit dans le balisage.
  assert.doesNotMatch(body, /<script|<style|\sstyle=/)
  // Les personnages : des décors, sans texte alternatif, chargés en différé.
  const images = [...body.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
  assert.equal(images.length, CARDS.length)
  for (const tag of images) assert.match(tag, /^<img src="{{ 'galerie-[a-z]+\.webp' \| asset_url }}" width="\d+" height="\d+" alt="" loading="lazy" decoding="async">$/)
})

test('les personnages : quatre images sous leurs noms neutres, à la taille que la page annonce', () => {
  const body = code(SECTION)
  for (const { name, width, height } of CARDS) {
    const file = `assets/galerie-${name}.webp`
    assert.ok(exists(file), file)
    assert.deepEqual(webpSize(file), [width, height], file)
    assert.ok(body.includes(`<img src="{{ 'galerie-${name}.webp' | asset_url }}" width="${width}" height="${height}" alt=""`), `${file} : sa taille dans la page`)
  }
  // Une quarantaine de kilo-octets chacune au plus, 160 en tout.
  const weights = CARDS.map(({ name }) => fs.statSync(path.join(ROOT, `assets/galerie-${name}.webp`)).size)
  assert.ok(Math.max(...weights) < 70000 && weights.reduce((a, b) => a + b) < 165000, `poids des images : ${weights.join(', ')}`)
})

test('le modèle caché : la section des raisons, une seule fois, la dernière de la page', { skip: exists(MODEL) && Object.values(json(MODEL).sections).some((s) => s.type === 'galerie-raisons') ? false : 'la section entre dans le modèle par un second commit : Shopify refuse un modèle dont il ne connaît pas encore la section' }, () => {
  const model = json(MODEL)
  const types = model.order.map((id) => model.sections[id].type)
  assert.equal(types.filter((type) => type === 'galerie-raisons').length, 1)
  assert.equal(types.at(-1), 'galerie-raisons')
  assert.ok(types.indexOf('main-product') < types.length - 1, 'après le bloc principal')
  assert.equal(Object.keys(model.sections).length, model.order.length, 'chaque section du modèle a sa place dans l’ordre')
  const section = Object.values(model.sections).find((s) => s.type === 'galerie-raisons')
  assert.deepEqual(section.settings || {}, {})
})

/* ---------- Les textes ---------- */

test('textes : sous sections.mma.galerie.raisons, les mêmes clés dans les cinq langues, de vraies traductions', () => {
  const fr = texts('fr')
  assert.deepEqual(Object.keys(fr).sort(), [...SHARED_KEYS, 'canvas', 'poster'].sort())
  // Les textes de la maquette.
  assert.equal(fr.canvas.eyebrow, 'Pourquoi un tableau')
  assert.equal(fr.canvas.title_html, 'Ce qu’un tableau <b>change chez vous.</b>')
  assert.equal(fr.canvas.lead, 'Un mur nu, et la pièce ne paraît jamais finie, même bien meublée. Un tableau règle ça. Et il fait bien plus.')
  assert.equal(fr.canvas.ton_title_html, 'Il donne <b>le ton.</b>')
  assert.equal(fr.canvas.ton_text, 'Chic, zen ou plein de peps : c’est le tableau qui donne son style à une pièce. On le voit avant les meubles.')
  assert.equal(fr.travaux_title_html, 'Tout change, <b>sans travaux.</b>')
  assert.equal(fr.canvas.travaux_text, 'Envie de changement ? Pas besoin de repeindre ni de changer les meubles. Un tableau au mur, et la pièce n’est plus la même.')
  assert.equal(fr.travaux_quote, 'Chez moi, les travaux sont pharaoniques.')
  assert.equal(fr.bouquet_title_html, 'Un plaisir qui <b>ne fane pas.</b>')
  assert.equal(fr.canvas.bouquet_text, 'Un bouquet tient une semaine. Un tableau, vous en profitez tous les jours, pendant des années.')
  assert.equal(fr.bouquet_quote, 'Jamais arrosé.')
  assert.equal(fr.waouh_title_html, 'L’effet <b>« waouh ».</b>')
  assert.equal(fr.canvas.waouh_text, 'Le tableau, c’est ce que vos invités remarquent en premier, et ce dont ils vous parlent.')
  assert.equal(fr.canvas.waouh_quote, 'Tu l’as trouvé où ?')
  assert.equal(fr.closing_html, 'Et un coup de cœur, <b>ça ne se discute pas.</b>')
  // Le poster dit les mêmes phrases, « poster » à la place de « tableau ».
  for (const key of OWN_KEYS) assert.equal(fr.poster[key], fr.canvas[key].replace('tableau', 'poster'), `fr.poster.${key}`)

  for (const lang of Object.keys(LANGS)) {
    const all = texts(lang)
    assert.deepEqual(Object.keys(all).sort(), Object.keys(fr).sort(), lang)
    const flat = { ...Object.fromEntries(SHARED_KEYS.map((key) => [key, all[key]])) }
    for (const support of ['canvas', 'poster']) {
      assert.deepEqual(Object.keys(all[support]).sort(), [...OWN_KEYS].sort(), `${lang}.${support}`)
      for (const key of OWN_KEYS) flat[`${support}.${key}`] = all[support][key]
    }
    for (const [key, text] of Object.entries(flat)) {
      assert.equal(typeof text, 'string', `${lang}.${key}`)
      assert.ok(text.trim().length > 0 && text === text.trim(), `${lang}.${key} : vide, ou des blancs en trop`)
      // Un titre a un passage en gras, un seul, et rien d'autre comme balise ; un texte courant n'en a aucune.
      if (key.endsWith('_html')) assert.match(text, /^[^<>]*<b>[^<>]+<\/b>[^<>]*$/, `${lang}.${key}`)
      else assert.doesNotMatch(text, /[<>&]/, `${lang}.${key}`)
      // Jamais d'apostrophe ni de guillemet droits : la typographie de chaque langue.
      assert.doesNotMatch(text, /['"]/, `${lang}.${key}`)
      if (lang !== 'fr') assert.notEqual(text, key.includes('.') ? fr[key.split('.')[0]][key.split('.')[1]] : fr[key], `${lang}.${key} : resté en français`)
    }
    // Toile et poster : le bon mot partout où le support est nommé, jamais l'autre ; nulle part ailleurs.
    const { canvas, poster } = WORDS[lang]
    for (const key of NAMING_KEYS) {
      assert.match(all.canvas[key], canvas, `${lang}.canvas.${key}`)
      assert.match(all.poster[key], poster, `${lang}.poster.${key}`)
    }
    for (const key of OWN_KEYS) {
      assert.doesNotMatch(all.canvas[key], poster, `${lang}.canvas.${key}`)
      assert.doesNotMatch(all.poster[key], canvas, `${lang}.poster.${key}`)
    }
    for (const key of SHARED_KEYS) assert.doesNotMatch(all[key], new RegExp(`${canvas.source}|${poster.source}`, 'i'), `${lang}.${key}`)
  }
  // En français, une espace insécable avant « ? » et « : », et dans les guillemets.
  for (const text of [...SHARED_KEYS.map((key) => fr[key]), ...OWN_KEYS.flatMap((key) => [fr.canvas[key], fr.poster[key]])]) {
    assert.doesNotMatch(text, / [?:!»]|« /, text)
  }
})

/* ---------- Le rendu de la section ---------- */

// Le balisage sans les blancs entre deux balises ; le texte d'un morceau de page.
const tight = (html) => html.replace(/>\s+</g, '><').trim()
const textOf = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const render = async (poster = false, lang = 'fr', change = (p) => p) => tight(await renderSectionFile(SECTION, {}, change(product({ poster })), { lang, suffix: 'oeuvre-galerie' }))
// Les cartes d'une section rendue.
const cardsOf = (html) => [...html.matchAll(/<li class="galerie-raisons-carte[\s\S]*?<\/li>/g)].map((m) => m[0])

test('rendu, toile : le surtitre, le titre, le chapeau, quatre cartes, la phrase de fin', { skip: SKIP }, async () => {
  const html = await render()
  const fr = texts('fr')
  assert.match(html, /^<section class="galerie galerie-bande galerie-raisons" aria-labelledby="GalerieRaisons-template--1__galerie-raisons"><div class="galerie-raisons-in">/)
  assert.match(html, /<\/ul><p class="galerie-raisons-fin"><galerie-mots>Et un coup de cœur, <b>ça ne se discute pas\.<\/b><\/galerie-mots><\/p><\/div><\/section>$/)
  // L'en-tête : le surtitre du socle, le titre de la section (un h2, dont les mots arrivent un à un), le chapeau.
  assert.ok(html.includes('<p class="galerie-surtitre">Pourquoi un tableau</p><h2 class="galerie-raisons-titre" id="GalerieRaisons-template--1__galerie-raisons"><galerie-mots>Ce qu’un tableau <b>change chez vous.</b></galerie-mots></h2><p class="galerie-raisons-chapo galerie-monte">Un mur nu, et la pièce ne paraît jamais finie, même bien meublée. Un tableau règle ça. Et il fait bien plus.</p><ul class="galerie-raisons-liste">'))
  // Un seul titre de section, pas de h1 : celui de la page est dans le bloc principal.
  assert.deepEqual(html.match(/<h[1-6]\b/g), ['<h2', '<h3', '<h3', '<h3', '<h3'])
  // Les quatre cartes, dans l'ordre de la maquette.
  const cards = cardsOf(html)
  assert.equal(cards.length, 4)
  CARDS.forEach(({ name, width, height, quote }, i) => {
    const card = cards[i]
    const title = fr[`${name}_title_html`] || fr.canvas[`${name}_title_html`]
    const says = fr[`${name}_quote`] || fr.canvas[`${name}_quote`]
    assert.ok(card.startsWith(`<li class="galerie-raisons-carte galerie-raisons-${name} galerie-monte"><div class="galerie-raisons-texte"><h3>${title}</h3><p>${fr.canvas[`${name}_text`]}</p>`), `carte « ${name} » : son titre et son texte`)
    // Le personnage : un décor, caché aux lecteurs d'écran avec toute sa scène.
    assert.match(card, new RegExp(`</div><div class="galerie-raisons-scene" aria-hidden="true"><div class="galerie-raisons-perso"><img src="[^"]*/galerie-${name}\\.webp\\?v=1" width="${width}" height="${height}" alt="" loading="lazy" decoding="async">`), `carte « ${name} » : son personnage`)
    // Sa bulle, elle aussi cachée aux lecteurs d'écran : un mot du décor.
    assert.equal((card.match(/class="galerie-raisons-dit"/g) || []).length, quote ? 1 : 0, `carte « ${name} » : sa bulle`)
    if (quote) assert.ok(card.includes(`<p class="galerie-raisons-dit" aria-hidden="true">${says}</p>`), `carte « ${name} » : ce que dit le personnage`)
  })
  // Le personnage large (les travaux) : sa bulle a sa zone, à sa gauche. Les deux autres bulles ferment la colonne de texte.
  assert.match(cards[1], /<\/p><div class="galerie-raisons-dit-zone"><p class="galerie-raisons-dit" aria-hidden="true">[^<]+<\/p><\/div><\/div><div class="galerie-raisons-scene"/)
  for (const i of [2, 3]) assert.match(cards[i], /<\/p><p class="galerie-raisons-dit" aria-hidden="true">[^<]+<\/p><\/div><div class="galerie-raisons-scene"/)
  // Les deux notes du premier personnage.
  assert.equal((cards[0].match(/<svg class="galerie-raisons-note" viewBox="0 0 24 32" focusable="false">/g) || []).length, 2)
  assert.equal((html.match(/<svg\b/g) || []).length, 2)
  // Ni lien, ni bouton, ni texte alternatif, ni libellé : rien à nommer, rien à atteindre au clavier.
  assert.doesNotMatch(html, /<a\b|<button\b|aria-label=|title=|alt="[^"]/)
})

test('rendu, poster : « poster » partout à la place de « tableau »', { skip: SKIP }, async () => {
  const html = await render(true)
  const canvas = await render(false)
  assert.doesNotMatch(textOf(html), /tableau/i)
  assert.equal((textOf(html).match(/poster/g) || []).length, 7)
  assert.equal((textOf(canvas).match(/tableau/g) || []).length, 7)
  assert.doesNotMatch(textOf(canvas), /poster/i)
  // Tout le reste est le même : le balisage, les personnages, les bulles, la phrase de fin.
  assert.equal(html.replaceAll('poster', 'tableau'), canvas)
  assert.ok(html.includes('<p class="galerie-surtitre">Pourquoi un poster</p>'))
  assert.ok(html.includes('<galerie-mots>Ce qu’un poster <b>change chez vous.</b></galerie-mots>'))
})

test('rendu : dans chaque langue, toile et poster, ses textes, le bon mot, et plus un mot de français', { skip: SKIP }, async () => {
  for (const lang of Object.keys(LANGS)) {
    for (const support of ['canvas', 'poster']) {
      const all = texts(lang)
      const html = await render(support === 'poster', lang)
      const cards = cardsOf(html)
      // Chaque texte à sa place.
      assert.ok(html.includes(`<p class="galerie-surtitre">${all[support].eyebrow}</p>`), `${lang}, ${support} : le surtitre`)
      assert.ok(html.includes(`<galerie-mots>${all[support].title_html}</galerie-mots></h2><p class="galerie-raisons-chapo galerie-monte">${all[support].lead}</p>`), `${lang}, ${support} : le titre et le chapeau`)
      CARDS.forEach(({ name, quote }, i) => {
        const title = all[`${name}_title_html`] || all[support][`${name}_title_html`]
        assert.ok(cards[i].includes(`<h3>${title}</h3><p>${all[support][`${name}_text`]}</p>`), `${lang}, ${support}, carte « ${name} »`)
        if (quote) assert.ok(cards[i].includes(`aria-hidden="true">${all[`${name}_quote`] || all[support][`${name}_quote`]}</p>`), `${lang}, ${support}, bulle « ${name} »`)
      })
      assert.ok(html.includes(`<galerie-mots>${all.closing_html}</galerie-mots></p></div></section>`), `${lang}, ${support} : la phrase de fin`)
      // Aucune clé restée sans texte.
      assert.doesNotMatch(html, /sections\.mma|translation missing/i, `${lang}, ${support}`)
      // Le bon mot, jamais l'autre.
      const other = support === 'canvas' ? 'poster' : 'canvas'
      assert.equal((textOf(html).match(new RegExp(WORDS[lang][support].source, 'gi')) || []).length, 7, `${lang}, ${support} : le mot du support, sept fois`)
      assert.doesNotMatch(textOf(html), WORDS[lang][other], `${lang}, ${support}`)
      if (lang !== 'fr') assert.doesNotMatch(textOf(html), /tableau|chez vous|pièce|meubles|invités|coup de cœur|travaux|Jamais/i, `${lang}, ${support} : du français`)
    }
  }
})

test('rendu : rien ne dépend de l’œuvre, les mêmes phrases pour toutes', { skip: SKIP }, async () => {
  for (const poster of [false, true]) {
    const html = await render(poster)
    const other = await render(poster, 'fr', (p) => ({ ...p, id: 99, title: 'Tableau Zèbre - Savane en noir et blanc', handle: 'zebre', price: 1, description: '<p>Autre chose.</p>', metafields: { ...p.metafields, title: { short: 'Zèbre' }, link: {} } }))
    assert.equal(other, html)
    assert.doesNotMatch(html, /Bonsaï|Zèbre|€|\d{2,} ?cm/)
  }
  // Un produit sans métachamp de cadres : une toile.
  assert.equal(await render(false, 'fr', (p) => ({ ...p, metafields: {} })), await render(false))
})

/* ---------- La feuille : la section ---------- */

test('la feuille : les mesures de la section sont celles de la maquette, sur téléphone et sur ordinateur', () => {
  const block = blockOf('Raisons')
  const body = (head, context) => bodyIn(block, head, context)
  // La bande et sa colonne.
  assert.equal(body('.galerie-raisons'), 'background: var(--blanc); padding-block: 64px 44px;')
  assert.equal(body('.galerie-raisons', LARGE), 'padding-block: 104px 80px;')
  assert.equal(body('.galerie-raisons-in'), 'max-width: 1240px; margin-inline: auto;')
  // Le titre, maigre avec ses mots en gras, de 38 à 64 px, puis de 56 à 96 px.
  assert.equal(body('.galerie-raisons-titre'), 'margin: 14px 0 0; font: 300 clamp(38px, 10.8vw, 64px)/0.98 var(--sans); letter-spacing: -0.042em; text-wrap: balance;')
  assert.equal(body('.galerie-raisons-titre', LARGE), 'font-size: clamp(56px, 5.6vw, 96px); line-height: 0.96;')
  assert.equal(body('.galerie-raisons-titre b'), 'font-weight: 700;')
  assert.equal(body('.galerie-raisons-chapo'), 'margin: 18px 0 0; max-width: 29em; font: 400 16.5px/1.5 var(--sans); color: var(--encre-70);')
  assert.equal(body('.galerie-raisons-chapo', LARGE), 'font-size: 19px; margin-top: 24px;')
  // Les cartes : l'une sous l'autre à 56 px ; deux par rangée sur ordinateur.
  assert.equal(body('.galerie-raisons-liste'), 'margin: 0; padding: 62px 0 0; list-style: none; display: grid; gap: 56px;')
  assert.equal(body('.galerie-raisons-liste', LARGE), 'grid-template-columns: 1fr 1fr; gap: 84px 28px; padding-top: 96px;')
  assert.equal(body('.galerie-raisons-carte'), 'position: relative; display: grid; min-height: 300px; border-radius: 28px; padding: 24px 22px 22px;')
  assert.equal(body('.galerie-raisons-carte', LARGE), 'min-height: 336px; padding: 34px 34px 30px;')
  for (const { name, color } of CARDS) assert.match(body(`.galerie-raisons-${name}`), new RegExp(`^background: var\\(--${color}\\);`), `carte « ${name} »`)
  // Le texte : le titre peut courir sur la carte, le paragraphe et la bulle restent à gauche du personnage.
  assert.equal(body('.galerie-raisons-texte'), 'position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start;')
  assert.equal(body('.galerie-raisons-carte h3'), 'margin: 0; max-width: var(--titre-large, 100%); font: 300 clamp(25px, 7.7vw, 31px)/1 var(--sans); letter-spacing: -0.04em;')
  assert.equal(body('.galerie-raisons-carte h3', LARGE), 'font-size: 40px;')
  assert.equal(body('.galerie-raisons-carte h3 b'), 'font-weight: 700; white-space: nowrap;')
  assert.equal(body('.galerie-raisons-texte > p'), 'margin: 12px 0 18px; max-width: var(--texte-large, 52%); font: 400 14.5px/1.45 var(--sans); color: var(--encre-70);')
  assert.equal(body('.galerie-raisons-texte > p', LARGE), 'font-size: 16.5px; margin-top: 16px;')
  // La bulle : blanche, son angle vers le personnage, en bas de la colonne de texte.
  assert.equal(body('.galerie-raisons-carte .galerie-raisons-dit'), 'margin: 0; padding: 9px 13px; border-radius: 16px 16px 4px 16px; background: var(--blanc); color: var(--encre); font: 600 13.5px/1.2 var(--sans); letter-spacing: -0.012em; box-shadow: 0 8px 18px var(--encre-12); transform-origin: 100% 100%;')
  assert.equal(body('.galerie-raisons-texte > .galerie-raisons-dit'), 'margin-top: auto;')
  assert.equal(body('.galerie-raisons-texte > .galerie-raisons-dit', LARGE), 'font-size: 17px; padding: 11px 16px; border-radius: 19px 19px 5px 19px;')
  // Le personnage large : sur téléphone, sa bulle se loge à sa gauche, dans une zone qui a sa hauteur.
  assert.equal(body('.galerie-raisons-dit-zone'), 'position: relative; width: 100%; margin-top: auto; padding-bottom: min(40%, 150px);')
  assert.equal(body('.galerie-raisons-dit-zone > .galerie-raisons-dit'), 'position: absolute; left: 0; top: 10%; max-width: 43%; font-size: clamp(11px, 3.4vw, 13.5px);')
  assert.equal(body('.galerie-raisons-dit-zone', LARGE), 'max-width: var(--texte-large); padding-bottom: 0;')
  assert.equal(body('.galerie-raisons-dit-zone > .galerie-raisons-dit', LARGE), 'position: static; max-width: 100%; font-size: 17px;')
  // La scène de la carte : le haut reste libre, les côtés et le bas sont coupés (pas de défilement de côté).
  assert.equal(body('.galerie-raisons-scene'), 'position: absolute; inset: 0; pointer-events: none; overflow-x: clip; clip-path: inset(-80px 0 0 0 round 0 0 28px 28px);')
  assert.equal(body('.galerie-raisons-scene', LARGE), 'clip-path: inset(-110px 0 0 0 round 0 0 28px 28px);')
  // Les deux notes : la première au corail, la seconde à l'encre.
  assert.equal(body('.galerie-raisons-note'), 'position: absolute; left: 9%; top: 6%; width: 13%; overflow: visible; fill: currentColor; color: var(--corail);')
  assert.equal(body('.galerie-raisons-note + .galerie-raisons-note'), 'left: -9%; top: -2%; color: var(--encre);')
  // La phrase de fin.
  assert.equal(body('.galerie-raisons-fin'), 'margin: 58px 0 0; font: 300 clamp(27px, 7.8vw, 36px)/1.04 var(--sans); letter-spacing: -0.04em; text-wrap: balance;')
  assert.equal(body('.galerie-raisons-fin', LARGE), 'font-size: 52px; margin-top: 84px;')
  assert.equal(body('.galerie-raisons-fin b'), 'font-weight: 700;')
  // Les largeurs du texte de chaque carte, comme dans la maquette.
  const widths = (name, context) => Object.fromEntries([...body(`.galerie-raisons-${name}`, context).matchAll(/--(titre|texte)-large: ([\d.]+%)/g)].map((m) => [m[1], m[2]]))
  assert.deepEqual(widths('ton'), { titre: '56%', texte: '52%' })
  assert.deepEqual(widths('ton', LARGE), { titre: '62%', texte: '56%' })
  assert.deepEqual(widths('travaux'), { texte: '100%' })
  assert.deepEqual(widths('travaux', LARGE), { titre: '60%', texte: '50%' })
  assert.deepEqual(widths('bouquet'), { titre: '72%', texte: '50%' })
  assert.deepEqual(widths('bouquet', LARGE), { titre: '60%', texte: '48%' })
  assert.deepEqual(widths('waouh'), { texte: '52%' })
  assert.deepEqual(widths('waouh', LARGE), { texte: '54%' })
})

test('la feuille : le personnage ne grandit pas quand le texte allonge la carte', () => {
  const block = blockOf('Raisons')
  // Posé en bas à droite de sa carte : sa largeur est une part de celle de la carte, plafonnée ; sa hauteur suit
  // la forme de son image. Rien n'y dépend de la hauteur de la carte.
  const perso = bodyIn(block, '.galerie-raisons-perso')
  assert.equal(perso, 'position: absolute; right: max(var(--perso-droite), var(--perso-droite-min, -999px)); bottom: 0; width: min(var(--perso-large), var(--perso-max)); translate: 0 var(--perso-bas, 0%);')
  assert.equal(bodyIn(block, '.galerie-raisons-perso img'), 'width: 100%; height: 100%; max-width: none;')
  const MAQUETTE = {
    ton: ['--perso-large: 44.5%; --perso-max: 160px; --perso-droite: 2%;', '--perso-large: 30%; --perso-max: 190px; --perso-droite: 4%;'],
    travaux: ['--perso-large: 61%; --perso-max: 232px; --perso-droite: -3%; --perso-droite-min: -12px;', '--perso-large: 47%; --perso-max: 300px; --perso-droite: -1%; --perso-droite-min: -8px;'],
    bouquet: ['--perso-large: 55%; --perso-max: 240px; --perso-droite: -9%; --perso-droite-min: -34px;', '--perso-large: 46%; --perso-max: 290px; --perso-droite: -3%; --perso-droite-min: -20px;'],
    waouh: ['--perso-large: 44%; --perso-max: 180px; --perso-droite: 3%; --perso-bas: 24%;', '--perso-large: 36%; --perso-max: 225px; --perso-droite: 5%; --perso-bas: 27%;'],
  }
  for (const { name, width, height } of CARDS) {
    const head = `.galerie-raisons-${name} .galerie-raisons-perso`
    // Sa forme est celle de son image : aucun décalage quand elle arrive.
    assert.equal(bodyIn(block, head), `aspect-ratio: ${width} / ${height}; ${MAQUETTE[name][0]}`, head)
    assert.equal(bodyIn(block, head, LARGE), MAQUETTE[name][1], `${head}, ordinateur`)
    for (const context of ['', LARGE]) {
      const share = /--perso-large: [\d.]+%;/.test(bodyIn(block, head, context))
      const cap = /--perso-max: \d+px;/.test(bodyIn(block, head, context))
      assert.ok(share && cap, `${head} : une part de la largeur de la carte, et un plafond`)
    }
  }
  // Aucune règle du bloc ne donne au personnage une hauteur, ni une taille liée à celle de la carte.
  for (const { head, body } of block.filter((r) => /galerie-raisons-perso(?! img)/.test(r.head))) assert.doesNotMatch(body, /(^|[;\s])(height|min-height|max-height|inset|top)\s*:/, head)
})

test('la feuille : le mouvement de la section suit le défilement, sur transform et opacity seulement', () => {
  const block = blockOf('Raisons')
  const animated = block.filter((r) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body))
  for (const r of animated) assert.deepEqual(r.context, [MOTION, LINKED], r.head)
  const moving = (head) => bodyIn(block, head, [MOTION, LINKED].join())
  // Le personnage sort du bas de sa carte, sa bulle grossit, les notes s'envolent.
  assert.equal(moving('.galerie-raisons-perso'), 'animation: galerie-raisons-surgit linear both; animation-timeline: view(); animation-range: cover 0% cover 40%;')
  assert.equal(moving('.galerie-raisons-dit'), 'animation: galerie-raisons-dit linear both; animation-timeline: view(); animation-range: cover 12% cover 26%;')
  assert.equal(moving('.galerie-raisons-note'), 'animation: galerie-raisons-note linear both; animation-timeline: view(); animation-range: cover 22% cover 56%;')
  assert.equal(moving('.galerie-raisons-note + .galerie-raisons-note'), 'animation-range: cover 32% cover 68%;')
  // La phrase de fin est tout en bas de la page : ses mots arrivent plus tôt que ceux des autres titres.
  assert.equal(moving('.galerie-raisons-fin galerie-mots .galerie-mot'), 'animation-range: cover calc(1% + var(--i) * 0.9%) cover calc(7% + var(--i) * 0.9%);')
  assert.equal(bodyIn(block, '@keyframes galerie-raisons-surgit'), 'from { opacity: 1; transform: translateY(62%); } to { opacity: 1; transform: none; }')
  assert.equal(bodyIn(block, '@keyframes galerie-raisons-dit'), 'from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: none; }')
  assert.equal(bodyIn(block, '@keyframes galerie-raisons-note'), 'from { opacity: 0; transform: translate(90%, 150%) rotate(-26deg) scale(0.4); } 30% { opacity: 1; } to { opacity: 1; transform: none; }')
  assert.equal(block.filter((r) => /^@keyframes /.test(r.head)).length, 3)
  // Les cartes et le chapeau montent par la classe du socle, les titres arrivent mot à mot par son élément.
  const body = code(SECTION)
  assert.equal(body.match(/galerie-monte/g).length, 5)
  assert.equal(body.match(/<galerie-mots>/g).length, 2)
})

test('la feuille : chaque règle de la section porte son nom, et aucune ne sort d’elle', () => {
  for (const { head } of blockOf('Raisons')) {
    if (/^@keyframes /.test(head)) {
      assert.match(head, /^@keyframes galerie-raisons-[a-z]+$/, head)
      continue
    }
    for (const selector of head.split(',')) assert.match(selector.trim(), /^\.galerie-raisons(-[a-z]+)*\b/, `sélecteur « ${selector.trim()} »`)
  }
  // Le surtitre est celui du socle : la section ne le redéfinit pas.
  assert.ok(sheet().some((r) => r.head === '.galerie-surtitre'))
  assert.ok(!blockOf('Raisons').some((r) => /galerie-surtitre/.test(r.head)))
})

/* ---------- La feuille : autour de la page ---------- */

// Les règles du bloc « Autour de la page » : le bouton d'achat, le bandeau, le pied de page.
const around = () => blockOf('Autour de la page')

test('autour de la page : chaque règle commence par la page qui porte le crochet', () => {
  const block = around()
  assert.ok(block.length >= 8, 'le bouton d’achat, le bandeau, le pied de page et son champ')
  for (const { head } of block) {
    assert.doesNotMatch(head, /^@keyframes /, 'aucune image clé ici')
    for (const selector of head.split(',')) {
      // Le crochet d'abord, puis un descendant : sans bloc principal data-galerie dans la page, rien ne répond.
      assert.ok(selector.trim().startsWith(`${HOOK} `), `sélecteur « ${selector.trim()} »`)
      assert.equal(selector.split(HOOK).length, 2, `sélecteur « ${selector.trim()} » : le crochet, une fois`)
    }
  }
  // Rien d'autre dans la feuille ne touche à ces trois éléments.
  const elsewhere = sheet().filter((r) => /oeuvre-3d-buy|oeuvre-3d-pill|tw-footer|tw-announcement|footer-logic|\.footer\b/.test(r.head))
  assert.equal(elsewhere.length, block.length)
})

test('autour de la page : le bouton d’achat vermillon à libellé blanc, le bandeau pêche, le pied de page menthe à texte encre', () => {
  const block = around()
  const body = (head, context) => bodyIn(block, `${HOOK} ${head}`, context)
  // Les couleurs sont celles du socle, posées par l'étude du 20/11 : aucune ne s'écrit ici.
  assert.equal(body('.oeuvre-3d-buy'), 'background: var(--achat); color: var(--achat-texte);')
  assert.equal(body('#shopify-section-tw-announcement-bar p'), 'background-color: var(--annonce-fond); color: var(--annonce-encre);')
  assert.equal(body('#shopify-section-tw-footer'), 'background-color: var(--pied-fond); color: var(--pied-encre);')
  // La vague du haut du pied de page, dans sa couleur.
  assert.equal(body('#shopify-section-tw-footer footer-logic > svg:first-child path'), 'fill: var(--pied-fond);')
  // Le champ de la newsletter : blanc, un seul contour, à l'encre ; son texte d'attente se lit ; un halo doux
  // quand on y écrit, à la place du second contour.
  const field = body('#shopify-section-tw-footer input[type="email"]')
  assert.match(field, /border: 1\.5px solid var\(--encre\);/)
  assert.match(field, /background-color: var\(--blanc\);/)
  assert.match(field, /(^|; )color: var\(--encre\);/)
  assert.match(field, /border-radius: 999px;/)
  assert.equal(body('#shopify-section-tw-footer input[type="email"]::placeholder'), 'color: var(--encre-55); opacity: 1;')
  assert.equal(body('#shopify-section-tw-footer input[type="email"]:focus'), 'box-shadow: 0 0 0 4px var(--encre-16);')
  // Son libellé reste pour les lecteurs d'écran, hors de la vue : il ne dépasse plus au-dessus du champ.
  const label = body('#shopify-section-tw-footer input[type="email"] ~ label')
  assert.match(label, /width: 1px; height: 1px;/)
  assert.match(label, /clip-path: inset\(50%\);/)
  assert.doesNotMatch(label, /display: none|visibility: hidden/)
  // Son bouton : un rond à l'encre, la flèche en blanc.
  const button = body('#shopify-section-tw-footer input[type="email"] ~ button')
  assert.match(button, /background-color: var\(--encre\);/)
  assert.match(button, /(^|; )color: var\(--blanc\);/)
  // Le halo à 16 % d'encre : une couleur de la maquette que le socle n'avait pas, ajoutée à sa liste.
  const tokens = sheet().find((r) => r.head === HOOK && !r.context.length).body
  assert.match(tokens, /--encre-16:\s*rgba\(var\(--color-main-rgb\), 0\.16\);/)
  // Le mur de la scène 3D ne change pas, la pilule garde sa forme : rien ici ne les nomme.
  for (const { head, body: text } of block) {
    assert.doesNotMatch(head, /oeuvre-3d-stage|oeuvre-3d-pill|--wall|cart-fab/, head)
    assert.doesNotMatch(text, /--wall/, head)
  }
})

test('autour de la page : les sections et les snippets communs du site ne changent pas', () => {
  // Le pied de page, le bandeau et la pilule ne savent rien de la page galerie : ni son crochet, ni ses couleurs.
  for (const file of ['sections/tw-footer.liquid', 'sections/tw-announcement-bar.liquid', 'snippets/tw-list-social.liquid', 'snippets/tw-icon-arrow.liquid', 'assets/tw-footer.js']) {
    assert.doesNotMatch(read(file), /galerie|--achat|--pied-|--annonce-/, file)
  }
  assert.doesNotMatch(read('snippets/oeuvre-3d-stage.liquid'), /data-galerie|--achat|galerie-raisons/)
  assert.doesNotMatch(read('input.css'), /galerie-|data-galerie|--achat|--pied-fond|--annonce-fond/)
  // Ce que la feuille de la page vise dans ces fichiers y est bien : le bouton de la pilule, le champ et son
  // libellé, la vague en premier enfant, le paragraphe du bandeau.
  assert.match(read('snippets/oeuvre-3d-stage.liquid'), /class="oeuvre-3d-buy"/)
  const footer = read('sections/tw-footer.liquid')
  assert.match(footer, /<footer-logic>\s*<svg [^>]*>\s*<path class="fill-buy-button"/)
  assert.match(footer, /<input\s+id="NewsletterForm--{{ section\.id }}"\s+type="email"[\s\S]*?>\s*<label for="NewsletterForm--{{ section\.id }}"[\s\S]*?<\/label>\s*<button type="submit"/)
  assert.deepEqual([schemaOf('sections/tw-footer.liquid').tag, schemaOf('sections/tw-footer.liquid').class], ['footer', 'footer'])
  assert.match(read('sections/tw-announcement-bar.liquid'), /<p class="[^"]*\bbg-buy-button\b[^"]*">/)
  for (const layout of ['layout/product.liquid']) {
    assert.match(read(layout), /{% section 'tw-announcement-bar' %}/)
    assert.match(read(layout), /{% section 'tw-footer' %}/)
  }
})

test('contrastes : le bouton d’achat, le pied de page, le bandeau et les cartes se lisent (AA, 4,5 pour 1)', () => {
  const tokens = sheet().find((r) => r.head === HOOK && !r.context.length).body
  const hex = (name) => hexToRgb(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`).exec(tokens)[1])
  const alpha = (name) => Number(new RegExp(`--${name}:\\s*rgba\\(var\\(--color-main-rgb\\), ([\\d.]+)\\);`).exec(tokens)[1])
  // L'encre est la couleur principale du thème (réglage main_color).
  const ink = hexToRgb(json('config/settings_data.json').current.main_color)
  const white = hex('blanc')
  const measured = {
    'libellé blanc sur le bouton d’achat vermillon': contrast(hex('achat-texte'), hex('achat')),
    'encre sur le pied de page menthe': contrast(ink, hex('menthe')),
    'encre sur le bandeau pêche': contrast(ink, hex('peche')),
    'texte d’attente du champ (encre-55) sur blanc': contrast(over(ink, alpha('encre-55'), white), white),
    'flèche blanche sur le bouton encre du champ': contrast(white, ink),
    'chapeau et surtitre (encre-70) sur blanc': contrast(over(ink, alpha('encre-70'), white), white),
    'bulle : encre sur blanc': contrast(ink, white),
  }
  // Sur chaque carte : le titre à l'encre, le texte à l'encre adoucie.
  for (const { name, color } of CARDS) {
    measured[`carte « ${name} » : titre encre sur ${color}`] = contrast(ink, hex(color))
    measured[`carte « ${name} » : texte encre-70 sur ${color}`] = contrast(over(ink, alpha('encre-70'), hex(color)), hex(color))
  }
  for (const [what, ratio] of Object.entries(measured)) assert.ok(ratio >= 4.5, `${what} : ${ratio.toFixed(2)} pour 1`)
  // Les mesures de l'étude : 4,7 pour le bouton, 13,3 sur la menthe, 12,1 sur la pêche.
  assert.equal(measured['libellé blanc sur le bouton d’achat vermillon'].toFixed(1), '4.7')
  assert.equal(measured['encre sur le pied de page menthe'].toFixed(1), '13.3')
  assert.equal(measured['encre sur le bandeau pêche'].toFixed(1), '12.1')
  // Le calcul est le bon : le texte blanc sur le saumon d'aujourd'hui ne passe pas (2,35).
  assert.equal(contrast(white, hexToRgb(json('config/settings_data.json').current.brand_color)).toFixed(2), '2.35')
})

/* ---------- Un vrai navigateur : la feuille sur le vrai balisage du site ----------
   Le bandeau d'annonce et le pied de page (leurs sections, rendues par liquidjs avec les réglages du thème), la
   scène 3D et sa pilule (le bloc principal), la feuille commune du site (assets/output.css) et la feuille de la
   page, dans Chrome. Les scripts ne tournent pas : seuls les styles comptent ici. Rien ne part vers le réseau. */

let puppeteer = null
try {
  puppeteer = require('puppeteer-core')
} catch {
  puppeteer = null
}
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const NO_BROWSER = SKIP || (!puppeteer ? 'puppeteer-core absent : NODE_PATH vers un node_modules qui l’a (le banc)' : !fs.existsSync(CHROME) ? `Chrome absent (${CHROME}) : CHROME_PATH vers son exécutable` : false)

let browser = null
const launch = () => (browser = browser || puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] }))
after(async () => {
  if (browser) await (await browser).close()
})

const settingsData = () => json('config/settings_data.json').current
// Les couleurs du thème, telles que snippets/fonts-and-colors.liquid les pose d'après ses réglages. La terre est le
// saumon assombri de 25 points de clarté (color_darken de Shopify).
function themeColors() {
  const data = settingsData()
  const rgb = (hex) => hexToRgb(hex).join(', ')
  const darken = (hex, points) => {
    const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
    const h = !d ? 0 : max === r ? (((g - b) / d) % 6) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60
    const L = Math.max(0, l - points / 100)
    const C = (1 - Math.abs(2 * L - 1)) * s
    const X = C * (1 - Math.abs(((((h + 360) % 360) / 60) % 2) - 1))
    const m = L - C / 2
    const sector = Math.floor(((h + 360) % 360) / 60)
    const [r1, g1, b1] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][sector]
    return [r1, g1, b1].map((c) => Math.round((c + m) * 255)).join(', ')
  }
  return `:root { --color-main-rgb: ${rgb(data.main_color)}; --color-secondary-rgb: ${rgb(data.secondary_color)}; --color-like-rgb: 254, 182, 223; --color-buy-button-rgb: ${rgb(data.brand_color)}; --color-accent-rgb: ${rgb(data.brand_color)}; --color-terra-rgb: ${darken(data.brand_color, 25)}; }`
}

// Ce que le pied de page demande à Shopify et que liquidjs n'a pas : la balise {% form %} (le formulaire, ses
// champs cachés et l'objet form), le filtre payment_type_svg_tag (un logo de paiement : ici, un rectangle blanc).
const tagged = new Set()
function siteEngine(lang) {
  const e = engine(lang)
  if (tagged.has(e)) return e
  tagged.add(e)
  e.registerTag('form', {
    parse(token, remain) {
      this.args = token.args
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endform', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('form non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      const type = /^\s*'(\w+)'/.exec(this.args)[1]
      const id = (/id:\s*'([^']+)'/.exec(this.args) || [])[1]
      emitter.write(`<form method="post" action="/${type === 'customer' ? 'contact' : 'localization'}"${id ? ` id="${id}"` : ''} accept-charset="UTF-8"><input type="hidden" name="form_type" value="${type}">`)
      ctx.push({ form: { errors: null, email: '', posted_successfully: false } })
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      ctx.pop()
      emitter.write('</form>')
    },
  })
  e.registerFilter('payment_type_svg_tag', (type) => `<svg role="img" viewBox="0 0 38 24" width="38" height="24"><title>${type}</title><rect width="38" height="24" rx="3" fill="#fff"/></svg>`)
  return e
}

/* Une section du gabarit (layout/product.liquid : {% section 'tw-footer' %}), avec ses réglages du thème, dans
   l'enveloppe que Shopify lui donne d'après son schéma. liquidjs ne lit pas « ? » dans un nom :
   form.posted_successfully? y perd son « ? ». */
async function staticSection(name, p, lang = 'fr') {
  const data = settingsData().sections[name]
  const blocks = (data.block_order || []).map((id) => {
    const settings = { ...data.blocks[id].settings }
    // Un menu de navigation : quelques liens, comme ceux du site.
    if (typeof settings.menu === 'string') settings.menu = { links: ['Notre histoire', 'F.A.Q', 'Contactez-nous'].map((title) => ({ title, url: '#' })) }
    return { id, type: data.blocks[id].type, settings }
  })
  const source = read(`sections/${name}.liquid`)
  const body = source.slice(0, source.indexOf('{% schema %}')).replaceAll('posted_successfully?', 'posted_successfully')
  const base = globals(p, { lang })
  const country = (iso, currency) => ({ iso_code: iso, currency: { iso_code: currency } })
  const html = await siteEngine(lang).parseAndRender(body, {}, {
    globals: {
      ...base,
      settings: { ...settingsData(), ...base.settings },
      routes: { ...base.routes, account_url: '/account' },
      section: { id: name, settings: { ...data.settings }, blocks },
      shop: { ...base.shop, enabled_currencies: [{ iso_code: 'EUR', name: 'Euro' }, { iso_code: 'CHF', name: 'Swiss Franc' }], enabled_payment_types: ['visa', 'master', 'paypal'] },
      cart: { ...base.cart, currency: { iso_code: 'EUR', name: 'Euro', symbol: '€' } },
      localization: { available_countries: [country('FR', 'EUR'), country('CH', 'CHF')], country: country('FR', 'EUR'), language: { iso_code: lang, endonym_name: 'français' }, available_languages: [{ iso_code: 'fr', endonym_name: 'français' }, { iso_code: 'en', endonym_name: 'english' }] },
    },
  })
  const schema = schemaOf(`sections/${name}.liquid`)
  const tag = schema.tag || 'div'
  return `<${tag} id="shopify-section-${name}" class="shopify-section${schema.class ? ` ${schema.class}` : ''}">${html}</${tag}>`
}

// Le bloc principal d'une fiche, dans son enveloppe : la page galerie (crochet), ou la fiche 3D d'aujourd'hui.
async function mainSection(galerie, poster = false) {
  const p = product({ poster })
  const html = await renderSection(p, galerie ? { suffix: 'oeuvre-galerie', section: galerieSection() } : { section: sectionOf('templates/product.oeuvre-3d.json') })
  const schema = schemaOf('sections/main-product.liquid')
  return `<${schema.tag} id="shopify-section-template--1__main" class="shopify-section ${schema.class}">${html}</${schema.tag}>`
}

/* Une page produit comme le gabarit la monte : le bandeau, la fiche, le pied de page. sheet : la feuille de la page
   est dans <head> (là où son script la copie, et où elle reste quand la bascule Toile / Poster change la fiche). */
async function sitePage({ galerie, sheet }) {
  const p = product()
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    `<style>${themeColors()}</style>`,
    `<style>${read('assets/output.css')}</style>`,
    sheet ? `<style>${read(CSS)}</style>` : '',
    '</head><body class="w-screen overflow-x-hidden text-main bg-secondary transition-colors duration-500 z-10 scrollbar relative min-h-screen">',
    await staticSection('tw-announcement-bar', p),
    `<div id="wrapper-overlay" class="relative"><main id="MainContent" role="main">${await mainSection(galerie)}</main>`,
    await staticSection('tw-footer', p),
    '</div></body></html>',
  ].join('\n').replace(/<script\b[\s\S]*?<\/script>/g, '')
}

// Une page ouverte dans Chrome, à une largeur donnée, sans réseau. frozen : toutes les animations arrêtées à leur
// début (le texte du bandeau défile sans fin : sans cela, deux pages ne seraient jamais au même point).
// scale : la densité de l'écran (2 sur un téléphone ; à 1, Chrome arrondit une bordure de 1,5 px à 1 px).
async function openPage(html, { width = 390, frozen = false, scale = 1 } = {}) {
  const page = await (await launch()).newPage()
  await page.setViewport({ width, height: 900, deviceScaleFactor: scale })
  await page.setRequestInterception(true)
  page.on('request', (request) => (request.url().startsWith('data:') ? request.continue() : request.abort()))
  if (frozen) {
    const cdp = await page.createCDPSession()
    await cdp.send('Animation.enable')
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 })
  }
  await page.setContent(html, { waitUntil: 'load' })
  // Les polices du thème ne viennent pas (pas de réseau) : la page se stabilise une fois leur échec constaté.
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
  return page
}

// Les styles calculés de chaque élément de la page, toutes propriétés (par ordre de nom), dans l'ordre du document :
// une empreinte par élément. Le texte d'attente d'un champ compte aussi. index : le texte entier d'un seul élément.
const footprints = (page, index = -1) => page.evaluate((index) => {
  const hash = (text) => {
    let h = 2166136261
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(36)
  }
  const describe = (el) => {
    const cs = getComputedStyle(el)
    let text = [...cs].sort().map((name) => `${name}:${cs.getPropertyValue(name)};`).join('')
    if (el.matches('input')) text += `::placeholder:${getComputedStyle(el, '::placeholder').color};`
    return text
  }
  const all = [...document.querySelectorAll('body *')]
  if (index >= 0) return { tag: all[index].outerHTML.slice(0, 120), text: describe(all[index]) }
  return all.map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} ${hash(describe(el))}`)
}, index)
async function assertSameStyles(a, b, label) {
  const [fa, fb] = [await footprints(a), await footprints(b)]
  assert.equal(fa.length, fb.length, `${label} : le même nombre d’éléments`)
  const index = fa.findIndex((f, i) => f !== fb[i])
  if (index < 0) return fa.length
  // Ce qui diffère : les déclarations de l'un qui ne sont pas chez l'autre.
  const [da, db] = [await footprints(a, index), await footprints(b, index)]
  const [la, lb] = [da.text.split(';'), db.text.split(';')]
  const onlyA = la.filter((x) => !lb.includes(x))
  const onlyB = lb.filter((x) => !la.includes(x))
  assert.fail(`${label} : ${da.tag}… diffère : sans la feuille « ${onlyA.slice(0, 6).join(' ; ')} », avec « ${onlyB.slice(0, 6).join(' ; ')} »`)
}

test('navigateur : sans le crochet, la feuille de la page ne change rien, élément par élément', { skip: NO_BROWSER }, async () => {
  // La fiche 3D d'aujourd'hui, avec et sans la feuille de la page dans <head> : les mêmes styles calculés, pour
  // chaque élément du bandeau, de la scène, de la pilule, de la fiche et du pied de page, sur téléphone et sur
  // ordinateur. Toutes les règles de la feuille sont là, celles du socle comme celles de ce ticket.
  const without = await sitePage({ galerie: false, sheet: false })
  const withSheet = await sitePage({ galerie: false, sheet: true })
  assert.doesNotMatch(without, /data-galerie/)
  for (const width of [390, 1440]) {
    const [a, b] = [await openPage(without, { width, frozen: true }), await openPage(withSheet, { width, frozen: true })]
    // Ce que la feuille vise est bien dans la page : le bouton de la pilule, le bandeau, le pied de page et son champ.
    for (const selector of ['.oeuvre-3d-pill .oeuvre-3d-buy', '#shopify-section-tw-announcement-bar p', '#shopify-section-tw-footer footer-logic > svg:first-child path', '#shopify-section-tw-footer input[type="email"] ~ label', '#shopify-section-tw-footer input[type="email"] ~ button']) {
      assert.ok(await b.$(selector), `${selector} : dans la page`)
    }
    const count = await assertSameStyles(a, b, `${width} px`)
    assert.ok(count > 300, `${count} éléments comparés`)
    await a.close()
    await b.close()
  }
})

// Une couleur calculée par Chrome, écrite comme lui : « rgb(r, g, b) ».
const rgbText = (hex) => `rgb(${hexToRgb(hex).join(', ')})`
const tokenHex = (name) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`).exec(sheet().find((r) => r.head === HOOK && !r.context.length).body)[1]

test('navigateur : avec le crochet, le bouton d’achat vermillon, le bandeau pêche, le pied de page menthe et son champ', { skip: NO_BROWSER }, async () => {
  const page = await openPage(await sitePage({ galerie: true, sheet: true }), { width: 390, scale: 2 })
  const style = (selector, ...names) => page.$eval(selector, (el, names) => {
    const cs = getComputedStyle(el)
    return Object.fromEntries(names.map((name) => [name, cs.getPropertyValue(name)]))
  }, names)
  const ink = rgbText(settingsData().main_color)
  const white = 'rgb(255, 255, 255)'
  assert.deepEqual(await style('.oeuvre-3d-buy', 'background-color', 'color'), { 'background-color': rgbText(tokenHex('achat')), color: white })
  assert.deepEqual(await style('#shopify-section-tw-announcement-bar p', 'background-color', 'color'), { 'background-color': rgbText(tokenHex('peche')), color: ink })
  assert.deepEqual(await style('#shopify-section-tw-footer', 'background-color', 'color'), { 'background-color': rgbText(tokenHex('menthe')), color: ink })
  assert.deepEqual(await style('#shopify-section-tw-footer footer-logic > svg:first-child path', 'fill'), { fill: rgbText(tokenHex('menthe')) })
  // Le champ : blanc, un seul contour d'encre, arrondi, 50 px de haut ; le texte d'attente se lit. Le contour est
  // de 1,5 px dans la feuille, comme dans la maquette ; Chrome 158 l'arrondit à 1 px, dans la maquette aussi.
  const field = '#shopify-section-tw-footer input[type="email"]'
  assert.deepEqual(await style(field, 'background-color', 'color', 'border-top-color', 'border-left-color', 'border-top-left-radius', 'height'), { 'background-color': white, color: ink, 'border-top-color': ink, 'border-left-color': ink, 'border-top-left-radius': '999px', height: '50px' })
  const border = (await style(field, 'border-top-width'))['border-top-width']
  assert.ok(['1px', '1.5px'].includes(border), `contour de ${border}`)
  assert.equal(await page.$eval(field, (el) => getComputedStyle(el, '::placeholder').color), `rgba(${hexToRgb(settingsData().main_color).join(', ')}, 0.6)`)
  // Le contour ne s'épaissit plus au survol : la règle du thème (hover:border-2, 2 px) ne passe plus.
  await page.hover(field)
  assert.equal((await style(field, 'border-top-width'))['border-top-width'], border)
  // Son libellé reste dans la page, pour les lecteurs d'écran, sans rien montrer.
  const label = await page.$eval(`${field} ~ label`, (el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, clip: getComputedStyle(el).clipPath, display: getComputedStyle(el).display } })
  assert.deepEqual(label, { width: 1, height: 1, clip: 'inset(50%)', display: 'block' })
  // Son bouton : un rond d'encre de 38 px, la flèche blanche, centré dans la hauteur du champ.
  const button = await page.$eval(`${field} ~ button`, (el) => {
    const r = el.getBoundingClientRect()
    const f = el.parentElement.querySelector('input[type="email"]').getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { size: [r.width, r.height], top: r.top - f.top, right: f.right - r.right, background: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius }
  })
  assert.deepEqual(button, { size: [38, 38], top: 6, right: 6, background: ink, color: white, radius: '50%' })
  await page.close()
})

test('navigateur : avec le crochet, chaque texte du bandeau, de la pilule et du pied de page se lit (AA, 4,5 pour 1)', { skip: NO_BROWSER }, async () => {
  for (const width of [390, 1440]) {
    const page = await openPage(await sitePage({ galerie: true, sheet: true }), { width })
    const checked = await page.evaluate(() => {
      const parse = (text) => (text.match(/[\d.]+/g) || []).map(Number)
      const linear = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
      const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
      const contrast = (a, b) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (hi + 0.05) / (lo + 0.05)
      }
      // Le fond réel d'un élément : ses fonds et ceux de ses parents, composés jusqu'au premier opaque, sur blanc.
      const backdrop = (el) => {
        const layers = []
        for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
          const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor)
          if (a > 0) layers.push([r, g, b, a])
          if (a >= 1) break
        }
        return layers.reverse().reduce((under, [r, g, b, a]) => [r, g, b].map((c, i) => under[i] + (c - under[i]) * a), [255, 255, 255])
      }
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.clipPath !== 'inset(50%)' && el.getClientRects().length > 0
      }
      const out = []
      const zones = ['#shopify-section-tw-announcement-bar', '.oeuvre-3d-pill', '#shopify-section-tw-footer']
      for (const zone of zones) {
        for (const el of document.querySelectorAll(`${zone}, ${zone} *`)) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          // Un texte, un pictogramme des réseaux (sa couleur est celle du lien), ou le champ et son texte d'attente.
          const what = own ? 'texte' : el.matches('#shopify-section-tw-footer li > a[aria-label]') ? 'pictogramme' : el.matches('input[type="email"]') ? 'champ' : null
          if (!what || !visible(el)) continue
          const back = backdrop(el)
          const [r, g, b, a = 1] = parse(getComputedStyle(el).color)
          const ink = [r, g, b].map((c, i) => back[i] + (c - back[i]) * a)
          out.push({ zone, what, text: (el.textContent.trim() || el.getAttribute('aria-label') || el.placeholder || '').slice(0, 40), ratio: contrast(ink, back) })
          if (what === 'champ') {
            const [pr, pg, pb, pa = 1] = parse(getComputedStyle(el, '::placeholder').color)
            out.push({ zone, what: 'texte d’attente', text: el.placeholder, ratio: contrast([pr, pg, pb].map((c, i) => back[i] + (c - back[i]) * pa), back) })
          }
        }
      }
      return out
    })
    for (const zone of ['#shopify-section-tw-announcement-bar', '.oeuvre-3d-pill', '#shopify-section-tw-footer']) assert.ok(checked.some((c) => c.zone === zone), `${width} px : des textes mesurés dans ${zone}`)
    assert.ok(checked.length > 25, `${width} px : ${checked.length} textes mesurés`)
    for (const { zone, what, text, ratio } of checked) assert.ok(ratio >= 4.5, `${width} px, ${zone}, ${what} « ${text} » : ${ratio.toFixed(2)} pour 1`)
    for (const what of ['pictogramme', 'champ', 'texte d’attente']) assert.ok(checked.some((c) => c.what === what), `${width} px : ${what} mesuré`)
    await page.close()
  }
})

test('navigateur : la pilule garde sa forme et la scène son mur, seul le bouton change de couleur', { skip: NO_BROWSER }, async () => {
  // La fiche 3D d'aujourd'hui et la page galerie, avec la même feuille : pour chaque élément de la scène 3D et de
  // la pilule, les mêmes styles calculés, sauf le fond du bouton d'achat. Les variables de la page (--encre…), que
  // tous les éléments de la page galerie héritent, ne comptent pas.
  for (const width of [390, 1440]) {
    const [a, b] = [await openPage(await sitePage({ galerie: false, sheet: true }), { width, frozen: true }), await openPage(await sitePage({ galerie: true, sheet: true }), { width, frozen: true })]
    const styles = (page) => page.evaluate(() => [...document.querySelectorAll('oeuvre-3d, oeuvre-3d *, .oeuvre-3d-pill, .oeuvre-3d-pill *')].map((el) => {
      const cs = getComputedStyle(el)
      const out = {}
      for (let i = 0; i < cs.length; i++) if (!cs[i].startsWith('--') || cs[i] === '--wall') out[cs[i]] = cs.getPropertyValue(cs[i])
      return { tag: `${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`, out }
    }))
    const [sa, sb] = [await styles(a), await styles(b)]
    assert.equal(sa.length, sb.length)
    // Sans son script, la scène n'a que son balisage de départ : une trentaine d'éléments, pilule comprise.
    assert.ok(sa.length > 25, `${sa.length} éléments de la scène et de la pilule`)
    const changes = []
    sa.forEach(({ tag, out }, i) => {
      for (const name of Object.keys(out)) if (out[name] !== sb[i].out[name]) changes.push(`${tag} ${name}`)
    })
    assert.deepEqual(changes, ['button.oeuvre-3d-buy background-color'], `${width} px`)
    // Le mur de la scène est celui d'aujourd'hui.
    assert.equal(sa.find((s) => s.tag.startsWith('oeuvre-3d.')).out['--wall'], sb.find((s) => s.tag.startsWith('oeuvre-3d.')).out['--wall'])
    await a.close()
    await b.close()
  }
})

test('navigateur : la bascule sans rechargement vers une fiche sans crochet lui rend ses couleurs', { skip: NO_BROWSER }, async () => {
  // La page galerie, puis sa fiche remplacée par une fiche sans crochet, comme le fait la bascule Toile / Poster
  // (assets/product-twin-toggle.js) : la feuille reste dans <head>, le bandeau, la pilule et le pied de page
  // reprennent les couleurs de la fiche 3D d'aujourd'hui.
  const reference = await openPage(await sitePage({ galerie: false, sheet: false }))
  const page = await openPage(await sitePage({ galerie: true, sheet: true }))
  const ZONES = '#shopify-section-tw-announcement-bar, #shopify-section-tw-announcement-bar *, .oeuvre-3d-pill, .oeuvre-3d-pill *, #shopify-section-tw-footer, #shopify-section-tw-footer *'
  const PROPERTIES = ['color', 'background-color', 'fill', 'border-top-color', 'border-top-width', 'border-top-left-radius', 'box-shadow', 'width', 'height', 'top', 'right', 'clip-path', 'padding-left', 'padding-right']
  const colors = (p) => p.evaluate((zones, properties) => [...document.querySelectorAll(zones)].map((el) => {
    const cs = getComputedStyle(el)
    return `${el.tagName.toLowerCase()} ${properties.map((name) => cs.getPropertyValue(name)).join(' | ')} | ${getComputedStyle(el, '::placeholder').color}`
  }), ZONES, PROPERTIES)
  const before = await colors(page)
  const html = await mainSection(false)
  await page.evaluate((html) => { document.getElementById('MainContent').innerHTML = html.replace(/<script\b[\s\S]*?<\/script>/g, '') }, html)
  // Le pied de page et le champ changent de couleur en douceur (transition-colors, 500 ms) : on attend la fin.
  await new Promise((resolve) => setTimeout(resolve, 900))
  assert.ok(await page.$('head style:last-of-type') && (await page.$eval('head', (h) => h.innerHTML.includes('main-product-blocks[data-galerie]'))), 'la feuille de la page est toujours dans <head>')
  assert.equal(await page.$('main-product-blocks[data-galerie]'), null)
  const now = await colors(page)
  const expected = await colors(reference)
  assert.notDeepEqual(before, expected, 'avant la bascule, la page galerie a ses propres couleurs')
  assert.deepEqual(now, expected)
  await page.close()
  await reference.close()
})
