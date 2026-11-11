/*
 * cart-count.js — le compteur du bouton du panier (#cart-button, snippets/open-cart-drawer-button.liquid)
 * ------------------------------------------------------------------------------------------------------
 * Les scripts du panier (cart-drawer.js, main-product.js, studio de personnalisation) récrivent le
 * compteur #bubble-nb-product après un ajout ou un changement : ils passent tous par
 * MMACartCount.render(nombre), qui écrit le même balisage que le snippet. Le nom du bouton se lit
 * avec le nombre d'articles, traduit (« Ouvrir le panier, 2 articles ») : le texte vient des modèles
 * data-count-one et data-count-other du bouton, [count] à la place du nombre.
 *
 * Fiche 3D (.cart-fab, choix de Walid du 11/11/2026) : au-delà de 99, « 99+ » ; quand le nombre
 * monte, le bouton joue l'animation de l'ajout (.is-bumped, input.css). Le tiroir du panier s'ouvre
 * 300 ms après un ajout et couvre le bouton : l'animation attend alors sa fermeture. Ailleurs, le
 * dessin de toujours : au-delà de 99, rien de visible, comme avant.
 *
 * Script classique, sans dépendance : cartCountMarkup est pur (scripts/cart-count.test.cjs).
 */
(function () {
  'use strict';

  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* Le contenu du compteur pour un nombre d'articles : le chiffre visible (caché aux lecteurs d'écran)
     et la fin du nom du bouton, « , 2 articles ». one, other : les modèles traduits ; overflow : écrire
     « 99+ » au-delà de 99 (sinon rien de visible, l'ancien dessin). Vide pour un panier vide. */
  function cartCountMarkup(count, { one = '[count]', other = '[count]', overflow = false } = {}) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (!n) return '';
    const shown = n > 99 ? (overflow ? '99+' : '') : String(n);
    const spoken = (n === 1 ? one : other).replace('[count]', String(n));
    return (shown ? `<span aria-hidden="true">${shown}</span>` : '') + `<span class="sr-only">, ${escapeHtml(spoken)}</span>`;
  }

  if (typeof window === 'undefined') {
    module.exports = { cartCountMarkup };
    return;
  }
  if (window.MMACartCount) return;

  const button = () => document.getElementById('cart-button');
  const isFab = (node) => !!node && node.classList.contains('cart-fab');
  const drawerOpen = () => document.querySelector('cart-drawer')?.getAttribute('aria-expanded') === 'true';
  let shownCount = null;
  let pendingBump = false;

  // L'animation de l'ajout, relancée à chaque fois (elle s'arrête d'elle-même).
  function bump(node) {
    node.classList.remove('is-bumped');
    void node.offsetWidth;
    node.classList.add('is-bumped');
    clearTimeout(node.bumpTimer);
    node.bumpTimer = setTimeout(() => node.classList.remove('is-bumped'), 1500);
  }

  function render(count) {
    const node = button();
    const bubble = document.getElementById('bubble-nb-product');
    if (!node || !bubble) return;
    const n = Math.max(0, Math.floor(Number(count) || 0));
    const before = shownCount === null ? readCount(bubble) : shownCount;
    bubble.innerHTML = cartCountMarkup(n, {
      one: node.dataset.countOne,
      other: node.dataset.countOther,
      overflow: isFab(node),
    });
    shownCount = n;
    // La fiche 3D replace ses rangées : le bouton a peut-être changé de largeur.
    document.dispatchEvent(new CustomEvent('mma:cart-count', { detail: { count: n } }));
    if (!isFab(node) || n <= before) return;
    // Le tiroir va s'ouvrir sur le bouton : l'animation l'attend, sinon elle part tout de suite.
    pendingBump = true;
    setTimeout(() => {
      if (pendingBump && !drawerOpen()) {
        pendingBump = false;
        bump(node);
      }
    }, 450);
  }

  // Le nombre déjà écrit par le snippet, au chargement.
  function readCount(bubble) {
    const text = bubble.querySelector('[aria-hidden]')?.textContent || '';
    return parseInt(text, 10) || 0;
  }

  // Le tiroir se referme : l'animation part quand il a découvert le bouton.
  document.addEventListener('CartDrawerClose', () => {
    const node = button();
    if (!pendingBump || !isFab(node)) return;
    pendingBump = false;
    setTimeout(() => bump(node), 250);
  });

  window.MMACartCount = { render, markup: cartCountMarkup };
})();
