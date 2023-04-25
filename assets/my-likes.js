class MyLikes extends HTMLElement {
  async connectedCallback() {
    const template = this.querySelector('template');
    const instance = template.content.cloneNode(true);
    const productsLiked = await this.getProductsLiked();
    this.populateInstance(instance, productsLiked);
    this.hideLoader();
    if(productsLiked.length === 0) this.showEmptyMessage();
    this.appendChild(instance);
  }

  async getProductsLiked() {
    const productsLiked = localStorage.getItem('likedLis');
    return JSON.parse(productsLiked) || [];
  }

  populateInstance(instance, products) {
    instance.querySelector('ul').innerHTML = products.join('')
  }

  hideLoader() {
    this.nextElementSibling.classList.add('hidden');
  }

  showEmptyMessage() {
    console.log(document.querySelector('.empty-message'))
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }

}
customElements.define('my-likes', MyLikes);