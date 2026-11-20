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
