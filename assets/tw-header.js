class StickyHeader extends HTMLElement {
  constructor() {
    super();
    this.menuOpener = this.querySelector('.menu-opener');
    this.detailsParent = this.menuOpener.parentNode;
    this.menu = this.menuOpener.nextElementSibling;
    this.menuFirstLis = Array.from(this.menu.firstElementChild.children);
    this.subDetails = this.menu.querySelectorAll('details');
    this.titleSubCollections = this.querySelectorAll('li ul h3');
    this.overlay = document.getElementById('overlay-content');
    this.cartButton = document.getElementById('cart-button');
    this.body = document.body;
    this.headerBounds = {};
    this.currentScrollTop = 0;
    this.preventReveal = false;
    this.preventHide = false;
    this.isHide = false;
    this.header = this.parentElement;
    this.predictiveSearch = document.querySelector('predictive-search');
    this.firstFocusableElement = this.querySelector('.menu-opener');
    this.lastFocusableElement = this.querySelector('nav ul:last-of-type li:last-of-type span:last-of-type');    
  }

  connectedCallback() {
    document.addEventListener('overlayClick', async e => {
      if (!this.detailsParent.contains(e.target) && this.detailsParent.open) {
        this.renderBodyScrollable(true);
        await this.closeMenu();
      }
    });

    this.menuOpener.addEventListener('click', async e => {
      e.preventDefault();
      const isOpen = this.detailsParent.open;
      if (isOpen) {
        this.renderBodyScrollable(true)
        await this.closeMenu();
      } else {
        this.openMenu(e);
      }
    });

    this.subDetails.forEach(subDetail => {
      subDetail.firstElementChild.addEventListener('click', e => {
        e.preventDefault();
        this.openSubMenu(subDetail);
      });

      subDetail.querySelector('h3').addEventListener('click', e => {
        this.closeSubMenu(subDetail);
      });
      subDetail.querySelector('h3').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        this.closeSubMenu(subDetail);
      });
    });

    document.addEventListener('PredictiveSearchClose', async () => {
      this.cartButton.classList.replace('translate-y-0', 'translate-y-1/2');
      this.body.classList.remove('overflow-hidden');
      await waitAnimEnd(this.cartButton);
      this.cartButton.setAttribute('aria-hidden', 'false');
    });
    document.addEventListener('PredictiveSearchOpen', async () => {
      this.renderBodyScrollable(false);
      this.closeMenu();
      this.reveal();
      this.cartButton.classList.replace('translate-y-1/2', 'translate-y-0');
      await waitAnimEnd(this.cartButton);
      this.cartButton.setAttribute('aria-hidden', 'true');
    });

    this.cartButton.addEventListener('click', () => {
      this.renderBodyScrollable(false);
      this.closeMenu();
      this.setOverlayAboveHeader(true)
      document.dispatchEvent(new CustomEvent('openCartDrawer'));
    });
    document.addEventListener('CartDrawerClose', () => {
      this.renderBodyScrollable(true);
      this.setOverlayAboveHeader(false);
    })

    this.addEventListener('keydown', e => trapFocus(e, this.firstFocusableElement, this.lastFocusableElement));
    this.hideHeaderOnScrollUp = () => (this.preventReveal = true);
    this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
    window.addEventListener('scroll', this.onScroll, false);
    this.addEventListener('keyup', evt => {
      if (evt.code === 'Escape') {
        this.renderBodyScrollable(true);
        this.closeMenu();
      }
    });
    this.measureFixHeaderHeight();
  }

  closeMenu = async () => {
    if (!this.detailsParent.open) return;
    this.menuOpener.firstElementChild.querySelector('svg').classList.replace('rotate-180', 'rotate-0');
    this.classList.add('shadow-3xl');
    this.switchMobileMenuLogo(true);
    if (!this.overlay.classList.contains('hidden')) this.overlay.classList.add('hidden');
    this.menu.classList.replace('open-nav', 'close-nav');
    await waitAnimEnd(this.menu);
    this.detailsParent.open = false;
    this.resetMenuDisplay();
  };

  closeSubMenu = async subDetails => {
    const subMenu = subDetails?.firstElementChild.nextElementSibling;
    subMenu?.classList.replace('translate-x-0', 'translate-x-full');
    this.changeParentLinkFocusable(true);
    await waitAnimEnd(subMenu);
    if (subDetails) subDetails.open = false;
  };

  resetMenuDisplay = () => {
    this.closeSubMenu(this.subMenuOpen);
  };

  switchMobileMenuLogo(showBurger) {
    const burger = this.menuOpener.querySelector('.mobile-menu').querySelector('.hamburger');
    const close = this.menuOpener.querySelector('.mobile-menu').querySelector('.close');
    close.classList.toggle('hidden', showBurger);
    close.setAttribute('aria-hidden', '' + showBurger);
    burger.classList.toggle('hidden', !showBurger);
    burger.setAttribute('aria-hidden', '' + !showBurger);
  }

  changeParentLinkFocusable(focusable) {
    const tabIndexNum = focusable ? '0' : '-1';
    this.menuFirstLis.forEach(li => {
      if (li.firstElementChild.nodeName === 'DETAILS') {
        if (focusable) li.firstElementChild.removeAttribute('tabindex');
        else li.firstElementChild.setAttribute('tabindex', '-1');
      } else {
        li.setAttribute('tabindex', tabIndexNum);
      }
    });
  }

  hideSubCollection = e => {
    e.target.closest('details').open = false;
  };

  openMenu = () => {
    if (this.detailsParent.open) return;
    this.detailsParent.open = true;
    this.menu.classList.replace('close-nav', 'open-nav');
    this.classList.remove('shadow-3xl');
    this.menuOpener.firstElementChild.querySelector('svg').classList.replace('rotate-0', 'rotate-180');
    this.body.classList.add('overflow-hidden');
    this.switchMobileMenuLogo(false);
    if (this.overlay.classList.contains('hidden')) this.overlay.classList.remove('hidden');
    this.elemToFocus = this.elemToFocus || this.menu.querySelector('[tabindex="0"]');
    this.elemToFocus.focus();
  };

  openSubMenu = subDetails => {
    const subMenu = subDetails.firstElementChild.nextElementSibling;
    subDetails.open = true;
    subMenu.classList.replace('translate-x-full', 'translate-x-0');
    this.changeParentLinkFocusable(false);
    this.subMenuOpen = subDetails;
  };

  measureFixHeaderHeight() {
    this.headerBounds.bottom = this.header.offsetHeight;
  }

  onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (this.predictiveSearch && this.predictiveSearch.getAttribute('aria-hidden') === 'false') return;

    if (scrollTop < this.headerBounds.bottom) {
      requestAnimationFrame(this.reveal);
    } else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight) {
      requestAnimationFrame(this.hide);
    } else if (scrollTop > this.currentScrollTop) {
      if (!this.preventHide) {
        requestAnimationFrame(this.hide);
      } else {
        window.clearTimeout(this.isScrollingDown);

        this.isScrollingDown = setTimeout(() => {
          this.preventHide = false;
        }, 33);
      }
    } else if (scrollTop < this.currentScrollTop) {
      if (!this.preventReveal) {
        requestAnimationFrame(this.reveal);
      } else {
        window.clearTimeout(this.isScrollingUp);

        this.isScrollingUp = setTimeout(() => {
          this.preventReveal = false;
        }, 33);
      }
    }

    this.currentScrollTop = scrollTop;
  };

  hide = () => {
    if (this.isHide) return;
    this.closeMenu(true);
    this.header.classList.replace('translate-y-0', '-translate-y-full');
    this.cartButton.classList.replace('translate-y-1/2', 'translate-y-0');
    this.preventReveal = true;
    this.isHide = true;
  };

  reveal = () => {
    if (!this.isHide) return;
    this.header.classList.replace('-translate-y-full', 'translate-y-0');
    this.cartButton.classList.replace('translate-y-0', 'translate-y-1/2');
    this.preventHide = true;
    this.isHide = false;
  };

  renderBodyScrollable = (bool) => {
    this.body.classList.toggle('overflow-hidden', !bool);
  }

  setOverlayAboveHeader = (bool) => {
    this.wrapperOverlay = this.wrapperOverlay || document.getElementById('wrapper-overlay');
    this.wrapperOverlay.classList.toggle('relative', !bool);
    this.overlay.classList.toggle('z-40', bool);
  }
}
customElements.define('sticky-header', StickyHeader);

class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.cachedResults = {};
    this.input = this.querySelector('input[type="text"]');
    this.predictiveSearchResults = this.querySelector('[data-predictive-search]');
    this.overlay = document.getElementById('overlay-content');
    this.isOpen = false;
    this.StickyHeader = document.querySelector('sticky-header');
    this.deleteButton = this.querySelector('.delete');
    this.closeButton = this.querySelector('.close');
    this.openLoup = document.getElementById('open-search-loup');
    this.body = document.body;
    this.setupEventListeners();
  }

  setupEventListeners() { 
    const form = this.querySelector('form');
    form.addEventListener('submit', this.onFormSubmit.bind(this));

    this.input.addEventListener('input', e => {
      debounce(event => {
        this.onChange(event);
      }, 300)();

      this.changeLogo(e);
    });
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    document.addEventListener('overlayClick', this.close);
    this.openLoup?.addEventListener('click', this.open);
    this.overlay.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('overlayClick'));
    });
    this.deleteButton.addEventListener('click', () => {
      this.input.value = '';
      this.input.focus();
    });
    this.addEventListener('keyup', evt => evt.code === 'Escape' && this.close());
    this.closeButton.addEventListener('keyup', evt => evt.code === 'Enter' && this.close());
    this.addEventListener('keydown', e => trapFocus(e, this.input, this.closeButton));
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange = () => {
    const searchTerm = this.getQuery();
    if (!searchTerm.length) {
      this.closeList(true);
      this.classList.remove('bg-gradient-to-r', 'from-cyan-200', 'to-blue-200');
      return;
    }

    this.classList.add('bg-gradient-to-r', 'from-cyan-200', 'to-blue-200');
    this.getSearchResults(searchTerm);
  };

  onFormSubmit(event) {
    if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) event.preventDefault();
  }

  onFocus() {
    const searchTerm = this.getQuery();

    if (!searchTerm.length) return;

    if (this.getAttribute('results') === 'true') {
      this.openList();
    } else {
      this.getSearchResults(searchTerm);
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.closeList();
    });
  }

  changeLogo(e) {
    this.loupLogo = this.loupLogo || this.querySelector('.loup');
    const isClose = e.target.value.length;

    this.loupLogo.classList.toggle('opacity-0', isClose);
    this.loupLogo.classList.toggle('-translate-x-full', isClose);
    this.loupLogo.disabled = isClose;
    this.deleteButton.classList.toggle('opacity-0', !isClose);
    this.deleteButton.classList.toggle('translate-x-full', !isClose);
    this.deleteButton.disabled = !isClose;
  }

  switchOption(direction) {
    if (!this.getAttribute('open')) return;

    const moveUp = direction === 'up';
    const selectedElement = this.querySelector('[aria-selected="true"]');
    const allElements = this.querySelectorAll('li');
    let activeElement = this.querySelector('li');

    if (moveUp && !selectedElement) return;

    this.statusElement.textContent = '';

    if (!moveUp && selectedElement) {
      activeElement = selectedElement.nextElementSibling || allElements[0];
    } else if (moveUp) {
      activeElement = selectedElement.previousElementSibling || allElements[allElements.length - 1];
    }

    if (activeElement === selectedElement) return;

    activeElement.setAttribute('aria-selected', true);
    if (selectedElement) selectedElement.setAttribute('aria-selected', false);

    this.setLiveRegionText(activeElement.textContent);
    this.input.setAttribute('aria-activedescendant', activeElement.id);
  }

  selectOption() {
    const selectedProduct = this.querySelector('[aria-selected="true"] a, [aria-selected="true"] button');

    if (selectedProduct) selectedProduct.click();
  }

  getSearchResults = searchTerm => {
    const queryKey = searchTerm.replace(' ', '-').toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(`${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&${encodeURIComponent('resources[type]')}=product&${encodeURIComponent('resources[limit]')}=4&section_id=tw-predictive-search-results`)
      .then(response => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.closeList();
          throw error;
        }

        return response.text();
      })
      .then(text => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-tw-predictive-search-results').innerHTML;
        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch(error => {
        this.closeList();
        throw error;
      });
  };

  setLiveRegionLoadingState() {
    this.statusElement = this.statusElement || this.querySelector('.predictive-search-status');
    this.loadingText = this.loadingText || this.getAttribute('data-loading-text');

    this.setLiveRegionText(this.loadingText);
    this.setAttribute('loading', true);
  }

  setLiveRegionText(statusText) {
    this.statusElement.setAttribute('aria-hidden', 'false');
    this.statusElement.textContent = statusText;

    setTimeout(() => {
      this.statusElement.setAttribute('aria-hidden', 'true');
    }, 1000);
  }

  renderSearchResults(resultsMarkup) {
    this.predictiveSearchResults.innerHTML = resultsMarkup;
    this.setAttribute('results', true);

    this.setLiveRegionResults();
    this.openList();
  }

  setLiveRegionResults() {
    this.removeAttribute('loading');
    this.setLiveRegionText(this.querySelector('[data-predictive-search-live-region-count-value]').textContent);
  }

  openList() {
    this.setAttribute('open', true);
    this.input.setAttribute('aria-expanded', true);
    this.isOpen = true;
    this.predictiveSearchResults.classList.remove('hidden');
  }

  closeList(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = '';
      this.removeAttribute('results');
    }

    const selected = this.querySelector('[aria-selected="true"]');
    if (selected) selected.setAttribute('aria-selected', false);

    this.input.setAttribute('aria-activedescendant', '');
    this.removeAttribute('open');
    this.input.setAttribute('aria-expanded', false);
    this.isOpen = false;
    this.predictiveSearchResults.classList.add('hidden');
  }

  open = () => {
    document.dispatchEvent(new CustomEvent('PredictiveSearchOpen'));
    this.overlay.classList.remove('hidden');
    this.input.removeAttribute('tabindex');
    this.closeButton.removeAttribute('tabindex');
    const results = this.querySelector('.predictive-search-results')?.children ?? [];
    Array.from(results).forEach(result => {
      result.firstElementChild?.removeAttribute('tabindex');
    });
    this.classList.replace('-translate-y-full', 'translate-y-0');
    this.setAttribute('aria-hidden', 'false');
    this.classList.remove('pointer-events-none');
    this.input.focus();
  };

  close = () => {
    document.dispatchEvent(new CustomEvent('PredictiveSearchClose'));
    this.classList.replace('translate-y-0', '-translate-y-full');
    this.setAttribute('aria-hidden', 'true');
    this.classList.add('pointer-events-none');
    if (!this.overlay.classList.contains('hidden')) this.overlay.classList.add('hidden');
    const results = Array.from(this.querySelector('.predictive-search-results')?.children ?? []);
    results.forEach(result => {
      result.firstElementChild?.setAttribute('tabindex', '-1');
    });
    this.input.setAttribute('tabindex', '-1');
    this.openLoup.focus();
  };
}
customElements.define('predictive-search', PredictiveSearch);

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.cartDrawer = this.parentElement;
    this.overlay = document.getElementById('overlay-content');
    const focusableElements = 'button, [href]';
    this.focusableElementList = this.querySelectorAll(focusableElements);
    this.firstFocusableElement = this.focusableElementList[0];
    this.lastFocusableElement = this.focusableElementList[this.focusableElementList.length - 1];
    this.closeButton = this.querySelector('.close');
    this.cartButton = document.querySelector('#cart-button');
    this.body = document.body;
    this.minusButton = document.querySelector('[name="minus"]');
    this.plusButton = document.querySelector('[name="plus"]');
  }

  connectedCallback() {
    this.addEventListener('keydown', e => trapFocus(e, this.firstFocusableElement, this.lastFocusableElement));
    this.addEventListener('keyup', evt => evt.code === 'Escape' && this.close());
    document.addEventListener('openCartDrawer', this.open);
    this.closeButton.addEventListener('click', this.close);
    document.addEventListener('overlayClick', this.close);
  }

  open = () => {
    this.focusableElementList.forEach(elem => elem.setAttribute('tabindex', '0'));
    this.overlay.classList.remove('hidden');
    this.cartDrawer.classList.replace('translate-x-full', 'translate-x-0');
    this.body.classList.add('overflow-hidden');
    this.setAttribute('aria-expanded', 'true');
    this.firstFocusableElement.focus();
  };

  close = () => {
    document.dispatchEvent(new CustomEvent('CartDrawerClose'));
    this.focusableElementList.forEach(elem => elem.setAttribute('tabindex', '-1'));
    this.overlay.classList.add('hidden');
    this.cartDrawer.classList.replace('translate-x-0', 'translate-x-full');
    this.body.classList.remove('overflow-hidden');
    this.setAttribute('aria-expanded', 'false');
    this.cartButton.focus();
  };

  trapFocus = e => {
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

  // renderContents(parsedState) {
  //   this.classList.contains('is-empty') && this.classList.remove('is-empty');
  //   this.productId = parsedState.id;
  //   this.getSectionsToRender().forEach(section => {
  //     const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
  //     sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
  //   });

  //   setTimeout(() => {
  //     this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
  //     this.open();
  //   });
  // }

  // getSectionInnerHTML(html, selector = '.shopify-section') {
  //   return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  // }

  // getSectionsToRender() {
  //   return [
  //     {
  //       id: 'cart-drawer',
  //       selector: '#CartDrawer',
  //     },
  //     {
  //       id: 'cart-icon-bubble',
  //     },
  //   ];
  // }

  // getSectionDOM(html, selector = '.shopify-section') {
  //   return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  // }

  // setActiveElement(element) {
  //   this.activeElement = element;
  // }
}
customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends HTMLElement {
  // getSectionsToRender() {
  //   return [
  //     {
  //       id: 'CartDrawer',
  //       section: 'cart-drawer',
  //       selector: '.drawer__inner',
  //     },
  //     {
  //       id: 'cart-icon-bubble',
  //       section: 'cart-icon-bubble',
  //       selector: '.shopify-section',
  //     },
  //   ];
  // }
}
customElements.define('cart-drawer-items', CartDrawerItems);

class CartItems extends HTMLElement {
  // constructor() {
  //   super();
  //   this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');
  //   this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]')).reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);
  //   this.debouncedOnChange = debounce(event => {
  //     this.onChange(event);
  //   }, 300);
  //   this.addEventListener('change', this.debouncedOnChange.bind(this));
  // }
  // onChange(event) {
  //   this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  // }
  // getSectionsToRender() {
  //   return [
  //     {
  //       id: 'main-cart-items',
  //       section: document.getElementById('main-cart-items').dataset.id,
  //       selector: '.js-contents',
  //     },
  //     {
  //       id: 'cart-icon-bubble',
  //       section: 'cart-icon-bubble',
  //       selector: '.shopify-section',
  //     },
  //     {
  //       id: 'cart-live-region-text',
  //       section: 'cart-live-region-text',
  //       selector: '.shopify-section',
  //     },
  //     {
  //       id: 'main-cart-footer',
  //       section: document.getElementById('main-cart-footer')?.dataset.id,
  //       selector: '.js-contents',
  //     },
  //   ];
  // }
  // updateQuantity(line, quantity, name) {
  //   this.enableLoading(line);
  //   const body = JSON.stringify({
  //     line,
  //     quantity,
  //     sections: this.getSectionsToRender().map(section => section.section),
  //     sections_url: window.location.pathname,
  //   });
  //   fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
  //     .then(response => {
  //       return response.text();
  //     })
  //     .then(state => {
  //       const parsedState = JSON.parse(state);
  //       this.classList.toggle('is-empty', parsedState.item_count === 0);
  //       const cartDrawerWrapper = document.querySelector('cart-drawer');
  //       const cartFooter = document.getElementById('main-cart-footer');
  //       if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
  //       if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);
  //       this.getSectionsToRender().forEach(section => {
  //         if (section.id === 'cart-icon-bubble') {
  //           document.querySelectorAll('.header').forEach(header => {
  //             const elementToReplace = header.querySelector(`#${section.id}`);
  //             if (!elementToReplace) return;
  //             elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
  //           });
  //         } else {
  //           const elementToReplace = document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
  //           if (!elementToReplace) return;
  //           elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
  //         }
  //       });
  //       this.updateLiveRegions(line, parsedState.item_count);
  //       const lineItem = document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
  //       if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
  //         cartDrawerWrapper ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`)) : lineItem.querySelector(`[name="${name}"]`).focus();
  //       } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
  //         trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
  //       } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
  //         trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
  //       }
  //       this.disableLoading();
  //     })
  //     .catch((e) => {
  //       this.querySelectorAll('.loading-overlay').forEach(overlay => overlay.classList.add('hidden'));
  //       const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
  //       errors.textContent = window.cartStrings.error;
  //       this.disableLoading();
  //     });
  // }
  // updateLiveRegions(line, itemCount) {
  //   if (this.currentItemCount === itemCount) {
  //     const lineItemError = document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
  //     const quantityElement = document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
  //     lineItemError.querySelector('.cart-item__error-text').innerHTML = window.cartStrings.quantityError.replace('[quantity]', quantityElement.value);
  //   }
  //   this.currentItemCount = itemCount;
  //   this.lineItemStatusElement.setAttribute('aria-hidden', true);
  //   const cartStatus = document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
  //   cartStatus.setAttribute('aria-hidden', false);
  //   setTimeout(() => {
  //     cartStatus.setAttribute('aria-hidden', true);
  //   }, 1000);
  // }
  // getSectionInnerHTML(html, selector) {
  //   return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  // }
  // enableLoading(line) {
  //   const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
  //   mainCartItems.classList.add('cart__items--disabled');
  //   const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
  //   const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading-overlay`);
  //   [...cartItemElements, ...cartDrawerItemElements].forEach(overlay => overlay.classList.remove('hidden'));
  //   document.activeElement.blur();
  //   this.lineItemStatusElement.setAttribute('aria-hidden', false);
  // }
  // disableLoading() {
  //   const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
  //   mainCartItems.classList.remove('cart__items--disabled');
  // }
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
  }
  
  connectedCallback() {
    this.querySelectorAll('button').forEach(button => button.addEventListener('click', this.onButtonClick));
  }

  onButtonClick = (e) =>  {
    const previousValue = Number(this.input.value);
    if(e.target.name === 'plus') this.input.value = previousValue + 1;
    else if(e.target.name === 'minus' && previousValue > 0) this.input.value = previousValue - 1;
    // if (previousValue != this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}
customElements.define('quantity-input', QuantityInput);

class CartRemoveButton extends HTMLElement {
  //  connectedCallback() {
  //   this.addEventListener('click', () => {
  //     const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
  //     cartItems.updateQuantity(this.dataset.index, 0);
  //   });
  // }
}
customElements.define('cart-remove-button', CartRemoveButton);
