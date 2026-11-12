// L'adaptateur du catalogue de la fiche 3D (assets/component-oeuvre-3d.js) : des vraies variantes de la
// boutique aux chips et au moteur. Donnée : la toile du Bonsaï et son poster jumeau, relevés en ligne
// (scripts/fixtures/oeuvre-3d-bonsai.json, au format de snippets/oeuvre-3d-model.liquid).
// Lancer : node --test scripts/oeuvre-3d-catalog.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { catalogOf, productFromSelection, choiceInputs, variantOf, sizesOf } = require('../assets/component-oeuvre-3d.js')
const { choicesOf, toggleOf, legendOf, pickOf, TEXTS_FR } = require('../assets/oeuvre-3d-chips.js')
const { toile, poster } = require('./fixtures/oeuvre-3d-bonsai.json')

// Les noms courts des chips, ceux des fichiers de langue (sections.mma.oeuvre_3d_names).
const NAMES = {
  material: { toile: 'Toile', poster: 'Poster' },
  border: { blanche: 'Blanche', noire: 'Noire', etiree: 'Étirée', miroir: 'Miroir', pliee: 'Pliée' },
  frame: { sans: 'Aucun', blanc: 'Blanc', noir: 'Noir', argent: 'Argent', chene: 'Chêne', noyer: 'Noyer' },
  passe: { sans: 'Aucun', avec: 'Blanc' },
  passeSpoken: { sans: 'Sans contour blanc', avec: 'Avec contour blanc' },
}
const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster', passe: true }
const both = catalogOf({ models: { toile, poster }, names: NAMES })
const plain = (text) => text.replace(/[  ]/g, ' ')
const euros = (list) => list.map((price) => plain(price))

test('les choix viennent des variantes et des métaobjets de la boutique, avec les noms des chips', () => {
  const ids = (group, product) => both.options(group, product).map((o) => o.id)
  assert.deepEqual(ids('material', TOILE), ['toile', 'poster'])
  assert.deepEqual(ids('size', TOILE), ['30x40', '60x80', '75x100', '90x120'])
  assert.deepEqual(ids('border', TOILE), ['blanche', 'noire', 'etiree', 'miroir', 'pliee'])
  assert.deepEqual(both.options('border', TOILE).map((o) => o.name), ['Blanche', 'Noire', 'Étirée', 'Miroir', 'Pliée'])
  assert.deepEqual(ids('frame', TOILE), ['sans', 'blanc', 'noir', 'argent', 'chene', 'noyer'])
  // Le poster : ses quatre couleurs de cadre (propriété de ligne), pas d'argent ancien ; et son contour blanc.
  assert.deepEqual(ids('frame', POSTER), ['sans', 'blanc', 'noir', 'chene', 'noyer'])
  assert.deepEqual(ids('passe', POSTER), ['sans', 'avec'])
  assert.deepEqual(both.options('passe', POSTER).map((o) => o.spoken), ['Sans contour blanc', 'Avec contour blanc'])
  assert.equal(both.side(TOILE), 'border')
  assert.equal(both.side(POSTER), 'passe')
})

test('sans jumeau publié, la bascule ne propose que la matière de la fiche', () => {
  const alone = catalogOf({ models: { toile }, names: NAMES })
  assert.deepEqual(alone.options('material', TOILE).map((o) => o.id), ['toile'])
})

test('les prix sont ceux des variantes : bordure et cadre en écart, taille et matière en entier', () => {
  assert.equal(both.price(TOILE), 62.5)
  assert.deepEqual(euros(choicesOf(both, TEXTS_FR, 'border', TOILE).options.map((o) => o.price)), ['', '+2 €', '+4 €', '+6 €', '+8 €'])
  assert.deepEqual(euros(choicesOf(both, TEXTS_FR, 'frame', TOILE).options.map((o) => o.price)), ['', '+40 €', '+40 €', '+45 €', '+50 €', '+50 €'])
  assert.deepEqual(euros(choicesOf(both, TEXTS_FR, 'size', TOILE).options.map((o) => o.price)), ['62,50 €', '94 €', '136,50 €', '199 €'])
  assert.deepEqual(euros(toggleOf(both, TEXTS_FR, TOILE).map((o) => o.label)), ['Matière : Toile, 62,50 €', 'Matière : Poster, 24,90 €'])
  // Poster : la couleur du cadre ne change pas le prix (une seule variante « Avec cadre »).
  assert.equal(both.price({ ...POSTER, frame: 'noyer' }), 47.9)
  assert.equal(both.price({ ...POSTER, frame: 'blanc' }), 47.9)
  assert.deepEqual(euros(choicesOf(both, TEXTS_FR, 'frame', POSTER).options.map((o) => o.price)), ['', '+23 €', '+23 €', '+23 €', '+23 €'])
})

/* Retour de Walid du 11/11/2026, solution « Prévenir et expliquer » : en 90 × 120, qui n'existe pas
   encadré, un cadre se choisit encore et passe au 75 × 100 ; la rangée le dit. */
test('en 90 × 120, pas de cadre : un cadre passe au 75 × 100, avec son prix là-bas, et la rangée le dit', () => {
  const big = { ...TOILE, size: '90x120' }
  assert.equal(both.available('frame', big, 'chene'), false)
  assert.equal(both.available('frame', big, 'sans'), true)
  assert.equal(both.canFrame('90x120'), false)
  assert.equal(both.canFrame('75x100'), true)
  assert.equal(both.unframedSize(), '90 × 120')
  const frames = choicesOf(both, TEXTS_FR, 'frame', big)
  assert.equal(plain(frames.note), 'Avec un cadre, la taille passe au 75 × 100')
  assert.deepEqual(frames.options.map((o) => o.available), [true, true, true, true, true, true])
  assert.deepEqual(euros(frames.options.map((o) => o.price)), ['', '+40 €', '+40 €', '+45 €', '+50 €', '+50 €'])
  assert.deepEqual(pickOf(both, big, 'frame', 'chene').next, { ...big, size: '75x100', frame: 'chene' })
  // Le poster aussi : son cadre passe au 75 × 100.
  const posterBig = { ...POSTER, size: '90x120' }
  assert.equal(choicesOf(both, TEXTS_FR, 'frame', posterBig).options[1].available, true)
  assert.deepEqual(pickOf(both, posterBig, 'frame', 'noir').next, { ...posterBig, size: '75x100', frame: 'noir' })
  // Le cadre retiré par le 90 × 120 revient au 60 × 80, et la vignette du 90 × 120 dit « sans cadre ».
  const dropped = pickOf(both, { ...TOILE, frame: 'chene' }, 'size', '90x120')
  assert.deepEqual([dropped.next.frame, dropped.held], ['sans', 'chene'])
  assert.equal(pickOf(both, dropped.next, 'size', '60x80', dropped.held).next.frame, 'chene')
  assert.deepEqual(choicesOf(both, TEXTS_FR, 'size', dropped.next, dropped.held).options.map((o) => o.caption), ['', '', '', 'sans cadre'])
})

test('les règles de la boutique : un cadre qui n’existe pas repasse sans cadre', () => {
  assert.deepEqual(both.apply('size', { ...TOILE, frame: 'chene' }, '90x120'), { ...TOILE, size: '90x120', frame: 'sans' })
  assert.deepEqual(both.apply('size', { ...TOILE, frame: 'chene' }, '60x80'), { ...TOILE, size: '60x80', frame: 'chene' })
  assert.deepEqual(both.apply('passe', POSTER, 'sans'), { ...POSTER, passe: false })
  // La toile passe au poster à la même taille, avec le même cadre s'il existe, et le contour blanc par défaut.
  assert.deepEqual(both.apply('material', { ...TOILE, size: '60x80', frame: 'chene' }, 'poster'), { ...TOILE, material: 'poster', size: '60x80', frame: 'chene', passe: true })
  assert.equal(both.apply('material', { ...TOILE, frame: 'argent' }, 'poster').frame, 'sans')
  assert.equal(both.apply('material', { ...POSTER, frame: 'noir' }, 'toile').frame, 'noir')
  assert.equal(both.apply('material', { ...POSTER, frame: 'noir' }, 'toile').passe, false)
})

test('les légendes disent le choix en cours, en noms courts', () => {
  assert.equal(legendOf(both, TEXTS_FR, 'frame', { ...TOILE, frame: 'chene' }).value, 'Chêne')
  assert.equal(legendOf(both, TEXTS_FR, 'border', { ...TOILE, border: 'miroir' }).label, 'Bordure : Miroir. Voir les choix')
  assert.equal(legendOf(both, TEXTS_FR, 'passe', POSTER).value, 'Blanc')
})

/* Du choix de la fiche (mma:selection-change, ticket 05) au produit du moteur. Les bordures et les
   cadres se reconnaissent à leur handle, le même dans toutes les langues. */
const selection = ({ size = '30x40 cm', border, frame, frameColor = null, whiteBorder = null, poster: isPoster = false } = {}) => ({
  changed: null,
  variant: null,
  options: isPoster
    ? [{ position: 1, kind: 'size', value: size, key: null }, { position: 2, kind: 'frame', value: frame || 'Sans cadre', key: null }]
    : [
        { position: 1, kind: 'size', value: size, key: null },
        { position: 2, kind: 'border', value: 'Bordure', key: border },
        { position: 3, kind: 'frame', value: 'Cadre', key: frame },
      ],
  frameColor,
  whiteBorder,
})

test('le choix de la toile donne le produit du moteur, même avec une coquille dans un handle', () => {
  assert.deepEqual(productFromSelection(toile, selection({ size: '60x80 cm', border: 'bordure-noire', frame: 'cadre-chene-clair' })), {
    material: 'toile', size: '60x80', border: 'noire', frame: 'chene', passe: false,
  })
  assert.equal(productFromSelection(toile, selection({ border: 'bordure-moroir', frame: 'sans-cadre' })).border, 'miroir')
  // Une clé inconnue, ou absente, retombe sur la bordure blanche sans cadre plutôt que de casser la 3D.
  const unknown = productFromSelection(toile, selection({ border: 'bordure-doree', frame: null }))
  assert.deepEqual([unknown.border, unknown.frame], ['blanche', 'sans'])
})

test('chaque bordure et chaque cadre de la boutique ont leur matière ; seuls les handles comptent', () => {
  const borders = { 'bordure-blanche': 'blanche', 'bordure-noire': 'noire', 'bordure-etiree': 'etiree', 'bordure-moroir': 'miroir', 'bordure-pliee': 'pliee' }
  for (const [key, id] of Object.entries(borders)) {
    assert.equal(productFromSelection(toile, selection({ border: key, frame: 'sans-cadre' })).border, id, key)
  }
  const frames = { 'sans-cadre': 'sans', 'cadre-blanc': 'blanc', 'cadre-noir-mat': 'noir', 'cadre-argent-ancien': 'argent', 'cadre-chene-clair': 'chene', 'cadre-noyer': 'noyer' }
  for (const [key, id] of Object.entries(frames)) {
    assert.equal(productFromSelection(toile, selection({ border: 'bordure-blanche', frame: key })).frame, id, key)
  }
  // Une fiche traduite donne le même produit.
  const translated = selection({ border: 'bordure-moroir', frame: 'cadre-noyer' })
  translated.options[1].value = 'Mirror border'
  translated.options[2].value = 'Walnut frame'
  assert.deepEqual(productFromSelection(toile, translated), productFromSelection(toile, selection({ border: 'bordure-moroir', frame: 'cadre-noyer' })))
})

test('le choix du poster : la couleur du cadre et le contour blanc, propriétés de ligne', () => {
  assert.deepEqual(
    productFromSelection(poster, selection({ poster: true, size: '75x100 cm', frame: 'Avec cadre', frameColor: { name: 'Cadre noir Mat', key: 'cadre-noir-mat-1' }, whiteBorder: true })),
    { material: 'poster', size: '75x100', border: 'blanche', frame: 'noir', passe: true },
  )
  assert.deepEqual(
    productFromSelection(poster, selection({ poster: true, frameColor: null, whiteBorder: false })),
    { material: 'poster', size: '30x40', border: 'blanche', frame: 'sans', passe: false },
  )
  // Le poster n'a pas de bordure : il garde celle de la toile montrée avant, pour le retour à la toile.
  assert.equal(productFromSelection(poster, selection({ poster: true }), { ...TOILE, border: 'miroir' }).border, 'miroir')
})

test('appliquer un produit à la fiche : les radios à cocher, toile et poster', () => {
  assert.deepEqual(choiceInputs(toile, { ...TOILE, border: 'miroir', frame: 'noir' }), [
    { name: 'option1', value: '30x40 cm' },
    { name: 'option2', value: 'Bordure miroir' },
    { name: 'option3', value: 'Cadre noir Mat' },
  ])
  assert.deepEqual(choiceInputs(poster, { ...POSTER, size: '60x80', frame: 'chene' }), [
    { name: 'option1', value: '60x80 cm' },
    { frameMode: 'framed', colorHandle: 'cadre-chene-clair-1' },
    { whiteBorder: 'on' },
  ])
  assert.deepEqual(choiceInputs(poster, { ...POSTER, frame: 'sans', passe: false }), [
    { name: 'option1', value: '30x40 cm' },
    { frameMode: 'none' },
    { whiteBorder: 'off' },
  ])
})

test('la variante d’un produit : celle qu’ouvre le lien du jumeau', () => {
  assert.equal(variantOf(poster, { ...POSTER, size: '60x80', frame: 'noyer' }).id, 54403849159003)
  assert.equal(variantOf(poster, { ...POSTER, size: '90x120' }).id, 54403849093467)
  assert.equal(variantOf(toile, TOILE).id, 54403687874907)
})

test('les tailles du produit, dans leur ordre, quelle que soit leur écriture', () => {
  assert.deepEqual(sizesOf(toile), ['30x40', '60x80', '75x100', '90x120'])
  assert.deepEqual(sizesOf({ sizes: ['100 x 75 cm', '40×30', ' 120X90 CM', 'Default Title'] }), ['100x75', '40x30', '120x90'])
})

/* Retour de Walid du 12/11/2026 : la rangée Cadre reprend les photos des pastilles de la fiche classique
   (snippets/oeuvre-3d-model.liquid les ajoute à chaque cadre), cadrées sur l'angle du cadre. */
test('chaque cadre a la photo de sa pastille, cadrée sur son angle ; « Aucun » et un cadre sans photo n’en ont pas', () => {
  const withPhotos = (list) => list.map(([name, key]) => [name, key, key === 'sans-cadre' ? '' : `//cdn.test/${key}.png?width=500`])
  const models = { toile: { ...toile, frames: withPhotos(toile.frames) }, poster: { ...poster, frameColors: withPhotos(poster.frameColors) } }
  const catalog = catalogOf({ models, names: NAMES })
  const noir = catalog.photo('frame', TOILE, 'noir')
  assert.equal(noir.url, '//cdn.test/cadre-noir-mat.png?width=500')
  assert.deepEqual([noir.size, noir.position], ['250% auto', '50% 86%']) // refaite sur le modèle des bordures : le même coin, le même cadrage
  const posterNoir = catalog.photo('frame', POSTER, 'noir')
  assert.equal(posterNoir.url, '//cdn.test/cadre-noir-mat-1.png?width=500')
  assert.deepEqual([posterNoir.size, posterNoir.position], ['300% auto', '69% 98%']) // la pointe du coin, vers les trois quarts du rond
  assert.equal(catalog.photo('frame', TOILE, 'sans'), null)
  assert.equal(catalog.photo('frame', POSTER, 'argent'), null) // le poster n'a pas d'argent ancien
  assert.equal(catalog.photo('border', TOILE, 'noire'), null)
  assert.equal(both.photo('frame', TOILE, 'noir'), null) // un modèle sans photos : la teinte reste
})

// Retour de Walid du 12/11/2026 : la rangée Bordure aussi, avec les photos de la fiche classique.
test('chaque bordure de la toile a la photo de sa pastille, cadrée sur le coin de la toile ; le poster n’a pas de bordure', () => {
  const withPhotos = (list) => list.map(([name, key]) => [name, key, `//cdn.test/${key}.png?width=500`])
  const catalog = catalogOf({ models: { toile: { ...toile, borders: withPhotos(toile.borders) }, poster }, names: NAMES })
  const miroir = catalog.photo('border', TOILE, 'miroir')
  assert.equal(miroir.url, '//cdn.test/bordure-moroir.png?width=500') // le handle de la boutique, « moroir »
  assert.deepEqual([miroir.size, miroir.position], ['250% auto', '50% 86%'])
  assert.equal(catalog.photo('border', TOILE, 'blanche').url, '//cdn.test/bordure-blanche.png?width=500')
  assert.equal(catalog.photo('border', POSTER, 'blanche'), null)
  assert.equal(both.photo('border', TOILE, 'noire'), null) // un modèle sans photos : la teinte reste
})

/* Choix de Walid du 12/11/2026 : le chêne du poster est le chêne vieilli de l'atelier, celui de la toile
   le bois naturel clair. La fiche du poster le nomme « Chêne vieilli » (names.framePoster). */
test('le chêne du poster s’appelle « Chêne vieilli », celui de la toile garde son nom', () => {
  const catalog = catalogOf({ models: { toile, poster }, names: { ...NAMES, framePoster: { chene: 'Chêne vieilli' } } })
  const nameOf = (product, id) => catalog.options('frame', product).find((o) => o.id === id).name
  assert.equal(nameOf(POSTER, 'chene'), 'Chêne vieilli')
  assert.equal(nameOf(TOILE, 'chene'), 'Chêne')
  assert.equal(nameOf(POSTER, 'noyer'), 'Noyer')
  assert.equal(legendOf(catalog, TEXTS_FR, 'frame', { ...POSTER, frame: 'chene' }).value, 'Chêne vieilli')
  // Sans nom propre au poster (une langue où il manque), le nom commun reste.
  assert.equal(both.options('frame', POSTER).find((o) => o.id === 'chene').name, 'Chêne')
})
