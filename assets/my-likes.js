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
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }
}
customElements.define('my-likes', MyLikes);

class MyLikeButton extends HTMLElement {
  connectedCallback() {
    const { likedLisHtml } = this.getLisStorage();
    likedLisHtml.forEach(likedLi => {
      const id = likedLi.id;
      const liToLiked = document.getElementById(id);
      liToLiked?.querySelector('button.like').classList.add('bg-like');
    });

    this.addEventListener('click', () => {
      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('bg-like');
      likeButton.classList.toggle('bg-like', !isLiked);
      const liParent = this.closest('li');

      const { likedLisHtml, likedLisString } = this.getLisStorage();
      if (isLiked) {
        this.deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent);
      } else {
        this.saveLiInLocalStorage(likedLisHtml, likedLisString, liParent);
      }

      this.colorButton(likedLisString);
      this.deleteLiInLikedPage(likedLisString.length === 0);
    });
  }

  getLisStorage() {
    const likedLis = localStorage.getItem('likedLis');
    const likedLisString = likedLis ? JSON.parse(likedLis) : [];
    const likedLisHtml = likedLisString.map(likedLi => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(likedLi, 'text/html');
      const li = doc.body.firstChild;
      return li;
    });
    return { likedLisHtml, likedLisString };
  }

  colorButton(likedLisString) {
    this.likesHeart = this.likesHeart ?? document.getElementById('likes');
    if (likedLisString.length > 0) {
      this.likesHeart?.classList.add('fill-like');
    } else {
      this.likesHeart?.classList.remove('fill-like');
    }
  }

  saveLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    likedLisString.push(liParent.outerHTML);
    likedLisHtml.push(liParent);
    localStorage.setItem('likedLis', JSON.stringify(likedLisString));
  }

  deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    const index = likedLisHtml.findIndex(likedLi => likedLi.id === liParent.id);
    likedLisString.splice(index, 1);
    likedLisHtml.splice(index, 1);
    localStorage.setItem('likedLis', JSON.stringify(likedLisString));
  }

  deleteLiInLikedPage(isLastLi) {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;
    this.closest('li').remove();
    if (isLastLi) myLikesComponent.showEmptyMessage();
  }
}
customElements.define('my-like-button', MyLikeButton);