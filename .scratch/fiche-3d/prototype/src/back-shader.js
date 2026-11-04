/*
 * Dos de la toile, peint par le shader en cm, d'après les photos de Walid (une 75 × 100).
 * Rien à télécharger, et le même code sert tous les formats : largeurs et agrafes viennent de
 * geometry.js (backLayout, stapleRows). Du bord vers le centre : l'image (ou la couleur de tranche)
 * qui revient de quelques mm, un fin trait noir, la toile blanche repliée et ses agrafes, le pin
 * pâle du châssis, et au fond la toile brute, blanc cassé. Aux coins, la bande verticale passe
 * sur la bande horizontale. Aucune marque de l'imprimeur.
 */

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
  uniform float uCornerStapleInset; // distance au bord haut ou bas des agrafes de coin
  uniform vec3 uLight;
  uniform vec3 uLightLocal;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;

  const float STAPLE_HALF = 1.0; // une agrafe fait 2 cm
  const float WIRE = 0.055; // demi-épaisseur du fil
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

  vec2 turned(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * p.x + s * p.y, c * p.y - s * p.x);
  }

  // Pin : sa propre teinte, avec le fil du chêne des cadres. q.y suit le fil.
  vec3 pine(vec2 q) {
    float fibre = dot(texture2D(uMap, q * uTile).rgb, vec3(1.0)) / OAK_MEAN;
    return uPineColor * (1.0 + uPine * (fibre - 1.0));
  }

  // Bord à peine irrégulier : écart en cm le long d'un bord ; la phase distingue les bords.
  float wavy(float along, float phase, float amount) {
    return amount * (sin(along * 1.1 + phase) + 0.6 * sin(along * 2.9 + phase * 0.7));
  }

  // q : position depuis le milieu de l'agrafe, x le long du fil. Le tissu se creuse autour,
  // le fil pose une ombre courte et brille sur son arête.
  vec3 staple(vec3 color, vec2 q) {
    vec2 spread = q / vec2(STAPLE_HALF + 0.8, 0.65);
    color *= 1.0 - 0.09 * exp(-dot(spread, spread));
    float wire = length(vec2(max(abs(q.x) - STAPLE_HALF, 0.0), q.y));
    color *= 1.0 - 0.4 * exp(-pow(wire / 0.13, 2.0));
    float crest = q.y / max(0.03, pixel * 0.7);
    vec3 metal = mix(vec3(0.3, 0.31, 0.33), vec3(0.82, 0.83, 0.85), exp(-crest * crest));
    return mix(color, metal, inside(WIRE - wire));
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
    float at = row.x + k * row.y + (jitter - 0.5) * 1.4;
    vec2 q = vec2(along - at, e - uBand * (0.52 + 0.1 * (hash(vec2(side, k)) - 0.5)));
    cloth = staple(cloth, turned(q, (jitter - 0.5) * 0.1));

    // Deux agrafes côte à côte, parallèles au bord vertical, dans la bande qui passe dessus.
    float sway = hash(sign(p) + 3.0) - 0.5;
    vec2 pair = vec2(c.y - uCornerStapleInset, c.x);
    cloth = staple(cloth, turned(pair - vec2(0.0, uBand * 0.36), sway * 0.06));
    cloth = staple(cloth, turned(pair - vec2(sway * 0.5, uBand * 0.6), sway * 0.08));

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
