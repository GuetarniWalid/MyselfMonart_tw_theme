/*
 * Dos de la toile, peint par le shader en cm, d'après les photos de Walid (une 75 × 100).
 * Rien à télécharger, et le même code sert tous les formats : les agrafes se répartissent
 * selon la taille du tableau, les largeurs viennent de BACK (geometry.js). Du bord vers le centre :
 * l'image (ou la couleur de tranche) qui revient de quelques mm, un fin trait noir, la toile
 * blanche repliée avec ses agrafes et ses plis de coin, le pin du châssis, et au fond la toile
 * brute, un peu translucide. Aucune marque de l'imprimeur.
 */

export const BACK_COLORS = { band: '#f1efe9', raw: '#dcd7ce', pine: '#e4d0a6' }

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
  uniform vec3 uLight;
  uniform vec3 uLightLocal;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uNorm;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying float vPart;

  const float STAPLE_EVERY = 11.0; // cm
  const float STAPLE_HALF = 1.0; // une agrafe fait 2 cm
  const float WIRE = 0.055; // demi-épaisseur du fil
  const float FLAP_ROUND = 0.8;

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
    float fibre = dot(texture2D(uMap, q * uTile).rgb, vec3(1.0)) / 1.18;
    return uPineColor * (1.0 + 1.5 * uPine * (fibre - 1.0));
  }

  // q : position depuis le milieu de l'agrafe, x le long du fil. Le tissu se creuse autour,
  // le fil pose une ombre courte et brille sur son arête.
  vec3 staple(vec3 color, vec2 q, float half_) {
    vec2 spread = q / vec2(half_ + 0.7, 0.55);
    color *= 1.0 - 0.07 * exp(-dot(spread, spread));
    float wire = length(vec2(max(abs(q.x) - half_, 0.0), q.y));
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

    // Pli de coin : a et b comptent depuis les deux bords ; la bande du bord b passe sur
    // l'autre et finit par un rabat au bord arrondi. Le sens alterne d'un coin à l'autre.
    bool swapped = p.x * p.y > 0.0;
    float a = swapped ? c.y : c.x;
    float b = swapped ? c.x : c.y;
    float cut = uBand + 0.035 * sin(along * 1.1 + side * 2.3) + 0.02 * sin(along * 2.9 + side);
    float slant = a - 1.3 * uBand * pow(clamp(b / uBand, 0.0, 1.0), 0.85);
    vec2 rounded = max(vec2(FLAP_ROUND - slant, FLAP_ROUND - (cut - b)), 0.0);
    float top = FLAP_ROUND - length(rounded); // > 0 dans la bande du dessus
    float band = max(inside(top), inside(cut - a));

    // La bande pose une ombre étroite sur le pin.
    color *= 1.0 - 0.3 * exp(-max(e - cut, 0.0) / 0.25);

    // Toile repliée : blanc mat, trame fine, ondulations douces.
    float ripple = 0.6 * sin(along * 0.55 + e * 1.2 + side * 1.7) + 0.4 * sin(along * 1.35 - e * 2.1 + side * 0.7);
    float grain = texture2D(uWeave, p * uWeaveScale).r;
    vec3 cloth = uBandColor * (1.0 + 0.016 * ripple) * (0.955 + 0.07 * grain);
    cloth *= 1.0 - 0.3 * exp(-max(-top, 0.0) / 0.3) * (1.0 - inside(top)); // ombre du rabat
    cloth *= 1.0 + 0.05 * exp(-max(top, 0.0) / 0.12) * inside(top); // sa tranche attrape la lumière

    // Agrafes le long de la bande, loin des coins, posées à la main.
    float length_ = upright ? 2.0 * uHalf.y : 2.0 * uHalf.x;
    float usable = length_ - 3.2 * uBand;
    float count = max(1.0, floor(usable / STAPLE_EVERY + 0.5));
    float gap = usable / count;
    float k = clamp(floor(along / gap + count * 0.5), 0.0, count - 1.0);
    float jitter = hash(vec2(k, side));
    float at = (k + 0.5 - count * 0.5) * gap + (jitter - 0.5) * 1.4;
    vec2 q = vec2(along - at, e - uBand * (0.52 + 0.1 * (hash(vec2(side, k)) - 0.5)));
    cloth = staple(cloth, turned(q, (jitter - 0.5) * 0.1), STAPLE_HALF);

    // Deux agrafes rapprochées tiennent le rabat, parallèles entre elles.
    vec2 flap = turned(vec2(a, b) - uBand * vec2(1.06, 0.6), 0.66);
    cloth = staple(cloth, flap - vec2(0.0, 0.42), STAPLE_HALF * 0.8);
    cloth = staple(cloth, flap + vec2(0.0, 0.42), STAPLE_HALF * 0.8);

    color = mix(color, cloth, band);

    // Au bord, l'image revient sur le dos, sur quelques mm irréguliers, soulignée d'un trait.
    float reach = 0.36 + 0.04 * sin(along * 0.8 + side * 1.9) + 0.022 * sin(along * 2.3 + side * 4.2);
    color = mix(color, vec3(0.02), 0.8 * inside(0.024 - abs(e - reach - 0.024)));
    vec2 uv = vec2(p.x / (2.0 * uHalf.x) + 0.5, 0.5 - p.y / (2.0 * uHalf.y));
    vec3 returned = mix(uBorder, textureLod(uArt, uv, 1.5).rgb, uSideArt);
    return mix(color, returned, inside(reach - e));
  }

  // Toile brute : blanc cassé à gris chaud, trame très fine ; l'impression se devine à travers.
  vec3 rawColor(vec2 p) {
    float grain = texture2D(uWeave, p * uWeaveScale * 1.7).r;
    vec2 uv = vec2(p.x / (2.0 * uHalf.x) + 0.5, 0.5 - p.y / (2.0 * uHalf.y));
    float tone = dot(textureLod(uArt, uv, 4.5).rgb, vec3(0.2126, 0.7152, 0.0722));
    return uRawColor * (0.95 + 0.08 * grain) * mix(1.0, 0.86 + 0.36 * sqrt(tone), 0.2);
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
      shelter = 1.0 - 0.3 * exp(-(min(c.x, c.y) - uBar) / 1.6);
    }

    // Le creux ne reçoit la lumière que par l'ouverture du châssis : un point y voit-il la
    // lumière ? Quand elle vient du côté de la façade, la toile la coupe tout entière.
    float direct = max(dot(normalize(vNormalW), uLight), 0.0);
    if (vPart > 0.5) {
      float toOpening = max(-uLightLocal.z, 0.001);
      vec2 exit = p + uLightLocal.xy * (depth / toOpening);
      vec2 open = uHalf - uBar - abs(exit);
      direct *= smoothstep(-0.25, 0.25, min(open.x, open.y)) * step(uLightLocal.z, 0.0);
    }
    float k = (uAmbient * shelter + uDiffuse * direct) * uNorm;
    gl_FragColor = vec4(albedo * min(k, 1.0), 1.0);
    #include <colorspace_fragment>
  }
`
