if (!window.BlobShapeMediaDeclared) {
  class BlobShapeMedia extends HTMLElement {
    constructor() {
      super();  
      window.BlobShapeMediaDeclared = true
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
        this.blobContainer.classList.remove('close');
      } else if(!entries[0].isIntersecting) {
        this.blobContainer.classList.add('close');
      }
    }
  }

  customElements.define('blob-shape-media', BlobShapeMedia);
}
