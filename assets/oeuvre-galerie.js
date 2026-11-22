/*
 * oeuvre-galerie.js — le script de la page galerie des œuvres 3D
 * ------------------------------------------------------------------------------------------------------
 * Chargé par le bloc principal de la fiche (sections/main-product.liquid) quand son réglage « Page galerie »
 * est coché, avec la feuille assets/oeuvre-galerie.css. Porté de la maquette validée par Walid le 20/11/2026
 * (.scratch/fiche-3d/galerie, version 13).
 *
 * Tout le comportement de la page vit dans des éléments personnalisés : ils démarrent à leur arrivée dans la
 * page (connectedCallback) et se nettoient à leur départ (disconnectedCallback). La bascule Toile / Poster
 * (assets/product-twin-toggle.js) remplace tout le contenu de la page sous la scène 3D : aucun script en ligne
 * n'y est rejoué, et ce fichier, déjà chargé, ne l'est pas non plus. Ne jamais compter sur DOMContentLoaded.
 *
 * Un bloc par partie de la page, entre deux repères « début » et « fin », chacun dans sa propre fonction.
 * Un bloc suivant s'ajoute à la fin du fichier. Pour les tests (Node, sans navigateur), il ajoute ses calculs
 * purs à module.exports (Object.assign), puis s'arrête.
 */

/* === Socle et présentation (ticket 19) : début === */
(function () {
  'use strict';

  /* Les mots d'un texte, dans l'ordre : chaque mot tel quel, et une espace pour chaque blanc entre deux mots
     (espaces, tabulations, retours à la ligne). Une espace insécable ne coupe pas : « Pourquoi ? » reste un mot. */
  function motsDe(texte) {
    return String(texte)
      .split(/([ \n\t]+)/)
      .filter(Boolean)
      .map((morceau) => (/^[ \n\t]+$/.test(morceau) ? ' ' : morceau));
  }

  // Node (tests) : le calcul pur.
  if (typeof window === 'undefined') {
    Object.assign(module.exports, { motsDe });
    return;
  }
  if (customElements.get('galerie-mots')) return;

  /* Le mouvement suit-il le défilement ? Oui si le navigateur sait lier une animation au défilement et si le
     visiteur ne demande pas moins de mouvement. Les mêmes conditions que la feuille (@media
     prefers-reduced-motion, @supports) : les changer ensemble. Sinon, tout est en place, rien ne bouge. */
  const mouvementLie = () =>
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()') && CSS.supports('animation-range-start', 'contain 10svh'));

  /* La page porte data-galerie-page dès le serveur, et sa feuille est dans <head> (layout/product.liquid) : rien
     ne bouge pendant la bascule Toile / Poster, qui ne remplace que le contenu sous la scène. Si une bascule menait
     un jour vers une fiche qui n'est pas en page galerie, la marque suivrait le bloc principal. */
  document.addEventListener('mma:soft-navigation', () => {
    document.documentElement.toggleAttribute('data-galerie-page', !!document.querySelector('main-product-blocks[data-galerie]'));
  });

  /* <galerie-mots> : un grand titre dont les mots arrivent un à un, au fil du défilement.
     Si le mouvement suit le défilement : chaque mot passe dans un <span class="galerie-mot"> qui porte son rang
     (--i), et la feuille l'anime d'après sa place à l'écran. Sinon, le texte reste tel que le serveur l'a écrit.
     Découpé, le titre se lit toujours d'une traite : son texte entier va aux lecteurs d'écran (.sr-only), ses
     mots leur sont cachés. Sans cela, certains lecteurs s'arrêtent sur chaque mot. Rien à nettoyer au départ :
     ni écouteur, ni observateur. */
  class GalerieMots extends HTMLElement {
    connectedCallback() {
      if (this.decoupe || !mouvementLie()) return;
      this.decoupe = true;

      const lu = document.createElement('span');
      lu.className = 'sr-only';
      lu.textContent = this.textContent.replace(/\s+/g, ' ').trim();

      const vu = document.createElement('span');
      vu.setAttribute('aria-hidden', 'true');
      vu.append(...this.childNodes);
      let rang = 0;
      const decouper = (noeud) => {
        Array.from(noeud.childNodes).forEach((enfant) => {
          if (enfant.nodeType === Node.ELEMENT_NODE) {
            decouper(enfant);
            return;
          }
          if (enfant.nodeType !== Node.TEXT_NODE) return;
          const morceaux = document.createDocumentFragment();
          motsDe(enfant.textContent).forEach((morceau) => {
            if (morceau === ' ') {
              morceaux.append(' ');
              return;
            }
            const mot = document.createElement('span');
            mot.className = 'galerie-mot';
            mot.style.setProperty('--i', rang);
            mot.textContent = morceau;
            rang += 1;
            morceaux.append(mot);
          });
          enfant.replaceWith(morceaux);
        });
      };
      decouper(vu);

      // Une espace entre les deux : le texte de la page ne colle pas le titre lu au titre vu.
      this.append(lu, ' ', vu);
    }
  }
  customElements.define('galerie-mots', GalerieMots);
})();
/* === Socle et présentation (ticket 19) : fin === */

/* === Avis, recommandations, questions (ticket 23) : début === */
(function () {
  'use strict';

  // Node (tests) : ce bloc n'a aucun calcul à part ; il ne touche qu'au navigateur.
  if (typeof window === 'undefined') return;
  if (customElements.get('galerie-recos')) return;

  /* <galerie-recos> : l'endroit où les recommandations de Shopify se déposent (sections/galerie-recos.liquid).
     L'élément du thème, <product-recommendations> (assets/product-recommendations.js), y écrit les œuvres
     proposées : des cartes de produit du thème (snippets/card-product.liquid), dont les images arrivent floues
     et ne se chargent en entier que par le dé-floutage du thème (window.removeSkeletonOnImagesLoad,
     assets/tw-global.js), qui ne passe qu'au chargement de la page. Il repasse donc ici, sur ces cartes, dès
     qu'elles sont déposées. L'élément du thème n'est pas retouché : il fait pareil ailleurs.
     Il guette ses seuls enfants (ce que le thème remplace), et s'arrête à son départ : la bascule Toile /
     Poster l'enlève avec le reste de la fiche. */
  class GalerieRecos extends HTMLElement {
    connectedCallback() {
      if (this.veille) return;
      this.veille = new MutationObserver(() => {
        if (typeof window.removeSkeletonOnImagesLoad === 'function') window.removeSkeletonOnImagesLoad(this);
      });
      this.veille.observe(this, { childList: true });
    }

    disconnectedCallback() {
      if (!this.veille) return;
      this.veille.disconnect();
      this.veille = null;
    }
  }
  customElements.define('galerie-recos', GalerieRecos);
})();
/* === Avis, recommandations, questions (ticket 23) : fin === */

/* === Scène en trois temps (ticket 20) : début === */
(function () {
  'use strict';

  /* L'état de la scène. « natif » : le navigateur lie les animations au défilement, aucun script ne tourne
     pendant le défilement. « secours » : il ne sait pas le faire, le script donne la position. Rien : le visiteur
     demande moins de mouvement, la scène reste à plat. */
  function modeDeScene({ reduit, lie }) {
    if (reduit) return '';
    return lie ? 'natif' : 'secours';
  }

  /* L'échelle de la scène sur téléphone, en pixels par centimètre : la plus grande possible entre le bas du texte
     de la lumière et la ligne du sol, sans sortir de l'écran. La dame et son lit (1,86 m) tiennent alors toute la
     largeur. En hauteur, il faut loger l'œuvre accrochée à 1,67 m (son centre), sa lampe au-dessus d'elle, et un
     peu d'air : 2,42 m pour un portrait, plus pour une œuvre large, dont la lampe est plus large, donc plus haute
     (voir placesDeScene pour la taille de l'œuvre). */
  function echelleDeScene({ largeur, ecran, pied, bas, ratio }) {
    const hauteurCm = Math.min(110, 150 / ratio);
    const largeurCm = Math.min(110 * ratio, 150);
    const haut = Math.max(242, 173 + hauteurCm / 2 + 0.17 * largeurCm);
    const cm = Math.max(1, Math.min((pied - bas - 14) / haut, largeur * 0.0054, ecran * 0.003));
    return Math.round(cm * 1000) / 1000;
  }

  /* Les places de l'œuvre, d'après sa boîte dans l'écran de la scène (x, y, l, h), avant tout mouvement.
     La lumière : à l'échelle du lit (cm, en pixels par centimètre), haute de 1,10 m et large de 1,50 m au plus (le
     lit fait 1,86 m), son centre à 1,67 m du sol (--yc, --e3).
     La matière : sur téléphone, jusqu'où grossir pour qu'elle remplisse l'écran, et de combien la recentrer ; sur
     ordinateur, le grossissement est celui de la feuille (null : la valeur posée ici est retirée), un peu décalé. */
  function placesDeScene({ grand, largeur, hauteur, ecran, pied, cm, x, y, l, h }) {
    const milieu = y + h / 2;
    const places = {
      '--yc': Math.round(pied - 167 * cm - milieu) + 'px',
      '--e3': Math.min((110 * cm) / h, (150 * cm) / l).toFixed(4),
    };
    if (grand) {
      places['--zoom'] = null;
      places['--zx'] = Math.round(largeur * 0.03) + 'px';
      places['--zy'] = Math.round(ecran * 0.03) + 'px';
    } else {
      places['--zoom'] = (Math.max(largeur / l, hauteur / h) * 1.05).toFixed(3);
      places['--zx'] = Math.round(largeur / 2 - (x + l / 2)) + 'px';
      places['--zy'] = Math.round(ecran / 2 - milieu) + 'px';
    }
    return places;
  }

  /* Secours : la position de la scène, en écrans depuis son épinglage (haut : le haut de la scène dans l'écran). */
  function tempsDeScene(haut, ecran) {
    return (ecran > 0 ? -haut / ecran : 0).toFixed(4);
  }

  /* Le repère : où faire défiler la page pour arriver à un temps de la scène (en écrans depuis son épinglage). */
  function departDuTemps({ haut, defilement, ecran, temps }) {
    return Math.round(haut + defilement + temps * ecran);
  }

  // Node (tests) : les calculs purs.
  if (typeof window === 'undefined') {
    Object.assign(module.exports, { modeDeScene, echelleDeScene, placesDeScene, tempsDeScene, departDuTemps });
    return;
  }
  if (customElements.get('galerie-scene')) return;

  /* La condition du socle, à l'identique (elle est privée à son bloc) : les changer ensemble, avec la feuille. */
  const mouvementLie = () =>
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()') && CSS.supports('animation-range-start', 'contain 10svh'));

  /* <galerie-scene> : la scène en trois temps (sections/galerie-scene.liquid).
     Sans script, elle est à plat. À son arrivée dans la page, l'élément choisit son état et le pose dans
     data-mouvement ; la feuille fait le reste. Dans un état animé :
     - il mesure la scène (son échelle sur téléphone, la place de l'œuvre au-dessus du lit, son gros plan) et
       pose ces mesures en variables ; il les refait quand l'écran ou la hauteur des textes change (taille de la
       fenêtre, police qui arrive). Après la bascule Toile / Poster, c'est une nouvelle scène qui arrive : elle
       fait les siennes ;
     - il fait entrer les personnages dans la page quand la scène approche, et demande alors leurs images : pas
       avant, pour ne rien charger pendant le haut de la page ;
     - un trait du repère mène à son temps ;
     - en secours seulement, il suit le défilement et écrit la position de la scène (--t), une fois par image.
     Tout s'arrête à son départ de la page. */
  class GalerieScene extends HTMLElement {
    connectedCallback() {
      const piece = (nom) => this.querySelector('.galerie-scene-' + nom);
      this.ecran = piece('ecran');
      if (!this.ecran) return;
      this.pieces = { textes: piece('chapitres'), lumiere: piece('lumiere'), oeuvre: piece('derive'), unEcran: piece('sonde-ecran'), unMetre: piece('sonde-cm'), pied: piece('sonde-pied') };
      this.reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.grand = window.matchMedia('(min-width: 900px)');
      this.regler = () => this.choisir();
      this.mesurer = () => this.poserMesures();
      this.suivre = () => {
        if (this.enVue && !this.attente) this.attente = requestAnimationFrame(this.placer);
      };
      this.placer = () => {
        this.attente = 0;
        this.style.setProperty('--t', tempsDeScene(this.getBoundingClientRect().top, this.hauteurEcran()));
      };
      this.auClic = (evenement) => this.allerAuTemps(evenement.target.closest('[data-temps]'));
      this.addEventListener('click', this.auClic);
      this.reduit.addEventListener('change', this.regler);
      this.choisir();
    }

    disconnectedCallback() {
      if (!this.ecran) return;
      this.arreter();
      this.removeEventListener('click', this.auClic);
      this.reduit.removeEventListener('change', this.regler);
      this.mode = null;
    }

    /* Choisit l'état, à l'arrivée et quand le réglage « mouvements réduits » change. */
    choisir() {
      const mode = modeDeScene({ reduit: this.reduit.matches, lie: mouvementLie() });
      if (mode === this.mode) return;
      this.arreter();
      this.mode = mode;
      if (!mode) {
        this.removeAttribute('data-mouvement');
        return;
      }
      this.setAttribute('data-mouvement', mode);
      // Les mesures : au premier affichage, puis à chaque changement de l'écran ou de la colonne des textes.
      this.tailles = new ResizeObserver(this.mesurer);
      this.tailles.observe(this.ecran);
      this.tailles.observe(this.pieces.textes);
      // La scène approche (à un quart d'écran) : les personnages entrent dans la page (data-proche, voir la feuille)
      // et leurs images se chargent, toutes, même celles qui attendent hors de l'écran ; le secours la suit tant
      // qu'elle est là.
      this.approche = new IntersectionObserver(
        (entrees) => {
          this.enVue = entrees[entrees.length - 1].isIntersecting;
          if (!this.enVue) return;
          this.setAttribute('data-proche', '');
          this.querySelectorAll('img[loading="lazy"]').forEach((image) => {
            image.loading = 'eager';
          });
          if (this.mode === 'secours') this.placer();
          else this.approche.disconnect();
        },
        { rootMargin: '25% 0px' }
      );
      this.approche.observe(this);
      if (this.mode === 'secours') this.suivreDefilement();
    }

    /* Secours : le script donne la position de la scène, au plus une fois par image, tant qu'elle est en vue. */
    suivreDefilement() {
      window.addEventListener('scroll', this.suivre, { passive: true });
      window.addEventListener('resize', this.suivre);
      this.placer();
    }

    /* Arrête l'état en cours : observateurs, écouteurs du secours, image demandée, variables posées. */
    arreter() {
      if (this.tailles) this.tailles.disconnect();
      if (this.approche) this.approche.disconnect();
      window.removeEventListener('scroll', this.suivre);
      window.removeEventListener('resize', this.suivre);
      cancelAnimationFrame(this.attente);
      this.attente = 0;
      this.enVue = false;
      ['--cm', '--yc', '--e3', '--zoom', '--zx', '--zy', '--t'].forEach((nom) => this.style.removeProperty(nom));
    }

    /* Un écran « court » (100svh), l'unité de toute la scène. */
    hauteurEcran() {
      return this.pieces.unEcran.offsetHeight || window.innerHeight;
    }

    /* La boîte d'un élément dans l'écran de la scène, sans ses mouvements. */
    boite(element) {
      let x = 0;
      let y = 0;
      for (let e = element; e && e !== this.ecran; e = e.offsetParent) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      return { x, y, l: element.offsetWidth, h: element.offsetHeight };
    }

    /* Les mesures de la scène, posées en variables sur l'élément. Tout est lu d'abord, puis écrit. */
    poserMesures() {
      if (!this.mode) return;
      const oeuvre = this.boite(this.pieces.oeuvre);
      if (!oeuvre.l || !oeuvre.h) return;
      const grand = this.grand.matches;
      const largeur = this.ecran.clientWidth;
      const hauteur = this.ecran.clientHeight;
      const ecran = this.hauteurEcran();
      const pied = this.pieces.pied.offsetHeight;
      let cm;
      if (grand) {
        // Ordinateur : l'échelle est celle de la feuille, lue sur sa sonde d'un mètre (sans celle du téléphone, si
        // la fenêtre vient de s'élargir).
        if (this.style.getPropertyValue('--cm')) this.style.removeProperty('--cm');
        cm = this.pieces.unMetre.offsetHeight / 100;
      } else {
        const texte = this.boite(this.pieces.lumiere);
        cm = echelleDeScene({ largeur, ecran, pied, bas: texte.y + texte.h, ratio: oeuvre.l / oeuvre.h });
        this.style.setProperty('--cm', cm + 'px');
      }
      const places = placesDeScene({ grand, largeur, hauteur, ecran, pied, cm, ...oeuvre });
      Object.entries(places).forEach(([nom, valeur]) => {
        if (valeur === null) this.style.removeProperty(nom);
        else this.style.setProperty(nom, valeur);
      });
    }

    /* Un trait du repère : la page défile jusqu'au début de son temps. L'en-tête du site reparaît quand la page
       remonte : il attend la fin de ce défilement, pour ne pas recouvrir le repère (son événement
       preventHeaderReveal, assets/tw-header.js). */
    allerAuTemps(trait) {
      if (!trait || !this.mode) return;
      const entete = document.querySelector('sticky-header');
      if (entete) entete.dispatchEvent(new Event('preventHeaderReveal'));
      window.scrollTo({
        top: departDuTemps({ haut: this.getBoundingClientRect().top, defilement: window.scrollY, ecran: this.hauteurEcran(), temps: Number(trait.dataset.temps) }),
        behavior: 'smooth',
      });
    }
  }
  customElements.define('galerie-scene', GalerieScene);
})();
/* === Scène en trois temps (ticket 20) : fin === */

/* === Couleurs à toucher (ticket 28) : début === */
(function () {
  'use strict';

  /* Ce que la page donne au moteur (assets/galerie-couleurs.js, sa fonction lire), d'après ce que le serveur a
     écrit dans la section (sections/galerie-couleurs.liquid) : des identifiants de couleurs de la boutique (les
     handles des métaobjets).
     - arretees : les couleurs que le serveur a arrêtées pour cette page (artwork.colors), dans leur ordre. La liste
       est close : le moteur n'ajoute rien (completer: false), il retrouve seulement leurs zones dans l'image.
     - declarees : les couleurs déclarées du produit (shopify.color-pattern). Sans couleurs arrêtées, le moteur lit
       celles-là et complète jusqu'à trois ; sans rien du tout, il lit l'image seule.
     Le noir et le blanc : pour un produit qui déclare « blanc-noir », le serveur arrête le noir puis le blanc. Or le
     moteur ne range pas les tons de l'image de la même façon selon qu'on lui donne « blanc-noir » ou les deux à part
     (sur le zèbre d'essai, le blanc couvre 15 % de l'image d'un côté, moins de 2 % de l'autre). La page lui donne
     donc « blanc-noir » à leur place ; il rend toujours le noir, puis le blanc. */
  function entreeDuMoteur({ arretees = [], declarees = [] }) {
    if (!arretees.length) return { lire: declarees.slice(), completer: true };
    const lire = arretees.slice(0, 3);
    const noir = lire.indexOf('noir');
    const blanc = lire.indexOf('blanc');
    if (declarees.includes('blanc-noir') && noir >= 0 && blanc >= 0) {
      lire.splice(Math.max(noir, blanc), 1);
      lire.splice(Math.min(noir, blanc), 1, 'blanc-noir');
    }
    return { lire, completer: false };
  }

  /* ---- Les calculs du travailleur ----
     Le moteur n'est jamais modifié (il est identique à l'octet à celui du serveur) : ce que la page y ajoute (les
     points de chaque couleur, son contour, la carte des couleurs) se calcule ici, à partir des masques qu'il rend.
     Portés du prototype validé (couleurs-interactif/outils/travail.js). Ces fonctions ne lisent rien autour d'elles :
     le travailleur reçoit leur texte (texteDuTravailleur). */

  /* Un flou en boîte, séparable : la moyenne de ce qui est dans l'image (bords compris). */
  function flou(src, W, H, r) {
    const tmp = new Float32Array(W * H);
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let s = 0;
      let n = 0;
      for (let x = 0; x <= r && x < W; x++) { s += src[o + x]; n++; }
      for (let x = 0; x < W; x++) {
        tmp[o + x] = s / n;
        const plus = x + r + 1;
        const moins = x - r;
        if (plus < W) { s += src[o + plus]; n++; }
        if (moins >= 0) { s -= src[o + moins]; n--; }
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      let n = 0;
      for (let y = 0; y <= r && y < H; y++) { s += tmp[y * W + x]; n++; }
      for (let y = 0; y < H; y++) {
        out[y * W + x] = s / n;
        const plus = y + r + 1;
        const moins = y - r;
        if (plus < H) { s += tmp[plus * W + x]; n++; }
        if (moins >= 0) { s -= tmp[moins * W + x]; n--; }
      }
    }
    return out;
  }

  /* Les pixels en OKLab, un sur quatre (le coin de chaque carré de 2 × 2) : la grille des points. */
  function labDemi(px, W, H, versLab) {
    const w = W >> 1;
    const h = H >> 1;
    const lab = new Float32Array(w * h * 3);
    const o = [0, 0, 0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (2 * y * W + 2 * x) * 4;
        const k = (y * w + x) * 3;
        versLab(px[i], px[i + 1], px[i + 2], o);
        lab[k] = o[0];
        lab[k + 1] = o[1];
        lab[k + 2] = o[2];
      }
    }
    return lab;
  }

  /* Les points d'une couleur : là où elle est la plus dense, sur une grille deux fois plus petite (assez pour placer
     un point). Le score aime le cœur d'une grande zone (densité proche, densité large) et, pour des touches éparses,
     l'endroit où elles se serrent ; il aime aussi les pixels qui ressemblent le plus à la pastille (le vert franc des
     nénuphars plutôt que l'eau sombre entre eux), et un rien le milieu du tableau, pour départager une couleur qui est
     partout. Une grande couleur reçoit un point, une moyenne deux, une petite ou éparse trois. Chaque point est
     ramené sur la couleur elle-même, loin des bords. alpha : son masque ; part : sa part de l'image ; lab : les
     pixels sur la grille (labDemi) ; teinte : [L, a, b] de sa pastille. Rend des positions entre 0 et 1. */
  function reperes(alpha, W, H, part, lab, teinte) {
    const w = W >> 1;
    const h = H >> 1;
    const m = new Float32Array(w * h);
    const t = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 2 * y * W + 2 * x;
        const k = y * w + x;
        m[k] = (alpha[i] + alpha[i + 1] + alpha[i + W] + alpha[i + W + 1]) / 1020;
        if (lab && teinte) {
          const dL = lab[k * 3] - teinte[0];
          const da = lab[k * 3 + 1] - teinte[1];
          const db = lab[k * 3 + 2] - teinte[2];
          t[k] = Math.max(0, 1 - Math.sqrt(0.6 * dL * dL + da * da + db * db) / 0.2) * m[k];
        } else t[k] = m[k];
      }
    }
    const court = Math.min(w, h);
    const r1 = Math.max(2, Math.round(court * 0.045));
    const r2 = Math.max(4, Math.round(court * 0.13));
    const d1 = flou(flou(m, w, h, r1), w, h, r1);
    const d2 = flou(flou(m, w, h, r2), w, h, r2);
    const dt = flou(t, w, h, r1);
    const cx = w / 2;
    const cy = h / 2;
    const demi = Math.hypot(cx, cy);
    const score = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        score[i] = d1[i] * (0.35 + d2[i]) * (0.45 + 0.55 * dt[i]) * (1 - (0.18 * Math.hypot(x - cx, y - cy)) / demi);
      }
    }
    const marge = Math.max(2, Math.round(court * 0.09));
    const candidats = [];
    // Toute couleur montrée a au moins un point : le meilleur sommet, même faible ; les suivants doivent valoir au
    // moins 40 % du premier. (Une couleur tout au bord : le point le plus dense, ramené dans les marges.)
    let meilleur = -1;
    let mi = 0;
    for (let i = 0; i < w * h; i++) if (d1[i] > meilleur) { meilleur = d1[i]; mi = i; }
    for (let y = marge; y < h - marge; y++) {
      for (let x = marge; x < w - marge; x++) {
        const i = y * w + x;
        const s = score[i];
        if (s <= 0.0005) continue;
        if (s < score[i - 1] || s < score[i + 1] || s < score[i - w] || s < score[i + w] || s < score[i - w - 1] || s < score[i - w + 1] || s < score[i + w - 1] || s < score[i + w + 1]) continue;
        candidats.push([s, x, y]);
      }
    }
    candidats.sort((a, b) => b[0] - a[0]);
    const max = part >= 0.5 ? 1 : part >= 0.22 ? 2 : 3;
    const loin = 0.26 * Math.hypot(w, h);
    const pris = [];
    for (const [s, x, y] of candidats) {
      if (pris.length >= max) break;
      if (pris.length && s < 0.4 * pris[0].s) break;
      if (pris.some((p) => Math.hypot(p.x - x, p.y - y) < loin)) continue;
      pris.push({ s, x, y });
    }
    if (!pris.length && meilleur > 0) {
      pris.push({ s: meilleur, x: Math.min(w - marge - 1, Math.max(marge, mi % w)), y: Math.min(h - marge - 1, Math.max(marge, Math.floor(mi / w))) });
    }
    // Le point posé sur la couleur : le pixel le plus franc de la couleur tout près (puis un peu plus loin, et moins
    // franc, pour des touches très éparses).
    return pris.map((p) => {
      let bx = p.x;
      let by = p.y;
      let bv = -Infinity;
      for (const [rayon, seuil] of [[r1, 0.6], [2 * r1, 0.35]]) {
        for (let dy = -rayon; dy <= rayon; dy++) {
          for (let dx = -rayon; dx <= rayon; dx++) {
            const x = p.x + dx;
            const y = p.y + dy;
            if (x < marge || y < marge || x >= w - marge || y >= h - marge) continue;
            if (m[y * w + x] < seuil) continue;
            const v = 0.5 * m[y * w + x] + t[y * w + x] - Math.hypot(dx, dy) / (2 * rayon);
            if (v > bv) { bv = v; bx = x; by = y; }
          }
        }
        if (bv > -Infinity) break;
      }
      return { x: Math.round(((bx + 0.5) / w) * 10000) / 10000, y: Math.round(((by + 0.5) / h) * 10000) / 10000 };
    });
  }

  /* Le contour d'une couleur : un liseré d'un pixel autour de ses zones (la zone, lissée pour oublier les poussières
     d'un pixel, puis élargie d'un pixel, moins elle-même). */
  function contour(alpha, W, H) {
    const n = W * H;
    const m = new Float32Array(n);
    for (let i = 0; i < n; i++) m[i] = alpha[i] / 255;
    const lisse = flou(m, W, H, 1);
    const dedans = new Uint8Array(n);
    for (let i = 0; i < n; i++) dedans[i] = lisse[i] >= 0.5 ? 1 : 0;
    const out = new Uint8ClampedArray(n);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (dedans[i]) continue;
        let pres = 0;
        for (let dy = -1; dy <= 1 && !pres; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && dedans[yy * W + xx]) { pres = 1; break; }
          }
        }
        if (pres) out[i] = 255;
      }
    }
    return out;
  }

  /* La carte : pour une case de 4 × 4 pixels, la couleur montrée la plus présente (son rang), ou 255. */
  function carte(alphas, W, H) {
    const pas = 4;
    const cw = Math.ceil(W / pas);
    const ch = Math.ceil(H / pas);
    const c = new Uint8Array(cw * ch).fill(255);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        let meilleur = 110;
        let rang = 255;
        for (let r = 0; r < alphas.length; r++) {
          let s = 0;
          let k = 0;
          for (let dy = 0; dy < pas; dy += 2) {
            for (let dx = 0; dx < pas; dx += 2) {
              const xx = x * pas + dx;
              const yy = y * pas + dy;
              if (xx >= W || yy >= H) continue;
              s += alphas[r][yy * W + xx];
              k++;
            }
          }
          const v = k ? s / k : 0;
          if (v > meilleur) { meilleur = v; rang = r; }
        }
        c[y * cw + x] = rang;
      }
    }
    return { carte: c, cw, ch };
  }

  /* La lecture d'une image (des pixels RGBA) : le moteur choisit les couleurs (lire) et trouve leurs zones
     (masques) ; puis, pour chaque couleur montrée, trois au plus : son identifiant dans la boutique (le moteur dit
     « dore » pour « or »), sa couleur dans l'œuvre (celle de sa pastille), sa clarté, sa part de l'image et ses
     points ; son masque et son contour (0 à 255 par pixel) ; et la carte des couleurs. */
  function lireLesZones(moteur, pixels, largeur, hauteur, { lire, completer }) {
    const modele = moteur.lire(pixels, largeur, hauteur, lire, { completer });
    const zones = moteur.masques(pixels, largeur, hauteur, modele).slice(0, 3);
    const handles = Object.keys(moteur.HANDLES);
    const lab = labDemi(pixels, largeur, hauteur, moteur.versLab);
    const couleurs = zones.map((zone, rang) => {
      const choisie = modele.choisis[rang];
      const teinte = choisie.L != null ? [choisie.L, choisie.a, choisie.b] : null;
      return {
        handle: handles.find((handle) => moteur.HANDLES[handle] === choisie.cle) || choisie.cle,
        css: choisie.css || '',
        L: Math.round((choisie.L || 0) * 1000) / 1000,
        part: Math.round(zone.part * 10000) / 10000,
        reperes: reperes(zone.alpha, largeur, hauteur, zone.part, lab, teinte),
      };
    });
    const lieux = carte(zones.map((zone) => zone.alpha), largeur, hauteur);
    return { couleurs, masques: zones.map((zone) => zone.alpha), contours: zones.map((zone) => contour(zone.alpha, largeur, hauteur)), carte: lieux.carte, cw: lieux.cw, ch: lieux.ch };
  }

  /* Le travailleur (un Worker, hors du fil principal) : il charge le moteur, va chercher la copie de 320 px de
     l'image (celle que lit le serveur), la lit (lireLesZones) et rend chaque masque et chaque contour en image PNG,
     avec la carte. Rien de tout cela ne passe par le fil de la page. Il lui faut OffscreenCanvas (Chrome, Firefox
     105, Safari 16.4) : sans lui, il répond une erreur, et les pastilles et les phrases marchent sans points ni
     traits. */
  function travail() {
    self.onmessage = async ({ data }) => {
      try {
        importScripts(data.moteur);
        const reponse = await fetch(data.image);
        if (!reponse.ok) throw new Error('image ' + reponse.status);
        const image = await createImageBitmap(await reponse.blob());
        const largeur = 320;
        const hauteur = Math.max(1, Math.round((largeur * image.height) / image.width));
        const toile = new OffscreenCanvas(largeur, hauteur);
        const contexte = toile.getContext('2d', { willReadFrequently: true });
        contexte.imageSmoothingQuality = 'high';
        contexte.drawImage(image, 0, 0, largeur, hauteur);
        image.close();
        const lu = lireLesZones(self.Couleurs, contexte.getImageData(0, 0, largeur, hauteur).data, largeur, hauteur, data);
        const enPng = async (alpha) => {
          const calque = new ImageData(largeur, hauteur);
          for (let i = 0; i < alpha.length; i += 1) calque.data[i * 4 + 3] = alpha[i];
          contexte.putImageData(calque, 0, 0);
          return toile.convertToBlob({ type: 'image/png' });
        };
        const masques = [];
        for (const alpha of lu.masques) masques.push(await enPng(alpha));
        const contours = [];
        for (const alpha of lu.contours) contours.push(await enPng(alpha));
        self.postMessage({ couleurs: lu.couleurs, masques, contours, carte: lu.carte, cw: lu.cw, ch: lu.ch }, [lu.carte.buffer]);
      } catch (erreur) {
        self.postMessage({ erreur: String((erreur && erreur.message) || erreur) });
      }
    };
  }

  /* Le texte du travailleur : ses fonctions, à la suite, puis son départ, par l'expression de sa fonction (un outil
     qui raccourcirait les noms garde ensemble ceux des déclarations et de leurs appels, pas un nom écrit en texte). */
  function texteDuTravailleur() {
    return [flou, labDemi, reperes, contour, carte, lireLesZones].join('\n') + `\n(${travail})();`;
  }

  /* ---- Les calculs de la page ---- */

  /* Les pastilles (leurs couleurs, dans l'ordre de la page) et la lecture (les couleurs rendues par le moteur, dans
     son ordre) : pour chaque pastille, le rang de sa couleur dans la lecture (-1 si le moteur ne l'a pas retrouvée),
     et les pastilles à cacher. Si aucune n'est retrouvée (une lecture qui a mal tourné), rien n'est caché : la page
     reste sans zones. */
  function planDesOnglets(onglets, lues) {
    const duMoteur = onglets.map((handle) => lues.indexOf(handle));
    const cachees = duMoteur.some((rang) => rang >= 0) ? duMoteur.map((rang, i) => (rang < 0 ? i : -1)).filter((i) => i >= 0) : [];
    return { duMoteur, cachees };
  }

  /* La pastille de la couleur à un point de l'œuvre (x, y entre 0 et 1) : celle de sa case dans la carte, ou celle
     de la case la plus proche qui a une pastille, à quatre cases au plus ; -1 sinon. versOnglet : le rang d'une
     couleur dans la lecture, vers sa pastille. */
  function ongletAuPoint({ carte: cases, cw, ch }, versOnglet, x, y) {
    const cx = Math.min(cw - 1, Math.max(0, Math.floor(x * cw)));
    const cy = Math.min(ch - 1, Math.max(0, Math.floor(y * ch)));
    for (let r = 0; r <= 4; r++) {
      let meilleur = -1;
      let distance = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const xx = cx + dx;
          const yy = cy + dy;
          if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
          const k = cases[yy * cw + xx];
          if (k === 255 || !versOnglet.has(k)) continue;
          const d = dx * dx + dy * dy;
          if (d < distance) {
            distance = d;
            meilleur = versOnglet.get(k);
          }
        }
      }
      if (meilleur >= 0) return meilleur;
    }
    return -1;
  }

  /* Au clavier, dans une liste d'onglets : la place visée depuis celle-ci (rang), parmi nombre. Les flèches vont à la
     voisine, en boucle ; Début et Fin, aux bouts ; toute autre touche : -1 (rien à faire). */
  function ongletVise(rang, touche, nombre) {
    if (touche === 'ArrowRight' || touche === 'ArrowDown') return (rang + 1) % nombre;
    if (touche === 'ArrowLeft' || touche === 'ArrowUp') return (rang - 1 + nombre) % nombre;
    if (touche === 'Home') return 0;
    if (touche === 'End') return nombre - 1;
    return -1;
  }

  /* Le vol d'un point, de la pastille jusqu'à sa place sur l'œuvre (dx, dy : de sa place à la pastille, en pixels) :
     il part de la pastille, gros et invisible, paraît, monte en arc (jusqu'à 120 px au-dessus de la ligne droite) et
     se pose. Les images clés d'Element.animate(). */
  function volDuRepere(dx, dy) {
    const px = (valeur) => Math.round(valeur * 10) / 10 + 'px';
    const arc = Math.min(120, Math.hypot(dx, dy) * 0.32);
    return [
      { transform: `translate(${px(dx)}, ${px(dy)}) scale(2.2)`, opacity: 0 },
      { transform: `translate(${px(dx)}, ${px(dy)}) scale(2)`, opacity: 1, offset: 0.06 },
      { transform: `translate(${px(dx * 0.42)}, ${px(dy * 0.42 - arc)}) scale(1.25)`, offset: 0.6 },
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
    ];
  }

  /* L'éclat d'une zone (sa luminosité, pour filter: brightness()) d'après la clarté de sa couleur (L, 0 à 1) :
     d'autant plus vif que la couleur est sombre ; aucun pour une couleur très claire (un blanc ne s'éclaircit pas,
     son contour suffit). */
  function eclatDe(L) {
    return L < 0.8 ? (1 + Math.min(0.95, 0.85 * (1 - L))).toFixed(2) : null;
  }

  // Node (tests) : les calculs purs, et le texte du travailleur.
  if (typeof window === 'undefined') {
    Object.assign(module.exports, { entreeDuMoteur, flou, labDemi, reperes, contour, carte, lireLesZones, texteDuTravailleur, planDesOnglets, ongletAuPoint, ongletVise, volDuRepere, eclatDe });
    return;
  }
  if (customElements.get('galerie-couleurs')) return;

  const liste = (texte) => String(texte || '').split(/\s+/).filter(Boolean);
  const absolue = (adresse) => new URL(adresse, document.baseURI).href;
  /* Une tranche de travail dans un temps mort du fil principal (au plus tard 120 ms après, s'il n'y en a pas) ; sans
     requestIdleCallback (Safari), la tâche suivante. Et pour l'annuler. */
  const plusTard = (tranche) => (window.requestIdleCallback ? window.requestIdleCallback(tranche, { timeout: 120 }) : window.setTimeout(tranche, 0));
  const annuler = (numero) => (window.cancelIdleCallback ? window.cancelIdleCallback(numero) : window.clearTimeout(numero));

  /* <galerie-couleurs> : les couleurs à toucher (sections/galerie-couleurs.liquid). Sans script, la section montre
     l'œuvre en couleurs et les phrases à la suite. Avec lui :
     - à son arrivée dans la page : les pastilles paraissent, des onglets ; les phrases deviennent leurs panneaux,
       empilés à la même place (data-pret sur la section) ; la première couleur est choisie, sa phrase se lit ;
     - à l'approche (un écran et demi avant), une fois : le moteur lit l'œuvre dans un travailleur ; puis, dans un temps
       mort, les calques de chaque couleur sont posés sur l'œuvre (ses points, son éclat, son contour), cachés sauf
       ceux de la couleur choisie (data-zones), et les pastilles prennent la couleur lue dans l'œuvre. Une couleur que
       le moteur n'a pas retrouvée perd sa pastille et sa phrase ;
     - toucher une pastille (ou une flèche, Début, Fin) : sa phrase ; ses points volent de la pastille jusqu'à l'œuvre,
       ses zones s'avivent et s'entourent d'un trait blanc un instant ; ensuite, seuls les points restent. Toucher la
       même couleur rejoue l'éclat. En mouvements réduits : rien ne vole, les zones restent un moment, puis s'éteignent ;
     - toucher l'œuvre : la couleur sous le doigt ; à la souris, une étiquette nomme la couleur sous le pointeur.
     Sans travailleur ni OffscreenCanvas (iOS avant 16.4), ou si la lecture échoue : les pastilles et les phrases
     marchent, sans points ni traits. Tout s'arrête au départ de l'élément (la bascule Toile / Poster remplace la
     section entière : la nouvelle repart de zéro). */
  class GalerieCouleurs extends HTMLElement {
    connectedCallback() {
      if (this.bloc) return;
      const bloc = this.closest('.galerie-couleurs');
      const rangee = this.querySelector('.galerie-couleurs-pastilles[role="tablist"]');
      if (!bloc || !rangee) return;
      const onglets = Array.from(rangee.querySelectorAll('[role="tab"]'));
      const panneaux = onglets.map((onglet) => this.querySelector('#' + CSS.escape(onglet.getAttribute('aria-controls') || '')));
      if (!onglets.length || panneaux.some((panneau) => !panneau)) return;
      this.bloc = bloc;
      this.liste = rangee;
      this.onglets = onglets;
      this.panneaux = panneaux;
      this.figure = this.querySelector('.galerie-couleurs-oeuvre');
      this.calques = this.querySelector('.galerie-couleurs-calques');
      this.survol = this.querySelector('.galerie-couleurs-survol');
      this.image = this.querySelector('.galerie-couleurs-image');
      this.reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.animations = [];
      this.liens = [];
      this.zones = null;
      this.panneaux.forEach((panneau, i) => {
        panneau.setAttribute('role', 'tabpanel');
        panneau.setAttribute('aria-labelledby', this.onglets[i].id);
        panneau.tabIndex = 0;
      });
      this.liste.hidden = false;
      this.bloc.setAttribute('data-pret', '');
      this.bloc.removeAttribute('data-zones');
      this.bloc.removeAttribute('data-touche');
      this.montrer(0, false);
      this.auClic = (evenement) => {
        const onglet = evenement.target.closest('[role="tab"]');
        if (onglet) this.choisir(this.onglets.indexOf(onglet));
      };
      this.auClavier = (evenement) => {
        const visibles = this.onglets.filter((onglet) => !onglet.hidden);
        const vise = ongletVise(visibles.indexOf(this.onglets[this.rang]), evenement.key, visibles.length);
        if (vise < 0) return;
        evenement.preventDefault();
        visibles[vise].focus();
        this.choisir(this.onglets.indexOf(visibles[vise]));
      };
      this.auToucher = (evenement) => {
        if (!this.zones) return;
        const i = this.ongletSous(evenement, this.figure.getBoundingClientRect());
        this.choisir(i >= 0 ? i : this.rang);
      };
      this.auSurvol = (evenement) => {
        if (evenement.pointerType !== 'mouse' || !this.zones) return;
        this.dernier = evenement;
        if (!this.attenteSurvol) this.attenteSurvol = requestAnimationFrame(() => this.suivreSurvol());
      };
      this.horsSurvol = () => {
        cancelAnimationFrame(this.attenteSurvol);
        this.attenteSurvol = 0;
        this.figure.removeAttribute('data-survol');
      };
      this.liste.addEventListener('click', this.auClic);
      this.liste.addEventListener('keydown', this.auClavier);
      this.figure.addEventListener('click', this.auToucher);
      this.figure.addEventListener('pointermove', this.auSurvol);
      this.figure.addEventListener('pointerleave', this.horsSurvol);
      this.approche = new IntersectionObserver(
        (entrees) => {
          if (!entrees.some((entree) => entree.isIntersecting)) return;
          this.approche.disconnect();
          this.lire();
        },
        { rootMargin: '150% 0px' }
      );
      this.approche.observe(this);
    }

    disconnectedCallback() {
      if (!this.bloc) return;
      this.approche.disconnect();
      this.liste.removeEventListener('click', this.auClic);
      this.liste.removeEventListener('keydown', this.auClavier);
      this.figure.removeEventListener('click', this.auToucher);
      this.figure.removeEventListener('pointermove', this.auSurvol);
      this.figure.removeEventListener('pointerleave', this.horsSurvol);
      this.arreter();
      this.animations.forEach((animation) => animation.cancel());
      this.animations = [];
      cancelAnimationFrame(this.attenteSurvol);
      this.attenteSurvol = 0;
      clearTimeout(this.minuterie);
      this.rendre();
      this.bloc = null;
    }

    /* Lit l'œuvre, hors du fil principal : le travailleur part, avec le moteur, la copie de l'image et la liste. Ce
       qu'il rend se pose dans un temps mort. Une erreur : rien ne change. */
    lire() {
      const entree = entreeDuMoteur({ arretees: liste(this.dataset.arretees), declarees: liste(this.dataset.declarees) });
      if (!entree.lire.length || !window.Worker) return;
      try {
        this.source = URL.createObjectURL(new Blob([texteDuTravailleur()], { type: 'text/javascript' }));
        this.travailleur = new Worker(this.source);
      } catch (erreur) {
        this.arreter();
        return;
      }
      this.travailleur.onmessage = ({ data }) => {
        this.arreter();
        if (!data || data.erreur) return;
        this.tranche = plusTard(() => {
          this.tranche = 0;
          if (this.bloc) this.poser(data);
        });
      };
      this.travailleur.onerror = () => this.arreter();
      this.travailleur.postMessage({ moteur: absolue(this.dataset.moteur), image: absolue(this.dataset.image), ...entree });
    }

    /* Arrête la lecture : la tranche en attente, le travailleur et son texte. */
    arreter() {
      if (this.tranche) annuler(this.tranche);
      this.tranche = 0;
      if (this.travailleur) this.travailleur.terminate();
      this.travailleur = null;
      if (this.source) URL.revokeObjectURL(this.source);
      this.source = null;
    }

    /* Rend ce que les calques tenaient : les adresses des masques et des contours, les calques eux-mêmes. */
    rendre() {
      this.liens.forEach((lien) => URL.revokeObjectURL(lien));
      this.liens = [];
      this.calques.replaceChildren();
      this.zones = null;
      this.survolRang = -1;
      this.figure.removeAttribute('data-survol');
      this.bloc.removeAttribute('data-zones');
    }

    /* Pose ce que le travailleur a lu : pour chaque pastille dont la couleur est retrouvée, ses calques (cachés), dans
       l'ordre des pastilles, et la couleur lue sur la pastille et dans sa phrase. */
    poser({ couleurs, masques, contours, carte: cases, cw, ch } = {}) {
      if (!Array.isArray(couleurs) || !Array.isArray(masques) || !Array.isArray(contours) || !cases) return;
      const plan = planDesOnglets(this.onglets.map((onglet) => onglet.dataset.couleur), couleurs.map((couleur) => couleur.handle));
      if (plan.duMoteur.every((rang) => rang < 0)) return;
      this.rendre();
      // Une couleur que le moteur n'a pas retrouvée dans l'œuvre perd sa pastille, donc sa phrase, qui ne sera plus
      // choisie. Elle reste dans la pile des phrases, invisible : la hauteur de la pile ne change pas, rien ne bouge
      // dans la page quand le travailleur répond.
      this.onglets.forEach((onglet, i) => {
        onglet.hidden = plan.cachees.includes(i);
      });
      this.versOnglet = new Map();
      plan.duMoteur.forEach((rang, i) => {
        if (rang >= 0) this.versOnglet.set(rang, i);
      });
      const creer = (balise, classe, styles = {}) => {
        const element = document.createElement(balise);
        if (classe) element.className = classe;
        Object.entries(styles).forEach(([nom, valeur]) => element.style.setProperty(nom, valeur));
        return element;
      };
      const adresse = (blob) => {
        const lien = URL.createObjectURL(blob);
        this.liens.push(lien);
        return `url("${lien}")`;
      };
      const fragment = document.createDocumentFragment();
      plan.duMoteur.forEach((rang, i) => {
        if (rang < 0) return;
        const c = couleurs[rang];
        const zone = creer('div', 'galerie-couleurs-zone');
        zone.dataset.rang = i;
        // L'éclat : la zone avivée, la même image que l'œuvre sous le masque de la couleur (mêmes paliers, même
        // requête). Aucun pour une couleur très claire : son contour suffit.
        const luminosite = eclatDe(c.L);
        if (luminosite) {
          const masque = adresse(masques[rang]);
          const eclat = creer('img', 'galerie-couleurs-eclat', { '--luminosite': luminosite, '-webkit-mask-image': masque, 'mask-image': masque });
          eclat.alt = '';
          eclat.decoding = 'async';
          eclat.loading = this.image.loading;
          eclat.crossOrigin = 'anonymous';
          eclat.sizes = this.image.sizes;
          eclat.srcset = this.image.srcset;
          eclat.src = this.image.getAttribute('src');
          zone.append(eclat);
        }
        // Le contour : un trait blanc, bordé d'encre, autour de ses zones.
        const bord = adresse(contours[rang]);
        const trait = creer('i', '', { '-webkit-mask-image': bord, 'mask-image': bord });
        trait.setAttribute('data-allow-empty', '');
        const ligne = creer('span', 'galerie-couleurs-contour');
        ligne.append(trait);
        zone.append(ligne);
        // Ses points : un à trois, là où elle se trouve.
        const points = creer('div', 'galerie-couleurs-reperes');
        points.setAttribute('data-allow-empty', '');
        points.dataset.rang = i;
        c.reperes.forEach((p, j) => {
          const point = creer('i', 'galerie-couleurs-repere', { '--x': String(p.x), '--y': String(p.y), '--c': c.css, '--j': String(j) });
          const halo = document.createElement('b');
          halo.setAttribute('data-allow-empty', '');
          point.append(halo);
          points.append(point);
        });
        fragment.append(zone, points);
        // La couleur lue dans l'œuvre, sur la pastille et dans sa phrase.
        if (c.css) {
          this.onglets[i].style.setProperty('--c', c.css);
          const pastille = this.panneaux[i].querySelector('b > i');
          if (pastille) pastille.style.setProperty('--c', c.css);
        }
      });
      this.calques.replaceChildren(fragment);
      this.zones = { carte: cases, cw, ch };
      this.bloc.setAttribute('data-zones', '');
      // La couleur choisie, si elle est encore là ; sinon la première qui reste.
      this.montrer(this.onglets[this.rang].hidden ? this.onglets.findIndex((onglet) => !onglet.hidden) : this.rang, false);
      // Tant que le visiteur n'a rien touché, les points de la première couleur tombent sur l'œuvre à son arrivée.
      if (!this.bloc.hasAttribute('data-touche')) {
        const premiers = this.calques.querySelector(`.galerie-couleurs-reperes[data-rang="${this.rang}"]`);
        if (premiers) premiers.setAttribute('data-entree', '');
      }
    }

    /* Le visiteur choisit une couleur (une pastille, une flèche, l'œuvre) : elle se montre, avec son éclat. */
    choisir(i) {
      if (!this.bloc || i < 0 || i >= this.onglets.length || this.onglets[i].hidden) return;
      this.bloc.setAttribute('data-touche', '');
      this.montrer(i, true);
    }

    /* La couleur de rang i : sa pastille choisie (seule dans l'ordre du clavier), sa phrase seule lisible ; ses calques,
       s'ils sont posés ; son éclat, si elle vient d'être choisie. */
    montrer(i, anime) {
      this.rang = i;
      this.onglets.forEach((onglet, k) => {
        onglet.setAttribute('aria-selected', String(k === i));
        onglet.tabIndex = k === i ? 0 : -1;
      });
      this.panneaux.forEach((panneau, k) => panneau.setAttribute('aria-hidden', String(k !== i)));
      if (!this.zones) return;
      this.calques.querySelectorAll('[data-rang]').forEach((calque) => calque.toggleAttribute('data-actif', Number(calque.dataset.rang) === i));
      if (anime) this.animer(i);
    }

    /* Les points partent de la pastille et se posent sur l'œuvre ; un halo s'ouvre autour de chacun ; ses zones
       s'éclairent et s'entourent de blanc un instant (1,7 s, dont 1,5 s visibles). En mouvements réduits : ni vol ni
       fondu, les zones restent éclairées un moment, puis s'éteignent. */
    animer(i) {
      this.animations.forEach((animation) => animation.cancel());
      this.animations = [];
      clearTimeout(this.minuterie);
      this.calques.querySelectorAll('[data-eclair]').forEach((zone) => zone.removeAttribute('data-eclair'));
      const zone = this.calques.querySelector(`.galerie-couleurs-zone[data-rang="${i}"]`);
      if (this.reduit.matches) {
        if (zone) {
          zone.setAttribute('data-eclair', '');
          this.minuterie = setTimeout(() => zone.removeAttribute('data-eclair'), 1800);
        }
        return;
      }
      const point = this.onglets[i].querySelector('.galerie-couleurs-point').getBoundingClientRect();
      const cadre = this.figure.getBoundingClientRect();
      const sx = point.left + point.width / 2;
      const sy = point.top + point.height / 2;
      this.calques.querySelectorAll(`.galerie-couleurs-reperes[data-rang="${i}"] .galerie-couleurs-repere`).forEach((repere, j) => {
        const px = cadre.left + parseFloat(repere.style.getPropertyValue('--x')) * cadre.width;
        const py = cadre.top + parseFloat(repere.style.getPropertyValue('--y')) * cadre.height;
        this.animations.push(repere.animate(volDuRepere(sx - px, sy - py), { duration: 620, delay: j * 80, easing: 'cubic-bezier(.3, .1, .25, 1)', fill: 'backwards' }));
        this.animations.push(repere.firstElementChild.animate([{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.8)' }], { duration: 700, delay: 600 + j * 80, easing: 'ease-out', fill: 'backwards' }));
      });
      if (zone) {
        const eclair = [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.62 }, { opacity: 0 }];
        zone.querySelectorAll('.galerie-couleurs-eclat, .galerie-couleurs-contour').forEach((calque) => {
          this.animations.push(calque.animate(eclair, { duration: 1700, delay: 320, easing: 'ease-in-out' }));
        });
      }
    }

    /* La pastille de la couleur sous le pointeur (un toucher, la souris), dans le cadre de l'œuvre ; -1 si aucune. */
    ongletSous(evenement, cadre) {
      return ongletAuPoint(this.zones, this.versOnglet, (evenement.clientX - cadre.left) / cadre.width, (evenement.clientY - cadre.top) / cadre.height);
    }

    /* À la souris : l'étiquette suit le pointeur sur l'œuvre et nomme la couleur dessous (rien hors des couleurs). */
    suivreSurvol() {
      this.attenteSurvol = 0;
      if (!this.zones || !this.dernier) return;
      const cadre = this.figure.getBoundingClientRect();
      const x = this.dernier.clientX - cadre.left;
      const y = this.dernier.clientY - cadre.top;
      const i = this.ongletSous(this.dernier, cadre);
      if (i < 0) {
        this.figure.removeAttribute('data-survol');
        return;
      }
      if (i !== this.survolRang) {
        this.survolRang = i;
        this.survol.querySelector('span').textContent = this.onglets[i].textContent.trim();
        this.survol.style.setProperty('--c', this.onglets[i].style.getPropertyValue('--c'));
      }
      const largeur = this.survol.offsetWidth || 90;
      const gauche = x + 16 + largeur > cadre.width ? x - 12 - largeur : x + 16;
      this.survol.style.transform = `translate(${Math.round(gauche)}px, ${Math.round(Math.min(y + 14, cadre.height - 34))}px)`;
      this.figure.setAttribute('data-survol', '');
    }
  }
  customElements.define('galerie-couleurs', GalerieCouleurs);
})();
/* === Couleurs à toucher (ticket 28) : fin === */
