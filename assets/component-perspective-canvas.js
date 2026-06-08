/*
 * <perspective-canvas>
 * Rend, à la volée et en WebGL, l'image brute d'impression (media[1]) sous forme
 * de toile sur châssis vue en perspective 3/4. La tranche (bordure) et — à terme —
 * le cadre reflètent en direct la variante sélectionnée dans <painting-variant-picker>.
 *
 * L'image brute n'est JAMAIS affichée telle quelle : elle est uniquement texturée
 * sur la face avant de la toile 3D.
 *
 * Phase 1 : perspective + bordure blanche / noire (tranche unie).
 * Phase 2 (hooks marqués TODO-P2) : tranches étirée / miroir / pliée.
 * Phase 3 (hooks marqués TODO-P3) : cadre (caisse américaine).
 */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------- *
   * Réglages de scène (calibrés visuellement — ajustables)
   * ----------------------------------------------------------------------- */
  const SCENE = {
    yaw: 0.4, // rotation verticale (rad) > 0 : la tranche DROITE vient vers nous (la gauche passe derrière, occultée)
    pitch: 0.13, // bascule (rad) : révèle la tranche basse
    fovY: 0.3, // champ de vision vertical (rad) — modéré pour limiter la distorsion
    camDist: 4.6, // distance caméra
    scale: 0.52, // taille de la toile dans le carrousel desktop/iPad : posée, toile + ombre ENTIÈRES (non rognées), comme le mobile
    scaleCarouselMobile: 0.52, // carrousel sur mobile : idem (toile entière, posée). Le "zoom" est réservé au gros plan (popup)
    scalePopup: 0.56, // gros plan : un peu plus de marge pour que l'ombre (et la rotation) ne soit jamais coupée
    chassisCm: 2.0, // profondeur RÉELLE du châssis (cm). La proportion du bord = chassisCm / taille choisie (cm) -> physiquement exacte et plus fine sur les grandes toiles. Ajustable.
    ambient: 0.74,
    diffuse: 0.4,
    lightDir: [0.45, 0.55, 0.9], // lumière depuis le haut-droite (côté visible)
    weaveAmt: 0.85, // mélange vers la texture de toile (subtil mais visible)
    fabricDensity: 0.55, // tuiles de toile par unité-monde -> ~2-3px/fil (visible, pas exagéré), continu sur face + tranches
    supersample: 2.0, // 2x : le navigateur sait réduire 2x correctement (bilinéaire 2x2). MSAA 4x rendu en 2x puis moyenné -> ~16 échantillons effectifs sur le bord.
    // Ombre portée (rendue dans la scène 3D sur le "mur" derrière la toile)
    shadowColor: [0.05, 0.045, 0.04], // légèrement chaude, pas noir pur
    shadowOpacity: 0.17, // subtile
    shadowPenumbra: 0.06, // pénombre resserrée -> ombre de contact (toile proche du mur)
    shadowLocal: [-0.035, -0.045], // décalage de l'ombre dans le plan de la toile (lumière haut-droite -> ombre bas-gauche)
    shadowGap: 0.045, // recul de l'ombre derrière la toile (unités locales)
    shadowMargin: 0.22, // marge du quad d'ombre (pénombre)
    // Animation auto "mise en lumière de la tranche" au changement de bordure :
    highlightYawAdd: 0.6, // rotation yaw supplémentaire -> révèle davantage la tranche
    highlightPitchAdd: 0.32, // bascule supplémentaire -> révèle la tranche basse
    highlightZoom: 2.15, // facteur de zoom sur le coin (assez pour la tranche, garde le contexte)
    highlightCorner: [-0.7, -0.7], // point focalisé (vers le coin bas-gauche)
    highlightIn: 500, // ms : ease-in
    highlightHold: 1800, // ms : maintien sur le coin (~"quelques secondes")
    highlightOut: 650, // ms : retour à la position de base
    // Cadre (caisse américaine) — proportions p/r à la demi-petite dimension de la toile.
    frameGapRatio: 0.04, // écart toile <-> cadre (renfoncement = effet flottant)
    frameWidthRatio: 0.1, // largeur de la face visible du cadre
    frameProud: 0.018, // le cadre dépasse la toile vers l'avant (z) -> profil flottant
  };

  // Couleurs de tranche unie (bordure). Tons calés sur les swatches MyselfMonArt.
  const BORDER_COLOR = {
    white: [0.95, 0.94, 0.91],
    black: [0.27, 0.27, 0.28], // noir-mat "sur matière" (pas un aplat #000) -> laisse voir le grain
  };

  // Couleurs de cadre (caisse américaine), calées sur les swatches. Teintes plates (P3a) ;
  // le grain de bois (chêne/noyer) + satiné argent viendront en P3b.
  const FRAME_COLOR = {
    blanc: [0.93, 0.92, 0.89],
    noir: [0.23, 0.23, 0.25], // noir mat "sur matière", pas un aplat numérique trop dur
    argent: [0.62, 0.63, 0.66],
    chene: [0.74, 0.69, 0.59],
    noyer: [0.4, 0.26, 0.17],
  };
  // state.frame est déjà normalisé (sans accents/casse) par syncStateFromDOM.
  // Renvoie la couleur du cadre, ou null pour "Sans cadre".
  const frameColorFromLabel = (norm) => {
    if (!norm || norm.indexOf('sans') !== -1) return null;
    if (norm.indexOf('noir') !== -1) return FRAME_COLOR.noir;
    if (norm.indexOf('blanc') !== -1) return FRAME_COLOR.blanc;
    if (norm.indexOf('argent') !== -1) return FRAME_COLOR.argent;
    if (norm.indexOf('noyer') !== -1) return FRAME_COLOR.noyer;
    if (norm.indexOf('chene') !== -1) return FRAME_COLOR.chene;
    return null;
  };

  // Source CPU de la texture de toile (lin), IDENTIQUE pour tous les produits/variantes :
  // générée UNE seule fois et partagée par toutes les instances (carrousel + popup).
  let SHARED_FABRIC_SOURCE = null;

  // ----- BOIS RÉALISTE RGB (chêne/noyer/argent-grisé) : couleur + veines + flame grain -----
  let SHARED_WOOD_OAK = null;
  let SHARED_WOOD_WALNUT = null;
  // Bruit de valeur TILEABLE (périodes px/py distinctes -> grain anisotrope, le long de V).
  const wHash = (ix, iy, px, py) => {
    ix = ((ix % px) + px) % px;
    iy = ((iy % py) + py) % py;
    let h = (ix * 374761393 + iy * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    h = (h ^ (h >> 16)) >>> 0;
    return h / 4294967295;
  };
  const wNoise = (x, y, px, py) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const v00 = wHash(ix, iy, px, py), v10 = wHash(ix + 1, iy, px, py);
    const v01 = wHash(ix, iy + 1, px, py), v11 = wHash(ix + 1, iy + 1, px, py);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sy;
  };
  const wFbm = (x, y, cu, cv, oct) => {
    let s = 0, amp = 0.5, a = cu, b = cv;
    for (let o = 0; o < oct; o++) {
      s += amp * wNoise(x * a, y * b, a, b);
      a *= 2; b *= 2; amp *= 0.5;
    }
    return s;
  };
  /* Canvas de bois RGB tileable : "cernes" (flame grain) ondulés par turbulence + veines
     sombres NETTES (contraste), bandes larges vers un ton médian, variation chaud/froid,
     fines fibres. light/mid/vein = palette de l'essence. */
  const makeWoodCanvas = (light, mid, vein, rings, contrast, warm, fiberAmt, warpAmt, breakAmt) => {
    const size = 512; // puissance de 2 (mipmaps + REPEAT)
    const cnv = document.createElement('canvas');
    cnv.width = size;
    cnv.height = size;
    const ctx = cnv.getContext('2d');
    const im = ctx.createImageData(size, size);
    const d = im.data;
    const mix3 = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    const cl = (c) => Math.max(0, Math.min(255, Math.round(c * 255)));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        const w1 = wFbm(u, v, 3, 4, 4) - 0.5; // turbulence large (ondule aussi en longueur)
        const w2 = wFbm(u, v, 6, 12, 3) - 0.5; // turbulence fine
        const ring = u * rings + w1 * warpAmt + w2 * (warpAmt * 0.25); // cernes le long de V
        const f = Math.abs((((ring % 1) + 1) % 1) - 0.5) * 2; // 0 au centre du cerne, 1 entre
        let veinS = Math.pow(1 - f, contrast); // veines sombres nettes
        // Rupture le long de V -> nervures plus COURTES et IRRÉGULIÈRES (pas continues).
        // Basse fréquence en V -> segments nets ; smoothstep -> coupures franches.
        let brk = wFbm(u, v, 4, 4, 3);
        brk = brk * brk * (3 - 2 * brk); // accentue les zones pleines/vides
        veinS *= 1 - breakAmt * (1 - brk);
        const broad = wFbm(u, v, 2, 2, 3); // bandes larges
        let col = mix3(light, vein, veinS * 0.85);
        col = mix3(col, mid, broad * 0.35);
        const tint = wFbm(u + 0.3, v, 2, 3, 2) - 0.5; // variation chaud/froid
        col = [col[0] * (1 + tint * warm), col[1] * (1 + tint * warm * 0.3), col[2] * (1 - tint * warm * 0.5)];
        const fiber = wFbm(u, v, rings * 9, rings * 2, 2) - 0.5; // fibres/pores fins
        const fib = 1 - Math.abs(fiber) * fiberAmt;
        const i = (y * size + x) * 4;
        d[i] = cl(col[0] * fib);
        d[i + 1] = cl(col[1] * fib);
        d[i + 2] = cl(col[2] * fib);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
    return cnv;
  };
  let SHARED_SILVER = null;
  // Chêne : NOMBREUSES fines nervures quasi droites (type parquet chêne), beige-gris clair.
  const oakCanvas = () =>
    (SHARED_WOOD_OAK =
      SHARED_WOOD_OAK ||
      makeWoodCanvas([0.58, 0.55, 0.51], [0.48, 0.46, 0.42], [0.36, 0.34, 0.31], 18, 3.2, 0.04, 0.08, 1.4, 0.85));
  // Noyer : brun MUET (moins orangé), flame grain marqué.
  const walnutCanvas = () =>
    (SHARED_WOOD_WALNUT =
      SHARED_WOOD_WALNUT ||
      makeWoodCanvas([0.43, 0.33, 0.25], [0.32, 0.23, 0.16], [0.18, 0.12, 0.08], 9, 2.3, 0.08, 0.1, 1.9, 0.7));
  // Argent ancien = BOIS GRISÉ (cérusé / driftwood), pas du métal : gris clair NEUTRE +
  // grain de bois (mêmes rainures que le chêne), plus clair et moins brun que le chêne.
  const silverCanvas = () =>
    (SHARED_SILVER =
      SHARED_SILVER ||
      makeWoodCanvas([0.74, 0.73, 0.72], [0.63, 0.62, 0.61], [0.51, 0.50, 0.49], 18, 3.0, 0.02, 0.08, 1.3, 0.8));
  // Texture RGB d'un cadre (null = couleur plate : blanc/noir).
  const frameWoodTexKey = (norm) => {
    if (!norm) return null;
    if (norm.indexOf('noyer') !== -1) return 'walnut';
    if (norm.indexOf('chene') !== -1) return 'oak';
    if (norm.indexOf('argent') !== -1) return 'silver';
    return null;
  };

  // Cache module des textures d'oeuvre DÉCODÉES (puissance-de-deux), partagé entre
  // instances : le carrousel décode au chargement, le popup RÉUTILISE -> il affiche le
  // WebGL directement, SANS jamais réafficher l'image brute. Clé = src sans &width.
  const DECODED_TEX = new Map();

  /* ----------------------------------------------------------------------- *
   * Mapping libellé de variante -> type de rendu (source de vérité unique).
   * Les libellés FR réels ont été vérifiés en ligne. La normalisation (sans
   * accents/casse) rend le match robuste aux variations mineures.
   * ----------------------------------------------------------------------- */
  function normalize(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function borderTypeFromLabel(label) {
    const n = normalize(label);
    if (n.includes('noir')) return 'black';
    if (n.includes('blanc')) return 'white';
    if (n.includes('etir')) return 'stretch'; // étirée (P2)
    if (n.includes('miroir')) return 'mirror'; // miroir (P2)
    if (n.includes('pli')) return 'fold'; // pliée (P2)
    return 'white';
  }

  /* ----------------------------------------------------------------------- *
   * Mini-bibliothèque mat4 (column-major, compatible WebGL)
   * ----------------------------------------------------------------------- */
  const M = {
    identity() {
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    },
    multiply(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          o[c * 4 + r] =
            a[0 * 4 + r] * b[c * 4 + 0] +
            a[1 * 4 + r] * b[c * 4 + 1] +
            a[2 * 4 + r] * b[c * 4 + 2] +
            a[3 * 4 + r] * b[c * 4 + 3];
        }
      }
      return o;
    },
    perspective(fovY, aspect, near, far) {
      const f = 1 / Math.tan(fovY / 2);
      const nf = 1 / (near - far);
      const o = new Float32Array(16);
      o[0] = f / aspect;
      o[5] = f;
      o[10] = (far + near) * nf;
      o[11] = -1;
      o[14] = 2 * far * near * nf;
      return o;
    },
    translate(x, y, z) {
      const o = M.identity();
      o[12] = x;
      o[13] = y;
      o[14] = z;
      return o;
    },
    scale(s) {
      const o = M.identity();
      o[0] = s;
      o[5] = s;
      o[10] = s;
      return o;
    },
    rotateX(a) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      const o = M.identity();
      o[5] = c;
      o[6] = s;
      o[9] = -s;
      o[10] = c;
      return o;
    },
    rotateY(a) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      const o = M.identity();
      o[0] = c;
      o[2] = -s;
      o[8] = s;
      o[10] = c;
      return o;
    },
    // Produit mat4 (column-major) x vec4 -> vec4. Sert à projeter un coin de la toile
    // en espace caméra pour le recadrer (animation de mise en lumière de la tranche).
    mulVec4(m, v) {
      return [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
        m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
      ];
    },
  };

  /* ----------------------------------------------------------------------- *
   * Shaders
   * ----------------------------------------------------------------------- */
  const VERT_SRC = `
    attribute vec3 aPos;
    attribute vec2 aUV;
    attribute vec2 aFabUV;
    attribute vec3 aNormal;
    attribute float aUseTex;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform vec3 uLightDir;
    uniform float uAmbient;
    uniform float uDiffuse;
    varying vec2 vUV;
    varying vec2 vFabUV;
    varying float vUseTex;
    varying float vLight;
    void main() {
      gl_Position = uMVP * vec4(aPos, 1.0);
      vUV = aUV;
      vFabUV = aFabUV;
      vUseTex = aUseTex;
      vec3 n = normalize(mat3(uModel) * aNormal);
      float diff = max(dot(n, normalize(uLightDir)), 0.0);
      vLight = uAmbient + uDiffuse * diff;
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform sampler2D uFabric;
    uniform vec3 uSideColor;
    uniform float uWeaveAmt;
    varying vec2 vUV;
    varying vec2 vFabUV;
    varying float vUseTex;
    varying float vLight;
    void main() {
      // Grain de toile (échantillonné, mipmaps) appliqué PARTOUT : face avant ET
      // tranches -> la toile est "partout" ; le noir/blanc des bords cesse d'être
      // un aplat numérique. UV en coordonnées-monde -> grain continu autour de l'arête.
      float fab = texture2D(uFabric, vFabUV).r;
      float weave = mix(1.0, fab, uWeaveAmt);
      vec3 base = (vUseTex > 0.5) ? texture2D(uTex, vUV).rgb : uSideColor;
      base *= weave;
      gl_FragColor = vec4(min(base * vLight, vec3(1.0)), 1.0);
    }
  `;

  // Ombre portée : un quad sur le "mur" derrière la toile. Le fragment calcule la
  // distance au rectangle arrondi (SDF) -> pénombre douce analytique (pas de passe de flou).
  const VS_SHADOW = `
    attribute vec3 aPos;
    uniform mat4 uMVP;
    varying vec2 vSXY;
    void main() {
      gl_Position = uMVP * vec4(aPos, 1.0);
      vSXY = aPos.xy;
    }
  `;
  const FS_SHADOW = `
    precision mediump float;
    varying vec2 vSXY;
    uniform vec2 uHalf;
    uniform float uRadius;
    uniform vec2 uOffset;
    uniform float uPenumbra;
    uniform float uOpacity;
    uniform vec3 uShadowColor;
    float rrSDF(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
    }
    void main() {
      float d = rrSDF(vSXY - uOffset, uHalf, uRadius);
      float a = (1.0 - smoothstep(0.0, uPenumbra, d)) * uOpacity;
      gl_FragColor = vec4(uShadowColor * a, a); // prémultiplié
    }
  `;

  /* ----------------------------------------------------------------------- *
   * Custom element
   * ----------------------------------------------------------------------- */
  class PerspectiveCanvas extends HTMLElement {
    constructor() {
      super();
      this.canvas = this.querySelector('canvas');
      this.config = this.readConfig();
      this.gl = null;
      this.ready = false;
      this.texture = null;
      this.aspect = 1;
      this.rafId = null;
      this.state = { border: 'white', frame: 'none' };
      // Échelle de cadrage : popup (gros plan) / carrousel mobile (posé) / carrousel desktop.
      // Recalculée sur resize (callback ResizeObserver) car dépend du viewport.
      this.scale = this.computeScale();
      this.yawOffset = 0; // inclinaison interactive (clic-glisser souris)
      this.pitchOffset = 0;
      this.dragging = false;
      this.springId = null;
      this.suppressClick = false;
      // Animation auto "mise en lumière de la tranche" (au changement de bordure).
      this.hlYaw = 0;
      this.hlPitch = 0;
      this.hlZoom = 1;
      this.hlFocus = 0;
      this.hlRAF = null;
      this.hlStart = 0;
      this.onVariantChange = this.onVariantChange.bind(this);
    }

    readConfig() {
      const el = this.querySelector('.perspective-config');
      if (!el) return null;
      try {
        return JSON.parse(el.textContent);
      } catch (e) {
        return null;
      }
    }

    connectedCallback() {
      // Plus de config valide ? On reste sur l'<img> poster (repli gracieux, indexable).
      if (!this.canvas || !this.config) return;

      // État initial depuis les variantes déjà cochées.
      this.syncStateFromDOM();

      // Réagit aux changements de variante (event natif qui bubble jusqu'au document).
      document.addEventListener('change', this.onVariantChange);

      // Init paresseuse : on n'allume le WebGL que lorsque le slide approche le viewport.
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(
          (entries) => {
            if (entries.some((en) => en.isIntersecting)) {
              this.io.disconnect();
              this.io = null;
              this.deferInit();
            }
          },
          { rootMargin: '200px' },
        );
        this.io.observe(this);
      } else {
        this.deferInit();
      }
    }

    /* Init WebGL VRAIMENT non bloquante : on attend l'évènement `load` (ressources
       critiques + LCP déjà peints), puis un creux du thread (rIC) -> le WebGL ne dispute
       jamais le thread au paint LCP. L'<img> poster (LCP/indexable) est visible pendant ce
       temps. Garde-fou anti-attente infinie. */
    deferInit() {
      // Gros plan (popup) : 1 frame pour laisser le modal s'ouvrir/peindre AVANT l'init
      // WebGL (ouverture fluide), puis init (texture déjà en cache -> rendu rapide).
      // Aucune image brute n'est jamais affichée ici.
      if (this.getAttribute('data-context') === 'popup') {
        requestAnimationFrame(() => this.init());
        return;
      }
      let started = false;
      const run = () => {
        if (started) return;
        started = true;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if ('requestIdleCallback' in window) requestIdleCallback(() => this.init(), { timeout: 2000 });
            else setTimeout(() => this.init(), 200);
          }),
        );
      };
      if (document.readyState === 'complete') run();
      else {
        window.addEventListener('load', run, { once: true });
        setTimeout(run, 4000); // garde-fou : ne pas attendre `load` indéfiniment
      }
    }

    disconnectedCallback() {
      document.removeEventListener('change', this.onVariantChange);
      if (this.io) this.io.disconnect();
      if (this.ro) this.ro.disconnect();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.springId) cancelAnimationFrame(this.springId);
      if (this.hlRAF) cancelAnimationFrame(this.hlRAF);
      if (this._hlScrollIO) this._hlScrollIO.disconnect();
      if (this._hlScrollTO) clearTimeout(this._hlScrollTO);
      if (this._onResize) {
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('orientationchange', this._onResize);
      }
      this.releaseGL();
    }

    /* Le popup est recréé à CHAQUE ouverture (clone du template) -> on doit libérer le
       contexte WebGL et ses ressources au démontage, sinon on atteint "Too many active
       WebGL contexts" (~15 ouvertures) et le navigateur évince le contexte du carrousel.
       NE PAS toucher SHARED_FABRIC_SOURCE ni DECODED_TEX (sources CPU partagées, pas du GL). */
    releaseGL() {
      const gl = this.gl;
      if (!gl) return;
      try {
        if (this.geo) {
          gl.deleteBuffer(this.geo.posBuf);
          gl.deleteBuffer(this.geo.uvBuf);
          gl.deleteBuffer(this.geo.fabBuf);
          gl.deleteBuffer(this.geo.norBuf);
          gl.deleteBuffer(this.geo.useBuf);
          gl.deleteBuffer(this.geo.idxBuf);
        }
        if (this.frameGeo) {
          gl.deleteBuffer(this.frameGeo.posBuf);
          gl.deleteBuffer(this.frameGeo.uvBuf);
          gl.deleteBuffer(this.frameGeo.fabBuf);
          gl.deleteBuffer(this.frameGeo.norBuf);
          gl.deleteBuffer(this.frameGeo.useBuf);
          gl.deleteBuffer(this.frameGeo.idxBuf);
        }
        if (this.shadowBuf) gl.deleteBuffer(this.shadowBuf);
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.fabricTex) gl.deleteTexture(this.fabricTex); // texture GL par-contexte (la SOURCE CPU partagée reste)
        if (this.woodOakTex) gl.deleteTexture(this.woodOakTex);
        if (this.woodWalnutTex) gl.deleteTexture(this.woodWalnutTex);
        if (this.silverTex) gl.deleteTexture(this.silverTex);
        if (this.program) gl.deleteProgram(this.program);
        if (this.shadowProgram) gl.deleteProgram(this.shadowProgram);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) {}
      this.gl = null;
      this.geo = null;
      this.frameGeo = null;
      this.texture = null;
      this.shadowBuf = null;
      this.program = null;
      this.shadowProgram = null;
      this.ready = false;
    }

    /* Image poster cassée (échec de chargement réseau) : on masque le slide pour
       éviter l'icône d'image brisée. Le repli "WebGL indisponible", lui, GARDE l'<img>. */
    disableSlide() {
      const wrapper = this.closest('.img-wrapper') || this;
      wrapper.style.display = 'none';
    }

    syncStateFromDOM() {
      const b = document.querySelector(
        'painting-variant-picker input[name="option2"]:checked',
      );
      const f = document.querySelector(
        'painting-variant-picker input[name="option3"]:checked',
      );
      // La finition (bordure/cadre) est dérivée du HANDLE du métaobjet (data-render-key),
      // STABLE quelle que soit la langue de la boutique (ex. « bordure-noire », « cadre-noyer »,
      // « sans-cadre »). Le LIBELLÉ de variante, lui, est traduit (ES/DE/NL/EN) et ne contient
      // plus les mots-clés FR du mapping -> hors français, tout retombait sur 'white'/'sans cadre'
      // et l'animation ne reconnaissait plus la sélection. Repli sur le libellé si l'attribut est
      // absent (produit sans métaobjet bordure/cadre configuré).
      if (b) this.state.border = borderTypeFromLabel(b.dataset.renderKey || b.value);
      if (f) this.state.frame = normalize(f.dataset.renderKey || f.value);
      // Taille (option1, ex. "30x40 cm") -> dimensions réelles pour la proportion du châssis.
      const s = document.querySelector(
        'painting-variant-picker input[name="option1"]:checked',
      );
      if (s) {
        const m = s.value.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
        if (m) {
          this.sizeW = parseFloat(m[1].replace(',', '.'));
          this.sizeH = parseFloat(m[2].replace(',', '.'));
        }
      }
      this.updateAria(b ? b.value : '', f ? f.value : '');
    }

    onVariantChange(event) {
      const target = event.target;
      if (
        !target ||
        !target.matches ||
        !target.matches('painting-variant-picker input[type="radio"]')
      ) {
        return;
      }
      const prevBorder = this.state.border;
      const prevFrame = this.state.frame;
      this.syncStateFromDOM();
      this.scheduleRender();
      // Bordure OU cadre changé -> sur mobile, le carrousel scrolle vers la slide WebGL puis
      // joue la mise en lumière, pour que l'utilisateur voie DIRECTEMENT le changement.
      if (this.state.border !== prevBorder || this.state.frame !== prevFrame) {
        this.highlightOnBorderChange();
      }
    }

    /* Sur MOBILE le carrousel ne montre qu'une image à la fois ; si la slide WebGL (placée
       en dernier) n'est pas visible, on l'amène d'abord au centre, PUIS on joue l'animation
       quand elle est en vue. Sur desktop (grille = tout visible) ou en popup : direct. */
    highlightOnBorderChange() {
      const isPopup = this.getAttribute('data-context') === 'popup';
      const mobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      if (this._hlScrollIO) { this._hlScrollIO.disconnect(); this._hlScrollIO = null; }
      if (this._hlScrollTO) { clearTimeout(this._hlScrollTO); this._hlScrollTO = null; }
      const slide = this.closest('.perspective-slide');
      const carousel = slide && slide.closest('.carousel');
      if (isPopup || !mobile || !slide || !carousel) {
        this.triggerHighlight();
        return;
      }
      // Scroll horizontal du carrousel pour centrer la slide WebGL (sans scroll vertical).
      const cRect = carousel.getBoundingClientRect();
      const sRect = slide.getBoundingClientRect();
      const delta = sRect.left - cRect.left - (carousel.clientWidth - sRect.width) / 2;
      carousel.scrollTo({ left: carousel.scrollLeft + delta, behavior: 'smooth' });
      // Joue l'animation quand la slide est suffisamment visible DANS le carrousel.
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.intersectionRatio >= 0.6)) {
            io.disconnect();
            this._hlScrollIO = null;
            this.triggerHighlight();
          }
        },
        { root: carousel, threshold: [0.6] },
      );
      this._hlScrollIO = io;
      io.observe(slide);
      // Garde-fou : si l'IO ne tire pas (déjà centrée / scroll instantané), joue après un délai.
      this._hlScrollTO = setTimeout(() => {
        if (this._hlScrollIO) { this._hlScrollIO.disconnect(); this._hlScrollIO = null; }
        if (!this.hlRAF) this.triggerHighlight();
      }, 800);
    }

    /* Au changement de bordure : zoom + rotation accrue vers le coin bas-gauche pour révéler
       la TRANCHE (là où la bordure agit), maintien, puis retour. Si le rendu n'est pas encore
       prêt (init lazy), l'animation est mise en attente et jouée dès que prêt. Respecte
       prefers-reduced-motion (pas d'animation automatique). */
    triggerHighlight() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      if (!this.ready || !this.gl) {
        this._pendingHighlight = true; // init lazy en cours -> jouera dès que prêt
        return;
      }
      const now = performance.now();
      if (this.hlRAF) {
        // Restart pendant une anim en cours : on back-date l'horloge pour repartir de
        // l'amplitude DÉJÀ atteinte (hlFocus == amt) -> pas de saut plein-écran.
        this.hlStart = now - SCENE.highlightIn * this.hlFocus;
      } else {
        this.hlStart = now;
        this.hlTick();
      }
    }

    hlTick() {
      const TIN = SCENE.highlightIn;
      const THOLD = SCENE.highlightHold;
      const TOUT = SCENE.highlightOut;
      const END = TIN + THOLD + TOUT;
      const ease = (x) => x * x * (3 - 2 * x); // smoothstep
      const t = performance.now() - this.hlStart;
      let amt;
      if (t < TIN) amt = ease(t / TIN);
      else if (t < TIN + THOLD) amt = 1;
      else if (t < END) amt = ease(1 - (t - TIN - THOLD) / TOUT);
      else amt = 0;
      this.hlYaw = SCENE.highlightYawAdd * amt;
      this.hlPitch = SCENE.highlightPitchAdd * amt;
      this.hlZoom = 1 + (SCENE.highlightZoom - 1) * amt;
      this.hlFocus = amt;
      this.render();
      if (t < END) {
        this.hlRAF = requestAnimationFrame(() => this.hlTick());
      } else {
        this.hlYaw = 0;
        this.hlPitch = 0;
        this.hlZoom = 1;
        this.hlFocus = 0;
        this.hlRAF = null;
        this.render(); // retour propre à la position de base
      }
    }

    stopHighlight() {
      if (this.hlRAF) {
        cancelAnimationFrame(this.hlRAF);
        this.hlRAF = null;
      }
      this.hlYaw = 0;
      this.hlPitch = 0;
      this.hlZoom = 1;
      this.hlFocus = 0;
      this.scheduleRender(); // repeindre la position de repos (sinon frame zoomée figée si clic sans drag)
    }

    /* Glisser -> inclinaison de la toile, retour ressort au relâchement.
       Actif à la SOURIS ET au TACTILE, dans le carrousel comme dans le popup : le doigt fait
       tourner la toile (touch-action:none) -> l'utilisateur comprend tout de suite qu'elle est
       dynamique. Dans le carrousel, la navigation se fait alors via le quart d'image adjacent
       resté visible sur les côtés ; un simple tap (sans glisser) ouvre toujours le popup. */
    setupInteraction() {
      const c = this.canvas;
      if (!c || this._interaction) return;
      this._interaction = true;
      c.style.cursor = 'grab';
      c.style.touchAction = 'none'; // le doigt fait tourner la toile (pas de scroll/zoom natif du canvas)
      let sx = 0, sy = 0, sYaw = 0, sPitch = 0;
      const K = 0.006; // rad / pixel
      const AXIS = 1.4; // garde-fou par axe (< π/2 : garde le clamp combiné monotone)
      const TILT_COS = Math.cos(1.26); // bascule max du FRONT (~72°), tous axes confondus -> jamais l'arrière
      const onDown = (e) => {
        const isMouse = !e.pointerType || e.pointerType === 'mouse';
        if (isMouse && e.button !== 0) return; // souris : bouton gauche uniquement (tactile/stylet : OK partout)
        this.stopHighlight(); // l'utilisateur reprend la main -> on coupe l'animation auto
        this.dragging = true;
        this.moved = false;
        sx = e.clientX;
        sy = e.clientY;
        sYaw = this.yawOffset;
        sPitch = this.pitchOffset;
        c.style.cursor = 'grabbing';
        if (this.springId) {
          cancelAnimationFrame(this.springId);
          this.springId = null;
        }
        if (c.setPointerCapture && e.pointerId != null) {
          try { c.setPointerCapture(e.pointerId); } catch (err) {}
        }
      };
      const onMove = (e) => {
        if (!this.dragging) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.moved = true;
        // On raisonne sur l'angle TOTAL (repos + glisser), symétrique autour du frontal :
        // on voit autant l'arête droite que la gauche, autant le haut que le bas.
        let yt = Math.max(-AXIS, Math.min(AXIS, SCENE.yaw + sYaw + dx * K));
        let pt = Math.max(-AXIS, Math.min(AXIS, SCENE.pitch + sPitch - dy * K));
        // Plafonne la bascule du front (cos = composante z de la normale) -> jamais l'arrière,
        // même en diagonale ; ramène yaw+pitch proportionnellement sous la limite.
        if (Math.cos(yt) * Math.cos(pt) < TILT_COS) {
          let lo = 0, hi = 1;
          for (let i = 0; i < 14; i++) {
            const m = (lo + hi) * 0.5;
            if (Math.cos(yt * m) * Math.cos(pt * m) < TILT_COS) hi = m;
            else lo = m;
          }
          yt *= lo;
          pt *= lo;
        }
        this.yawOffset = yt - SCENE.yaw;
        this.pitchOffset = pt - SCENE.pitch;
        this.scheduleRender();
      };
      const onUp = () => {
        if (!this.dragging) return;
        this.dragging = false;
        c.style.cursor = 'grab';
        if (this.moved) {
          this.suppressClick = true; // empêche l'ouverture du popup après un glisser
          this.springBack();
        }
      };
      c.addEventListener('pointerdown', onDown);
      c.addEventListener('pointermove', onMove);
      c.addEventListener('pointerup', onUp);
      c.addEventListener('pointercancel', onUp);
      c.addEventListener(
        'click',
        (e) => {
          if (this.suppressClick) {
            e.stopPropagation();
            e.preventDefault();
            this.suppressClick = false;
          }
        },
        true,
      );
    }

    /* Retour amorti à l'angle 3/4 par défaut (respecte prefers-reduced-motion). */
    springBack() {
      const reduce =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.yawOffset = 0;
        this.pitchOffset = 0;
        this.scheduleRender();
        return;
      }
      const step = () => {
        this.yawOffset *= 0.82;
        this.pitchOffset *= 0.82;
        if (
          Math.abs(this.yawOffset) < 0.001 &&
          Math.abs(this.pitchOffset) < 0.001
        ) {
          this.yawOffset = 0;
          this.pitchOffset = 0;
          this.springId = null;
          this.scheduleRender();
          return;
        }
        this.scheduleRender();
        this.springId = requestAnimationFrame(step);
      };
      this.springId = requestAnimationFrame(step);
    }

    updateAria(borderLabel, frameLabel) {
      if (!this.canvas) return;
      const title = (this.config && this.config.title) || '';
      let label = 'Aperçu en perspective';
      if (title) label += ' de ' + title;
      if (borderLabel) label += ' — ' + borderLabel.toLowerCase();
      // « Pas de cadre » détecté sur l'état dérivé du handle (indépendant de la langue),
      // tout en affichant le libellé traduit pour le lecteur d'écran.
      if (frameLabel && this.state.frame && this.state.frame.indexOf('sans') === -1) {
        label += ', ' + frameLabel.toLowerCase();
      }
      this.canvas.setAttribute('aria-label', label);
    }

    /* --------------------------------------------------------------------- *
     * WebGL
     * --------------------------------------------------------------------- */
    init() {
      // Nœud détaché (popup fermé / re-render éditeur pendant le defer) : ne rien allumer
      // -> évite un contexte WebGL + observers orphelins sur un élément hors du DOM.
      if (!this.isConnected) return;
      const isPopup = this.getAttribute('data-context') === 'popup';
      // Connexion très lente / Save-Data : on n'allume pas le WebGL au CARROUSEL (l'<img>
      // optimisée reste, repli gracieux). Dans le POPUP, l'ouverture est un choix explicite
      // de l'utilisateur -> on n'applique pas la garde (sinon modal vide, pas de poster).
      const conn = navigator.connection;
      if (!isPopup && conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
        return;
      }
      // premultipliedAlpha:true -> le compositing du navigateur utilise directement
      // les bords prémultipliés issus du MSAA (pas de re-division -> pas de halo/frange).
      const opts = { alpha: true, premultipliedAlpha: true, antialias: true };
      const gl =
        this.canvas.getContext('webgl', opts) ||
        this.canvas.getContext('experimental-webgl', opts);
      // Pas de WebGL : carrousel -> l'<img> poster reste ; popup (sans poster) -> on rend au
      // moins le canvas visible (son contenu texte/aria sert de message, jamais l'image brute).
      if (!gl) {
        if (isPopup) this.canvas.classList.remove('opacity-0');
        return;
      }
      this.gl = gl;

      this.program = this.buildProgram(VERT_SRC, FRAG_SRC);
      if (!this.program) {
        if (isPopup) this.canvas.classList.remove('opacity-0');
        return; // shaders KO
      }
      this.locs = {
        aPos: gl.getAttribLocation(this.program, 'aPos'),
        aUV: gl.getAttribLocation(this.program, 'aUV'),
        aFabUV: gl.getAttribLocation(this.program, 'aFabUV'),
        aNormal: gl.getAttribLocation(this.program, 'aNormal'),
        aUseTex: gl.getAttribLocation(this.program, 'aUseTex'),
        uMVP: gl.getUniformLocation(this.program, 'uMVP'),
        uModel: gl.getUniformLocation(this.program, 'uModel'),
        uLightDir: gl.getUniformLocation(this.program, 'uLightDir'),
        uAmbient: gl.getUniformLocation(this.program, 'uAmbient'),
        uDiffuse: gl.getUniformLocation(this.program, 'uDiffuse'),
        uTex: gl.getUniformLocation(this.program, 'uTex'),
        uFabric: gl.getUniformLocation(this.program, 'uFabric'),
        uSideColor: gl.getUniformLocation(this.program, 'uSideColor'),
        uWeaveAmt: gl.getUniformLocation(this.program, 'uWeaveAmt'),
      };

      gl.enable(gl.DEPTH_TEST);
      // Pas de backface-culling : la géométrie arrondie a un winding mixte sur les arcs.
      // La forme est convexe -> le depth-test occulte correctement les faces arrière.
      gl.clearColor(0, 0, 0, 0);
      // Compositing prémultiplié (toile opaque + ombre semi-transparente).
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // Programme d'ombre portée (quad sur le mur derrière la toile).
      this.shadowProgram = this.buildProgram(VS_SHADOW, FS_SHADOW);
      this.sLocs = this.shadowProgram
        ? {
            aPos: gl.getAttribLocation(this.shadowProgram, 'aPos'),
            uMVP: gl.getUniformLocation(this.shadowProgram, 'uMVP'),
            uHalf: gl.getUniformLocation(this.shadowProgram, 'uHalf'),
            uRadius: gl.getUniformLocation(this.shadowProgram, 'uRadius'),
            uOffset: gl.getUniformLocation(this.shadowProgram, 'uOffset'),
            uPenumbra: gl.getUniformLocation(this.shadowProgram, 'uPenumbra'),
            uOpacity: gl.getUniformLocation(this.shadowProgram, 'uOpacity'),
            uShadowColor: gl.getUniformLocation(this.shadowProgram, 'uShadowColor'),
          }
        : null;

      this.fabricTex = this.makeFabricTexture();
      // Textures de cadre (bois chêne/noyer, argent grisé) construites À LA DEMANDE, par
      // essence réellement sélectionnée (ensureFrameTex au rendu) -> aucune génération ni
      // upload GPU pour les produits sans cadre bois, et 1 seule essence à la fois.

      // Suit les changements de taille du slide. On CACHE la taille CSS ici (callback RO)
      // pour ne JAMAIS lire le layout pendant render() -> supprime le forced reflow.
      if ('ResizeObserver' in window) {
        this.ro = new ResizeObserver((entries) => {
          const cr = entries[0] && entries[0].contentRect;
          if (cr) { this._cssW = cr.width; this._cssH = cr.height; }
          this.scale = this.computeScale(); // viewport a pu franchir le breakpoint mobile/desktop
          this.scheduleRender();
        });
        this.ro.observe(this.canvas);
      }

      this.loadTexture();
      this.setupInteraction();
    }

    /* Texture de toile (lin) générée hors-ligne : grain organique, échantillonné
       avec mipmaps -> se réduit proprement, sans le moiré d'un motif procédural. */
    makeFabricTexture() {
      const gl = this.gl;
      const size = 512;
      // Génération CPU coûteuse (262 144 px) : payée UNE fois, mémorisée au niveau module.
      if (!SHARED_FABRIC_SOURCE) {
        const cnv = document.createElement('canvas');
        cnv.width = size;
        cnv.height = size;
        const ctx = cnv.getContext('2d');
        const img = ctx.createImageData(size, size);
        const d = img.data;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            // Fils tissés : bosses sinusoïdales croisées (période ~6 px) + bruit fin.
            const threadX = Math.abs(Math.sin((x * Math.PI) / 3.0));
            const threadY = Math.abs(Math.sin((y * Math.PI) / 3.0));
            const valley = 1.0 - Math.max(threadX, threadY); // creux entre les fils
            const noise = (Math.random() - 0.5) * 0.05;
            let v = 1.0 - 0.14 * valley + noise; // creux un peu plus marqués -> grain visible mais léger
            v = Math.max(0, Math.min(1, v));
            const i = (y * size + x) * 4;
            const c = Math.round(v * 255);
            d[i] = c;
            d[i + 1] = c;
            d[i + 2] = c;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        SHARED_FABRIC_SOURCE = cnv;
      }

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, SHARED_FABRIC_SOURCE);
      // 512 = puissance de 2 -> mipmaps + REPEAT autorisés.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.applyAniso();
      return tex;
    }

    /* Upload d'un canvas (bois RGB) en texture GL (REPEAT + mipmaps + aniso). */
    makeFrameTexFromCanvas(cnv) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.applyAniso();
      return tex;
    }

    /* Texture de cadre (bois/argent) À LA DEMANDE : la 1re sélection d'une essence crée sa
       texture GL (le canvas source reste mémorisé au niveau module -> généré au plus une fois
       par page). Évite tout coût pour les cadres non utilisés. */
    ensureFrameTex(woodKey) {
      if (woodKey === 'oak') return this.woodOakTex || (this.woodOakTex = this.makeFrameTexFromCanvas(oakCanvas()));
      if (woodKey === 'walnut') return this.woodWalnutTex || (this.woodWalnutTex = this.makeFrameTexFromCanvas(walnutCanvas()));
      if (woodKey === 'silver') return this.silverTex || (this.silverTex = this.makeFrameTexFromCanvas(silverCanvas()));
      return null;
    }

    /* Échelle de cadrage de la toile selon le contexte/viewport :
       - popup (gros plan) : scalePopup (le canvas remplit l'écran -> vue immersive "zoomée") ;
       - carrousel sur mobile : scaleCarouselMobile (toile posée, avec marge -> PAS zoomée) ;
       - carrousel sur desktop : scale.
       Le "zoom" n'apparaît donc qu'au clic, dans le popup. Recalculée au resize. */
    computeScale() {
      if (this.getAttribute('data-context') === 'popup') return SCENE.scalePopup;
      const mobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      return mobile ? SCENE.scaleCarouselMobile : SCENE.scale;
    }

    /* Gros plan : dimensionne le canvas au ratio de l'oeuvre, borné à l'écran (82vh ou 90vw)
       -> toile la plus grande possible, centrée, sans vide latéral. Rappelé sur resize/rotation. */
    sizePopup() {
      if (this.getAttribute('data-context') !== 'popup' || !this.aspect) return;
      const ar = this.aspect;
      const h = Math.min(0.82 * window.innerHeight, (0.9 * window.innerWidth) / ar);
      this.canvas.style.width = Math.round(h * ar) + 'px';
      this.canvas.style.height = Math.round(h) + 'px';
      this.canvas.style.margin = '0 auto';
      this.style.width = '100%'; // le conteneur prend la largeur, le canvas est centré dedans
    }

    buildProgram(vsrc, fsrc) {
      const gl = this.gl;
      const vs = this.compile(gl.VERTEX_SHADER, vsrc);
      const fs = this.compile(gl.FRAGMENT_SHADER, fsrc);
      if (!vs || !fs) return null;
      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      return p;
    }

    compile(type, src) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    // Clé de cache d'une oeuvre : src sans le paramètre &width (même oeuvre, toute taille).
    texKey(src) {
      return (src || '').replace(/([?&])width=\d+/i, '$1').replace(/[?&]+$/, '');
    }

    loadTexture() {
      const cfgSrc = this.config && this.config.raw && this.config.raw.src;
      const poster =
        (this.parentElement && this.parentElement.querySelector('.persp-poster')) || null;
      const keySrc = (poster && (poster.currentSrc || poster.src)) || cfgSrc;
      const key = this.texKey(keySrc);

      // Texture DÉJÀ décodée (typiquement par le carrousel) -> upload INSTANTANÉ, sans
      // jamais réafficher l'image brute (cas du popup : il n'a même pas d'<img>).
      const cached = key && DECODED_TEX.get(key);
      if (cached) {
        this.aspect = cached.aspect;
        this.finishTexture(cached.source, cached.flipY, key);
        return;
      }

      // Sinon : décoder depuis le poster déjà chargé (zéro fetch en double), ou la config.
      if (poster) {
        if (poster.complete && poster.naturalWidth) this.decodeAndUpload(poster, key);
        else {
          poster.addEventListener('load', () => this.decodeAndUpload(poster, key), { once: true });
          poster.addEventListener('error', () => this.disableSlide(), { once: true });
        }
        return;
      }
      if (!cfgSrc) return;
      const img = new Image();
      img.crossOrigin = 'anonymous'; // CDN Shopify ACAO:* -> pas de taint
      img.decoding = 'async';
      img.onload = () => this.decodeAndUpload(img, key);
      img.onerror = () => this.disableSlide();
      img.src = cfgSrc;
    }

    /* Décode l'oeuvre en PUISSANCE-DE-DEUX (mipmaps -> anti-aliasing quand la toile est
       inclinée), MET EN CACHE module la source décodée (réutilisée par les autres
       instances, ex. popup), puis upload. createImageBitmap hors-thread si dispo, sinon
       canvas 2D sur le thread principal (repli, orientation via FLIP_Y). */
    decodeAndUpload(source, key) {
      const sw = source.naturalWidth || source.width;
      const sh = source.naturalHeight || source.height;
      if (!sw || !sh) return;
      const aspect = sw / sh || 1;
      this.aspect = aspect;
      const pot = (n) => { let p = 1; while (p < n) p *= 2; return Math.min(p, 2048); };
      const pw = pot(sw);
      const ph = pot(sh);

      const store = (texSource, flipY) => {
        // Upload D'ABORD ; on ne met en cache QU'APRÈS succès -> jamais d'entrée empoisonnée.
        const ok = this.finishTexture(texSource, flipY, key);
        if (ok && key) DECODED_TEX.set(key, { source: texSource, flipY: flipY, aspect: aspect });
      };
      // Repli : canvas PoT sur le thread principal (orientation gérée par FLIP_Y, validé).
      const fallback = () => {
        const cnv = document.createElement('canvas');
        cnv.width = pw;
        cnv.height = ph;
        cnv.getContext('2d').drawImage(source, 0, 0, pw, ph);
        store(cnv, true);
      };

      if ('createImageBitmap' in window) {
        // imageOrientation:'flipY' -> bitmap pré-retourné (UNPACK_FLIP_Y_WEBGL est ignoré
        // pour les ImageBitmap) : MÊME orientation que le chemin canvas+FLIP_Y validé.
        createImageBitmap(source, {
          resizeWidth: pw,
          resizeHeight: ph,
          resizeQuality: 'high',
          imageOrientation: 'flipY',
        })
          .then((bmp) => {
            // Resize non honoré (ex. Safari) -> repli (sinon mipmaps KO sur non-PoT).
            if (bmp.width !== pw || bmp.height !== ph) {
              if (bmp.close) bmp.close();
              fallback();
              return;
            }
            store(bmp, false);
          })
          .catch(fallback);
      } else {
        fallback();
      }
    }

    /* Crée la texture GL (par contexte WebGL) depuis une source décodée — éventuellement
       PARTAGÉE via le cache. Ne ferme PAS la source (réutilisable par d'autres instances).
       Renvoie true si l'upload a réussi ; en cas d'échec (source taintée), purge l'entrée
       de cache fautive pour ne pas empoisonner les autres instances. */
    finishTexture(texSource, flipY, key) {
      const gl = this.gl;
      if (!gl) return false;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!flipY);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texSource);
      } catch (e) {
        gl.deleteTexture(tex);
        if (key) DECODED_TEX.delete(key); // ne pas empoisonner le cache partagé
        return false;
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.applyAniso(); // filtrage anisotrope : netteté + anti-aliasing aux angles rasants
      this.texture = tex;
      this.buildGeometry();
      this.ready = true;
      // Gros plan : taille du canvas adaptée à l'oeuvre (ratio portrait), bornée à l'écran
      // -> toile plus grande, sans vide latéral. Recalcul à la rotation/resize de l'écran.
      if (this.getAttribute('data-context') === 'popup' && this.aspect) {
        this.sizePopup();
        if (!this._onResize) {
          this._onResize = () => {
            this.sizePopup();
            this.scheduleRender();
          };
          window.addEventListener('resize', this._onResize);
          window.addEventListener('orientationchange', this._onResize);
        }
      }
      this.scheduleRender();
      // Init lazy : une mise en lumière demandée avant que le rendu soit prêt -> on la joue.
      if (this._pendingHighlight) {
        this._pendingHighlight = false;
        this.triggerHighlight();
      }
      return true;
    }

    applyAniso() {
      const gl = this.gl;
      const ext =
        this.aniso ||
        (this.aniso =
          gl.getExtension('EXT_texture_filter_anisotropic') ||
          gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
          gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
          null);
      if (ext) {
        const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(
          gl.TEXTURE_2D,
          ext.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, max),
        );
      }
    }

    /* Géométrie : face avant texturée + 4 tranches du châssis.
       (TODO-P2 : UV/useTex des tranches pour étirée/miroir/pliée ;
        TODO-P3 : barres de cadre.) */
    buildGeometry() {
      const gl = this.gl;
      const a = this.aspect;
      const halfW = a >= 1 ? 1.0 : a;
      const halfH = a >= 1 ? 1.0 / a : 1.0;
      // Profondeur du châssis dérivée de la PHYSIQUE : épaisseur réelle (cm) / taille
      // choisie (cm). La longue face = 2.0 unités-monde, d'où le facteur 2.0.
      const Wc = this.sizeW || 40;
      const Hc = this.sizeH || 40;
      const D = (SCENE.chassisCm * 2.0) / Math.max(Wc, Hc);

      const pos = [];
      const uv = [];
      const fab = [];
      const nor = [];
      const use = [];
      const idx = [];

      // UV de toile en coordonnées-monde (projetées sur le plan tangent à la face)
      // -> densité de fils constante + grain CONTINU entre la face avant et les tranches.
      const T = SCENE.fabricDensity;
      const fabUVfor = (p, n) => {
        const ax = Math.abs(n[0]);
        const ay = Math.abs(n[1]);
        const az = Math.abs(n[2]);
        if (az >= ax && az >= ay) return [p[0] * T, p[1] * T]; // face avant/arrière
        if (ax >= ay) return [p[2] * T, p[1] * T]; // tranches gauche/droite
        return [p[0] * T, p[2] * T]; // tranches haut/bas
      };

      const pushQuad = (verts, uvs, normal, useTex) => {
        const base = pos.length / 3;
        for (let i = 0; i < 4; i++) {
          pos.push(verts[i][0], verts[i][1], verts[i][2]);
          uv.push(uvs[i][0], uvs[i][1]);
          const f = fabUVfor(verts[i], normal);
          fab.push(f[0], f[1]);
          nor.push(normal[0], normal[1], normal[2]);
          use.push(useTex);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };

      // Mode de bordure + bandes (épaisseur du châssis en coords image).
      const mode = this.state.border;
      const sideTex = mode === 'stretch' || mode === 'mirror' || mode === 'fold';
      const sUse = sideTex ? 1 : 0;
      const mU = D / (2 * halfW); // bande/marge (u) sur tranches gauche/droite
      const mV = D / (2 * halfH); // bande/marge (v) sur tranches haut/bas

      // ===== Boîte ARRONDIE + BISEAUTÉE (coins arrondis + arête face/tranche adoucie) =====
      const pushVert = (p, texUV, normal, useTex) => {
        const i = pos.length / 3;
        pos.push(p[0], p[1], p[2]);
        uv.push(texUV[0], texUV[1]);
        const f = fabUVfor(p, normal);
        fab.push(f[0], f[1]);
        nor.push(normal[0], normal[1], normal[2]);
        use.push(useTex);
        return i;
      };

      // UV artwork depuis la position de face normalisée. Pliée : l'image est plus
      // grande -> la face montre le CENTRE [marge..1-marge] (le débord ira sur la tranche).
      const mapU = (pu) => (mode === 'fold' ? mU + (1 - 2 * mU) * pu : pu);
      const mapV = (pv) => (mode === 'fold' ? mV + (1 - 2 * mV) * pv : pv);
      const artUV = (x, y) => [
        mapU((x + halfW) / (2 * halfW)),
        mapV((y + halfH) / (2 * halfH)),
      ];

      // Contour à coins arrondis (CCW vu de +z) : rayon r, arcs de K segments.
      // À peine cassé : ~0.6% -> coins presque pointus, juste sans l'arête tranchante.
      const r = Math.min(halfW, halfH) * 0.006;
      const K = 6;
      const rim = [];
      const addArc = (cx, cy, a0, a1) => {
        for (let k = 0; k <= K; k++) {
          const ang = a0 + ((a1 - a0) * k) / K;
          const nx = Math.cos(ang);
          const ny = Math.sin(ang);
          rim.push({ x: cx + r * nx, y: cy + r * ny, nx, ny });
        }
      };
      addArc(halfW - r, -(halfH - r), -Math.PI / 2, 0); // coin bas-droite
      addArc(halfW - r, halfH - r, 0, Math.PI / 2); // haut-droite
      addArc(-(halfW - r), halfH - r, Math.PI / 2, Math.PI); // haut-gauche
      addArc(-(halfW - r), -(halfH - r), Math.PI, (3 * Math.PI) / 2); // bas-gauche
      const N = rim.length;

      // Biseau 45° minimal : retrait xy = profondeur z (borné par le rayon / la profondeur).
      const bvZ = Math.min(D * 0.22, r * 0.9);

      // 1) FACE AVANT (éventail) — contour rentré de bvZ, à z=0.
      const cIdx = pushVert([0, 0, 0], artUV(0, 0), [0, 0, 1], 1);
      const fIdx = [];
      for (let i = 0; i < N; i++) {
        const p = rim[i];
        const fx = p.x - bvZ * p.nx;
        const fy = p.y - bvZ * p.ny;
        fIdx.push(pushVert([fx, fy, 0], artUV(fx, fy), [0, 0, 1], 1));
      }
      for (let i = 0; i < N; i++) idx.push(cIdx, fIdx[i], fIdx[(i + 1) % N]);

      // 2) BISEAU (anneau) : du contour avant rentré (z=0) au contour extérieur (z=-bvZ).
      //    Normale ~45° (sort + vers l'avant) -> capte la lumière = liseré premium.
      for (let i = 0; i < N; i++) {
        const a = rim[i];
        const b = rim[(i + 1) % N];
        const ax = a.x - bvZ * a.nx, ay = a.y - bvZ * a.ny;
        const bx = b.x - bvZ * b.nx, by = b.y - bvZ * b.ny;
        const na = [a.nx, a.ny, 1];
        const nb = [b.nx, b.ny, 1];
        const i0 = pushVert([ax, ay, 0], artUV(ax, ay), na, 1);
        const i1 = pushVert([bx, by, 0], artUV(bx, by), nb, 1);
        const i2 = pushVert([b.x, b.y, -bvZ], artUV(b.x, b.y), nb, 1);
        const i3 = pushVert([a.x, a.y, -bvZ], artUV(a.x, a.y), na, 1);
        idx.push(i0, i1, i2, i0, i2, i3);
      }

      // 3) TRANCHES (anneau) : du contour extérieur (z=-bvZ) au fond (z=-D). Finition bordure.
      //  étirée = bord constant ; miroir = réflexion (rentre) ; pliée = continuité du débord (sort).
      const sideUV = (p, df) => {
        const e = artUV(p.x, p.y);
        const sx = p.nx * mU, sy = p.ny * mV;
        if (mode === 'stretch') return e;
        if (mode === 'mirror') return [e[0] - sx * df, e[1] - sy * df];
        return [e[0] + sx * df, e[1] + sy * df];
      };
      for (let i = 0; i < N; i++) {
        const a = rim[i];
        const b = rim[(i + 1) % N];
        const na = [a.nx, a.ny, 0];
        const nb = [b.nx, b.ny, 0];
        const i0 = pushVert([a.x, a.y, -bvZ], sideUV(a, 0), na, sUse);
        const i1 = pushVert([b.x, b.y, -bvZ], sideUV(b, 0), nb, sUse);
        const i2 = pushVert([b.x, b.y, -D], sideUV(b, 1), nb, sUse);
        const i3 = pushVert([a.x, a.y, -D], sideUV(a, 1), na, sUse);
        idx.push(i0, i1, i2, i0, i2, i3);
      }

      if (this.geo) {
        gl.deleteBuffer(this.geo.posBuf);
        gl.deleteBuffer(this.geo.uvBuf);
        gl.deleteBuffer(this.geo.fabBuf);
        gl.deleteBuffer(this.geo.norBuf);
        gl.deleteBuffer(this.geo.useBuf);
        gl.deleteBuffer(this.geo.idxBuf);
      }
      this.geo = {
        count: idx.length,
        posBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(pos)),
        uvBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(uv)),
        fabBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(fab)),
        norBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(nor)),
        useBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(use)),
        idxBuf: this.makeBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx)),
      };

      // ===== CADRE (caisse américaine) : 4 barres en ONGLET autour de la toile, séparées
      //       par un ÉCART (renfoncement = effet flottant), avec profondeur enveloppant la
      //       toile. Rendu dans une passe séparée (couleur de cadre, sans grain de toile). =====
      let frameOuterW = halfW;
      let frameOuterH = halfH;
      if (this.frameGeo) {
        gl.deleteBuffer(this.frameGeo.posBuf);
        gl.deleteBuffer(this.frameGeo.uvBuf);
        gl.deleteBuffer(this.frameGeo.fabBuf);
        gl.deleteBuffer(this.frameGeo.norBuf);
        gl.deleteBuffer(this.frameGeo.useBuf);
        gl.deleteBuffer(this.frameGeo.idxBuf);
        this.frameGeo = null;
      }
      if (frameColorFromLabel(this.state.frame)) {
        const minHalf = Math.min(halfW, halfH);
        const G = minHalf * SCENE.frameGapRatio; // écart toile <-> cadre
        const FW = minHalf * SCENE.frameWidthRatio; // largeur de la face du cadre
        const iW = halfW + G, iH = halfH + G; // bord intérieur (le trou)
        const oW = iW + FW, oH = iH + FW; // bord extérieur
        const Zf = SCENE.frameProud; // face avant du cadre (dépasse la toile)
        const zb = -(D + 0.005); // arrière du cadre (enveloppe la toile)
        frameOuterW = oW;
        frameOuterH = oH;
        const fpos = [], fuv = [], ffab = [], fnor = [], fuse = [], fidx = [];
        const isWoodFrame = !!frameWoodTexKey(this.state.frame); // chêne/noyer -> texture bois RGB
        const pushF = (v, n, fb) => {
          const base = fpos.length / 3;
          for (let i = 0; i < 4; i++) {
            fpos.push(v[i][0], v[i][1], v[i][2]);
            const f = fb ? fb[i] : [0, 0];
            fuv.push(f[0], f[1]); // UV le long des barres -> bois RGB (uTex) si bois
            ffab.push(f[0], f[1]); // idem -> satiné gris (uFabric) si argent
            fnor.push(n[0], n[1], n[2]);
            fuse.push(isWoodFrame ? 1 : 0); // 1 = échantillonne le bois RGB ; 0 = couleur plate
          }
          fidx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };
        const cham = FW * 0.16; // petit chamfer -> bords avant adoucis (comme le biseau toile)
        const Zc = Zf - cham; // pied du chamfer
        const S = Math.SQRT1_2;
        const rectC = (hw, hh) => [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]; // BL,BR,TR,TL
        const O = rectC(oW, oH); // contour extérieur
        const Oc = rectC(oW - cham, oH - cham); // bord avant extérieur (rentré du chamfer)
        const Ir = rectC(iW, iH); // contour intérieur (le trou)
        const Ic = rectC(iW + cham, iH + cham); // bord avant intérieur
        const TL = rectC(halfW, halfH); // contour de la toile -> pour le plancher du renfoncement
        // Normales par barre (0=bas, 1=droite, 2=haut, 3=gauche).
        const NRM = {
          front: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
          outWall: [[0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0]],
          inWall: [[0, 1, 0], [-1, 0, 0], [0, -1, 0], [1, 0, 0]],
          outCham: [[0, -S, S], [S, 0, S], [0, S, S], [-S, 0, S]],
          inCham: [[0, S, S], [-S, 0, S], [0, -S, S], [S, 0, S]],
        };
        // Anneau de 4 trapèzes mitrés : contour intérieur (zIn) -> extérieur (zOut).
        const WS = 1.6; // échelle du grain de bois
        const ring = (inC, zIn, outC, zOut, nrm) => {
          for (let k = 0; k < 4; k++) {
            const a = k, b = (k + 1) % 4;
            const verts = [
              [inC[a][0], inC[a][1], zIn],
              [inC[b][0], inC[b][1], zIn],
              [outC[b][0], outC[b][1], zOut],
              [outC[a][0], outC[a][1], zOut],
            ];
            // Grain le long de la barre : haut/bas (k=0,2) -> grain selon x ; gauche/droite
            // (k=1,3) -> grain selon y. V (2e coord) = axe du grain de la texture bois.
            const horiz = k === 0 || k === 2;
            const isWall = Math.abs(nrm[k][2]) < 0.5; // mur (normale ~horizontale)
            // V = le long de la barre (grain) ; U = largeur EN PLAN (faces) ou PROFONDEUR z
            // (murs) -> supprime l'étirement de la texture sur les côtés.
            const fb = verts.map((p) => {
              const along = horiz ? p[0] : p[1];
              const cross = isWall ? p[2] : horiz ? p[1] : p[0];
              return [cross * WS, along * WS];
            });
            pushF(verts, nrm[k], fb);
          }
        };
        ring(Ic, Zf, Oc, Zf, NRM.front); // face avant (entre les deux chamfers)
        ring(Oc, Zf, O, Zc, NRM.outCham); // chamfer extérieur (bord adouci)
        ring(O, Zc, O, zb, NRM.outWall); // mur extérieur (profondeur)
        ring(Ic, Zf, Ir, Zc, NRM.inCham); // chamfer intérieur (bord adouci)
        ring(Ir, Zc, Ir, zb, NRM.inWall); // mur intérieur (renfoncement)
        ring(TL, zb, Ir, zb, NRM.front); // PLANCHER du renfoncement -> couleur cadre (fini le blanc)
        this.frameGeo = {
          count: fidx.length,
          posBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(fpos)),
          uvBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(fuv)),
          fabBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(ffab)),
          norBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(fnor)),
          useBuf: this.makeBuffer(gl.ARRAY_BUFFER, new Float32Array(fuse)),
          idxBuf: this.makeBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fidx)),
        };
      }

      // Quad d'ombre : épouse le contour EXTÉRIEUR (toile seule, ou cadre s'il est présent).
      const sM = SCENE.shadowMargin;
      const zS = 0;
      this.shadowZ = -(D + 0.02); // tout proche derrière -> ombre de contact serrée
      const sw = frameOuterW + sM;
      const sh = frameOuterH + sM;
      if (this.shadowBuf) gl.deleteBuffer(this.shadowBuf);
      this.shadowBuf = this.makeBuffer(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -sw, -sh, zS, sw, -sh, zS, sw, sh, zS,
          -sw, -sh, zS, sw, sh, zS, -sw, sh, zS,
        ]),
      );
      this.halfW = halfW; // demi-dimensions de la toile (face avant) -> cadrage sur le coin
      this.halfH = halfH;
      this.shadowHalf = [frameOuterW, frameOuterH];
      this.shadowRadius = r;

      this.geoKey =
        mode + '|' + (this.state.frame || 'none') + '|' + (this.sizeW || 0) + 'x' + (this.sizeH || 0);
    }

    makeBuffer(target, data) {
      const gl = this.gl;
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    }

    resize() {
      const gl = this.gl;
      // dpr CAPÉ à 2 : au-delà (mobile dpr3), le sur-échantillonnage fait exploser le
      // backbuffer (~10 Mpx) pour un rendu quasi statique, sans gain visible -> coût
      // fillrate du 1er paint ET de chaque frame de drag (INP).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ss = dpr * SCENE.supersample; // SSAA réduit en bilinéaire 2x par le navigateur
      // Taille CSS via le cache du ResizeObserver -> JAMAIS de lecture de layout ici
      // (sinon forced reflow à chaque frame). clientWidth seulement en repli 1er passage.
      const cw = this._cssW || this.canvas.clientWidth;
      const ch = this._cssH || this.canvas.clientHeight;
      const w = Math.min(2400, Math.max(1, Math.round(cw * ss)));
      const h = Math.min(2400, Math.max(1, Math.round(ch * ss)));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    scheduleRender() {
      if (!this.ready) return;
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.render();
      });
    }

    render() {
      const gl = this.gl;
      if (!gl || !this.geo) return;
      // Bordure, CADRE et taille changent la géométrie -> reconstruire au besoin.
      const key =
        this.state.border + '|' + (this.state.frame || 'none') + '|' + (this.sizeW || 0) + 'x' + (this.sizeH || 0);
      if (this.geoKey !== key) this.buildGeometry();
      this.resize();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = this.canvas.width / this.canvas.height || 1;
      const proj = M.perspective(SCENE.fovY, aspect, 0.1, 10);
      const view = M.translate(0, 0, -SCENE.camDist);
      // Inclinaison/zoom = base + glisser (drag) + animation de mise en lumière.
      const effPitch = SCENE.pitch + this.pitchOffset + this.hlPitch;
      const effYaw = SCENE.yaw + this.yawOffset + this.hlYaw;
      const effScale = this.scale * this.hlZoom;
      let model = M.multiply(M.rotateX(effPitch), M.rotateY(effYaw));
      model = M.multiply(model, M.scale(effScale));
      const viewModel = M.multiply(view, model);
      // Recadrage animé sur le coin ciblé : on l'amène au centre en translatant en espace
      // caméra (proportionnel à hlFocus) -> "zoom sur la tranche" pédagogique.
      let projF = proj;
      if (this.hlFocus > 0 && this.halfW) {
        const corner = [
          this.halfW * SCENE.highlightCorner[0],
          this.halfH * SCENE.highlightCorner[1],
          0,
          1,
        ];
        const cv = M.mulVec4(viewModel, corner);
        projF = M.multiply(proj, M.translate(-cv[0] * this.hlFocus, -cv[1] * this.hlFocus, 0));
      }
      const mvp = M.multiply(projF, viewModel);

      // 0) OMBRE PORTÉE — dessinée en fond, SANS depth-test : sinon le plan d'ombre
      //    fronto-parallèle coupe la toile inclinée (sa moitié arrière passe derrière).
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      if (this.shadowProgram && this.shadowBuf) {
        // Ombre solidaire de la toile : MÊME rotation que le tableau, posée juste derrière
        // et légèrement décalée (lumière) -> elle suit parfaitement les mouvements.
        const sT = M.translate(SCENE.shadowLocal[0], SCENE.shadowLocal[1], -SCENE.shadowGap);
        const sMvp = M.multiply(M.multiply(projF, viewModel), sT);
        gl.useProgram(this.shadowProgram);
        // L'ombre n'utilise que aPos : on désactive les attributs du programme principal
        // (restés activés entre frames) -> évite "no buffer bound to enabled attribute".
        [this.locs.aUV, this.locs.aFabUV, this.locs.aNormal, this.locs.aUseTex].forEach(
          (l) => { if (l >= 0) gl.disableVertexAttribArray(l); },
        );
        gl.uniformMatrix4fv(this.sLocs.uMVP, false, sMvp);
        gl.uniform2fv(this.sLocs.uHalf, this.shadowHalf);
        gl.uniform1f(this.sLocs.uRadius, this.shadowRadius);
        gl.uniform2f(this.sLocs.uOffset, 0, 0); // décalage déjà appliqué par la matrice
        gl.uniform1f(this.sLocs.uPenumbra, SCENE.shadowPenumbra);
        gl.uniform1f(this.sLocs.uOpacity, SCENE.shadowOpacity);
        gl.uniform3fv(this.sLocs.uShadowColor, SCENE.shadowColor);
        this.bindAttrib(this.sLocs.aPos, this.shadowBuf, 3);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);

      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.locs.uMVP, false, mvp);
      gl.uniformMatrix4fv(this.locs.uModel, false, model);
      gl.uniform3fv(this.locs.uLightDir, SCENE.lightDir);
      gl.uniform1f(this.locs.uAmbient, SCENE.ambient);
      gl.uniform1f(this.locs.uDiffuse, SCENE.diffuse);

      const col = BORDER_COLOR[this.state.border] || BORDER_COLOR.white;
      gl.uniform3fv(this.locs.uSideColor, col);
      gl.uniform1f(this.locs.uWeaveAmt, SCENE.weaveAmt);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.locs.uTex, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.fabricTex);
      gl.uniform1i(this.locs.uFabric, 1);

      this.bindAttrib(this.locs.aPos, this.geo.posBuf, 3);
      this.bindAttrib(this.locs.aUV, this.geo.uvBuf, 2);
      this.bindAttrib(this.locs.aFabUV, this.geo.fabBuf, 2);
      this.bindAttrib(this.locs.aNormal, this.geo.norBuf, 3);
      this.bindAttrib(this.locs.aUseTex, this.geo.useBuf, 1);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.geo.idxBuf);
      gl.drawElements(gl.TRIANGLES, this.geo.count, gl.UNSIGNED_SHORT, 0);

      // CADRE (caisse américaine) : même programme, couleur de cadre, SANS grain de toile.
      if (this.frameGeo) {
        const woodKey = frameWoodTexKey(this.state.frame);
        if (woodKey) {
          // Cadre TEXTURÉ (bois ou argent brossé) : on échantillonne sa texture RGB (use=1).
          const ftex = this.ensureFrameTex(woodKey);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, ftex);
          gl.uniform1i(this.locs.uTex, 0);
          gl.uniform1f(this.locs.uWeaveAmt, 0.0); // la texture RGB porte couleur + grain
        } else {
          // blanc / noir : couleur plate mate (use=0).
          gl.uniform3fv(this.locs.uSideColor, frameColorFromLabel(this.state.frame) || [0.5, 0.5, 0.5]);
          gl.uniform1f(this.locs.uWeaveAmt, 0.0);
        }
        this.bindAttrib(this.locs.aPos, this.frameGeo.posBuf, 3);
        this.bindAttrib(this.locs.aUV, this.frameGeo.uvBuf, 2);
        this.bindAttrib(this.locs.aFabUV, this.frameGeo.fabBuf, 2);
        this.bindAttrib(this.locs.aNormal, this.frameGeo.norBuf, 3);
        this.bindAttrib(this.locs.aUseTex, this.frameGeo.useBuf, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.frameGeo.idxBuf);
        gl.drawElements(gl.TRIANGLES, this.frameGeo.count, gl.UNSIGNED_SHORT, 0);
      }

      // 1er rendu réussi -> transition fluide de l'<img> brute vers le WebGL.
      if (!this._revealed) {
        this._revealed = true;
        this.reveal();
      }
    }

    /* Transition premium : l'<img> brute (LCP + indexable) se fond dans le rendu WebGL.
       Elle "se soulève" en perspective (yaw + échelle de la toile) pendant que le canvas
       apparaît, puis reste dans le DOM à opacity:0 (toujours indexable par Google). */
    reveal() {
      const isPopup = this.getAttribute('data-context') === 'popup';
      const poster =
        (this.parentElement && this.parentElement.querySelector('.persp-poster')) || null;
      const reduce =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // 1 frame de plus : garantit que le 1er rendu WebGL est présenté avant le fondu.
      requestAnimationFrame(() => {
        // Gros plan (ou reduced-motion) : pas d'animation -> sinon la transition se rejoue
        // à chaque ouverture du popup (instance recréée à chaque fois). Affichage direct.
        if (isPopup || reduce) {
          this.canvas.style.transition = 'none';
          this.canvas.classList.remove('opacity-0');
          if (poster) poster.style.opacity = '0';
          return;
        }
        this.canvas.classList.remove('opacity-0');
        if (!poster) return;
        poster.style.transition = 'opacity 550ms ease, transform 550ms ease';
        poster.style.transformOrigin = 'center';
        poster.style.transform =
          'perspective(1100px) rotateY(' + SCENE.yaw + 'rad) scale(' + this.scale + ')';
        poster.style.opacity = '0';
      });
    }

    bindAttrib(loc, buf, size) {
      if (loc < 0) return;
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
  }

  if (!customElements.get('perspective-canvas')) {
    customElements.define('perspective-canvas', PerspectiveCanvas);
  }
})();
