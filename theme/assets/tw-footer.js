class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.firstFocusableElement = this.querySelector('.first-focusable');
    this.lastFocusableElement = this.querySelector('.last-focusable');
    const availableCountries = this.dataset.availableCountries?.trim();
    if (availableCountries) {
      this.localeByCurency = {};
      availableCountries.split(' ').forEach(item => {
        const [currency, localeCode] = item.split(',');
        this.localeByCurency[currency] = localeCode;
      });
    }
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      button: this.querySelector('button'),
      panel: this.querySelector('.disclosure__list-wrapper'),
    };
  }

  connectedCallback() {
    this.elements.button.addEventListener('click', this.openSelector.bind(this));
    this.elements.button.addEventListener('focusout', this.closeSelector.bind(this));
    this.addEventListener('keyup', this.onContainerKeyUp.bind(this));

    this.querySelectorAll('a').forEach(item => item.addEventListener('click', this.onItemClick.bind(this)));

    this.addEventListener('keydown', e => trapFocus(e, this.firstFocusableElement, this.lastFocusableElement));
  }

  hidePanel() {
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.panel.setAttribute('hidden', true);
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    this.hidePanel();
    this.elements.button.focus();
  }

  onItemClick(event) {
    event.preventDefault();
    if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
    const form = this.querySelector('form');
    if (this.localeByCurency) this.elements.input.value = this.localeByCurency[event.currentTarget.dataset.value];
    else this.elements.input.value = event.currentTarget.dataset.value;
    if (form) form.submit();
  }

  openSelector() {
    this.elements.button.focus();
    this.elements.panel.toggleAttribute('hidden');
    this.elements.button.setAttribute('aria-expanded', (this.elements.button.getAttribute('aria-expanded') === 'false').toString());
  }

  closeSelector(event) {
    const shouldClose = event.relatedTarget && event.relatedTarget.nodeName === 'BUTTON';
    if (event.relatedTarget === null || shouldClose) {
      this.hidePanel();
    }
  }
}
customElements.define('localization-form', LocalizationForm);

class FooterLogic extends HTMLElement {
  constructor() {
    super();
    this.footer = this.closest('footer');
    this.mainProductBlocks = document.querySelector('main-product-blocks');
  }

  connectedCallback() {
    if (this.mainProductBlocks?.blockBuyButton) {
      this.mainProductBlocks.initObserver(this.footer);
    }
  }
}
customElements.define('footer-logic', FooterLogic);
