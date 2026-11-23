// Le bas de page « même famille » du cocon sémantique (décision de Walid du 23/11/2026) : snippets/cocon-famille.liquid,
// rendu à la fin de sections/main-collection-product-grid.liquid. Le fil d'Ariane monte vers la mère, les pastilles du
// haut descendent vers les filles, ce bloc mène aux sœurs et à la jumelle. Ici, le rendu Liquid (liquidjs) du snippet
// avec le plan réel figé dans scripts/fixtures/cocon-plan.json et des collections d'essai : ce que lisent le client et
// Google, c'est-à-dire les liens, leurs noms et leurs libellés. Et ce qui ne doit plus mener partout : la liste de toutes
// les collections des filtres, « Nos autres collections » des modèles, les liens de collection du « Pour aller plus loin ».
// Sans liquidjs, les tests de rendu se sautent (SKIP dit pourquoi).
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/cocon-famille.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, SKIP, engine } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

const FILE = 'snippets/cocon-famille.liquid'
const LANGS = { fr: 'fr.default.json', en: 'en.json', de: 'de.json', es: 'es.json', nl: 'nl.json' }

/* Une collection d'essai, telle que la donne collections[handle] : son identifiant, son titre, son adresse et son
   nombre de produits. */
let lastId = 500000000000
const col = (handle, title, count = 10, url = `/collections/${handle}`) => ({ id: ++lastId, handle, title, url, all_products_count: count })
/* Les collections d'essai rangées par handle français, comme collections[…] les trouve. */
const byHandle = (...list) => Object.fromEntries(list.map((c) => [c.handle, c]))

/* Le bas de page rendu sur la page d'une collection, dans une langue. */
function render({ page, collections, lang = 'fr', primary = lang === 'fr', plan = PLAN }) {
  return engine(lang).parseAndRenderSync(read(FILE), {}, {
    globals: {
      shop: { metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
      collection: page,
      collections,
      request: { locale: { iso_code: lang, primary } },
    },
  }).trim()
}

const unescape = (text) => text.trim().replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/* Les liens rendus, dans l'ordre : [adresse, nom]. */
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, text]) => [href, unescape(text)])
/* Les rangées, dans l'ordre : le libellé que désigne l'aria-labelledby de leur liste, et les noms de leurs liens. */
function rows(html) {
  return [...html.matchAll(/<ul\b([^>]*)>([\s\S]*?)<\/ul>/g)].map(([, attrs, inner]) => {
    const by = /\baria-labelledby="([^"]+)"/.exec(attrs)
    assert.ok(by, 'chaque liste est nommée par son libellé')
    const label = new RegExp(`<([a-z]+)\\b[^>]*\\bid="${by[1]}"[^>]*>([\\s\\S]*?)</\\1>`).exec(html)
    assert.ok(label, `le libellé #${by[1]} de la liste existe`)
    return { name: unescape(label[2]), links: links(inner).map(([, text]) => text) }
  })
}

/* ---------- Les sœurs et la jumelle ---------- */

// Autour de Tableaux Nature, sujet de Tous les Tableaux : d'autres sujets (Portrait en ligne ; Femme, Ville, Espace à
// créer), une piste créée et pleine (Cinéma), des filles de la racine d'autres rayons (Bleu, Salon, Abstrait), une fille
// de Nature (Animaux) et la jumelle (Poster & Affiche Nature).
const nature = () => byHandle(
  col('tous-les-tableaux', 'Tous les Tableaux', 890),
  col('tableaux-nature-sauvage', 'Tableaux Nature', 327),
  col('tableau-portrait-1', 'Tableau Portrait', 200),
  col('tableau-femme', 'Tableau Femme', 120),
  col('tableau-ville', 'Tableau Ville', 45),
  col('tableau-espace', 'Tableau Espace', 33),
  col('tableau-cinema', 'Tableau Cinéma', 20),
  col('tableau-bleue', 'Tableau Bleu', 90),
  col('tableau-salon', 'Tableau Salon', 496),
  col('tableau-abstrait', 'Tableau Abstrait', 150),
  col('tableau-animaux', 'Tableau Animaux', 152),
  col('posters-affiches-nature', 'Poster & Affiche Nature', 120),
)

test('sous une racine, les sœurs du même rayon seulement, puis la jumelle', { skip: SKIP }, () => {
  const collections = nature()
  assert.deepEqual(rows(render({ page: collections['tableaux-nature-sauvage'], collections })), [
    { name: 'Autres sujets', links: ['Tableau Portrait', 'Tableau Femme', 'Tableau Ville', 'Tableau Espace'] },
    { name: 'Aussi en poster', links: ['Poster & Affiche Nature'] },
  ])
})

// Autour de Tableau Lion, fille de Tableau Animaux : Chevaux (en ligne), Zèbre (sans produit), Oiseaux et Chat (à créer),
// Chien et Éléphant (pas encore créés), la jumelle Poster & Affiche Lion, et Tableaux Nature, la grand-mère.
const lion = () => byHandle(
  col('tableaux-nature-sauvage', 'Tableaux Nature', 327),
  col('tableau-animaux', 'Tableau Animaux', 152),
  col('tableau-cheval', 'Tableau Chevaux', 12),
  col('tableau-lion', 'Tableau Lion', 8),
  col('tableau-zebre', 'Tableau Zèbre', 0),
  col('tableau-oiseaux', 'Tableau Oiseaux', 31),
  col('tableau-chat', 'Tableau Chat', 5),
  col('posters-affiches-lion', 'Poster & Affiche Lion', 9),
)

test('plus bas, toutes les sœurs de la même mère, sous « Aussi dans » la mère', { skip: SKIP }, () => {
  const collections = lion()
  const html = render({ page: collections['tableau-lion'], collections })
  assert.deepEqual(rows(html), [
    { name: 'Aussi dans Tableau Animaux', links: ['Tableau Chevaux', 'Tableau Oiseaux', 'Tableau Chat'] },
    { name: 'Aussi en poster', links: ['Poster & Affiche Lion'] },
  ])
  // Ni la page elle-même, ni sa mère (le fil d'Ariane y mène), ni sa grand-mère.
  assert.deepEqual(links(html).map(([href]) => href), [
    '/collections/tableau-cheval', '/collections/tableau-oiseaux', '/collections/tableau-chat', '/collections/posters-affiches-lion',
  ])
})

test('une page poster a sa jumelle en toile', { skip: SKIP }, () => {
  const collections = byHandle(
    col('posters-affiches-nature', 'Poster & Affiche Nature', 120),
    col('posters-affiches-portrait', 'Poster & Affiche Portrait', 40),
    col('posters-affiches-bleu', 'Poster & Affiche Bleu', 40),
    col('tableaux-nature-sauvage', 'Tableaux Nature', 327),
  )
  assert.deepEqual(rows(render({ page: collections['posters-affiches-nature'], collections })), [
    { name: 'Autres sujets', links: ['Poster & Affiche Portrait'] },
    { name: 'Aussi en toile', links: ['Tableaux Nature'] },
  ])
})

test('une sœur écartée n’a jamais de pastille, même créée et pleine', { skip: SKIP }, () => {
  // Sous Tableau Ethnique : Africain, Islamique, Indiens d'Amérique (en ligne), Asiatique (écartée).
  const collections = byHandle(
    col('tableau-ethnique', 'Tableau Ethnique', 80),
    col('tableau-africain', 'Tableau Africain', 30),
    col('tableau-islamique', 'Tableau Islamique', 22),
    col('tableau-japonais', 'Tableau Japonais', 25),
    col('tableaux-indiens-d-amerique', 'Tableaux indiens d’Amérique', 21),
    col('tableau-asiatique', 'Tableau Asiatique', 12),
  )
  assert.deepEqual(rows(render({ page: collections['tableau-japonais'], collections })), [
    { name: 'Aussi dans Tableau Ethnique', links: ['Tableau Africain', 'Tableau Islamique', 'Tableaux indiens d’Amérique'] },
  ])
})

test('sans jumelle publiée, les sœurs seules ; sans sœur, la jumelle seule', { skip: SKIP }, () => {
  const sansJumelle = nature()
  delete sansJumelle['posters-affiches-nature']
  assert.deepEqual(rows(render({ page: sansJumelle['tableaux-nature-sauvage'], collections: sansJumelle })).map((r) => r.name), ['Autres sujets'])
  // Chevaux, Oiseaux et Chat vides ou absents : Lion n'a plus que sa jumelle.
  const seule = byHandle(col('tableau-animaux', 'Tableau Animaux', 152), col('tableau-lion', 'Tableau Lion', 8), col('tableau-cheval', 'Tableau Chevaux', 0), col('posters-affiches-lion', 'Poster & Affiche Lion', 9))
  assert.deepEqual(rows(render({ page: seule['tableau-lion'], collections: seule })), [
    { name: 'Aussi en poster', links: ['Poster & Affiche Lion'] },
  ])
})

test('rien sur une racine, hors du plan, sans plan, ou quand rien n’a de produit', { skip: SKIP }, () => {
  const collections = nature()
  // Tous les Tableaux n'a ni mère ni jumelle dans le plan.
  assert.equal(render({ page: collections['tous-les-tableaux'], collections }), '')
  // Un papier peint n'est pas dans le plan.
  const papier = col('papier-peint-fleur', 'Papier Peint fleur', 12)
  assert.equal(render({ page: papier, collections: { ...collections, 'papier-peint-fleur': papier } }), '')
  // Sans le champ méta cocon.plan.
  assert.equal(render({ page: collections['tableaux-nature-sauvage'], collections, plan: null }), '')
  // Les sœurs et la jumelle existent, mais aucune n'a de produit.
  const vides = byHandle(col('tableau-animaux', 'Tableau Animaux', 152), col('tableau-lion', 'Tableau Lion', 8), col('tableau-cheval', 'Tableau Chevaux', 0), col('posters-affiches-lion', 'Poster & Affiche Lion', 0))
  assert.equal(render({ page: vides['tableau-lion'], collections: vides }), '')
})

/* ---------- Les autres langues ---------- */

test('hors du français, la page se retrouve par sa collection, et la mère est nommée dans la langue', { skip: SKIP }, () => {
  // Sur /en, collection.handle est traduit (lion-wall-art), mais collections['tableau-lion'] répond toujours.
  const en = byHandle(
    col('tableau-animaux', 'Animal Art Prints', 152, '/en/collections/animal-art-prints'),
    col('tableau-cheval', 'Horse Paintings', 12, '/en/collections/horse-paintings'),
    col('tableau-lion', 'Lion Wall Art', 8, '/en/collections/lion-wall-art'),
    col('posters-affiches-lion', 'Lion Posters', 9, '/en/collections/lion-posters'),
  )
  const page = { ...en['tableau-lion'], handle: 'lion-wall-art' }
  const html = render({ page, collections: en, lang: 'en' })
  assert.deepEqual(rows(html), [
    { name: 'Also in Animal Art Prints', links: ['Horse Paintings'] },
    { name: 'Also as a poster', links: ['Lion Posters'] },
  ])
  assert.deepEqual(links(html).map(([href]) => href), ['/en/collections/horse-paintings', '/en/collections/lion-posters'])
})

test('le repère et les libellés sont nommés dans les cinq langues', { skip: SKIP }, () => {
  const WORDS = {
    fr: ['Collections de la même famille', 'Autres sujets', 'Aussi en poster'],
    en: ['Related collections', 'Other subjects', 'Also as a poster'],
    de: ['Verwandte Kollektionen', 'Weitere Motive', 'Auch als Poster'],
    es: ['Colecciones relacionadas', 'Otros temas', 'También en póster'],
    nl: ['Verwante collecties', 'Andere onderwerpen', 'Ook als poster'],
  }
  const collections = nature()
  for (const [lang, [nav, ...labels]] of Object.entries(WORDS)) {
    const html = render({ page: collections['tableaux-nature-sauvage'], collections, lang })
    assert.deepEqual([...html.matchAll(/<nav\b[^>]*\baria-label="([^"]*)"/g)].map((m) => unescape(m[1])), [nav], `${lang} : un seul repère, nommé`)
    assert.deepEqual(rows(html).map((r) => r.name), labels, `${lang} : les libellés`)
  }
})

test('chaque langue nomme les sœurs de chaque rayon, la mère et la jumelle', () => {
  const RAYONS = ['piece', 'style', 'sujet', 'couleur', 'inspiration', 'personnalise']
  for (const [lang, file] of Object.entries(LANGS)) {
    const famille = json(`locales/${file}`).sections.sous_collections.famille
    assert.ok(famille, `${lang} : sections.sous_collections.famille`)
    for (const key of ['nav', 'dans', 'soeurs', 'en_poster', 'en_toile']) assert.ok(famille[key], `${lang} : ${key}`)
    assert.match(famille.dans, /\{\{ titre \}\}/, `${lang} : la mère est nommée dans « dans »`)
    for (const rayon of RAYONS) assert.ok(famille.autres[rayon], `${lang} : autres.${rayon}`)
  }
})

test('le bloc ne donne jamais sa largeur à la page (contain: inline-size)', { skip: SKIP }, () => {
  // Relevé du 23/11/2026 : sans cette règle, la rangée qui défile élargissait la page à 686 px sur un téléphone de 390 px.
  const collections = nature()
  const nav = /<nav\b[^>]*\bclass="([^"]*)"/.exec(render({ page: collections['tableaux-nature-sauvage'], collections }))
  assert.ok(nav, 'le repère du bloc')
  assert.ok(nav[1].split(/\s+/).includes('[contain:inline-size]'), 'le repère porte [contain:inline-size]')
  assert.match(read('assets/output.css'), /\.\\\[contain\\:inline-size\\\]\{contain:inline-size\}/, 'la règle est dans output.css')
})

test('aucun titre : le seul H1 de la page reste celui de l’éditorial', { skip: SKIP }, () => {
  const collections = nature()
  assert.doesNotMatch(render({ page: collections['tableaux-nature-sauvage'], collections }), /<h[1-6]\b/)
})

/* ---------- Ce qui ne mène plus partout ---------- */

test('la grille des produits pose le bas de page sur toutes les pages de collection', () => {
  assert.match(read('sections/main-collection-product-grid.liquid'), /\{%-?\s*render 'cocon-famille'\s*-?%\}/)
})

test('les filtres ne listent plus toutes les collections du même type', () => {
  for (const file of ['snippets/filter-sidebar.liquid', 'snippets/tw-filter-drawer.liquid']) {
    assert.doesNotMatch(read(file), /render 'collection-navigation-section'/, `${file} : plus de liste « Autres collections »`)
  }
})

test('aucun modèle de collection n’affiche « Nos autres collections »', () => {
  const files = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^collection(\.[^.]+)?\.json$/.test(name))
  for (const file of files) {
    const { sections } = json(`templates/${file}`)
    for (const [key, section] of Object.entries(sections)) {
      if (section.type === 'collection-list') assert.ok(section.disabled, `${file} : ${key} désactivée`)
    }
  }
})

test('les grands blocs qui répétaient les pastilles sont désactivés (choix de Walid du 23/11/2026)', () => {
  // Tableaux Nature, Tableau Animaux, Tableau Chambre, Tableau Chambre Enfant, Tableau Ethnique.
  for (const name of ['tableau-paysage', 'tableaux-animaux', 'chambre', 'chambre-enfant', 'ethnique']) {
    const { sections } = json(`templates/collection.${name}.json`)
    const grids = Object.entries(sections).filter(([, s]) => s.type === 'collections-pages-grid')
    assert.ok(grids.length, `collection.${name}.json : un grand bloc`)
    for (const [key, s] of grids) assert.ok(s.disabled, `collection.${name}.json : ${key} désactivé`)
  }
})

/* ---------- « Pour aller plus loin » ---------- */

/* L'éditorial d'une collection, avec ses champs méta (custom.*), sur la page 1. */
function editorial({ cocon, lang = 'fr', root = lang === 'fr' ? '/' : `/${lang}` }) {
  const mf = (value) => ({ value })
  const page = {
    id: 1, handle: 'tableau-cuisine', title: 'Tableau Cuisine', url: '/collections/tableau-cuisine',
    metafields: { custom: { intro: mf('Une intro.'), guide: mf('<h2>Le guide</h2><p>Un paragraphe.</p>'), faq: mf([]), cocon_links: mf(cocon) } },
  }
  return engine(lang).parseAndRenderSync(read('snippets/collection-editorial-auto.liquid'), {}, {
    globals: {
      collection: page, collections: {}, settings: {}, current_page: 1, routes: { root_url: root },
      request: { locale: { iso_code: lang, primary: lang === 'fr' } },
    },
  })
}
/* Le paragraphe « Pour aller plus loin » rendu, ou null. */
const plusLoin = (html) => {
  const p = /<p\b[^>]*>\s*<strong\b[^>]*>([^<]*)<\/strong>([\s\S]*?)<\/p>/.exec(html)
  return p ? { label: unescape(p[1]), links: links(p[2]) } : null
}

test('« Pour aller plus loin » ne garde que les articles et les pages', { skip: SKIP }, () => {
  const cocon = [
    { url: '/collections/tableau-fleurs', label: 'Tableaux de fleurs' },
    { url: '/blogs/tableau-cuisine/comment-amenager-sa-cuisine', label: 'Comment aménager sa cuisine' },
    { url: '/collections/affiches-poster-cuisine', label: 'Poster & Affiche Cuisine' },
    { url: '/pages/guide-de-tailles', label: 'Guide des tailles' },
  ]
  assert.deepEqual(plusLoin(editorial({ cocon })), {
    label: 'Pour aller plus loin :',
    links: [['/blogs/tableau-cuisine/comment-amenager-sa-cuisine', 'Comment aménager sa cuisine'], ['/pages/guide-de-tailles', 'Guide des tailles']],
  })
  // Hors du français, l'article garde la langue de la page.
  assert.deepEqual(plusLoin(editorial({ cocon, lang: 'en' })).links.map(([href]) => href), ['/en/blogs/tableau-cuisine/comment-amenager-sa-cuisine', '/en/pages/guide-de-tailles'])
})

test('« Pour aller plus loin » disparaît quand il ne menait qu’à des collections', { skip: SKIP }, () => {
  const html = editorial({ cocon: [{ url: '/collections/tableau-fleurs', label: 'Tableaux de fleurs' }, { url: '/collections/posters-affiches-nature', label: 'Poster & Affiche Nature' }] })
  assert.equal(plusLoin(html), null)
  assert.doesNotMatch(html, /Pour aller plus loin/)
  assert.doesNotMatch(html, /\/collections\//)
})
