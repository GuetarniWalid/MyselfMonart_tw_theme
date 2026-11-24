// Les pastilles des sous-collections (ticket T1 du plan en cocon sémantique, validé par Walid le 22/11/2026 :
// « pastilles en haut ») : sections/sous-collections.liquid, juste sous le fil d'Ariane des pages de collection.
// Ici, le rendu Liquid (liquidjs) de la section avec le plan réel du 22/11/2026, figé dans
// scripts/fixtures/cocon-plan.json, et des collections d'essai : ce que lisent le client et Google, c'est-à-dire les
// liens, leurs noms et leurs groupes. Sans liquidjs, ces tests se sautent (SKIP dit pourquoi).
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/sous-collections.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, SKIP, engine, modeleNouvellePage } = require('./galerie-banc.cjs')
const PLAN = require('./fixtures/cocon-plan.json')

const FILE = 'sections/sous-collections.liquid'

/* Une collection d'essai, telle que la donne collections[handle] : son identifiant, son titre, son adresse et son
   nombre de produits. */
let lastId = 400000000000
const col = (handle, title, count = 10, url = `/collections/${handle}`) => ({ id: ++lastId, handle, title, url, all_products_count: count })
/* Les collections d'essai rangées par handle français, comme collections[…] les trouve. */
const byHandle = (...list) => Object.fromEntries(list.map((c) => [c.handle, c]))

/* La section rendue sur la page d'une collection, dans une langue. */
function render({ page, collections, lang = 'fr', primary = lang === 'fr', plan = PLAN }) {
  const source = read(FILE)
  return engine(lang).parseAndRenderSync(source.slice(0, source.indexOf('{% schema %}')), {}, {
    globals: {
      shop: { metafields: plan ? { cocon: { plan: { value: plan } } } : {} },
      collection: page,
      collections,
      request: { locale: { iso_code: lang, primary } },
      section: { id: 'template--1__sous_collections', settings: {} },
    },
  })
}

const unescape = (text) => text.trim().replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/* Les liens rendus, dans l'ordre : [adresse, nom]. */
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, text]) => [href, unescape(text)])
/* Les listes de pastilles, dans l'ordre : leur nom, le libellé que désigne leur aria-labelledby (null sans libellé),
   et les noms de leurs liens. */
function groups(html) {
  return [...html.matchAll(/<ul\b([^>]*)>([\s\S]*?)<\/ul>/g)].map(([, attrs, inner]) => {
    const by = /\baria-labelledby="([^"]+)"/.exec(attrs)
    let name = null
    if (by) {
      const label = new RegExp(`<([a-z]+)\\b[^>]*\\bid="${by[1]}"[^>]*>([\\s\\S]*?)</\\1>`).exec(html)
      assert.ok(label, `le libellé #${by[1]} de la liste existe`)
      name = unescape(label[2])
    }
    return { name, links: links(inner).map(([, text]) => text) }
  })
}

/* ---------- Une page mère ---------- */

// Tableau Animaux et ses filles dans le plan : Chevaux, Lion, Zèbre (en ligne), Oiseaux, Chat, Chien, Éléphant (à créer).
const animaux = () => byHandle(
  col('tableau-animaux', 'Tableau Animaux', 152),
  col('tableau-cheval', 'Tableau Chevaux', 12),
  col('tableau-lion', 'Tableau Lion', 8),
  col('tableau-zebre', 'Tableau Zèbre', 0),
  col('tableau-oiseaux', 'Tableau Oiseaux', 3),
  col('tableau-chat', 'Tableau Chat', 5),
)

test('une page mère mène à ses sous-collections qui ont des produits, dans l’ordre du plan', { skip: SKIP }, () => {
  // Le Zèbre n'a aucun produit ; le Chien et l'Éléphant ne sont pas encore créés.
  const collections = animaux()
  assert.deepEqual(links(render({ page: collections['tableau-animaux'], collections })), [
    ['/collections/tableau-cheval', 'Tableau Chevaux'],
    ['/collections/tableau-lion', 'Tableau Lion'],
    ['/collections/tableau-oiseaux', 'Tableau Oiseaux'],
    ['/collections/tableau-chat', 'Tableau Chat'],
  ])
})

test('une idée s’affiche, une piste ou une fille écartée jamais, même créée et pleine', { skip: SKIP }, () => {
  // Pop Art : Super-héros (à créer), Keith Haring (idée), Yayoi Kusama (piste).
  const popArt = byHandle(
    col('tableau-pop-art', 'Tableau Pop Art', 120),
    col('tableau-super-heros', 'Tableau Super-héros', 9),
    col('tableau-keith-haring', 'Tableau Keith Haring', 4),
    col('tableau-kusama', 'Tableau Yayoi Kusama', 6),
  )
  assert.deepEqual(links(render({ page: popArt['tableau-pop-art'], collections: popArt })), [
    ['/collections/tableau-super-heros', 'Tableau Super-héros'],
    ['/collections/tableau-keith-haring', 'Tableau Keith Haring'],
  ])
  // Ethnique : Africain et Japonais (en ligne), Asiatique (écartée).
  const ethnique = byHandle(
    col('tableau-ethnique', 'Tableau Ethnique', 80),
    col('tableau-africain', 'Tableau Africain', 30),
    col('tableau-japonais', 'Tableau Japonais', 25),
    col('tableau-asiatique', 'Tableau Asiatique', 12),
  )
  assert.deepEqual(links(render({ page: ethnique['tableau-ethnique'], collections: ethnique })).map(([href]) => href), [
    '/collections/tableau-africain',
    '/collections/tableau-japonais',
  ])
})

test('rien sans plan, ni sur une page sans sous-collection à montrer', { skip: SKIP }, () => {
  const collections = animaux()
  // Sans le champ méta cocon.plan.
  assert.equal(render({ page: collections['tableau-animaux'], collections, plan: null }), '')
  // Chevaux n'a aucune fille dans le plan.
  assert.equal(render({ page: collections['tableau-cheval'], collections }), '')
  // Les filles d'Animaux existent, mais aucune n'a de produit.
  const vides = byHandle(col('tableau-animaux', 'Tableau Animaux', 152), col('tableau-cheval', 'Tableau Chevaux', 0), col('tableau-lion', 'Tableau Lion', 0))
  assert.equal(render({ page: vides['tableau-animaux'], collections: vides }), '')
})

/* ---------- Les pages racines ---------- */

// Tous les Tableaux : une fille ou deux par rayon, plus le best-seller fondu, une piste et une fille écartée, créés et
// pleins, et une fille à créer qui ne l'est pas encore (Voiture).
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

test('une page racine range ses filles par rayon : le best-seller d’abord, sans libellé, puis pièces, styles, sujets, couleurs', { skip: SKIP }, () => {
  const collections = tableaux()
  assert.deepEqual(groups(render({ page: collections['tous-les-tableaux'], collections })), [
    { name: null, links: ['Tableau best-seller'] },
    { name: 'Pièces', links: ['Tableau Chambre', 'Tableau Salon'] },
    { name: 'Styles', links: ['Tableau Abstrait', 'Tableau Zen', 'Tableau Moderne'] },
    { name: 'Sujets', links: ['Tableau Portrait', 'Tableaux Nature'] },
    { name: 'Couleurs', links: ['Tableau Bleu', 'Tableau Rose'] },
  ])
})

// Tous les Posters & Affiches : une fille par rayon, dont les deux personnalisés, et une inspiration d'essai (Basquiat),
// que seul PLAN_INSPIRATION lui donne : dans le plan, aucune inspiration n'est encore fille d'une racine.
const posters = () => byHandle(
  col('posters-affiches', 'Tous les Posters & Affiches', 680),
  col('tableau-personnalise-famille', 'Poster Personnalisé Famille', 3),
  col('horoscope-bebe', 'Poster bébé : Signe Astrologique aquarelle', 12),
  col('posters-affiches-basquiat', 'Poster & Affiche Basquiat', 7),
  col('posters-affiches-bleu', 'Poster & Affiche Bleu', 40),
  col('posters-affiches-nature', 'Poster & Affiche Nature', 120),
  col('posters-affiches-abstrait', 'Poster & Affiche Abstrait', 90),
  col('posters-affiches-salon', 'Poster & Affiche Salon', 300),
  col('posters-affiches-best-sellers', 'Poster & Affiche Best-Sellers', 32),
)
const BASQUIAT = { id: 'posters-affiches-basquiat', titre: 'Poster & Affiche Basquiat', arbre: 'posters', parent: 'posters-affiches', rayon: 'inspiration', decision: 'a_creer' }
const PLAN_INSPIRATION = { ...PLAN, noeuds: [...PLAN.noeuds, BASQUIAT] }

test('sur la racine des posters, les personnalisés ferment la marche', { skip: SKIP }, () => {
  const collections = posters()
  assert.deepEqual(groups(render({ page: collections['posters-affiches'], collections })), [
    { name: null, links: ['Poster & Affiche Best-Sellers'] },
    { name: 'Pièces', links: ['Poster & Affiche Salon'] },
    { name: 'Styles', links: ['Poster & Affiche Abstrait'] },
    { name: 'Sujets', links: ['Poster & Affiche Nature'] },
    { name: 'Couleurs', links: ['Poster & Affiche Bleu'] },
    { name: 'Personnalisés', links: ['Poster bébé : Signe Astrologique aquarelle', 'Poster Personnalisé Famille'] },
  ])
})

test('les inspirations viennent après les couleurs et avant les personnalisés', { skip: SKIP }, () => {
  const collections = posters()
  assert.deepEqual(groups(render({ page: collections['posters-affiches'], collections, plan: PLAN_INSPIRATION })).map((g) => g.name), [
    null, 'Pièces', 'Styles', 'Sujets', 'Couleurs', 'Inspirations', 'Personnalisés',
  ])
})

/* ---------- Les autres langues ---------- */

test('hors du français, la page se retrouve par sa collection : le handle y est traduit', { skip: SKIP }, () => {
  // Sur /en, collection.handle vaut « animal-art-prints » (relevé en ligne le 22/11/2026 : /en/collections/tableau-animaux
  // renvoie vers /en/collections/animal-art-prints), mais collections['tableau-animaux'] répond toujours.
  const en = byHandle(
    col('tableau-animaux', 'Animal Art Prints', 152, '/en/collections/animal-art-prints'),
    col('tableau-cheval', 'Horse Paintings', 12, '/en/collections/horse-paintings'),
    col('tableau-lion', 'Lion Wall Art', 8, '/en/collections/lion-wall-art'),
  )
  const page = { ...en['tableau-animaux'], handle: 'animal-art-prints' }
  assert.deepEqual(links(render({ page, collections: en, lang: 'en' })), [
    ['/en/collections/horse-paintings', 'Horse Paintings'],
    ['/en/collections/lion-wall-art', 'Lion Wall Art'],
  ])
})

test('la navigation et les rayons sont nommés dans les cinq langues', { skip: SKIP }, () => {
  const WORDS = {
    fr: ['Sous-collections', 'Pièces', 'Styles', 'Sujets', 'Couleurs', 'Inspirations', 'Personnalisés'],
    en: ['Subcollections', 'Rooms', 'Styles', 'Subjects', 'Colours', 'Inspirations', 'Personalized'],
    de: ['Unterkollektionen', 'Räume', 'Stile', 'Motive', 'Farben', 'Inspirationen', 'Personalisiert'],
    es: ['Subcolecciones', 'Estancias', 'Estilos', 'Temas', 'Colores', 'Inspiraciones', 'Personalizados'],
    nl: ['Subcollecties', 'Kamers', 'Stijlen', 'Onderwerpen', 'Kleuren', 'Inspiraties', 'Gepersonaliseerd'],
  }
  // Une fille par rayon sur la racine des posters.
  const collections = posters()
  for (const [lang, [nav, ...rayons]] of Object.entries(WORDS)) {
    const html = render({ page: collections['posters-affiches'], collections, lang, plan: PLAN_INSPIRATION })
    assert.deepEqual([...html.matchAll(/<nav\b[^>]*\baria-label="([^"]*)"/g)].map((m) => unescape(m[1])), [nav], `${lang} : un seul repère, nommé`)
    assert.deepEqual(groups(html).map((g) => g.name), [null, ...rayons], `${lang} : les rayons`)
  }
})

test('aucun titre : le seul H1 de la page reste celui de l’éditorial', { skip: SKIP }, () => {
  const collections = tableaux()
  assert.doesNotMatch(render({ page: collections['tous-les-tableaux'], collections }), /<h[1-6]\b/)
})

test('ailleurs qu’à la racine, une seule rangée, sans libellé', { skip: SKIP }, () => {
  const collections = animaux()
  assert.deepEqual(groups(render({ page: collections['tableau-animaux'], collections })), [
    { name: null, links: ['Tableau Chevaux', 'Tableau Lion', 'Tableau Oiseaux', 'Tableau Chat'] },
  ])
})

/* ---------- Les modèles de collection ---------- */

test('chaque modèle de collection pose les pastilles juste sous le fil d’Ariane, avant la grille', () => {
  const files = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^collection(\.[^.]+)?\.json$/.test(name))
  assert.ok(files.includes('collection.json'), 'le modèle par défaut')
  // Les modèles de la nouvelle page collection : collection.refonte.json et, depuis le ticket 09, un
  // collection.refonte-<suffixe>.json par modèle à grille (leur liste : scripts/collection-modeles.test.cjs).
  assert.ok(files.some(modeleNouvellePage), 'la nouvelle page')
  for (const file of files) {
    const { sections, order } = json(`templates/${file}`)
    const keys = Object.keys(sections).filter((key) => sections[key].type === 'sous-collections')
    assert.equal(keys.length, 1, `${file} : une section des pastilles`)
    assert.ok(!sections[keys[0]].disabled, `${file} : active`)
    const at = order.indexOf(keys[0])
    const crumb = order.findIndex((key) => sections[key].type === 'breadcrumb')
    if (modeleNouvellePage(file)) {
      // La nouvelle page : le fil, l'entrée (titre, interrupteur, intro : sections/collection-refonte.liquid, ticket 02),
      // puis les sous-collections en emblèmes, juste après l'entrée, avant la grille (sections/collection-grille.liquid).
      assert.equal(sections[order[crumb + 1]].type, 'collection-refonte', `${file} : l’entrée juste sous le fil d’Ariane`)
      assert.equal(at, crumb + 2, `${file} : les emblèmes juste après l’entrée`)
      assert.equal((sections[keys[0]].settings || {}).style, 'emblemes', `${file} : en emblèmes`)
      const grille = order.findIndex((key) => sections[key].type === 'collection-grille')
      assert.ok(grille > at, `${file} : avant la grille`)
    } else {
      // Sans fil d'Ariane, en tête de page.
      assert.equal(at, crumb + 1, `${file} : juste sous le fil d’Ariane`)
      const grid = order.findIndex((key) => sections[key].type === 'main-collection-product-grid')
      assert.ok(grid < 0 || at < grid, `${file} : avant la grille des produits`)
    }
  }
})
