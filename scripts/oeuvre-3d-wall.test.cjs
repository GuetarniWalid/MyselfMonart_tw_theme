// Le plan « taille » de la fiche sans pièce : le tableau varie sur le mur neutre, avec sa cote en cm.
// Lancer : node --test scripts/oeuvre-3d-wall.test.cjs  (lanceur intégré de Node, sans dépendance)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createDirector, neutralRoom, paintingCorners, stillView } = require('../assets/oeuvre-3d-engine.js')

const PORTRAIT = ['30x40', '60x80', '75x100', '90x120']
const LANDSCAPE = ['40x30', '80x60', '100x75', '120x90']
const SQUARE = ['40x40', '60x60', '80x80', '100x100']
const SCREENS = [0.82, 1, 1.3, 1.8] // largeur / hauteur de la scène, du téléphone au grand écran
const LATER = 5000 // ms : toute transition est finie

const toile = (size) => ({ material: 'toile', size, border: 'blanche', frame: 'sans', passe: false })

function afterChoosing(sizes, from, to, aspect = SCREENS[0]) {
  const director = createDirector({ room: neutralRoom(sizes), product: toile(from) })
  director.choose('size', toile(to), 0)
  return director.view(LATER, aspect)
}

// Part de la hauteur de la vue que prend une longueur posée à la profondeur visée.
function heightShare(view, length) {
  const { position, target, fovY } = view.camera
  const distance = Math.hypot(...position.map((c, i) => c - target[i]))
  return length / (2 * distance * Math.tan(fovY / 2))
}

// Point du mur vu de face, en coordonnées d'écran (-1 à 1).
function onScreen(view, aspect, [x, y, z]) {
  const { position, target, fovY } = view.camera
  const depth = position[2] - z
  const half = depth * Math.tan(fovY / 2)
  return { x: (x - target[0]) / (half * aspect), y: (y - target[1]) / half }
}

test('sur le mur neutre, une taille reste sur le mur et affiche sa cote en cm', () => {
  const view = afterChoosing(PORTRAIT, '30x40', '75x100')
  assert.equal(view.shot, 'wall')
  assert.equal(view.room, 0, 'aucune photo de pièce')
  assert.equal(view.dims.opacity, 1)
  assert.equal(view.dims.width.text, '75 cm')
  assert.equal(view.dims.height.text, '100 cm')
  assert.equal(view.painting.width, 75)
  assert.equal(view.painting.height, 100)
  assert.equal(view.painting.yaw, 0)
})

test('de 60 × 80 à 90 × 120, la caméra ne bouge pas : c’est le tableau qui grandit, à la vraie échelle', () => {
  const small = afterChoosing(PORTRAIT, '30x40', '60x80')
  const big = afterChoosing(PORTRAIT, '30x40', '90x120')
  assert.deepEqual(small.camera, big.camera)
  const ratio = heightShare(big, 120) / heightShare(small, 80)
  assert.ok(Math.abs(ratio - 1.5) < 1e-9, `rapport ${ratio}`)
})

test('un 30 × 40 ne paraît pas ridicule : il prend le quart de la hauteur, le cadrage se resserre', () => {
  for (const aspect of SCREENS) {
    const view = afterChoosing(PORTRAIT, '90x120', '30x40', aspect)
    const share = heightShare(view, 40)
    assert.ok(Math.abs(share - 0.25) < 0.001, `écran ${aspect} : ${(share * 100).toFixed(1)} %`)
  }
})

test('le tableau reste centré quand il change de taille : pas de canapé à respecter', () => {
  const views = PORTRAIT.map((size) => afterChoosing(PORTRAIT, '30x40', size))
  const middles = new Set(views.map((view) => view.painting.y))
  assert.equal(middles.size, 1)
  assert.equal(views[0].camera.target[1], views[0].painting.y)
})

for (const [format, sizes] of [['portrait', PORTRAIT], ['paysage', LANDSCAPE], ['carré', SQUARE]]) {
  for (const aspect of SCREENS) {
    test(`${format}, écran ${aspect} : chaque taille tient à l'écran avec ses deux cotes et leurs étiquettes`, () => {
      for (const size of sizes) {
        const view = afterChoosing(sizes, sizes[0], size, aspect)
        for (const corner of paintingCorners(view.painting, 'outer')) {
          const { x, y } = onScreen(view, aspect, corner)
          assert.ok(Math.abs(x) <= 1 && Math.abs(y) <= 1, `${size} : coin à ${x.toFixed(2)}, ${y.toFixed(2)}`)
        }
        // L'étiquette de largeur se pose au-dessus de sa ligne, celle de hauteur à sa droite : il lui
        // faut 60 px, soit 32 % de la demi-largeur d'un téléphone de 375 px.
        const line = onScreen(view, aspect, view.dims.width.a)
        assert.ok(line.y <= 0.88, `${size} : étiquette de largeur coupée, ligne à ${line.y.toFixed(2)}`)
        const side = onScreen(view, aspect, view.dims.height.a)
        assert.ok(side.x <= 0.68, `${size} : étiquette de hauteur coupée, ligne à ${side.x.toFixed(2)}`)
      }
    })
  }
}

test('passer de face au plan de la taille se fait sans saut, et la cote arrive en fondu', () => {
  const director = createDirector({ room: neutralRoom(PORTRAIT), product: toile('30x40') })
  director.choose('size', toile('75x100'), 0)
  let previous = director.view(0, SCREENS[0])
  assert.equal(previous.dims.opacity, 0)
  for (let t = 8; t <= LATER; t += 8) {
    const view = director.view(t, SCREENS[0])
    const gap = Math.hypot(...view.camera.position.map((c, i) => c - previous.camera.position[i]))
    assert.ok(gap < 8, `la caméra saute de ${gap.toFixed(1)} cm à ${t} ms`)
    assert.ok(view.dims.opacity >= previous.dims.opacity - 1e-9, 'la cote ne clignote pas')
    previous = view
  }
  assert.equal(previous.dims.opacity, 1)
})

test('sur le mur, le doigt incline toujours le tableau : il n’y a pas de photo à garder de face', () => {
  const director = createDirector({ room: neutralRoom(PORTRAIT), product: toile('30x40') })
  director.choose('size', toile('60x80'), 0)
  director.grab(LATER)
  director.drag(0.3, 0, LATER + 50)
  const { position, target } = director.view(LATER + 50, SCREENS[0]).camera
  assert.notEqual(position[0], target[0])
})

test('retoucher la taille choisie rejoue le plan : retour de face, puis le mur', () => {
  const director = createDirector({ room: neutralRoom(PORTRAIT), product: toile('30x40') })
  director.choose('size', toile('60x80'), 0)
  director.choose('size', toile('60x80'), LATER)
  const front = createDirector({ room: neutralRoom(PORTRAIT), product: toile('60x80') }).view(0, SCREENS[0])
  let passedFront = false
  for (let t = LATER; t <= 2 * LATER; t += 8) {
    const { position } = director.view(t, SCREENS[0]).camera
    if (Math.hypot(...position.map((c, i) => c - front.camera.position[i])) < 0.5) passedFront = true
  }
  assert.ok(passedFront, 'la caméra repasse de face')
  assert.equal(director.view(2 * LATER, SCREENS[0]).shot, 'wall')
})

test('une photo hors de la page reprend le plan que la fiche montre une fois posée', () => {
  const room = neutralRoom(PORTRAIT)
  const framed = { ...toile('60x80'), border: 'miroir', frame: 'chene' }
  for (const group of ['border', 'frame', 'size']) {
    const director = createDirector({ room, product: toile('30x40') })
    director.choose(group, framed, 0)
    assert.deepEqual(stillView({ room, product: framed, group, aspect: SCREENS[0] }), director.view(LATER, SCREENS[0]), group)
  }
})

test('sans plan demandé, la photo est la vue de face', () => {
  const view = stillView({ room: neutralRoom(PORTRAIT), product: toile('75x100'), aspect: 1 })
  assert.equal(view.shot, 'front')
  assert.equal(view.painting.width, 75)
})

test('quitter le plan de la taille efface la cote', () => {
  const director = createDirector({ room: neutralRoom(PORTRAIT), product: toile('30x40') })
  director.choose('size', toile('60x80'), 0)
  director.choose('front', toile('60x80'), LATER)
  assert.equal(director.view(2 * LATER, SCREENS[0]).dims.opacity, 0)
})
