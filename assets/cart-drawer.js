class CartItem extends HTMLElement {
  constructor() {
    super();
    this.totalPriceElem = this.closest('cart-drawer').querySelector('#total-price');
    this.promoPriceElem = this.closest('cart-drawer').querySelector('#promo-price');
    this.cartDrawerSectionId = this.dataset.sectionId;
    this.index = Number(this.dataset.index);
  }

  async updateQuantity(quantity) {
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
          sections: `${this.cartDrawerSectionId},tw-header`,
        }),
      });
      const json = await response.json();
      this.renderNewSections(json);
      this.setFocus();
    } catch (error) {
      console.log('🚀 ~ error:', error);
    } finally {
      this.disableLoading();
    }
  }

  renderNewSections(json) {
    const bubble = document.getElementById('bubble-nb-product');
    const newBubble = this.getSectionInnerJSON(
      json.sections['tw-header'],
      '#bubble-nb-product',
    );
    bubble.innerHTML = newBubble;

    const sectionDrawer = document.getElementById(
      'shopify-section-tw-cart-drawer',
    );
    const newSectionDrawer = this.getSectionInnerJSON(
      json.sections['tw-cart-drawer'],
      '#shopify-section-tw-cart-drawer',
    );
    sectionDrawer.innerHTML = newSectionDrawer;
  }

  getSectionInnerJSON(json, selector) {
    return new DOMParser()
      .parseFromString(json, 'text/html')
      .querySelector(selector).innerHTML;
  }

  activeLoading() {
    this.totalPriceElem.classList.add('hidden');
    this.promoPriceElem?.classList.add('hidden');
    this.totalPriceElem.nextElementSibling.classList.remove('hidden');
    this.promoPriceElem?.nextElementSibling.classList.remove('hidden');
  }

  disableLoading() {
    this.totalPriceElem.classList.remove('hidden');
    this.promoPriceElem?.classList.remove('hidden');
    this.totalPriceElem.nextElementSibling.classList.add('hidden');
    this.promoPriceElem?.nextElementSibling.classList.add('hidden');
  }

  setFocus() {
    const newCartDrawer = document.querySelector('cart-drawer');
    const parentToFocus =
      newCartDrawer.querySelector(`[data-index="${this.index}"]`) ??
      newCartDrawer.querySelector(`[data-index="${this.index - 1}"]`);
    if (parentToFocus) parentToFocus.querySelector('h3 a').focus();
    else this.closest('cart-drawer').querySelector('.close').focus();
    newCartDrawer.trapFocus({});
    newCartDrawer.scopeFocusElements();
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
      this.cartItem.updateQuantity(this.input.value);
    }, 300);
  };
}
customElements.define('quantity-input', QuantityInput);

class CartRemoveButton extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', () => {
      this.querySelector('button').setAttribute('disabled', 'true');
      this.closest('cart-item').updateQuantity(0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);
