if (!customElements.get('blob-shape-media')) {
  class BlobShapeMedia extends HTMLElement {
    constructor() {
      super();  
      this.blobContainer = this.querySelector('.blob');
    }

    connectedCallback() {
      const options = {
        root: document.root,
        rootMargin: '0px',
        threshold: [0, 1],
      };
      const observer = new IntersectionObserver(this.unblobShape.bind(this), options);
      observer.observe(this.blobContainer);
    }

    unblobShape(entries) {
      if (entries[0].intersectionRatio === 1) {
        this.blobContainer.classList.remove('active');
      } else if(!entries[0].isIntersecting) {
        this.blobContainer.classList.add('active');
      }
    }
  }

  customElements.define('blob-shape-media', BlobShapeMedia);
}
