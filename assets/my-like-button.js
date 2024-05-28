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
      liToLiked?.querySelector('button.like').classList.add('bg-like');
    });

    this.addEventListener('click', () => {
      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('bg-like');
      likeButton.classList.toggle('bg-like', !isLiked);
      likeButton.classList.toggle('text-secondary', !isLiked);
      likeButton.classList.toggle('border-main', isLiked);
      const liParent = this.closest('li');

      const { likedLisHtml, likedLisString } = this.getLisStorage();
      if (isLiked) {
        this.deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent);
      } else {
        this.saveLiInLocalStorage(likedLisHtml, likedLisString, liParent);
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
}
customElements.define('my-like-button', MyLikeButton);
