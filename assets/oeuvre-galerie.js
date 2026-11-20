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

  /* La feuille de la page tient pendant la bascule Toile / Poster. La bascule retire le <link> du bloc principal
     avec le reste de la fiche, et pose celui de la fiche jumelle : le même fichier, mais le navigateur le recharge,
     même depuis son cache, et une image de la page peut se dessiner sans ses styles entre les deux (mesuré : les
     styles manquent juste après l'échange). Une copie dans <head>, posée une fois, ne quitte jamais la page. */
  const feuille = document.querySelector('main-product-blocks[data-galerie] > link[rel="stylesheet"]');
  if (feuille) document.head.append(feuille.cloneNode());

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

/* === Scène en quatre temps (ticket 20) : début === */
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
     du temps 3 et la ligne du sol, sans sortir de l'écran. La dame et son lit (1,86 m) tiennent alors toute la
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
     Temps 3 : à l'échelle du lit (cm, en pixels par centimètre), haute de 1,10 m et large de 1,50 m au plus (le
     lit fait 1,86 m), son centre à 1,67 m du sol (--yc, --e3).
     Temps 4 : sur téléphone, jusqu'où grossir pour qu'elle remplisse l'écran, et de combien la recentrer ; sur
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

  /* <galerie-scene> : la scène en quatre temps (sections/galerie-scene.liquid).
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
/* === Scène en quatre temps (ticket 20) : fin === */

/* === Couleurs de la scène (ticket 21) : début === */
(function () {
  'use strict';

  /* Ce que la page donne au moteur (assets/galerie-couleurs.js, sa fonction lire), d'après ce que le serveur a
     écrit dans la section : des identifiants de couleurs de la boutique (les handles des métaobjets).
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

  /* Les moments de chaque couleur montrée, en écrans depuis l'épinglage de la scène : le déroulé de la maquette. La
     couleur de rang k commence à 0,9 + 0,32 k : sa phrase et sa pastille arrivent un rien avant elle, elle revient
     sur l'œuvre, et sa pastille reste cerclée tant qu'on parle d'elle. La dernière tient jusqu'à la fin du temps 2.
     Chaque paire, [début, fin], va dans --a et --b de son élément (la classe galerie-scene-a de la scène). */
  function momentsDesCouleurs(nombre) {
    const arrondi = (x) => Math.round(x * 100) / 100;
    return Array.from({ length: nombre }, (_, rang) => {
      const debut = 0.9 + 0.32 * rang;
      const derniere = rang === nombre - 1;
      return {
        teinte: [arrondi(debut), arrondi(derniere ? 1.98 : debut + 0.42)],
        phrase: [arrondi(debut - 0.02), arrondi(derniere ? 2 : debut + 0.3)],
        pastille: [arrondi(debut - 0.02), arrondi(debut + 0.1)],
        anneau: [arrondi(debut - 0.02), arrondi(derniere ? 1.96 : debut + 0.36)],
      };
    });
  }

  /* La lecture d'une image (des pixels RGBA) par le moteur : il choisit les couleurs (lire), puis trouve leurs zones
     (masques). Pour chaque couleur montrée, trois au plus : son identifiant dans la boutique (le moteur dit « dore »
     pour « or »), sa couleur dans l'œuvre (celle de sa pastille), sa part de l'image, et son masque (0 à 255 par
     pixel). Rien d'autre que ses paramètres : le travailleur en reçoit le texte (voir travail). */
  function lireLesCouleurs(moteur, pixels, largeur, hauteur, { lire, completer }) {
    const modele = moteur.lire(pixels, largeur, hauteur, lire, { completer });
    const zones = moteur.masques(pixels, largeur, hauteur, modele).slice(0, 3);
    const handles = Object.keys(moteur.HANDLES);
    const couleurs = zones.map((zone, rang) => {
      const cle = modele.choisis[rang].cle;
      return { handle: handles.find((handle) => moteur.HANDLES[handle] === cle) || cle, css: modele.choisis[rang].css || '', part: zone.part };
    });
    return { couleurs, masques: zones.map((zone) => zone.alpha) };
  }

  /* Ce que la page montre, une fois les couleurs lues : chaque couleur dans l'ordre du moteur, avec le nom de sa
     pastille (noms : identifiant → libellé), le rang de sa phrase s'il y en a une (phrases : l'identifiant de
     chaque phrase, dans l'ordre de la page ; -1 sinon) et ses moments. Une phrase dont la couleur n'a pas été
     retrouvée dans l'image n'est pas montrée (cachees : leurs rangs). */
  function planDesCouleurs({ couleurs, phrases = [], noms = {} }) {
    const montrees = couleurs.slice(0, 3);
    const moments = momentsDesCouleurs(montrees.length);
    const plan = montrees.map((couleur, rang) => ({
      handle: couleur.handle,
      nom: noms[couleur.handle] || '',
      css: couleur.css || '',
      phrase: phrases.indexOf(couleur.handle),
      moments: moments[rang],
    }));
    const gardees = plan.map((couleur) => couleur.phrase);
    return { couleurs: plan, cachees: phrases.map((_, rang) => rang).filter((rang) => !gardees.includes(rang)) };
  }

  /* Le travailleur (un Worker, hors du fil principal) : il charge le moteur, va chercher la copie de 320 px de
     l'image, la lit (lireLesCouleurs, qu'il reçoit en paramètre) et rend chaque masque en image PNG. Rien de tout
     cela ne passe par le fil de la page : le défilement ne l'attend jamais. Il lui faut OffscreenCanvas (Chrome,
     Firefox 105, Safari 16.4) : sans lui, il répond une erreur, et l'œuvre reste en couleurs. Son texte est celui
     de cette fonction : elle ne lit rien autour d'elle. */
  function travail(lire) {
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
        const lu = lire(self.Couleurs, contexte.getImageData(0, 0, largeur, hauteur).data, largeur, hauteur, data);
        const masques = [];
        for (const alpha of lu.masques) {
          const masque = new ImageData(largeur, hauteur);
          for (let i = 0; i < alpha.length; i += 1) masque.data[i * 4 + 3] = alpha[i];
          contexte.putImageData(masque, 0, 0);
          masques.push(await toile.convertToBlob({ type: 'image/png' }));
        }
        self.postMessage({ couleurs: lu.couleurs, masques });
      } catch (erreur) {
        self.postMessage({ erreur: String((erreur && erreur.message) || erreur) });
      }
    };
  }

  /* Le texte du travailleur : sa fonction, à qui l'on passe celle de la lecture. */
  function texteDuTravailleur() {
    return `(${travail})(${lireLesCouleurs});`;
  }

  // Node (tests) : les calculs purs, et le texte du travailleur.
  if (typeof window === 'undefined') {
    Object.assign(module.exports, { entreeDuMoteur, momentsDesCouleurs, lireLesCouleurs, planDesCouleurs, texteDuTravailleur });
    return;
  }
  if (customElements.get('galerie-couleurs')) return;

  const liste = (texte) => String(texte || '').split(/\s+/).filter(Boolean);
  const absolue = (adresse) => new URL(adresse, document.baseURI).href;
  /* Une tranche de travail dans un temps mort du fil principal (au plus tard 150 ms après, s'il n'y en a pas) ;
     sans requestIdleCallback (Safari), la tâche suivante. Et pour l'annuler. */
  const plusTard = (tranche) => (window.requestIdleCallback ? window.requestIdleCallback(tranche, { timeout: 150 }) : window.setTimeout(tranche, 0));
  const annuler = (numero) => (window.cancelIdleCallback ? window.cancelIdleCallback(numero) : window.clearTimeout(numero));

  /* <galerie-couleurs> : les couleurs du temps 2 (sections/galerie-scene.liquid). L'élément est la place où elles
     reviennent sur l'œuvre (le gris, puis trois places de la même image) ; il porte ce que le serveur sait
     (data-moteur, data-image, data-arretees, data-declarees) et le nom des pastilles (<template>).
     Si la scène est animée (pas de « mouvements réduits »), il attend qu'elle approche, à un quart d'écran, comme
     les personnages de la scène (pas avant : rien ne se charge pendant le haut de la page), et lit les couleurs
     dans un travailleur. Il reste deux écrans de défilement avant le temps 2 : le temps de lire. Puis il montre :
     sur l'œuvre, chaque couleur (l'image nette, sous le masque de la couleur, agrandi sur elle) ; sous l'œuvre, ses
     pastilles ; à chaque phrase, son moment, et la couleur lue à sa pastille ; data-pretes sur lui-même, qui fait
     paraître le gris et les couleurs (voir la feuille). Une phrase dont la couleur n'est pas dans l'image est
     cachée. Si rien n'est lu (erreur, navigateur trop ancien), rien ne change : l'œuvre reste en couleurs et les
     phrases se suivent.
     Sur le fil principal, tout se fait par petites tranches dans les temps morts : le départ du travailleur, une
     tranche par couleur, puis une où tout paraît. Il n'ajoute ni n'ôte rien à la page (les places sont écrites par
     le serveur) : sur cette page, chaque ajout fait refaire les styles de toute la scène. Aucune tranche ne retient
     le défilement (quelques millisecondes, même sur un téléphone lent).
     À son départ de la page (la bascule Toile / Poster remplace la scène entière), il arrête tout et défait ce qu'il
     a posé : la nouvelle scène a son propre élément, qui repart de zéro. */
  class GalerieCouleurs extends HTMLElement {
    connectedCallback() {
      this.scene = this.closest('galerie-scene');
      if (!this.scene || this.reduit) return;
      this.retours = [];
      this.liens = [];
      this.reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.regler = () => this.guetter();
      this.reduit.addEventListener('change', this.regler);
      this.guetter();
    }

    disconnectedCallback() {
      if (!this.reduit) return;
      this.reduit.removeEventListener('change', this.regler);
      this.reduit = null;
      this.arreter();
      this.defaire();
    }

    /* La scène est animée : il attend qu'elle approche pour lire les couleurs, une fois. */
    guetter() {
      if (!this.reduit || this.reduit.matches || this.approche || this.travailleur || this.etapes || this.posees) return;
      this.approche = new IntersectionObserver(
        (entrees) => {
          if (!entrees[entrees.length - 1].isIntersecting) return;
          this.approche.disconnect();
          this.approche = null;
          this.suivre([() => this.ecrire(), () => this.lire()]);
        },
        { rootMargin: '25% 0px' }
      );
      this.approche.observe(this.scene);
    }

    /* Le texte du travailleur, et son adresse (une tranche à part : la page attend le navigateur pour l'adresse). */
    ecrire() {
      try {
        this.source = URL.createObjectURL(new Blob([texteDuTravailleur()], { type: 'text/javascript' }));
      } catch (erreur) {
        this.arreter();
      }
    }

    /* Lit les couleurs, hors du fil principal : le travailleur part, avec ce qu'il lui faut. */
    lire() {
      const entree = entreeDuMoteur({ arretees: liste(this.dataset.arretees), declarees: liste(this.dataset.declarees) });
      try {
        this.travailleur = new Worker(this.source);
      } catch (erreur) {
        this.arreter();
        return;
      }
      this.travailleur.onmessage = ({ data }) => {
        this.arreter();
        this.suivre([() => this.poser(data)]);
      };
      this.travailleur.onerror = () => this.arreter();
      this.travailleur.postMessage({ moteur: absolue(this.dataset.moteur), image: absolue(this.dataset.image), ...entree });
    }

    /* Fait les étapes données, une par tranche, dans les temps morts du fil principal : une tranche demandée pendant
       un temps mort attend le suivant, après l'image d'après (une image de la page, une tranche). */
    suivre(etapes) {
      this.etapes = etapes;
      const suite = () => {
        this.tranche = 0;
        const etape = this.etapes && this.etapes.shift();
        if (etape) etape();
        if (this.etapes && this.etapes.length) this.tranche = plusTard(suite);
        else this.etapes = null;
      };
      this.tranche = plusTard(suite);
    }

    /* Arrête la lecture : l'attente de la scène, les tranches qui restent, le travailleur et son texte. */
    arreter() {
      if (this.approche) this.approche.disconnect();
      this.approche = null;
      if (this.tranche) annuler(this.tranche);
      this.tranche = 0;
      this.etapes = null;
      if (this.travailleur) this.travailleur.terminate();
      this.travailleur = null;
      if (this.source) URL.revokeObjectURL(this.source);
      this.source = null;
    }

    /* Pose ce que le travailleur a lu, dans les places que le serveur a écrites (trois sur l'œuvre, trois pastilles) :
       rien n'est ajouté à la page, rien n'en est ôté, l'élément ne change que des styles et des attributs. Une
       tranche par couleur (sa place sur l'œuvre : son masque et son moment ; sa pastille : sa couleur, son nom, son
       moment ; sa phrase : son moment et la couleur lue), le tout encore caché ; puis une dernière où tout paraît
       d'un coup. Une tranche par image de la page : les styles à refaire restent peu nombreux. Une erreur : rien ne
       change. */
    poser({ couleurs, masques } = {}) {
      if (!Array.isArray(couleurs) || !Array.isArray(masques)) return;
      const phrases = Array.from(this.scene.querySelectorAll('.galerie-scene-couleurs .galerie-scene-msg[data-couleur]'));
      const noms = {};
      const modele = this.querySelector('template');
      if (modele) {
        modele.content.querySelectorAll('[data-couleur]').forEach((nom) => {
          noms[nom.dataset.couleur] = nom.textContent.trim();
        });
      }
      const plan = planDesCouleurs({ couleurs, phrases: phrases.map((phrase) => phrase.dataset.couleur), noms });
      const teintes = Array.from(this.querySelectorAll('.galerie-scene-teinte'));
      const pastilles = Array.from(this.scene.querySelectorAll('.galerie-scene-pastille'));
      const montrees = [];
      const etapes = plan.couleurs.map((couleur, rang) => () => {
        // Sa place sur l'œuvre : la même image, sous le masque de la couleur, et le moment où elle revient.
        const teinte = teintes[rang];
        if (teinte && masques[rang] instanceof Blob) {
          const lien = URL.createObjectURL(masques[rang]);
          this.liens.push(lien);
          this.changer(teinte, '--a', String(couleur.moments.teinte[0]));
          this.changer(teinte, '--b', String(couleur.moments.teinte[1]));
          this.changer(teinte, '-webkit-mask-image', `url("${lien}")`);
          this.changer(teinte, 'mask-image', `url("${lien}")`);
          montrees.push([teinte, couleur.handle]);
        }
        // Sa pastille : sa couleur, son nom, son moment, et celui du cercle qui la désigne tant qu'on parle d'elle.
        const pastille = pastilles[rang];
        if (pastille) {
          if (couleur.css) this.changer(pastille, '--c', couleur.css);
          this.changer(pastille, '--a', String(couleur.moments.pastille[0]));
          this.changer(pastille, '--b', String(couleur.moments.pastille[1]));
          this.marquer(pastille, 'data-nom', couleur.nom);
          const anneau = pastille.querySelector('.galerie-scene-anneau');
          if (anneau) {
            this.changer(anneau, '--a', String(couleur.moments.anneau[0]));
            this.changer(anneau, '--b', String(couleur.moments.anneau[1]));
          }
          montrees.push([pastille, couleur.handle]);
        }
        // Sa phrase : son moment, et la couleur lue à sa pastille.
        if (couleur.phrase >= 0) {
          const phrase = phrases[couleur.phrase];
          this.changer(phrase, '--a', String(couleur.moments.phrase[0]));
          this.changer(phrase, '--b', String(couleur.moments.phrase[1]));
          const point = phrase.querySelector('b > i');
          if (point && couleur.css) this.changer(point, '--c', couleur.css);
        }
      });
      etapes.push(() => {
        // Tout paraît d'un coup : les couleurs sur l'œuvre, après son gris ; les pastilles. Une place de pastille
        // restée vide ne prend plus de place ; la phrase d'une couleur que l'image n'a pas est cachée.
        montrees.forEach(([place, handle]) => this.marquer(place, 'data-couleur', handle));
        pastilles.slice(plan.couleurs.length).forEach((pastille) => this.marquer(pastille, 'data-vide', ''));
        plan.cachees.forEach((rang) => this.marquer(phrases[rang], 'data-absente', ''));
        // Le gris et les couleurs paraissent (l'attribut est sur l'élément : seuls ses styles sont à refaire).
        if (plan.couleurs.length) this.marquer(this, 'data-pretes', '');
        this.posees = true;
      });
      // Posée elle-même dans une tranche, elle met les siennes à la suite.
      if (this.etapes) this.etapes.push(...etapes);
      else this.suivre(etapes);
    }

    /* Change une propriété du style d'un élément écrit par le serveur, et note comment la remettre. */
    changer(element, nom, valeur) {
      const avant = element.style.getPropertyValue(nom);
      element.style.setProperty(nom, valeur);
      this.retours.push(() => (avant ? element.style.setProperty(nom, avant) : element.style.removeProperty(nom)));
    }

    /* Pose un attribut sur un élément écrit par le serveur, et note comment le remettre. */
    marquer(element, nom, valeur) {
      const avant = element.getAttribute(nom);
      element.setAttribute(nom, valeur);
      this.retours.push(() => (avant === null ? element.removeAttribute(nom) : element.setAttribute(nom, avant)));
    }

    /* Défait ce qui a été posé, du dernier au premier, et rend les masques. */
    defaire() {
      this.retours.reverse().forEach((retour) => retour());
      this.retours = [];
      this.liens.forEach((lien) => URL.revokeObjectURL(lien));
      this.liens = [];
      this.posees = false;
    }
  }
  customElements.define('galerie-couleurs', GalerieCouleurs);
})();
/* === Couleurs de la scène (ticket 21) : fin === */
