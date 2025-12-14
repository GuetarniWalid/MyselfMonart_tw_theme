class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.cartDrawer = this.parentElement;
    this.overlay = document.getElementById('overlay-content');
    const focusableElements = 'button, [href]';
    this.focusableElementList = this.querySelectorAll(focusableElements);
    this.firstFocusableElement = this.focusableElementList[0];
    this.lastFocusableElement =
      this.focusableElementList[this.focusableElementList.length - 1];
    this.closeButton = this.querySelector('.close');
    this.cartButton = document.querySelector('#cart-button');
    this.body = document.body;
    this.minusButton = document.querySelector('[name="minus"]');
    this.plusButton = document.querySelector('[name="plus"]');
  }

  connectedCallback() {
    this.addEventListener('keydown', (e) =>
      trapFocus(e, this.firstFocusableElement, this.lastFocusableElement),
    );
    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close(),
    );
    document.addEventListener('openCartDrawer', this.open);
    this.closeButton.addEventListener('click', this.close);
    document.addEventListener('overlayClick', this.close);

    const links = this.querySelectorAll('.obfuscate');
    links.forEach((link) => {
      link.addEventListener('click', () => makesLinksNavigable(link), false);
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          makesLinksNavigable(link);
        }
      });
    });

    this.setKlarnaPlacement();
  }

  open = () => {
    this.scopeFocusElements();
    this.overlay.classList.remove('hidden');
    this.cartDrawer.classList.replace('translate-x-full', 'translate-x-0');
    this.body.classList.add('overflow-hidden');
    this.firstFocusableElement.focus();
  };

  close = () => {
    document.dispatchEvent(new CustomEvent('CartDrawerClose'));
    this.focusableElementList.forEach((elem) =>
      elem.setAttribute('tabindex', '-1'),
    );
    this.overlay.classList.add('hidden');
    this.cartDrawer.classList.replace('translate-x-0', 'translate-x-full');
    this.body.classList.remove('overflow-hidden');
    this.setAttribute('aria-expanded', 'false');
    this.cartButton.focus();
  };

  scopeFocusElements = () => {
    this.focusableElementList.forEach((elem) =>
      elem.setAttribute('tabindex', '0'),
    );
    this.setAttribute('aria-expanded', 'true');
  };

  trapFocus = (e) => {
    if (e.key === 'Tab' || e.code === 9) {
      if (e.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          this.lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          this.firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  setKlarnaPlacement = () => {
    const klarnaPlacement = this.querySelector('klarna-placement');
    if (!klarnaPlacement) return;
    const locale = getLocale();
    klarnaPlacement.setAttribute('data-locale', locale);
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartItem extends HTMLElement {
  constructor() {
    super();
    this.totalPriceElem =
      this.closest('cart-drawer').querySelector('#total-price');
    this.promoPriceElem =
      this.closest('cart-drawer').querySelector('#promo-price');
    this.cartDrawerSectionId = this.dataset.sectionId;
    this.index = Number(this.dataset.index);
    this.id = this.dataset.id;
    this.variantLinkedIds = [];
    this.cartItems = null;
  }

  connectedCallback() {
    this.getCartData()
      .then((json) => {
        this.cartItems = json.items;
        const item = json.items.find((item) => item.id == this.id);
        const properties = item.properties;
        const variantLinkedKeys = Object.keys(properties).filter((key) =>
          key.startsWith('_variantId_'),
        );
        this.variantLinkedIds = variantLinkedKeys.map((key) => properties[key]);
      })
      .catch((error) => {
        console.log('🚀 ~ error:', error);
      });
  }

  async updateQuantity(quantity) {
    this.activeLoading();

    try {
      if (this.variantLinkedIds.length > 0) {
        await this.changeItemAndLinkedIdsQuantity(quantity);
      } else {
        await this.changeLineQuantity(quantity);
      }
    } catch (error) {
      console.log('🚀 ~ error:', error);
    } finally {
      this.disableLoading();
    }
  }

  async changeLineQuantity(quantity) {
    const response = await fetch(`${routes.cart_change_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: `application/json`,
      },
      body: JSON.stringify({
        line: this.index,
        quantity,
        sections: `${this.cartDrawerSectionId}`,
      }),
    });
    const json = await response.json();

    // Fetch current cart state to update bubble
    const cart = await this.getCartData();

    this.renderNewSections(json, cart);
    this.setFocus();
  }

  async changeItemAndLinkedIdsQuantity(quantity) {
    let updates = {
      [this.id]: quantity,
      ...Object.fromEntries(
        this.variantLinkedIds.map((id) => {
          const currentVariantQuantity = this.cartItems.find(
            (item) => item.id == this.id,
          ).quantity;
          const variantQuantity = this.cartItems.find(
            (item) => item.id == id,
          )?.quantity;
          if (!variantQuantity) return [id, 0];
          let newVariantQuantity = variantQuantity - currentVariantQuantity;
          if (newVariantQuantity < 0) newVariantQuantity = 0;
          return [id, newVariantQuantity];
        }),
      ),
    };

    const response = await fetch(`${routes.cart_update_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: `application/json`,
      },
      body: JSON.stringify({
        updates,
        sections: `${this.cartDrawerSectionId}`,
      }),
    });
    const json = await response.json();

    // Fetch current cart state to update bubble
    const cart = await this.getCartData();

    this.renderNewSections(json, cart);
    this.setFocus();
  }

  renderNewSections(json, cart) {
    // Update bubble manually with cart item count
    const bubble = document.getElementById('bubble-nb-product');
    if (bubble && cart) {
      if (cart.item_count > 0) {
        const itemCountHTML = cart.item_count < 100
          ? `<span aria-hidden="true">${cart.item_count}</span>`
          : '';
        const srOnlyHTML = `<span class="sr-only">Cart count: ${cart.item_count}</span>`;
        bubble.innerHTML = itemCountHTML + srOnlyHTML;
      } else {
        bubble.innerHTML = '';
      }
    }

    const sectionDrawer = document.getElementById(
      'shopify-section-tw-cart-drawer',
    );
    if (sectionDrawer) {
      const newSectionDrawer = this.getSectionInnerJSON(
        json.sections['tw-cart-drawer'],
        '#shopify-section-tw-cart-drawer',
      );
      if (newSectionDrawer) {
        sectionDrawer.innerHTML = newSectionDrawer;
      }
    }
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

  async getCartData() {
    const response = await fetch(`${routes.cart_url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: `application/json`,
      },
    });
    const json = await response.json();
    return json;
  }
}
customElements.define('cart-item', CartItem);

class CartRemoveButton extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', () => {
      this.querySelector('button').setAttribute('disabled', 'true');
      this.closest('cart-item').updateQuantity(0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);

class QuickAddToCart extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', () => {
      this.querySelector('button').setAttribute('disabled', 'true');
      const itemIds = this.dataset.items.split(',');
      this.makeOrder(itemIds);
    });
  }

  async makeOrder(itemIds) {
    const response = await fetch(
      '/cart/add.js?sections=tw-cart-drawer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.getFetchBody(itemIds),
      },
    );
    if (!response.ok) throw new Error("Une erreur inattendu s'est produite.");
    const json = await response.json();

    // Fetch current cart state to update bubble
    const cartResponse = await fetch('/cart.js');
    const cart = await cartResponse.json();

    this.renderNewSections(json, cart);
    const closeButton = document.getElementById('addons-drawer-close-button');
    closeButton.click();
    setTimeout(() => {
      const cartDrawerButton = document.getElementById('cart-button');
      cartDrawerButton.click();
    }, 300);
  }

  getFetchBody(itemIds) {
    const itemsData = itemIds.map((id, index) => {
      const properties = {}
      if (index === 0) {
        const remainingIds = itemIds.slice(1);
        remainingIds.forEach((remainingId, remainingIndex) => {
          properties[`_variantId_${remainingIndex + 1}`] = remainingId;
        });
      }
      return {
        id,
        quantity: 1,
        properties,
      };
    });

    return JSON.stringify({
      items: itemsData,
    });
  }

  renderNewSections({ sections }, cart) {
    // Update bubble manually with cart item count
    const bubble = document.getElementById('bubble-nb-product');
    if (bubble && cart) {
      if (cart.item_count > 0) {
        const itemCountHTML = cart.item_count < 100
          ? `<span aria-hidden="true">${cart.item_count}</span>`
          : '';
        const srOnlyHTML = `<span class="sr-only">Cart count: ${cart.item_count}</span>`;
        bubble.innerHTML = itemCountHTML + srOnlyHTML;
      } else {
        bubble.innerHTML = '';
      }
    }

    const sectionDrawer = document.getElementById(
      'shopify-section-tw-cart-drawer',
    );
    if (sectionDrawer) {
      const newSectionDrawer = this.getSectionInnerJSON(
        sections['tw-cart-drawer'],
        '#shopify-section-tw-cart-drawer',
      );
      if (newSectionDrawer) {
        sectionDrawer.innerHTML = newSectionDrawer;
      }
    }
  }

  getSectionInnerJSON(json, selector) {
    return new DOMParser()
      .parseFromString(json, 'text/html')
      .querySelector(selector).innerHTML;
  }
}
customElements.define('quick-add-to-cart', QuickAddToCart);
