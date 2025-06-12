if (!customElements.get('my-likes-button')) {
class MyLikesButton extends HTMLElement {
  connectedCallback() {
    const productLikedIds = this.getProductLikedIds();
    if (productLikedIds.length > 0) {
      this.colorButton();
    }
  }

  getProductLikedIds() {
    const unformattedproductLikedIds = localStorage.getItem('productLikedIds');
    const productLikedIds = JSON.parse(unformattedproductLikedIds) || [];
    return productLikedIds;
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
  }

  connectedCallback() {
    const productLikedIds = this.getProductLikedIds();
    productLikedIds.forEach((productLikedId) => {
      const liToLiked = document.getElementById(productLikedId) || document.querySelector(`my-like-button[data-product-id="${productLikedId}"]`);
      liToLiked?.querySelector('button.like').classList.add('is-liked');
    });

    this.addEventListener('click', async () => {
      if (this.querySelector('button.like').classList.contains('disabled')) return;

      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('is-liked');
      likeButton.classList.toggle('is-liked', !isLiked);

      const productLikedIds = this.getProductLikedIds();
      if (isLiked) {
        this.deleteProductLikedIdInLocalStorage(productLikedIds);
        await this.updateLikesCountOnServer(this.productId, 'decrement');
      } else {
        this.saveProductLikedIdInLocalStorage(productLikedIds);
        await this.updateLikesCountOnServer(this.productId, 'increment');
      }

      this.deleteLiInLikedPage(productLikedIds.length === 0);
      this.updateLikeButtonCount();
      this.updateInfiniteScrollStrorage();
    });
  }

  getProductLikedIds() {
    const unformattedproductLikedIds = localStorage.getItem('productLikedIds');
    const productLikedIds = JSON.parse(unformattedproductLikedIds) || [];
    return productLikedIds;
  }

  saveProductLikedIdInLocalStorage(productLikedIds) {
    productLikedIds.push(this.productId);
    localStorage.setItem('productLikedIds', JSON.stringify(productLikedIds));
  }

  deleteProductLikedIdInLocalStorage(productLikedIds) {
    const productLikedIdsFiltered = productLikedIds.filter(
      (productLikedId) => productLikedId !== this.productId,
    );
    localStorage.setItem('productLikedIds', JSON.stringify(productLikedIdsFiltered));
  }

  deleteLiInLikedPage(isLastLi) {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;
    this.closest('li').remove();
    if (isLastLi) myLikesComponent.showEmptyMessage();
  }

  updateLikeButtonCount() {
    document.querySelector('likes-count').updateCount();
  }

  async updateLikesCountOnServer(id, action) {
    try {
      this.disableButton();
      this.updateLikesCountOnLayout(action);
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

  updateLikesCountOnLayout(action) {
    const likesCountElem = this.querySelector(
      '.total-users-likes-count',
    );
    const count = parseInt(likesCountElem.textContent);
    const newCount = action === 'increment' ? count + 1 : count - 1;
    likesCountElem.textContent = newCount.toString();
  }

  updateLikesCountOnLocalStorage(id, action) {
    const products = JSON.parse(localStorage.getItem('products'));
    const product = products.find((product) => product.id === id);
    product.likesCount =
      action === 'increment' ? product.likesCount + 1 : product.likesCount - 1;
    localStorage.setItem('products', JSON.stringify(products));
  }

  disableButton() {
    this.querySelector('button.like').classList.add('disabled');
    this.querySelector('button.like').classList.add('cursor-not-allowed');
  }

  enableButton() {
    this.querySelector('button.like').classList.remove('disabled');
    this.querySelector('button.like').classList.remove('cursor-not-allowed');
  }

  updateInfiniteScrollStrorage() {
    // Get all session storage entries that start with 'infinite-scroll-storage-'
    const infiniteScrollEntries = Object.keys(sessionStorage)
      .filter(key => key.startsWith('infinite-scroll-storage-'))
      .map(key => ({
        key,
        html: sessionStorage.getItem(key)
      }));

    if (infiniteScrollEntries.length === 0) return;

    // Process each HTML entry
    infiniteScrollEntries.forEach(entry => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(entry.html, 'text/html');
      const myLikeButton = doc.querySelector(`my-like-button[data-product-id="${this.productId}"]`);
      
      if (myLikeButton) {
        const likesCountElem = myLikeButton.querySelector('.total-users-likes-count');
        likesCountElem.textContent = this.querySelector('.total-users-likes-count').textContent;
        
        // Save the modified HTML back to session storage
        sessionStorage.setItem(entry.key, doc.documentElement.outerHTML);
      }
    });
  }
}
customElements.define('my-like-button', MyLikeButton);
}