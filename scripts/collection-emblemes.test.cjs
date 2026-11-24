// La nouvelle page collection, ticket 03 (dossier .scratch/collection-design) : les sous-collections en emblèmes.
// Chaque fille de la page devient un emblème (snippets/collection-embleme.liquid) : un détail détouré d'un de ses
// tableaux (métachamp de collection cocon.embleme), posé sur un rond de couleur (cocon.embleme_couleur) ; sans emblème,
// le même rond avec l'initiale ; dessous, le nom entier de la collection, son sujet en gras (ticket 09), et son nombre de
// tableaux. La section des pastilles (sections/sous-collections.liquid) les rend avec le réglage « style » à
// « emblèmes », le seul que pose le modèle caché (templates/collection.refonte.json) ; partout ailleurs, les pastilles
// d'aujourd'hui, au caractère près (copie de la section d'avant : scripts/fixtures/sous-collections.avant-emblemes.liquid).
// Ici, le rendu Liquid (liquidjs) avec le plan figé du cocon (scripts/fixtures/cocon-plan.json) : sans liquidjs, ces
// tests se sautent (SKIP dit pourquoi) et le reste passe.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-emblemes.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, schemaOf, rules, blocs, SKIP, engine, locales, LANGS, modeleNouvellePage } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

const SECTION = 'sections/sous-collections.liquid'
const AVANT = 'scripts/fixtures/sous-collections.avant-emblemes.liquid'

/* Le filtre t de Shopify, avec son pluriel : t: count: n prend la forme que les règles de la langue donnent à n
   (one, other, many… : celles du CLDR, comme Intl.PluralRules), comme Shopify. Le banc commun ne connaît pas le
   pluriel ; ce fichier tourne dans son propre processus, son moteur ne sert qu'à lui. */
if (!SKIP) {
  for (const lang of Object.keys(LANGS)) {
    engine(lang).registerFilter('t', (key, ...args) => {
      const values = Object.fromEntries(args.filter(Array.isArray))
      let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
      if (text && typeof text === 'object' && 'count' in values) text = text[new Intl.PluralRules(lang).select(Number(values.count))] ?? text.other
      if (typeof text !== 'string') return key
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
    })
  }
}

/* Une collection d'essai, telle que la donne collections[handle] : son identifiant, son titre, son adresse, son
   nombre de produits et ses métachamps. */
let lastId = 500000000000
const col = (handle, title, count = 10, { url = `/collections/${handle}`, metafields = {} } = {}) => ({ id: ++lastId, handle, title, url, all_products_count: count, metafields })
const byHandle = (...list) => Object.fromEntries(list.map((c) => [c.handle, c]))

/* La section rendue sur la page d'une collection, dans une langue, avec ses réglages. file : la section d'aujourd'hui
   ou sa copie d'avant les emblèmes. */
function render({ file = SECTION, page, collections, lang = 'fr', primary = lang === 'fr', plan = PLAN, settings = {} }) {
  const source = read(file)
  return engine(lang).parseAndRenderSync(source.slice(0, source.indexOf('{% schema %}')), {}, {
    globals: {
      shop: { metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
      collection: page,
      collections,
      request: { locale: { iso_code: lang, primary } },
      section: { id: 'template--1__sous_collections', settings },
    },
  })
}

/* ---------- Les données des pages ---------- */

// Tableau Animaux et ses filles : Chevaux, Lion, Zèbre (en ligne, sans produit), Oiseaux, Chat (à créer, créés).
const animaux = () => byHandle(
  col('tableau-animaux', 'Tableau Animaux', 152),
  col('tableau-cheval', 'Tableau Chevaux', 12),
  col('tableau-lion', 'Tableau Lion', 8),
  col('tableau-zebre', 'Tableau Zèbre', 0),
  col('tableau-oiseaux', 'Tableau Oiseaux', 3),
  col('tableau-chat', 'Tableau Chat', 5),
)
// Tous les Tableaux : une fille ou plus par rayon, le best-seller fondu, une piste et une fille écartée.
const tableaux = () => byHandle(
  col('tous-les-tableaux', 'Tous les Tableaux', 890),
  col('best-sellers', 'Nos best-sellers', 122),
  col('bestsellers-1', 'Tableau best-seller', 90),
  col('tableau-salon', 'Tableau Salon', 496),
  col('tableau-chambre', 'Tableau Chambre', 300),
  col('tableau-abstrait', 'Tableau Abstrait', 150),
  col('tableau-zen', 'Tableau Zen', 140),
  col('tableau-moderne', 'Tableau Moderne', 60),
  col('tableau-portrait-1', 'Tableau Portrait', 200),
  col('tableaux-nature-sauvage', 'Tableaux Nature', 327),
  col('tableau-bleue', 'Tableau Bleu', 90),
  col('tableau-rose', 'Tableau Rose', 40),
  col('tableau-cinema', 'Tableau Cinéma', 20),
  col('tableau-contemporain', 'Tableau Contemporain', 33),
)
// Tous les Posters & Affiches : une fille par rayon, dont les deux personnalisés.
const posters = () => byHandle(
  col('posters-affiches', 'Tous les Posters & Affiches', 680),
  col('tableau-personnalise-famille', 'Poster Personnalisé Famille', 3),
  col('horoscope-bebe', 'Poster bébé : Signe Astrologique aquarelle', 12),
  col('posters-affiches-bleu', 'Poster & Affiche Bleu', 40),
  col('posters-affiches-nature', 'Poster & Affiche Nature', 120),
  col('posters-affiches-abstrait', 'Poster & Affiche Abstrait', 90),
  col('posters-affiches-salon', 'Poster & Affiche Salon', 300),
  col('posters-affiches-best-sellers', 'Poster & Affiche Best-Sellers', 32),
)
// Sur /en, le handle de la page est traduit ; collections[handle français] répond toujours.
const anglais = () => byHandle(
  col('tableau-animaux', 'Animal Art Prints', 152, { url: '/en/collections/animal-art-prints' }),
  col('tableau-cheval', 'Horse Paintings', 12, { url: '/en/collections/horse-paintings' }),
  col('tableau-lion', 'Lion Wall Art', 8, { url: '/en/collections/lion-wall-art' }),
)

/* ---------- Les pastilles ne changent pas ---------- */

test('en « pastilles », réglage par défaut, la section rend au caractère près ce qu’elle rendait avant les emblèmes', { skip: SKIP }, () => {
  const pages = [
    ['Tableau Animaux', animaux(), 'tableau-animaux'],
    ['Tous les Tableaux', tableaux(), 'tous-les-tableaux'],
    ['Tous les Posters', posters(), 'posters-affiches'],
    ['une page sans fille', animaux(), 'tableau-cheval'],
  ]
  for (const [name, collections, handle] of pages) {
    const avant = render({ file: AVANT, page: collections[handle], collections })
    assert.ok(name === 'une page sans fille' || avant.includes('pastille-collection'), `${name} : des pastilles`)
    for (const settings of [{}, { style: 'pastilles' }]) {
      assert.equal(render({ page: collections[handle], collections, settings }), avant, `${name}, ${JSON.stringify(settings)}`)
    }
  }
  // En anglais : la page se retrouve par sa collection.
  const en = anglais()
  const page = { ...en['tableau-animaux'], handle: 'animal-art-prints' }
  assert.equal(render({ page, collections: en, lang: 'en', settings: { style: 'pastilles' } }), render({ file: AVANT, page, collections: en, lang: 'en' }))
  // Sans plan : rien, comme avant.
  assert.equal(render({ page: animaux()['tableau-animaux'], collections: animaux(), plan: null, settings: { style: 'pastilles' } }), '')
})

/* ---------- Un emblème ---------- */

const FILES = '//www.myselfmonart.com/cdn/shop/files/'
/* Le fichier d'un emblème, tel que le donne le métachamp cocon.embleme (fichier, image) : une image de Shopify. Ceux de
   la famille Nature font 640 × 528 px (.scratch/collection-design/livrables/emblemes). */
const fichier = (name, width = 640, height = 528) => ({ id: 31000 + width, src: `${FILES}${name}?v=1`, width, height, aspect_ratio: width / height, alt: '', media_type: 'image' })
/* Une collection avec son emblème et, s'il y en a une, la couleur de son rond. */
const avecEmbleme = (handle, title, count, couleur, file = fichier(`embleme-${handle}.webp`)) => col(handle, title, count, {
  metafields: { cocon: { embleme: { value: file }, ...(couleur ? { embleme_couleur: { value: couleur } } : {}) } },
})

/* Le snippet rendu seul, avec ses paramètres, comme {% render 'collection-embleme', … %}. */
const emblem = (cible, { rang = 0, taille = 'haut', tout_de_suite = false, lang = 'fr' } = {}) => engine(lang).renderFileSync('collection-embleme', { cible, rang, taille, tout_de_suite })

/* Les balises <name …> d'un HTML, chacune en { attribut: valeur } (un attribut sans valeur vaut ''). */
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'g'))].map(([, attrs]) => Object.fromEntries([...attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [key, value ?? ''])))
/* Un srcset en [adresse, largeur]. */
const srcset = (value) => value.split(',').map((part) => part.trim().split(/\s+/))

test('avec un emblème : l’image prête, décorative, à ses dimensions, de 160 à 640 px de large', { skip: SKIP }, () => {
  const html = emblem(avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel'))
  const imgs = tags(html, 'img')
  assert.equal(imgs.length, 1, 'une image')
  const [img] = imgs
  // Un décor : le nom de la collection est écrit juste dessous.
  assert.equal(img.alt, '')
  assert.equal(img.width, '640')
  assert.equal(img.height, '528')
  const url = (width) => `${FILES}embleme-tableau-animaux.webp?v=1&width=${width}`
  assert.deepEqual(srcset(img.srcset), [[url(160), '160w'], [url(240), '240w'], [url(320), '320w'], [url(480), '480w'], [url(640), '640w']])
  assert.equal(img.src, url(320))
  // Deux fois le diamètre du rond : 58 px sur téléphone, 80 px sur ordinateur.
  assert.equal(img.sizes, '(min-width: 900px) 160px, 116px')
  assert.equal(img.loading, 'lazy')
  assert.equal(img.decoding, 'async')
  // Un fichier plus petit : jamais une largeur qu'il n'a pas.
  const petit = emblem(avecEmbleme('tableau-mer-1', 'Tableau Mer', 39, 'menthe', fichier('embleme-mer.webp', 480, 396)))
  assert.deepEqual(srcset(tags(petit, 'img')[0].srcset).map(([, w]) => w), ['160w', '240w', '320w', '480w'])
  assert.equal(tags(petit, 'img')[0].width, '480')
})

/* Le texte de l'initiale d'un emblème rendu (null sans initiale). */
const initiale = (html) => (/<span class="c-emb-initiale">([^<]*)<\/span>/.exec(html) || [])[1] ?? null

test('sans emblème : le même rond, avec l’initiale du sujet du titre, en capitale', { skip: SKIP }, () => {
  const html = emblem(col('tableau-mer-1', 'Tableau Mer', 39))
  assert.equal(tags(html, 'img').length, 0, 'aucune image')
  assert.equal(initiale(html), 'M')
  assert.equal(initiale(emblem(col('bestsellers-1', 'Tableau best-seller', 90))), 'B')
  assert.equal(initiale(emblem(col('tableau-ete', 'Tableau Été', 5))), 'É')
  assert.equal(initiale(emblem(col('poster-nature', 'Poster & Affiche Nature', 120))), 'N')
  // Un fichier qui n'est pas une image (aucune largeur) : l'initiale aussi.
  const pdf = col('tableau-lion', 'Tableau Lion', 8, { metafields: { cocon: { embleme: { value: { id: 7, url: '/cdn/shop/files/lion.pdf' } } } } })
  assert.equal(initiale(emblem(pdf)), 'L')
  // Avec un emblème, pas d'initiale.
  assert.equal(initiale(emblem(avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel'))), null)
})

test('le rond, vide, est toujours là : la règle *:empty du thème ne le cache pas', { skip: SKIP }, () => {
  for (const cible of [col('tableau-mer-1', 'Tableau Mer', 39), avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel')]) {
    const html = emblem(cible)
    // Dans le cadre décoratif, que les lecteurs d'écran ne lisent pas.
    assert.match(html, /<span class="c-emb-cadre" aria-hidden="true">\s*<span class="c-emb-rond" data-allow-empty><\/span>/, cible.title)
  }
})

test('la couleur du rond : celle du métachamp, sinon selon le rang (ciel, soleil, menthe, rose, puis on recommence)', { skip: SKIP }, () => {
  const fond = (html) => tags(html, 'li')[0]['data-fond']
  // Le métachamp, quel que soit le rang, emblème posé ou non.
  for (const couleur of ['ciel', 'soleil', 'menthe', 'rose', 'lilas', 'peche', 'bleu', 'gris', 'orange', 'rouge', 'violet', 'beige', 'vert']) {
    assert.equal(fond(emblem(avecEmbleme('tableau-espace', 'Tableau Espace', 33, couleur), { rang: 2 })), couleur)
    assert.equal(fond(emblem(col('tableau-ville', 'Tableau Ville', 72, { metafields: { cocon: { embleme_couleur: { value: couleur } } } }), { rang: 3 })), couleur)
  }
  // Saisi à la main dans l'admin, avec une capitale ou une espace de trop : reconnu.
  assert.equal(fond(emblem(col('tableau-ville', 'Tableau Ville', 72, { metafields: { cocon: { embleme_couleur: { value: ' Lilas ' } } } }))), 'lilas')
  // Sans métachamp : le rang.
  const sans = col('tableau-arbre', 'Tableau Arbre', 21)
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((rang) => fond(emblem(sans, { rang }))), ['ciel', 'soleil', 'menthe', 'rose', 'ciel', 'soleil', 'menthe', 'rose', 'ciel'])
  // Une valeur qui n'est pas une couleur de la page : le rang aussi.
  assert.equal(fond(emblem(col('tableau-ville', 'Tableau Ville', 72, { metafields: { cocon: { embleme_couleur: { value: 'turquoise' } } } }), { rang: 1 })), 'soleil')
})

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/* Le texte d'un morceau de HTML, sans ses balises, ses blancs resserrés. */
const texte = (html) => unescape(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
/* Les liens d'un HTML, dans l'ordre : [adresse, texte]. */
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, inner]) => [href, texte(inner)])

test('le lien : le titre traduit, coupé sur son sujet (petites capitales, puis gras) mais lu en entier', { skip: SKIP }, () => {
  const html = emblem(avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel'))
  assert.deepEqual(links(html), [['/collections/tableau-animaux', 'Tableau Animaux']])
  assert.match(html, /<a class="c-emb-lien" href="\/collections\/tableau-animaux"><span class="c-emb-mot">Tableau<\/span> <span class="c-emb-nom">Animaux<\/span><\/a>/)
  // Échappé ; le sujet seul en gras (le découpage sur de vrais titres : scripts/collection-mots.test.cjs).
  const poster = emblem(col('posters-affiches-nature', 'Poster & Affiche Nature', 120))
  assert.match(poster, /<span class="c-emb-mot">Poster &amp; Affiche<\/span> <span class="c-emb-nom">Nature<\/span>/)
  assert.deepEqual(links(poster), [['/collections/posters-affiches-nature', 'Poster & Affiche Nature']])
  // Un titre d'un seul mot : rien au-dessus du nom.
  assert.deepEqual(links(emblem(col('abstrait', 'Abstrait', 4))), [['/collections/abstrait', 'Abstrait']])
  // En anglais, le titre et l'adresse traduits.
  assert.deepEqual(links(emblem(col('tableau-animaux', 'Animal Art Prints', 152, { url: '/en/collections/animal-art-prints' }), { lang: 'en' })), [['/en/collections/animal-art-prints', 'Animal Art Prints']])
  // Aucun titre : le seul H1 de la page est celui de la collection.
  assert.doesNotMatch(html, /<h[1-6]\b/)
})

/* Le nombre de tableaux d'un emblème rendu. */
const nombre = (html) => texte((/<span class="c-emb-nb">([\s\S]*?)<\/span>/.exec(html) || [])[1] ?? '')

test('le nombre de tableaux, hors du lien : « 1 tableau », « 152 tableaux », dans les cinq langues', { skip: SKIP }, () => {
  const WORDS = {
    fr: ['1 tableau', '152 tableaux'],
    en: ['1 artwork', '152 artworks'],
    de: ['1 Bild', '152 Bilder'],
    es: ['1 cuadro', '152 cuadros'],
    nl: ['1 schilderij', '152 schilderijen'],
  }
  for (const [lang, [un, plusieurs]] of Object.entries(WORDS)) {
    assert.equal(nombre(emblem(col('tableau-lion', 'Tableau Lion', 1), { lang })), un, lang)
    const html = emblem(avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel'), { lang })
    assert.equal(nombre(html), plusieurs, lang)
    // Hors du lien : le lien ne dit que le nom de la collection.
    assert.deepEqual(links(html).map(([, name]) => name), ['Tableau Animaux'], lang)
  }
})

/* ---------- Les sous-collections en emblèmes ---------- */

const EMBLEMES = { style: 'emblemes' }
/* Les listes d'une section rendue, dans l'ordre : le libellé que désigne leur aria-labelledby (null sans libellé), sa
   classe, et les noms de leurs liens. */
function groups(html) {
  return [...html.matchAll(/<ul\b([^>]*)>([\s\S]*?)<\/ul>/g)].map(([, attrs, inner]) => {
    const by = /\baria-labelledby="([^"]+)"/.exec(attrs)
    let name = null
    let classe = null
    if (by) {
      const label = new RegExp(`<([a-z]+)\\b([^>]*)\\bid="${by[1]}"[^>]*>([\\s\\S]*?)</\\1>`).exec(html)
      assert.ok(label, `le libellé #${by[1]} de la liste existe`)
      name = texte(label[3])
      classe = (/\bclass="([^"]*)"/.exec(label[0]) || [])[1] ?? null
    }
    return { name, classe, links: links(inner).map(([, text]) => text) }
  })
}

// Tableaux Nature, la page de la maquette : Animaux, Fleurs, Mer, Paysage (en ligne), Arbre (à créer, pas encore créée).
const nature = (emblemes = false) => {
  const fille = (handle, title, count, couleur) => (emblemes ? avecEmbleme(handle, title, count, couleur) : col(handle, title, count))
  return byHandle(
    col('tableaux-nature-sauvage', 'Tableaux Nature', 327),
    fille('tableau-animaux', 'Tableau Animaux', 152, 'ciel'),
    fille('tableau-fleurs', 'Tableau Fleurs', 115, 'soleil'),
    fille('tableau-mer-1', 'Tableau Mer', 39, 'menthe'),
    fille('tableau-paysage', 'Tableau Paysage', 90, 'rose'),
  )
}

test('en « emblèmes », les liens des pastilles d’aujourd’hui, dans le même ordre, chacun une fois', { skip: SKIP }, () => {
  const pages = [
    ['Tableaux Nature', nature(), 'tableaux-nature-sauvage', 'fr'],
    ['Tableau Animaux', animaux(), 'tableau-animaux', 'fr'],
    ['Tous les Tableaux', tableaux(), 'tous-les-tableaux', 'fr'],
    ['Tous les Posters', posters(), 'posters-affiches', 'fr'],
  ]
  for (const [name, collections, handle, lang] of pages) {
    const page = collections[handle]
    const avant = links(render({ file: AVANT, page, collections, lang }))
    assert.ok(avant.length >= 2, `${name} : des pastilles`)
    const html = render({ page, collections, lang, settings: EMBLEMES })
    assert.deepEqual(links(html), avant, name)
    assert.equal(new Set(links(html).map(([href]) => href)).size, avant.length, `${name} : chaque fille une seule fois`)
    // Chaque lien est un emblème : aucune pastille.
    assert.equal(tags(html, 'li').filter((li) => li.class === 'c-emb').length, avant.length, name)
    assert.doesNotMatch(html, /pastille-collection/, name)
  }
  // Hors du français, la page se retrouve par sa collection, comme les pastilles.
  const en = anglais()
  const page = { ...en['tableau-animaux'], handle: 'animal-art-prints' }
  assert.deepEqual(links(render({ page, collections: en, lang: 'en', settings: EMBLEMES })), [
    ['/en/collections/horse-paintings', 'Horse Paintings'],
    ['/en/collections/lion-wall-art', 'Lion Wall Art'],
  ])
})

test('Tableaux Nature en emblèmes : Animaux, Fleurs, Mer, Paysage, leurs nombres, leurs ronds, comme la maquette', { skip: SKIP }, () => {
  const collections = nature()
  const html = render({ page: collections['tableaux-nature-sauvage'], collections, settings: EMBLEMES })
  assert.deepEqual(groups(html), [{ name: null, classe: null, links: ['Tableau Animaux', 'Tableau Fleurs', 'Tableau Mer', 'Tableau Paysage'] }])
  const items = html.split('<li ').slice(1)
  assert.deepEqual(items.map(nombre), ['152 tableaux', '115 tableaux', '39 tableaux', '90 tableaux'])
  // Avant le ticket 04 : ronds et initiales, la couleur selon le rang.
  assert.deepEqual(items.map(initiale), ['A', 'F', 'M', 'P'])
  assert.deepEqual(tags(html, 'li').map((li) => li['data-fond']), ['ciel', 'soleil', 'menthe', 'rose'])
  // Les emblèmes posés : leurs images, leurs couleurs (livrables/emblemes/emblemes.json).
  const poses = nature(true)
  const avec = render({ page: poses['tableaux-nature-sauvage'], collections: poses, settings: EMBLEMES })
  assert.deepEqual(tags(avec, 'img').map((img) => img.src), ['animaux', 'fleurs', 'mer-1', 'paysage'].map((s) => `${FILES}embleme-tableau-${s}.webp?v=1&width=320`))
  assert.deepEqual(avec.split('<li ').slice(1).map(initiale), [null, null, null, null])
})

/* Sur une racine, les cinq rangées (best-seller, pièces, styles, sujets, couleurs) prenaient environ 750 px sur
   téléphone avant les premiers tableaux : une seule rangée qui défile, les rayons à la suite (Walid, 24/11/2026). */
test('une racine a une seule rangée qui défile : les rangées d’avant à la suite, dans l’ordre d’aujourd’hui', { skip: SKIP }, () => {
  for (const [collections, handle] of [[tableaux(), 'tous-les-tableaux'], [posters(), 'posters-affiches']]) {
    const page = collections[handle]
    const avant = groups(render({ file: AVANT, page, collections }))
    assert.ok(avant.length >= 5, `${handle} : les rangées d'avant`)
    const rows = groups(render({ page, collections, settings: EMBLEMES }))
    // Une seule liste, sans libellé (le repère de navigation la nomme) : les mêmes filles, le best-seller d'abord.
    assert.equal(rows.length, 1, `${handle} : une seule rangée`)
    assert.equal(rows[0].name, null, handle)
    assert.deepEqual(rows[0].links, avant.flatMap((g) => g.links), handle)
  }
  // Ailleurs, une seule rangée, sans libellé.
  const collections = animaux()
  assert.deepEqual(groups(render({ page: collections['tableau-animaux'], collections, settings: EMBLEMES })).map((g) => g.name), [null])
})

test('en « emblèmes », un seul repère de navigation, nommé dans les cinq langues, et aucun titre', { skip: SKIP }, () => {
  const NAV = { fr: 'Sous-collections', en: 'Subcollections', de: 'Unterkollektionen', es: 'Subcolecciones', nl: 'Subcollecties' }
  const collections = tableaux()
  for (const [lang, nav] of Object.entries(NAV)) {
    const html = render({ page: collections['tous-les-tableaux'], collections, lang, settings: EMBLEMES })
    assert.deepEqual([...html.matchAll(/<nav\b[^>]*\baria-label="([^"]*)"/g)].map((m) => unescape(m[1])), [nav], lang)
    assert.doesNotMatch(html, /<h[1-6]\b/, lang)
  }
})

test('en « emblèmes », rien sans plan, ni sur une page sans fille à montrer', { skip: SKIP }, () => {
  const collections = animaux()
  assert.equal(render({ page: collections['tableau-animaux'], collections, plan: null, settings: EMBLEMES }), '')
  assert.equal(render({ page: collections['tableau-cheval'], collections, settings: EMBLEMES }), '')
  const vides = byHandle(col('tableau-animaux', 'Tableau Animaux', 152), col('tableau-cheval', 'Tableau Chevaux', 0), col('tableau-lion', 'Tableau Lion', 0))
  assert.equal(render({ page: vides['tableau-animaux'], collections: vides, settings: EMBLEMES }), '')
})

test('en haut de page, les quatre premiers emblèmes arrivent tout de suite, les autres à la demande', { skip: SKIP }, () => {
  // Une racine, tous ses emblèmes posés, en une seule rangée.
  const collections = Object.fromEntries(Object.entries(tableaux()).map(([handle, c]) => [handle, avecEmbleme(handle, c.title, c.all_products_count, null)]))
  const html = render({ page: collections['tous-les-tableaux'], collections, settings: EMBLEMES })
  const loading = tags(html, 'img').map((img) => img.loading)
  assert.ok(loading.length > 6)
  assert.deepEqual(loading, loading.map((v, i) => (i < 4 ? 'eager' : 'lazy')))
  // Sans métachamp de couleur, le rang se suit d'un bout à l'autre de la rangée : jamais deux ronds pareils côte à côte.
  const rows = html.split('<ul ').slice(1).map((row) => tags(row.slice(0, row.indexOf('</ul>')), 'li').map((li) => li['data-fond']))
  assert.equal(rows.length, 1)
  const cycle = ['ciel', 'soleil', 'menthe', 'rose']
  assert.deepEqual(rows[0], rows[0].map((_, i) => cycle[i % cycle.length]))
})

test('un emblème en bas de page, en grand : 104 px et 136 px de rond ; en haut de page, les premiers arrivent tout de suite', { skip: SKIP }, () => {
  const cible = avecEmbleme('tableau-femme', 'Tableau Femme', 89, 'menthe')
  assert.equal(tags(emblem(cible, { taille: 'bas' }), 'img')[0].sizes, '(min-width: 900px) 272px, 208px')
  assert.equal(tags(emblem(cible, { taille: 'bas' }), 'img')[0].loading, 'lazy')
  assert.equal(tags(emblem(cible, { tout_de_suite: true }), 'img')[0].loading, 'eager')
})

/* ---------- Les modèles de collection ---------- */

test('seuls les modèles de la nouvelle page passent les sous-collections en emblèmes ; les autres modèles gardent les pastilles', () => {
  const files = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^collection(\.[^.]+)?\.json$/.test(name))
  assert.ok(files.includes('collection.refonte.json'), 'le modèle caché')
  // La nouvelle page : collection.refonte.json et, depuis le ticket 09, un collection.refonte-<suffixe>.json par modèle à
  // grille (leur liste : scripts/collection-modeles.test.cjs).
  for (const file of files) {
    const sous = Object.values(json(`templates/${file}`).sections).filter((s) => s.type === 'sous-collections')
    assert.equal(sous.length, 1, file)
    const style = (sous[0].settings || {}).style || 'pastilles'
    assert.equal(style, modeleNouvellePage(file) ? 'emblemes' : 'pastilles', file)
  }
})

/* ---------- Le réglage de la section ---------- */

test('le réglage « style » : une liste, « pastilles » par défaut, ou « emblèmes » ; un schéma que Shopify accepte', () => {
  const schema = schemaOf(SECTION)
  // Shopify refuse un nom de plus de 25 caractères (le fichier refusé fait réimporter l'ancienne version).
  assert.ok(schema.name.length <= 25, schema.name)
  const style = schema.settings.find((s) => s.id === 'style')
  assert.ok(style, 'le réglage')
  assert.equal(style.type, 'select')
  assert.equal(style.default, 'pastilles')
  assert.deepEqual(style.options.map((o) => o.value), ['pastilles', 'emblemes'])
  for (const o of style.options) assert.ok(o.label, o.value)
})

/* ---------- La feuille ---------- */

const CSS = 'assets/collection-refonte.css'
const HOOK = ':root[data-refonte-page]'
const LARGE = '@media (min-width: 900px)'
const NO_PREF = '@media (prefers-reduced-motion: no-preference)'
/* Les règles du bloc du ticket 03, sans ses commentaires : { head, body, context }. */
function monBloc() {
  const marks = blocs(CSS)
  const i = marks.findIndex((m) => m.ticket === '03' && m.side === 'début')
  assert.ok(i >= 0, 'le bloc du ticket 03')
  return rules(read(CSS).slice(marks[i].end, marks[i + 1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}

test('la feuille : un bloc à part pour le ticket 03, après le socle', () => {
  const marks = blocs(CSS).filter((m) => m.side === 'début').map((m) => `${m.name} (${m.ticket})`)
  assert.equal(marks[0], 'Socle (01)')
  assert.ok(marks.includes('Emblèmes des sous-collections (03)'), marks.join(', '))
  assert.ok(monBloc().length >= 20, 'les règles des emblèmes')
})

test('la feuille : un rond de 58 et 80 px en haut, de 104 et 136 px en bas, l’image deux fois plus large, comme le disent les images', { skip: SKIP }, () => {
  const bloc = monBloc()
  const d = (head, context = []) => {
    const r = bloc.find((x) => x.head === head && x.context.join(' / ') === context.join(' / '))
    assert.ok(r, `${head} ${context}`)
    return Number(/--d:\s*(\d+)px;/.exec(r.body)[1])
  }
  const haut = [d(`${HOOK} .c-emb`), d(`${HOOK} .c-emb`, [LARGE])]
  const bas = [d(`${HOOK} .c-emb[data-taille="bas"]`), d(`${HOOK} .c-emb[data-taille="bas"]`, [LARGE])]
  assert.deepEqual(haut, [58, 80])
  assert.deepEqual(bas, [104, 136])
  // L'image fait deux fois le diamètre de large ; le sizes des images le dit, pour que le navigateur prenne la bonne.
  const img = bloc.find((r) => r.head === `${HOOK} .c-emb-cadre img` && !r.context.length)
  assert.match(img.body, /width:\s*calc\(var\(--d\) \* 2\);/)
  assert.match(img.body, /max-width:\s*none;/)
  const sizes = (taille) => tags(emblem(avecEmbleme('tableau-animaux', 'Tableau Animaux', 152, 'ciel'), { taille }), 'img')[0].sizes
  assert.equal(sizes('haut'), `(min-width: 900px) ${haut[1] * 2}px, ${haut[0] * 2}px`)
  assert.equal(sizes('bas'), `(min-width: 900px) ${bas[1] * 2}px, ${bas[0] * 2}px`)
  // Les treize couleurs du métachamp ont leur règle, sur une couleur du socle : les six pastels, et les sept des
  // collections de couleur (revue de Walid du 24/11/2026 : le rond de Tableau Bleu est bleu, celui de Tableau Gris gris…).
  for (const couleur of ['ciel', 'soleil', 'menthe', 'rose', 'lilas', 'peche', 'bleu', 'gris', 'orange', 'rouge', 'violet', 'beige', 'vert']) {
    const r = bloc.find((x) => x.head === `${HOOK} .c-emb[data-fond="${couleur}"]`)
    assert.ok(r, couleur)
    assert.match(r.body, new RegExp(`--fond:\\s*var\\(--${couleur}\\);`))
  }
})

test('la feuille : au survol, le rond et l’emblème grandissent ensemble depuis le bas du rond ; avec « mouvements réduits », rien ne bouge', () => {
  const bloc = monBloc()
  // Ce qui bouge au survol et au toucher : le cadre seul, tout entier (le rond et l'emblème, ou l'initiale), d'une
  // simple échelle, sans glisser ; et seulement sans « mouvements réduits ».
  const etats = bloc.filter((r) => /:hover|:active/.test(r.head))
  assert.ok(etats.length >= 2, 'le survol et le toucher')
  for (const r of etats) {
    assert.equal(r.context[0], NO_PREF, r.head)
    assert.match(r.head, /\.c-emb-cadre$/, r.head)
    assert.match(r.body.trim(), /^transform:\s*scale\([\d.]+\);$/, r.head)
  }
  const survol = etats.find((r) => /:hover/.test(r.head))
  assert.deepEqual(survol.context, [NO_PREF, '@media (hover: hover)'])
  assert.ok(Number(/scale\(([\d.]+)\)/.exec(survol.body)[1]) > 1, 'le survol grandit')
  // Depuis le bas du rond : l'origine du cadre est le milieu de son bas, où le rond est posé.
  const cadre = bloc.find((r) => r.head === `${HOOK} .c-emb-cadre` && !r.context.length)
  assert.match(cadre.body, /transform-origin:\s*50% 100%;/)
  const rond = bloc.find((r) => r.head === `${HOOK} .c-emb-rond` && !r.context.length)
  assert.match(rond.body, /bottom:\s*0;/)
  // Rien ne déplace le rond, l'image ou l'initiale l'un sans l'autre : le bas du rond reste rempli.
  for (const r of bloc) {
    if (/c-emb-(rond|initiale)|img/.test(r.head)) assert.doesNotMatch(r.body, /(^|[;\s])(transform|scale|rotate)\s*:/, r.head)
  }
  // La rangée défile, et coupe ce qui la dépasse : au-dessus du cadre (1,3 fois le diamètre), elle garde la place du
  // sujet qui monte au survol. Les sujets composés montent jusqu'à 1,35 fois le diamètre au-dessus du bas du rond
  // (livrables du 23/11) : 1,4 avec la marge.
  const echelle = Number(/scale\(([\d.]+)\)/.exec(survol.body)[1])
  const rangee = (context) => bloc.find((r) => r.head === `${HOOK} .c-embs` && r.context.join(' / ') === context.join(' / '))
  for (const [context, d] of [[[], 58], [[LARGE], 80]]) {
    const haut = Number(/padding:\s*(\d+)px/.exec(rangee(context).body)[1])
    assert.ok(haut >= (1.4 * echelle - 1.3) * d, `${d} px : ${haut} px au-dessus du cadre`)
  }
  // L'arrivée qui glisse, et les transitions, sans « mouvements réduits » aussi.
  for (const r of bloc.filter((x) => /(^|[;\s])(animation|transition)[\w-]*\s*:/.test(x.body))) assert.equal(r.context[0], NO_PREF, r.head)
})
