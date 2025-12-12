class StickyHeader extends HTMLElement {
  constructor() {
    super();
    this.menuOpener = this.querySelector('.menu-opener');
    this.detailsParent = this.menuOpener.parentNode;
    this.menu = this.menuOpener.nextElementSibling;
    this.menuOpenTopElem = this.menu.querySelector('ul');
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
    this.lastFocusableElement = this.querySelector(
      'nav ul:last-of-type li:last-of-type span:last-of-type',
    );
    this.menuOpenTopElemHeight = this.menuOpenTopElem.offsetHeight;
    this.desktopUpperNavLis = this.querySelectorAll('#desktop-upper-nav > li');
  }

  connectedCallback() {
    document.addEventListener('overlayClick', async (e) => {
      if (!this.detailsParent.contains(e.target) && this.detailsParent.open) {
        this.renderBodyScrollable(true);
        await this.closeMobileMenu();
      }
    });

    this.menuOpener.addEventListener('click', async (e) => {
      e.preventDefault();
      const isOpen = this.detailsParent.open;
      if (isOpen) {
        this.renderBodyScrollable(true);
        await this.closeMobileMenu();
      } else {
        this.openMobileMenu(e);
      }
    });

    this.desktopUpperNavLis.forEach((li) => {
      li.addEventListener('mouseenter', (e) => {
        const ul = e.target.querySelector('ul');
        if (!ul) return
        this.openDesktopMenu(ul);
      });
      li.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') {
          this.closeDesktopMenu(e.target.closest('ul[role="menu"]'));
        }

        const ul = e.target.querySelector('ul');
        if (!ul) return;

        if (e.key === 'Enter') {
          this.openDesktopMenu(ul);
        }

        ul.querySelector('li.last-elem')?.addEventListener(
          'keydown',
          this.closeDesktopMenuWithKeyboard,
        );
        ul.querySelector('li.first-elem')?.addEventListener(
          'keydown',
          this.closeDesktopMenuWithKeyboard,
        );
      });

      li.addEventListener('mouseleave', (e) => {
        this.closeDesktopMenu(e.target.querySelector('ul'));
      });
    });

    this.subDetails.forEach((subDetail) => {
      // Only add submenu behavior to navigation submenus, not other details elements (e.g. localization)
      if (!subDetail.classList.contains('js-nav-submenu')) return;

      subDetail.firstElementChild.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSubMenu(subDetail);
      });

      const h3 = subDetail.querySelector('h3');
      if (h3) {
        h3.addEventListener('click', (e) => {
          this.closeSubMenu(subDetail);
        });
        h3.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          this.closeSubMenu(subDetail);
        });
      }
    });

    document.addEventListener('PredictiveSearchClose', async () => {
      this.cartButton?.classList.replace('translate-y-0', 'translate-y-1/2');
      this.body.classList.remove('overflow-hidden');
      await waitAnimEnd(this.cartButton);
      this.cartButton.setAttribute('aria-hidden', 'false');
    });
    document.addEventListener('PredictiveSearchOpen', async () => {
      this.renderBodyScrollable(false);
      this.closeMobileMenu();
      this.reveal();
      this.cartButton?.classList.replace('translate-y-1/2', 'translate-y-0');
      await waitAnimEnd(this.cartButton);
      this.cartButton.setAttribute('aria-hidden', 'true');
    });

    this.cartButton?.addEventListener('click', () => {
      this.renderBodyScrollable(false);
      this.closeMobileMenu();
      this.setOverlayAboveHeader(true);
      document.dispatchEvent(new CustomEvent('openCartDrawer'));
    });
    document.addEventListener('CartDrawerClose', () => {
      this.renderBodyScrollable(true);
      this.setOverlayAboveHeader(false);
    });

    this.addEventListener('keydown', (e) =>
      trapFocus(e, this.firstFocusableElement, this.lastFocusableElement),
    );
    this.hideHeaderOnScrollUp = () => (this.preventReveal = true);
    this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
    window.addEventListener('scroll', this.onScroll, false);
    this.addEventListener('keyup', (evt) => {
      if (evt.code === 'Escape') {
        this.renderBodyScrollable(true);
        this.closeMobileMenu();
      }
    });
    this.measureFixHeaderHeight();
  }

  closeMobileMenu = async () => {
    if (!this.detailsParent.open) return;
    this.switchMobileMenuLogo(true);
    this.showOverlay(false);
    this.menu.classList.replace('open-nav', 'close-nav');
    await waitAnimEnd(this.menu);
    this.detailsParent.open = false;
    this.resetMenuDisplay();
  };

  closeSubMenu = async (subDetails) => {
    const subMenu = subDetails?.firstElementChild.nextElementSibling;
    subMenu?.classList.replace('translate-x-0', 'translate-x-full');
    this.changeParentLinkFocusable(true);
    await waitAnimEnd(subMenu);
    if (subDetails) subDetails.open = false;
    this.resizeHeaderHeightToFitTopElemMenu();
  };

  resizeHeaderHeightToFitTopElemMenu() {
    this.menuOpenTopElem.style.height = '';
  }

  resetMenuDisplay = () => {
    this.closeSubMenu(this.subMenuOpen);
  };

  switchMobileMenuLogo(showBurger) {
    const burger = this.menuOpener
      .querySelector('.mobile-menu')
      .querySelector('.hamburger');
    const close = this.menuOpener
      .querySelector('.mobile-menu')
      .querySelector('.close');
    close.classList.toggle('hidden', showBurger);
    close.setAttribute('aria-hidden', '' + showBurger);
    burger.classList.toggle('hidden', !showBurger);
    burger.setAttribute('aria-hidden', '' + !showBurger);
  }

  changeParentLinkFocusable(focusable) {
    const tabIndexNum = focusable ? '0' : '-1';
    this.menuFirstLis.forEach((li) => {
      if (li.firstElementChild && li.firstElementChild.nodeName === 'DETAILS') {
        if (focusable) li.firstElementChild.removeAttribute('tabindex');
        else li.firstElementChild.setAttribute('tabindex', '-1');
      } else {
        li.setAttribute('tabindex', tabIndexNum);
      }
    });
  }

  hideSubCollection = (e) => {
    e.target.closest('details').open = false;
  };

  openMobileMenu = () => {
    if (this.detailsParent.open) return;
    this.detailsParent.open = true;
    this.menu.classList.replace('close-nav', 'open-nav');
    this.body.classList.add('overflow-hidden');
    this.switchMobileMenuLogo(false);
    this.showOverlay(true);
    this.elemToFocus =
      this.elemToFocus || this.menu.querySelector('[tabindex="0"]');
    this.elemToFocus.focus();
  };

  openSubMenu = (subDetails) => {
    const subMenu = subDetails.firstElementChild.nextElementSibling;
    subDetails.open = true;
    subMenu.classList.replace('translate-x-full', 'translate-x-0');
    this.changeParentLinkFocusable(false);
    this.subMenuOpen = subDetails;
    this.resizeHeaderHeightToFitSubmenu(subMenu);
  };

  resizeHeaderHeightToFitSubmenu(subMenu) {
    const subMenuHeightWithoutPadding = Array.from(subMenu.children).reduce(
      (acc, elem) => acc + elem.offsetHeight,
      0,
    );
    var subMenuStyles = window.getComputedStyle(subMenu);
    const subMenuHeight =
      subMenuHeightWithoutPadding +
      parseFloat(subMenuStyles.paddingTop) +
      parseFloat(subMenuStyles.paddingBottom);

    this.menuOpenTopElem.style.height = `${subMenuHeight}px`;
  }

  measureFixHeaderHeight() {
    this.headerBounds.bottom = this.header.offsetHeight;
  }

  onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (
      this.predictiveSearch &&
      this.predictiveSearch.getAttribute('aria-hidden') === 'false'
    )
      return;

    if (scrollTop < this.headerBounds.bottom) {
      requestAnimationFrame(this.reveal);
    } else if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight
    ) {
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
    this.closeMobileMenu(true);
    this.header.classList.replace('translate-y-0', '-translate-y-full');
    this.cartButton?.classList.replace('translate-y-1/2', 'translate-y-0');
    this.preventReveal = true;
    this.isHide = true;
  };

  reveal = () => {
    if (!this.isHide) return;
    this.header.classList.replace('-translate-y-full', 'translate-y-0');
    this.cartButton?.classList.replace('translate-y-0', 'translate-y-1/2');
    this.preventHide = true;
    this.isHide = false;
  };

  renderBodyScrollable = (bool) => {
    this.body.classList.toggle('overflow-hidden', !bool);
  };

  setOverlayAboveHeader = (bool) => {
    this.wrapperOverlay =
      this.wrapperOverlay || document.getElementById('wrapper-overlay');
    this.wrapperOverlay.classList.toggle('relative', !bool);
    this.overlay.classList.toggle('z-40', bool);
  };

  closeDesktopMenu = (ul) => {
    this.showOverlay(false);

    if(!ul) return;
    ul.querySelectorAll('li').forEach((li) => {
      li.tabIndex = '-1';
    });
    ul.classList.replace('grid', 'hidden');
    ul.closest('li')?.setAttribute('aria-expanded', 'false');
  };

  closeDesktopMenuWithKeyboard = (e) => {
    const ul = e.target.closest('ul[role="menu"]');
    const firstLi = ul.querySelector('li.first-elem');
    const lastLi = ul.querySelector('li.last-elem');

    if (e.key === 'Tab') {
      if (e.shiftKey && e.target === firstLi) {
        this.closeDesktopMenu(ul);
      } else if (!e.shiftKey && e.target === lastLi) {
        this.closeDesktopMenu(ul);
      }
    }
    if(e.key === 'Escape') {
      this.closeDesktopMenu(ul);
    }
  };

  openDesktopMenu = (ul) => {
    this.showOverlay(true);

    if(!ul) return;
    ul.classList.replace('hidden', 'grid');
    ul.querySelectorAll('li').forEach((li) => {
      if(li.classList.contains('no-focusable')) return;
      li.tabIndex = '0';
    });
    ul.querySelector('li.first-elem')?.focus();
    ul.closest('li').setAttribute('aria-expanded', 'true');
  };

  showOverlay = (bool) => {
    this.overlay.classList.toggle('hidden', !bool);
    this.overlay.classList.toggle('!block', bool);
    this.closest('header').classList.toggle('shadow-3xl', !bool);
  };
}
customElements.define('sticky-header', StickyHeader);

class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.cachedResults = {};
    this.input = this.querySelector('input[type="text"]');
    this.predictiveSearchResults = this.querySelector(
      '[data-predictive-search]',
    );
    this.overlay = document.getElementById('overlay-content');
    this.isOpen = false;
    this.StickyHeader = document.querySelector('sticky-header');
    this.deleteButton = this.querySelector('.delete');
    this.closeButton = this.querySelector('.close');
    this.openLoup = document.getElementById('open-search-loup');
    this.body = document.body;
    this.setupEventListeners();
    this.isInHeader = this.dataset.isInHeader === 'true';
  }

  setupEventListeners() {
    const form = this.querySelector('form');
    form.addEventListener('submit', this.onFormSubmit.bind(this));

    this.input.addEventListener('input', (e) => {
      debounce((event) => {
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
    this.addEventListener('keyup', (evt) => {
      if (this.isInHeader && evt.code === 'Escape') {
        this.close();
      }
      if (evt.code === 'Enter' && evt.target.id === 'search') form.submit();
    });
    this.closeButton?.addEventListener(
      'keyup',
      (evt) => evt.code === 'Enter' && this.close(),
    );
    this.addEventListener('keydown', (e) => {
      if (!this.isInHeader) return;
      trapFocus(e, this.input, this.closeButton);
    });
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
    if (
      !this.getQuery().length ||
      this.querySelector('[aria-selected="true"] a')
    )
      event.preventDefault();
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
      activeElement =
        selectedElement.previousElementSibling ||
        allElements[allElements.length - 1];
    }

    if (activeElement === selectedElement) return;

    activeElement.setAttribute('aria-selected', true);
    if (selectedElement) selectedElement.setAttribute('aria-selected', false);

    this.setLiveRegionText(activeElement.textContent);
    this.input.setAttribute('aria-activedescendant', activeElement.id);
  }

  selectOption() {
    const selectedProduct = this.querySelector(
      '[aria-selected="true"] a, [aria-selected="true"] button',
    );

    if (selectedProduct) selectedProduct.click();
  }

  getSearchResults = (searchTerm) => {
    const queryKey = searchTerm.replace(' ', '-').toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(
      `${routes.predictive_search_url}?q=${encodeURIComponent(
        searchTerm,
      )}&${encodeURIComponent('resources[type]')}=product&${encodeURIComponent(
        'resources[limit]',
      )}=4&section_id=tw-predictive-search-results`,
    )
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.closeList();
          throw error;
        }

        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector(
            '#shopify-section-tw-predictive-search-results',
          ).innerHTML;
        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        this.closeList();
        throw error;
      });
  };

  setLiveRegionLoadingState() {
    this.statusElement =
      this.statusElement || this.querySelector('.predictive-search-status');
    this.loadingText =
      this.loadingText || this.getAttribute('data-loading-text');

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
    this.setLiveRegionText(
      this.querySelector('[data-predictive-search-live-region-count-value]')
        .textContent,
    );
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
    if (this.isInHeader) {
    }
    document.dispatchEvent(new CustomEvent('PredictiveSearchOpen'));
    this.overlay.classList.remove('hidden');
    this.input.removeAttribute('tabindex');
    this.closeButton.removeAttribute('tabindex');
    const results =
      this.querySelector('.predictive-search-results')?.children ?? [];
    Array.from(results).forEach((result) => {
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
    if (!this.overlay.classList.contains('hidden'))
      this.overlay.classList.add('hidden');
    const results = Array.from(
      this.querySelector('.predictive-search-results')?.children ?? [],
    );
    results.forEach((result) => {
      result.firstElementChild?.setAttribute('tabindex', '-1');
    });
    this.input.setAttribute('tabindex', '-1');
    this.openLoup.focus();
  };
}
customElements.define('predictive-search', PredictiveSearch);

class LocalizationFlag extends HTMLElement {
  connectedCallback() {
    const link = this.querySelector('a');
    if (!link) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();

      if (window.location.pathname.includes('search')) {
        const currentSearch = window.location.search;
        const url = new URL(link.href, window.location.origin);

        const currentParams = new URLSearchParams(currentSearch);
        for (const [key, value] of currentParams.entries()) {
          if (!url.searchParams.has(key)) {
            url.searchParams.set(key, value);
          }
        }

        window.location.href = url.toString();
      } else {
        window.location.href = link.href;
      }
    });
  }
}
customElements.define('localization-flag', LocalizationFlag);
