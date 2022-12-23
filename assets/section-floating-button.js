if (!customElements.get('floating-button')) {
  class FloatingButton extends HTMLElement {
    constructor() {
        super();  
        this.button = this.querySelector('a')
      }
  
      connectedCallback() {
        const options = {
          root: document.root,
          rootMargin: '0px',
          threshold: [0],
        };
        const observer = new IntersectionObserver(this.showStickyButton.bind(this), options);
        observer.observe(this);
      }
  
      showStickyButton(entries) {
        if (entries[0].intersectionRatio === 1) {
          this.button.classList.add('show')
        } else if(!entries[0].isIntersecting && entries[0].boundingClientRect.bottom > 0) {
          this.button.classList.remove('show')
        }
      }
  }
  customElements.define('floating-button', FloatingButton);
}
