class ClickProduct extends HTMLElement {
  connectedCallback() {
    this.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const link = this.closest('li').querySelector('a');
        link.click();
      }
    });
  }
}
customElements.define('click-product', ClickProduct);
