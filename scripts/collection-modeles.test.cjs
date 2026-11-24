// La nouvelle page collection, ticket 09 (dossier .scratch/collection-design) : un modèle nouveau pour chacun des
// modèles de collection à grille, prêt pour la bascule (ticket 10). templates/collection.refonte-<suffixe>.json répond à
// templates/collection.<suffixe>.json (vue ?view=refonte-<suffixe>), comme templates/collection.refonte.json répond à
// templates/collection.json. L'ordre de la nouvelle page : le fil d'Ariane complet, l'entrée, les sous-collections en
// emblèmes, la grille, puis les sections propres du modèle, allumées, avec leurs réglages et leurs textes au caractère
// près, puis « Envie d'un autre sujet ? », le guide et les questions. Plus de bannière, de grille d'aujourd'hui, de
// liste de collections, ni de badges aux quatre étapes. Les trois pages sans grille (decoration-murale,
// poster-et-affiche, tableau-decoration-mural) n'en ont pas : Walid n'a pas tranché (README, « Ce qui attend Walid »).
// Ces tests ne lisent que les modèles (JSON) et les sections : ils tournent sans liquidjs.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { ROOT, read, json, modeleNouvellePage } = require('./galerie-banc.cjs')

const SANS_GRILLE = ['decoration-murale', 'poster-et-affiche', 'tableau-decoration-mural']
const NOUVELLE = 'collection.refonte.json'
const fichiers = fs.readdirSync(path.join(ROOT, 'templates')).filter((name) => /^collection(\.[^.]+)?\.json$/.test(name))
const suffixe = (file) => (/^collection\.([^.]+)\.json$/.exec(file) || [])[1] || null
// Les modèles d'aujourd'hui à grille : collection.json et collection.<suffixe>.json, hors nouvelle page et pages sans grille.
const actuels = fichiers.filter((f) => !modeleNouvellePage(f) && !SANS_GRILLE.includes(suffixe(f)))
// Le modèle nouveau d'un modèle d'aujourd'hui.
const nouveauDe = (file) => (file === 'collection.json' ? NOUVELLE : `collection.refonte-${suffixe(file)}.json`)
const modele = (file) => json(`templates/${file}`)
const types = (m) => m.order.map((k) => m.sections[k].type)

// Ce que la nouvelle page ne garde pas des modèles d'aujourd'hui : la grille, la bannière, la liste de collections
// (éteinte partout), les badges aux quatre étapes (« Choisissez, Personnalisez, Commandez, Admirez »).
const ANCIENNES = ['main-collection-product-grid', 'main-collection-banner', 'collection-list']
const ETAPES = ['CHOISISSEZ', 'PERSONNALISEZ', 'COMMANDEZ', 'ADMIREZ']
const quatreEtapes = (s) => s.type === 'badges' && JSON.stringify((s.block_order || []).map((b) => (s.blocks[b].settings || {}).heading)) === JSON.stringify(ETAPES)
// Les sections propres d'un modèle d'aujourd'hui, allumées, dans l'ordre : celles que la nouvelle page garde.
const propres = (m) => m.order.filter((k) => {
  const s = m.sections[k]
  return !s.disabled && !['breadcrumb', 'sous-collections', ...ANCIENNES].includes(s.type) && !quatreEtapes(s)
})
// Sur Tableau Salon, l'intro éditoriale écrit un h1 et l'intro : celles de l'entrée. Elle passe éteinte.
const ETEINTES = { 'collection.tableau-salon.json': ['collection_editorial_intro'] }

test('un modèle nouveau pour chaque modèle à grille, et rien pour les trois pages sans grille', () => {
  assert.equal(actuels.length, 19, actuels.join(', '))
  for (const file of actuels) assert.ok(fichiers.includes(nouveauDe(file)), `${file} : ${nouveauDe(file)}`)
  const nouveaux = fichiers.filter(modeleNouvellePage)
  assert.equal(nouveaux.length, 19, nouveaux.join(', '))
  for (const s of SANS_GRILLE) assert.ok(!fichiers.includes(`collection.refonte-${s}.json`), s)
  // Les pages sans grille le restent : leur grille d'aujourd'hui est éteinte.
  for (const s of SANS_GRILLE) {
    const m = modele(`collection.${s}.json`)
    assert.ok(Object.values(m.sections).filter((x) => x.type === 'main-collection-product-grid').every((x) => x.disabled), s)
  }
})

test('chaque modèle nouveau : le fil, l’entrée, les emblèmes, la grille, ses sections propres, puis les sujets, le guide et les questions', () => {
  for (const file of actuels) {
    const nouveau = modele(nouveauDe(file))
    const actuel = modele(file)
    assert.equal(nouveau.layout, 'collection', file)
    assert.deepEqual(Object.keys(nouveau.sections).sort(), [...nouveau.order].sort(), `${file} : aucune section hors de l’ordre`)
    const t = types(nouveau)
    const gardees = propres(actuel)
    assert.deepEqual(t, [
      'breadcrumb', 'collection-refonte', 'sous-collections', 'collection-grille',
      ...gardees.map((k) => actuel.sections[k].type),
      'collection-sujets', 'collection-guide', 'collection-questions',
    ], file)
    // Une seule entrée ; ni la grille, ni la bannière, ni la liste de collections d'aujourd'hui, ni les quatre étapes.
    assert.equal(t.filter((x) => x === 'collection-refonte').length, 1, file)
    for (const x of ANCIENNES) assert.ok(!t.includes(x), `${file} : pas de ${x}`)
    assert.ok(!Object.values(nouveau.sections).some(quatreEtapes), `${file} : pas de badges aux quatre étapes`)
  }
})

test('le fil d’Ariane complet et les sous-collections en emblèmes : leur clé et leurs réglages d’aujourd’hui, plus ceux de la nouvelle page', () => {
  for (const file of actuels) {
    const nouveau = modele(nouveauDe(file))
    const actuel = modele(file)
    for (const [type, ajout] of [['breadcrumb', { affichage: 'complet' }], ['sous-collections', { style: 'emblemes' }]]) {
      const cle = actuel.order.find((k) => actuel.sections[k].type === type)
      assert.ok(cle in nouveau.sections, `${file} : ${type} garde sa clé (${cle})`)
      assert.deepEqual(nouveau.sections[cle], { ...actuel.sections[cle], settings: { ...actuel.sections[cle].settings, ...ajout } }, `${file} : ${type}`)
    }
  }
})

test('les sections de la nouvelle page : les mêmes, aux mêmes réglages, que celles de collection.refonte.json', () => {
  const base = modele(NOUVELLE)
  const deLaPage = ['collection_refonte', 'collection_grille', 'collection_sujets', 'collection_guide', 'collection_questions']
  for (const file of actuels) {
    const nouveau = modele(nouveauDe(file))
    for (const cle of deLaPage) assert.deepEqual(nouveau.sections[cle], base.sections[cle], `${file} : ${cle}`)
  }
})

test('les sections propres : toutes celles qui sont allumées aujourd’hui, au caractère près, entre la grille et les autres sujets', () => {
  let vues = 0
  for (const file of actuels) {
    const nouveau = modele(nouveauDe(file))
    const actuel = modele(file)
    const eteintes = ETEINTES[file] || []
    for (const cle of propres(actuel)) {
      vues++
      if (eteintes.includes(cle)) {
        // Éteinte, ses réglages et ses textes gardés : la rallumer suffit.
        assert.deepEqual(nouveau.sections[cle], { ...actuel.sections[cle], disabled: true }, `${file} : ${cle} éteinte`)
      } else {
        assert.deepEqual(nouveau.sections[cle], actuel.sections[cle], `${file} : ${cle}`)
      }
    }
    // Entre la grille et les autres sujets, dans l'ordre d'aujourd'hui.
    const o = nouveau.order
    assert.deepEqual(o.slice(o.indexOf('collection_grille') + 1, o.indexOf('collection_sujets')), propres(actuel), file)
  }
  // Tableau Salon (6), Japonais (1).
  assert.equal(vues, 7)
})

test('les points à signaler : bestsellers, collection-japonais, tableau-salon', () => {
  // bestsellers : son premier badge est un chiffre, mais ce sont bien les quatre étapes ; elles partent.
  const best = modele('collection.bestsellers.json')
  const badges = Object.values(best.sections).filter((s) => s.type === 'badges')
  assert.equal(badges.length, 1)
  assert.ok(quatreEtapes(badges[0]))
  assert.equal(badges[0].blocks[badges[0].block_order[0]].type, 'number_block')
  assert.ok(!types(modele('collection.refonte-bestsellers.json')).includes('badges'))
  // collection-japonais : la grille de collections, allumée (son seul bloc, Tableau Manga, éteint), sous la grille.
  const jap = modele('collection.refonte-collection-japonais.json')
  assert.equal(jap.order[jap.order.indexOf('collection_grille') + 1], 'collections_pages_grid_mdxnY9')
  const grilleJap = jap.sections.collections_pages_grid_mdxnY9
  assert.ok(!grilleJap.disabled)
  assert.ok(grilleJap.block_order.every((b) => grilleJap.blocks[b].disabled), 'aucun bloc allumé : aucun lien écrit aujourd’hui')
  // tableau-salon : ses six sections propres, l'intro éditoriale éteinte (son h1).
  const salon = modele('collection.refonte-tableau-salon.json')
  assert.deepEqual(salon.order.slice(salon.order.indexOf('collection_grille') + 1, salon.order.indexOf('collection_sujets')), [
    'collection_editorial_intro', 'related_carousel', 'collection_editorial_guide', 'faq_salon', 'custom_liquid_schema', 'signature_salon',
  ])
  assert.equal(salon.sections.collection_editorial_intro.disabled, true)
  assert.equal(salon.sections.collection_editorial_intro.settings.show_title, true, 'ses réglages gardés')
})

/* Une section allumée peut-elle écrire un h1 ? Son fichier en écrit un ; la section éditoriale, seulement en intro avec
   son titre ; une section au niveau de titre réglable, si on le règle en h1. */
function ecritUnH1(s) {
  const source = read(`sections/${s.type}.liquid`)
  if ((s.settings || {}).heading_level === 'h1') return true
  if (s.type === 'collection-editorial') return (s.settings || {}).source === 'intro' && (s.settings || {}).show_title === true
  return /<h1\b/.test(source.replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, ''))
}

test('un seul h1 possible : celui de l’entrée ; aucune autre section allumée n’en écrit', () => {
  for (const file of actuels) {
    const nouveau = modele(nouveauDe(file))
    const h1 = nouveau.order.filter((k) => !nouveau.sections[k].disabled && ecritUnH1(nouveau.sections[k]))
    assert.deepEqual(h1, ['collection_refonte'], file)
  }
  // Sans l'éteindre, l'intro éditoriale de Tableau Salon en écrirait un second.
  assert.ok(ecritUnH1(modele('collection.tableau-salon.json').sections.collection_editorial_intro))
})

test('les modèles nouveaux se voient dans l’éditeur sous un nom qui dit leur modèle d’aujourd’hui', () => {
  // Shopify nomme un modèle par son fichier : « refonte-<suffixe> ». Un nom de fichier sans espace ni capitale.
  for (const file of fichiers.filter((f) => modeleNouvellePage(f) && f !== NOUVELLE)) {
    assert.match(file, /^collection\.refonte-[a-z0-9-]+\.json$/, file)
    assert.ok(fichiers.includes(`collection.${suffixe(file).slice('refonte-'.length)}.json`), `${file} : son modèle d’aujourd’hui existe`)
  }
})

test('le contrôle en ligne (scripts/controle-refonte.mjs) a une collection pour chaque modèle de la nouvelle page', async () => {
  const { pathToFileURL } = require('url')
  const { PAGES } = await import(pathToFileURL(path.join(__dirname, 'controle-refonte.mjs')).href)
  const vues = new Set(PAGES.map(([, vue]) => vue))
  const nouveaux = fichiers.filter(modeleNouvellePage)
  for (const f of nouveaux) assert.ok(vues.has(f.replace(/^collection\.(.+)\.json$/, '$1')), `${f} : une page de la liste`)
  // Et chaque vue de la liste est un modèle du thème.
  for (const vue of vues) assert.ok(nouveaux.includes(`collection.${vue}.json`), vue)
})
