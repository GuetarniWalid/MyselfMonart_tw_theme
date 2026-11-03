/*
 * Moteur three.js du prototype : rend la vue que calcule le directeur (staging.js).
 *
 * Fidélité des couleurs : l'œuvre n'est éclairée que par un facteur de luminosité, le même
 * sur les trois canaux et plafonné à 1, sans mappage de tons. De face et au repos, ce
 * facteur vaut 1 : chaque pixel garde la couleur de l'image à plat (seul le grain de la
 * toile l'assombrit de quelques %). La teinte ne bouge donc jamais.
 * Ombre : calculée sur le mur (projection du tableau le long de la lumière, pénombre qui
 * s'élargit avec la distance au mur), sans carte d'ombre.
 */

import { artBox, frameRing, frameProfile, frameOpening } from './geometry.js'
import { paintingCorners } from './staging.js'
import { FRAME_PROFILE } from './catalog.js'
import {
  weaveCanvas, paperCanvas, oakCanvas, environmentCanvas,
  WEAVE_TILE_CM, PAPER_TILE_CM, OAK_TILE_CM,
} from './textures.js'

const BORDER_SRGB = { blanche: '#efede8', noire: '#272727', papier: '#f7f6f2' }
const PAPER_WHITE = '#f7f6f2'
const PASSE_RATIO = 0.08 // contour blanc : 8 % du petit côté, égal en cm sur les 4 côtés
const SHADE = { ambient: 0.55, diffuse: 0.45, weave: 0.075, bump: 0.38 }
const SHADOW = { key: 0.34, keyFade: 28, penumbra: 0.35, penumbraPerCm: 0.42, ao: 0.12, aoRadius: 1.6 }

const ART_VERTEX = /* glsl */ `
  attribute vec2 fab;
  attribute float art;
  varying vec2 vUv;
  varying vec2 vFab;
  varying float vArt;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vFab = fab;
    vArt = art;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ART_FRAGMENT = /* glsl */ `
  uniform sampler2D uArt;
  uniform sampler2D uWeave;
  uniform sampler2D uPaperTex;
  uniform float uWeaveScale;
  uniform float uPaperScale;
  uniform vec3 uBorder;
  uniform vec3 uPaperWhite;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  uniform float uWeaveAmt;
  uniform float uBump;
  uniform float uPaper;
  uniform float uPasse;
  uniform vec2 uMargin;
  uniform vec2 uCover;
  varying vec2 vUv;
  varying vec2 vFab;
  varying float vArt;
  varying vec3 vNormalW;

  void main() {
    // Contour blanc : marge de papier égale en cm, œuvre recadrée pour remplir l'intérieur.
    vec3 full = texture2D(uArt, vUv).rgb;
    vec2 inner = (vUv - uMargin) / (1.0 - 2.0 * uMargin);
    vec3 cropped = texture2D(uArt, clamp((inner - 0.5) * uCover + 0.5, 0.0, 1.0)).rgb;
    float inside = step(0.0, inner.x) * step(inner.x, 1.0) * step(0.0, inner.y) * step(inner.y, 1.0);
    vec3 base = mix(uBorder, mix(full, mix(uPaperWhite, cropped, inside), uPasse), vArt);

    // Grain : trame de la toile ou papier, en relief (normale) et en luminosité.
    vec4 grain = mix(texture2D(uWeave, vFab * uWeaveScale), texture2D(uPaperTex, vFab * uPaperScale), uPaper);
    vec3 N = normalize(vNormalW);
    vec3 T = normalize(abs(N.y) < 0.95 ? cross(vec3(0.0, 1.0, 0.0), N) : cross(N, vec3(1.0, 0.0, 0.0)));
    vec3 B = cross(N, T);
    vec2 slope = grain.gb * 2.0 - 1.0;
    vec3 Np = normalize(N + mix(uBump, uBump * 0.3, uPaper) * (slope.x * T + slope.y * B));

    // Luminosité seule, ramenée à 1 pour la façade de face : la teinte ne change jamais.
    float k = (uAmbient + uDiffuse * max(dot(Np, uLight), 0.0)) * uNorm;
    k *= 1.0 - mix(uWeaveAmt, uWeaveAmt * 0.3, uPaper) * (1.0 - grain.r);
    gl_FragColor = vec4(base * min(k, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`

const WALL_VERTEX = /* glsl */ `
  varying vec2 vXY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXY = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const WALL_FRAGMENT = /* glsl */ `
  uniform vec3 uWall;
  uniform float uSlope;
  uniform float uRefX;
  uniform sampler2D uRoom;
  uniform float uRoomMix;
  uniform vec4 uRoomRect;
  uniform float uFeather;
  uniform vec2 uHull[8];
  uniform int uHullN;
  uniform float uPenumbra;
  uniform float uKey;
  uniform vec4 uAo;
  uniform float uAoAmt;
  uniform float uAoRadius;
  varying vec2 vXY;

  // Distance signée au polygone convexe de l'ombre (sens trigonométrique).
  float hullDistance(vec2 p) {
    float d = -1e6;
    for (int i = 0; i < 8; i++) {
      if (i >= uHullN) break;
      vec2 a = uHull[i];
      vec2 e = normalize(uHull[i + 1 < uHullN ? i + 1 : 0] - a);
      d = max(d, (p.x - a.x) * e.y - (p.y - a.y) * e.x);
    }
    return d;
  }

  float boxDistance(vec2 p, vec2 c, vec2 h) {
    vec2 q = abs(p - c) - h;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }

  void main() {
    vec3 col = uWall * (1.0 + uSlope * (vXY.x - uRefX));
    if (uRoomMix > 0.0) {
      vec2 ruv = (vXY - uRoomRect.xy) / (uRoomRect.zw - uRoomRect.xy);
      float inside = step(0.0, ruv.x) * step(ruv.x, 1.0) * step(0.0, ruv.y) * step(ruv.y, 1.0);
      float feather = 1.0 - smoothstep(uRoomRect.w - uFeather, uRoomRect.w, vXY.y);
      col = mix(col, texture2D(uRoom, ruv).rgb, uRoomMix * inside * feather);
    }
    float key = uKey * (1.0 - smoothstep(-uPenumbra, uPenumbra, hullDistance(vXY)));
    float ao = uAoAmt * (1.0 - smoothstep(0.0, uAoRadius, boxDistance(vXY, uAo.xy, uAo.zw)));
    gl_FragColor = vec4(col * (1.0 - key) * (1.0 - ao), 1.0);
    #include <colorspace_fragment>
  }
`

const GLASS_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

// Verre : voile très léger, reflet d'une fenêtre à petits carreaux (fixe dans la pièce,
// il glisse donc quand on incline) et brillance rasante (Fresnel). Ajouté à l'image.
const GLASS_FRAGMENT = /* glsl */ `
  uniform vec3 uNormal;
  uniform float uOpacity;
  uniform vec3 uWin;
  uniform vec2 uWinHalf;
  varying vec3 vWorld;
  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(uNormal, V), 0.0), 5.0);
    vec3 R = reflect(-V, uNormal);
    float t = (uWin.z - vWorld.z) / max(R.z, 0.05);
    vec2 q = (vWorld.xy + R.xy * t - uWin.xy) / uWinHalf;
    float window = (1.0 - smoothstep(0.75, 1.0, abs(q.x))) * (1.0 - smoothstep(0.75, 1.0, abs(q.y))) * step(0.05, R.z);
    vec2 cell = fract((q * 0.5 + 0.5) * vec2(2.0, 3.0));
    float panes = smoothstep(0.0, 0.12, cell.x) * smoothstep(0.0, 0.12, 1.0 - cell.x)
                * smoothstep(0.0, 0.1, cell.y) * smoothstep(0.0, 0.1, 1.0 - cell.y);
    float a = (0.012 + window * mix(0.45, 1.0, panes) * 0.06 + fresnel * 0.24) * uOpacity;
    gl_FragColor = vec4(vec3(a), 1.0);
  }
`

const unit = (v) => {
  const n = Math.hypot(...v)
  return v.map((c) => c / n)
}

// Enveloppe convexe 2D (chaîne monotone d'Andrew), sens trigonométrique.
function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

const lerp = (a, b, t) => a + (b - a) * t
const round = (v) => Math.round(v * 1000) / 1000

export function createScene(THREE, { canvas, artImage, room }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 5000)
  const light = unit(room.light)

  const dataTexture = (cnv) => {
    const t = new THREE.CanvasTexture(cnv)
    t.colorSpace = THREE.NoColorSpace
    t.flipY = false
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = anisotropy
    return t
  }

  const artTexture = new THREE.Texture(artImage)
  artTexture.colorSpace = THREE.SRGBColorSpace
  artTexture.anisotropy = anisotropy
  artTexture.needsUpdate = true

  // ---- Mur (uni, puis photo de la pièce en fondu) et ombre ----
  const hull = Array.from({ length: 8 }, () => new THREE.Vector2())
  const wallUniforms = {
    uWall: { value: new THREE.Color().setRGB(...room.wall.map((c) => c / 255), THREE.SRGBColorSpace) },
    uSlope: { value: room.wallSlope },
    uRefX: { value: room.hang.x },
    uRoom: { value: null },
    uRoomMix: { value: 0 },
    uRoomRect: { value: new THREE.Vector4(room.photo.left, room.photo.bottom, room.photo.right, room.photo.top) },
    uFeather: { value: 18 },
    uHull: { value: hull },
    uHullN: { value: 0 },
    uPenumbra: { value: 1 },
    uKey: { value: 0 },
    uAo: { value: new THREE.Vector4() },
    uAoAmt: { value: 0 },
    uAoRadius: { value: SHADOW.aoRadius },
  }
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 1400),
    new THREE.ShaderMaterial({ uniforms: wallUniforms, vertexShader: WALL_VERTEX, fragmentShader: WALL_FRAGMENT }),
  )
  wall.position.set(room.hang.x, 150, 0)
  scene.add(wall)

  // ---- Œuvre (toile ou papier) ----
  const artUniforms = {
    uArt: { value: artTexture },
    uWeave: { value: dataTexture(weaveCanvas()) },
    uPaperTex: { value: null }, // calculé au premier poster ou au repos (ensurePaper)
    uWeaveScale: { value: 1 / WEAVE_TILE_CM },
    uPaperScale: { value: 1 / PAPER_TILE_CM },
    uBorder: { value: new THREE.Color(BORDER_SRGB.blanche) },
    uPaperWhite: { value: new THREE.Color(PAPER_WHITE) },
    uLight: { value: new THREE.Vector3(...light) },
    uAmbient: { value: SHADE.ambient },
    uDiffuse: { value: SHADE.diffuse },
    uNorm: { value: 1 / (SHADE.ambient + SHADE.diffuse * light[2]) },
    uWeaveAmt: { value: SHADE.weave },
    uBump: { value: SHADE.bump },
    uPaper: { value: 0 },
    uPasse: { value: 0 },
    uMargin: { value: new THREE.Vector2() },
    uCover: { value: new THREE.Vector2(1, 1) },
  }
  const artMaterial = new THREE.ShaderMaterial({
    uniforms: artUniforms, vertexShader: ART_VERTEX, fragmentShader: ART_FRAGMENT,
  })
  const group = new THREE.Group()
  group.rotation.order = 'YXZ'
  const artMesh = new THREE.Mesh(new THREE.BufferGeometry(), artMaterial)
  group.add(artMesh)
  scene.add(group)

  function ensurePaper() {
    if (!artUniforms.uPaperTex.value) artUniforms.uPaperTex.value = dataTexture(paperCanvas())
  }

  // ---- Cadres : matières PBR et reflets d'un petit environnement, préparés au premier
  //      cadre ou au repos de la page (warmUp), jamais avant la première image ----
  let frameMaterials = null
  function ensureFrameMaterials() {
    if (frameMaterials) return frameMaterials
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envSource = new THREE.CanvasTexture(environmentCanvas())
    envSource.mapping = THREE.EquirectangularReflectionMapping
    envSource.colorSpace = THREE.SRGBColorSpace
    const envMap = pmrem.fromEquirectangular(envSource).texture
    envSource.dispose()
    pmrem.dispose()

    const oak = new THREE.CanvasTexture(oakCanvas())
    oak.colorSpace = THREE.SRGBColorSpace
    oak.wrapS = oak.wrapT = THREE.RepeatWrapping
    oak.repeat.set(1 / OAK_TILE_CM[0], 1 / OAK_TILE_CM[1])
    oak.anisotropy = anisotropy
    const grainBump = oak.clone()
    grainBump.colorSpace = THREE.NoColorSpace
    frameMaterials = {
      chene: new THREE.MeshStandardMaterial({ map: oak, roughness: 0.58, metalness: 0, envMap, envMapIntensity: 0.55 }),
      noir: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1f1f21'), roughness: 0.68, metalness: 0, envMap, envMapIntensity: 0.6,
        bumpMap: grainBump, bumpScale: 0.35,
      }),
    }
    return frameMaterials
  }
  const frameMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
  frameMesh.visible = false
  group.add(frameMesh)

  const glassUniforms = {
    uNormal: { value: new THREE.Vector3(0, 0, 1) },
    uOpacity: { value: 0 },
    uWin: { value: new THREE.Vector3() },
    uWinHalf: { value: new THREE.Vector2(20, 30) },
  }
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: glassUniforms, vertexShader: GLASS_VERTEX, fragmentShader: GLASS_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  group.add(glass)

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0)
  scene.add(keyLight, keyLight.target)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfad, 0.6))

  // ---- Géométries, recalculées seulement quand leurs dimensions changent. Pendant une
  //      animation (taille, épaisseur), le nombre de sommets ne bouge pas : on réécrit les
  //      tampons en place au lieu d'en créer de nouveaux. ----
  let artKey = '', frameKey = ''
  const setGeometry = (mesh, data, extra) => {
    const names = ['position', 'normal', 'uv', ...(extra || [])]
    const current = mesh.geometry
    const sameShape = names.every((n) => current.getAttribute(n) && current.getAttribute(n).array.length === data[n].length) &&
      current.index && current.index.array.length === data.index.length
    if (sameShape) {
      for (const n of names) {
        const attribute = current.getAttribute(n)
        attribute.array.set(data[n])
        attribute.needsUpdate = true
      }
      current.index.array.set(data.index)
      current.index.needsUpdate = true
      current.computeBoundingSphere()
      return
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.position, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2))
    if (extra) for (const name of extra) g.setAttribute(name, new THREE.BufferAttribute(data[name], name === 'art' ? 1 : 2))
    g.setIndex(new THREE.BufferAttribute(data.index, 1))
    mesh.geometry.dispose()
    mesh.geometry = g
  }

  function updatePainting(p, product) {
    group.position.set(p.x, p.y, p.z)
    group.rotation.set(p.pitch, p.yaw, 0)

    const border = p.paper > 0.5 ? 'papier' : product.border
    const key = [p.width, p.height, p.depth].map(round).join('x') + border
    if (key !== artKey) {
      setGeometry(artMesh, artBox({ width: p.width, height: p.height, depth: p.depth, border }), ['fab', 'art'])
      artKey = key
    }
    artMesh.position.z = p.artZ

    const toile = new THREE.Color(BORDER_SRGB[product.border] || BORDER_SRGB.blanche)
    artUniforms.uBorder.value.copy(toile).lerp(artUniforms.uPaperWhite.value, p.paper)
    if (p.paper > 0) ensurePaper()
    artUniforms.uPaper.value = p.paper
    artUniforms.uPasse.value = p.passe
    const m = PASSE_RATIO * Math.min(p.width, p.height)
    artUniforms.uMargin.value.set(m / p.width, m / p.height)
    // Recadrage de l'œuvre dans l'intérieur du contour (remplir sans déformer).
    const innerRatio = (p.width - 2 * m) / (p.height - 2 * m)
    const artRatio = artImage.naturalWidth / artImage.naturalHeight
    artUniforms.uCover.value.set(
      innerRatio < artRatio ? innerRatio / artRatio : 1,
      innerRatio < artRatio ? 1 : artRatio / innerRatio,
    )

    const framed = product.frame !== 'sans'
    frameMesh.visible = framed
    glass.visible = framed && p.paper > 0.01
    if (framed) {
      // Le profil glisse de la caisse américaine à la baguette sous verre avec `paper`.
      const a = FRAME_PROFILE.toile, b = FRAME_PROFILE.poster
      const f = Object.fromEntries(Object.keys(a).map((k) => [k, lerp(a[k], b[k], p.paper)]))
      const kind = p.paper > 0.5 ? 'poster' : 'toile'
      const fk = [p.width, p.height, f.gap, f.face, f.depth, f.floor].map(round).join('x') + kind
      if (fk !== frameKey) {
        const opening = frameOpening(p.width, p.height, f)
        setGeometry(frameMesh, frameRing({ ...opening, profile: frameProfile(kind, f) }))
        glass.scale.set(2 * opening.hw, 2 * opening.hh, 1)
        glass.position.set(0, 0, f.floor + 0.1)
        frameKey = fk
      }
      const materials = ensureFrameMaterials()
      frameMesh.material = materials[product.frame] || materials.noir
      glassUniforms.uOpacity.value = p.paper
      glassUniforms.uNormal.value.set(0, 0, 1).applyEuler(group.rotation)
      glassUniforms.uWin.value.set(p.x - 28, p.y + 36, p.z + 240)
    }
  }

  function updateShadow(p) {
    const corners = paintingCorners(p, 'outer')
    const projected = corners.map((c) => [c[0] - (light[0] * c[2]) / light[2], c[1] - (light[1] * c[2]) / light[2]])
    const h = convexHull(projected)
    h.forEach((q, i) => hull[i].set(q[0], q[1]))
    wallUniforms.uHullN.value = h.length
    const front = corners.filter((c) => c.side.z === 1)
    const height = front.reduce((s, c) => s + c[2], 0) / front.length
    wallUniforms.uPenumbra.value = SHADOW.penumbra + SHADOW.penumbraPerCm * height
    wallUniforms.uKey.value = SHADOW.key * Math.exp(-height / SHADOW.keyFade) * Math.min(1, p.outer.depth / 0.6)
    wallUniforms.uAo.value.set(p.x, p.y, p.outer.width / 2, p.outer.height / 2)
    wallUniforms.uAoAmt.value = SHADOW.ao * Math.exp(-p.z / 2.5) * Math.min(1, p.outer.depth / 2)
  }

  // ---- Pièce : chargée au premier besoin, puis fondue ----
  let roomState = 'none', roomShownAt = 0
  function loadRoom() {
    if (roomState !== 'none') return
    roomState = 'loading'
    new THREE.TextureLoader().load(room.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = anisotropy
      wallUniforms.uRoom.value = texture
      roomState = 'ready'
      roomShownAt = performance.now()
      if (onNeedsRender) onNeedsRender()
    }, undefined, () => { roomState = 'error' })
  }
  const roomFade = (now) => (roomState === 'ready' ? Math.min(1, (now - roomShownAt) / 350) : 0)

  let onNeedsRender = null
  let width = 1, height = 1

  function resize(w, h) {
    width = Math.max(1, w)
    height = Math.max(1, h)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
  }

  function render(view, product, now) {
    camera.fov = (view.camera.fovY * 180) / Math.PI
    camera.position.set(...view.camera.position)
    camera.lookAt(...view.camera.target)
    camera.updateProjectionMatrix()
    updatePainting(view.painting, product)
    updateShadow(view.painting)
    const p = view.painting
    keyLight.position.set(p.x + light[0] * 400, p.y + light[1] * 400, light[2] * 400)
    keyLight.target.position.set(p.x, p.y, 0)
    if (view.room > 0) loadRoom()
    wallUniforms.uRoomMix.value = view.room * roomFade(now)
    renderer.render(scene, camera)
  }

  // Projette un point du mur ou du tableau en pixels CSS dans le canvas.
  const tmp = new THREE.Vector3()
  function toScreen(point) {
    tmp.set(...point).project(camera)
    return { x: ((tmp.x + 1) / 2) * width, y: ((1 - tmp.y) / 2) * height, visible: tmp.z < 1 }
  }

  /* Fidélité : rend la vue de face, lit les pixels de la façade et les compare, zone par
     zone (24 × 32), à l'image à plat ramenée à la même taille. Le grain de la toile est
     ainsi moyenné ; il reste l'effet de l'éclairage. Écart en ΔE (CIELAB 1976). */
  function measureFidelity(view, product) {
    render(view, product, performance.now())
    const gl = renderer.getContext()
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    const face = paintingCorners(view.painting).filter((c) => c.side.z === 1).map((c) => {
      tmp.set(...c).project(camera)
      return [((tmp.x + 1) / 2) * size.x, ((tmp.y + 1) / 2) * size.y]
    })
    // Façade projetée, moins une marge qui écarte l'arrondi de l'arête (0,25 cm).
    const left = Math.min(...face.map((q) => q[0])), right = Math.max(...face.map((q) => q[0]))
    const bottom = Math.min(...face.map((q) => q[1])), top = Math.max(...face.map((q) => q[1]))
    const inset = Math.ceil(((right - left) / view.painting.width) * 0.45)
    const x0 = Math.ceil(left) + inset, x1 = Math.floor(right) - inset
    const y0 = Math.ceil(bottom) + inset, y1 = Math.floor(top) - inset
    const w = x1 - x0, h = y1 - y0
    if (w < 48 || h < 64) return null
    const rendered = new Uint8Array(w * h * 4)
    gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rendered)

    // Même zone de l'image à plat, retournée car readPixels lit de bas en haut.
    const ref = document.createElement('canvas')
    ref.width = w
    ref.height = h
    const ctx = ref.getContext('2d', { willReadFrequently: true })
    ctx.translate(0, h)
    ctx.scale(1, -1)
    const nw = artImage.naturalWidth, nh = artImage.naturalHeight
    const fw = right - left, fh = top - bottom
    ctx.drawImage(artImage, ((x0 - left) / fw) * nw, ((top - y1) / fh) * nh, (w / fw) * nw, (h / fh) * nh, 0, 0, w, h)
    const source = ctx.getImageData(0, 0, w, h).data

    const lab = (r, g, b) => {
      const lin = [r, g, b].map((v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      const X = (0.4124 * lin[0] + 0.3576 * lin[1] + 0.1805 * lin[2]) / 0.95047
      const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
      const Z = (0.0193 * lin[0] + 0.1192 * lin[1] + 0.9505 * lin[2]) / 1.08883
      const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
      return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
    }
    const blockMean = (data, bx, by, bw, bh) => {
      let r = 0, g = 0, b = 0, n = 0
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        const i = (y * w + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
      return [r / n, g / n, b / n]
    }
    const cols = 24, rows = 32, bw = Math.floor(w / cols), bh = Math.floor(h / rows)
    const deltas = [], hues = [], lightness = []
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = lab(...blockMean(source, i * bw, j * bh, bw, bh))
      const b = lab(...blockMean(rendered, i * bw, j * bh, bw, bh))
      deltas.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
      lightness.push(b[0] - a[0])
      const ca = Math.hypot(a[1], a[2]), cb = Math.hypot(b[1], b[2])
      if (ca > 10 && cb > 10) {
        let d = Math.abs(Math.atan2(a[2], a[1]) - Math.atan2(b[2], b[1])) * (180 / Math.PI)
        hues.push(d > 180 ? 360 - d : d)
      }
    }
    deltas.sort((p, q) => p - q)
    const mean = (xs) => xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length)
    return {
      deltaE: mean(deltas),
      deltaE95: deltas[Math.floor(deltas.length * 0.95)],
      hue: mean(hues),
      hueSamples: hues.length,
      lightness: mean(lightness),
      pixels: `${w}×${h}`,
    }
  }

  /* Au repos, après la première image : prépare papier, bois et reflets, et compile les
     programmes des cadres et du verre pour que le premier clic ne saccade pas. */
  function warmUp() {
    ensurePaper()
    const materials = ensureFrameMaterials()
    const saved = { visible: frameMesh.visible, material: frameMesh.material, glass: glass.visible }
    frameMesh.visible = true
    glass.visible = true
    for (const material of Object.values(materials)) {
      frameMesh.material = material
      if (renderer.compileAsync) renderer.compileAsync(scene, camera)
      else renderer.compile(scene, camera)
    }
    Object.assign(frameMesh, { visible: saved.visible, material: saved.material })
    glass.visible = saved.glass
  }

  return {
    renderer,
    resize,
    render,
    toScreen,
    measureFidelity,
    warmUp,
    loadRoom,
    roomReady: () => roomState === 'ready',
    roomFading: (now) => roomState === 'ready' && now - roomShownAt < 350,
    set onNeedsRender(fn) { onNeedsRender = fn },
  }
}
