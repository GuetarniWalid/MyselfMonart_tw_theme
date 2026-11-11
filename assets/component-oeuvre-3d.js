/*
 * component-oeuvre-3d.js — <oeuvre-3d>, la scène de la fiche d'œuvre (fiche-3d, tickets 07, 12 et 14)
 * ----------------------------------------------------------------------------------------------
 * Porté de la maquette validée par Walid le 10/11/2026 (version 26, .scratch/fiche-3d/prototype :
 * src/maquette.js). Balisage : snippets/oeuvre-3d-stage.liquid, rendu par sections/main-product.liquid
 * quand le modèle de page demande la scène 3D (réglage media_display). Les options sont les chips
 * d'assets/oeuvre-3d-chips.js, posées autour de l'œuvre ; le moteur est assets/oeuvre-3d-engine.js.
 *
 * L'œuvre occupe l'écran sous l'en-tête. La photo d'arrivée est à la place exacte de l'œuvre de face,
 * en CSS dès la première image (input.css). Au premier geste du visiteur, ou 8 s après le chargement,
 * three.js et le moteur se téléchargent, tout se prépare derrière la photo, puis la 3D apparaît en
 * fondu sans rien décaler. Toucher une légende ouvre sa rangée et la 3D joue aussitôt la mise en scène
 * du groupe, avec le choix en cours ; toucher un choix l'applique (le prix change aussitôt) et la 3D
 * joue sa mise en scène, rangée ouverte. Un toucher en dehors, ou Échap, ferme la rangée et ramène
 * l'œuvre de face. La Taille se montre avec une femme à côté du tableau (photos chargées à la première
 * ouverture de la Taille).
 *
 * Les vraies données : les chips lisent un modèle du produit (snippets/oeuvre-3d-model.liquid :
 * variantes, prix, handles des bordures et des cadres, couleurs de cadre du poster, contour blanc).
 * Un choix coche les radios du sélecteur de la fiche, caché sur ce modèle de page : le bouton d'achat,
 * l'adresse ?variant=, les propriétés de ligne du poster et l'événement mma:selection-change
 * (assets/product-selection.js) restent ceux de toutes les fiches. La pilule d'achat ajoute au panier
 * par le bloc d'achat (main-product-blocks).
 * Le poster jumeau (métachamps link.poster / link.painting) : toucher « Poster » joue l'acte de la 3D
 * tout de suite, puis la fiche du jumeau remplace la page (assets/product-twin-toggle.js) ; cet
 * élément y passe tel quel, avec sa 3D (adopt), sans la recharger.
 *
 * Sans 3D (animations réduites, économie de données, appareil faible, WebGL absent ou perdu) : la
 * photo reste, les chips aussi (prix et choix), et les autres photos du produit se passent une à une,
 * en simples fondus (décision 5).
 *
 * L'état se lit sur l'élément : data-state = arrival, 3d ou photos (le repli). Pour les vérifications,
 * element.probe donne le directeur, les chips et de quoi rendre une image à un instant donné.
 * Le calcul pur est testé : scripts/oeuvre-3d-stage.test.cjs et scripts/oeuvre-3d-catalog.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------

  const slowNetwork = ({ saveData, effectiveType }) => !!saveData || /2g/.test(effectiveType || '');

  // env : voir environment(). Une valeur absente ne dit rien : Safari ne donne ni mémoire ni réseau.
  function stageMode(env) {
    const weakDevice = (env.deviceMemory && env.deviceMemory <= 2) || (env.cores && env.cores <= 2);
    return env.reducedMotion || slowNetwork(env) || weakDevice || !env.webgl2 ? 'photos' : '3d';
  }

  // La source complète des gros plans pèse près d'un Mo : pas sur un réseau lent.
  const wantsDetail = (env) => !slowNetwork(env) && !/3g/.test(env.effectiveType || '');

  /* Le catalogue de la boutique, tel que le rend snippets/oeuvre-3d-model.liquid (un par produit :
     la fiche et son jumeau) :
       material   'toile' ou 'poster'
       sizes      valeurs de l'option 1 (« 30x40 cm »)
       borders    toile : [valeur de l'option 2, handle du métaobjet bordure]
       frames     toile : [valeur de l'option 3, handle du métaobjet cadre]
       frameModes poster : valeurs de l'option 2, sans cadre puis avec cadre
       frameColors poster : [nom, handle] des couleurs de cadre (propriété de ligne)
       passe      poster : le contour blanc (propriété de ligne) est proposé
       variants   [id, option1, option2, option3, prix en centimes, disponible]
     Les handles sont les mêmes dans toutes les langues : ils donnent la matière du moteur. */
  const BORDER_IDS = {
    'bordure-blanche': 'blanche',
    'bordure-noire': 'noire',
    'bordure-etiree': 'etiree',
    'bordure-moroir': 'miroir', // « moroir » : c'est bien le handle de la boutique
    'bordure-miroir': 'miroir',
    'bordure-pliee': 'pliee',
  };
  const FRAME_IDS = {
    'sans-cadre': 'sans',
    'cadre-blanc': 'blanc',
    'cadre-noir-mat': 'noir',
    'cadre-argent-ancien': 'argent',
    'cadre-chene-clair': 'chene',
    'cadre-noyer': 'noyer',
  };

  // Option de taille de la boutique (« 30x40 cm ») -> taille du moteur (« 30x40 ») ; null si ce n'en est pas une.
  function sizeIdOf(value) {
    const match = /(\d+)\s*[x×]\s*(\d+)/i.exec(value || '');
    return match ? `${match[1]}x${match[2]}` : null;
  }
  const borderIdOf = (key) => BORDER_IDS[key] || null;
  // Les couleurs du poster ont leurs propres métaobjets : « cadre-noir-mat-1 ».
  const frameIdOf = (key) => FRAME_IDS[key] || FRAME_IDS[String(key || '').replace(/-\d+$/, '')] || null;
  const dimensions = (id) => {
    const [w, h] = id.split('x').map(Number);
    return { w, h };
  };

  // Les tailles du produit, dans leur ordre et sans doublon.
  const sizesOf = (model) => [...new Set(model.sizes.map(sizeIdOf).filter(Boolean))];

  // Les valeurs de la boutique pour un produit du moteur.
  function valuesOf(model, product) {
    const size = model.sizes.find((value) => sizeIdOf(value) === product.size);
    if (model.material === 'poster') {
      const color = model.frameColors.find(([, key]) => frameIdOf(key) === product.frame);
      return { size, mode: model.frameModes[product.frame === 'sans' ? 0 : 1], color };
    }
    const border = model.borders.find(([, key]) => borderIdOf(key) === product.border);
    const frame = model.frames.find(([, key]) => frameIdOf(key) === product.frame);
    return { size, border: border && border[0], frame: frame && frame[0] };
  }

  // La variante d'un produit du moteur : { id, price (centimes), available }, ou null.
  function variantOf(model, product) {
    const values = valuesOf(model, product);
    if (model.material === 'poster' && product.frame !== 'sans' && !values.color) return null;
    const found = model.variants.find((v) => (model.material === 'poster'
      ? v[1] === values.size && v[2] === values.mode
      : v[1] === values.size && v[2] === values.border && v[3] === values.frame));
    return found ? { id: found[0], price: found[4], available: !!found[5] } : null;
  }

  /* L'adaptateur que les chips attendent (assets/oeuvre-3d-chips.js), sur les vraies variantes :
     models : { toile, poster } (la fiche et son jumeau, s'il est publié) ; names : les noms courts des
     chips, traduits (sections.mma.oeuvre_3d_names). Les règles de la boutique : un cadre qui n'existe
     pas pour une taille repasse sans cadre ; la toile passe au poster à la même taille, avec le même
     cadre s'il existe, et le contour blanc par défaut, comme sur la fiche du poster. */
  function catalogOf({ models, names }) {
    const materials = ['toile', 'poster'].filter((m) => models[m]);
    const modelOf = (product) => models[product.material] || models[materials[0]];
    const sold = (product) => {
      const variant = variantOf(modelOf(product), product);
      return !!variant && variant.available;
    };
    const fit = (product) => (product.frame === 'sans' || sold(product) ? product : { ...product, frame: 'sans' });
    const framesOf = (model) => (model.material === 'poster'
      ? ['sans', ...model.frameColors.map(([, key]) => frameIdOf(key)).filter(Boolean)]
      : model.frames.map(([, key]) => frameIdOf(key)).filter(Boolean));
    const named = (group, ids) => ids.map((id) => ({ id, name: names[group][id], spoken: names[group][id] }));
    // Une taille se fait-elle encadrée, dans l'une des matières ?
    const canFrame = (size) => materials.some((material) => framesOf(models[material]).some((frame) =>
      frame !== 'sans' && sold({ material, size, border: 'blanche', frame })));

    function switchTo(product, material) {
      if (material === product.material || !models[material]) return product;
      const model = models[material];
      const sizes = sizesOf(model);
      return fit({
        ...product,
        material,
        size: sizes.includes(product.size) ? product.size : sizes[0],
        frame: framesOf(model).includes(product.frame) ? product.frame : 'sans',
        passe: material === 'poster' && !!model.passe,
      });
    }

    const catalog = {
      side: (product) => (product.material === 'poster' ? 'passe' : 'border'),
      options(group, product) {
        const model = modelOf(product);
        switch (group) {
          case 'material': return named('material', materials);
          case 'size': return sizesOf(model).map((id) => ({ id, name: id.replace('x', ' × '), spoken: `${id.replace('x', ' × ')} cm` }));
          case 'border': return named('border', model.material === 'toile' ? model.borders.map(([, key]) => borderIdOf(key)).filter(Boolean) : []);
          case 'passe': return ['sans', 'avec'].map((id) => ({ id, name: names.passe[id], spoken: names.passeSpoken[id] }));
          default: return named('frame', framesOf(model));
        }
      },
      value: (group, product) => (group === 'passe' ? (product.passe ? 'avec' : 'sans') : product[group]),
      apply(group, product, id) {
        if (group === 'material') return switchTo(product, id);
        return fit({ ...product, [group]: group === 'passe' ? id === 'avec' : id });
      },
      available(group, product, id) {
        if (group === 'material') return !!models[id];
        return sold(group === 'frame' ? { ...product, frame: id } : catalog.apply(group, product, id));
      },
      price(product) {
        const variant = variantOf(modelOf(product), product);
        return variant ? variant.price / 100 : NaN;
      },
      base: (group) => (group === 'border' ? 'blanche' : 'sans'),
      size: dimensions,
      framed: (product) => product.frame !== 'sans',
      canFrame,
      unframedSize: () => sizesOf(models[materials[0]]).filter((size) => !canFrame(size)).map((size) => size.replace('x', ' × ')).join(', '),
      models,
    };
    return catalog;
  }

  /* Du choix de la fiche (détail de mma:selection-change, assets/product-selection.js) au produit du
     moteur. Poster : la couleur du cadre et le contour blanc sont des propriétés de ligne ; il n'a pas de
     bordure, il garde celle du produit montré avant (previous), pour un retour à la toile. */
  function productFromSelection(model, selection, previous = null) {
    const option = (kind) => selection.options.find((o) => o.kind === kind) || {};
    const size = sizeIdOf(option('size').value) || sizesOf(model)[0];
    if (model.material === 'poster') {
      const frame = (selection.frameColor && frameIdOf(selection.frameColor.key)) || 'sans';
      return { material: 'poster', size, border: previous ? previous.border : 'blanche', frame, passe: !!selection.whiteBorder };
    }
    return {
      material: 'toile',
      size,
      border: borderIdOf(option('border').key) || 'blanche',
      frame: frameIdOf(option('frame').key) || 'sans',
      passe: false,
    };
  }

  /* Les radios du sélecteur de la fiche (snippets/painting-variant-picker.liquid) qui donnent ce
     produit, dans l'ordre où les cocher : la taille d'abord (elle décide des cadres disponibles). */
  function choiceInputs(model, product) {
    const values = valuesOf(model, product);
    if (model.material === 'poster') {
      const frame = product.frame === 'sans' || !values.color
        ? { frameMode: 'none' }
        : { frameMode: 'framed', colorHandle: values.color[1] };
      return [{ name: 'option1', value: values.size }, frame, ...(model.passe ? [{ whiteBorder: product.passe ? 'on' : 'off' }] : [])];
    }
    return [
      { name: 'option1', value: values.size },
      { name: 'option2', value: values.border },
      { name: 'option3', value: values.frame },
    ];
  }

  /* ---- Les gestes sur la scène (zoom sur l'œuvre) ---- */

  /* Ce que font les doigts posés. fingers : leur nombre ; on : où ils se sont posés, la 3D ('canvas') ou
     le voile d'une rangée ouverte ('closer') ; zoomed : l'œuvre est zoomée ; front : la 3D est de face,
     au repos, sans rangée ouverte ni transition ; shot : son plan. Rend 'tilt' (incliner le tableau,
     comme avant), 'pan' (déplacer l'œuvre zoomée), 'pinch' (zoomer), 'dismiss' (pincer pour revenir de
     face, comme un toucher en dehors : retour de Walid du 11/11, « elle voulait revenir en dézoomant »)
     ou 'none'. Un toucher du voile reste un clic, qui ferme la rangée. */
  function gestureOf({ fingers, on, zoomed, front, shot }) {
    if (on === 'closer') return fingers >= 2 ? 'dismiss' : 'none';
    if (fingers >= 2) {
      if (front) return 'pinch';
      return shot === 'front' ? 'none' : 'dismiss';
    }
    return zoomed ? 'pan' : 'tilt';
  }

  // Pincer pour revenir de face : les doigts se sont rapprochés de 15 % de leur écart du début.
  const PINCH_DISMISS = 0.85;
  const pinchDismisses = (startSpread, spread) => spread <= PINCH_DISMISS * startSpread;

  // Un toucher : le second d'un double toucher s'il suit le précédent de près, dans le temps et l'espace.
  const DOUBLE_TAP = { ms: 320, px: 40 };
  const tapKind = (previous, tap) => (previous && tap.at - previous.at <= DOUBLE_TAP.ms &&
    Math.hypot(tap.x - previous.x, tap.y - previous.y) <= DOUBLE_TAP.px ? 'double' : 'single');

  /* La molette, en facteur d'échelle. Avec Ctrl, c'est le pincement du pavé tactile : chaque événement
     vaut exp(−deltaY / 100), comme les doigts eux-mêmes, borné à 25 px par événement. Sans Ctrl (l'œuvre
     zoomée), 18 % par cran de souris de 100 px, borné à un cran ; un cran (40 px et plus) glisse, le
     défilement continu du pavé tactile suit tel quel. deltaMode : 1 en lignes (Firefox, 16 px chacune),
     2 en pages (400 px). */
  const WHEEL = { line: 16, page: 400, pinchStep: 25, pinchPerPx: 0.01, notchStep: 100, notchPerPx: 0.002, notch: 40 };
  function wheelStep({ deltaY, deltaMode, ctrlKey }) {
    const px = deltaY * (deltaMode === 1 ? WHEEL.line : deltaMode === 2 ? WHEEL.page : 1);
    const bounded = (cap) => Math.max(-cap, Math.min(cap, px));
    if (ctrlKey) return { factor: Math.exp(-bounded(WHEEL.pinchStep) * WHEEL.pinchPerPx), glide: false };
    return { factor: Math.exp(-bounded(WHEEL.notchStep) * WHEEL.notchPerPx), glide: Math.abs(px) >= WHEEL.notch };
  }

  // Node (tests) : seul le calcul pur est exporté.
  if (typeof window === 'undefined') {
    module.exports = {
      stageMode, wantsDetail, catalogOf, productFromSelection, choiceInputs, variantOf, sizesOf,
      gestureOf, pinchDismisses, tapKind, wheelStep,
    };
    return;
  }

  // ---- Navigateur ------------------------------------------------------------------------------

  // La bascule toile/poster peut recharger ce script.
  if (customElements.get('oeuvre-3d')) return;

  function environment() {
    const connection = navigator.connection || {};
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      saveData: connection.saveData,
      effectiveType: connection.effectiveType,
      deviceMemory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
      webgl2: 'WebGL2RenderingContext' in window,
    };
  }

  /* Le démarrage de la 3D : au premier geste, les mêmes que pour PostHog (assets/posthog-tracking.js),
     avec un filet pour qui regarde sans toucher (Lighthouse comptait 460 ms de blocage de plus sans
     cette attente, ticket 07). Ouvrir une rangée la démarre aussitôt. */
  const QUIET_AFTER_LOAD_MS = 8000;
  const GESTURES = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown'];

  function whenWanted(task) {
    if (document.readyState === 'complete') {
      whenIdle(task);
      return () => {};
    }
    let timer = 0;
    let wanted = false;
    const go = () => {
      if (wanted) return;
      wanted = true;
      clearTimeout(timer);
      GESTURES.forEach((type) => window.removeEventListener(type, go, true));
      whenIdle(task);
    };
    GESTURES.forEach((type) => window.addEventListener(type, go, { capture: true, passive: true }));
    window.addEventListener('load', () => { if (!wanted) timer = setTimeout(go, QUIET_AFTER_LOAD_MS); }, { once: true });
    return () => {
      wanted = true;
      clearTimeout(timer);
      GESTURES.forEach((type) => window.removeEventListener(type, go, true));
    };
  }

  /* Le choix de la fiche (assets/product-selection.js, window.MMASelection) : son script, différé comme
     celui-ci, vient plus bas dans la page et s'exécute après lui. On l'attend pour lire le choix d'arrivée
     (?variant= d'un lien Google Shopping, d'un e-mail, d'un rechargement) : tous les scripts différés ont
     tourné quand DOMContentLoaded part ; load sert de filet si celui-ci est déjà passé. */
  function whenSelection(task) {
    if (window.MMASelection || document.readyState === 'complete') {
      task();
      return;
    }
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      document.removeEventListener('DOMContentLoaded', once);
      window.removeEventListener('load', once);
      task();
    };
    document.addEventListener('DOMContentLoaded', once);
    window.addEventListener('load', once);
  }

  // Ne pas disputer le processeur à la page : on attend la fin du chargement et un creux, avec une
  // minuterie de secours (Safari n'a pas requestIdleCallback, d'autres le retardent).
  function whenIdle(task) {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      task();
    };
    const go = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(once, { timeout: 1500 });
      setTimeout(once, 'requestIdleCallback' in window ? 2000 : 200);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function imageLoaded(image) {
    return new Promise((resolve, reject) => {
      if (image.complete) {
        if (image.naturalWidth) resolve();
        else reject(new Error('image de la scène absente'));
        return;
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', reject, { once: true });
    });
  }

  const fullUrl = (url) => new URL(url, window.location.href).href;
  // Une donnée illisible vaut une donnée absente : la fiche garde alors sa photo, sans 3D ni chips.
  const readJson = (root, selector) => {
    const node = root.querySelector(selector);
    try {
      return node ? JSON.parse(node.textContent) : null;
    } catch (error) {
      return null;
    }
  };
  const sameProduct = (a, b) => Object.keys(a).every((key) => a[key] === b[key]);
  // Seulement ce qui change : un texte réécrit à l'identique relance styles et mise en page.
  const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

  /* Le directeur cadre pour un écran de forme `aspect` ; la page le décale : le canvas, plus haut que
     la scène, est centré sur l'œuvre, et son angle de vue grandit d'autant (fovScale). C'est un
     décentrement d'objectif : à l'écran, rien d'autre ne bouge. */
  function lensShift(view, fovScale) {
    if (fovScale === 1) return view;
    const fovY = 2 * Math.atan(Math.tan(view.camera.fovY / 2) * fovScale);
    return { ...view, camera: { ...view.camera, fovY } };
  }

  /* Le travail lourd (la source complète des gros plans, la pose suivante : décodage et envoi à la
     carte graphique) attend le repos, après le retour des légendes et de leurs plaques (leur fondu et
     leur flou) : jamais pendant un trajet ni pendant ce retour (version 25). */
  const AFTER_LEGENDS_MS = 650;

  /* Zoom : l'œuvre zoomée immobile depuis TILE_IDLE_MS, sa pièce de détail part au CDN. TILE_PIXELS : le
     budget de mémoire d'une pièce (13 Mo, 17 avec ses mipmaps ; un téléphone au plus fort du zoom en
     demande 2,6 millions) ; TILE_SIDE : son plus grand côté, sous la limite de la carte graphique.
     WHEEL_PAUSE_MS : la pause de la molette qui rend la page à son défilement, revenue à ×1 ; elle marque
     aussi le début d'une nouvelle rafale. */
  const TILE_IDLE_MS = 150;
  const TILE_PIXELS = 3.2e6;
  const TILE_SIDE = 8192;
  const WHEEL_PAUSE_MS = 300;
  const WHEEL_GLIDE_MS = 160; // un cran de souris glisse vers sa nouvelle échelle

  class Oeuvre3d extends HTMLElement {
    connectedCallback() {
      // Déplacé tel quel par la bascule toile/poster (adopt) : rien ne s'arrête, rien ne recommence.
      if (this.started) {
        this.moved = true;
        return;
      }
      this.started = true;
      whenSelection(() => {
        if (this.isConnected) this.init();
      });
    }

    disconnectedCallback() {
      // Un déplacement reconnecte l'élément dans la même tâche : seul un vrai départ arrête la 3D.
      this.moved = false;
      queueMicrotask(() => {
        if (!this.isConnected && !this.moved) this.stop();
      });
    }

    init() {
      if (this.ready) return;
      this.ready = true;
      this.scene = this.querySelector('[data-scene]');
      this.art = this.querySelector('[data-art]');
      this.canvas = this.querySelector('[data-gl]');
      this.dims = this.querySelector('[data-dims]');
      this.dimWidth = this.querySelector('[data-dim-width]');
      this.dimHeight = this.querySelector('[data-dim-height]');
      this.frontButton = this.querySelector('[data-front]');
      this.liveRegion = this.querySelector('[data-live]');
      this.config = readJson(this, '[data-config]');
      this.readModels(this);
      if (!this.config || !this.model) return;
      this.env = environment();
      this.baseLabel = this.canvas.getAttribute('aria-label');
      this.session = {}; // disparaît quand la scène s'arrête : une suite asynchrone périmée se tait
      this.run = { active: false, times: [] }; // un vrai parcours : un choix ou un glisser
      this.densityCap = Infinity;
      this.zoneMove = { from: 0, to: 0, t0: 0, ms: 0 };
      this.zoneShift = 0;
      this.canvasOffset = 0;
      this.frontShown = true;
      this.size = { w: 1, h: 1, top: 0, glH: 1, free: { top: 0, left: 0 }, L: null };
      this.pendingTasks = [];
      /* Les doigts sur la scène (et la souris) : pointers, par identifiant ; fingers, les mêmes, dans
         l'ordre où ils se sont posés. gesture : ce qu'ils font (gestureOf), où ils se sont posés, s'ils
         ont été plusieurs, de combien ils ont bougé, leur écart au début d'un pincement de retour. */
      this.pointers = new Map();
      this.fingers = [];
      this.gesture = { mode: 'none', on: null, several: false, moved: 0, at: 0, spread: 0, done: false };
      this.spot = { x: 0, y: 0, spread: 0 }; // milieu et écart des doigts, réécrits (fingerSpot)
      this.lastTap = null;
      this.zoomLayout = null; // la mise en page du zoom (updateZoomLayout), relevée de face au repos
      this.tileLog = []; // les pièces de détail téléchargées : adresse, poids, durée
      this.wheel = { latched: false, last: 0, pinch: 1, pinchAt: 0, box: null, boxAt: 0 };
      this.touchCount = 0;

      this.fitTop();
      this.catalog = catalogOf({ models: this.models, names: this.config.names });
      this.product = this.readSelection() || this.defaultProduct();
      const texts = { ...this.config.texts, money: (euros) => this.money(Math.round(euros * 100)) };
      this.chips = window.Oeuvre3dChips.createChips({
        stage: this,
        scene: this.scene,
        catalog: this.catalog,
        product: this.product,
        texts,
        ratio: this.ratio(),
        reducedMotion: this.env.reducedMotion,
        onChoose: (group, id, next) => this.choose(group, next),
        onOpen: (group) => this.approach(group),
        onStage: (group) => this.stageOpened(group),
        onDismiss: () => this.goFront(),
      });
      this.bindPill();
      this.resizer = new ResizeObserver(this.onResize);
      this.resizer.observe(this);
      this.measure();
      this.setFront(false);
      this.refresh(window.MMASelection ? window.MMASelection.read() : null);
      document.addEventListener('mma:selection-change', this.onSelection);
      document.addEventListener('mma:soft-navigation', this.onSoftNavigation);
      document.addEventListener('mma:cart-count', this.onResize); // le bouton du panier change de largeur
      this.addEventListener('pointerdown', this.onApproach);
      this.art.addEventListener('load', this.onArtLoaded, { once: true });
      if (this.art.complete && this.art.naturalWidth) this.onArtLoaded();

      if (stageMode(this.env) === 'photos') {
        this.showPhotos();
        return;
      }
      this.listen3D();
      this.autoStart = true; // au repos, ou dès qu'une rangée s'ouvre (stageOpened)
      this.cancelWanted = whenWanted(this.start);
    }

    // Le modèle de la fiche et celui de son jumeau ; un modèle illisible laisse le précédent en place.
    readModels(root) {
      const model = readJson(root, '[data-model]');
      if (!model) return;
      const twin = readJson(root, '[data-twin]');
      this.model = model;
      this.models = { [model.material]: model };
      if (twin) this.models[twin.material] = twin;
    }

    // L'œuvre, largeur sur hauteur : celle de sa taille (le moteur la rend à ses mesures en cm).
    ratio() {
      const { w, h } = dimensions(sizesOf(this.model)[0] || '3x4');
      return w / h;
    }

    defaultProduct() {
      const sizes = sizesOf(this.model);
      return { material: this.model.material, size: sizes[0], border: 'blanche', frame: 'sans', passe: this.model.material === 'poster' && !!this.model.passe };
    }

    readSelection() {
      if (!window.MMASelection) return null;
      return productFromSelection(this.model, window.MMASelection.read(), this.product);
    }

    // Le prix de la boutique (Product.formatPrice, assets/layout-product.js.liquid) : 94 €, 62,50 €.
    money(cents) {
      if (typeof Product === 'function' && window.productPriceModel) return Product.formatPrice(cents);
      return window.Oeuvre3dChips.eur(cents / 100);
    }

    // La scène prend tout l'écran sous ce qui la précède (bandeau d'annonce, en-tête) : sa vraie place.
    fitTop() {
      const top = `${Math.round((this.getBoundingClientRect().top + window.scrollY) * 10) / 10}px`;
      if (document.documentElement.style.getPropertyValue('--oeuvre-3d-top') !== top) {
        document.documentElement.style.setProperty('--oeuvre-3d-top', top);
      }
    }

    /* ---- Arrêt ---- */

    // Arrête tout et rend tout à la carte graphique. La scène ne repart plus ensuite.
    stop() {
      this.session = null;
      this.live = false;
      this.drag = null;
      if (this.cancelWanted) this.cancelWanted();
      document.removeEventListener('mma:selection-change', this.onSelection);
      document.removeEventListener('mma:soft-navigation', this.onSoftNavigation);
      document.removeEventListener('mma:cart-count', this.onResize);
      document.removeEventListener('keydown', this.onKey);
      if (this.resizer) this.resizer.disconnect();
      cancelAnimationFrame(this.raf);
      clearTimeout(this.restTimer);
      if (this.chips) this.chips.destroy();
      this.unbindPill();
      this.stop3D();
    }

    stop3D() {
      this.live = false;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.dropTiles();
      this.zoom = null;
      this.zoomAway = false;
      if (this.chips) this.chips.setZoomed(false);
      if (this.canvas) this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
      if (this.reliefs) this.reliefs.stop();
      if (this.detailReady && this.engine) this.engine.closeImage(this.detailReady);
      this.detailReady = null;
      if (this.view3d) this.view3d.dispose();
      this.view3d = null;
      this.director = null;
    }

    /* ---- Le prix et la pilule d'achat ---- */

    /* La pilule vit hors de la scène (une scène est un conteneur : ses enfants fixes y resteraient
       collés) : celle du même produit, rendue juste après. Elle ajoute au panier par le bloc d'achat de
       la fiche, comme le bouton de la fiche : même variante, mêmes propriétés de ligne. */
    bindPill() {
      this.pill = this.nextElementSibling && this.nextElementSibling.matches('[data-oeuvre-3d-pill]') ? this.nextElementSibling : null;
      if (!this.pill) return;
      this.pillPrice = this.pill.querySelector('[data-pill-price]');
      this.pillTitle = this.pill.querySelector('[data-pill-title]');
      this.pillButton = this.pill.querySelector('[data-pill-buy]');
      this.pillButton.addEventListener('click', this.onBuy);
      this.chips.setPill(this.pill);
    }

    unbindPill() {
      if (this.pillButton) this.pillButton.removeEventListener('click', this.onBuy);
      if (this.chips && this.chips.setPill) this.chips.setPill(null);
      this.pill = null;
    }

    onBuy = (event) => {
      if (this.pillButton.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      const blocks = document.querySelector('main-product-blocks');
      if (blocks && typeof blocks.onBuyButtonClick === 'function') blocks.onBuyButtonClick(event);
    };

    // Prix, libellés et pilule à jour, dès le choix : l'animation ne bloque jamais rien.
    refresh(selection = null) {
      this.chips.update(this.product);
      const variant = variantOf(this.models[this.product.material], this.product);
      if (variant) {
        setText(this.pillPrice, this.money(variant.price));
        if (this.pillButton && this.product.material === this.model.material) this.pillButton.dataset.variantId = String(variant.id);
      }
      const values = selection ? selection.options.map((option) => option.value) : [];
      if (selection && selection.frameColor) values.push(selection.frameColor.name);
      this.canvas.setAttribute('aria-label', values.length ? `${this.baseLabel} : ${values.join(' · ')}` : this.baseLabel);
    }

    // Le choix et son prix, dits au lecteur d'écran (texte posé après coup, pour qu'il l'annonce).
    announce() {
      if (!this.liveRegion) return;
      const variant = variantOf(this.models[this.product.material], this.product);
      const text = [this.canvas.getAttribute('aria-label'), variant ? this.money(variant.price) : ''].filter(Boolean).join(', ');
      this.liveRegion.textContent = '';
      setTimeout(() => { this.liveRegion.textContent = text; }, 60);
    }

    /* ---- Choisir ---- */

    // Ce qu'un groupe réclame part dès qu'on l'approche : la source complète pour les gros plans, la
    // pose de la taille en cours pour la taille (les autres suivent, une à une, la 3D arrêtée).
    approach(group) {
      if (group === 'border' || group === 'frame' || group === 'passe' || group === 'material') this.onceLive(() => this.askDetail());
      if (group === 'size') {
        this.posesAsked = true;
        this.onceLive(() => this.view3d.prefetchPoses(this.product.size));
      }
    }

    onApproach = (event) => {
      const target = event.target instanceof Element && event.target.closest('.chips-switch, .chips-legend, .chips-cote');
      if (target) this.approach(target.classList.contains('chips-switch') ? 'material' : target.dataset.group);
    };

    onceLive(task) {
      if (this.live) task();
      else this.pendingTasks.push(task);
    }

    /* Le prix et les textes changent aussitôt (les radios du sélecteur, cochés ici, mettent à jour le
       bouton d'achat et l'adresse) ; la 3D joue ensuite sa mise en scène. Retoucher le choix en cours
       (dans sa rangée, ou « Toile » dans la bascule) rejoue sa mise en scène. Rangée ouverte, la mise
       en scène se cadre au-dessus de la rangée. */
    choose(group, next) {
      const replay = sameProduct(next, this.product);
      if (next.material !== this.model.material) {
        this.toTwin(next);
        return;
      }
      if (!replay) {
        this.commit(next);
        this.announce();
      }
      // Avant la 3D, la rangée ouverte attend déjà sa mise en scène : elle partira avec ce choix.
      if (this.stageWaiting) return;
      this.playStaging(group);
    }

    // Coche les radios du sélecteur qui donnent ce produit : le reste de la fiche suit (product-selection.js).
    commit(next) {
      // L'événement qui en revient ne rejoue pas la mise en scène : choose() la joue.
      this.choosing = true;
      try {
        for (const input of choiceInputs(this.model, next)) {
          const radio = this.radioFor(input);
          if (radio && !radio.checked && !radio.disabled) radio.click();
        }
      } finally {
        this.choosing = false;
      }
      // L'événement a mis le produit à jour ; sans sélecteur (ou sans écho), le choix fait foi.
      if (!sameProduct(this.product, next) && !window.MMASelection) {
        this.product = { ...next };
        this.refresh();
      }
    }

    radioFor(input) {
      const scope = document.querySelector('main-product-blocks') || document;
      if (input.whiteBorder) return scope.querySelector(`input[type="radio"][data-white-border="${input.whiteBorder}"]`);
      if (input.frameMode === 'none') return scope.querySelector('painting-variant-picker input[data-frame-mode="none"]');
      if (input.frameMode === 'framed') return scope.querySelector(`painting-variant-picker input[data-frame-mode="framed"][data-color-handle="${CSS.escape(input.colorHandle)}"]`);
      return scope.querySelector(`painting-variant-picker input[name="${input.name}"][value="${CSS.escape(input.value || '')}"]`);
    }

    // Le choix de la fiche a changé (par les chips, ou par la fiche elle-même) : les chips et le prix suivent.
    onSelection = ({ detail }) => {
      if (this.twinPending || this.adopting) return; // l'autre fiche arrive : adopted() lira son choix
      const next = productFromSelection(this.model, detail, this.product);
      if (sameProduct(next, this.product)) {
        this.refresh(detail);
        return;
      }
      this.product = next;
      this.refresh(detail);
      if (!this.director) return;
      // Une correction de la fiche (cadre indisponible pour cette taille) : la 3D la prend sans bouger.
      if (!this.choosing) {
        this.afterUnzoom(() => this.director.choose(detail.changed || 'front', { ...this.product }, performance.now()));
      }
      this.requestRender();
    };

    // La 3D joue la mise en scène d'un groupe, avec le produit en cours. (Animations réduites : la fiche
    // reste sur les photos, stageMode ; la 3D ne tourne donc jamais dans ce cas.)
    playStaging(group) {
      if (!this.director) return;
      this.afterUnzoom(() => {
        this.director.choose(group, { ...this.product }, performance.now());
        if (this.chips.openGroup) this.moveZone(1);
        this.run.active = true;
        this.requestRender();
      });
    }

    /* Ouvrir une rangée joue tout de suite la mise en scène de son groupe avec le choix en cours,
       cadrée au-dessus de la rangée (retour de Walid sur la version 15). Si la 3D n'a pas encore
       démarré, le toucher la démarre et la mise en scène part dès qu'elle est prête, si la rangée est
       encore ouverte. La caméra part dès le toucher, pendant que la rangée apparaît (version 24). */
    stageOpened(group) {
      if (this.live || !this.autoStart) {
        this.playStaging(group);
        return;
      }
      this.stageWaiting = group;
      this.start();
    }

    // Retour de face (bouton, toucher l'œuvre, rangée fermée) ; une mise en scène en cours s'y rend.
    // L'œuvre zoomée est déjà de face : « Retour » la ramène à ×1, comme Échap.
    goFront = () => {
      if (this.unzoom()) return;
      const now = performance.now();
      const waited = this.stageWaiting;
      this.stageWaiting = null;
      if (this.director && (waited || this.director.isMoving(now) || this.director.view(now, this.framingNow(now).aspect).shot !== 'front')) {
        this.director.choose('front', { ...this.product }, now);
        this.run.active = true;
      }
      this.moveZone(0);
      this.requestRender();
    };

    /* ---- Le poster jumeau ---- */

    /* Toucher l'autre matière : l'acte de la 3D part tout de suite (tour de la toile, coin soulevé du
       poster), les chips et le prix passent au jumeau, puis sa fiche remplace la page sans la
       recharger (product-twin-toggle.js) ; cet élément y passe tel quel (adopt). Le bouton d'achat
       attend la nouvelle fiche, qui seule a la bonne variante et les bonnes propriétés de ligne. */
    toTwin(next) {
      const twin = this.models[next.material];
      const variant = variantOf(twin, next);
      if (!twin || !variant) return;
      this.product = { ...next };
      this.twinPending = true;
      this.refresh();
      this.announce();
      if (this.pillButton) this.pillButton.setAttribute('aria-disabled', 'true');
      if (this.director) this.playStaging('material');
      const url = new URL(twin.url, window.location.href);
      url.searchParams.set('view', this.config.view);
      url.searchParams.set('variant', String(variant.id));
      if (window.MMASoftNav) window.MMASoftNav.navigate(url.toString());
      else window.location.href = url.toString();
    }

    /* Une autre fiche remplace la page (product-twin-toggle.js : la bascule des chips, ou le retour et
       l'avance du navigateur) : cet élément y reste, avec sa 3D, à la place du sien (next), dont il prend
       la photo, les photos et les données (modèle, jumeau). adopted() suit, au signal de la page. */
    adopt(next) {
      this.adopting = true;
      // Ses préchargements de police ont servi : déplacée, la scène les relancerait pour rien.
      this.querySelectorAll('link[rel="preload"]').forEach((link) => link.remove());
      this.readModels(next);
      this.config = readJson(next, '[data-config]') || this.config;
      this.catalog = catalogOf({ models: this.models, names: this.config.names });
      this.chips.setCatalog(this.catalog);
      const art = next.querySelector('[data-art]');
      if (art && this.art) {
        art.className = this.art.className;
        if (this.art.hasAttribute('aria-hidden')) art.setAttribute('aria-hidden', 'true');
        this.art.replaceWith(art);
        this.art = art;
      }
      const photos = next.querySelector('[data-photos]');
      const ownPhotos = this.querySelector('[data-photos]');
      if (photos && ownPhotos) ownPhotos.replaceWith(photos);
      if (this.photos) this.setupPhotos(); // sans 3D : les flèches passent aux photos de l'autre fiche
      this.baseLabel = next.querySelector('[data-gl]').getAttribute('aria-label') || this.baseLabel;
    }

    onSoftNavigation = () => {
      if (this.isConnected && this.adopting) this.adopted();
    };

    /* Après le remplacement de la page : la pilule de la nouvelle fiche, et son sélecteur. Bascule des
       chips : on y coche le choix déjà montré (l'adresse a donné la taille ; la couleur du cadre et le
       contour blanc sont des propriétés de ligne, que la fiche pose à leur valeur par défaut). Retour ou
       avance du navigateur : la fiche fait foi, la 3D la rejoint (l'acte de la matière si elle change). */
    adopted() {
      const fromChips = this.twinPending;
      this.twinPending = false;
      this.adopting = false;
      this.unbindPill();
      this.bindPill();
      if (this.pillButton) this.pillButton.removeAttribute('aria-disabled');
      const shown = { ...this.product };
      if (fromChips) this.commit(shown);
      const product = this.readSelection();
      if (product && !sameProduct(product, shown)) {
        this.product = product;
        const group = product.material === shown.material ? 'front' : 'material';
        if (this.director) this.afterUnzoom(() => this.director.choose(group, { ...this.product }, performance.now()));
      }
      this.refresh(window.MMASelection ? window.MMASelection.read() : null);
      this.measure(); // la nouvelle pilule (titre, prix) : ce que les rangées doivent éviter
      this.requestRender();
    }

    /* ---- Retour de face ---- */

    setFront(visible) {
      if (visible === this.frontShown) return;
      this.frontShown = visible;
      // Le bouton disparaît sous le focus du clavier : le focus passe à la bascule.
      if (!visible && document.activeElement === this.frontButton) this.chips.focusFirst();
      this.frontButton.classList.toggle('is-shown', visible);
      this.frontButton.inert = !visible;
    }

    /* ---- Cadrage : le tableau de face à la place que le design lui donne ---- */

    /* Rangée ouverte, une mise en scène se cadre dans la zone visible au-dessus de la rangée : le poids
       w passe de 0 à 1 au rythme de la caméra, et revient à 0 avec elle quand la rangée se ferme.
       zoneShift : la remontée de la scène, figée tant que le poids n'est pas revenu à 0. */
    zoneWeight(at) {
      const { from, to, t0, ms } = this.zoneMove;
      if (!ms || at >= t0 + ms) return to;
      return from + (to - from) * this.engine.glide((at - t0) / ms);
    }

    // Fin du mouvement que le directeur vient de prévoir : il est pur, on le sonde dans le temps.
    movingUntil(now) {
      if (!this.director || !this.director.isMoving(now)) return now;
      let lo = now, hi = now + 20000;
      while (hi - lo > 2) {
        const mid = (lo + hi) / 2;
        if (this.director.isMoving(mid)) lo = mid;
        else hi = mid;
      }
      return hi;
    }

    moveZone(to) {
      if (!this.engine) return;
      const now = performance.now();
      const from = this.zoneWeight(now);
      if (this.zoneMove.to === to && from === to) return;
      // La remontée se relève au départ : la rangée vient peut-être de s'ouvrir, sans image depuis.
      if (from === 0 && this.chips.placement) this.zoneShift = this.chips.placement.shift;
      Object.assign(this.zoneMove, { from, to, t0: now, ms: Math.max(0, this.movingUntil(now) - now) });
    }

    framingNow(at) {
      const spot = this.chips.placement;
      if (spot && this.zoneMove.to === 0 && this.zoneWeight(at) === 0) this.zoneShift = spot.shift;
      return window.Oeuvre3dChips.framingAt(this.size.L, { w: this.zoneWeight(at), shift: this.zoneShift, glH: this.size.glH });
    }

    // Le coin du bouton « De face », en part de l'écran que cadre le directeur.
    insetOf(f) {
      return { top: this.size.free.top / f.h, left: this.size.free.left / this.size.w };
    }

    /* Les chips calculent la place de l'œuvre (chipsLayout). Le canvas est centré sur l'œuvre et couvre
       la scène dans tous les cadrages : œuvre remontée avec la rangée, zone au-dessus de la rangée. */
    measure() {
      const rect = this.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const L = this.chips.resize({ width: w, height: h, obstacles: this.obstacles(rect, h) });
      const box = window.Oeuvre3dChips.canvasBox(L);
      const button = this.frontButton.getBoundingClientRect();
      const free = { top: button.bottom - rect.top + 6, left: button.right - rect.left + 6 };
      Object.assign(this.size, { w, h, top: box.top, glH: box.height, free, L });
      const set = (name, value) => this.scene.style.setProperty(name, `${Math.round(value * 100) / 100}px`);
      set('--art-x', L.art.l);
      set('--art-y', L.art.t);
      set('--art-w', L.art.w);
      set('--art-h', L.art.h);
      set('--gl-top', box.top);
      set('--gl-h', box.height);
    }

    /* La 3D déborde la scène (canvasBox) : à densité égale, la carte graphique peindrait jusqu'à 30 %
       de pixels en plus. Elle garde donc le nombre de pixels de la scène visible : la densité baisse
       un peu sur les écrans × 3 (2,6 au lieu de 3), jamais sous 2. */
    fitStage() {
      const dpr = window.devicePixelRatio || 1;
      const visible = this.engine.renderDensity({ dpr, width: this.size.w, height: this.size.h });
      const fit = Math.max(Math.min(dpr, 2), visible * Math.sqrt(this.size.h / this.size.glH));
      this.view3d.resize(this.size.w, this.size.glH, Math.min(this.densityCap, fit));
    }

    /* Sur ordinateur, ce qu'une rangée ouverte ne doit pas couvrir (chipsLayout) : la pilule d'achat et
       le bouton du panier au-dessus d'elle, fixés en bas de l'écran, ramenés en px de la scène, dont le
       bas est celui de l'écran ; 16 px de plus à gauche, pour un prix qui s'allonge. */
    obstacles(rect, height) {
      const found = [];
      for (const node of [this.pill, document.getElementById('cart-button')]) {
        const r = node && node.isConnected ? node.getBoundingClientRect() : null;
        if (!r || !r.width) continue;
        found.push({ left: r.left - rect.left - 16, right: r.right - rect.left, top: height - (window.innerHeight - r.top) });
      }
      return found;
    }

    // Redimensionner efface le canvas : on redessine aussitôt, avant que l'écran ne se rafraîchisse.
    onResize = () => {
      this.fitTop();
      this.measure();
      if (this.view3d) this.fitStage();
      if (this.live) this.draw(performance.now());
    };

    /* ---- Démarrage de la 3D ---- */

    /* Les gestes passent par la scène : ceux de la 3D (incliner, zoomer, déplacer l'œuvre zoomée) et le
       pincement de retour sur le voile d'une rangée ouverte. Deux doigts sur la scène ne font jamais
       défiler ni zoomer la page (touchmove, et les gesture* de Safari) ; un seul doigt vertical la fait
       défiler comme avant (touch-action, input.css). */
    listen3D() {
      this.addEventListener('pointerdown', this.onPointerDown);
      this.addEventListener('pointermove', this.onPointerMove);
      this.addEventListener('pointerup', this.onPointerEnd);
      this.addEventListener('pointercancel', this.onPointerEnd);
      this.addEventListener('touchstart', this.onTouches, { passive: true });
      this.addEventListener('touchend', this.onTouches, { passive: true });
      this.addEventListener('touchcancel', this.onTouches, { passive: true });
      this.addEventListener('touchmove', this.onTouchMove, { passive: false });
      this.addEventListener('wheel', this.onWheel, { passive: false });
      for (const type of ['gesturestart', 'gesturechange', 'gestureend']) this.addEventListener(type, this.onSafariGesture);
      document.addEventListener('keydown', this.onKey);
      this.frontButton.addEventListener('click', this.goFront);
    }

    start = async () => {
      const { session } = this;
      if (!session || this.starting) return;
      this.starting = true;
      const stale = () => session !== this.session;
      try {
        await imageLoaded(this.art);
        const engineLoaded = import(fullUrl(this.config.engine)).then((engine) => {
          if (!stale()) this.reliefs = engine.startReliefs(); // en parallèle de three.js
          return engine;
        });
        const [THREE, engine] = await Promise.all([import(fullUrl(this.config.three)), engineLoaded]);
        if (stale()) return;
        this.engine = engine;

        const sizes = [...new Set(Object.values(this.models).flatMap(sizesOf))];
        if (!sizes.length) throw new Error('produit sans taille en cm');
        const room = engine.neutralRoom(sizes);
        const files = (pose) => this.config.poses[pose] || {};
        const poses = engine.posesFor(sizes, files);
        this.director = engine.createDirector({ room, poses, product: { ...this.product } });
        /* Le zoom, et la source de ses pièces de détail : celle de l'image que la 3D montre, gardée telle
           quelle quand la fiche du jumeau remplace la page (adopt). */
        this.zoom = engine.createZoom({ reducedMotion: this.env.reducedMotion });
        this.tileSource = { url: this.config.source ? fullUrl(this.config.source) : null, native: this.config.native };

        const [weave, artImage] = await Promise.all([this.reliefs.weave, engine.decodeImage(this.art)]);
        if (stale()) {
          engine.closeImage(artImage);
          return;
        }
        if (!this.models.poster) this.reliefs.stop(); // sans poster, le grain du papier ne sert pas
        this.view3d = engine.createScene(THREE, {
          canvas: this.canvas, artImage, weave, room, woodImage: fullUrl(this.config.wood), sizes, poses,
        });
        this.canvas.addEventListener('webglcontextlost', this.onContextLost);
        this.view3d.onNeedsRender = this.requestRender;
        await engine.breathe();
        if (stale()) return;
        this.measure();
        this.fitStage();

        // La photo reste affichée pendant que tout se prépare. Le coût d'une image fixe la densité ici,
        // une seule fois : une fois la 3D visible, un changement de netteté se verrait.
        const at = performance.now();
        const f = this.framingNow(at);
        const frameCost = await this.view3d.prepare(lensShift(this.director.view(at, f.aspect, f.screen, this.insetOf(f)), f.fovScale), at);
        if (stale()) return;
        const density = this.view3d.density();
        this.densityCap = engine.densityForCost(density, frameCost);
        if (engine.isTooSlow(density, frameCost, this.densityCap)) throw new Error('appareil trop lent');
        if (this.densityCap < density) this.fitStage();
      } catch (error) {
        if (stale()) return;
        console.warn('3D indisponible, retour aux photos :', error);
        this.showPhotos();
        return;
      }
      this.reveal(session);
    };

    reveal(session) {
      this.live = true;
      // Une rangée ouverte avant la 3D : sa mise en scène part maintenant, si elle l'est encore.
      const waited = this.stageWaiting;
      this.stageWaiting = null;
      if (waited && this.chips.openGroup === waited) this.playStaging(waited);
      else if (waited) this.director.choose('front', { ...this.product }, performance.now()); // les choix faits entre-temps
      this.draw(performance.now());
      this.requestRender();
      this.pendingTasks.splice(0).forEach((task) => task());
      this.reliefs.paper.then((pixels) => { if (session === this.session && this.view3d) this.view3d.setPaperRelief(pixels); });
      whenIdle(() => {
        if (session === this.session && this.view3d) this.view3d.loadWood();
      });
      // Fondu : la 3D apparaît par-dessus la photo, qui reste opaque dessous jusqu'au bout.
      requestAnimationFrame(() => {
        if (session !== this.session) return;
        this.dataset.state = '3d';
        this.canvas.removeAttribute('aria-hidden');
        this.canvas.classList.replace('opacity-0', 'opacity-100');
        setTimeout(() => {
          if (session !== this.session || !this.live) return;
          this.art.classList.add('opacity-0');
          this.art.setAttribute('aria-hidden', 'true');
        }, 500);
      });
    }

    onContextLost = () => this.showPhotos();

    /* ---- Rendu à la demande ---- */

    requestRender = () => {
      if (!this.raf && this.live) this.raf = requestAnimationFrame(this.frame);
    };

    draw(at) {
      const f = this.framingNow(at);
      // La zone à l'arrivée : le plan d'arrivée se cadre pour elle pendant que la rangée glisse.
      const g = window.Oeuvre3dChips.framingAt(this.size.L, { w: this.zoneMove.to, shift: this.zoneShift, glH: this.size.glH });
      const goal = { aspect: g.aspect, screen: g.screen, inset: this.insetOf(g) };
      const base = lensShift(this.director.view(at, f.aspect, f.screen, this.insetOf(f), goal), f.fovScale);
      this.placeCanvas(f.offset);
      const view = this.zoomedView(base, at);
      this.view3d.render(view, at);
      this.placeDims(view);
      // Zoomée, les chips sont effacées : elles restent où l'œuvre de face les attend.
      if (this.zoomAway) this.chips.track(null);
      else this.trackChips(view);
      this.lastView = view;
      return view;
    }

    frame = (now) => {
      this.raf = 0;
      if (!this.live) return;
      const view = this.draw(now);
      if (this.run.active) this.run.times.push(now);
      const moving = this.director.isMoving(now) || this.view3d.isFading(now, { art: false }) || !!this.drag ||
        this.zoom.isMoving(now) || this.zoneWeight(now) !== this.zoneMove.to;
      this.chips.setMoving(moving);
      this.chips.setZoomed(this.zoomAway);
      // « Retour », au repos : hors du plan de face, ou l'œuvre zoomée (il la ramène à ×1).
      this.setFront(!moving && (view.shot !== 'front' || this.zoomAway));
      if (moving || this.view3d.isFading(now)) {
        if (moving) this.cancelTilePlan();
        this.raf = requestAnimationFrame(this.frame);
        return;
      }
      if (this.run.active) this.endRun();
      this.atRest();
      this.zoomAtRest(now);
    };

    // Trop lent pour de vrai, malgré le calibrage de l'arrivée : la fiche repasse sur les photos.
    endRun() {
      const { times } = this.run;
      this.run = { active: false, times: [] };
      if (this.engine.isSluggishRun(times)) this.showPhotos();
    }

    atRest() {
      clearTimeout(this.restTimer);
      this.restTimer = setTimeout(() => {
        this.restTimer = 0;
        if (!this.live) return;
        const now = performance.now();
        if (this.raf || this.drag || this.director.isMoving(now) || this.view3d.isFading(now)) return; // une image en cours : elle rappellera
        this.swapDetail();
        if (this.posesAsked) this.view3d.prefetchPoses(); // la pose suivante
      }, AFTER_LEGENDS_MS);
    }

    // Le canvas et ses cotes glissent dans la scène vers la zone au-dessus de la rangée (au pixel de l'écran).
    placeCanvas(offset) {
      const dpr = window.devicePixelRatio || 1;
      const snapped = Math.round(offset * dpr) / dpr;
      if (snapped === this.canvasOffset) return;
      this.canvasOffset = snapped;
      const transform = snapped ? `translateY(${snapped}px)` : '';
      this.canvas.style.transform = transform;
      this.dims.style.transform = transform;
    }

    placeDims({ dims }) {
      this.dims.style.opacity = dims.opacity.toFixed(3);
      if (dims.opacity < 0.01) return;
      this.dimHeight.classList.toggle('is-left', dims.side < 0); // la femme est à droite du tableau
      const left = this.view3d.toScreen(dims.width.a);
      const right = this.view3d.toScreen(dims.width.b);
      Object.assign(this.dimWidth.style, { left: `${left.x}px`, top: `${left.y}px`, width: `${right.x - left.x}px` });
      setText(this.dimWidth.firstElementChild, dims.width.text);
      const bottom = this.view3d.toScreen(dims.height.a);
      const top = this.view3d.toScreen(dims.height.b);
      Object.assign(this.dimHeight.style, { left: `${bottom.x}px`, top: `${top.y}px`, height: `${bottom.y - top.y}px` });
      setText(this.dimHeight.firstElementChild, dims.height.text);
    }

    // Un point de la 3D, projeté dans la couche `scene` (canvas décalé compris).
    toScene(point) {
      const p = this.view3d.toScreen(point);
      return { x: p.x, y: p.y + this.size.top + this.canvasOffset };
    }

    // Les quatre coins de la façade du tableau (cadre compris), projetés dans la scène, l'inclinaison au
    // doigt de la vue (de face, elle ne fait pas venir les plaques : faceOf) et les coins de l'arrière de
    // sa boîte (tourné, les filets s'arrêtent au bord de sa tranche : filetEnds).
    trackChips(view) {
      const box = this.engine.paintingCorners(view.painting, 'outer');
      const face = (z) => [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) =>
        this.toScene(box.find((c) => c.side.z === z && c.side.x === sx && c.side.y === sy)));
      this.chips.track(face(1), view.tilt, face(0));
    }

    /* ---- Source complète de l'œuvre, pour les gros plans ---- */

    askDetail() {
      if (this.detailAsked || !wantsDetail(this.env) || !this.config.detail) return;
      this.detailAsked = true;
      const { session } = this;
      this.engine.decodeImage(fullUrl(this.config.detail)).then((image) => {
        if (session !== this.session) {
          this.engine.closeImage(image);
          return;
        }
        this.detailReady = image;
        this.atRest();
      }, () => {}); // pas de source complète : on garde l'image de l'arrivée
    }

    // L'envoi au GPU prend quelques dizaines de ms : il attend que tout soit immobile.
    swapDetail() {
      if (!this.detailReady || this.drag || this.director.isMoving(performance.now())) return;
      this.view3d.useArtImage(this.detailReady);
      this.detailReady = null;
      this.requestRender();
    }

    /* ---- Zoom sur l'œuvre ---- */

    /* La vue zoomée : la couche du zoom (createZoom du moteur) sur la vue du directeur. La mise en page
       du zoom se relève de face, au repos : px par cm de la façade, demi-taille de l'œuvre, écran utile
       (au-dessus de la pilule d'achat sur un téléphone), zoom maximal. Si elle change (fenêtre
       redimensionnée), le zoom repart de ×1. zoomAway : l'œuvre n'est plus à sa place de face (zoomée,
       ou rapetissée sous les doigts) ; les chips s'effacent alors (chips.setZoomed). */
    zoomedView(base, at) {
      if (base.shot === 'front' && !this.director.isStaging(at)) this.updateZoomLayout(base, at);
      this.zoomAway = this.zoom.isAway(at);
      const z = this.zoom.at(at);
      if (z.scale === 1 && z.x === 0 && z.y === 0) return base;
      const { k } = this.zoomLayout;
      return this.engine.withZoom(base, z.scale, [z.x / k, -z.y / k]);
    }

    updateZoomLayout(base, at) {
      const k = this.engine.pxPerCm(base, this.size.glH);
      const p = base.painting;
      const px = this.size.w / 2;
      const py = this.size.top + this.size.glH / 2 + this.canvasOffset;
      const bottom = this.size.L ? this.size.L.pillTop : this.size.h;
      const dpr = window.devicePixelRatio || 1;
      const last = this.zoomLayout;
      const same = (a, b) => Math.abs(a - b) < 0.01;
      if (last && same(last.k, k) && same(last.px, px) && same(last.py, py) && same(last.bottom, bottom) &&
        same(last.width, p.width) && same(last.height, p.height) && last.dpr === dpr && same(last.w, this.size.w)) {
        last.painting = p;
        last.product = base.product;
        return;
      }
      const half = [(k * p.width) / 2, (k * p.height) / 2];
      const view = { left: -px, top: -py, right: this.size.w - px, bottom: bottom - py };
      const max = this.engine.zoomLimit({ native: this.tileSource.native, art: { w: 2 * half[0], h: 2 * half[1] }, dpr });
      this.zoomLayout = { k, px, py, bottom, width: p.width, height: p.height, dpr, w: this.size.w, half, view, max, painting: p, product: base.product };
      this.zoom.frame(this.zoomLayout);
      if (last) {
        this.dropTiles();
        this.zoom.reset(at, 0);
      }
    }

    /* De face, au repos, sans rangée ouverte ni transition, ni mise en scène qui attend le retour à ×1 :
       là seulement, deux doigts zooment. */
    canZoom(now) {
      return !!this.zoom && !!this.zoomLayout && !!this.lastView && this.lastView.shot === 'front' && !this.director.isStaging(now) &&
        !this.chips.openGroup && !this.stageWaiting && !this.unzooming && this.zoneWeight(now) === 0 && this.zoneMove.to === 0;
    }

    /* Ramène l'œuvre zoomée à ×1, en ms (le bouton, Échap, un choix) ; rend la durée du retour (au moins
       1 ms), 0 si elle était déjà à ×1, immobile. Un geste en cours sur l'œuvre zoomée s'arrête. */
    unzoom(ms = this.engine ? this.engine.ZOOM.reset : 0) {
      if (!this.zoom) return 0;
      const now = performance.now();
      const z = this.zoom.at(now);
      if (z.scale === 1 && z.x === 0 && z.y === 0 && !this.zoom.isMoving(now)) return 0;
      if (this.gesture.mode === 'pan' || this.gesture.mode === 'pinch') {
        this.gesture.mode = 'none';
        this.drag = null;
      }
      const duration = this.env.reducedMotion ? 0 : ms;
      this.zoom.reset(now, duration);
      this.requestRender();
      return Math.max(1, duration);
    }

    /* La mise en scène d'un choix part une fois l'œuvre revenue à ×1 (un retour rapide), sinon aussitôt.
       Pendant ce retour, aucun geste ne la rezoome ; s'il l'a fait quand même, elle revient d'un coup. */
    afterUnzoom(task) {
      const ms = this.unzoom();
      if (!ms) {
        task();
        return;
      }
      const { session } = this;
      this.unzooming = true;
      setTimeout(() => {
        this.unzooming = false;
        if (session !== this.session || !this.director) return;
        if (this.zoom.isAway(performance.now())) this.zoom.reset(performance.now(), 0);
        task();
        this.requestRender();
      }, ms);
    }

    /* ---- Pièces de détail du zoom ----
       Zoomée, la région que l'on regarde (et sa marge) part au CDN, en recadrage (tilePlan du moteur) :
       150 ms après l'arrêt, ou dès que l'on sait où l'œuvre va se poser (double toucher, doigts levés :
       elle arrive pendant le mouvement). Une seule demande à la fois, la précédente abandonnée. L'envoi
       au GPU attend le repos. À ×1, la pièce s'efface et sa mémoire est rendue. */

    // Ce que l'on voit de l'image dans l'état z du zoom, et le nombre de px du canvas par px de la source.
    regionOf(z) {
      const { k, view, painting, product } = this.zoomLayout;
      return this.engine.zoomRegion({
        zoom: z, view, k, painting, border: this.engine.borderShown(painting, product),
        native: this.tileSource.native, density: this.view3d.density(),
      });
    }

    cancelTilePlan() {
      clearTimeout(this.tileTimer);
      this.tileTimer = 0;
    }

    zoomAtRest(now) {
      if (!this.zoomAway) {
        this.dropTiles();
        return;
      }
      const ready = this.tileReady;
      if (ready) {
        this.tileReady = null;
        const [u0, v0, u1, v1] = ready.plan.rect;
        const { visible } = this.regionOf(this.zoom.at(now));
        // Une pièce arrivée pendant le geste ne sert que si elle touche encore la vue.
        if (u0 < visible.u1 && u1 > visible.u0 && v0 < visible.v1 && v1 > visible.v0) {
          this.view3d.showTile(ready.image, ready.plan.rect);
          this.tileShown = ready.plan;
          return; // son fondu demande des images : le repos suivant relancera la planification
        }
        this.engine.closeImage(ready.image);
      }
      this.cancelTilePlan();
      this.tileTimer = setTimeout(this.planTile, TILE_IDLE_MS);
    }

    /* La pièce de l'endroit où l'œuvre se pose (ou se trouve, au repos), si l'image en place n'y suffit
       pas, ni la pièce en place ou celle qui arrive (aussi fines que celle qu'on demanderait). */
    planTile = () => {
      this.tileTimer = 0;
      if (!this.live || !this.zoomLayout || !this.tileSource.url || !this.tileSource.native) return;
      const z = this.zoom.landing();
      if (!z || z.scale <= this.engine.ZOOM.zoomed) return;
      const { visible, density } = this.regionOf(z);
      const { tileServes, tilePlan } = this.engine;
      const plan = tilePlan({
        visible, native: this.tileSource.native, density, base: this.view3d.artTexels(),
        maxSide: Math.min(this.view3d.maxTextureSize(), TILE_SIDE), maxPixels: TILE_PIXELS,
      });
      if (!plan || tileServes(this.tileShown, visible, density, plan) || tileServes(this.tilePending, visible, density, plan)) return;
      this.fetchTile(plan);
    };

    fetchTile(plan) {
      if (this.tileAbort) this.tileAbort.abort(); // la demande précédente ne sert plus
      const abort = new AbortController();
      this.tileAbort = abort;
      this.tilePending = plan;
      const url = this.engine.tileUrl(this.tileSource.url, plan);
      const { session } = this;
      const started = performance.now();
      const done = () => {
        if (this.tileAbort !== abort) return;
        this.tileAbort = null;
        this.tilePending = null;
      };
      this.engine.loadTile(url, abort.signal).then(({ image, bytes }) => {
        done();
        if (session !== this.session || abort.signal.aborted || !this.view3d) {
          this.engine.closeImage(image);
          return;
        }
        this.tileLog.push({ url, bytes, ms: Math.round(performance.now() - started), width: image.width, height: image.height });
        if (this.tileLog.length > 20) this.tileLog.shift();
        if (this.tileReady) this.engine.closeImage(this.tileReady.image);
        this.tileReady = { image, plan };
        this.requestRender();
      }, done); // abandonnée ou refusée : l'image en place reste
    }

    dropTiles() {
      this.cancelTilePlan();
      if (this.tileAbort) this.tileAbort.abort();
      this.tileAbort = null;
      this.tilePending = null;
      if (this.tileReady && this.engine) this.engine.closeImage(this.tileReady.image);
      this.tileReady = null;
      this.tileShown = null;
      const tile = this.view3d && this.view3d.tile();
      if (tile && !tile.leaving) this.view3d.hideTile();
    }

    /* ---- Les doigts sur la scène : incliner, zoomer, déplacer, revenir de face ---- */

    // Le point d'un doigt, en px de la scène.
    place(entry, event) {
      entry.x = event.clientX - this.stageBox.left;
      entry.y = event.clientY - this.stageBox.top;
    }

    // Le milieu des deux premiers doigts (ou le seul), depuis le centre de l'image de la 3D, et leur écart.
    fingerSpot() {
      const [a, b] = this.fingers;
      const { px, py } = this.zoomLayout || { px: 0, py: 0 };
      const spot = this.spot;
      spot.x = (b ? (a.x + b.x) / 2 : a.x) - px;
      spot.y = (b ? (a.y + b.y) / 2 : a.y) - py;
      spot.spread = b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
      return spot;
    }

    onPointerDown = (event) => {
      if (!this.live || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const target = event.target;
      const on = target === this.canvas ? 'canvas' : target.classList && target.classList.contains('chips-closer') ? 'closer' : null;
      if (!on || this.pointers.has(event.pointerId)) return;
      const now = performance.now();
      const g = this.gesture;
      if (!this.pointers.size) {
        this.stageBox = this.getBoundingClientRect();
        Object.assign(g, { mode: 'none', on, several: false, moved: 0, at: now, done: false });
      }
      const entry = { x: 0, y: 0, x0: 0, y0: 0, id: event.pointerId };
      this.place(entry, event);
      entry.x0 = entry.x;
      entry.y0 = entry.y;
      this.pointers.set(event.pointerId, entry);
      this.fingers.push(entry);
      if (on === 'canvas') {
        try {
          this.canvas.setPointerCapture(event.pointerId);
        } catch (e) {
          // Le doigt peut déjà être relâché.
        }
      }
      this.regesture(now);
    };

    // Le plan à l'écran (de face avant la première image).
    shotNow() {
      return this.lastView ? this.lastView.shot : 'front';
    }

    /* Le nombre de doigts a changé : ce qu'ils font (gestureOf), repris de là où l'on est. Un doigt
       resté seul après un pincement ne se met pas à incliner le tableau. Le zoom prenant la main,
       l'inclinaison revient de face en 200 ms (calmTilt), même en plein rebond : la caméra du zoom
       part de face. */
    regesture(now) {
      const g = this.gesture;
      const fingers = this.fingers.length;
      if (fingers > 1) g.several = true;
      let mode = gestureOf({ fingers, on: g.on, zoomed: this.zoom.isZoomed(now), front: this.canZoom(now), shot: this.shotNow() });
      // Un doigt resté seul après un pincement n'incline pas ; revenus de face, les doigts ne font plus rien.
      if ((mode === 'tilt' && g.several) || g.done) mode = 'none';
      const was = g.mode;
      if (was === 'tilt' && mode !== 'tilt') {
        this.drag = null;
        this.director.release(now);
      }
      if ((was === 'pinch' || was === 'pan') && mode !== 'pinch' && mode !== 'pan') {
        this.drag = null;
        this.zoom.release(now);
      }
      g.mode = mode;
      const spot = this.fingerSpot();
      if (mode === 'tilt' && was !== 'tilt') {
        const [first] = this.fingers;
        first.x0 = first.x;
        first.y0 = first.y;
        this.drag = first;
        this.director.grab(now);
        this.run.active = true;
      } else if (mode === 'pinch' || mode === 'pan') {
        if (was !== 'pinch' && was !== 'pan') this.director.calmTilt(now);
        this.drag = this.fingers[0];
        this.zoom.grab(spot.x, spot.y, mode === 'pinch' ? spot.spread : 0, now);
        this.run.active = true;
      } else if (mode === 'dismiss' && was !== 'dismiss') {
        g.spread = spot.spread;
      }
      this.requestRender();
    }

    // La 3D s'est arrêtée pendant le geste (photos) : les doigts encore posés ne font plus rien.
    forgetFingers() {
      this.pointers.clear();
      this.fingers.length = 0;
      this.gesture.mode = 'none';
      this.drag = null;
    }

    onPointerMove = (event) => {
      const entry = this.pointers.get(event.pointerId);
      if (!entry) return;
      if (!this.live) {
        this.forgetFingers();
        return;
      }
      this.place(entry, event);
      const g = this.gesture;
      g.moved = Math.max(g.moved, Math.hypot(entry.x - entry.x0, entry.y - entry.y0));
      const now = performance.now();
      if (g.mode === 'tilt' && entry === this.drag) {
        this.director.drag((entry.x - entry.x0) / this.size.w, (entry.y - entry.y0) / this.size.h, now);
      } else if (g.mode === 'pinch' || g.mode === 'pan') {
        const spot = this.fingerSpot();
        this.zoom.drag(spot.x, spot.y, g.mode === 'pinch' ? spot.spread : 0, now);
      } else if (g.mode === 'dismiss' && pinchDismisses(g.spread, this.fingerSpot().spread)) {
        g.done = true;
        g.mode = 'none';
        this.dismiss();
      } else {
        return;
      }
      this.requestRender();
    };

    onPointerEnd = (event) => {
      const entry = this.pointers.get(event.pointerId);
      if (!entry) return;
      if (!this.live) {
        this.forgetFingers();
        return;
      }
      const now = performance.now();
      this.pointers.delete(event.pointerId);
      this.fingers.splice(this.fingers.indexOf(entry), 1);
      if (this.fingers.length) {
        this.regesture(now);
        return;
      }
      const g = this.gesture;
      const tap = event.type === 'pointerup' && !g.several && g.moved < 8 && now - g.at < 400;
      if (g.mode === 'tilt') this.director.release(now);
      if (g.mode === 'pinch' || g.mode === 'pan') {
        this.zoom.release(now);
        this.planTile(); // on sait où elle se pose : sa pièce part pendant qu'elle y va
      }
      g.mode = 'none';
      this.drag = null;
      if (tap && g.on === 'canvas') this.onTap(entry, now);
      this.requestRender();
    };

    /* Un toucher de l'œuvre. En gros plan, il revient de face aussitôt, comme avant. De face, deux
       touchers rapprochés zooment vers ×2,5 là où l'on touche, ou ramènent l'œuvre zoomée à ×1. */
    onTap(entry, now) {
      if (!this.canZoom(now)) {
        this.lastTap = null;
        if (this.frontShown) this.goFront();
        return;
      }
      const tap = { at: now, x: entry.x, y: entry.y };
      if (tapKind(this.lastTap, tap) !== 'double') {
        this.lastTap = tap;
        return;
      }
      this.lastTap = null;
      const { px, py } = this.zoomLayout;
      this.director.calmTilt(now);
      this.zoom.toggle(tap.x - px, tap.y - py, now);
      this.planTile();
      this.requestRender();
    }

    // Pincer pour revenir de face : rangée ouverte, exactement un toucher en dehors ; sinon, un toucher du gros plan.
    dismiss() {
      if (this.chips.openGroup) this.chips.dismiss();
      else this.goFront();
    }

    // Les doigts posés sur la scène (Safari : ses gesture* accompagnent alors les doigts, qui zooment seuls).
    onTouches = (event) => {
      this.touchCount = event.touches.length;
    };

    // Deux doigts sur la scène : ni défilement ni zoom de la page.
    onTouchMove = (event) => {
      if (this.live && event.cancelable && event.touches.length > 1) event.preventDefault();
    };

    /* Safari : ses gesture* ne zoomeraient que la page. Au doigt (iPhone), on les arrête, les doigts
       zooment l'œuvre ; au pavé tactile d'un Mac, ils la zooment sous le pointeur. safariPinch : l'échelle
       du geste déjà appliquée. */
    onSafariGesture = (event) => {
      if (!this.live) return;
      event.preventDefault();
      if (this.touchCount > 0) return;
      if (event.type === 'gesturestart') {
        this.safariPinch = { scale: 1 };
        return;
      }
      if (event.type === 'gestureend' || !this.safariPinch) {
        this.safariPinch = null;
        return;
      }
      const factor = event.scale / this.safariPinch.scale;
      this.safariPinch.scale = event.scale;
      this.pinchZoom(factor, event.clientX, event.clientY, performance.now());
    };

    /* Le pincement du pavé tactile (molette avec Ctrl, ou gesture* de Safari), sous le pointeur : deux
       doigts, comme sur un écran tactile (gestureOf). En gros plan, des doigts qui se rapprochent de 15 %
       ramènent de face, comme au doigt. */
    pinchZoom(factor, clientX, clientY, now) {
      const front = this.canZoom(now);
      const on = this.chips.openGroup ? 'closer' : 'canvas';
      const mode = gestureOf({ fingers: 2, on, zoomed: this.zoom.isZoomed(now), front, shot: this.shotNow() });
      if (mode === 'dismiss') {
        const w = this.wheel;
        w.pinch = now - w.pinchAt > WHEEL_PAUSE_MS ? factor : w.pinch * factor;
        w.pinchAt = now;
        if (pinchDismisses(1, w.pinch)) {
          w.pinch = 1;
          this.dismiss();
        }
        return;
      }
      if (mode !== 'pinch') return;
      this.wheelZoom(factor, clientX, clientY, now, 0);
    }

    // Un pas de molette ou de pincement du pavé tactile, sous le pointeur ; rend l'échelle visée.
    wheelZoom(factor, clientX, clientY, now, ms) {
      const w = this.wheel;
      if (!w.box || now - w.boxAt > WHEEL_PAUSE_MS) w.box = this.getBoundingClientRect(); // relu en début de rafale
      w.boxAt = now;
      const { px, py } = this.zoomLayout;
      this.director.calmTilt(now);
      const target = this.zoom.wheel(factor, clientX - w.box.left - px, clientY - w.box.top - py, now, ms);
      this.requestRender();
      return target;
    }

    /* La molette. Avec Ctrl (le pincement du pavé tactile), elle zoome toujours l'œuvre, jamais la page.
       Sans Ctrl, elle fait défiler la page comme avant, sauf l'œuvre zoomée, qu'elle zoome sous le
       pointeur (wheelStep) ; revenue à ×1, la page ne repart qu'après une pause de la molette. Le coin de
       la scène n'est relu qu'en début de rafale : la page ne défile pas pendant que la molette zoome, et
       chaque cran ne force pas une mise en page. */
    onWheel = (event) => {
      if (!this.live) return;
      const now = performance.now();
      const step = wheelStep(event);
      if (event.ctrlKey) {
        event.preventDefault();
        if (!this.safariPinch) this.pinchZoom(step.factor, event.clientX, event.clientY, now);
        return;
      }
      const w = this.wheel;
      if (this.zoom.isZoomed(now) && this.canZoom(now)) {
        event.preventDefault();
        w.latched = this.wheelZoom(step.factor, event.clientX, event.clientY, now, step.glide ? WHEEL_GLIDE_MS : 0) <= 1;
        w.last = now;
        return;
      }
      if (w.latched && now - w.last < WHEEL_PAUSE_MS) {
        event.preventDefault();
        w.last = now;
        return;
      }
      w.latched = false;
    };

    // Échap ramène l'œuvre zoomée à ×1 (rangée ouverte, il la ferme : assets/oeuvre-3d-chips.js).
    onKey = (event) => {
      if (event.key === 'Escape' && !this.chips.openGroup) this.unzoom();
    };

    /* ---- Vignettes de taille : une petite copie de l'œuvre ---- */

    /* L'œuvre y fait 30 px de haut au plus. Une copie de 90 px de large (écran × 3) leur suffit ;
       peindre l'image de l'arrivée à chaque fois coûtait des images à la 3D. */
    onArtLoaded = () => {
      try {
        const small = document.createElement('canvas');
        small.width = 90;
        small.height = Math.round((90 * this.art.naturalHeight) / this.art.naturalWidth);
        small.getContext('2d').drawImage(this.art, 0, 0, small.width, small.height);
        this.chips.setArtImage(small.toDataURL('image/jpeg', 0.86));
      } catch (e) {
        // Image d'un autre domaine sans CORS : la vignette garde son aplat.
      }
    };

    /* ---- Sans 3D : la photo et les chips, puis les autres photos, en simples fondus ---- */

    showPhotos = () => {
      this.stop3D();
      this.autoStart = false;
      this.stageWaiting = null;
      this.dataset.state = 'photos';
      this.chips.track(null);
      this.chips.setMoving(false);
      this.setFront(false);
      this.canvas.classList.replace('opacity-100', 'opacity-0');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.classList.add('pointer-events-none');
      this.art.classList.remove('opacity-0');
      this.art.removeAttribute('aria-hidden');
      this.dims.classList.add('hidden');
      this.placeCanvas(0);
      if (!this.photos) this.setupPhotos();
    };

    /* Les photos de la fiche, l'œuvre d'abord, que les flèches font défiler. Reprises quand l'autre fiche
       remplace la page (adopt) : les photos montrées de l'ancienne partent, on revient à l'œuvre. */
    setupPhotos() {
      const nav = this.querySelector('[data-photo-nav]');
      if (!nav) return;
      if (this.photos) this.photos.slice(1).forEach((image) => image.remove());
      const template = this.querySelector('[data-photos]');
      this.photos = [this.art, ...(template ? Array.from(template.content.children) : [])];
      this.photo = 0;
      this.classList.remove('is-photo');
      this.art.classList.remove('opacity-0');
      if (!this.photoCount) {
        this.photoCount = nav.querySelector('[data-photo-count]');
        nav.querySelector('[data-previous]').addEventListener('click', () => this.showPhoto(this.photo - 1));
        nav.querySelector('[data-next]').addEventListener('click', () => this.showPhoto(this.photo + 1));
      }
      this.showPhotoCount();
      nav.classList.toggle('hidden', this.photos.length < 2);
    }

    showPhotoCount() {
      this.photoCount.textContent = `${this.photo + 1}/${this.photos.length}`;
    }

    // Une autre photo que l'œuvre prend la scène : les chips s'effacent le temps de la regarder.
    showPhoto(index) {
      const next = (index + this.photos.length) % this.photos.length;
      const image = this.photos[next];
      if (!image.isConnected) this.scene.append(image);
      const fade = () => {
        this.photos[this.photo].classList.add('opacity-0');
        image.classList.remove('opacity-0');
        this.photo = next;
        this.classList.toggle('is-photo', next > 0);
        this.showPhotoCount();
      };
      image.decode().then(fade, fade);
    }

    /* ---- Vérifications : de quoi rendre une image à un instant donné et lire la scène ---- */

    get probe() {
      return {
        director: this.director,
        chips: this.chips,
        catalog: this.catalog,
        product: this.product,
        engine: this.engine,
        scene: this.view3d,
        size: this.size,
        render: (at) => this.draw(at),
        framing: () => this.framingNow(performance.now()),
        // Le zoom : son état, sa mise en page, la pièce de détail en place et celles téléchargées.
        zoom: this.zoom,
        zoomLayout: () => this.zoomLayout,
        tiles: () => ({ shown: this.view3d ? this.view3d.tile() : null, plan: this.tileShown || null, log: this.tileLog }),
        shot: () => (this.lastView ? this.lastView.shot : null),
        room: () => (this.lastView ? this.lastView.room : null),
        // Les coins de la dernière image (œuvre ou boîte cadre comprise), en px de la scène visible.
        corners: (which = 'outer') => {
          if (!this.lastView) return [];
          const shift = this.chips.placement ? this.chips.placement.shift : 0;
          return this.engine.paintingCorners(this.lastView.painting, which).map((c) => ({ ...this.toScene(c), y: this.toScene(c).y - shift, side: c.side }));
        },
      };
    }
  }

  customElements.define('oeuvre-3d', Oeuvre3d);
})();
