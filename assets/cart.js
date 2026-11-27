class CartItem extends HTMLElement {
  constructor() {
    super();
    this.totalPriceElem = this.querySelector('.total-price');
    this.sectionId = this.dataset.sectionId;
    this.fullSectionId = 'shopify-section-' + this.sectionId;
    this.index = Number(this.dataset.index);
    this.subtotalSectionId = 'page-cart-subtotal';
    this.subtotalFullSectionId = 'shopify-section-' + this.subtotalSectionId;
  }

  async updateQuantity(quantity, previousElemFocused) {
    this.activeLoading();

    try {
      const response = await fetch(`${routes.cart_change_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: `application/json`,
        },
        body: JSON.stringify({
          line: this.index,
          quantity,
          sections: `${this.sectionId},${this.subtotalSectionId}`,
        }),
      });
      const json = await response.json();
      const currentSection = this.renderNewSections(json);
      this.setFocus(currentSection, previousElemFocused);
    } catch (error) {
      console.log('🚀 ~ error:', error);
    } finally {
      this.disableLoading();
    }
  }

  renderNewSections(json) {
    const currentSection = this.closest(`#${this.fullSectionId}`);
    const newSection = this.getNewSection(json.sections[this.sectionId], `#${this.fullSectionId}`);
    currentSection.innerHTML = newSection.innerHTML;

    const subtotalSection = document.getElementById(this.subtotalFullSectionId);
    const newSubtotalSection = this.getNewSection(json.sections[this.subtotalSectionId], `#${this.subtotalFullSectionId}`);
    subtotalSection.innerHTML = newSubtotalSection.innerHTML;

    return currentSection
  }

  getNewSection(json, selector) {
    return new DOMParser().parseFromString(json, 'text/html').querySelector(selector);
  }

  activeLoading() {
    this.totalPriceElem.classList.add('hidden');
    this.totalPriceElem.nextElementSibling.classList.remove('hidden');
  }

  disableLoading() {
    this.totalPriceElem.classList.remove('hidden');
    this.totalPriceElem.nextElementSibling.classList.add('hidden');
  }

  setFocus(currentSection, previousElemFocused) {
    const previousIndex = previousElemFocused.closest('cart-item').dataset.index;
    const previousButtonSign = previousElemFocused.name;
    const elemToFocus = currentSection.querySelector(`cart-item[data-index="${previousIndex}"] quantity-input button[name="${previousButtonSign}"]`) || currentSection.querySelector(`cart-item[data-index="1"] quantity-input button[name="plus"]`);
    if (elemToFocus) elemToFocus.focus();
    console.log(document.activeElement)
  }
}
customElements.define('cart-item', CartItem);

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.cartItem = this.closest('cart-item');
    this.onButtonClickBound = this.onButtonClick.bind(this);
    this.timeoutId = null;
  }

  connectedCallback() {
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick),
    );
  }

  disconnectedCallback() {
    clearTimeout(this.timeoutId);
    this.querySelectorAll('button').forEach((button) =>
      button.removeEventListener('click', this.onButtonClickBound),
    );
  }

  onButtonClick = (e) => {
    const previousValue = Number(this.input.value);
    if (e.target.name === 'plus') this.input.value = previousValue + 1;
    else if (e.target.name === 'minus' && previousValue > 0)
      this.input.value = previousValue - 1;

    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.cartItem.updateQuantity(this.input.value, e.target);
    }, 300);
  };
}
customElements.define('quantity-input', QuantityInput);
