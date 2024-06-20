class MyLikesButton extends HTMLElement {
  connectedCallback() {
    const likedLis = this.getLisStorage();
    if (likedLis.length > 0) {
      this.colorButton();
    }
  }

  getLisStorage() {
    const likedLis = localStorage.getItem('likedLis');
    return likedLis ? JSON.parse(likedLis) : [];
  }

  colorButton() {
    this.querySelector('.likes').classList.add('liked');
  }
}
customElements.define('my-likes-button', MyLikesButton);

class MyLikeButton extends HTMLElement {
  connectedCallback() {
    const { likedLisHtml } = this.getLisStorage();
    likedLisHtml.forEach((likedLi) => {
      const id = likedLi.id;
      const liToLiked = document.getElementById(id);
      liToLiked?.querySelector('button.like').classList.add('is-liked');
    });

    this.addEventListener('click', async () => {
      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('is-liked');
      likeButton.classList.toggle('is-liked', !isLiked);
      const liParent = this.closest('li');

      const { likedLisHtml, likedLisString } = this.getLisStorage();
      if (isLiked) {
        this.deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent);
        await this.updateLikesCountOnServer(liParent.id, 'decrement');
      } else {
        this.saveLiInLocalStorage(likedLisHtml, likedLisString, liParent);
        await this.updateLikesCountOnServer(liParent.id, 'increment');
      }

      this.deleteLiInLikedPage(likedLisString.length === 0);
      this.updateLikeButtonCount();
    });
  }

  getLisStorage() {
    const likedLis = localStorage.getItem('likedLis');
    const likedLisString = likedLis ? JSON.parse(likedLis) : [];
    const likedLisHtml = likedLisString.map((likedLi) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(likedLi, 'text/html');
      const li = doc.body.firstChild;
      return li;
    });
    return { likedLisHtml, likedLisString };
  }

  saveLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    likedLisString.push(liParent.outerHTML);
    likedLisHtml.push(liParent);
    localStorage.setItem('likedLis', JSON.stringify(likedLisString));
  }

  deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    const index = likedLisHtml.findIndex(
      (likedLi) => likedLi.id === liParent.id,
    );
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

  updateLikeButtonCount() {
    document.querySelector('likes-count').updateCount();
  }

  async updateLikesCountOnServer(id, action) {
    const likesCountContainer = this.getLikesCountContainerOnLayout();
    this.showLoader(likesCountContainer);
    let newCount;
    try {
      const response = await fetch(
        `https://backend.myselfmonart.com//api/product/update/metafield/likes-count`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: id, action }),
        },
      );
      newCount = await response.json();
      this.updateLikesCountOnLayout(likesCountContainer, newCount);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      this.hideLoader(likesCountContainer);
    }
  }

  updateLikesCountOnLayout(likesCountContainer, newCount) {
    const likesCountElem = likesCountContainer.querySelector(
      '.total-users-likes-count',
    );
    likesCountElem.textContent = newCount;
    if (newCount <= 0) {
      this.deleteLikesCountOnLayout(likesCountElem);
    }
  }

  getLikesCountContainerOnLayout() {
    const likesCountContainer = this.closest('li').querySelector(
      '.likes-count-container',
    );
    if (likesCountContainer) {
      return likesCountContainer;
    } else {
      this.createLikesCountContainerOnLayout();
      const likesCountContainer = this.closest('li').querySelector(
        '.likes-count-container',
      );
      return likesCountContainer;
    }
  }

  createLikesCountContainerOnLayout() {
    const template = this.closest('li').querySelector(
      '.likes-count-container-template',
    );
    const container = template.content.cloneNode(true);
    this.closest('li').querySelector('.price-and-likes').appendChild(container);
  }

  deleteLikesCountOnLayout(likesCountElem) {
    likesCountElem.closest('div').remove();
  }

  showLoader(likesCountElem) {
    likesCountElem
      .querySelector('.total-users-likes-count')
      .classList.add('hidden');
    likesCountElem.querySelector('.animate-spin').classList.remove('hidden');
  }

  hideLoader(likesCountElem) {
    likesCountElem.querySelector('.animate-spin').classList.add('hidden');
    likesCountElem
      .querySelector('.total-users-likes-count')
      .classList.remove('hidden');
  }

  updateLikesCountOnLocalStorage(id, action) {
    const products = JSON.parse(localStorage.getItem('products'));
    const product = products.find((product) => product.id === id);
    product.likesCount =
      action === 'increment' ? product.likesCount + 1 : product.likesCount - 1;
    localStorage.setItem('products', JSON.stringify(products));
  }
}
customElements.define('my-like-button', MyLikeButton);
