class MyLikes extends HTMLElement {
  async connectedCallback() {
    this.priceFormat = this.dataset.priceFormat;
    const template = this.querySelector('template');
    const instance = template.content.cloneNode(true);
    const productCardModel = instance.querySelector('li');
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

  async getProductsLikedElements(productsLiked, productCardModel) {
    const productsLikedElements = await Promise.all(productsLiked.map(handle => this.getProductLikedElement(handle, productCardModel)));
    return productsLikedElements;
  }

  async getProductLikedElement(handle, productCardModel) {
    const product = await this.fetchProductByHandle(handle);
    const model = productCardModel.cloneNode(true);

    model.querySelector('h3 a').href = `/products/${handle}`;
    const svg = model.querySelector('h3 a span svg');
    model.querySelector('h3 a').textContent = product.title + ' ';
    model.querySelector('h3 a').appendChild(svg);

    model.querySelector('img').src = `${product.image.src}&width=533`;
    model.querySelector('img').srcset = this.buildShopifySrcset(product.image.src);
    model.querySelector('img').alt = product.image.alt;
    model.querySelector('img').width = product.image.width;
    model.querySelector('img').height = product.image.height;

    model.querySelector('img + img').src = `${product.images[1].src}&width=533`;
    model.querySelector('img + img').srcset = this.buildShopifySrcset(product.images[1].src);
    model.querySelector('img + img').alt = product.images[1].alt;
    model.querySelector('img + img').width = product.images[1].width;
    model.querySelector('img + img').height = product.images[1].height;

    model.querySelector('.price-and-likes p strong').textContent = this.formatPrice(product.variants[0].price, this.priceFormat);

    model.querySelector('.total-users-likes-count').parentElement.remove();
    model.querySelector('.like').classList.add('is-liked');
    model.querySelector('my-like-button').dataset.productId = product.id;
    model.querySelector('my-like-button').dataset.productHandle = product.handle;

    return model;
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
  }

  hideLoader() {
    this.nextElementSibling.classList.add('hidden');
  }

  showEmptyMessage() {
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }
}
customElements.define('my-likes', MyLikes);