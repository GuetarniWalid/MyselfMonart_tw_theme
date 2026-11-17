// Le choix de la scène de la fiche : 3D, ou photos et simples fondus (décision 5).
// Lancer : node --test scripts/oeuvre-3d-stage.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { stageMode, wantsDetail, startsAtOnce } = require('../assets/component-oeuvre-3d.js')

// Un téléphone de milieu de gamme en 4G.
const PHONE = { reducedMotion: false, saveData: false, effectiveType: '4g', deviceMemory: 4, cores: 8, webgl2: true }

test('un téléphone courant a la 3D', () => {
  assert.equal(stageMode(PHONE), '3d')
})

test('un navigateur qui ne dit rien de sa mémoire ni de son réseau a la 3D : c’est Safari', () => {
  assert.equal(stageMode({ reducedMotion: false, cores: 6, webgl2: true }), '3d')
})

test('animations réduites : photos', () => {
  assert.equal(stageMode({ ...PHONE, reducedMotion: true }), 'photos')
})

test('économie de données ou réseau 2G : photos, three.js ne se télécharge pas', () => {
  assert.equal(stageMode({ ...PHONE, saveData: true }), 'photos')
  assert.equal(stageMode({ ...PHONE, effectiveType: '2g' }), 'photos')
  assert.equal(stageMode({ ...PHONE, effectiveType: 'slow-2g' }), 'photos')
})

test('appareil modeste : photos', () => {
  assert.equal(stageMode({ ...PHONE, deviceMemory: 2 }), 'photos')
  assert.equal(stageMode({ ...PHONE, cores: 2 }), 'photos')
})

test('sans WebGL2 : photos', () => {
  assert.equal(stageMode({ ...PHONE, webgl2: false }), 'photos')
})

test('la source complète des gros plans ne part pas sur un réseau 3G', () => {
  assert.equal(wantsDetail(PHONE), true)
  assert.equal(wantsDetail({ ...PHONE, effectiveType: '3g' }), false)
  assert.equal(wantsDetail({ ...PHONE, saveData: true }), false)
  assert.equal(wantsDetail({ reducedMotion: false, cores: 6, webgl2: true }), true)
})

// La 3D part au premier geste, ou 8 s après le chargement (ticket 07). Une arrivée avec un cadre choisi
// (rechargement, lien avec ?variant=) part dès la fin du chargement : la photo d'attente, l'œuvre seule,
// tairait ce cadre (retour de Walid du 17/11/2026).
const TOILE = { material: 'toile', size: '30x40', border: 'blanche', frame: 'sans', passe: false }
const POSTER = { ...TOILE, material: 'poster', passe: true }

test('une arrivée avec un cadre choisi démarre la 3D sans attendre de geste', () => {
  for (const frame of ['blanc', 'noir', 'argent', 'chene', 'noyer']) {
    assert.equal(startsAtOnce({ ...TOILE, frame }), true, `toile, cadre ${frame}`)
    assert.equal(startsAtOnce({ ...POSTER, frame }), true, `poster, cadre ${frame}`)
  }
})

test('sans cadre, la photo montre déjà le choix : la 3D attend un geste, comme avant', () => {
  assert.equal(startsAtOnce(TOILE), false)
  assert.equal(startsAtOnce({ ...TOILE, border: 'noire' }), false) // la bordure ne se voit pas de face
  assert.equal(startsAtOnce(POSTER), false)
  assert.equal(startsAtOnce({ ...POSTER, passe: false }), false)
  assert.equal(startsAtOnce(null), false)
  assert.equal(startsAtOnce({ ...TOILE, frame: undefined }), false)
})
