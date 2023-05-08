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
