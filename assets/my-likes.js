class MyLikes extends HTMLElement {
  async connectedCallback() {
    this.priceFormat = this.dataset.priceFormat;
    const template = this.querySelector('template');
    const instance = template.content.cloneNode(true);
    const productCardModel = instance.querySelector('anime-product-card');
    const productsLiked = await this.getProductsLiked();
    const productsLikedElements = await this.getProductsLikedElements(productsLiked, productCardModel);
    this.populateInstance(instance, productsLikedElements);
    this.hideLoader();
    if(productsLiked.length === 0) this.showEmptyMessage();
    this.appendChild(instance);
  }

  async getProductsLiked() {
    const productsLiked = localStorage.getItem('productLikedHandles');
    return JSON.parse(productsLiked) || [];
  }

  getProductShortTitles() {
    const shortTitles = localStorage.getItem('productShortTitles');
    return JSON.parse(shortTitles) || {};
  }

  async getProductsLikedElements(productsLiked, productCardModel) {
    const shortTitles = this.getProductShortTitles();
    const productsLikedElements = await Promise.all(productsLiked.map(handle => this.getProductLikedElement(handle, productCardModel, shortTitles)));
    return productsLikedElements;
  }

  async getProductLikedElement(handle, productCardModel, shortTitles) {
    const product = await this.fetchProductByHandle(handle);
    const wrapper = productCardModel.cloneNode(true);
    const li = wrapper.querySelector('li');

    // Update product ID on the li element
    if (li) {
      li.id = product.id;
    }

    // Use short title from localStorage if available, fallback to full title
    const displayTitle = shortTitles[handle] || product.title;

    // Update product link
    const titleLink = wrapper.querySelector('h3 a');
    if (titleLink) {
      titleLink.href = `/products/${handle}`;
      titleLink.dataset.fullTitle = product.title.toUpperCase();
      const svg = wrapper.querySelector('h3 a span svg');
      titleLink.textContent = displayTitle.toUpperCase() + ' ';
      if (svg) {
        titleLink.appendChild(svg);
      }
    }

    // Update first image while preserving LQIP structure
    const firstImg = wrapper.querySelector('img');
    const image = product.image ?? product.images[0];
    if (firstImg && image) {
      // Keep the LQIP placeholder in src (10px)
      firstImg.src = `${image.src}&width=10`;
      // Set full resolution in data-srcset for LQIP system
      firstImg.setAttribute('data-srcset', this.buildShopifySrcset(image.src));
      // Ensure lqip class is present
      if (!firstImg.classList.contains('lqip')) {
        firstImg.classList.add('lqip');
      }
      firstImg.alt = image.alt;
      firstImg.width = image.width;
      firstImg.height = image.height;
    }

    // Update price
    const priceElement = wrapper.querySelector('.price-and-likes p strong');
    if (priceElement && product.variants && product.variants[0]) {
      priceElement.textContent = this.formatPrice(product.variants[0].price, this.priceFormat);
    }

    // Remove likes count and mark as liked
    const likesCount = wrapper.querySelector('.total-users-likes-count');
    if (likesCount) {
      likesCount.remove();
    }

    const likeButton = wrapper.querySelector('.like');
    if (likeButton) {
      likeButton.classList.add('is-liked');
    }

    const myLikeButton = wrapper.querySelector('my-like-button');
    if (myLikeButton) {
      myLikeButton.dataset.productId = product.id;
      myLikeButton.dataset.productHandle = product.handle;
    }

    return wrapper;
  }

  async fetchProductByHandle(handle) {
    const response = await fetch(`/products/${handle}.json`);
    const data = await response.json();
    return data.product;
  }

  buildShopifySrcset(baseUrl) {
    const widths = [380, 430, 500];
    return widths.map(width => `${baseUrl}&width=${width} ${width}w`).join(',');
  }

  formatPrice(price, priceString) {
    const matches = priceString.match(/([\D]*)?([\d.,]+)([\D]*)?/);
    if (!matches) return priceString;

    const [, beforeNumber, numberPart, afterNumber] = matches;
    const symbol = (beforeNumber || afterNumber || '').trim();
    const isSymbolBefore = !!beforeNumber;
    
    if (isSymbolBefore) {
      return `${symbol}${price}`;
    } else {
      return `${price} ${symbol}`;
    }
  }

  populateInstance(instance, productsLikedElements) {
    const ul = instance.querySelector('ul');
    ul.firstElementChild.remove();
    productsLikedElements.forEach(element => {
      ul.appendChild(element);
    });

    // Apply unblur effect to newly loaded images
    if (window.removeSkeletonOnImagesLoad) {
      window.removeSkeletonOnImagesLoad(ul);
    }
  }

  hideLoader() {
    this.nextElementSibling.classList.add('hidden');
  }

  showEmptyMessage() {
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }
}
customElements.define('my-likes', MyLikes);