// Le choix de la scène de la fiche : 3D, ou photos et simples fondus (décision 5).
// Lancer : node --test scripts/oeuvre-3d-stage.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { stageMode, wantsDetail } = require('../assets/component-oeuvre-3d.js')

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
