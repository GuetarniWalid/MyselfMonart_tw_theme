/*
 * L'en-tête qui suit le doigt, sur la nouvelle page collection (ticket 07 de .scratch/collection-design)
 * ----------------------------------------------------------------------------------------------------------------
 * Un mode de <sticky-header> (plus bas), pris quand <html> porte data-refonte-page (layout/collection.liquid, qui
 * reconnaît la page à sa section). Partout ailleurs, l'en-tête garde son mode de toujours (onScroll : il se cache et
 * revient par ses classes, à des seuils, et se cache en bas de page).
 * - L'en-tête part quand on descend et revient quand on remonte, au rythme du doigt : son décalage (0 : il est là ;
 *   sa hauteur : il est parti) augmente de ce qu'on descend et diminue de ce qu'on remonte, à chaque image, posé en
 *   transform: translateY(), sans transition. Il ne part pas tant que le bandeau d'annonce, au-dessus, se voit.
 * - Sa hauteur, mesurée (et remesurée quand elle change), va sur :root : --tete-h (ce qui prend le focus s'arrête
 *   sous l'en-tête et la ligne, assets/collection-refonte.css).
 * - La ligne des filtres (#barre, ticket 06) se colle juste dessous : --barre-top = hauteur − décalage, puis en haut
 *   de l'écran quand il est parti. Elle porte la classe « collee » quand elle est collée à cette place : son ancre
 *   (#ancre-barre) est passée au-dessus, et la fin de sa section (la grille) ne l'emporte pas encore.
 * - Quand l'en-tête part (plus de 2 px), ses menus se ferment, comme hide() ailleurs, et le menu ouvert de la ligne
 *   (ordinateur) aussi : fermerMenu(), le focus qui était dans la ligne revenant à son bouton.
 * - Un script de la page qui la fait défiler lui-même l'annonce juste avant, sur document : mma:saut-voulu,
 *   { entete: 'reste' | 'revient' } (assets/collection-filtres.js, <infinite-scroll> d'assets/collection.js). Ce saut
 *   ne compte pas comme un geste du doigt : l'en-tête reste où il est, ou revient en entier.
 * - preventHeaderReveal reste respecté : l'en-tête ne revient pas pendant la remontée en cours (33 ms sans remonter
 *   suffisent, comme onScroll). Il revient à l'ouverture de la recherche (reveal()) et quand le focus entre dedans : le
 *   clavier ne va jamais sur un lien caché.
 * - Un seul écouteur de défilement, passif. Chaque image (requestAnimationFrame) lit la mise en page, puis écrit. Le
 *   rebond de Safari, au-delà du haut ou du bas de la page, ne compte pas.
 * Le calcul d'une image est pur, testé sous Node : scripts/tw-header.test.cjs.
 */
class EnteteQuiSuit {
  /* Une image. avant : ce que l'image d'avant a posé, { decalage, y } : le décalage, de 0 (l'en-tête est là) à sa
     hauteur (il est parti), et la position du défilement qu'elle a lue.
     lu : ce que cette image vient de lire, { y, max, hauteur, bandeau, saut, retenu, ancre, fin } : window.scrollY ;
     le défilement le plus bas (scrollHeight − innerHeight) ; la hauteur de l'en-tête ; le bas du bandeau d'annonce,
     dans la page ; un saut voulu (null, 'reste' ou 'revient') ; retenu, après preventHeaderReveal ; et, dans l'écran,
     le haut de l'ancre de la ligne et sa fin, la plus haute place où elle se colle avant que le bas de sa section ne
     l'emporte (null sans ligne).
     Rend { decalage, y, haut, collee, fermer } : le nouveau décalage, la position gardée, la hauteur où la ligne se
     colle, la ligne collée à cette place ou non, et s'il faut fermer les menus. */
  static calculerImage(avant, lu) {
    // Au-delà de ce décalage, l'en-tête est parti : les menus se ferment.
    const PARTI = 2;
    // Le rebond de Safari : au-delà du haut ou du bas de la page, le défilement compte pour 0.
    const y = Math.min(Math.max(0, lu.y), Math.max(0, lu.max));
    let voulu;
    if (lu.saut === 'revient') voulu = 0;
    else if (lu.saut === 'reste') voulu = avant.decalage;
    else voulu = avant.decalage + (lu.retenu ? Math.max(0, y - avant.y) : y - avant.y);
    // Borné entre 0 et sa hauteur ; et jamais plus loin que ce dont il a dépassé le bas du bandeau d'annonce : tant que
    // le bandeau se voit, l'en-tête reste, puis il part avec la page.
    const decalage = Math.min(Math.max(voulu, 0), lu.hauteur, Math.max(0, y - lu.bandeau));
    const haut = lu.hauteur - decalage;
    // Collée : son ancre est passée au-dessus de la hauteur où elle se colle, et le bas de sa section l'y laisse.
    const collee = lu.ancre != null && lu.ancre < haut - 0.5 && lu.fin >= haut - 0.5;
    const fermer = !lu.saut && y !== avant.y && decalage > PARTI;
    return { decalage, y, haut, collee, fermer };
  }

  constructor(stickyHeader) {
    this.stickyHeader = stickyHeader;
    this.header = stickyHeader.header;
    this.annonce = document.getElementById('shopify-section-tw-announcement-bar');
    this.etat = { decalage: 0, y: Math.max(0, window.scrollY) };
    this.hauteur = 0;
    this.remesurer = true;
    this.saut = null;
    this.retenu = false;
    this.retenuJusqua = 0;
    this.prevue = 0;
    // Ce qui est posé, pour n'écrire que ce qui change.
    this.pose = { hauteur: null, transform: '', barre: null, haut: null };

    // L'autre mode le fait glisser par la transition de ses classes ; ici, il suit chaque image.
    this.header.style.transition = 'none';
    window.addEventListener('scroll', this.planifier, { passive: true });
    window.addEventListener('resize', this.remesurerPuisPlanifier);
    if ('ResizeObserver' in window) new ResizeObserver(this.remesurerPuisPlanifier).observe(this.header);
    document.addEventListener('mma:saut-voulu', (e) => {
      this.saut = e.detail && e.detail.entete === 'revient' ? 'revient' : 'reste';
      this.planifier();
    });
    stickyHeader.addEventListener('preventHeaderReveal', () => {
      this.retenu = true;
      this.retenuJusqua = 0;
    });
    this.header.addEventListener('focusin', () => this.revenir());
    this.planifier();
  }

  /* L'en-tête revient en entier : la recherche s'ouvre (reveal() de <sticky-header>), ou le focus entre dedans (le
     navigateur a déjà fait défiler la page vers lui : le mode d'ailleurs le laissait caché, le focus sur un lien
     invisible). */
  revenir() {
    this.saut = 'revient';
    this.planifier();
  }

  planifier = () => {
    if (!this.prevue) this.prevue = window.requestAnimationFrame(this.poserImage);
  };

  remesurerPuisPlanifier = () => {
    this.remesurer = true;
    this.planifier();
  };

  poserImage = (temps) => {
    this.prevue = 0;
    if (this.retenu && this.retenuJusqua && temps > this.retenuJusqua) {
      this.retenu = false;
      this.retenuJusqua = 0;
    }

    // Lire.
    if (this.remesurer) {
      this.hauteur = this.header.getBoundingClientRect().height;
      this.remesurer = false;
    }
    const barre = document.getElementById('barre');
    const ancre = barre && document.getElementById('ancre-barre');
    const y = window.scrollY;
    // Un bandeau caché ne retient rien.
    const bandeau = this.annonce ? this.annonce.getBoundingClientRect() : null;
    const lu = {
      y,
      max: document.documentElement.scrollHeight - window.innerHeight,
      hauteur: this.hauteur,
      bandeau: bandeau && bandeau.height ? bandeau.bottom + y : 0,
      saut: this.saut,
      retenu: this.retenu,
      ancre: ancre ? ancre.getBoundingClientRect().top : null,
      fin: ancre ? this.finDeLigne(barre) : null,
    };
    this.saut = null;
    const suite = EnteteQuiSuit.calculerImage(this.etat, lu);
    // preventHeaderReveal tient tant qu'on remonte, et 33 ms après.
    if (this.retenu && suite.y < this.etat.y) this.retenuJusqua = temps + 33;

    // Écrire.
    if (this.hauteur !== this.pose.hauteur) {
      document.documentElement.style.setProperty('--tete-h', `${this.hauteur}px`);
      this.pose.hauteur = this.hauteur;
    }
    const decalage = this.auPixel(suite.decalage);
    const transform = decalage ? `translateY(${-decalage}px)` : '';
    if (transform !== this.pose.transform) {
      this.header.style.transform = transform;
      this.pose.transform = transform;
    }
    if (barre) {
      const haut = this.auPixel(suite.haut);
      if (barre !== this.pose.barre || haut !== this.pose.haut) {
        barre.style.setProperty('--barre-top', `${haut}px`);
        this.pose.barre = barre;
        this.pose.haut = haut;
      }
      barre.classList.toggle('collee', suite.collee);
    }
    if (suite.fermer) this.fermerLesMenus(barre);
    this.etat = { decalage: suite.decalage, y: suite.y };
  };

  // La fin de la ligne, dans l'écran : la plus haute place où elle se colle avant que le bas de sa section (la grille,
  // où seulement elle se colle) ne l'emporte avec la dernière rangée.
  finDeLigne(barre) {
    const section = barre.parentElement;
    const style = window.getComputedStyle(section);
    return section.getBoundingClientRect().bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) - barre.offsetHeight;
  }

  // L'en-tête part : ses menus se ferment (comme hide() ailleurs), et celui de la ligne des filtres ; le focus qui
  // était dans la ligne revient au bouton du menu.
  fermerLesMenus(barre) {
    this.stickyHeader.closeDesktopDropdown();
    this.stickyHeader.closeMobileMenu();
    if (barre && typeof barre.fermerMenu === 'function') barre.fermerMenu(barre.contains(document.activeElement));
  }

  // Au pixel de l'écran : l'en-tête et la ligne restent nets.
  auPixel(valeur) {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(valeur * ratio) / ratio;
  }
}

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

    // Le bouton du panier reste visible pendant la recherche : il n'est plus caché aux lecteurs d'écran
    // (aria-hidden le laissait atteignable au clavier : jamais de focus sur un bouton caché).
    document.addEventListener('PredictiveSearchClose', () => {
      this.cartButton?.classList.replace('translate-y-0', 'translate-y-1/2');
      this.body.classList.remove('overflow-hidden');
    });
    document.addEventListener('PredictiveSearchOpen', () => {
      this.renderBodyScrollable(false);
      this.closeMobileMenu();
      this.reveal();
      this.cartButton?.classList.replace('translate-y-1/2', 'translate-y-0');
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
    // Sur la nouvelle page collection (<html data-refonte-page>, layout/collection.liquid), l'en-tête suit le doigt
    // (EnteteQuiSuit, en tête de ce fichier ; ticket 07). Partout ailleurs, il se cache et revient par ses classes.
    if (document.documentElement.hasAttribute('data-refonte-page')) {
      this.suivi = new EnteteQuiSuit(this);
    } else {
      window.addEventListener('scroll', this.onScroll, false);
    }
    this.addEventListener('keyup', (evt) => {
      if (evt.code === 'Escape') {
        this.renderBodyScrollable(true);
        this.closeMobileMenu();
      }
    });
    this.measureFixHeaderHeight();
    this.preparerPhotosDuMenu();

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
    // L'en-tête qui suit le doigt revient en entier (la recherche s'ouvre).
    if (this.suivi) {
      this.suivi.revenir();
      return;
    }
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
  };

  /* Les photos du menu d'ordinateur (snippets/tw-sticky-header.liquid) attendent, en loading="lazy" : la page ne les
     demande pas, et au téléphone, où ce menu reste caché, elles ne se chargent jamais. Là où il se montre (dès 768 px,
     md), elles se chargent d'avance, une fois la page chargée et le navigateur au repos : le premier survol les trouve
     prêtes. De même quand il apparaît plus tard (un téléphone ou une tablette qu'on tourne, une fenêtre qu'on élargit).
     Un menu ouvert avant cela n'a rien à demander : le navigateur charge de lui-même les photos qui se montrent, et
     d'abord elles (les demander toutes à l'ouverture les ferait attendre deux à trois fois plus). */
  preparerPhotosDuMenu() {
    const ordinateur = window.matchMedia('(min-width: 768px)');
    const charger = () => {
      this.querySelectorAll('.desktop-dropdown-container img[loading="lazy"]').forEach((image) => {
        image.loading = 'eager';
      });
    };
    const auRepos = () => {
      if (document.readyState !== 'complete' || !ordinateur.matches) return;
      // Safari n'a pas requestIdleCallback.
      if (window.requestIdleCallback) window.requestIdleCallback(charger, { timeout: 2000 });
      else window.setTimeout(charger, 200);
    };
    auRepos();
    window.addEventListener('load', auRepos, { once: true });
    ordinateur.addEventListener('change', auRepos);
  }

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
      )}=10&section_id=tw-predictive-search-results`,
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

    // Dédup jumeaux toile/poster selon le contexte de page, puis coupe à 4.
    const list = this.predictiveSearchResults.querySelector(
      '.predictive-search-results',
    );
    if (list && window.filterCategoryDuplicates) {
      window.filterCategoryDuplicates(list, this.dataset.searchScope || 'toile');
      list.querySelectorAll('li[data-pid]').forEach((el, i) => {
        if (i >= 4) el.remove();
      });
    }

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

/**
 * Déduplique les jumeaux toile/poster (même image, deux fiches liées par le
 * métafield link.painting/link.poster) dans un conteneur de résultats.
 *
 * On ne masque QUE les vrais doublons : une paire dont les deux membres sont
 * présents dans les résultats. Le membre conservé dépend du contexte (scope) :
 *  - scope 'poster' → on garde le poster, on retire la toile jumelle
 *  - scope 'toile'  → on garde la toile, on retire le poster jumeau
 * Les produits sans jumeau visible (orphelins) sont toujours conservés.
 *
 * Chaque élément doit porter : data-pid, data-poster ("1"|"0"), data-twin (id
 * du jumeau ou vide). La détection est pilotée par le lien (peu importe lequel
 * des deux membres le porte).
 *
 * @param {Element} container - conteneur dont on filtre les enfants [data-pid]
 * @param {string} scope - 'poster' | 'toile' (défaut 'toile')
 */
window.filterCategoryDuplicates = function (container, scope) {
  if (!container) return;
  const normScope = scope === 'poster' ? 'poster' : 'toile';
  const items = Array.from(container.querySelectorAll('[data-pid]'));
  if (!items.length) return;

  const byId = new Map();
  items.forEach((el) => byId.set(String(el.dataset.pid), el));

  const toHide = new Set();
  items.forEach((el) => {
    const twin = el.dataset.twin;
    if (!twin || !byId.has(twin)) return; // pas de jumeau visible → on garde
    const isPoster = el.dataset.poster === '1';
    let hideId;
    if (normScope === 'poster') {
      hideId = isPoster ? twin : el.dataset.pid; // retire la toile de la paire
    } else {
      hideId = isPoster ? el.dataset.pid : twin; // retire le poster de la paire
    }
    toHide.add(String(hideId));
  });

  toHide.forEach((pid) => {
    const el = byId.get(pid);
    if (el) el.remove();
  });
};

// Page /search : applique le même filtre anti-doublon à la grille de résultats,
// selon le scope transporté dans l'URL (?ps=poster|toile ; défaut toile).
(function initSearchResultsScope() {
  const grid = document.querySelector('[data-search-results-grid]');
  if (!grid) return;
  const ps = new URLSearchParams(window.location.search).get('ps');
  window.filterCategoryDuplicates(grid, ps === 'poster' ? 'poster' : 'toile');
})();

/**
 * Une entrée du sélecteur de pays du menu mobile (snippets/tw-sticky-header.liquid).
 * Chaque pays est un formulaire de localisation Shopify : Shopify renvoie lui-même vers la
 * page en cours, à son adresse traduite, dans le marché et la devise choisis, recherche
 * comprise. Il n'y a plus d'adresse à fabriquer ici. Le pays actuel reste un lien désactivé
 * sans adresse : un clic dessus ne fait rien.
 */
class LocalizationFlag extends HTMLElement {
  connectedCallback() {
    this.querySelector('a[aria-disabled="true"]')?.addEventListener('click', (e) => e.preventDefault());
  }
}
customElements.define('localization-flag', LocalizationFlag);
