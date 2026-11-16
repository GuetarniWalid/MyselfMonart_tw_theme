/* « Mes j'aime » (sections/my-likes.liquid) : les œuvres aimées, que le cœur des cartes garde dans localStorage
   (assets/my-like-button.js, clé productLikedHandles), chacune avec la carte de la collection. Shopify la rend
   dans le contexte du produit : /products/<handle>?section_id=my-likes-card (sections/my-likes-card.liquid),
   derrière le préfixe de langue et de marché. Image, prix, titres et vignette d'œuvre des nouveaux produits
   viennent donc du serveur, comme dans la collection ; il ne reste ici que ce qui est propre à cette page.
   Tests : scripts/my-likes.test.cjs. */
class MyLikes extends HTMLElement {
  async connectedCallback() {
    const cards = await this.likedCards(this.likedHandles());
    this.hideLoader();
    if (cards.length === 0) {
      this.showEmptyMessage();
      return;
    }
    // Le cœur de chaque carte, aimé : son identifiant peut manquer dans productLikedIds (anciens j'aime).
    cards.forEach((card) => card.querySelector('button.like')?.classList.add('is-liked'));
    // Comme la grille de collection : les deux premières cartes chargent leur image tout de suite et en
    // priorité, les autres à l'approche de l'écran. La section les rend toutes en chargement immédiat : elle ne
    // connaît pas leur place.
    cards.slice(2).forEach((card) => card.querySelectorAll('img').forEach((img) => {
      img.loading = 'lazy';
      img.removeAttribute('fetchpriority');
    }));
    const grid = this.querySelector('template').content.firstElementChild.cloneNode();
    grid.append(...cards);
    this.append(grid);
    window.removeSkeletonOnImagesLoad?.(grid);
    // Les <script> d'une réponse de fetch ne s'exécutent pas : importer les modules des cartes (le reflet des
    // vignettes de poster, assets/oeuvre-card-reflet.js), comme le défilement infini (assets/collection.js).
    grid.querySelectorAll('script[type="module"][src]').forEach((script) => import(script.src));
  }

  /* Les handles aimés, sans doublon (un ancien double clic en gardait deux). */
  likedHandles() {
    try {
      const handles = JSON.parse(localStorage.getItem('productLikedHandles'));
      return Array.isArray(handles) ? [...new Set(handles)] : [];
    } catch (error) {
      return [];
    }
  }

  /* Les cartes, dans l'ordre des j'aime, six demandes à la fois au plus : la boutique répond 429 aux rafales.
     Celles qui ne viennent pas (produit retiré ou dépublié : 404 ; réseau) sont sautées, les autres
     s'affichent. */
  async likedCards(handles) {
    const cards = [];
    let next = 0;
    const worker = async () => {
      while (next < handles.length) {
        const i = next++;
        cards[i] = await this.fetchCard(handles[i]).catch(() => null);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, handles.length) }, worker));
    return cards.filter(Boolean);
  }

  /* La carte d'une œuvre, prise dans l'enveloppe de sa section. Les handles sont traduits par langue : Shopify
     redirige d'un handle (ou d'un marché) à l'autre en gardant section_id (relevé du 16/11/2026). Une
     redirection qui le perdrait rendrait la fiche entière, avec les cartes d'autres œuvres : rien n'en est pris. */
  async fetchCard(handle) {
    const root = window.Shopify?.routes?.root || '/';
    const response = await fetch(`${root}products/${encodeURIComponent(handle)}?section_id=my-likes-card`);
    if (!response.ok) return null;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    return doc.querySelector('#shopify-section-my-likes-card anime-product-card');
  }

  /* Une carte retirée par son cœur (assets/my-like-button.js). Plus aucune carte : la liste vide, même si
     productLikedIds garde une œuvre retirée de la boutique, qui n'a pas de carte. */
  removeCard(card) {
    card.remove();
    if (!this.querySelector('anime-product-card')) this.showEmptyMessage();
  }

  hideLoader() {
    this.nextElementSibling.classList.add('hidden');
  }

  showEmptyMessage() {
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }
}
customElements.define('my-likes', MyLikes);
