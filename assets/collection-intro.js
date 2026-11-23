/*
 * collection-intro.js : l'intro de la nouvelle page collection (sections/collection-refonte.liquid, ticket 02 du
 * dossier .scratch/collection-design). Sur téléphone, le texte tient en deux lignes et « Lire la suite » se pose au
 * bout de la deuxième ; un toucher déplie le texte, le bouton dit alors « Réduire » (aria-expanded). Les deux libellés
 * sont dans le bouton, la feuille de la page montre le bon (assets/collection-refonte.css, bloc « Entrée »). Sur
 * ordinateur, la feuille montre le texte entier, sans bouton.
 * Un texte qui tient déjà en deux lignes n'a pas de bouton : un toucher doit toujours avoir un effet.
 */
if (!customElements.get('collection-intro')) {
  class CollectionIntro extends HTMLElement {
    connectedCallback() {
      this.texte = this.querySelector('p');
      this.bouton = this.querySelector('.c-intro-plus');
      if (!this.texte || !this.bouton) return;
      this.bouton.addEventListener('click', () => this.basculer());
      // Le texte se replace quand la largeur change, ou quand la police de la page arrive (sa boîte, bornée à deux
      // lignes, peut alors garder sa taille) : le bouton suit.
      this.observateur = new ResizeObserver(() => this.mesurer());
      this.observateur.observe(this.texte);
      if (document.fonts) document.fonts.ready.then(() => this.mesurer());
    }

    disconnectedCallback() {
      if (this.observateur) this.observateur.disconnect();
    }

    basculer() {
      const ouvert = !this.classList.toggle('replie');
      this.bouton.setAttribute('aria-expanded', String(ouvert));
    }

    // Replié, le bouton ne se montre que si le texte dépasse ses deux lignes.
    mesurer() {
      if (!this.classList.contains('replie')) return;
      this.bouton.hidden = this.texte.scrollHeight <= this.texte.clientHeight + 1;
    }
  }
  customElements.define('collection-intro', CollectionIntro);
}
