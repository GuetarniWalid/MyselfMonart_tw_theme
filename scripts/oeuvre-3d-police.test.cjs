// La police de la fiche 3D (choix de Walid du 11/11/2026) : Albert Sans pour les légendes, la rangée et
// la pilule, en 500, 600 et 700, woff2 hébergés dans le thème (Google Fonts, licence OFL), déclarée par
// la scène seule (snippets/oeuvre-3d-stage.liquid) : aucune autre page ne la charge.
// Depuis le 20/11/2026, la scène déclare aussi 300 et 400, pour la page galerie qui la suit
// (assets/oeuvre-galerie.css) : la scène, elle, n'écrit toujours qu'en 500, 600 et 700.
// Lancer : node --test scripts/oeuvre-3d-police.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Les graisses de la scène, puis celles que la page galerie ajoute.
const SCENE_WEIGHTS = ['500', '600', '700']
const WEIGHTS = ['300', '400', ...SCENE_WEIGHTS]
const STAGE = 'snippets/oeuvre-3d-stage.liquid'
// Les blocs @font-face d'Albert Sans ; les accolades des balises Liquid {{ … }} n'en ferment aucun.
const fontFaces = (source) =>
  (source.replace(/{{[\s\S]*?}}/g, (tag) => tag.replace(/[{}]/g, '')).match(/@font-face\s*{[^}]*}/g) || [])
    .filter((block) => /Albert Sans/.test(block))

test('la scène déclare Albert Sans de 300 à 700, woff2 du thème, font-display: swap', () => {
  const faces = fontFaces(read(STAGE))
  assert.deepEqual(faces.map((f) => /font-weight:\s*(\d+)/.exec(f)[1]).sort(), WEIGHTS)
  for (const face of faces) {
    const weight = /font-weight:\s*(\d+)/.exec(face)[1]
    assert.match(face, /font-display:\s*swap/, `${weight} : font-display: swap`)
    assert.match(face, new RegExp(`'oeuvre-3d-albert-sans-${weight}\\.woff2'\\s*\\|\\s*asset_url`), `${weight} : le fichier du thème`)
    assert.match(face, /format\(['"]woff2['"]\)/, `${weight} : woff2`)
  }
})

test('un fichier par graisse dans assets/, en woff2', () => {
  for (const weight of WEIGHTS) {
    const file = path.join(ROOT, 'assets', `oeuvre-3d-albert-sans-${weight}.woff2`)
    assert.ok(fs.existsSync(file), `assets/oeuvre-3d-albert-sans-${weight}.woff2`)
    assert.equal(fs.readFileSync(file).subarray(0, 4).toString('latin1'), 'wOF2', `${weight} : signature woff2`)
  }
})

test('les graisses de l’arrivée (500, 600) sont préchargées : pas de décalage au changement de police', () => {
  const stage = read(STAGE)
  for (const weight of ['500', '600']) {
    assert.match(stage, new RegExp(`'oeuvre-3d-albert-sans-${weight}\\.woff2'\\s*\\|\\s*asset_url\\s*\\|\\s*preload_tag:[^}]*as:\\s*'font'`), `${weight} préchargée`)
  }
})

test('seules les graisses de l’arrivée sont préchargées : 300 et 400 servent sous la scène, elles n’alourdissent pas le haut de la page', () => {
  const stage = read(STAGE)
  for (const weight of ['300', '400', '700']) {
    assert.doesNotMatch(stage, new RegExp(`'oeuvre-3d-albert-sans-${weight}\\.woff2'\\s*\\|\\s*asset_url\\s*\\|\\s*preload_tag`), `${weight} n'est pas préchargée`)
  }
})

test('la scène, ses chips et sa pilule n’écrivent qu’en 500, 600 et 700 : 300 et 400 ne changent rien à leur dessin', () => {
  // Les règles de la scène dans input.css : de sa police (--scene-font) à la fin de ses chips.
  const css = read('input.css')
  const scene = css.slice(css.indexOf('--scene-font:'), css.indexOf('.chips-opt-note'))
  const weights = new Set()
  // La propriété font, pas une variable dont le nom finit par « font » (--scene-font, --chips-font).
  for (const m of scene.matchAll(/(?<![\w-])font:\s*(\d{3})\s/g)) weights.add(m[1])
  for (const m of scene.matchAll(/font-weight:\s*(\d{3})/g)) weights.add(m[1])
  assert.deepEqual([...weights].sort(), SCENE_WEIGHTS)
  // Aucune règle de la scène ne laisse la graisse au hasard : une police écrite sans graisse sortirait en 400.
  for (const m of scene.matchAll(/(?<![\w-])font:\s*([^;]+);/g)) assert.match(m[1], /^(?:\d{3}\s|inherit)/, m[0])
})

test('la licence OFL et la source sont notées', () => {
  const stage = read(STAGE)
  assert.match(stage, /SIL Open Font License/)
  assert.match(stage, /Google Fonts/)
})

test('la scène, ses chips et sa pilule écrivent en Albert Sans', () => {
  const css = read('input.css')
  assert.match(css, /--scene-font:\s*"Albert Sans",/)
})

test('aucune autre partie du thème ne déclare Albert Sans : elle ne se charge que sur la fiche 3D', () => {
  const found = []
  for (const folder of ['layout', 'sections', 'snippets', 'templates', 'blocks', 'assets']) {
    const dir = path.join(ROOT, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir).filter((n) => /\.(liquid|css|js|json)$/.test(n))) {
      const file = `${folder}/${name}`
      if (file === STAGE) continue
      if (fontFaces(fs.readFileSync(path.join(dir, name), 'utf8')).length) found.push(file)
    }
  }
  if (fontFaces(read('input.css')).length) found.push('input.css')
  assert.deepEqual(found, [])
})
