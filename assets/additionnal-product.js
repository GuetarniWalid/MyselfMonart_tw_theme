if (!customElements.get('additionnal-product')) {
  class AdditionnalProduct extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('button');
      this.image = this.querySelector('img');
      this.button.addEventListener('click', this.handleClick.bind(this));
      this.image.addEventListener('click', this.handleClick.bind(this));
    }

    handleClick(event) {
      event.preventDefault();

      const body = JSON.stringify({
        id: this.button.dataset.item,
        quantity: 1,
        sections: this.getSectionsToRender().map(section => section.section),
        sections_url: window.location.pathname,
      });

      this.enableLoading()
      fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
        .then(response => {
          return response.text();
        })
        .then(state => {
          const parsedState = JSON.parse(state);
          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');

          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach(section => {
            if (section.id === 'cart-icon-bubble') {
              document.querySelectorAll('.header').forEach(header => {
                const elementToReplace = header.querySelector(`#${section.id}`);
                if (!elementToReplace) return;
                elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
              });
            } else {
              const elementToReplace = document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
              if (!elementToReplace) return;
              elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
            }
          });
          this.disableLoading();
        })
        .catch(() => {
          const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
          errors.textContent = window.cartStrings.error;
          this.disableLoading();
        });
    }

    getSectionsToRender() {
      return [
        {
          id: 'CartDrawer',
          section: 'cart-drawer',
          selector: '.drawer__inner',
        },
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section',
        },
      ];
    }

    getSectionInnerHTML(html, selector) {
      return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
    }

    enableLoading() {
        this.button.querySelector('.loading-overlay').classList.remove('hidden');
        this.button.querySelector('span').classList.add('hidden');
        this.closest('cart-drawer').classList.add('disable-events')
        this.closest('cart-drawer').querySelector('.subtotal span:first-child').classList.add('hidden')
        this.closest('cart-drawer').querySelector('.subtotal span:last-child').classList.remove('hidden')
      }
    
      disableLoading() {
        document.querySelector('cart-drawer').classList.remove('disable-events')
      }
  }

  customElements.define('additionnal-product', AdditionnalProduct);
}
