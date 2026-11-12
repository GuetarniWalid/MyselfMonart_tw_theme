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
 * des choix. Hors du plan de face sans rangée ouverte (glisser), les légendes prennent une plaque
 * dépolie serrée sur leur texte et les filets s'effacent. Le temps de l'acte de la matière (bascule
 * Toile | Poster), légendes, cote et filets s'effacent ; la bascule reste, sur sa plaque (retour du 12/11).
 *
 * Trois étages, du plus pur au plus concret :
 *   - chipsLayout, railPlacement, toggleOf, legendOf, choicesOf, le cadrage de la 3D (railZone,
 *     canvasBox, directorAspect, framingAt), et l'œuvre projetée (faceOf : de face ou non ; filetEnds et
 *     coteMarks : filets et cote, hors de l'œuvre même tournée) : géométrie et textes, sans DOM
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
     de la cote sous l'œuvre ; disc : pastille d'un choix du design, la mesure de la mise en page de
     face ; discMax : la pastille de la rangée au plus grand (railDiscOf) ; optW : largeur d'un choix ;
     railGap : écart de la rangée sous l'œuvre ; colW : longueur des filets sur ordinateur ;
     gapHalf : demi-blanc de la cote, où s'écrit « Taille » ; pill : place de la barre d'achat ;
     railBody : hauteur d'une rangée hors pastille ; note : sa ligne de note ; tile : hauteur du
     tableau le plus grand dans la vignette de taille. */
  const PHONE = { togUp: 56, legH: 52, coteGap: 18, disc: 40, discMax: 50, optW: 56, railGap: 6, colW: 0, gapHalf: 29, pill: 60, maxS: 1.05, railBody: 80, note: 18, tile: 30 };
  const DESK = { togUp: 66, legH: 62, coteGap: 24, disc: 54, discMax: 64, optW: 78, railGap: 12, colW: 176, gapHalf: 40, pill: 0, maxS: 1.4, railBody: 93, note: 20, tile: 40 };

  /* L'œuvre prend la place qui reste (« Ce qui s'adapte », fichier v2) : 66 px de colonne pour chaque
     légende, 56 px au-dessus pour la matière, 50 px dessous pour la taille, 60 px pour la barre
     d'achat ; le bloc (bascule, œuvre, cote) se centre au-dessus de la barre. Sur ordinateur : 1,4 fois
     le tableau du téléphone, filets de 176 px, bloc centré. width, height : la scène, sous l'en-tête ;
     ratio : largeur / hauteur de l'œuvre (le design ne montrait que le 3:4 : un paysage ou un carré
     garde la largeur du portrait, sa hauteur suit). Ordinateur : l'échelle baisse si la fenêtre est
     trop petite (le design ne montrait que 1440 × 820). Même règle pour la photo d'arrivée, en CSS
     (input.css, .oeuvre-3d-scene) : à garder identique, sinon la page saute. */
  /* obstacles : sur ordinateur, ce qu'une rangée ne doit pas couvrir, en px de la scène ({ left, right,
     top }) : la pilule d'achat, en bas à droite, et le bouton du panier au-dessus d'elle. */
  function chipsLayout({ width, height, ratio = 0.75, obstacles = [] }) {
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
    const L = {
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
      obstacles: desk ? obstacles : [],
    };
    L.disc = railDiscOf(L);
    return L;
  }

  /* La pastille des rangées (cadre, bordure, contour), plus grande que dans le design pour les photos
     des cadres (retour de Walid du 12/11/2026 : « il faut que tu grossisses un peu les ronds ») : jusqu'à
     discMax, 4 px plus étroite que son choix au moins, et jamais au prix de la barre d'achat : sur un
     petit écran où la rangée la gardait avec la pastille du design, elle la garde encore. La mise en
     page de face reste celle du design (k.disc). */
  function railDiscOf(L) {
    const { k } = L;
    const widest = L.desk ? k.discMax : Math.min(k.discMax, optionWidth(L, RAIL_COUNT) - 4);
    // Avec et sans ligne de note : une rangée sans note gardait parfois la barre qu'une rangée notée effaçait.
    const hides = (disc) => [false, true].map((note) => placeRail(L, disc, note, RAIL_COUNT).hidePill).join();
    const before = hides(k.disc);
    for (let disc = widest; disc > k.disc; disc -= 1) if (hides(disc) === before) return disc;
    return Math.min(widest, k.disc);
  }

  // La plus longue rangée : les six cadres de la toile (Aucun et cinq teintes).
  const RAIL_COUNT = 6;

  /* Largeur d'une rangée de count choix : toute la largeur moins 12 px de chaque côté sur un téléphone ;
     sur ordinateur, centrée, ses choix, 4 px entre eux et 14 px de bord de chaque côté (input.css). */
  const railWidth = (L, count = RAIL_COUNT) =>
    L.desk ? count * optionWidth(L, count) + (count - 1) * 4 + 28 : L.W - 24;

  /* Une rangée ouverte : où elle se pose, de combien la scène remonte, et si la barre d'achat doit
     laisser sa place (petit téléphone seulement). note : la rangée a une ligne de note ; count : son
     nombre de choix. Sur ordinateur, elle s'arrête au-dessus de la pilule et du panier qu'elle croise
     (retour de l'UX du 11/11/2026 : en 768 × 1024, elle couvrait leurs prix). */
  function railPlacement(L, note = false, count = RAIL_COUNT) {
    return placeRail(L, L.disc || L.k.disc, note, count);
  }

  // railPlacement, pour une pastille de disc px (railDiscOf l'essaie à plusieurs tailles).
  function placeRail(L, disc, note, count) {
    const { k, box: art } = L;
    const h = disc + k.railBody + (note ? k.note : 0);
    const need = art.b + k.railGap + h;
    const half = railWidth(L, count) / 2;
    const crossed = L.obstacles.filter((o) => L.cx + half > o.left - 8 && L.cx - half < o.right + 8);
    const lim1 = Math.min(L.pillTop, ...crossed.map((o) => o.top)) - 8;
    const highest = Math.max(0, art.t - 12); // la scène ne remonte jamais l'œuvre à moins de 12 px du haut
    let shift = 0;
    let hidePill = false;
    if (need > lim1) {
      shift = Math.min(need - lim1, highest);
      if (need - shift > lim1 && !L.desk) {
        hidePill = true;
        shift = Math.min(Math.max(0, need - (L.SH - 12)), highest);
      }
    }
    const lim = hidePill ? L.SH - 12 : L.desk ? Math.min(L.SH - 12, lim1) : lim1;
    const top = Math.min(art.b - shift + k.railGap, lim - h);
    return { shift: Math.round(shift), hidePill, top: Math.round(top), height: h };
  }

  // Le plus grand décalage possible de la scène : la 3D doit couvrir aussi ce qui remonte.
  const maxShift = (L) => railPlacement(L, true).shift;

  // La part d'un choix sur un téléphone : toute la rangée partagée entre ses choix, jamais moins de 44 px.
  const optionShare = (L, count) =>
    L.desk ? L.k.optW : Math.max(44, Math.floor((L.W - 40 - 2 * (count - 1)) / count));

  // Largeur d'un choix dans la rangée, celle du design (optW), moins si la rangée n'a pas la place.
  const optionWidth = (L, count) => (L.desk ? L.k.optW : Math.min(L.k.optW, optionShare(L, count)));

  /* Deux noms voisins d'une rangée ne se touchent jamais : 6 px au moins entre eux (space). Un nom plus
     large que son choix déborde de part et d'autre ; s'il touche un voisin, les choix s'élargissent
     d'abord, jusqu'à leur part de la rangée (share) ; si cela ne suffit pas, tous les noms de la rangée
     rapetissent ensemble, jusqu'aux 4/5 de leur taille (scale). Le 12/11/2026, « Chêne vieilli » (le
     cadre du poster) tenait en français, mais « Roble envejecido » touchait ses voisins sur un petit
     téléphone. widths : largeur de chaque nom, en px, à sa taille normale ; width : largeur du choix ;
     gap : écart entre deux choix. */
  function railFit(widths, { width, share = width, gap = 2, space = 6, least = 0.8 }) {
    let worst = 0; // la plus large paire de voisins : la moitié de chacun
    for (let i = 1; i < widths.length; i += 1) worst = Math.max(worst, (widths[i - 1] + widths[i]) / 2);
    const need = Math.ceil(worst + space - gap);
    if (need <= width) return { width, scale: 1 };
    if (need <= share) return { width: need, scale: 1 };
    return { width: share, scale: Math.max(least, Math.floor(((share + gap - space) / worst) * 100) / 100) };
  }

  /* Les rangées, d'après les retours de Walid du 09/11/2026. Ouvrir une rangée (sa légende ou la cote,
     au doigt ou au clavier) joue tout de suite la mise en scène de son groupe avec le choix en cours,
     sans attendre qu'on en change (effet 'stage', retour sur la version 15). Toucher un choix
     l'applique (légende, prix, mise en scène) et la rangée reste ouverte, pour enchaîner les choix
     (retour sur la version 14). Elle se ferme seulement par un toucher en dehors d'elle (mur, œuvre,
     légende active, « Retour », en-tête…), par Échap ou quand le focus la quitte ; ce toucher ramène
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
     fichiers de langue du thème. {size} : un format ; {frame} : un cadre ; {material} : une matière.
     money : le prix en euros mis en forme (la fiche passe celui de la boutique, Product.formatPrice). */
  const TEXTS_FR = {
    group: { material: 'Matière', size: 'Taille', border: 'Bordure', frame: 'Cadre', passe: 'Contour' },
    seeChoices: 'Voir les choix',
    cm: 'cm',
    included: 'inclus',
    unavailable: 'indisponible en {size}',
    noFrame: 'Pas de cadre en {size}',
    unframedHint: 'sans cadre',
    /* Retour de Walid du 12/11/2026 : « le 90 × 120 est livré sans cadre » faisait croire à un problème de
       livraison, et « avec cadre, la taille passe au 75 × 100 » ne disait pas pourquoi. Chaque message dit
       la raison (nos cadres s'arrêtent au 75 × 100), puis ce qui change. {size} : la taille choisie ou
       quittée ; {max} : la plus proche qui porte le cadre. Mêmes textes sur la fiche classique. */
    unframedSize: 'Nos cadres s’arrêtent au {max}. Le {size} sera donc sans cadre.',
    keepFrame: 'Garder le cadre, en {max}',
    sizeMoved: 'Nos cadres s’arrêtent au {max}. La taille passe donc du {size} au {max}.',
    staySize: 'Garder le {size}, sans cadre',
    framedUpTo: 'Avec un cadre, la taille passe au {size}',
    frameNotIn: 'Le cadre {frame} n’existe pas en {material} : nous l’avons retiré.',
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

  /* ---------------- Le cadre qu'une taille ou une matière n'a pas ---------------- */

  /* Retour de Walid du 11/11/2026 : un cadre choisi, puis le 90 × 120, qui n'existe pas encadré, et le
     cadre disparaissait sans un mot (« il va croire que c'est un bug »). Solution validée le même jour,
     « Prévenir et expliquer » :
       - avec un cadre en tête, la vignette d'une taille qui ne le porte pas dit « sans cadre », et les
         autres vignettes montrent le cadre ;
       - la choisir retire le cadre et le dit (noticeOf), avec « Garder le cadre » : la taille la plus
         proche qui le porte (le 75 × 100) ;
       - le cadre retiré reste en mémoire (held) : revenir à une taille, ou à une matière, qui le porte
         le remet ;
       - à une taille sans cadre, toucher un cadre passe à la taille la plus proche qui le porte, et le dit.
     Choisir un cadre, « Aucun » compris, efface la mémoire. */

  // La taille la plus proche de celle du produit, en dessous d'abord, qui porte ce cadre ; null : aucune.
  function framedSizeOf(catalog, product, frame) {
    const sizes = catalog.options('size', product).map((o) => o.id);
    const at = sizes.indexOf(product.size);
    const carries = (size) => catalog.apply('size', { ...product, frame }, size).frame === frame;
    return sizes.slice(0, Math.max(0, at)).reverse().find(carries) || sizes.slice(at + 1).find(carries) || null;
  }

  /* Un choix (group, id) sur le produit, avec la mémoire du cadre (held). Rend le produit qui en sort
     (next), la nouvelle mémoire (held), le cadre que ce choix vient de retirer (dropped) et, quand
     toucher un cadre a changé la taille, la taille quittée (moved). null : ce choix n'existe pas. */
  function pickOf(catalog, product, group, id, held = null) {
    if (group === 'frame') {
      if (catalog.available('frame', product, id)) return { next: catalog.apply('frame', product, id), held: null, dropped: null, moved: null };
      const size = framedSizeOf(catalog, product, id);
      return size ? { next: catalog.apply('frame', { ...product, size }, id), held: null, dropped: null, moved: product.size } : null;
    }
    if (!catalog.available(group, product, id)) return null;
    const wanted = held && product.frame === 'sans' && (group === 'size' || group === 'material') ? { ...product, frame: held } : product;
    const next = catalog.apply(group, wanted, id);
    const dropped = product.frame !== 'sans' && next.frame === 'sans' ? product.frame : null;
    return { next, held: dropped || (next.frame === 'sans' ? held : null), dropped, moved: null };
  }

  /* Ce qu'un choix doit dire, ou null : le cadre retiré par une taille, avec « Garder le cadre, en
     75 × 100 » ; par la matière (le poster n'a pas l'argent), sans bouton : revenir à la toile le remet ;
     la taille changée par un cadre, avec « Garder le 90 × 120, sans cadre ». action : le choix que le
     bouton rejoue. */
  function noticeOf(catalog, texts, product, group, pick) {
    if (!pick) return null;
    const { next, dropped, moved } = pick;
    const sizeName = (id) => dims(catalog.size(id), false, texts);
    if (moved) {
      return {
        text: fill(texts.sizeMoved, { size: sizeName(moved), max: sizeName(next.size) }),
        action: { label: fill(texts.staySize, { size: sizeName(moved) }), group: 'size', id: moved },
      };
    }
    if (!dropped) return null;
    if (group === 'material') {
      const frame = catalog.options('frame', product).find((o) => o.id === dropped);
      const material = catalog.options('material', next).find((o) => o.id === next.material);
      return { text: fill(texts.frameNotIn, { frame: frame ? frame.name : '', material: material ? material.name : '' }), action: null };
    }
    if (group !== 'size') return null;
    // La taille la plus proche qui porte le cadre retiré : celle d'où l'on vient, au moins.
    const size = framedSizeOf(catalog, next, dropped);
    if (!size) return { text: fill(texts.noFrame, { size: sizeName(next.size) }), action: null };
    return {
      text: fill(texts.unframedSize, { size: sizeName(next.size), max: sizeName(size) }),
      action: { label: fill(texts.keepFrame, { max: sizeName(size) }), group: 'size', id: size },
    };
  }

  /* La bascule de la matière : un choix par matière, le prix de chacun dans son libellé (le cadre en
     mémoire compris, s'il y revient). */
  function toggleOf(catalog, texts, product, held = null) {
    return catalog.options('material', product).map((o) => {
      const pressed = catalog.value('material', product) === o.id;
      const pick = pickOf(catalog, product, 'material', o.id, held);
      const next = pick ? pick.next : catalog.apply('material', product, o.id);
      return { id: o.id, name: o.name, pressed, label: `${texts.group.material} : ${o.spoken}, ${money(texts, catalog.price(next))}` };
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
     à l'option de base pour les autres), sa disponibilité et la note de la rangée. Pour la taille, avec
     un cadre en tête (choisi, ou en mémoire : held), le cadre que chaque vignette porterait (frame) et
     « sans cadre » sous celles qui ne le portent pas (caption) ; leurs prix comptent ce cadre. À une
     taille sans cadre, un cadre se choisit encore : il passe à la taille la plus proche qui le porte ;
     son prix est l'écart à cette taille, et la note de la rangée le dit. */
  function choicesOf(catalog, texts, group, product, held = null) {
    const unframed = catalog.unframedSize();
    const current = catalog.value(group, product);
    const wanted = catalog.framed(product) ? product.frame : held;
    let unavailable = false;
    let movedTo = null;
    const options = catalog.options(group, product).map((o) => {
      const pick = pickOf(catalog, product, group, o.id, held);
      const available = !!pick;
      if (!available) unavailable = true;
      const next = pick ? pick.next : catalog.apply(group, product, o.id);
      const moved = !!(pick && pick.moved);
      if (moved && !movedTo) movedTo = next.size;
      let price = '';
      let spokenPrice = '';
      if (group === 'size' || group === 'material') {
        price = money(texts, catalog.price(next));
        spokenPrice = price;
      } else if (available) {
        const base = catalog.apply(group, moved ? { ...product, size: next.size } : product, catalog.base(group));
        const delta = Math.round((catalog.price(next) - catalog.price(base)) * 100) / 100;
        price = delta > 0 ? `+${money(texts, delta)}` : '';
        spokenPrice = price || (group === 'border' || (group === 'passe' && o.id === 'avec') ? texts.included : '');
      }
      const frame = group === 'size' && next.frame !== 'sans' ? next.frame : null;
      const name = group === 'size' ? dims(catalog.size(o.id), false, texts) : o.name;
      const spoken = available ? (spokenPrice ? `, ${spokenPrice}` : '') : `, ${fill(texts.unavailable, { size: unframed })}`;
      const after = moved
        ? `. ${fill(texts.sizeMoved, { size: dims(catalog.size(product.size), false, texts), max: dims(catalog.size(next.size), false, texts) })}`
        : '';
      return { id: o.id, name, price: available ? price : '—', label: `${texts.group[group]} : ${o.spoken}${spoken}${after}`, selected: o.id === current, available, caption: '', frame };
    });
    /* « sans cadre » sous les tailles qui ne portent pas le cadre en tête, s'il existe à une autre taille de
       cette matière (le poster n'a jamais l'argent : ses tailles ne le disent pas toutes). */
    if (group === 'size' && wanted && options.some((o) => o.frame)) {
      for (const o of options) {
        if (o.frame) continue;
        o.caption = texts.unframedHint;
        o.label += `, ${o.caption}`;
      }
    }
    const note = group !== 'frame' ? ''
      : movedTo ? fill(texts.framedUpTo, { size: dims(catalog.size(movedTo), false, texts) })
        : unavailable ? fill(texts.noFrame, { size: unframed }) : '';
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
  // Le cadre autour du tableau d'une vignette de taille : une teinte pleine par cadre, lisible sur 2 px.
  const FRAME_TONE = { blanc: '#f7f5ef', noir: '#24201d', argent: '#b4b7bd', chene: '#d2ad78', noyer: '#6a3f28' };
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

  // Vignette de taille : l'œuvre à l'échelle des autres formats (tallest : le plus haut, en cm), au centre.
  function sizeTileOf(size, maxH, tallest = 120) {
    const h = (maxH * size.h) / tallest;
    return { w: Math.round(((h * size.w) / size.h) * 2) / 2, h };
  }

  /* Plan de face ou non : l'œuvre projetée s'écarte de sa place de face (en part de sa largeur). Au-delà
     de 12 %, on est sur un autre plan. L'inclinaison au doigt la déplace aussi : de 4 % avant le 11/11,
     jusqu'à 23 % depuis qu'elle va jusqu'à 40° de côté et 14° en hauteur (retours de Walid : « j'aimerais
     qu'on puisse le manipuler plus », puis « encore le tourner plus à gauche ou à droite »). Ce qu'elle
     explique ne compte pas (lean : part de la largeur par radian d'inclinaison ; au plus fort, il en faut
     0,24) : les filets la suivent, les plaques ne viennent pas. */
  const FACE = { near: 0.06, far: 0.12, staged: 0.6, lean: 0.4 };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* Part du plan de face, de 1 (de face) à 0 (un autre plan). corners : les quatre coins de la façade
     projetés (haut gauche, haut droit, bas droit, bas gauche) ; art : leur place de face (l, t, r, b, w) ;
     tilt : l'inclinaison au doigt que la vue de la 3D applique (yaw, pitch, en radians), sinon null. */
  function faceOf(corners, art, tilt = null) {
    const ref = [[art.l, art.t], [art.r, art.t], [art.r, art.b], [art.l, art.b]];
    const dev = Math.max(...corners.map((c, i) => Math.hypot(c.x - ref[i][0], c.y - ref[i][1])));
    const lean = tilt ? FACE.lean * Math.hypot(tilt.yaw, tilt.pitch) : 0;
    return clamp01(1 - (dev - (FACE.near + lean) * art.w) / ((FACE.far - FACE.near) * art.w));
  }

  /* Où un bord de l'œuvre (de a à b) croise la ligne horizontale y. */
  function edgeX(a, b, y) {
    if (Math.abs(b.y - a.y) < 1e-6) return a.x;
    const t = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)));
    return a.x + (b.x - a.x) * t;
  }

  /* La cote sous l'œuvre, en px de scène : un trait à chaque coin bas de la façade, de 5 px au-dessus à
     5 px au-dessous de la ligne, et deux lignes, des coins au blanc où s'écrit « Taille ». Tourné au plus
     fort et vu d'en haut (40° de côté, 14° en hauteur, retours de Walid du 11/11), le coin bas le plus
     proche descend jusqu'à elle : l'œuvre passe devant, comme devant un trait tracé au mur. Traits et
     lignes s'arrêtent alors à COTE_CLEAR px sous son bord bas ; un trait qui ne croise plus la ligne
     s'efface. corners : les quatre coins de la façade projetés (haut gauche, haut droit, bas droit, bas
     gauche), sinon null : l'œuvre de face (L.art). Rend { tickL, tickR, lineL, lineR } : [x1, y1, x2,
     y2], du coin vers le blanc pour les lignes, ou null pour une marque cachée. */
  const COTE_CLEAR = 3;
  function coteMarks(L, corners = null) {
    const { lineB: y, cx } = L;
    const { gapHalf } = L.marks;
    const bl = corners ? corners[3] : { x: L.art.l, y: L.art.b };
    const br = corners ? corners[2] : { x: L.art.r, y: L.art.b };
    const roof = y - COTE_CLEAR; // le bord bas de l'œuvre doit rester au-dessus
    // Les x de la ligne que le bord bas laisse libres : du côté du coin resté assez haut.
    let lo = -Infinity, hi = Infinity;
    if (bl.y > roof && br.y > roof) lo = hi = cx;
    else if (br.y > roof) hi = edgeX(bl, br, roof);
    else if (bl.y > roof) lo = edgeX(bl, br, roof);
    const line = (from, to) => {
      const a = Math.max(Math.min(from, to), lo), b = Math.min(Math.max(from, to), hi);
      if (b - a < 1) return null;
      return from < to ? [a, y, b, y] : [b, y, a, y];
    };
    const tick = (corner) => {
      const top = Math.max(y - 5, corner.y + COTE_CLEAR);
      return top <= y - 1 ? [corner.x, top, corner.x, y + 5] : null;
    };
    return { tickL: tick(bl), tickR: tick(br), lineL: line(bl.x, cx - gapHalf), lineR: line(br.x, cx + gapHalf) };
  }

  /* Les filets des légendes, à la hauteur L.lineY : où ils touchent l'œuvre, à gauche (xl) et à droite
     (xr). De face, sur les bords de la façade. Tournée (jusqu'à 40° de côté depuis les retours de Walid
     du 11/11), l'œuvre montre du côté de la caméra la tranche de la toile ou le flanc du cadre : le
     filet s'arrête au bord de la silhouette, là où l'arrière de la boîte touche le mur, sans passer
     dessus. corners : les quatre coins de la façade projetés (haut gauche, haut droit, bas droit, bas
     gauche), sinon null : l'œuvre de face (L.art) ; back : ceux de l'arrière, dans le même ordre. */
  function filetEnds(L, corners = null, back = null) {
    if (!corners) return { xl: L.art.l, xr: L.art.r };
    const y = L.lineY;
    const [tl, tr, br, bl] = corners;
    let xl = edgeX(tl, bl, y), xr = edgeX(tr, br, y);
    if (back) {
      xl = Math.min(xl, edgeX(back[0], back[3], y));
      xr = Math.max(xr, edgeX(back[1], back[2], y));
    }
    return { xl, xr };
  }

  const pure = {
    DESK_MIN, TEXTS_FR, chipsLayout, railPlacement, railWidth, maxShift, optionWidth, optionShare, railFit, railEvent, railZone, canvasBox,
    directorAspect, framingAt, toggleOf, legendOf, choicesOf, pickOf, framedSizeOf, noticeOf, eur, dims, swatchOf, sizeTileOf,
    faceOf, coteMarks, filetEnds, FRAME_TONE,
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
    let back = null; // l'arrière de la boîte de l'œuvre, projeté (filetEnds)
    let face = 1;
    let staged = false;
    let switching = false; // l'acte de la matière en cours (setSwitching)
    let held = null; // le cadre qu'une taille ou une matière a retiré, en mémoire (pickOf)
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
    /* Le message d'un choix qui retire le cadre ou change la taille (noticeOf) : une plaque de papier
       au-dessus de la rangée ouverte, ou sous la bascule quand la matière l'a retiré. Il reste tant qu'on
       ne fait rien d'autre ; sans bouton, il part au bout de 6 s. Sa phrase passe aussi par une zone que
       les lecteurs d'écran lisent, toujours en place : un message qui naît dans une zone cachée n'est pas
       toujours lu. */
    const arrow = el('svg', { class: 'chips-notice-arrow', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' }, [
      el('path', { d: 'M3 8h9.5' }),
      el('path', { d: 'M8.5 3.75 12.75 8 8.5 12.25' }),
    ]);
    const notice = el('div', { class: 'chips-notice', 'data-anchor': 'rail' }, [
      el('p', { class: 'chips-notice-text' }),
      el('button', { type: 'button', class: 'chips-notice-action', hidden: true }, [el('span', { class: 'chips-notice-label' }), arrow]),
    ]);
    const spoken = el('p', { class: 'sr-only', role: 'status', 'data-allow-empty': true });
    stage.append(closer, ...Object.values(rails), notice, spoken);

    const sideGroup = () => catalog.side(current);
    const chipOf = (group) => (group === 'size' ? cote : group === 'frame' ? right : left);

    /* ---- Contenu : textes, prix, états ---- */

    function renderToggle() {
      const items = toggleOf(catalog, texts, current, held);
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
          ? el('span', { class: 'chips-tile', 'aria-hidden': 'true' }, [el('span', { class: 'chips-tile-art', 'data-allow-empty': true })])
          : el('span', { class: 'chips-disc', 'aria-hidden': 'true' }, [el('span', { class: 'chips-swatch', 'data-allow-empty': true })]),
        el('span', { class: 'chips-opt-name' }),
        el('span', { class: 'chips-opt-price', 'data-allow-empty': true }),
        el('span', { class: 'chips-opt-note', 'aria-hidden': 'true', 'data-allow-empty': true }),
      ]);
    }

    // La rangée a une ligne de note : sa note, ou « sans cadre » sous une vignette (même hauteur).
    const noteLine = (model) => !!model.note || model.options.some((o) => o.caption);

    function renderRail(group) {
      const rail = rails[group];
      const model = choicesOf(catalog, texts, group, current, held);
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
        setText(button.querySelector('.chips-opt-note'), o.caption);
        // Le tableau de la vignette porte le cadre en tête, aux tailles qui le portent.
        if (group === 'size') {
          const tone = o.frame ? FRAME_TONE[o.frame] || FRAME_TONE.noir : '';
          if (button.classList.contains('has-frame') !== !!tone) button.classList.toggle('has-frame', !!tone);
          if (tone && button.style.getPropertyValue('--chips-frame-tone') !== tone) button.style.setProperty('--chips-frame-tone', tone);
        }
      });
      // Des noms neufs (l'autre matière, une autre langue) : la rangée se recale sur eux.
      if (L && fits[group]?.key !== fitKey(group)) sizeRail(group);
      const note = rail.querySelector('.chips-rail-note');
      if (note.hidden !== !model.note) note.hidden = !model.note;
      setText(note, model.note);
      return model;
    }

    /* Les photos des cadres et des bordures (catalog.photo) : chargées seulement quand on approche la
       légende de leur rangée ou qu'on l'ouvre, pas pour chaque visite. Chacune s'affiche une fois
       chargée, sur le fond clair de la fiche (celles du poster sont détourées) ; en attendant, la teinte
       du design, à la taille de la photo. */
    const PHOTO_GROUPS = ['frame', 'border'];
    const photosWanted = new Set();
    const photoReady = new Set();
    const photoAsked = new Set();
    const photoOf = (group, id) => (catalog.photo ? catalog.photo(group, current, id) : null);
    function loadPhotos(group) {
      for (const { id } of catalog.options(group, current)) {
        const photo = photoOf(group, id);
        if (!photo || photoAsked.has(photo.url)) continue;
        photoAsked.add(photo.url);
        const image = new Image();
        image.onload = () => {
          photoReady.add(photo.url);
          refreshPhotos();
        };
        image.src = photo.url;
      }
    }
    const wantPhotos = (group) => {
      if (!PHOTO_GROUPS.includes(group) || photosWanted.has(group)) return;
      photosWanted.add(group);
      refreshPhotos();
    };

    /* La pastille d'un choix, à la taille de la rangée (L.disc) : la photo de son cadre ou de sa bordure,
       si elle en a une, remplit le rond à 2 px de son bord ; sinon la teinte du design, aux trois quarts
       du rond. */
    function swatchStyle(group, id) {
      const photo = PHOTO_GROUPS.includes(group) ? photoOf(group, id) : null;
      if (photo) {
        const d = L.disc - 4;
        const shown = photoReady.has(photo.url);
        const bg = shown ? `url("${photo.url}") ${photo.position} / ${photo.size} no-repeat, rgb(var(--color-secondary-rgb))` : swatchOf(group, id).bg;
        return { photo: shown ? photo.url : '', w: d, h: d, r: '50%', bg, shadow: RING, border: '0' };
      }
      return { photo: '', ...swatchOf(group, id, L.disc / PHONE.disc) };
    }

    /* La largeur des choix d'une rangée et la taille de ses noms (railFit). Les noms se mesurent en gras,
       la graisse du choix en cours, à leur taille normale. Recalculées quand les noms ou l'écran
       changent, et quand une police arrive (avant, la mesure prend celle de secours). */
    const fits = {};
    let fontRound = 0;
    let measure = null;
    const namesOf = (group) => [...rails[group].querySelectorAll('.chips-opt-name')];
    const fitKey = (group) => [L.W, L.desk, fontRound, ...namesOf(group).map((n) => n.textContent)].join('|');
    function fitRail(group) {
      const key = fitKey(group);
      if (fits[group]?.key === key) return fits[group];
      const rail = rails[group];
      const names = namesOf(group);
      const width = optionWidth(L, names.length);
      let widths = [];
      if (names.some((n) => n.textContent)) {
        const style = getComputedStyle(names[0]);
        const scale = Number(rail.style.getPropertyValue('--chips-name-k')) || 1;
        if (!measure) measure = document.createElement('canvas').getContext('2d');
        measure.font = `700 ${parseFloat(style.fontSize) / scale}px ${style.fontFamily}`;
        widths = names.map((n) => measure.measureText(n.textContent).width);
      }
      fits[group] = { key, ...railFit(widths, { width, share: optionShare(L, names.length), gap: L.desk ? 4 : 2 }) };
      rail.style.setProperty('--chips-name-k', String(fits[group].scale));
      return fits[group];
    }
    if (document.fonts) {
      const refit = () => {
        fontRound += 1;
        if (L) for (const group of RAIL_GROUPS) sizeRail(group);
      };
      document.fonts.ready.then(refit);
      document.fonts.addEventListener?.('loadingdone', refit);
    }

    // Tailles des pastilles et des vignettes : elles changent avec la mise en page (téléphone, ordinateur).
    function sizeRail(group) {
      if (!L) return;
      const box = rails[group].querySelector('.chips-rail-options');
      const { width } = fitRail(group);
      const tallest = group === 'size' ? Math.max(...[...box.children].map((b) => catalog.size(b.dataset.value).h)) : 0;
      for (const button of box.children) {
        button.style.width = px(width);
        if (group === 'size') {
          const tile = sizeTileOf(catalog.size(button.dataset.value), L.k.tile, tallest);
          Object.assign(button.querySelector('.chips-tile-art').style, { width: px(tile.w), height: px(tile.h) });
        } else {
          const s = swatchStyle(group, button.dataset.value);
          button.dataset.photo = s.photo;
          Object.assign(button.querySelector('.chips-swatch').style, {
            width: px(s.w), height: px(s.h), borderRadius: s.r, background: s.bg, boxShadow: s.shadow, border: s.border,
          });
        }
      }
    }

    /* Une photo vient d'arriver, ou l'autre matière a d'autres photos pour les mêmes choix : chaque
       rangée voulue reprend celles qui sont prêtes (et demande les autres). */
    function refreshPhotos() {
      if (!L) return;
      for (const group of photosWanted) {
        loadPhotos(group);
        const box = rails[group].querySelector('.chips-rail-options');
        const stale = [...box.children].some((button) => {
          const photo = photoOf(group, button.dataset.value);
          return (button.dataset.photo || '') !== (photo && photoReady.has(photo.url) ? photo.url : '');
        });
        if (stale) sizeRail(group);
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
      refreshPhotos();
      if (open && !rails[open].hidden) place(open);
      else if (open) close();
      placeNotice();
    }

    /* ---- Mise en page ---- */

    function resize({ width, height, obstacles = [] }) {
      L = chipsLayout({ width, height, ratio, obstacles });
      stage.classList.toggle('is-desk', L.desk);
      stage.style.setProperty('--chips-value', px(L.type.value));
      stage.style.setProperty('--chips-cote', px(L.type.cote));
      stage.style.setProperty('--chips-disc', px(L.disc));
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
      placeNotice();
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

    // Un segment de coteMarks en chemin SVG ; null : rien à tracer.
    const segment = (s) => {
      if (!s) return '';
      return s[0] === s[2] ? `M${r1(s[0])} ${r1(s[1])}V${r1(s[3])}` : `M${r1(s[0])} ${r1(s[1])}H${r1(s[2])}`;
    };

    function drawMarks() {
      if (!L) return;
      const { xl, xr } = filetEnds(L, corners, back);
      const { lineY: y } = L;
      const { lx, rx } = L.marks;
      setD(marks.sideLine, `M${r1(lx)} ${y}H${r1(xl)}`);
      setD(marks.frameLine, `M${r1(rx)} ${y}H${r1(xr)}`);
      const cote = coteMarks(L, corners);
      setD(marks.tickL, segment(cote.tickL));
      setD(marks.tickR, segment(cote.tickR));
      setD(marks.lineL, segment(cote.lineL));
      setD(marks.lineR, segment(cote.lineR));
      setDot(marks.sideDot, xl, y);
      setDot(marks.frameDot, xr, y);
    }

    /* track(coins, tilt, arrière) : les quatre coins de la façade de l'œuvre (haut gauche, haut droit, bas
       droit, bas gauche), en px de la couche `scene`, tels que la 3D les projette, l'inclinaison au doigt
       de sa vue (faceOf) et les coins de l'arrière de sa boîte, dans le même ordre (filetEnds) ; null :
       la photo, à sa place de face. Appelé à chaque image de la 3D ; ne touche au DOM que si quelque
       chose change. */
    function track(next, tilt = null, nextBack = null) {
      if (!L) return;
      corners = next;
      back = next ? nextBack : null;
      const k = next ? faceOf(next, L.art, tilt) : 1;
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
      const model = choicesOf(catalog, texts, group, current, held);
      spot = railPlacement(L, noteLine(model), model.options.length);
      scene.style.transform = spot.shift ? `translateY(${-spot.shift}px)` : '';
      rails[group].style.top = px(spot.top);
      setPillAway(spot.hidePill);
      placeNotice();
    }

    /* ---- Le message d'un choix (noticeOf) ---- */

    let shown = null; // le message affiché, ou null
    let noticeTimer = 0;
    // Au-dessus de la rangée ouverte, à 8 px ; sans rangée, sous la bascule.
    function placeNotice() {
      if (!shown || !L) return;
      const onRail = !!(open && spot);
      setAttr(notice, 'data-anchor', onRail ? 'rail' : 'top');
      notice.style.top = px(onRail ? spot.top - 8 : L.toggle.top + (L.desk ? 60 : 50));
    }
    function showNotice(message) {
      clearTimeout(noticeTimer);
      shown = message;
      setText(notice.querySelector('.chips-notice-text'), message.text);
      const action = notice.querySelector('.chips-notice-action');
      action.hidden = !message.action;
      if (message.action) setText(action.querySelector('.chips-notice-label'), message.action.label);
      placeNotice();
      notice.classList.add('is-shown');
      // Vidée puis remplie : la même phrase, deux fois de suite, est lue deux fois.
      spoken.textContent = '';
      requestAnimationFrame(() => { if (shown === message) spoken.textContent = message.text; });
      if (!message.action) noticeTimer = setTimeout(hideNotice, 6000);
    }
    function hideNotice() {
      clearTimeout(noticeTimer);
      if (!shown) return;
      shown = null;
      notice.classList.remove('is-shown');
      spoken.textContent = '';
    }

    function openRail(group, { focus = false } = {}) {
      wantPhotos(group);
      hideNotice();
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
      hideNotice();
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

    /* Un choix : la page l'applique (prix, 3D) et rappelle update(produit). La rangée reste ouverte. Un
       choix qui retire le cadre, ou un cadre qui change la taille, le dit (noticeOf) ; le cadre retiré
       reste en mémoire (pickOf). silent : le choix du bouton du message, qui ne dit rien de plus. */
    function apply({ type, group, id, silent = false }) {
      const g = type === 'toggle' ? 'material' : group;
      const pick = pickOf(catalog, current, g, id, held);
      if (!pick) return;
      const message = silent ? null : noticeOf(catalog, texts, current, g, pick);
      held = pick.held;
      onChoose(g, id, pick.next);
      if (message) showNotice(message);
      else hideNotice();
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
    // Le doigt, la souris ou le clavier approchent une légende : les photos de sa rangée partent déjà.
    for (const type of ['pointerenter', 'pointerdown', 'focus']) {
      right.addEventListener(type, () => wantPhotos('frame'));
      left.addEventListener(type, () => wantPhotos(sideGroup()));
    }
    cote.addEventListener('click', (event) => dispatch({ type: 'chip', group: 'size', keyboard: keyboard(event) }));
    // Toucher ailleurs sur la scène (mur, œuvre, légende active, « Retour ») : un voile le reçoit,
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
      // Le focus quitte la rangée, sa légende et son message (Tab) : comme un toucher en dehors.
      rail.addEventListener('focusout', (event) => {
        if (open !== group || !event.relatedTarget) return;
        if (!rail.contains(event.relatedTarget) && event.relatedTarget !== chipOf(group) && !notice.contains(event.relatedTarget)) dispatch({ type: 'focusout' });
      });
    }

    // Le bouton du message rejoue son choix (« Garder le cadre », « Rester en 90 × 120 »), sans autre message.
    notice.addEventListener('click', (event) => {
      const action = shown && shown.action;
      if (!action || !event.target.closest('.chips-notice-action')) return;
      hideNotice();
      apply({ type: 'pick', group: action.group, id: action.id, silent: true });
      // Au clavier, le bouton part avec le message : le focus revient au choix en cours de la rangée.
      if (keyboard(event) && open) requestAnimationFrame(() => {
        const target = open && rails[open].querySelector('.chips-opt[aria-pressed="true"]');
        if (target) target.focus({ preventScroll: true });
      });
    });
    notice.addEventListener('focusout', (event) => {
      if (!open || !event.relatedTarget) return;
      const target = event.relatedTarget;
      if (!rails[open].contains(target) && target !== chipOf(open) && !notice.contains(target)) dispatch({ type: 'focusout' });
    });

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
      /* La 3D joue l'acte de la matière (bascule Toile | Poster) : légendes, cote et filets s'effacent le
         temps du geste, la bascule reste (retour de Walid du 12/11 : leurs plaques gênaient plus
         qu'elles n'aidaient). Ils reviennent l'acte fini, une fois l'œuvre de face. */
      setSwitching(acting) {
        const next = acting || (switching && staged);
        if (next === switching) return;
        switching = next;
        stage.classList.toggle('is-switching', next);
      },
      /* L'œuvre est zoomée : légendes, filets, bascule et taille s'effacent et ne prennent plus ni le doigt
         ni le focus (la pilule d'achat reste). Elles reviennent à ×1. */
      setZoomed(zoomed) {
        if (zoomed === stage.classList.contains('is-zoomed')) return;
        stage.classList.toggle('is-zoomed', zoomed);
        setHidden(zoomed || !!open);
        if (zoomed) hideNotice();
      },
      // Pincer pour revenir de face, rangée ouverte : exactement un toucher en dehors.
      dismiss: () => dispatch({ type: 'outside' }),
      destroy() {
        timers.forEach(clearTimeout);
        clearTimeout(noticeTimer);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onOutside, true);
        for (const node of [svg, toggle, left, right, cote, closer, ...Object.values(rails), notice, spoken]) node.remove();
        stage.classList.remove('chips', 'is-desk', 'is-open', 'is-staged', 'is-ready', 'is-settled', 'is-moving', 'is-returning', 'is-switching', 'is-zoomed');
        setPillAway(false);
      },
    };
  }

  window.Oeuvre3dChips = { ...pure, createChips };
})();
