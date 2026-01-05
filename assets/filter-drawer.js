class FilterDrawer extends HTMLElement {
  constructor() {
    super();
    this.drawerElement = this;
    this.overlay = document.getElementById('overlay-content');

    // Focus management elements
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElementList = this.querySelectorAll(focusableElements);
    this.firstFocusableElement = this.focusableElementList[0];
    this.lastFocusableElement = this.focusableElementList[this.focusableElementList.length - 1];

    this.closeButton = this.querySelector('.close');
    this.openButton = document.getElementById('filter-button-mobile');
    this.body = document.body;
  }

  connectedCallback() {
    // Event listeners
    this.addEventListener('keydown', (e) => this.trapFocus(e));
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());

    // Open button click
    if (this.openButton) {
      this.openButton.addEventListener('click', () => this.open());
    }

    // Close button click
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close());
    }

    // Overlay click
    document.addEventListener('overlayClick', () => this.close());

    // Custom event for programmatic opening
    document.addEventListener('openFilterDrawer', () => this.open());
  }

  open() {
    this.scopeFocusElements();
    this.overlay.classList.remove('hidden');
    this.drawerElement.classList.replace('translate-x-full', 'translate-x-0');
    this.body.classList.add('overflow-hidden');
    this.setAttribute('aria-expanded', 'true');
    if (this.openButton) {
      this.openButton.setAttribute('aria-expanded', 'true');
    }
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }
  }

  close() {
    this.focusableElementList.forEach((elem) => elem.setAttribute('tabindex', '-1'));
    this.overlay.classList.add('hidden');
    this.drawerElement.classList.replace('translate-x-0', 'translate-x-full');
    this.body.classList.remove('overflow-hidden');
    this.setAttribute('aria-expanded', 'false');
    if (this.openButton) {
      this.openButton.setAttribute('aria-expanded', 'false');
      this.openButton.focus();
    }
  }

  scopeFocusElements() {
    this.focusableElementList.forEach((elem) => elem.setAttribute('tabindex', '0'));
  }

  trapFocus(e) {
    if (e.key === 'Tab' || e.keyCode === 9) {
      if (e.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          if (this.lastFocusableElement) {
            this.lastFocusableElement.focus();
          }
          e.preventDefault();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          if (this.firstFocusableElement) {
            this.firstFocusableElement.focus();
          }
          e.preventDefault();
        }
      }
    }
  }
}

customElements.define('filter-drawer', FilterDrawer);
