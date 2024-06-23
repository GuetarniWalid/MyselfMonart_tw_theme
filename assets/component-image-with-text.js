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
      const observer = new IntersectionObserver(
        this.unblobShape.bind(this),
        options,
      );
      observer.observe(this.blobContainer);
    }

    unblobShape(entries) {
      if (entries[0].intersectionRatio === 1) {
        this.blobContainer.classList.remove('active');
      } else if (!entries[0].isIntersecting) {
        this.blobContainer.classList.add('active');
      }
    }
  }

  customElements.define('blob-shape-media', BlobShapeMedia);
}

if (!customElements.get('dynamic-color')) {
  class DynamicColor extends HTMLElement {
    constructor() {
      super();
      this.newPrimaryRGBColor = this.dataset.primaryColor;
      this.newSecondaryRGBColor = this.dataset.secondaryColor;
      this.section = this.closest('.shopify-section');
      32;
    }

    connectedCallback() {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.01,
      };
      const observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        options,
      );
      observer.observe(this.section);
    }

    handleIntersection(entries) {
      const entry = entries[0];
      if (entry.isIntersecting && entry.intersectionRatio >= 0.01) {
        this.changeColor();
        this.preventOthersDynamicColorChanges(true);
      } else if (!entries[0].isIntersecting) {
        this.preventOthersDynamicColorChanges(false);
        this.resetColor();
      }
    }

    changeColor() {
      document.documentElement.style.setProperty(
        '--color-main-rgb',
        this.newPrimaryRGBColor,
      );
      document.documentElement.style.setProperty(
        '--color-secondary-rgb',
        this.newSecondaryRGBColor,
      );
    }

    resetColor() {
      if (window.isDynamicColorSet) return;
      document.documentElement.style.removeProperty('--color-main-rgb');
      document.documentElement.style.removeProperty('--color-secondary-rgb');
    }

    preventOthersDynamicColorChanges(toPrevent) {
      if (window.countElemObserved === undefined) {
        window.countElemObserved = 0;
      }
      if (toPrevent) {
        window.countElemObserved = window.countElemObserved + 1;
      } else {
        window.countElemObserved = window.countElemObserved - 1;
        if (window.countElemObserved < 0) window.countElemObserved = 0;
      }
      window.isDynamicColorSet = window.countElemObserved > 0;
    }
  }
  customElements.define('dynamic-color', DynamicColor);
}
