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
    this.productHandle = this.dataset.productHandle;
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
      const productLikedHandles = this.getProductLikedHandles();
      
      if (isLiked) {
        this.deleteProductLikedIdInLocalStorage(productLikedIds);
        this.deleteProductLikedHandleInLocalStorage(productLikedHandles);
        this.deleteLiInLikedPage();
        await this.updateLikesCountOnServer(this.productId, 'decrement');
      } else {
        this.saveProductLikedIdInLocalStorage(productLikedIds);
        this.saveProductLikedHandleInLocalStorage(productLikedHandles);
        this.deleteLiInLikedPage();
        await this.updateLikesCountOnServer(this.productId, 'increment');
      }

      this.updateLikeButtonCount();
    });
  }

  getProductLikedIds() {
    const unformattedproductLikedIds = localStorage.getItem('productLikedIds');
    const productLikedIds = JSON.parse(unformattedproductLikedIds) || [];
    return productLikedIds;
  }

  getProductLikedHandles() {
    const unformattedproductLikedHandles = localStorage.getItem('productLikedHandles');
    const productLikedHandles = JSON.parse(unformattedproductLikedHandles) || [];
    return productLikedHandles;
  }

  saveProductLikedIdInLocalStorage(productLikedIds) {
    productLikedIds.push(this.productId);
    localStorage.setItem('productLikedIds', JSON.stringify(productLikedIds));
  }

  saveProductLikedHandleInLocalStorage(productLikedHandles) {
    productLikedHandles.push(this.productHandle);
    localStorage.setItem('productLikedHandles', JSON.stringify(productLikedHandles));
  }

  deleteProductLikedIdInLocalStorage(productLikedIds) {
    const productLikedIdsFiltered = productLikedIds.filter(
      (productLikedId) => productLikedId !== this.productId,
    );
    localStorage.setItem('productLikedIds', JSON.stringify(productLikedIdsFiltered));
  }

  deleteProductLikedHandleInLocalStorage(productLikedHandles) {
    const productLikedHandlesFiltered = productLikedHandles.filter(
      (productLikedHandle) => productLikedHandle !== this.productHandle,
    );
    localStorage.setItem('productLikedHandles', JSON.stringify(productLikedHandlesFiltered));
  }

  deleteLiInLikedPage() {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;
    this.closest('li').remove();
    const productLikedIds = this.getProductLikedIds();
    const isLastLi = productLikedIds.length === 0;
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
    if (!likesCountElem) return;
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
}
customElements.define('my-like-button', MyLikeButton);
}