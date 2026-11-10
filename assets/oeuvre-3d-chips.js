/*
 * oeuvre-3d-chips.js — les options de la fiche 3D posées autour de l'œuvre (fiche-3d, ticket 07)
 * ----------------------------------------------------------------------------------------------
 * Porté de la maquette validée par Walid le 10/11/2026 (version 26, .scratch/fiche-3d/prototype :
 * src/chips.js et src/framing.js). Styles : input.css, règles .chips-*. Le comportement de la fiche
 * (catalogue, 3D, achat) est dans assets/component-oeuvre-3d.js, qui fournit un adaptateur.
 *
 * Design « Fiche chips v2 » de Walid, du 09/11/2026 (Claude Design), direction 2b et ses formats :
 * 390 × 844, iPhone SE entier (375 × 667) et dans Safari (553 px visibles), ordinateur (1440 × 820).
 * Rien ne cache l'œuvre au repos. Sur le mur, autour du tableau : la bascule Toile | Poster au-dessus,
 * soulignée en terracotta ; une légende de chaque côté (bordure ou contour à gauche, cadre à droite),
 * l'étiquette en petites capitales et la valeur, posée sur un filet qui finit par un point sur le bord
 * de l'œuvre ; dessous, la taille et sa cote. Toucher une légende ouvre sous l'œuvre une rangée de
 * verre dépoli, un choix par pastille avec son prix, et la 3D joue aussitôt la mise en scène du
 * groupe, avec le choix en cours. Il ne reste alors que la rangée : légendes, bascule, cote et filets
 * s'effacent, la légende touchée comprise (retour de Walid du 10/11). Toucher un choix l'applique et
 * la rangée reste ouverte (retours du 09/11 : on enchaîne les choix). Seul un toucher en dehors, ou
 * Échap, la ferme et ramène l'œuvre de face, puis les légendes, une fois la face retrouvée (railEvent).
 * S'il manque de la place, la scène remonte, et sur un petit écran la barre d'achat s'efface le temps
 * des choix. Hors du plan de face sans rangée ouverte (bascule Toile | Poster, glisser), les
 * légendes prennent une plaque dépolie serrée sur leur texte et les filets s'effacent.
 *
 * Trois étages, du plus pur au plus concret :
 *   - chipsLayout, railPlacement, toggleOf, legendOf, choicesOf, et le cadrage de la 3D (railZone,
 *     canvasBox, directorAspect, framingAt) : géométrie et textes, sans DOM
 *     (scripts/oeuvre-3d-chips.test.cjs, scripts/oeuvre-3d-framing.test.cjs) ;
 *   - createChips : le DOM, l'état (choix, rangée ouverte), le clavier et le toucher ;
 *   - chips.track(coins) : à chaque image de la 3D, filets et points suivent l'œuvre projetée par le
 *     moteur (toScreen), inclinaison comprise.
 *
 * Script classique, sans dépendance ni `import` : il expose window.Oeuvre3dChips. Les noms de classe
 * sont écrits en entier (Tailwind les cherche dans assets/ pour garder les règles d'input.css).
 */
(function () {
  'use strict';

  const DESK_MIN = 720; // largeur de scène à partir de laquelle on passe à la mise en page d'ordinateur
  const NB = ' '; // espace fine insécable, entre les chiffres et autour du « × »
  const REF = { w: 242, h: 323 }; // le tableau 3:4 de la maquette, de face, à l'échelle 1 (px)

  /* Réglages du design, téléphone et ordinateur (buildScreen, layoutPhone, layoutDesk du fichier v2).
     togUp : place de la bascule au-dessus de l'œuvre ; legH : hauteur d'une légende ; coteGap : écart
     de la cote sous l'œuvre ; disc : pastille d'un choix ; optW : largeur d'un choix ; swK : échelle des
     teintes ; railGap : écart de la rangée sous l'œuvre ; colW : longueur des filets sur ordinateur ;
     gapHalf : demi-blanc de la cote, où s'écrit « Taille » ; pill : place de la barre d'achat ;
     railBody : hauteur d'une rangée hors pastille ; note : sa ligne de note ; tile : hauteur du
     tableau le plus grand dans la vignette de taille. */
  const PHONE = { togUp: 56, legH: 52, coteGap: 18, disc: 40, optW: 56, swK: 1, railGap: 6, colW: 0, gapHalf: 29, pill: 60, maxS: 1.05, railBody: 80, note: 18, tile: 30 };
  const DESK = { togUp: 66, legH: 62, coteGap: 24, disc: 54, optW: 78, swK: 1.35, railGap: 12, colW: 176, gapHalf: 40, pill: 0, maxS: 1.4, railBody: 93, note: 20, tile: 40 };

  /* L'œuvre prend la place qui reste (« Ce qui s'adapte », fichier v2) : 66 px de colonne pour chaque
     légende, 56 px au-dessus pour la matière, 50 px dessous pour la taille, 60 px pour la barre
     d'achat ; le bloc (bascule, œuvre, cote) se centre au-dessus de la barre. Sur ordinateur : 1,4 fois
     le tableau du téléphone, filets de 176 px, bloc centré. width, height : la scène, sous l'en-tête ;
     ratio : largeur / hauteur de l'œuvre (le design ne montrait que le 3:4 : un paysage ou un carré
     garde la largeur du portrait, sa hauteur suit). Ordinateur : l'échelle baisse si la fenêtre est
     trop petite (le design ne montrait que 1440 × 820). Même règle pour la photo d'arrivée, en CSS
     (input.css, .oeuvre-3d-scene) : à garder identique, sinon la page saute. */
  function chipsLayout({ width, height, ratio = 0.75 }) {
    const W = Math.max(1, width);
    const SH = Math.max(1, height);
    const desk = W >= DESK_MIN;
    const k = desk ? DESK : PHONE;
    const refH = REF.h * (0.75 / ratio);
    const fit = desk
      ? Math.min(k.maxS, (W - 2 * k.colW - 32) / REF.w, (SH - 154) / refH)
      : Math.min((W - 132) / REF.w, (SH - 190) / refH, k.maxS);
    const S = Math.max(0.3, fit);
    const artW = REF.w * S;
    const artH = artW / ratio;
    /* Le design compte l'œuvre en 242 × 323 (box) ; la 3D la rend en vrai 3:4 (art), 0,3 px plus
       basse au plus. Les chips se placent sur box, comme dans le design ; la photo et la 3D sur art. */
    const boxH = refH * S;
    const blockTop = desk ? (SH - (66 + boxH + 64)) / 2 : Math.max(8, (SH - 60 - (106 + boxH)) / 2);
    const cx = W / 2;
    /* Écran haut (cadre 2b, 390 × 844) : l'œuvre reste au milieu de la scène, tant que la plus haute
       rangée tient entre elle et la barre d'achat sans rien déplacer. Sinon (cadres 3a et 3b), le bloc
       se centre au-dessus de la barre. */
    const tall = !desk && SH >= boxH + 2 * (k.railGap + k.disc + k.railBody + k.note + k.pill + 8) + 1;
    const cy = tall ? SH / 2 + 0.5 : blockTop + k.togUp + boxH / 2;
    const box = { l: cx - artW / 2, r: cx + artW / 2, t: cy - boxH / 2, b: cy + boxH / 2 };
    const art = { l: box.l, r: box.r, t: cy - artH / 2, b: cy + artH / 2, w: artW, h: artH };
    const lineY = Math.round(cy + 17 * S) + 0.5;
    const lineB = Math.round(box.b + k.coteGap) + 0.5;
    const legend = (left) => {
      const x = desk ? Math.round(left ? box.l - k.colW : box.r) : left ? 4 : Math.round(box.r + 2);
      const w = desk ? k.colW : left ? Math.round(box.l) - 4 : W - 4 - x;
      return { x, y: lineY - (k.legH - 1.5), w, h: k.legH };
    };
    return {
      desk,
      W,
      SH,
      S,
      ratio,
      cx,
      cy,
      box,
      art,
      lineY,
      lineB,
      k,
      toggle: { top: Math.round(box.t - k.togUp) },
      legends: { left: legend(true), right: legend(false) },
      cote: { y: lineB - (desk ? 6 : 5.5), w: desk ? 200 : W >= 390 ? 160 : 150 },
      marks: { lx: desk ? box.l - k.colW : 10, rx: desk ? box.r + k.colW : W - 10, gapHalf: k.gapHalf },
      // Tailles du texte : 14 px sur un 390 (cadre 2b), 13,5 px en dessous (iPhone SE), 17 et 16 sur ordinateur.
      type: { value: desk ? 17 : W >= 390 ? 14 : 13.5, cote: desk ? 16 : W >= 390 ? 14 : 13.5 },
      pillTop: desk ? SH : SH - k.pill,
    };
  }

  /* Une rangée ouverte : où elle se pose, de combien la scène remonte, et si la barre d'achat doit
     laisser sa place (petit téléphone seulement). note : la rangée a une ligne de note. */
  function railPlacement(L, note = false) {
    const { k, box: art } = L;
    const h = k.disc + k.railBody + (note ? k.note : 0);
    const need = art.b + k.railGap + h;
    const lim1 = L.pillTop - 8;
    const maxShift = Math.max(0, art.t - 12);
    let shift = 0;
    let hidePill = false;
    if (need > lim1) {
      shift = Math.min(need - lim1, maxShift);
      if (need - shift > lim1 && !L.desk) {
        hidePill = true;
        shift = Math.min(Math.max(0, need - (L.SH - 12)), maxShift);
      }
    }
    const lim = hidePill || L.desk ? L.SH - 12 : lim1;
    const top = Math.min(art.b - shift + k.railGap, lim - h);
    return { shift: Math.round(shift), hidePill, top: Math.round(top), height: h };
  }

  // Le plus grand décalage possible de la scène : la 3D doit couvrir aussi ce qui remonte.
  const maxShift = (L) => railPlacement(L, true).shift;

  // Largeur d'un choix dans la rangée : la rangée partage la largeur, jamais moins de 44 px.
  const optionWidth = (L, count) =>
    L.desk ? L.k.optW : Math.max(44, Math.min(L.k.optW, Math.floor((L.W - 40 - 2 * (count - 1)) / count)));

  /* Les rangées, d'après les retours de Walid du 09/11/2026. Ouvrir une rangée (sa légende ou la cote,
     au doigt ou au clavier) joue tout de suite la mise en scène de son groupe avec le choix en cours,
     sans attendre qu'on en change (effet 'stage', retour sur la version 15). Toucher un choix
     l'applique (légende, prix, mise en scène) et la rangée reste ouverte, pour enchaîner les choix
     (retour sur la version 14). Elle se ferme seulement par un toucher en dehors d'elle (mur, œuvre,
     légende active, « De face », en-tête…), par Échap ou quand le focus la quitte ; ce toucher ramène
     la 3D de face (effet 'front'). La bascule Toile | Poster n'a pas de rangée. open : la rangée
     ouverte, ou null ; event.type : chip (une légende ou la cote), pick (un choix), toggle (la
     bascule), outside, escape, focusout. Rend la rangée ouverte après l'événement et les effets à
     jouer : stage (mise en scène du groupe qui s'ouvre), apply (appliquer le choix), front (revenir de
     face), focus-chip (rendre le focus à la légende). */
  function railEvent(open, event) {
    switch (event.type) {
      case 'chip':
        return open ? { open: null, effects: ['front'] } : { open: event.group, effects: ['stage'] };
      case 'pick':
      case 'toggle':
        return { open, effects: ['apply'] };
      case 'escape':
        return open ? { open: null, effects: ['front', 'focus-chip'] } : { open, effects: [] };
      case 'outside':
      case 'focusout':
        return open ? { open: null, effects: ['front'] } : { open, effects: [] };
      default:
        return { open, effects: [] };
    }
  }

  /* ---------------- Cadrage de la 3D (src/framing.js de la maquette) ---------------- */

  /* Au repos, l'image calculée pour la scène visible (largeur W, hauteur H) est remontée sur l'œuvre
     du design : le canvas, plus haut que la scène, est centré sur l'œuvre et son angle de vue grandit
     d'autant. C'est un décentrement d'objectif ; à l'écran, rien d'autre ne bouge. Rangée ouverte,
     pendant une mise en scène, l'image est calculée pour la zone visible au-dessus de la rangée et
     posée dans cette zone. Un poids w passe de l'un à l'autre (0 : repos, 1 : zone), au rythme de la
     caméra. */

  /* La zone visible au-dessus de la plus haute rangée (celle qui a une note) : du haut de la scène au
     haut de la rangée, en px de scène. Les autres rangées se posent plus bas : la zone ne change pas
     quand une note apparaît ou disparaît. */
  function railZone(L) {
    const height = railPlacement(L, true).top;
    return { center: height / 2, height };
  }

  /* Le canvas, en px de la couche `scene` : centré sur l'œuvre au repos, et assez haut pour couvrir
     toute la scène dans chaque cadrage (l'œuvre, l'œuvre remontée avec la rangée, la zone). */
  function canvasBox(L) {
    const zone = railZone(L);
    const shift = railPlacement(L, true).shift;
    const half = Math.max(L.cy, L.SH + shift - L.cy, zone.center, L.SH - zone.center);
    const top = Math.floor(L.cy - half);
    return { top, height: Math.round(2 * (L.cy - top)) };
  }

  /* La forme d'écran donnée au directeur : celle qui met le tableau de face à la largeur du design
     (fill : FRONT_FILL du moteur), la 3D gardant toute la largeur. */
  function directorAspect({ w, h, paintW, fill = 0.72, ratio = 0.75 }) {
    const natural = Math.min(fill * ratio * h, fill * w);
    return paintW < natural - 0.5 ? paintW / (fill * h) : w / h;
  }

  /* Le cadrage pour un poids w. shift : la remontée de la scène, rangée ouverte ; glH : la hauteur
     du canvas. Rend la hauteur d'écran pour laquelle le directeur cadre (h), sa forme (aspect) et celle
     de l'écran réel (screen, pour la pose de la taille, qui ne doit pas montrer le bord de sa photo), le
     décalage du canvas dans la scène (offset, px) et le rapport d'angle de vue (fovScale). */
  function framingAt(L, { w = 0, shift = 0, glH }) {
    const zone = railZone(L);
    const h = L.SH + (zone.height - L.SH) * w;
    return {
      h,
      aspect: directorAspect({ w: L.W, h, paintW: L.art.w, ratio: L.ratio }),
      screen: L.W / h,
      offset: w ? w * (zone.center - (L.cy - shift)) : 0,
      fovScale: glH / h,
    };
  }

  /* ---------------- Textes ---------------- */

  /* Textes de la fiche, en français, pour les tests. La fiche passe les siens, traduits par les
     fichiers de langue du thème. {size} : le format qui n'existe pas encadré. money : le prix en
     euros mis en forme (la fiche passe celui de la boutique, Product.formatPrice). */
  const TEXTS_FR = {
    group: { material: 'Matière', size: 'Taille', border: 'Bordure', frame: 'Cadre', passe: 'Contour' },
    seeChoices: 'Voir les choix',
    cm: 'cm',
    included: 'inclus',
    unavailable: 'indisponible en {size}',
    noFrame: 'Pas de cadre en {size}',
    bigUnframed: 'En {size}, livré sans cadre',
    unframedHint: 'sans cadre',
  };

  const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, key) => (vars[key] === undefined ? '' : vars[key]));

  const NF2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NF0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  // Prix du design : sans centimes quand il est rond (94 €), sinon avec (62,50 €).
  function eur(value) {
    const r = Math.round(value * 100) / 100;
    return (Number.isInteger(r) ? NF0 : NF2).format(r);
  }
  const money = (texts, value) => (texts.money || eur)(value);

  // « 30 × 40 », ou « 30 × 40 cm », en espaces fines insécables.
  const dims = ({ w, h }, cm, texts = TEXTS_FR) => `${w}${NB}×${NB}${h}${cm ? `${NB}${texts.cm}` : ''}`;

  /* L'adaptateur du catalogue, que la page fournit :
       side(product)                  'border' (toile) ou 'passe' (poster) : la légende de gauche
       options(group, product)        [{ id, name, spoken }] : name s'affiche, spoken se lit
       value(group, product)          l'id du choix en cours
       apply(group, product, id)      le produit après ce choix, règles de la boutique comprises
       available(group, product, id)  ce choix existe-t-il pour ce produit ?
       price(product)                 le prix, en euros
       base(group)                    le choix de référence des écarts de prix (« + 2 € »)
       size(id)                       { w, h } en cm
       framed(product)                le produit a-t-il un cadre ?
       canFrame(sizeId)               ce format existe-t-il encadré ?
       unframedSize()                 le format sans cadre, en clair (« 90 × 120 ») */

  /* La bascule de la matière : un choix par matière, le prix de chacun dans son libellé. */
  function toggleOf(catalog, texts, product) {
    return catalog.options('material', product).map((o) => {
      const pressed = catalog.value('material', product) === o.id;
      return { id: o.id, name: o.name, pressed, label: `${texts.group.material} : ${o.spoken}, ${money(texts, catalog.price(catalog.apply('material', product, o.id)))}` };
    });
  }

  function chosenOf(catalog, group, product) {
    const options = catalog.options(group, product);
    const id = catalog.value(group, product);
    return options.find((o) => o.id === id) || options[0];
  }

  /* Une légende (ou la cote) : son étiquette, la valeur en cours, et ce qu'en lit un lecteur d'écran. */
  function legendOf(catalog, texts, group, product) {
    const chosen = chosenOf(catalog, group, product);
    const value = group === 'size' ? dims(catalog.size(chosen.id), true, texts) : chosen.name;
    return { group, cat: texts.group[group], value, label: `${texts.group[group]} : ${chosen.spoken}. ${texts.seeChoices}` };
  }

  /* La rangée d'un groupe : un choix par option, avec son prix (le prix complet pour la taille, l'écart
     à l'option de base pour les autres), sa disponibilité, et la note de la rangée. */
  function choicesOf(catalog, texts, group, product) {
    const size = catalog.unframedSize();
    const current = catalog.value(group, product);
    const framed = catalog.framed(product);
    let unavailable = false;
    const options = catalog.options(group, product).map((o) => {
      const next = catalog.apply(group, product, o.id);
      const available = catalog.available(group, product, o.id);
      if (!available) unavailable = true;
      let price = '';
      let spokenPrice = '';
      if (group === 'size' || group === 'material') {
        price = money(texts, catalog.price(next));
        spokenPrice = price;
      } else if (available) {
        const delta = Math.round((catalog.price(next) - catalog.price(catalog.apply(group, product, catalog.base(group)))) * 100) / 100;
        price = delta > 0 ? `+${money(texts, delta)}` : '';
        spokenPrice = price || (group === 'border' || (group === 'passe' && o.id === 'avec') ? texts.included : '');
      }
      const hint = group === 'size' && framed && !catalog.canFrame(o.id) ? texts.unframedHint : '';
      const name = group === 'size' ? dims(catalog.size(o.id), false, texts) : o.name;
      const label = `${texts.group[group]} : ${o.spoken}${available ? (spokenPrice ? `, ${spokenPrice}` : '') : `, ${fill(texts.unavailable, { size })}`}${hint ? `, ${hint}` : ''}`;
      return { id: o.id, name, price: available ? price : '—', label, selected: o.id === current, available };
    });
    const note = group === 'frame' && unavailable
      ? fill(texts.noFrame, { size })
      : group === 'size' && framed && size ? fill(texts.bigUnframed, { size }) : '';
    return { group, title: texts.group[group], options, note };
  }

  /* ---------------- Teintes des pastilles (design v2, swatch2 et sizeTile) ---------------- */

  /* Des matières, pas des couleurs de marque : le bois, le métal, la tranche de la toile. */
  const ART_TONE = '#dacdb5'; // l'œuvre, en aplat, dans les pastilles
  const ART_BG = 'linear-gradient(135deg, #e3d7c1 0%, #c8b794 50%, #7d8a5c 100%)'; // l'image qui continue sur la tranche
  const FRAME_BG = {
    blanc: 'linear-gradient(135deg, #fdfcf9 0%, #e9e4da 100%)',
    noir: 'linear-gradient(135deg, #3d3733 0%, #1a1613 100%)',
    argent: 'linear-gradient(135deg, #e6e7e9 0%, #a5a8ae 45%, #d3d5d8 60%, #8c8f95 100%)',
    chene: 'linear-gradient(135deg, #ecd3ab 0%, #d4b07b 55%, #c09760 100%)',
    noyer: 'linear-gradient(135deg, #966242 0%, #6a3d27 55%, #4c2918 100%)',
  };
  const EDGE = { blanche: '#ffffff', noire: '#26211d' };
  const RING = 'inset 0 0 0 0.5px rgba(33, 21, 12, 0.3)';
  const half = (v) => Math.round(v * 2) / 2;

  // La teinte d'un choix : un disque pour le cadre et la bordure, une feuille pour le contour.
  function swatchOf(group, id, scale = 1) {
    const d = half(30 * scale);
    if (group === 'frame') {
      if (id === 'sans') return { w: d, h: d, r: '50%', bg: 'transparent', shadow: 'none', border: '1px dashed rgba(33, 21, 12, 0.5)' };
      return { w: d, h: d, r: '50%', bg: FRAME_BG[id] || '#b9a789', shadow: RING, border: '0' };
    }
    if (group === 'border') {
      const edge = EDGE[id];
      const bg = edge ? `linear-gradient(90deg, ${ART_TONE} 0 55%, ${edge} 55%)` : `linear-gradient(90deg, ${ART_TONE} 0 55%, transparent 55%), ${ART_BG}`;
      return { w: d, h: d, r: '50%', bg, shadow: RING, border: '0' };
    }
    const w = half(21 * scale), h = half(28 * scale);
    // Le filet blanc garde 3,5 px à toutes les échelles, comme dans le design.
    const shadow = id === 'avec' ? 'inset 0 0 0 3.5px #ffffff, 0 0 0 0.5px rgba(33, 21, 12, 0.4)' : '0 0 0 0.5px rgba(33, 21, 12, 0.4)';
    return { w, h, r: '1px', bg: ART_TONE, shadow, border: '0' };
  }

  // Vignette de taille : l'œuvre à l'échelle des autres formats (tallest : le plus haut, en cm), sur un banc.
  function sizeTileOf(size, maxH, tallest = 120) {
    const h = (maxH * size.h) / tallest;
    return { w: Math.round(((h * size.w) / size.h) * 2) / 2, h };
  }

  const pure = {
    DESK_MIN, TEXTS_FR, chipsLayout, railPlacement, maxShift, optionWidth, railEvent, railZone, canvasBox,
    directorAspect, framingAt, toggleOf, legendOf, choicesOf, eur, dims, swatchOf, sizeTileOf,
  };

  // Node (tests) : le calcul pur.
  if (typeof window === 'undefined') {
    module.exports = pure;
    return;
  }

  /* ---------------- DOM ---------------- */

  function el(tag, attrs = {}, children = []) {
    const node = tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'g'
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children) node.append(child);
    return node;
  }

  const px = (v) => `${Math.round(v * 100) / 100}px`;
  /* Écrire dans la page seulement ce qui change : chaque texte ou attribut réécrit à l'identique
     relance quand même le calcul des styles et la mise en page, au moment où la 3D démarre. */
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const setAttr = (node, name, value) => { if (node.getAttribute(name) !== value) node.setAttribute(name, value); };
  const r1 = (v) => Math.round(v * 10) / 10;
  const SIDE_GROUPS = ['border', 'passe'];
  const RAIL_GROUPS = ['border', 'passe', 'frame', 'size'];

  /* Plan de face ou non : l'œuvre projetée s'écarte de sa place de face (en part de sa largeur).
     L'inclinaison au doigt la déplace d'environ 4 % : les filets la suivent, les plaques ne viennent
     pas. Au-delà de 12 %, on est sur un autre plan. */
  const FACE = { near: 0.06, far: 0.12, staged: 0.6 };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* Où un bord de l'œuvre (de a à b) croise la ligne horizontale y. */
  function edgeX(a, b, y) {
    if (Math.abs(b.y - a.y) < 1e-6) return a.x;
    const t = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)));
    return a.x + (b.x - a.x) * t;
  }

  /* createChips : la scène (stage) reçoit l'état et les rangées ; la couche `scene`, que la page
     remplit de sa photo et de sa 3D, reçoit les légendes et les filets et remonte avec eux.
     onChoose(group, id, next) : la page applique le choix (prix, 3D) puis rappelle update(produit) ;
     la rangée reste ouverte. onOpen(group) : une rangée s'ouvre (la page peut précharger).
     onStage(group) : la légende ou la cote vient d'ouvrir sa rangée ; la page joue la mise en scène du
     groupe avec le choix en cours, comme pour un choix. onDismiss() : un toucher en dehors, Échap ou
     le focus qui part a fermé la rangée ; la page ramène la 3D de face. pill : la barre d'achat, que
     les petits écrans effacent le temps des choix. artImage : l'œuvre, pour les vignettes de taille. */
  function createChips({
    stage, scene, catalog, product, texts = TEXTS_FR, pill = null, artImage = '', ratio = 0.75,
    onChoose = () => {}, onOpen = () => {}, onStage = () => {}, onDismiss = () => {},
    reducedMotion = false, enterAfter = 250, settleAfter = 2000,
  }) {
    let current = { ...product };
    let L = null;
    let open = null;
    let corners = null;
    let face = 1;
    let staged = false;
    const ids = { rail: (g) => `chips-rail-${g}`, chip: (g) => `chips-chip-${g}` };

    stage.classList.add('chips');
    stage.style.setProperty('--chips-art', artImage ? `url("${artImage}")` : 'none');
    scene.classList.add('chips-scene');
    const setPillAway = (away) => {
      if (!pill || pill.inert === away) return;
      pill.classList.toggle('chips-pill-away', away);
      pill.inert = away; // effacée, elle ne prend plus le focus
    };

    /* Filets et points, sous les légendes. Un SVG par élément qui s'efface à part (filet, point,
       cote) : leurs fondus passent au compositeur, sans repeindre la page à chaque image de la 3D.
       Les chemins vont du bord de l'écran vers l'œuvre : ils se dessinent dans ce sens à l'arrivée. */
    const svg = el('div', { class: 'chips-marks', 'aria-hidden': 'true' });
    const layer = (kindClass, group, i, children) => el('svg', { class: `chips-mk ${kindClass}`, 'data-group': group, focusable: 'false', style: `--i: ${i}` }, children);
    const line = (group) => el('path', { class: 'chips-line', 'data-group': group, pathLength: 1 });
    const marks = {
      sideLine: line('side'),
      frameLine: line('frame'),
      tickL: line('size'),
      tickR: line('size'),
      lineL: line('size'),
      lineR: line('size'),
      sideDot: el('circle', { class: 'chips-dot', 'data-group': 'side', r: 2.5 }),
      frameDot: el('circle', { class: 'chips-dot', 'data-group': 'frame', r: 2.5 }),
    };
    svg.append(
      layer('chips-mk-line', 'side', 0, [marks.sideLine]),
      layer('chips-mk-line', 'frame', 1, [marks.frameLine]),
      layer('chips-mk-line', 'size', 2, [marks.tickL, marks.tickR, marks.lineL, marks.lineR]),
      layer('chips-mk-dot', 'side', 0, [marks.sideDot]),
      layer('chips-mk-dot', 'frame', 1, [marks.frameDot]),
    );

    // La bascule Toile | Poster : un interrupteur, pas de menu pour deux choix.
    const toggle = el('div', { class: 'chips-toggle chips-item chips-plate', role: 'group', 'aria-label': texts.group.material, style: '--i: 0' });

    /* Légendes et cote : la boîte du bouton est la cible du doigt ; le texte et sa plaque dépolie
       (.chips-label) la serrent (retour de Walid du 10/11 : trop de marge autour du texte). */
    const label = (cat) => el('span', { class: 'chips-label chips-plate' }, [
      el('span', { class: 'chips-cat', ...(cat ? { text: cat } : {}) }),
      el('span', { class: 'chips-value' }),
    ]);
    const left = el('button', { type: 'button', class: 'chips-legend chips-item is-left', 'aria-expanded': 'false', style: '--i: 1' }, [label()]);
    const right = el('button', { type: 'button', class: 'chips-legend chips-item is-right', 'aria-expanded': 'false', style: '--i: 2' }, [label()]);
    const cote = el('button', { type: 'button', class: 'chips-cote chips-item', 'aria-expanded': 'false', id: ids.chip('size'), 'aria-controls': ids.rail('size'), style: '--i: 3' }, [label(texts.group.size)]);
    right.id = ids.chip('frame');
    right.setAttribute('aria-controls', ids.rail('frame'));
    scene.append(svg, toggle, left, right, cote);

    // Toucher ailleurs ferme la rangée : un voile transparent sur la scène, sous la rangée.
    const closer = el('div', { class: 'chips-closer', 'aria-hidden': 'true', 'data-allow-empty': true });
    const rails = {};
    for (const group of RAIL_GROUPS) {
      rails[group] = el('div', { class: 'chips-rail', id: ids.rail(group), role: 'group', 'aria-label': texts.group[group], 'data-group': group }, [
        el('p', { class: 'chips-rail-title', text: texts.group[group] }),
        el('div', { class: 'chips-rail-options' }),
        el('p', { class: 'chips-rail-note', hidden: true }),
      ]);
    }
    stage.append(closer, ...Object.values(rails));

    const sideGroup = () => catalog.side(current);
    const chipOf = (group) => (group === 'size' ? cote : group === 'frame' ? right : left);

    /* ---- Contenu : textes, prix, états ---- */

    function renderToggle() {
      const items = toggleOf(catalog, texts, current);
      const same = toggle.querySelectorAll('.chips-switch').length === items.length &&
        items.every((item) => toggle.querySelector(`[data-value="${item.id}"]`));
      if (!same) {
        toggle.replaceChildren();
        items.forEach((item, i) => {
          if (i > 0) toggle.append(el('span', { class: 'chips-divider', 'aria-hidden': 'true', 'data-allow-empty': true }));
          const button = el('button', { type: 'button', class: 'chips-switch', 'data-value': item.id }, [
            el('span', { class: 'chips-switch-name' }, [el('span', { class: 'chips-switch-text' }), el('span', { class: 'chips-underline', 'aria-hidden': 'true', 'data-allow-empty': true })]),
          ]);
          toggle.append(button);
        });
      }
      for (const item of items) {
        const button = toggle.querySelector(`[data-value="${item.id}"]`);
        setText(button.querySelector('.chips-switch-text'), item.name);
        setAttr(button, 'aria-pressed', String(item.pressed));
        setAttr(button, 'aria-label', item.label);
      }
    }

    function renderLegend(button, group) {
      const legend = legendOf(catalog, texts, group, current);
      setAttr(button, 'data-group', group);
      setText(button.querySelector('.chips-cat'), legend.cat);
      setText(button.querySelector('.chips-value'), legend.value);
      setAttr(button, 'aria-label', legend.label);
    }

    function optionButton(group) {
      return el('button', { type: 'button', class: 'chips-opt' }, [
        group === 'size'
          ? el('span', { class: 'chips-tile', 'aria-hidden': 'true' }, [el('span', { class: 'chips-tile-art', 'data-allow-empty': true }), el('span', { class: 'chips-tile-bench', 'data-allow-empty': true })])
          : el('span', { class: 'chips-disc', 'aria-hidden': 'true' }, [el('span', { class: 'chips-swatch', 'data-allow-empty': true })]),
        el('span', { class: 'chips-opt-name' }),
        el('span', { class: 'chips-opt-price', 'data-allow-empty': true }),
      ]);
    }

    function renderRail(group) {
      const rail = rails[group];
      const model = choicesOf(catalog, texts, group, current);
      const box = rail.querySelector('.chips-rail-options');
      const same = box.childElementCount === model.options.length &&
        model.options.every((o, j) => box.children[j].dataset.value === o.id);
      if (!same) {
        box.replaceChildren(...model.options.map((o, j) => {
          const button = optionButton(group);
          button.dataset.value = o.id;
          button.style.setProperty('--j', j);
          return button;
        }));
        sizeRail(group);
      }
      model.options.forEach((o, j) => {
        const button = box.children[j];
        setAttr(button, 'aria-pressed', String(o.selected));
        setAttr(button, 'aria-disabled', String(!o.available));
        setAttr(button, 'aria-label', o.label);
        setText(button.querySelector('.chips-opt-name'), o.name);
        setText(button.querySelector('.chips-opt-price'), o.price);
      });
      const note = rail.querySelector('.chips-rail-note');
      if (note.hidden !== !model.note) note.hidden = !model.note;
      setText(note, model.note);
      return model;
    }

    // Tailles des pastilles et des vignettes : elles changent avec la mise en page (téléphone, ordinateur).
    function sizeRail(group) {
      if (!L) return;
      const box = rails[group].querySelector('.chips-rail-options');
      const width = optionWidth(L, box.childElementCount);
      const tallest = group === 'size' ? Math.max(...[...box.children].map((b) => catalog.size(b.dataset.value).h)) : 0;
      for (const button of box.children) {
        button.style.width = px(width);
        if (group === 'size') {
          const tile = sizeTileOf(catalog.size(button.dataset.value), L.k.tile, tallest);
          Object.assign(button.querySelector('.chips-tile-art').style, { width: px(tile.w), height: px(tile.h) });
        } else {
          const s = swatchOf(group, button.dataset.value, L.k.swK);
          Object.assign(button.querySelector('.chips-swatch').style, {
            width: px(s.w), height: px(s.h), borderRadius: s.r, background: s.bg, boxShadow: s.shadow, border: s.border,
          });
        }
      }
    }

    function update(next) {
      current = { ...next };
      const side = sideGroup();
      for (const group of SIDE_GROUPS) if (rails[group].hidden !== (group !== side)) rails[group].hidden = group !== side;
      setAttr(left, 'id', ids.chip(side));
      setAttr(left, 'aria-controls', ids.rail(side));
      renderToggle();
      renderLegend(left, side);
      renderLegend(right, 'frame');
      renderLegend(cote, 'size');
      for (const group of [side, 'frame', 'size']) renderRail(group);
      if (open && !rails[open].hidden) place(open);
      else if (open) close();
    }

    /* ---- Mise en page ---- */

    function resize({ width, height }) {
      L = chipsLayout({ width, height, ratio });
      stage.classList.toggle('is-desk', L.desk);
      stage.style.setProperty('--chips-value', px(L.type.value));
      stage.style.setProperty('--chips-cote', px(L.type.cote));
      const { legends: g, toggle: t, cote: c } = L;
      Object.assign(toggle.style, { top: px(t.top), left: px(L.cx) });
      for (const [button, box] of [[left, g.left], [right, g.right]]) {
        Object.assign(button.style, { left: px(box.x), top: px(box.y), width: px(box.w), height: px(box.h) });
      }
      Object.assign(cote.style, { left: px(L.cx), top: px(c.y), width: px(c.w) });
      for (const group of RAIL_GROUPS) {
        sizeRail(group);
        if (group !== open) rails[group].style.top = px(Math.round(L.box.b + L.k.railGap));
      }
      drawMarks();
      if (open) place(open);
      return L;
    }

    /* ---- Filets et points : sur l'œuvre projetée ---- */

    const lastD = new WeakMap();
    const setD = (path, d) => {
      if (lastD.get(path) === d) return;
      lastD.set(path, d);
      path.setAttribute('d', d);
    };
    const setDot = (circle, x, y) => {
      const key = `${r1(x)},${r1(y)}`;
      if (lastD.get(circle) === key) return;
      lastD.set(circle, key);
      circle.setAttribute('cx', r1(x));
      circle.setAttribute('cy', r1(y));
    };

    function drawMarks() {
      if (!L) return;
      const A = L.art;
      let xl = A.l, xr = A.r, bl = A.l, br = A.r;
      if (corners) {
        const [tl, tr, brc, blc] = corners;
        xl = edgeX(tl, blc, L.lineY);
        xr = edgeX(tr, brc, L.lineY);
        bl = blc.x;
        br = brc.x;
      }
      const { lineY: y, lineB: b, cx } = L;
      const { lx, rx, gapHalf } = L.marks;
      setD(marks.sideLine, `M${r1(lx)} ${y}H${r1(xl)}`);
      setD(marks.frameLine, `M${r1(rx)} ${y}H${r1(xr)}`);
      setD(marks.tickL, `M${r1(bl)} ${b - 5}V${b + 5}`);
      setD(marks.tickR, `M${r1(br)} ${b - 5}V${b + 5}`);
      setD(marks.lineL, `M${r1(bl)} ${b}H${r1(cx - gapHalf)}`);
      setD(marks.lineR, `M${r1(br)} ${b}H${r1(cx + gapHalf)}`);
      setDot(marks.sideDot, xl, y);
      setDot(marks.frameDot, xr, y);
    }

    /* track(coins) : les quatre coins de la façade de l'œuvre (haut gauche, haut droit, bas droit,
       bas gauche), en px de la couche `scene`, tels que la 3D les projette ; null : la photo, à sa
       place de face. Appelé à chaque image de la 3D ; ne touche au DOM que si quelque chose change. */
    function track(next) {
      if (!L) return;
      corners = next;
      let k = 1;
      if (next) {
        const A = L.art;
        const ref = [[A.l, A.t], [A.r, A.t], [A.r, A.b], [A.l, A.b]];
        const dev = Math.max(...next.map((c, i) => Math.hypot(c.x - ref[i][0], c.y - ref[i][1])));
        k = clamp01(1 - (dev - FACE.near * A.w) / ((FACE.far - FACE.near) * A.w));
      }
      face = k;
      /* Un seul état, au compositeur : de face, les filets ; ailleurs, les plaques (fondus en CSS).
         Rien n'est écrit dans la page tant que l'état ne change pas, sauf les filets qui suivent l'œuvre. */
      const nowStaged = staged ? k < 0.9 : k < FACE.staged;
      if (nowStaged !== staged) {
        staged = nowStaged;
        stage.classList.toggle('is-staged', staged);
        if (!staged) setReturning(false); // de retour de face : les plaques peuvent revenir
      }
      if (!staged) drawMarks();
    }

    /* ---- Ouvrir, choisir, fermer ---- */

    /* Rangée ouverte, il ne reste qu'elle : la bascule, la cote et les légendes, effacées, ne prennent
       plus ni le doigt ni le focus. Refermée, elles reviennent avec la face : tant que la 3D revient
       (is-returning), elles restent effacées, sans plaque, sauf celle qui a le focus ; sans retour à
       faire, aussitôt. */
    const setHidden = (hidden) => {
      for (const item of [toggle, left, right, cote]) item.inert = hidden;
    };
    let returning = false;
    const setReturning = (on) => {
      if (returning === on) return;
      returning = on;
      stage.classList.toggle('is-returning', on);
    };

    let spot = null; // où la rangée ouverte se pose
    function place(group) {
      const model = choicesOf(catalog, texts, group, current);
      spot = railPlacement(L, !!model.note);
      scene.style.transform = spot.shift ? `translateY(${-spot.shift}px)` : '';
      rails[group].style.top = px(spot.top);
      setPillAway(spot.hidePill);
    }

    function openRail(group, { focus = false } = {}) {
      open = group;
      stage.dataset.chipsOpen = group === sideGroup() ? 'side' : group;
      stage.classList.add('is-open');
      setReturning(false);
      setHidden(true);
      chipOf(group).setAttribute('aria-expanded', 'true');
      renderRail(group);
      place(group);
      drawMarks();
      rails[group].classList.add('is-open');
      onOpen(group);
      if (focus) {
        const box = rails[group].querySelector('.chips-rail-options');
        const target = box.querySelector('[aria-pressed="true"]') || box.querySelector('[aria-disabled="false"]');
        if (target) target.focus({ preventScroll: true });
      }
    }

    function close({ focusChip = false } = {}) {
      if (!open) return;
      const group = open;
      open = null;
      stage.classList.remove('is-open');
      delete stage.dataset.chipsOpen;
      chipOf(group).setAttribute('aria-expanded', 'false');
      rails[group].classList.remove('is-open');
      rails[group].style.top = px(Math.round(L.box.b + L.k.railGap));
      scene.style.transform = '';
      setPillAway(false);
      setHidden(false);
      if (staged) setReturning(true);
      if (focusChip) chipOf(group).focus({ preventScroll: true });
    }

    // Un choix : la page l'applique (prix, 3D) et rappelle update(produit). La rangée reste ouverte.
    function apply({ type, group, id }) {
      const g = type === 'toggle' ? 'material' : group;
      if (!catalog.available(g, current, id)) return;
      onChoose(g, id, catalog.apply(g, current, id));
    }

    /* Tout passe par railEvent : ce qui s'applique, ce qui s'ouvre ou se ferme, la mise en scène du
       groupe ouvert, le retour de face. La rangée est posée avant sa mise en scène : la page cadre
       celle-ci au-dessus d'elle (placement). */
    function dispatch(event) {
      const { open: next, effects } = railEvent(open, event);
      if (effects.includes('apply')) apply(event);
      if (next !== open) {
        if (next) openRail(next, { focus: !!event.keyboard });
        else close({ focusChip: effects.includes('focus-chip') });
      }
      if (effects.includes('stage')) onStage(next);
      if (effects.includes('front')) onDismiss();
    }

    /* ---- Événements ---- */

    const keyboard = (event) => event.detail === 0; // un clic sans pointeur : Entrée ou Espace
    toggle.addEventListener('click', (event) => {
      const button = event.target.closest('.chips-switch');
      if (button) dispatch({ type: 'toggle', id: button.dataset.value, keyboard: keyboard(event) });
    });
    left.addEventListener('click', (event) => dispatch({ type: 'chip', group: sideGroup(), keyboard: keyboard(event) }));
    right.addEventListener('click', (event) => dispatch({ type: 'chip', group: 'frame', keyboard: keyboard(event) }));
    cote.addEventListener('click', (event) => dispatch({ type: 'chip', group: 'size', keyboard: keyboard(event) }));
    // Toucher ailleurs sur la scène (mur, œuvre, légende active, « De face ») : un voile le reçoit,
    // rien d'autre ne réagit.
    closer.addEventListener('click', () => dispatch({ type: 'outside' }));

    for (const group of RAIL_GROUPS) {
      const rail = rails[group];
      rail.addEventListener('click', (event) => {
        const button = event.target.closest('.chips-opt');
        if (button && button.getAttribute('aria-disabled') !== 'true') {
          dispatch({ type: 'pick', group, id: button.dataset.value, keyboard: keyboard(event) });
        }
      });
      // Au clavier : les flèches parcourent les choix, Échap ferme.
      rail.addEventListener('keydown', (event) => {
        const items = [...rail.querySelectorAll('.chips-opt')];
        const at = items.indexOf(document.activeElement);
        const moves = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: items.length - 1 };
        if (event.key in moves && at >= 0) {
          event.preventDefault();
          items[(moves[event.key] + items.length) % items.length].focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          dispatch({ type: 'escape' });
        }
      });
      // Le focus quitte la rangée et sa légende (Tab) : comme un toucher en dehors.
      rail.addEventListener('focusout', (event) => {
        if (open !== group || !event.relatedTarget) return;
        if (!rail.contains(event.relatedTarget) && event.relatedTarget !== chipOf(group)) dispatch({ type: 'focusout' });
      });
    }

    const onKey = (event) => {
      if (event.key === 'Escape' && open) dispatch({ type: 'escape' });
    };
    /* Un toucher hors de la scène (en-tête, fiche) ferme aussi ; la barre d'achat garde son effet. Un
       clic venu d'un script n'est pas un toucher : la 3D coche ainsi les choix de la fiche (commit). */
    const onOutside = (event) => {
      if (!open || !event.isTrusted || stage.contains(event.target)) return;
      dispatch({ type: 'outside' });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onOutside, true);

    /* ---- Arrivée : la bascule, puis les légendes, puis la cote ; les filets se dessinent. ---- */
    const timers = [
      setTimeout(() => stage.classList.add('is-ready'), reducedMotion ? 0 : enterAfter),
      setTimeout(() => stage.classList.add('is-settled'), reducedMotion ? 0 : settleAfter),
    ];

    update(current);

    return {
      update,
      resize,
      track,
      open: openRail,
      close,
      get openGroup() { return open; },
      // La rangée ouverte : de combien la scène remonte, où la rangée se pose (px de scène). Sinon null.
      get placement() { return open ? spot : null; },
      get layout() { return L; },
      get face() { return face; },
      get staged() { return staged; },
      get corners() { return corners; },
      focusFirst: () => { const b = toggle.querySelector('[aria-pressed="true"]'); if (b) b.focus({ preventScroll: true }); },
      // Un autre catalogue (la fiche du jumeau a remplacé la page) : les chips le lisent désormais.
      setCatalog(next) {
        catalog = next;
        update(current);
      },
      // La barre d'achat : elle peut naître après les chips.
      setPill(node) {
        if (pill === node) return;
        setPillAway(false);
        pill = node;
        if (pill) pill.classList.add('chips-pill');
        if (open && spot) setPillAway(spot.hidePill);
      },
      // L'œuvre des vignettes de taille : une petite image suffit (30 px de haut au plus).
      setArtImage(url) {
        stage.style.setProperty('--chips-art', url ? `url("${url}")` : 'none');
      },
      // La 3D bouge (mise en scène, fondu, doigt posé) : les plaques gardent leur teinte, sans flou.
      setMoving(moving) {
        if (moving !== stage.classList.contains('is-moving')) stage.classList.toggle('is-moving', moving);
      },
      destroy() {
        timers.forEach(clearTimeout);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onOutside, true);
        for (const node of [svg, toggle, left, right, cote, closer, ...Object.values(rails)]) node.remove();
        stage.classList.remove('chips', 'is-desk', 'is-open', 'is-staged', 'is-ready', 'is-settled', 'is-moving', 'is-returning');
        setPillAway(false);
      },
    };
  }

  window.Oeuvre3dChips = { ...pure, createChips };
})();
