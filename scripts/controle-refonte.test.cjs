// Le contrôle en ligne de la nouvelle page collection (scripts/controle-refonte.mjs, ticket 09) : ses fonctions pures,
// sans navigateur ni réseau. Les défauts qu'il dit à partir des mesures d'une page, les listes pour Google comparées à
// celles de la page d'aujourd'hui, le tableau des résultats, et sa liste de pages, qui doit couvrir chaque modèle de la
// nouvelle page. Le contrôle lui-même tourne en ligne (son mode d'emploi est en tête du script).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const { ROOT } = require('./galerie-banc.cjs')

const module_ = import(pathToFileURL(path.join(__dirname, 'controle-refonte.mjs')).href)

/* Les mesures d'une page saine : la nouvelle page, un h1, les liens de la famille une fois chacun, deux pages de
   tableaux et leurs liens, la largeur de l'écran, la première rangée dans le premier écran. */
const saine = (change = {}) => ({
  page: '/collections/tableaux-nature-sauvage',
  marque: true,
  h1: [{ visible: true, entree: true, texte: 'Tableaux Nature' }],
  liens: [
    { chemin: '/collections/tous-les-tableaux', place: 'fil' },
    { chemin: '/collections/tableau-animaux', place: 'emblèmes du haut' },
    { chemin: '/collections/tableau-fleurs', place: 'emblèmes du haut' },
    { chemin: '/collections/posters-affiches-nature', place: 'interrupteur' },
    { chemin: '/collections/tableau-portrait-1', place: 'emblèmes du bas' },
    { chemin: '/collections/tableau-fleurs', place: 'texte' },
    { chemin: '/collections/tableau-zen', place: 'texte' },
  ],
  total: 327,
  pages: ['/collections/tableaux-nature-sauvage?page=2&view=refonte', '/collections/tableaux-nature-sauvage?page=14&view=refonte'],
  cartes: 24,
  basPremiereRangee: 767,
  largeurPage: 390,
  largeurEcran: 390,
  ...change,
})

test('une page saine : aucun défaut, à toutes les largeurs', async () => {
  const { defautsPage } = await module_
  assert.deepEqual(defautsPage(saine(), { largeur: 390, premiereRangee: 844 }), [])
  assert.deepEqual(defautsPage(saine({ largeurPage: 1280, basPremiereRangee: 2000 }), { largeur: 1280 }), [])
})

test('les défauts d’une page : h1, liens de la famille, ?page=N, largeur, première rangée, erreurs de script', async () => {
  const { defautsPage } = await module_
  const un = (change, options = { largeur: 390, premiereRangee: 844 }) => defautsPage(saine(change), options)
  assert.deepEqual(un({ marque: false }), ['pas la nouvelle page (data-refonte-page absent)'])
  assert.deepEqual(un({ h1: [{ visible: true, entree: true }, { visible: true, entree: false }] }), ['2 h1, 2 visible(s)'])
  assert.deepEqual(un({ h1: [{ visible: true, entree: true }, { visible: false, entree: false }] }), ['2 h1, 1 visible(s)'])
  assert.deepEqual(un({ h1: [{ visible: true, entree: false }] }), ['le h1 n’est pas celui de l’entrée'])
  // Un lien de la famille deux fois, un lien hors de ses places, un lien vers la page elle-même.
  const liens = saine().liens
  assert.deepEqual(un({ liens: [...liens, { chemin: '/collections/posters-affiches-nature', place: 'ailleurs' }] }), [
    '/collections/posters-affiches-nature 2 fois (interrupteur, ailleurs)',
    '/collections/posters-affiches-nature hors des places de la famille',
  ])
  assert.deepEqual(un({ liens: [...liens, { chemin: '/collections/tableaux-nature-sauvage', place: 'emblèmes du bas' }] }), ['lien vers la page elle-même (emblèmes du bas)'])
  // Les liens des textes ne comptent pas : ils sont listés à part.
  assert.deepEqual(un({ liens: [...liens, { chemin: '/collections/tous-les-tableaux', place: 'texte' }] }), [])
  assert.deepEqual(un({ pages: [] }), ['pas de lien ?page=2'])
  assert.deepEqual(un({ pages: [], total: 24 }), [], 'une seule page : pas de liens')
  assert.deepEqual(un({ largeurPage: 396 }), ['page de 396 px pour un écran de 390 px'])
  assert.deepEqual(un({ basPremiereRangee: 851.4 }), ['première rangée jusqu’à 851 px (écran de 844 px)'])
  assert.deepEqual(un({ basPremiereRangee: null, cartes: 0 }), ['aucune carte dans la grille'])
  assert.deepEqual(defautsPage(saine(), { largeur: 390, erreurs: ['x is not defined'] }), ['erreur de script : x is not defined'])
})

test('les liens écrits dans les textes : chacun une fois, avec ce qu’il double dans la page', async () => {
  const { liensDesTextes } = await module_
  const m = saine()
  m.liens.push({ chemin: '/collections/tableau-zen', place: 'texte' })
  assert.deepEqual(liensDesTextes(m), ['/collections/tableau-fleurs (déjà dans la page)', '/collections/tableau-zen'])
})

test('les listes pour Google : une fois chacune, et les mêmes que la page d’aujourd’hui', async () => {
  const { listesLd, ldDuHtml, defautsLd } = await module_
  const fil = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil' }] }
  const liste = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: [] }
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }
  const html = (...objets) => objets.map((o) => `<script type="application/ld+json">\n  ${JSON.stringify(o, null, 2)}\n</script>`).join('\n')
  // Les blancs du HTML n'y font rien ; une autre liste (CollectionPage) n'est pas comptée.
  const lu = listesLd(ldDuHtml(html(fil, liste, faq, { '@type': 'CollectionPage' })))
  assert.deepEqual(Object.keys(lu), ['BreadcrumbList', 'ItemList', 'FAQPage'])
  assert.deepEqual(lu.BreadcrumbList, [JSON.stringify(fil)])
  const temoin = listesLd([JSON.stringify(fil), JSON.stringify(liste), JSON.stringify(faq)])
  assert.deepEqual(defautsLd(lu, { sansVue: temoin }), [])
  // Différente, absente, en trop, en double.
  assert.deepEqual(defautsLd(listesLd([JSON.stringify(fil), JSON.stringify({ ...liste, itemListElement: [1] }), JSON.stringify(faq)]), { sansVue: temoin }), ['ItemList différente de la page sans vue'])
  assert.deepEqual(defautsLd(listesLd([JSON.stringify(fil), JSON.stringify(liste)]), { sansVue: temoin }), ['FAQPage absente (la page sans vue en a une)'])
  assert.deepEqual(defautsLd(temoin, { sansVue: listesLd([JSON.stringify(fil), JSON.stringify(liste)]) }), ['FAQPage en trop (la page sans vue n’en a pas)'])
  assert.deepEqual(defautsLd(listesLd([JSON.stringify(fil), JSON.stringify(fil), JSON.stringify(liste)]), { sansVue: listesLd([JSON.stringify(fil), JSON.stringify(liste)]) }), ['BreadcrumbList 2 fois', 'BreadcrumbList différente de la page sans vue'])
  // Sans page d'aujourd'hui (après la bascule) : présentes, sans FAQPage obligée ; ItemList seulement avec des tableaux.
  assert.deepEqual(defautsLd(listesLd([JSON.stringify(fil), JSON.stringify(liste)])), [])
  assert.deepEqual(defautsLd(listesLd([])), ['BreadcrumbList absente', 'ItemList absente'])
  assert.deepEqual(defautsLd(listesLd([JSON.stringify(fil)]), { tableaux: false }), [])
})

test('le tableau : une ligne par page et par largeur, « ok » ou les défauts', async () => {
  const { tableau, adresseDe, sansVue } = await module_
  assert.equal(adresseDe('/collections/tableau-lion', 'refonte'), '/collections/tableau-lion?view=refonte')
  assert.equal(adresseDe('/collections/tableau-lion?page=2', 'refonte'), '/collections/tableau-lion?page=2&view=refonte')
  assert.equal(adresseDe('/collections/tableau-lion', null), '/collections/tableau-lion')
  // La page d'aujourd'hui : la même adresse, sans sa vue.
  assert.equal(sansVue('/collections/tableau-lion?view=refonte-chevaux'), '/collections/tableau-lion')
  assert.equal(sansVue('/collections/tableau-lion?page=2&view=refonte'), '/collections/tableau-lion?page=2')
  assert.equal(sansVue('/collections/tableau-lion?view=refonte&page=2'), '/collections/tableau-lion?page=2')
  assert.equal(tableau([
    { adresse: '/collections/a?view=refonte', largeur: 390, defauts: [] },
    { adresse: '/collections/a?view=refonte', largeur: 1280, defauts: ['2 h1, 2 visible(s)', 'pas de lien ?page=2'] },
  ]), [
    'page                         largeur  résultat',
    '/collections/a?view=refonte  390      ok',
    '/collections/a?view=refonte  1280     2 h1, 2 visible(s) ; pas de lien ?page=2',
  ].join('\n'))
})

test('les largeurs : de 320 à 1920 px, et l’écran de 390 × 844 de la première rangée', async () => {
  const { LARGEURS, HAUTEURS, PAGES } = await module_
  assert.deepEqual(LARGEURS, [320, 390, 768, 1280, 1920])
  assert.equal(HAUTEURS[390], 844)
  for (const largeur of LARGEURS) assert.ok(HAUTEURS[largeur], `${largeur} : sa hauteur`)
  // Chaque page de la liste : une adresse de collection et une vue de la nouvelle page. Qu'elles couvrent chaque modèle :
  // scripts/collection-modeles.test.cjs.
  for (const [adresse, vue] of PAGES) {
    assert.match(adresse, /^(\/[a-z]{2})?\/collections\/[a-z0-9-]+$/, adresse)
    assert.match(vue, /^refonte(-[a-z0-9-]+)?$/, vue)
  }
})
