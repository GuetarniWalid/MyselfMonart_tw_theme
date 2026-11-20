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
