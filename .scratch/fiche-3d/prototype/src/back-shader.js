/*
 * Dos de la toile, peint par le shader en cm, d'après les photos de Walid (une 75 × 100).
 * Rien à télécharger, et le même code sert tous les formats : largeurs et agrafes viennent de
 * geometry.js (backLayout, stapleRows). Du bord vers le centre : l'image (ou la couleur de tranche)
 * qui revient de quelques mm, un fin trait noir, la toile blanche repliée et ses agrafes, le pin
 * pâle du châssis, et au fond la toile brute, blanc cassé. Aux coins, la bande verticale passe
 * sur la bande horizontale. Les marques sont imprimées sur la bande (marks.js).
 */

import { MARK_COUNT, STAPLE_DRIFT } from './marks.js'

export const BACK_COLORS = { band: '#f1efe9', raw: '#e9e6df', pine: '#e6dccb' }

export const BACK_VERTEX = /* glsl */ `
  attribute float part;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;
  void main() {
    vLocal = position;
    vPart = part;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const BACK_FRAGMENT = /* glsl */ `
  uniform sampler2D uArt;
  uniform sampler2D uWeave;
  uniform sampler2D uMap;
  uniform float uWeaveScale;
  uniform vec2 uTile;
  uniform float uPine;
  uniform vec3 uBandColor;
  uniform vec3 uRawColor;
  uniform vec3 uPineColor;
  uniform vec3 uBorder;
  uniform float uSideArt;
  uniform vec2 uHalf;
  uniform float uBand;
  uniform float uBar;
  uniform vec3 uStaplesUpright; // rang d'agrafes des bords verticaux : premier, écart, nombre
  uniform vec3 uStaplesFlat; // et des bords horizontaux
  uniform float uStapleHalf; // demi-longueur d'une agrafe
  uniform float uCornerStapleInset; // distance au bord haut ou bas de l'agrafe de coin
  uniform float uMarkedCornerInset; // de même dans le coin du code, plus haut pour lui laisser la place
  uniform vec2 uRowClear; // au centre des bandes du haut et du bas, les marques écartent les agrafes
  uniform sampler2D uMarks; // planche des marques
  uniform vec4 uMarkBoxes[${MARK_COUNT}]; // boîtes vues de dos, en cm : x, y, largeur, hauteur
  uniform vec4 uMarkAreas[${MARK_COUNT}]; // zones de la planche, de 0 à 1
  uniform vec3 uLight;
  uniform vec3 uLightLocal;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;

  const float WIRE = 0.055; // demi-épaisseur du fil, en part de la demi-longueur de l'agrafe
  const vec3 STEEL = vec3(0.13, 0.135, 0.15);
  const vec3 STEEL_EDGE = vec3(0.04, 0.042, 0.05);
  const int PREMIUM = ${MARK_COUNT - 1}; // la dernière marque, seule tournée d'un quart de tour
  const float DRIFT = ${STAPLE_DRIFT.toFixed(2)}; // écart d'une agrafe posée à la main, de part et d'autre
  const float SHOULDER = 0.325; // arrondi de la bande du dessus, près du coin, en part de la bande
  const vec2 FOLD_TIP = vec2(0.25, 0.3625); // tout petit rabat replié de la pointe, de même
  const float OAK_MEAN = 1.34; // somme moyenne des trois canaux de l'image de chêne

  float pixel; // taille d'un pixel à l'écran, en cm

  // 1 là où v > 0, 0 ailleurs, bord lissé sur un pixel.
  float inside(float v) {
    return clamp(v / pixel + 0.5, 0.0, 1.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Pin : sa propre teinte, avec le fil du chêne des cadres. q.y suit le fil.
  vec3 pine(vec2 q) {
    float fibre = dot(texture2D(uMap, q * uTile).rgb, vec3(1.0)) / OAK_MEAN;
    return uPineColor * (1.0 + uPine * (fibre - 1.0));
  }

  // Encre d'une marque, à multiplier au tissu : la planche a un fond blanc. at : point vu de dos.
  vec3 ink(vec2 at, vec4 box, vec4 area, bool quarterTurn) {
    vec2 q = (at - box.xy) / box.zw;
    vec2 within = step(vec2(0.0), q) * step(q, vec2(1.0));
    vec2 uv = quarterTurn ? q.yx : vec2(q.x, 1.0 - q.y);
    return mix(vec3(1.0), texture2D(uMarks, area.xy + uv * area.zw).rgb, within.x * within.y);
  }

  // Bord à peine irrégulier : écart en cm le long d'un bord ; la phase distingue les bords.
  float wavy(float along, float phase, float amount) {
    return amount * (sin(along * 1.1 + phase) + 0.6 * sin(along * 2.9 + phase * 0.7));
  }

  // Point exprimé le long du fil (x) et en travers (y).
  vec2 onWire(vec2 d, vec2 axis) {
    return vec2(dot(d, axis), dot(d, vec2(-axis.y, axis.x)));
  }

  float wireDistance(vec2 q) {
    return length(vec2(max(abs(q.x) - uStapleHalf, 0.0), q.y));
  }

  /* Agrafe : center, son milieu ; axis, la direction du fil. L'acier sombre et l'ombre de contact
     la détachent du tissu clair. Le fil garde toujours plus d'un pixel de large, même vu de biais
     pendant le tour ; son bord se lisse sur un pixel mesuré en travers, pour rester net. Assez
     large, il montre un reflet fin sur sa longueur ; trop fin pour cela, un éclat plus clair
     glisse le long du trait quand le tableau tourne, et son ombre s'allège. */
  vec3 staple(vec3 color, vec2 p, vec2 center, vec2 axis, float present) {
    vec2 d = p - center;
    vec2 q = onWire(d, axis);
    // Taille d'un pixel en travers du fil. Mesurée sur p, continu : d et q sautent là où le
    // milieu de l'agrafe la plus proche change, au centre des bandes.
    vec2 crossing = vec2(-axis.y, axis.x);
    float across = max(abs(dot(dFdx(p), crossing)) + abs(dot(dFdy(p), crossing)), 1e-4);
    float wire = max(WIRE * uStapleHalf, 0.75 * across);
    float roomy = smoothstep(2.5, 4.0, 2.0 * wire / across); // le fil est assez large pour ses détails

    vec2 spread = q / (uStapleHalf * vec2(1.8, 0.65));
    vec3 cloth = color * (1.0 - 0.09 * exp(-dot(spread, spread))); // le tissu se creuse un peu autour

    vec2 light = normalize(uLightLocal.xy);
    vec2 towardsLight = light * max(1.2 * wire, across);
    float contact = wireDistance(onWire(d + towardsLight, axis));
    float shadow = clamp((1.25 * wire - contact) / max(across, 0.7 * wire) + 0.5, 0.0, 1.0);
    cloth *= 1.0 - mix(0.25, 0.5, roomy) * shadow;

    float rise = q.y / wire; // de -1 à 1 en travers du fil
    vec3 steel = mix(STEEL, STEEL_EDGE, rise * rise);
    float glint = 1.0 - smoothstep(0.12, 0.3, abs(rise - 0.25));
    steel = mix(steel, vec3(0.92), glint * roomy);
    float sheen = (q.x / uStapleHalf - 0.6 * dot(axis, light)) / 0.2;
    steel = mix(steel, vec3(0.5, 0.51, 0.54), 0.85 * exp(-sheen * sheen) * (1.0 - roomy));

    float cover = clamp((wire - wireDistance(q)) / across + 0.5, 0.0, 1.0);
    return mix(color, mix(cloth, steel, cover), present);
  }

  vec3 ringColor(vec2 p, vec2 c) {
    bool upright = c.x < c.y; // bande le long d'un bord vertical
    float e = min(c.x, c.y);
    float along = upright ? p.y : p.x;
    float side = upright ? (p.x > 0.0 ? 0.0 : 1.0) : (p.y > 0.0 ? 2.0 : 3.0);

    // Pin, avec son onglet à 45° au coin de l'ouverture.
    vec3 color = pine(upright ? p : p.yx);
    color *= 1.0 - 0.5 * inside(0.03 - abs(c.x - c.y));

    // Coin : la bande verticale passe par-dessus et court tout droit jusqu'au bord haut ou bas,
    // son bord s'arrondit à l'approche du coin. La bande horizontale s'arrête contre elle.
    float cutUpright = uBand + wavy(p.y, sign(p.x) * 2.3, 0.03);
    float cutFlat = uBand + wavy(p.x, sign(p.y) * 1.2, 0.03);
    float shoulder = SHOULDER * uBand;
    vec2 rounded = max(vec2(shoulder - (cutUpright - c.x), shoulder - c.y), 0.0);
    float over = shoulder - length(rounded); // > 0 dans la bande du dessus
    float band = max(inside(over), inside(cutFlat - c.y));

    // Les bandes posent une ombre étroite sur le pin.
    color *= 1.0 - 0.22 * exp(-max(min(c.x - cutUpright, c.y - cutFlat), 0.0) / 0.25);

    // Toile repliée : blanc mat, trame fine, ondulations à peine marquées.
    float ripple = 0.6 * sin(p.y * 0.55 + p.x * 0.4) + 0.4 * sin(p.x * 1.35 - p.y * 0.9);
    float grain = texture2D(uWeave, p * uWeaveScale).r;
    vec3 cloth = uBandColor * (1.0 + 0.007 * ripple) * (0.96 + 0.06 * grain);

    // La bande du dessus fait une légère ombre sur l'autre, et son bord attrape la lumière.
    float onTop = inside(over);
    cloth *= 1.0 - 0.16 * exp(-max(-over, 0.0) / 0.4) * (1.0 - onTop);
    cloth *= 1.0 + 0.03 * exp(-max(over, 0.0) / 0.1) * onTop;

    // Ombre discrète du petit rabat de la pointe, peint plus bas.
    vec2 tip = FOLD_TIP * uBand;
    float fold = (1.0 - dot(c, 1.0 / tip)) / length(1.0 / tip); // > 0 dans le rabat
    float onFold = inside(fold);
    cloth *= 1.0 - 0.14 * exp(-max(-fold, 0.0) / 0.22) * (1.0 - onFold);

    // Agrafes le long de la bande, posées à la main.
    vec3 row = upright ? uStaplesUpright : uStaplesFlat;
    float k = clamp(floor((along - row.x) / row.y + 0.5), 0.0, row.z - 1.0);
    float jitter = hash(vec2(k, side));
    float at = row.x + k * row.y + (jitter - 0.5) * 2.0 * DRIFT;
    float fromEdge = uBand * (0.52 + 0.1 * (hash(vec2(side, k)) - 0.5));
    float tilt = (jitter - 0.5) * 0.1;
    vec2 center = upright ? vec2(sign(p.x) * (uHalf.x - fromEdge), at) : vec2(at, sign(p.y) * (uHalf.y - fromEdge));
    vec2 axis = upright ? vec2(sin(tilt), cos(tilt)) : vec2(cos(tilt), sin(tilt));
    // Au centre des bandes du haut et du bas, les marques prennent la place de l'agrafe.
    float clear = p.y > 0.0 ? uRowClear.x : uRowClear.y;
    cloth = staple(cloth, p, center, axis, upright || abs(at) >= clear ? 1.0 : 0.0);

    // Une seule agrafe par coin, parallèle au bord vertical, dans la bande qui passe dessus.
    // Vu de dos, le coin bas droit est à x < 0 : c'est celui du code.
    float inset = p.x < 0.0 && p.y < 0.0 ? uMarkedCornerInset : uCornerStapleInset;
    float sway = (hash(sign(p) + 3.0) - 0.5) * 0.08;
    vec2 corner = sign(p) * (uHalf - vec2(uBand * 0.5, inset));
    cloth = staple(cloth, p, corner, vec2(sin(sway), cos(sway)), 1.0);

    // Marques imprimées sur la toile.
    vec2 seen = vec2(-p.x, p.y);
    for (int i = 0; i < ${MARK_COUNT}; i++) cloth *= ink(seen, uMarkBoxes[i], uMarkAreas[i], i == PREMIUM);

    color = mix(color, cloth, band);

    // Au bord, l'image revient sur le dos, sur quelques mm irréguliers, soulignée d'un trait.
    float reach = 0.36 + wavy(along * 0.75, side * 1.9, 0.04);
    color = mix(color, vec3(0.02), 0.8 * inside(0.024 - abs(e - reach - 0.024)));
    vec2 uv = vec2(p.x / (2.0 * uHalf.x) + 0.5, 0.5 - p.y / (2.0 * uHalf.y));
    vec3 returned = mix(uBorder, textureLod(uArt, uv, 1.5).rgb, uSideArt);
    color = mix(color, returned, inside(reach - e));

    // Le rabat se replie par-dessus tout, jusqu'à la pointe du coin.
    return mix(color, uBandColor * 1.02, onFold);
  }

  // Toile brute : blanc cassé, à peine plus grise que la bande, trame très fine, dégradé doux.
  vec3 rawColor(vec2 p) {
    float grain = texture2D(uWeave, p * uWeaveScale).r;
    float slope = 0.035 * p.y / uHalf.y - 0.025 * p.x / uHalf.x;
    return uRawColor * (0.96 + 0.07 * grain) * (1.0 + slope);
  }

  void main() {
    vec2 p = vLocal.xy;
    pixel = max(max(fwidth(p.x), fwidth(p.y)), 1e-4);
    vec2 c = uHalf - abs(p);
    float depth = vLocal.z;

    vec3 albedo;
    float shelter = 1.0; // part de lumière ambiante qui arrive au fond
    if (vPart < 0.5) {
      albedo = ringColor(p, c);
    } else if (vPart < 1.5) {
      bool upright = abs(c.x - uBar) < abs(c.y - uBar);
      albedo = pine(vec2(depth, upright ? p.y : p.x));
      shelter = 0.72;
    } else {
      albedo = rawColor(p);
      shelter = 1.0 - 0.1 * exp(-(min(c.x, c.y) - uBar) / 2.0);
    }

    // Le creux ne reçoit la lumière que par l'ouverture du châssis : un point y voit-il la
    // lumière ? Quand elle vient du côté de la façade, la toile la coupe tout entière.
    float direct = max(dot(normalize(vNormalW), uLight), 0.0);
    if (vPart > 0.5) {
      float toOpening = max(-uLightLocal.z, 0.001);
      vec2 exit = p + uLightLocal.xy * (depth / toOpening);
      vec2 open = uHalf - uBar - abs(exit);
      float lit = smoothstep(-0.5, 0.5, min(open.x, open.y)) * step(uLightLocal.z, 0.0);
      direct *= vPart > 1.5 ? mix(0.72, 1.0, lit) : lit; // la toile claire adoucit son ombre
    }
    float k = (uAmbient * shelter + uDiffuse * direct) * uNorm;
    gl_FragColor = vec4(albedo * min(k, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`
