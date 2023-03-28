class StickyHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.header = this.querySelector('.header');
    this.headerBounds = {};
    this.currentScrollTop = 0;
    this.preventReveal = false;
    this.preventHide = false;

    this.predictiveSearch = this.querySelector('predictive-search');

    this.onScrollHandler = this.onScroll.bind(this);
    this.revealBinded = this.reveal.bind(this)
    this.hideBinded = this.hide.bind(this)
    this.hideHeaderOnScrollUp = () => (this.preventReveal = true);

    this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
    window.addEventListener('scroll', this.onScrollHandler, false);

    this.measureFixHeaderHeight();
  }

  disconnectedCallback() {
    this.removeEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
    window.removeEventListener('scroll', this.onScrollHandler);
  }

  measureFixHeaderHeight() {
    this.headerBounds.bottom = this.header.offsetHeight;
  }

  onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (this.predictiveSearch && this.predictiveSearch.isOpen) return;

    if (scrollTop < this.headerBounds.bottom) {
      requestAnimationFrame(this.revealBinded);
    }
    else if(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight) {
        requestAnimationFrame(this.hideBinded);
    } 
    else if (scrollTop > this.currentScrollTop) {
      if (!this.preventHide) {
        requestAnimationFrame(this.hideBinded);
      } 
      else {
        window.clearTimeout(this.isScrollingDown);

        this.isScrollingDown = setTimeout(() => {
          this.preventHide = false;
        }, 33);
      }
    } else if (scrollTop < this.currentScrollTop) {
      if (!this.preventReveal) {
        requestAnimationFrame(this.revealBinded);
      } else {
        window.clearTimeout(this.isScrollingUp);

        this.isScrollingUp = setTimeout(() => {
          this.preventReveal = false;
        }, 33);
      }
    }

    this.currentScrollTop = scrollTop;
  }

  hide() {
    this.header.classList.add('hide');
    this.preventReveal = true;
    this.closeMenuDisclosure();
    this.closeSearchModal();
  }

  reveal() {
    this.header.classList.remove('hide');
    this.preventHide = true;
  }

  closeMenuDisclosure() {
    this.disclosures = this.disclosures || this.header.querySelectorAll('header-menu');
    this.disclosures.forEach(disclosure => disclosure.close());
  }

  closeSearchModal() {
    this.searchModal = this.searchModal || this.header.querySelector('details-modal');
    this.searchModal?.close(false);
  }
}

customElements.define('sticky-header', StickyHeader);
