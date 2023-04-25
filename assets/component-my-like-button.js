class MyLikeButton extends HTMLElement {
  connectedCallback() {
    const { likedLisHtml, likedLisString } = this.getLisStorage();
    likedLisHtml.forEach(likedLi => {
      const id = likedLi.id;
      const liToLiked = document.getElementById(id);
      liToLiked?.querySelector('button.like').classList.add('liked');
    });

    this.addEventListener('click', () => {
      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('liked');
      likeButton.classList.toggle('liked', !isLiked);
      const liParent = this.closest('li');

      const { likedLisHtml, likedLisString } = this.getLisStorage();
      if (isLiked) {
        const index = likedLisHtml.findIndex(likedLi => likedLi.id === liParent.id);
        likedLisString.splice(index, 1);
        likedLisHtml.splice(index, 1);
        localStorage.setItem('likedLis', JSON.stringify(likedLisString));
      } else {
        likedLisString.push(liParent.outerHTML);
        likedLisHtml.push(liParent);
        localStorage.setItem('likedLis', JSON.stringify(likedLisString));
      }

      this.colorButton(likedLisString);
      this.deleteLiInLikedPage(likedLisString.length === 0);
    });

    this.colorButton(likedLisString);
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
    if (likedLisString.length > 0) {
      document.querySelector('header .list-item.likes')?.classList.add('liked');
    } else {
      document.querySelector('header .list-item.likes')?.classList.remove('liked');
    }
  }

  deleteLiInLikedPage(isLastLi) {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;
    this.closest('li').remove();
    if (isLastLi) myLikesComponent.showEmptyMessage()
  }
}
customElements.define('my-like-button', MyLikeButton);
