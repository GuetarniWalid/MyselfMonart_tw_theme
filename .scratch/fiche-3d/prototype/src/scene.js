/*
 * Moteur three.js du prototype : rend la vue que calcule le directeur (staging.js).
 *
 * Fidélité des couleurs : l'œuvre n'est éclairée que par un facteur de luminosité, le même
 * sur les trois canaux et plafonné à 1, sans mappage de tons. De face et au repos, ce
 * facteur vaut 1 : chaque pixel garde la couleur de l'image à plat (seul le grain de la
 * toile l'assombrit de quelques %). La teinte ne bouge donc jamais.
 * Netteté : l'anticrénelage matériel ne lisse que les arêtes de géométrie. Tout bord calculé
 * dans un shader est donc lissé sur un pixel par sa couverture ; l'image grossie est lue en
 * bicubique (Catmull-Rom), l'image réduite garde ses mipmaps et le filtrage anisotrope.
 * Ombre : calculée sur le mur (projection du tableau le long de la lumière, pénombre qui
 * s'élargit avec la distance au mur), sans carte d'ombre.
 * Aucun à-coup : les programmes se compilent hors du fil de la page (prepare), et rien de
 * lourd n'attend le clic. Les cadres ont leur propre matériau, léger : ni environnement
 * précalculé ni lumières three.js ; le bois est une image, chargée au repos.
 */

import { artBox, convexHull, frameRing, frameProfile, frameOpening } from './geometry.js'
import { paintingCorners } from './staging.js'
import { PAPER_WHITE, borderOf, frameOf, hasFrame } from './catalog.js'
import { compareImages } from './fidelity.js'
import { decodeImage } from './images.js'
import { PAPER_TILE_CM, RELIEF_SIZE, WEAVE_TILE_CM } from './textures.js'

const PASSE_RATIO = 0.08 // contour blanc : 8 % du petit côté, égal en cm sur les 4 côtés
const SHADE = { ambient: 0.55, diffuse: 0.45, weave: 0.075, bump: 0.38 }
const SHADOW = { key: 0.34, keyFade: 28, penumbra: 0.35, penumbraPerCm: 0.42, ao: 0.12, aoRadius: 1.6 }
const WOOD_TILE_CM = [10, 30] // l'image du chêne couvre 10 cm en travers, 30 cm le long du fil
// Matières des cadres. wood : part de l'image de bois ; relief : fil du bois sous la lumière.
const FRAME_LOOK = {
  noir: { wood: 0, relief: 0.5, rough: 0.68 },
  chene: { wood: 1, relief: 0.9, rough: 0.55 },
}

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

  // Lecture bicubique (Catmull-Rom en 5 lectures) : une image grossie reste nette et ne
  // montre ni les losanges de l'interpolation bilinéaire ni ses pixels.
  vec3 cubicArt(vec2 uv, vec2 size) {
    vec2 pos = uv * size;
    vec2 c1 = floor(pos - 0.5) + 0.5;
    vec2 f = pos - c1;
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;
    vec2 w0 = -0.5 * f3 + f2 - 0.5 * f;
    vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
    vec2 w2 = -1.5 * f3 + 2.0 * f2 + 0.5 * f;
    vec2 w3 = 0.5 * f3 - 0.5 * f2;
    vec2 w12 = w1 + w2;
    vec2 t0 = (c1 - 1.0) / size;
    vec2 t3 = (c1 + 2.0) / size;
    vec2 t12 = (c1 + w2 / w12) / size;
    vec3 sum = textureLod(uArt, vec2(t12.x, t0.y), 0.0).rgb * (w12.x * w0.y)
             + textureLod(uArt, vec2(t0.x, t12.y), 0.0).rgb * (w0.x * w12.y)
             + textureLod(uArt, t12, 0.0).rgb * (w12.x * w12.y)
             + textureLod(uArt, vec2(t3.x, t12.y), 0.0).rgb * (w3.x * w12.y)
             + textureLod(uArt, vec2(t12.x, t3.y), 0.0).rgb * (w12.x * w3.y);
    float total = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
    return max(sum / total, 0.0);
  }

  // dx, dy : variation des coordonnées d'un pixel à l'autre, donnée à part car un calcul
  // de coordonnées (recadrage, bornes) fausserait les dérivées automatiques. L'image réduite
  // lit un niveau de mipmap plus fin que la règle (facteur 0,6) : sans quoi la 3D de face
  // serait plus molle que la photo qu'elle remplace. L'image grossie passe en bicubique.
  vec3 sampleArt(vec2 uv, vec2 dx, vec2 dy) {
    vec2 size = vec2(textureSize(uArt, 0));
    vec3 plain = textureGrad(uArt, uv, dx * 0.6, dy * 0.6).rgb;
    float texelsPerPixel = max(length(dx * size), length(dy * size));
    float magnified = 1.0 - smoothstep(0.7, 1.0, texelsPerPixel);
    if (magnified <= 0.0) return plain;
    return mix(plain, cubicArt(uv, size), magnified);
  }

  // Part du pixel dans l'intervalle [0, 1] : 1 dedans, 0 dehors, bord lissé sur un pixel.
  float coverage(float v) {
    float pixel = max(length(vec2(dFdx(v), dFdy(v))), 1e-6);
    return clamp(min(v, 1.0 - v) / pixel + 0.5, 0.0, 1.0);
  }

  void main() {
    vec2 dx = dFdx(vUv);
    vec2 dy = dFdy(vUv);
    vec3 art;
    if (uPasse <= 0.0) {
      art = sampleArt(vUv, dx, dy);
    } else {
      // Contour blanc : marge de papier égale en cm, œuvre recadrée pour remplir l'intérieur.
      vec2 inner = (vUv - uMargin) / (1.0 - 2.0 * uMargin);
      vec2 toCrop = uCover / (1.0 - 2.0 * uMargin);
      vec2 cropUv = clamp((inner - 0.5) * uCover + 0.5, 0.0, 1.0);
      float inside = coverage(inner.x) * coverage(inner.y);
      vec3 framed = mix(uPaperWhite, sampleArt(cropUv, dx * toCrop, dy * toCrop), inside);
      art = uPasse >= 1.0 ? framed : mix(sampleArt(vUv, dx, dy), framed, uPasse);
    }
    vec3 base = mix(uBorder, art, vArt);

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
      // Bords de la photo lissés sur un pixel ; le haut se fond dans le mur.
      vec2 edge = clamp(min(ruv, 1.0 - ruv) / max(fwidth(ruv), vec2(1e-6)) + 0.5, 0.0, 1.0);
      float feather = 1.0 - smoothstep(uRoomRect.w - uFeather, uRoomRect.w, vXY.y);
      col = mix(col, texture2D(uRoom, vec2(ruv.x, 1.0 - ruv.y)).rgb, uRoomMix * edge.x * edge.y * feather);
    }
    // Pénombres : jamais plus fines qu'un pixel, même vues de loin.
    float hull = hullDistance(vXY);
    float penumbra = max(uPenumbra, fwidth(hull));
    float key = uKey * (1.0 - smoothstep(-penumbra, penumbra, hull));
    float box = boxDistance(vXY, uAo.xy, uAo.zw);
    float ao = uAoAmt * (1.0 - smoothstep(0.0, max(uAoRadius, fwidth(box)), box));
    gl_FragColor = vec4(col * (1.0 - key) * (1.0 - ao), 1.0);
    #include <colorspace_fragment>
  }
`

const FRAME_VERTEX = /* glsl */ `
  attribute float shade;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vShade;
  void main() {
    vUv = uv;
    vShade = shade;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

// Cadres : diffus (lumière principale et ambiance haut/bas), brillance et reflet d'une pièce
// simplifiée (plafond clair, sol chaud, fenêtre du côté de la lumière), calculés à la volée.
const FRAME_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTile;
  uniform float uWood;
  uniform vec3 uTint;
  uniform float uRelief;
  uniform float uRough;
  uniform vec3 uLight;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vShade;

  float height(vec2 st) {
    return dot(texture2D(uMap, st).rgb, vec3(0.3333));
  }

  vec3 roomLight(vec3 d) {
    vec3 room = mix(vec3(0.30, 0.25, 0.20), vec3(0.78, 0.77, 0.75), smoothstep(0.3, 0.72, d.y * 0.5 + 0.5));
    return room + vec3(1.1) * smoothstep(0.55, 0.97, dot(d, uLight));
  }

  void main() {
    vec2 st = vUv * uTile;
    vec2 step1 = 1.5 / vec2(textureSize(uMap, 0));
    vec3 wood = texture2D(uMap, st).rgb;
    float h = dot(wood, vec3(0.3333));
    vec3 albedo = mix(uTint, wood, uWood);

    vec3 N = normalize(vNormalW);
    vec3 T = normalize(abs(N.y) < 0.95 ? cross(vec3(0.0, 1.0, 0.0), N) : cross(N, vec3(1.0, 0.0, 0.0)));
    vec3 B = cross(N, T);
    N = normalize(N + uRelief * ((h - height(st + vec2(step1.x, 0.0))) * T + (h - height(st + vec2(0.0, step1.y))) * B));

    vec3 V = normalize(cameraPosition - vWorld);
    float ndl = max(dot(N, uLight), 0.0);
    vec3 ambient = mix(vec3(0.27, 0.24, 0.21), vec3(0.70), N.y * 0.5 + 0.5);
    vec3 color = albedo * (0.64 * ndl + ambient);

    float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float shine = mix(70.0, 12.0, uRough);
    float glint = pow(max(dot(N, normalize(uLight + V)), 0.0), shine) * (shine + 8.0) * 0.0035;
    color += roomLight(reflect(-V, N)) * fresnel * mix(0.8, 0.5, uRough) + vec3(glint * ndl);

    gl_FragColor = vec4(color * vShade, uOpacity);
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
    float window = (1.0 - smoothstep(0.75, 1.0, abs(q.x))) * (1.0 - smoothstep(0.75, 1.0, abs(q.y))) * smoothstep(0.02, 0.08, R.z);
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

const round = (v) => Math.round(v * 1000) / 1000
const FADE_MS = 350

export function createScene(THREE, { canvas, artImage, weave, room }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  const anisotropy = renderer.capabilities.getMaxAnisotropy()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 5000)
  const light = unit(room.light)

  const reliefTexture = (pixels) => {
    const t = new THREE.DataTexture(new Uint8Array(pixels.buffer), RELIEF_SIZE, RELIEF_SIZE, THREE.RGBAFormat)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.anisotropy = anisotropy
    t.needsUpdate = true
    return t
  }

  // Images à l'endroit : jamais retournées à l'envoi, ce sont les coordonnées qui s'adaptent.
  const imageTexture = (image) => {
    const t = new THREE.Texture(image)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    t.anisotropy = anisotropy
    t.needsUpdate = true
    return t
  }

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
    uArt: { value: imageTexture(artImage) },
    uWeave: { value: reliefTexture(weave) },
    uPaperTex: { value: null }, // reçu du worker juste après la trame (setPaperRelief)
    uWeaveScale: { value: 1 / WEAVE_TILE_CM },
    uPaperScale: { value: 1 / PAPER_TILE_CM },
    uBorder: { value: new THREE.Color(borderOf('blanche').color) },
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
  const group = new THREE.Group()
  group.rotation.order = 'YXZ'
  const artMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({ uniforms: artUniforms, vertexShader: ART_VERTEX, fragmentShader: ART_FRAGMENT }),
  )
  group.add(artMesh)
  scene.add(group)

  // ---- Cadre (toujours le même matériau : un seul programme, compilé dès le départ) ----
  const frameUniforms = {
    uMap: { value: null },
    uTile: { value: new THREE.Vector2(1 / WOOD_TILE_CM[0], 1 / WOOD_TILE_CM[1]) },
    uWood: { value: 0 },
    uTint: { value: new THREE.Color() },
    uRelief: { value: 0 },
    uRough: { value: 0.6 },
    uLight: { value: new THREE.Vector3(...light) },
    uOpacity: { value: 1 },
  }
  const frameMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({
      uniforms: frameUniforms, vertexShader: FRAME_VERTEX, fragmentShader: FRAME_FRAGMENT, transparent: true,
    }),
  )
  frameMesh.visible = false
  frameMesh.renderOrder = 1
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
  glass.renderOrder = 2
  group.add(glass)

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
    if (extra) for (const name of extra) g.setAttribute(name, new THREE.BufferAttribute(data[name], name === 'fab' ? 2 : 1))
    g.setIndex(new THREE.BufferAttribute(data.index, 1))
    mesh.geometry.dispose()
    mesh.geometry = g
  }

  const borderColor = new THREE.Color()
  let shownFrame = 'noir' // dernier cadre choisi : il reste dessiné pendant qu'il s'efface

  function updatePainting(p, product, now) {
    group.position.set(p.x, p.y, p.z)
    group.rotation.set(p.pitch, p.yaw, 0)

    // La bordure de la toile reste en place pendant tout l'affinage (la tranche d'une toile
    // pliée rétrécit avec l'épaisseur) ; la feuille ne devient du papier nu qu'à l'arrivée.
    const border = p.paper >= 0.999 ? 'papier' : product.border
    const key = [p.width, p.height, p.depth].map(round).join('x') + border
    if (key !== artKey) {
      // Coins : la toile tourne autour du châssis, la feuille de papier a des coins vifs.
      const corner = 0.3 - 0.28 * p.paper
      setGeometry(artMesh, artBox({ width: p.width, height: p.height, depth: p.depth, border, corner }), ['fab', 'art'])
      artKey = key
    }
    artMesh.position.z = p.artZ

    borderColor.set(borderOf(product.border).color || PAPER_WHITE)
    artUniforms.uBorder.value.copy(borderColor).lerp(artUniforms.uPaperWhite.value, p.paper)
    // Tant que le papier n'est pas arrivé du worker, le poster garde la trame sans son relief.
    artUniforms.uPaper.value = artUniforms.uPaperTex.value ? p.paper : 0
    artUniforms.uPasse.value = p.passe
    const m = PASSE_RATIO * Math.min(p.width, p.height)
    artUniforms.uMargin.value.set(m / p.width, m / p.height)
    // Recadrage de l'œuvre dans l'intérieur du contour (remplir sans déformer).
    const innerRatio = (p.width - 2 * m) / (p.height - 2 * m)
    const artRatio = (artImage.naturalWidth || artImage.width) / (artImage.naturalHeight || artImage.height)
    artUniforms.uCover.value.set(
      innerRatio < artRatio ? innerRatio / artRatio : 1,
      innerRatio < artRatio ? 1 : artRatio / innerRatio,
    )

    frameMesh.visible = p.framed > 0.001
    glass.visible = frameMesh.visible && p.paper > 0.01
    if (!frameMesh.visible) return
    // p.frame glisse de la caisse américaine à la baguette sous verre avec `paper`.
    const f = p.frame
    const kind = p.paper > 0.5 ? 'poster' : 'toile'
    const fk = [p.width, p.height, f.gap, f.face, f.depth, f.floor].map(round).join('x') + kind
    if (fk !== frameKey) {
      const opening = frameOpening(p.width, p.height, f)
      setGeometry(frameMesh, frameRing({ ...opening, profile: frameProfile(kind, f) }), ['shade'])
      glass.scale.set(2 * opening.hw, 2 * opening.hh, 1)
      glass.position.set(0, 0, f.floor + 0.1)
      frameKey = fk
    }
    if (hasFrame(product)) shownFrame = product.frame
    const look = FRAME_LOOK[shownFrame]
    frameUniforms.uTint.value.set(frameOf(shownFrame).color)
    frameUniforms.uWood.value = look.wood * woodFade(now)
    frameUniforms.uRelief.value = look.relief * woodFade(now)
    frameUniforms.uRough.value = look.rough
    frameUniforms.uOpacity.value = p.framed
    glassUniforms.uOpacity.value = p.paper * p.framed
    glassUniforms.uNormal.value.set(0, 0, 1).applyEuler(group.rotation)
    glassUniforms.uWin.value.set(p.x - 28, p.y + 36, p.z + 240)
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

  /* ---- Bois des cadres : chargé au repos de la page. Tant qu'il n'est pas là, le cadre
     prend sa teinte unie, puis le bois apparaît en fondu. ---- */
  let woodShownAt = -Infinity, woodState = 'none'
  function loadWood(url) {
    if (woodState !== 'none') return
    woodState = 'loading'
    decodeImage(url).then((image) => {
      const texture = imageTexture(image)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      renderer.initTexture(texture)
      frameUniforms.uMap.value = texture
      woodState = 'ready'
      woodShownAt = performance.now()
      if (onNeedsRender) onNeedsRender()
    }, () => { woodState = 'error' })
  }
  const woodFade = (now) => (woodState === 'ready' ? Math.min(1, (now - woodShownAt) / FADE_MS) : 0)

  /* ---- Pièce : chargée au premier signe d'intérêt (la page appelle prefetchRoom dès qu'on
     touche les tailles), sinon au premier recul. L'image est décodée puis envoyée tout de
     suite à la carte graphique, pour ne pas le faire en pleine animation. ---- */
  let roomState = 'none', roomShownAt = 0
  function prefetchRoom() {
    if (roomState !== 'none') return
    roomState = 'loading'
    decodeImage(room.image).then((image) => {
      const texture = imageTexture(image)
      renderer.initTexture(texture)
      wallUniforms.uRoom.value = texture
      roomState = 'ready'
      roomShownAt = performance.now()
      if (onNeedsRender) onNeedsRender()
    }, () => { roomState = 'error' })
  }
  const roomFade = (now) => (roomState === 'ready' ? Math.min(1, (now - roomShownAt) / FADE_MS) : 0)

  let onNeedsRender = null
  let width = 1, height = 1

  // density : pixels du tampon par pixel CSS (voir quality.js).
  function resize(w, h, density) {
    width = Math.max(1, w)
    height = Math.max(1, h)
    renderer.setPixelRatio(density)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
  }

  // Tout vient de la vue du directeur : caméra, pose, pièce et choix en cours (view.product).
  function render(view, now) {
    camera.fov = (view.camera.fovY * 180) / Math.PI
    camera.position.set(...view.camera.position)
    camera.lookAt(...view.camera.target)
    camera.updateProjectionMatrix()
    updatePainting(view.painting, view.product, now)
    updateShadow(view.painting)
    if (view.room > 0) prefetchRoom()
    wallUniforms.uRoomMix.value = view.room * roomFade(now)
    renderer.render(scene, camera)
  }

  // Envoie l'œuvre au GPU et compile tous les programmes (œuvre, mur, cadre, verre) hors du
  // fil de la page, pour que la première image n'ait plus rien à attendre.
  function prepare() {
    renderer.initTexture(artUniforms.uArt.value)
    return renderer.compileAsync(scene, camera)
  }

  // Le papier arrive du worker après la première image : envoyé tout de suite au GPU.
  function setPaperRelief(pixels) {
    const texture = reliefTexture(pixels)
    renderer.initTexture(texture)
    artUniforms.uPaperTex.value = texture
    if (onNeedsRender) onNeedsRender()
  }

  /* Remplace l'œuvre par une version plus détaillée. L'envoi au GPU prend quelques dizaines
     de ms : la page ne l'appelle que quand tout est immobile. */
  function useArtImage(image) {
    const texture = imageTexture(image)
    renderer.initTexture(texture)
    artUniforms.uArt.value.dispose()
    artUniforms.uArt.value = texture
    if (artImage.close) artImage.close()
    artImage = image
  }

  function gpuName() {
    try {
      const gl = renderer.getContext()
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || 'GPU inconnu'
    } catch {
      return 'GPU inconnu'
    }
  }

  // Projette un point du mur ou du tableau en pixels CSS dans le canvas.
  const tmp = new THREE.Vector3()
  function toScreen(point) {
    tmp.set(...point).project(camera)
    return { x: ((tmp.x + 1) / 2) * width, y: ((1 - tmp.y) / 2) * height, visible: tmp.z < 1 }
  }

  /* Fidélité : rend la vue de face, lit les pixels de la façade et les compare, zone par
     zone, à l'image à plat ramenée à la même taille (calcul dans fidelity.js). La vue doit
     être de face, sur une toile dont la façade montre toute l'image (pas la bordure pliée). */
  function measureFidelity(view) {
    render(view, performance.now())
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
    const nw = artImage.naturalWidth || artImage.width, nh = artImage.naturalHeight || artImage.height
    const fw = right - left, fh = top - bottom
    ctx.drawImage(artImage, ((x0 - left) / fw) * nw, ((top - y1) / fh) * nh, (w / fw) * nw, (h / fh) * nh, 0, 0, w, h)
    const source = ctx.getImageData(0, 0, w, h).data
    return { ...compareImages(source, rendered, w, h), pixels: `${w}×${h}` }
  }

  return {
    resize,
    render,
    toScreen,
    measureFidelity,
    prepare,
    setPaperRelief,
    loadWood,
    useArtImage,
    prefetchRoom,
    gpuName,
    density: () => renderer.getPixelRatio(),
    samples: () => renderer.getContext().getParameter(renderer.getContext().SAMPLES),
    roomReady: () => roomState === 'ready',
    isFading: (now) => (roomState === 'ready' && now - roomShownAt < FADE_MS) || (woodState === 'ready' && now - woodShownAt < FADE_MS),
    set onNeedsRender(fn) { onNeedsRender = fn },
  }
}
