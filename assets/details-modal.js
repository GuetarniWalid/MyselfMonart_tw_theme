class DetailsModal extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    this.detailsContainer.addEventListener('keyup', event => event.code.toUpperCase() === 'ESCAPE' && this.close());
    this.summaryToggle.addEventListener('click', this.onSummaryClick.bind(this));
    this.querySelector('button[type="button"]').addEventListener('click', this.close.bind(this));

    this.summaryToggle.setAttribute('role', 'button');
  }

  connectedCallback() {
    const overlay = this.querySelector('.modal-overlay')
    overlay?.addEventListener('mouseenter', () => {
      document.cursorInCartButton = true
    });
    overlay?.addEventListener('mouseleave', () => {
      document.cursorInCartButton = false
    });

    // Piège de focus : même mécanique que cart-drawer.js:19 — un handler `keydown` qui
    // délègue au trapFocus global (assets/tw-global.js), lequel attend un ÉVÉNEMENT.
    this.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      const focusables = this.focusableElements();
      if (!focusables.length) return;
      trapFocus(e, focusables[0], focusables[focusables.length - 1]);
    });
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  /**
   * Éléments focusables du panneau. Le conteneur [tabindex="-1"] délimite la modale ;
   * à défaut on retombe sur le <details>. Même sélecteur que le studio
   * (assets/component-custom-art-studio.js:947).
   */
  focusableElements() {
    const panel = this.detailsContainer.querySelector('[tabindex="-1"]') || this.detailsContainer;
    const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(panel.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open') ? this.close() : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden');
    this.closest('.header__icons')?.nextElementSibling?.classList.add('hidden');

    // On amène le focus dans le panneau (l'input en priorité, comme avant), le piège Tab
    // étant posé en keydown dans connectedCallback().
    const firstFocusable =
      this.detailsContainer.querySelector('input:not([type="hidden"])') || this.focusableElements()[0];
    firstFocusable?.focus?.();
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden');
    this.closest('.header__icons')?.nextElementSibling?.classList.remove('hidden');
  }
}
customElements.define('details-modal', DetailsModal);
