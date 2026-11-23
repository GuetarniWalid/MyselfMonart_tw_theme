/*
 * collection-entete.js — l'en-tête qui suit le doigt, sur la nouvelle page collection (ticket 07 de .scratch/collection-design)
 * ----------------------------------------------------------------------------------------------------------------
 * Chargé dans <head> par layout/collection.liquid, sur cette page seulement (<html data-refonte-page>). L'en-tête du
 * site (sections/tw-header.liquid, <sticky-header> d'assets/tw-header.js) y laisse son mode d'ailleurs, qui le cache
 * et le montre par des classes, à des seuils, et le cache en bas de page : ce script le déplace lui-même.
 * - L'en-tête part quand on descend et revient quand on remonte, au rythme du doigt : son décalage (0 : il est là ; sa
 *   hauteur : il est parti) augmente de ce qu'on descend et diminue de ce qu'on remonte, à chaque image, posé en
 *   transform: translateY(), sans transition. Il ne part pas tant que le bandeau d'annonce, au-dessus de lui, se voit.
 * - Sa hauteur, mesurée (et remesurée quand elle change), va sur :root : --tete-h (le scroll-padding-top de la page,
 *   assets/collection-refonte.css).
 * - La ligne des filtres (#barre, ticket 06) se colle juste dessous : --barre-top = hauteur − décalage, puis en haut
 *   de l'écran quand il est parti. Elle porte la classe « collee » tant qu'elle est collée à cette place : son ancre
 *   (#ancre-barre) est passée au-dessus, et la fin de sa section ne l'a pas encore emportée avec la dernière rangée.
 * - Quand l'en-tête part (plus de 2 px), le menu ouvert de la ligne (ordinateur) se ferme : fermerMenu(), le focus
 *   qui y était revient à son bouton.
 * - Un saut voulu du script des filtres (assets/collection-filtres.js) s'annonce sur document : mma:saut-voulu,
 *   { entete: 'reste' | 'revient' }. Il ne compte pas comme un geste du doigt : l'en-tête reste où il est (faire de
 *   la place à un menu), ou revient en entier (remonter au début des résultats, après un filtre).
 * - preventHeaderReveal (sur <sticky-header>, comme ailleurs) reste respecté : l'en-tête ne revient pas pendant la
 *   remontée en cours (33 ms sans remonter suffisent). Il revient à l'ouverture de la recherche (PredictiveSearchOpen)
 *   et quand le focus entre dedans (le clavier ne va jamais sur un lien caché).
 * - Un seul écouteur de défilement, passif. Une image (requestAnimationFrame) lit la mise en page d'abord, une fois,
 *   puis écrit. Le rebond de Safari, au-delà du haut ou du bas de la page, ne compte pas.
 *
 * Le calcul d'une image est pur, testé sous Node : scripts/collection-entete.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------------------------

  // Au-delà de ce décalage, l'en-tête est parti : le menu ouvert de la ligne se ferme.
  const PARTI = 2;

  /* Une image. avant : ce que l'image d'avant a posé, { decalage, y, haut } :
       decalage, de 0 (l'en-tête est là) à sa hauteur (il est parti) ; y, la position du défilement qu'elle a lue ;
       haut, la hauteur où la ligne se colle (--barre-top) dans la page telle qu'elle est maintenant.
     lu : ce que cette image vient de lire, { y, max, hauteur, colle, saut, retenu, ancre, ligne } :
       y, window.scrollY ; max, le défilement le plus bas (scrollHeight − innerHeight) ; hauteur, celle de l'en-tête ;
       colle, la position dans la page où il se colle en haut (le bas du bandeau d'annonce) ; saut, null, 'reste' ou
       'revient' (un saut voulu) ; retenu, après preventHeaderReveal ; ancre et ligne, le haut de l'ancre de la ligne
       et celui de la ligne dans l'écran (null sans ligne).
     Rend { decalage, y, haut, collee, fermer } : le nouveau décalage, la position gardée, la nouvelle hauteur où la
     ligne se colle, la ligne collée ou non, et s'il faut fermer un menu ouvert. */
  function image(avant, lu) {
    // Le rebond de Safari : au-delà du haut ou du bas de la page, le défilement compte pour 0.
    const bas = Number.isFinite(lu.max) ? Math.max(0, lu.max) : Infinity;
    const y = Math.min(Math.max(0, lu.y), bas);
    let voulu;
    if (lu.saut === 'revient') voulu = 0;
    else if (lu.saut === 'reste') voulu = avant.decalage;
    else voulu = avant.decalage + (lu.retenu ? Math.max(0, y - avant.y) : y - avant.y);
    // Borné entre 0 et sa hauteur ; et jamais plus loin que ce dont il a dépassé le bandeau d'annonce : tant que le
    // bandeau se voit, l'en-tête reste, puis il part avec la page.
    const decalage = Math.min(Math.max(voulu, 0), lu.hauteur, Math.max(0, y - lu.colle));
    // Collée : l'ancre est passée au-dessus de la hauteur où la ligne se colle, et la ligne y est (pas encore emportée
    // par la fin de sa section). Lu sur la page telle qu'elle est, avant que l'image ne pose la nouvelle hauteur.
    const collee = lu.ancre != null && lu.ancre < avant.haut - 0.5 && Math.abs(lu.ligne - avant.haut) < 1;
    const fermer = !lu.saut && y !== avant.y && decalage > PARTI;
    return { decalage, y, haut: lu.hauteur - decalage, collee, fermer };
  }

  // Node (tests) : le calcul seul.
  if (typeof window === 'undefined') {
    module.exports = { image };
    return;
  }

  // ---- Navigateur ----------------------------------------------------------------------------------------------

  const racine = document.documentElement;
  const entete = document.getElementById('shopify-section-tw-header');
  if (!entete || !racine.hasAttribute('data-refonte-page')) return;
  const annonce = document.getElementById('shopify-section-tw-announcement-bar');
  // preventHeaderReveal : 33 ms sans remonter, et l'en-tête peut revenir (comme assets/tw-header.js).
  const RETENU_MS = 33;

  // La ligne se colle à 0 tant que rien n'est posé (top: var(--barre-top, 0px), assets/collection-refonte.css).
  let etat = { decalage: 0, y: Math.max(0, window.scrollY), haut: 0 };
  let hauteur = 0;
  let remesurer = true;
  let saut = null;
  let retenu = false;
  let retenuJusqua = 0;
  let prevue = 0;
  // Ce qui est posé, pour n'écrire que ce qui change.
  const pose = { hauteur: null, transform: '', barre: null, haut: null };

  // Au pixel de l'écran : l'en-tête et la ligne restent nets.
  function auPixel(valeur) {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(valeur * ratio) / ratio;
  }

  function planifier() {
    if (!prevue) prevue = window.requestAnimationFrame(imageSuivante);
  }

  // Le menu ouvert de la ligne (ordinateur) se ferme ; le focus qui y était revient à son bouton.
  function fermerMenu(barre) {
    const ouvert = barre.querySelector('.filtres-famille[open]');
    if (ouvert && typeof barre.fermerMenu === 'function') barre.fermerMenu(ouvert.contains(document.activeElement));
  }

  function imageSuivante(temps) {
    prevue = 0;
    if (retenu && retenuJusqua && temps > retenuJusqua) {
      retenu = false;
      retenuJusqua = 0;
    }

    // Lire.
    if (remesurer) {
      hauteur = entete.getBoundingClientRect().height;
      remesurer = false;
    }
    const barre = document.getElementById('barre');
    const ancre = barre && document.getElementById('ancre-barre');
    const y = window.scrollY;
    // Le bas du bandeau d'annonce dans la page (un bandeau caché ne retient rien).
    const bandeau = annonce ? annonce.getBoundingClientRect() : null;
    const lu = {
      y,
      max: racine.scrollHeight - window.innerHeight,
      hauteur,
      colle: bandeau && bandeau.height ? bandeau.bottom + y : 0,
      saut,
      retenu,
      ancre: ancre ? ancre.getBoundingClientRect().top : null,
      ligne: ancre ? barre.getBoundingClientRect().top : null,
    };
    saut = null;
    const suite = image(etat, lu);
    if (retenu && suite.y < etat.y) retenuJusqua = temps + RETENU_MS;

    // Écrire.
    if (hauteur !== pose.hauteur) {
      racine.style.setProperty('--tete-h', `${hauteur}px`);
      pose.hauteur = hauteur;
    }
    const decalage = auPixel(suite.decalage);
    const transform = decalage ? `translateY(${-decalage}px)` : '';
    if (transform !== pose.transform) {
      entete.style.transform = transform;
      pose.transform = transform;
    }
    const haut = barre ? auPixel(suite.haut) : 0;
    if (barre) {
      if (barre !== pose.barre || haut !== pose.haut) {
        barre.style.setProperty('--barre-top', `${haut}px`);
        pose.barre = barre;
        pose.haut = haut;
      }
      barre.classList.toggle('collee', suite.collee);
      if (suite.fermer) fermerMenu(barre);
    }
    etat = { decalage: suite.decalage, y: suite.y, haut };
  }

  // L'en-tête revient en entier : la recherche s'ouvre, ou le focus entre dedans.
  function revenir() {
    saut = 'revient';
    planifier();
  }

  // Le mode d'ailleurs le fait glisser par une transition de ses classes ; ici, il suit chaque image.
  entete.style.transition = 'none';
  window.addEventListener('scroll', planifier, { passive: true });
  window.addEventListener('resize', () => {
    remesurer = true;
    planifier();
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      remesurer = true;
      planifier();
    }).observe(entete);
  }
  document.addEventListener('mma:saut-voulu', (e) => {
    saut = e.detail && e.detail.entete === 'revient' ? 'revient' : 'reste';
    planifier();
  });
  const collant = entete.querySelector('sticky-header');
  if (collant) {
    collant.addEventListener('preventHeaderReveal', () => {
      retenu = true;
      retenuJusqua = 0;
    });
  }
  document.addEventListener('PredictiveSearchOpen', revenir);
  entete.addEventListener('focusin', revenir);
  planifier();
})();
