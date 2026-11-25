/* Le cœur des cartes et de la fiche (snippets/my-like-button.liquid). Les j'aime vivent dans localStorage :
   - productLikedIds et productLikedHandles, les œuvres aimées, que lisent le compteur de l'en-tête
     (snippets/tw-loup-like-button.liquid), l'état des cœurs et « Mes j'aime » (assets/my-likes.js) ;
   - productLikedLines, { handle: { id, properties } } : les lignes gardées. Pour une œuvre aimée sur sa fiche,
     la ligne que l'achat ajoutait à cet instant (likedLine), que « Mes j'aime » montre telle qu'elle a été aimée.
   Le compteur de la boutique (métachamp du produit) est tenu par le serveur.
   Tests : scripts/my-likes.test.cjs. */
if (!customElements.get('my-likes-button')) {
/* localStorage peut tout refuser (stockage bloqué, navigation privée, stockage plein) : une valeur illisible ou
   refusée se lit comme absente, une écriture refusée se perd, et la page continue. */
const likedStorage = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {
      return null;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Le j'aime vaut pour cette page seulement.
    }
  },
  list(key) {
    const list = this.read(key);
    return Array.isArray(list) ? list : [];
  },
  // Les lignes gardées, par handle ; illisibles : aucune.
  lines() {
    const lines = this.read('productLikedLines');
    return lines && typeof lines === 'object' && !Array.isArray(lines) ? lines : {};
  },
};
// Les propriétés de ligne gardées, celles que « Mes j'aime » montre : la couleur du cadre d'un poster et son
// contour blanc.
const KEPT_PROPERTIES = ['_cadre', '_passe_partout'];

class MyLikesButton extends HTMLElement {
  connectedCallback() {
    const productLikedIds = this.getProductLikedIds();
    if (productLikedIds.length > 0) {
      this.colorButton();
    }
  }

  getProductLikedIds() {
    return likedStorage.list('productLikedIds');
  }

  colorButton() {
    this.querySelector('.likes').classList.add('liked');
  }
}
customElements.define('my-likes-button', MyLikesButton);

class MyLikeButton extends HTMLElement {
  constructor() {
    super();
    this.productId = this.dataset.productId;
    this.productHandle = this.dataset.productHandle;
  }

  connectedCallback() {
    const productLikedIds = this.getProductLikedIds();

    // Only mark THIS button as liked if its product is in the liked list
    if (productLikedIds.includes(this.productId)) {
      const likeButton = this.querySelector('button.like');
      if (likeButton) {
        likeButton.classList.add('is-liked');
      }
    }

    this.addEventListener('click', async () => {
      if (this.querySelector('button.like').classList.contains('disabled')) return;

      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('is-liked');
      likeButton.classList.toggle('is-liked', !isLiked);

      const productLikedIds = this.getProductLikedIds();
      const productLikedHandles = this.getProductLikedHandles();
      
      if (isLiked) {
        this.deleteProductLikedIdInLocalStorage(productLikedIds);
        this.deleteProductLikedHandleInLocalStorage(productLikedHandles);
        this.forgetLikedLine();
        this.deleteLiInLikedPage();
        this.updateLikeButtonCount();
        await this.updateLikesCountOnServer(this.productId, 'decrement');
      } else {
        this.saveProductLikedIdInLocalStorage(productLikedIds);
        this.saveProductLikedHandleInLocalStorage(productLikedHandles);
        const line = this.likedLine();
        if (line) this.keepLikedLine(line);
        else this.forgetLikedLine();
        this.deleteLiInLikedPage();
        this.updateLikeButtonCount();
        this.greet(likeButton);
        await this.updateLikesCountOnServer(this.productId, 'increment');
      }

    });
  }

  // Un j'aime vient d'être donné : sur la nouvelle page collection, les papiers du cœur se collent l'un après l'autre
  // (assets/collection-refonte.css, .vient-d-aimer), à ce moment-là seulement, jamais au chargement. Ailleurs, la classe ne
  // fait rien.
  greet(likeButton) {
    clearTimeout(this.greeting);
    likeButton.classList.remove('vient-d-aimer');
    void likeButton.offsetWidth;
    likeButton.classList.add('vient-d-aimer');
    this.greeting = setTimeout(() => likeButton.classList.remove('vient-d-aimer'), 900);
  }

  getProductLikedIds() {
    return likedStorage.list('productLikedIds');
  }

  getProductLikedHandles() {
    return likedStorage.list('productLikedHandles');
  }

  saveProductLikedIdInLocalStorage(productLikedIds) {
    productLikedIds.push(this.productId);
    likedStorage.write('productLikedIds', productLikedIds);
  }

  saveProductLikedHandleInLocalStorage(productLikedHandles) {
    productLikedHandles.push(this.productHandle);
    likedStorage.write('productLikedHandles', productLikedHandles);
  }

  deleteProductLikedIdInLocalStorage(productLikedIds) {
    const productLikedIdsFiltered = productLikedIds.filter(
      (productLikedId) => productLikedId !== this.productId,
    );
    likedStorage.write('productLikedIds', productLikedIdsFiltered);
  }

  deleteProductLikedHandleInLocalStorage(productLikedHandles) {
    const productLikedHandlesFiltered = productLikedHandles.filter(
      (productLikedHandle) => productLikedHandle !== this.productHandle,
    );
    likedStorage.write('productLikedHandles', productLikedHandlesFiltered);
  }

  /* La ligne que l'achat de la fiche ajouterait à cet instant (cartLine du bloc de la fiche,
     assets/main-product.js) : sa variante, et la couleur du cadre et le contour blanc d'un poster. Seulement
     pour le cœur de la fiche, dans ce bloc : le cœur d'une carte n'en a pas, ni une fiche dont l'achat n'a pas
     de variante. */
  likedLine() {
    const blocks = this.closest('main-product-blocks');
    const line = blocks && typeof blocks.cartLine === 'function' ? blocks.cartLine() : null;
    if (!line || !/^\d+$/.test(String(line.id))) return null;
    const properties = {};
    KEPT_PROPERTIES.forEach((key) => {
      if (typeof line.properties?.[key] === 'string') properties[key] = line.properties[key];
    });
    return { id: String(line.id), properties };
  }

  // La ligne gardée avec le j'aime, que « Mes j'aime » montre (assets/my-likes.js) : celle de cet instant.
  keepLikedLine(line) {
    const lines = likedStorage.lines();
    lines[this.productHandle] = line;
    likedStorage.write('productLikedLines', lines);
  }

  /* Plus de ligne gardée pour l'œuvre : un j'aime donné depuis une carte, ou retiré. Rien ne s'écrit si elle
     n'en avait pas. */
  forgetLikedLine() {
    const lines = likedStorage.lines();
    if (!Object.prototype.hasOwnProperty.call(lines, this.productHandle)) return;
    delete lines[this.productHandle];
    likedStorage.write('productLikedLines', lines);
  }

  deleteLiInLikedPage() {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;

    // La liste « Mes j'aime » (assets/my-likes.js) retire la carte entière (anime-product-card, à défaut le li),
    // et montre la liste vide quand plus aucune ne reste.
    const card = this.closest('anime-product-card') || this.closest('li');
    if (card) myLikesComponent.removeCard(card);
  }

  updateLikeButtonCount() {
    const likesCountElement = document.querySelector('likes-count');
    if (likesCountElement) {
      likesCountElement.updateCount();
    }
  }

  async updateLikesCountOnServer(id, action) {
    try {
      this.disableButton();
      const response = await fetch(
        `https://backend.myselfmonart.com/api/product/update/metafield/likes-count`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: id, action }),
        },
      );
      const newCount = await response.json();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      this.enableButton();
    }
  }

  disableButton() {
    this.querySelector('button.like').classList.add('disabled');
    this.querySelector('button.like').classList.add('cursor-not-allowed');
  }

  enableButton() {
    this.querySelector('button.like').classList.remove('disabled');
    this.querySelector('button.like').classList.remove('cursor-not-allowed');
  }
}
customElements.define('my-like-button', MyLikeButton);
}