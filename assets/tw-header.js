class StickyHeader extends HTMLElement {
  constructor() {
    super();
    // Mobile navigation elements
    this.menuOpener = this.querySelector('.menu-opener');
    this.detailsParent = this.menuOpener.parentNode;
    this.menu = this.menuOpener.nextElementSibling;
    this.subDetails = this.menu.querySelectorAll('details');

    // Desktop navigation elements
    this.desktopNavButtons = this.querySelectorAll('.desktop-nav-button');
    this.desktopDropdowns = this.querySelectorAll('.desktop-dropdown');

    // Common elements
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

    // Desktop dropdown state tracking
    this.currentOpenDropdown = null;
    this.dropdownCloseTimeout = null;
    this.preventDropdownOpen = false; // Prevents dropdown from reopening after hamburger click
    this.lastTouchTime = 0; // Track last touch to ignore hover events on touch devices
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
      // Close desktop dropdown if open (for iPad/landscape mode)
      if (this.currentOpenDropdown) {
        this.closeDesktopDropdown();
        this.preventDropdownOpen = true;
        // Reset the flag after a delay for touch devices
        setTimeout(() => {
          this.preventDropdownOpen = false;
        }, 300);
      }

      const isOpen = this.detailsParent.open;
      if (isOpen) {
        this.renderBodyScrollable(true);
        await this.closeMobileMenu();
      } else {
        this.openMobileMenu(e);
      }
    });

    // Desktop navigation hover behavior
    this.desktopNavButtons.forEach((button) => {
      const sectionId = button.dataset.sectionId;
      const dropdown = this.querySelector(`#dropdown-${sectionId}`);

      if (!dropdown) return;

      // Track touch events to distinguish from mouse events
      button.addEventListener('touchstart', () => {
        this.lastTouchTime = Date.now();
      }, { passive: true });

      // Button hover - open dropdown (ignore if recent touch)
      button.addEventListener('mouseenter', () => {
        // Ignore mouseenter if it happened within 500ms of a touch (mobile Safari compatibility)
        if (Date.now() - this.lastTouchTime > 500 && !this.preventDropdownOpen) {
          this.openDesktopDropdown(dropdown, button);
        }
      });

      // Button click - toggle dropdown (important for touch devices)
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentOpenDropdown === dropdown) {
          // If this dropdown is open, close it and prevent reopening on hover
          this.closeDesktopDropdown();
          this.preventDropdownOpen = true;

          // On touch devices, reset the flag after a short delay since mouseleave won't fire
          setTimeout(() => {
            this.preventDropdownOpen = false;
          }, 300);
        } else if (!this.preventDropdownOpen) {
          // If closed and not prevented, open it (for touch devices)
          this.openDesktopDropdown(dropdown, button);
        }
      });

      // Button keyboard support
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleDesktopDropdown(dropdown, button);
        } else if (e.key === 'Escape') {
          this.closeDesktopDropdown();
        }
      });

      // Dropdown hover - keep open
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(this.dropdownCloseTimeout);
      });

      dropdown.addEventListener('mouseleave', () => {
        this.closeDesktopDropdown();
      });

    });

    // Get the header container to reset the prevent flag
    const headerContainer = this.querySelector('.flex.items-center.justify-between');
    if (headerContainer) {
      headerContainer.addEventListener('mouseleave', () => {
        // Reset the prevent flag when mouse leaves the entire header
        this.preventDropdownOpen = false;
      });
    }

    // Special case: if there's only one button, open dropdown on header hover
    if (this.desktopNavButtons.length === 1) {
      const singleButton = this.desktopNavButtons[0];
      const sectionId = singleButton.dataset.sectionId;
      const singleDropdown = this.querySelector(`#dropdown-${sectionId}`);

      if (singleDropdown) {
        if (headerContainer) {
          // Track touches on the header container
          headerContainer.addEventListener('touchstart', () => {
            this.lastTouchTime = Date.now();
          }, { passive: true });

          headerContainer.addEventListener('mouseenter', () => {
            // Ignore mouseenter if it happened within 500ms of a touch
            if (Date.now() - this.lastTouchTime > 500 && !this.preventDropdownOpen) {
              this.openDesktopDropdown(singleDropdown, singleButton);
            }
          });

          headerContainer.addEventListener('mouseleave', () => {
            // Only close if not hovering over the dropdown itself
            this.dropdownCloseTimeout = setTimeout(() => {
              this.closeDesktopDropdown();
            }, 100);
          });
        }
      }
    }

    // Desktop dropdown: Show images on hover of collections, parent items, products, and pages
    this.desktopDropdowns.forEach((dropdown) => {
      const collectionItems = dropdown.querySelectorAll(
        '.desktop-nav-collection-item',
      );
      const parentItems = dropdown.querySelectorAll('.desktop-nav-parent-item');
      const productItems = dropdown.querySelectorAll(
        '.desktop-nav-product-item',
      );
      const pageItems = dropdown.querySelectorAll('.desktop-nav-page-item');
      const defaultImage = dropdown.querySelector('.desktop-nav-default-image');

      // Handle collection_only items
      collectionItems.forEach((collectionItem) => {
        const imageId = collectionItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          collectionItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid');
            });

            // Show this collection's image grid
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('grid');
          });

          collectionItem.addEventListener('mouseleave', () => {
            // Hide collection image grid
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('grid');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });

      // Handle set_of_collections items
      parentItems.forEach((parentItem) => {
        const imageId = parentItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          const dropdownGrid = parentItem.closest('.dropdown-grid');

          parentItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this item's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');

            // Change grid layout to 2 columns
            if (dropdownGrid) {
              dropdownGrid.classList.remove(
                'grid-cols-[200px_1fr]',
                'lg:grid-cols-[280px_1fr]',
              );
              dropdownGrid.classList.add(
                'grid-cols-[1fr_300px]',
                '2md:grid-cols-2',
              );
            }
          });

          parentItem.addEventListener('mouseleave', () => {
            // Hide collection image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }

            // Restore grid layout
            if (dropdownGrid) {
              dropdownGrid.classList.remove(
                'grid-cols-[1fr_300px]',
                '2md:grid-cols-2',
              );
              dropdownGrid.classList.add(
                'grid-cols-[200px_1fr]',
                'lg:grid-cols-[280px_1fr]',
              );
            }
          });
        }
      });

      // Handle product_only items
      productItems.forEach((productItem) => {
        const imageId = productItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          productItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this product's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');
          });

          productItem.addEventListener('mouseleave', () => {
            // Hide product image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });

      // Handle page_only items
      pageItems.forEach((pageItem) => {
        const imageId = pageItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          pageItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this page's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');
          });

          pageItem.addEventListener('mouseleave', () => {
            // Hide page image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });
    });

    this.subDetails.forEach((subDetail) => {
      // Only add submenu behavior to navigation submenus, not other details elements (e.g. localization)
      if (!subDetail.classList.contains('js-nav-submenu')) return;

      // Single-open accordion: close other submenus when one opens
      subDetail.addEventListener('toggle', () => {
        if (subDetail.open) {
          // Close sibling submenus at the same level
          const parent = subDetail.closest('ul');
          parent.querySelectorAll('.js-nav-submenu').forEach((other) => {
            if (other !== subDetail && other.open) {
              other.open = false;
            }
          });
        }
      });
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

    this.addEventListener('keydown', (e) => {
      // Get focusable elements dynamically when mobile menu is open
      if (this.detailsParent.open) {
        const firstFocusable = this.menuOpener;
        const lastFocusable = this.menu.querySelector('.last-focusable') ||
                              this.menu.querySelector('a:last-of-type') ||
                              this.menu.querySelector('button:last-of-type');
        if (firstFocusable && lastFocusable) {
          trapFocus(e, firstFocusable, lastFocusable);
        }
      }
    });
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

    // Handle orientation/resize changes to reset state when switching between mobile/desktop
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Reset dropdown state when switching layouts
        this.preventDropdownOpen = false;
        this.lastTouchTime = 0;

        // Close desktop dropdown if switching to mobile
        if (window.innerWidth < 768) { // md breakpoint
          this.closeDesktopDropdown();
          // Force close mobile menu and reset its state completely
          if (this.detailsParent.open) {
            this.detailsParent.open = false;
            this.switchMobileMenuLogo(true);
            this.menu.classList.remove('open-nav');
            this.menu.classList.add('close-nav');
            this.showOverlay(false);
            this.resetMenuDisplay();
          }
          // Ensure body is scrollable
          this.renderBodyScrollable(true);
        }

        // Close mobile menu if switching to desktop
        if (window.innerWidth >= 768) {
          // Force close mobile menu completely when switching to desktop
          if (this.detailsParent.open) {
            this.detailsParent.open = false;
            this.switchMobileMenuLogo(true);
            this.menu.classList.remove('open-nav');
            this.menu.classList.add('close-nav');
            this.showOverlay(false);
            this.resetMenuDisplay();
          }
          this.renderBodyScrollable(true);
        }
      }, 100);
    });
  }

  closeMobileMenu = async () => {
    // Close desktop dropdown if open
    this.closeDesktopDropdown();

    if (!this.detailsParent.open) return;
    this.switchMobileMenuLogo(true);
    this.showOverlay(false);
    this.menu.classList.replace('open-nav', 'close-nav');
    await waitAnimEnd(this.menu);
    this.detailsParent.open = false;
    this.resetMenuDisplay();
  };

  resetMenuDisplay = () => {
    // Close all open submenus when mobile menu closes
    this.subDetails.forEach((detail) => {
      if (detail.classList.contains('js-nav-submenu')) {
        detail.open = false;
      }
    });
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

  openMobileMenu = () => {
    if (this.detailsParent.open) return;
    this.detailsParent.open = true;
    this.menu.classList.replace('close-nav', 'open-nav');
    this.body.classList.add('overflow-hidden');
    this.switchMobileMenuLogo(false);
    this.showOverlay(true);

    // Focus first link or button in the mobile menu
    const firstFocusable = this.menu.querySelector('a, button');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  };

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
    this.closeDesktopDropdown();
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

  showOverlay = (bool) => {
    this.overlay.classList.toggle('hidden', !bool);
    this.overlay.classList.toggle('!block', bool);
    this.closest('header').classList.toggle('shadow-3xl', !bool);
  };

  openDesktopDropdown = (dropdown, button) => {
    // Close any currently open dropdown
    if (this.currentOpenDropdown && this.currentOpenDropdown !== dropdown) {
      this.closeDesktopDropdown();
    }

    clearTimeout(this.dropdownCloseTimeout);

    // Open new dropdown
    dropdown.classList.remove('hidden');
    dropdown.setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true');

    // Show overlay
    this.showOverlay(true);

    // Prevent body scrolling when dropdown is open
    this.renderBodyScrollable(false);

    // Track current dropdown
    this.currentOpenDropdown = dropdown;

    // Make dropdown items focusable
    dropdown.querySelectorAll('li[tabindex]').forEach((li) => {
      li.setAttribute('tabindex', '0');
    });
  };

  closeDesktopDropdown = () => {
    if (!this.currentOpenDropdown) return;

    const dropdown = this.currentOpenDropdown;
    const button = this.querySelector(`[aria-controls="${dropdown.id}"]`);

    // Hide dropdown
    dropdown.classList.add('hidden');
    dropdown.setAttribute('aria-hidden', 'true');
    if (button) button.setAttribute('aria-expanded', 'false');

    // Hide overlay
    this.showOverlay(false);

    // Re-enable body scrolling
    this.renderBodyScrollable(true);

    // Hide all children panels
    dropdown.querySelectorAll('.desktop-nav-children').forEach((panel) => {
      panel.classList.add('hidden');
    });

    // Remove focusability
    dropdown.querySelectorAll('li[tabindex]').forEach((li) => {
      li.setAttribute('tabindex', '-1');
    });

    this.currentOpenDropdown = null;
  };

  toggleDesktopDropdown = (dropdown, button) => {
    if (this.currentOpenDropdown === dropdown) {
      this.closeDesktopDropdown();
    } else {
      this.openDesktopDropdown(dropdown, button);
    }
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

    // Apply unblur effect to newly loaded images
    if (window.removeSkeletonOnImagesLoad) {
      window.removeSkeletonOnImagesLoad(this.predictiveSearchResults);
    }
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
