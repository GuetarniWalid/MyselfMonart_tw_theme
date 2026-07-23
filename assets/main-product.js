class MainProductCarousel extends HTMLElement {
  constructor() {
    super();
    this.medias = Array.from(this.querySelectorAll('.img-wrapper'));
    this.currentMediaIndex = 0;
    this.popup = this.querySelector('.popup');
    this.closePopupButton = this.popup.querySelector('button');
    this.carousel = this.querySelector('.carousel');
    this.popupOpen = false;
    this.scrollTimeout = null;
    this.carouselNavigationControls = this.querySelector(
      '#carousel-navigation-controls',
    );
    this.nextMediaButton = this.querySelector('.next');
    this.previousMediaButton = this.querySelector('.previous');
    // Media query for mobile detection (matches Tailwind's 2md breakpoint at 900px)
    this.mobileMediaQuery = window.matchMedia('(max-width: 899px)');
  }

  isMobile() {
    return this.mobileMediaQuery.matches;
  }

  connectedCallback() {
    this.medias.forEach((media, index) => {
      media.addEventListener('click', () => {
        // On desktop, set currentMediaIndex based on clicked image
        if (!this.isMobile()) {
          this.currentMediaIndex = index;
        }
        this.openPopup();
      });
    });

    this.closePopupButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.closePopup();
      }
    });

    this.closePopupButton.addEventListener('click', this.closePopup);
    this.popup.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePopup();
      }
    });

    this.carousel.addEventListener('scroll', () => {
      // Only handle scroll on mobile (carousel mode)
      if (!this.isMobile()) return;
      if (this.scrollTimeout !== null) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        this.imageWidth = this.imageWidth | this.mesureImageWidth();
        this.carouselScrollFromLeft = this.carousel.scrollLeft;
        const diff = Math.round(this.carouselScrollFromLeft / this.imageWidth);
        this.currentMediaIndex = diff;
        this.changeImageCounter();
      }, 100);
    });

    this.nextMediaButton?.addEventListener('click', () => {
      this.displayNextMedia(1);
    });

    this.previousMediaButton?.addEventListener('click', () => {
      this.displayNextMedia(-1);
    });

  }

  displayNextMedia = (diffFromCurrentMedia) => {
    if (
      this.currentMediaIndex + diffFromCurrentMedia < 0 ||
      this.currentMediaIndex + diffFromCurrentMedia > this.medias.length - 1
    )
      return;
    this.scrollToNextMedia(diffFromCurrentMedia);
    this.currentMediaIndex += diffFromCurrentMedia;
  };

  scrollToNextMedia = (diffFromCurrentMedia) => {
    this.imageWidth = this.imageWidth || this.mesureImageWidth();
    const nextPosition = this.imageWidth * diffFromCurrentMedia;
    this.carousel.scrollBy({ left: nextPosition, behavior: 'smooth' });
  };

  mesureImageWidth = () => {
    const imageRect = this.medias[0].getBoundingClientRect();
    return imageRect.width;
  };

  openPopup = () => {
    if (this.medias[this.currentMediaIndex].classList.contains('model-3d'))
      return;
    this.popup.classList.remove('hidden');
    this.popup.setAttribute('aria-modal', 'true');
    this.popupOpen = true;
    this.template =
      this.template || document.getElementById('main-product-popup');
    const clone = this.template.content.cloneNode(true);
    this.popupMediaChild = clone.children[this.currentMediaIndex];
    this.popup.appendChild(this.popupMediaChild);
    // Poster « contour blanc » : si le client est en mode passe-partout, refléter son choix sur le zoom.
    if (window.__applyWhiteBorderSwap) window.__applyWhiteBorderSwap(this.popupMediaChild);
    this.closePopupButton.tabIndex = 0;
    document.body.classList.add('overflow-hidden');
  };

  closePopup = () => {
    this.popup.classList.add('hidden');
    this.popup.setAttribute('aria-modal', 'false');
    this.popupOpen = false;
    this.focus();
    this.popup.removeChild(this.popupMediaChild);
    document.body.classList.remove('overflow-hidden');
  };

  changeImageCounter = () => {
    if (this.medias[this.currentMediaIndex].classList.contains('model-3d')) {
      this.carouselNavigationControls.classList.remove('hidden');
    } else {
      this.carouselNavigationControls.classList.add('hidden');
    }
    this.imageConter = this.imageConter || this.querySelector('.image-counter');
    this.imageConter.textContent = this.currentMediaIndex + 1;
  };
}
customElements.define('main-product-carousel', MainProductCarousel);

// TapestryProductCarousel - extends carousel behavior for tapestry products with cropper integration
class TapestryProductCarousel extends HTMLElement {
  constructor() {
    super();
    // Include both cropper item and regular image wrappers
    this.medias = Array.from(this.querySelectorAll('.img-wrapper, [data-is-cropper]'));
    this.cropperItem = this.querySelector('[data-is-cropper="true"]');
    this.currentMediaIndex = 0;
    this.popup = this.querySelector('.popup');
    this.closePopupButton = this.popup?.querySelector('button');
    this.carousel = this.querySelector('.carousel');
    this.popupOpen = false;
    this.scrollTimeout = null;
    this.carouselNavigationControls = this.querySelector(
      '#carousel-navigation-controls',
    );
    this.nextMediaButton = this.querySelector('.next');
    this.previousMediaButton = this.querySelector('.previous');
    // Media query for mobile detection (matches Tailwind's 2md breakpoint at 900px)
    this.mobileMediaQuery = window.matchMedia('(max-width: 899px)');
  }

  isMobile() {
    return this.mobileMediaQuery.matches;
  }

  connectedCallback() {
    // Attach click handlers ONLY to non-cropper items (cropper should not open popup)
    this.medias.forEach((media, index) => {
      if (media.dataset.isCropper) return; // Skip cropper
      media.addEventListener('click', () => {
        // On desktop, set currentMediaIndex based on clicked image
        if (!this.isMobile()) {
          this.currentMediaIndex = index;
        }
        this.openPopup();
      });
    });

    if (this.closePopupButton) {
      this.closePopupButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.closePopup();
        }
      });

      this.closePopupButton.addEventListener('click', this.closePopup);
    }

    if (this.popup) {
      this.popup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closePopup();
        }
      });
    }

    this.carousel.addEventListener('scroll', () => {
      // Only handle scroll on mobile (carousel mode)
      if (!this.isMobile()) return;
      if (this.scrollTimeout !== null) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        this.imageWidth = this.imageWidth || this.mesureImageWidth();
        this.carouselScrollFromLeft = this.carousel.scrollLeft;
        const diff = Math.round(this.carouselScrollFromLeft / this.imageWidth);
        this.currentMediaIndex = diff;
        this.changeImageCounter();

        // Dispatch event for cropper visibility tracking
        const isCropperVisible = this.currentMediaIndex === 0;
        document.dispatchEvent(new CustomEvent('tapestryCarouselScroll', {
          detail: { isCropperVisible, currentIndex: this.currentMediaIndex }
        }));
      }, 100);
    });

    this.nextMediaButton?.addEventListener('click', () => {
      this.displayNextMedia(1);
    });

    this.previousMediaButton?.addEventListener('click', () => {
      this.displayNextMedia(-1);
    });

    // Setup touch handling to prevent carousel scroll during crop interaction
    this.setupCropperTouchHandling();

    // Auto-scroll to cropper when dimensions change (mobile only)
    document.addEventListener('tapestrySizeChange', () => {
      this.scrollToCropper();
    });
  }

  setupCropperTouchHandling() {
    if (!this.cropperItem) return;

    // Wait for croppr to initialize
    const observer = new MutationObserver((mutations) => {
      const cropprContainer = this.cropperItem.querySelector('.croppr-container');
      if (cropprContainer) {
        observer.disconnect();
        this.attachCropperTouchListeners(cropprContainer);
      }
    });

    observer.observe(this.cropperItem, { childList: true, subtree: true });

    // Also check if already initialized
    const existingCropprContainer = this.cropperItem.querySelector('.croppr-container');
    if (existingCropprContainer) {
      observer.disconnect();
      this.attachCropperTouchListeners(existingCropprContainer);
    }
  }

  attachCropperTouchListeners(cropprContainer) {
    // Prevent carousel scroll when interacting with cropper region or handles
    const interactiveElements = cropprContainer.querySelectorAll('.croppr-region, .croppr-handle, .croppr-overlay');

    interactiveElements.forEach(el => {
      el.addEventListener('touchstart', (e) => {
        // Temporarily disable snap scrolling
        this.carousel.style.scrollSnapType = 'none';
        this.carousel.style.overflowX = 'hidden';
      }, { passive: true });
    });

    // Re-enable snap scrolling after crop interaction ends
    document.addEventListener('touchend', () => {
      // Small delay to ensure crop action completes
      setTimeout(() => {
        if (this.carousel) {
          this.carousel.style.scrollSnapType = '';
          this.carousel.style.overflowX = '';
        }
      }, 100);
    });
  }

  scrollToCropper() {
    // Only scroll on mobile
    if (!this.isMobile()) return;

    // Only scroll if not already at cropper
    if (this.currentMediaIndex === 0) return;

    // Scroll to beginning (cropper is at index 0)
    this.carousel.scrollTo({ left: 0, behavior: 'smooth' });
    this.currentMediaIndex = 0;
    this.changeImageCounter();
  }

  displayNextMedia = (diffFromCurrentMedia) => {
    if (
      this.currentMediaIndex + diffFromCurrentMedia < 0 ||
      this.currentMediaIndex + diffFromCurrentMedia > this.medias.length - 1
    )
      return;
    this.scrollToNextMedia(diffFromCurrentMedia);
    this.currentMediaIndex += diffFromCurrentMedia;
  };

  scrollToNextMedia = (diffFromCurrentMedia) => {
    this.imageWidth = this.imageWidth || this.mesureImageWidth();
    const nextPosition = this.imageWidth * diffFromCurrentMedia;
    this.carousel.scrollBy({ left: nextPosition, behavior: 'smooth' });
  };

  mesureImageWidth = () => {
    const firstMedia = this.medias[0];
    if (!firstMedia) return 300; // fallback
    const imageRect = firstMedia.getBoundingClientRect();
    return imageRect.width;
  };

  openPopup = () => {
    // Skip if current item is cropper (index 0)
    if (this.currentMediaIndex === 0) return;

    // Skip if no popup element
    if (!this.popup) return;

    this.popup.classList.remove('hidden');
    this.popup.setAttribute('aria-modal', 'true');
    this.popupOpen = true;
    this.template =
      this.template || document.getElementById('main-product-popup');
    const clone = this.template.content.cloneNode(true);

    // Adjust popup index (popup doesn't include cropper, so subtract 1)
    const popupIndex = this.currentMediaIndex - 1;
    this.popupMediaChild = clone.children[popupIndex];

    if (this.popupMediaChild) {
      this.popup.appendChild(this.popupMediaChild);
      if (this.closePopupButton) {
        this.closePopupButton.tabIndex = 0;
      }
      document.body.classList.add('overflow-hidden');
    }
  };

  closePopup = () => {
    if (!this.popup) return;

    this.popup.classList.add('hidden');
    this.popup.setAttribute('aria-modal', 'false');
    this.popupOpen = false;
    this.focus();
    if (this.popupMediaChild && this.popup.contains(this.popupMediaChild)) {
      this.popup.removeChild(this.popupMediaChild);
    }
    document.body.classList.remove('overflow-hidden');
  };

  changeImageCounter = () => {
    if (this.carouselNavigationControls) {
      this.carouselNavigationControls.classList.add('hidden');
    }
    this.imageCounter = this.imageCounter || this.querySelector('.image-counter');
    if (this.imageCounter) {
      this.imageCounter.textContent = this.currentMediaIndex + 1;
    }
  };
}
customElements.define('tapestry-product-carousel', TapestryProductCarousel);

class PopupImage extends HTMLElement {
  constructor() {
    super();
    this.popup = this.closest('.popup');
    this.closePopupButton = this.popup.querySelector('button');
  }
  connectedCallback() {
    this.popup.focus();
    this.popup.addEventListener('keydown', (e) =>
      trapFocus(e, this.closePopupButton),
    );

    // Apply unblur effect to popup images (cloned from template)
    if (window.removeSkeletonOnImagesLoad) {
      window.removeSkeletonOnImagesLoad(this);
    }
  }
}
customElements.define('popup-image', PopupImage);

const CollapsibleTab = customElements.get('collapsible-tab');
class MainProductBlocks extends CollapsibleTab {
  constructor() {
    super();
    this.buttonTemplate = document.getElementById('float-buy-button');
    this.blockBuyButton = this.querySelector('.buy-button');
    this.hasButtonBeenShown = false;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.buttonTemplate) {
      this.initObserver(this.section);
    }

    if (this.blockBuyButton) {
      this.blockBuyButton.addEventListener('click', (e) => {
        if (this.querySelector('#addonsDrawer')) this.onAddonsBuyButtonClick();
        else this.onBuyButtonClick(e);
      });
    }
  }

  initObserver = (observed) => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0,
    };

    let isFirstCallback = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === observed) {
          if (entry.isIntersecting) {
            this.hideBuyButton();
          } else if (!isFirstCallback) {
            this.showBuyButton();
          }
        }
      });

      isFirstCallback = false;
    }, options);

    observer.observe(observed);
  };

  hideBuyButton = () => {
    this.buyButton =
      this.buyButton || document.body.querySelector('.float-buy-button');
    this.buyButton?.classList.add('hidden');
  };

  showBuyButton = () => {
    this.buyButton =
      this.buyButton || document.body.querySelector('.float-buy-button');
    if (!this.buyButton) {
      this.createBuyButton();
      const floatButtonAppears = new Event('floatButtonAppears');
      document.dispatchEvent(floatButtonAppears);
    }
    this.buyButton.classList.remove('hidden');
  };

  createBuyButton = () => {
    if (!this.buttonTemplate) return;
    const clone = this.buttonTemplate.content.cloneNode(true);
    document.body.appendChild(clone);
    this.buyButton = document.body.querySelector('.float-buy-button');

    if (this.querySelector('#addonsDrawer'))
      this.buyButton.addEventListener('click', this.onAddonsBuyButtonClick);
    else this.buyButton.addEventListener('click', this.onBuyButtonClick);
  };

  onBuyButtonClick = async (e) => {
    const button = e.currentTarget || e.target;
    // Produit personnalisé : le bouton d'achat OUVRE le studio de création au lieu d'ajouter au
    // panier. Détection par PRÉSENCE du studio sur la page (monté par les templates personnalisés :
    // foot IA, poster à design fixe…) plutôt que par un nom de template en dur -> tout nouveau
    // produit perso marche sans retoucher ce code. L'ajout au panier se fait à la fin du studio
    // (aperçu validé pour l'IA, ou directement pour un design fixe). Bouton fixe ET flottant.
    // FAIL-CLOSED : on se branche sur la PRÉSENCE de l'élément, jamais sur le fait qu'il soit déjà
    // « upgradé ». Le bundle du studio est chargé en `defer` : entre l'instant où le bouton devient
    // cliquable et l'upgrade du custom element, `studio.open` n'existe pas encore. Avant ce garde-fou
    // le clic RETOMBAIT sur un /cart/add.js nu — getproductProperties() renvoie {} sur ces templates
    // (aucun bloc .product-properties) -> commande d'un produit personnalisé SANS AUCUNE
    // personnalisation, indiscernable d'un poster catalogue. On n'ajoute donc JAMAIS au panier depuis
    // ce chemin quand un studio est présent : on attend son upgrade (borné), puis on l'ouvre.
    const studio = document.querySelector('custom-art-studio');
    if (studio) {
      e.preventDefault();
      if (typeof studio.open === 'function') {
        studio.open();
        return;
      }
      this.displayLoader(button);
      try {
        await Promise.race([
          customElements.whenDefined('custom-art-studio'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('studio-timeout')), 5000)),
        ]);
        const ready = document.querySelector('custom-art-studio');
        if (ready && typeof ready.open === 'function') ready.open();
      } catch (err) {
        // Studio indisponible (bundle en échec ou trop lent) : on ne commande PAS un produit
        // personnalisé nu. Le bouton est rendu au client, qui peut re-cliquer.
      }
      this.hideLoader(button);
      return;
    }
    try {
      this.displayLoader(button);
      const productProperties = this.getproductProperties();
      const json = await this.buyFetch(button, productProperties);

      // Fetch current cart state to update bubble
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      const headerId = this.getHeaderId(button);
      this.renderNewSections(json, cart, headerId);
      setTimeout(() => {
        document.getElementById('cart-button')?.click();
      }, 300);
    } catch (e) {
      throw new Error("Une erreur inattendu s'est produite.");
    } finally {
      this.hideLoader(button);
    }
  };

  async buyFetch(button, productProperties) {
    const variantId = button.dataset.variantId;
    const headerId = this.getHeaderId(button);
    const response = await fetch(
      `/cart/add.js?sections=tw-cart-drawer,${headerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ id: variantId, quantity: 1, properties: productProperties }],
        }),
      },
    );
    if (!response.ok) throw new Error("Une erreur inattendu s'est produite.");
    return await response.json();
  }

  getHeaderId = (button) => {
    const template = button.dataset.template;
    if (template === 'tapestry') {
      return 'tw-header-tapestry';
    }
    return 'tw-header-painting';
  };

  renderNewSections({ items, sections }, cart, headerId) {
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
    const newSectionDrawer = this.getSectionInnerJSON(
      sections['tw-cart-drawer'],
      '#shopify-section-tw-cart-drawer',
    );
    sectionDrawer.innerHTML = newSectionDrawer;
  }

  getSectionInnerJSON(json, selector) {
    return new DOMParser()
      .parseFromString(json, 'text/html')
      .querySelector(selector).innerHTML;
  }

  onAddonsBuyButtonClick = () => {
    this.addonsDrawer =
      this.addonsDrawer || document.getElementById('addonsDrawer');
    this.addonsDrawer.classList.replace('translate-x-full', 'translate-x-0');
    this.addonsDrawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
  };

  displayLoader(button) {
    button.disabled = true;
    button.classList.add('cursor-not-allowed');
  }

  hideLoader(button) {
    button.disabled = false;
    button.classList.remove('cursor-not-allowed');
  }

  getproductProperties() {
    const inputs = this.querySelectorAll('.product-properties input');
    const productProperties = {};
    inputs.forEach((input) => {
      // Radios / cases à cocher : ne retenir QUE l'option réellement cochée (sinon la dernière
      // du groupe écrasait les précédentes -> ex. couleur de cadre poster).
      if ((input.type === 'radio' || input.type === 'checkbox') && !input.checked) return;
      // Champs désactivés (ex. couleur de cadre quand « Sans cadre ») ou sans name : non soumis.
      if (input.disabled || !input.name) return;
      productProperties[input.name] = input.value;
    });
    return productProperties;
  }
}
customElements.define('main-product-blocks', MainProductBlocks);

class VariantPicker extends HTMLElement {
  constructor() {
    super();
    this.radioInput = this.querySelector('input[type="radio"]');
    this.buyButton = document.querySelector('.buy-button');
    this.variantsData = JSON.parse(
      document.getElementById('variants-data-json').textContent,
    );
  }

  connectedCallback() {
    this.radioInput.addEventListener('change', this.onRadioChange.bind(this));
  }

  onRadioChange() {
    const variantData = this.getVariantData();
    if (!variantData || !this.buyButton) return;
    this.buyButton.dataset.variantId = variantData.id;
    this.updateBuyButtonContent(variantData);
    this.updatePromotionDateBanner(variantData);
  }

  getVariantData() {
    const [option1, option2, option3] = this.getOptions();
    const currentVariant = this.variantsData.find(
      (variant) =>
        variant.option1 === option1 &&
        variant.option2 === option2 &&
        variant.option3 === option3,
    );

    if (!currentVariant) {
      console.error('Variant not found for options:', { option1, option2, option3 });
      return null;
    }

    return {
      id: currentVariant.id,
      compareAtPrice: currentVariant.compare_at_price,
      price: currentVariant.price,
      title: currentVariant.title,
    };
  }

  getOptions() {
    const radioInputsChecked = document.querySelectorAll(
      'variant-picker input[type="radio"]:checked',
    );
    const options = [
      radioInputsChecked[0]?.value || null,
      radioInputsChecked[1]?.value || null,
      radioInputsChecked[2]?.value || null,
    ];
    return options;
  }

  updateBuyButtonContent(variantData) {
    this.updateFloatBuyButtonDatasetVariantId(
      variantData.id,
      variantData.title,
    );

    const scenario = this.getScenario(variantData.compareAtPrice);
    const promotionClone = document
      .querySelector('.template-promotion-in-cart-button')
      ?.content.cloneNode(true);
    const regularClone = document
      .querySelector('.template-regular-in-cart-button')
      ?.content.cloneNode(true);

    switch (scenario) {
      case 'regularToRegular':
        this.regularToRegularScenario(variantData);
        break;
      case 'regularToPromotion':
        this.regularToPromotionScenario(variantData, promotionClone);
        break;
      case 'promotionToRegular':
        this.promotionToRegularScenario(variantData, regularClone);
        break;
      case 'promotionToPromotion':
        this.promotionToPromotionScenario(variantData);
        break;
      case 'constantPromotion':
        this.constantPromotionScenario(variantData);
        break;
    }
    this.alignFloatBuyButtonContent();
  }

  getScenario(variantCompareAtPrice) {
    const wasRegular = document.querySelector('.regular-in-cart-button');
    const wasPromotion = document.querySelector('.promotion-in-cart-button');
    const willBeRegular = !variantCompareAtPrice;
    const willBePromotion = variantCompareAtPrice;
    const isConstantPromotion =
    document.querySelector('.promotion-in-cart-button')?.dataset
    ?.promotionConstant === 'true';

    if (isConstantPromotion) return 'constantPromotion';
    if (wasRegular && willBeRegular) return 'regularToRegular';
    if (wasPromotion && willBePromotion) return 'promotionToPromotion';
    if (wasRegular && willBePromotion) return 'regularToPromotion';
    if (wasPromotion && willBeRegular) return 'promotionToRegular';
  }

  regularToRegularScenario(variantData) {
    this.updateBuyButtonMainPrice(variantData.price);
    this.updateBuyButtonText(variantData.title);
  }

  regularToPromotionScenario(variantData, clone) {
    this.updateBuyButtonMainPrice(variantData.price, clone);
    this.updateDisplayedCrossedPrice(variantData.compareAtPrice, clone);
    this.updateDisplayedReductionPrice(variantData, clone);
    this.updateBuyButtonText(variantData.title, clone);
    this.replaceContentByClone(
      document.querySelector('.regular-in-cart-button'),
      clone,
    );
  }

  promotionToRegularScenario(variantData, clone) {
    this.updateBuyButtonMainPrice(variantData.price, clone);
    this.updateBuyButtonText(variantData.title, clone);
    this.replaceContentByClone(
      document.querySelector('.promotion-in-cart-button'),
      clone,
    );
  }

  promotionToPromotionScenario(variantData) {
    this.updateBuyButtonMainPrice(variantData.price);
    this.updateDisplayedCrossedPrice(variantData.compareAtPrice);
    this.updateDisplayedReductionPrice(variantData);
    this.updateBuyButtonText(variantData.title);
  }

  constantPromotionScenario(variantData) {
    const { discount, unit } = this.getDiscountData();
    const newPrice = Product.getPriceDiscounted(
      variantData.price,
      discount,
      unit,
    );
    this.updateBuyButtonMainPrice(newPrice);
    this.updateDisplayedCrossedPrice(variantData.price);
    this.updateBuyButtonText(variantData.title);
  }

  updateBuyButtonMainPrice(newPrice, clone) {
    let priceElem;
    if (clone) {
      priceElem = clone.querySelector('.main-price');
    } else {
      priceElem = document.querySelector('.main-price');
    }
    if (!priceElem) return;
    priceElem.textContent = Product.formatPrice(newPrice);
  }

  updateDisplayedCrossedPrice(newPrice, clone) {
    let crossedPriceElem;
    if (clone) {
      crossedPriceElem = clone.querySelector('.crossed-price');
    } else {
      crossedPriceElem = document.querySelector('.crossed-price');
    }

    if (!crossedPriceElem) return;
    crossedPriceElem.textContent = Product.formatPrice(newPrice);
  }

  updateDisplayedReductionPrice(variantData, clone) {
    let reductionPriceElem;
    if (clone) {
      reductionPriceElem = clone.querySelector('.reduction-price');
    } else {
      reductionPriceElem = document.querySelector('.reduction-price');
    }

    if (!reductionPriceElem) return;
    const reduction = variantData.compareAtPrice - variantData.price;
    reductionPriceElem.textContent = '- ' + Product.formatPrice(reduction);

    const floatBuyButtonElem = this.getFloatBuyButtonElem();
    const floatBuyButtonReductionPriceElem =
      floatBuyButtonElem.querySelector('.reduction-price');
    if (floatBuyButtonReductionPriceElem)
      floatBuyButtonReductionPriceElem.textContent =
        reductionPriceElem.textContent;
  }

  updateBuyButtonText(variantTitle, clone) {
    const isDynamicVariant = this.buyButton.dataset.isDynamicVariant;
    if (isDynamicVariant === 'false') return;

    let buyButtonTextElem;
    if (clone) {
      buyButtonTextElem = clone.querySelector('.cart-button-text');
    } else {
      buyButtonTextElem = document.querySelector('.cart-button-text');
    }

    if (buyButtonTextElem) buyButtonTextElem.textContent = variantTitle;
  }

  updateFloatBuyButtonDatasetVariantId(variantId) {
    const floatBuyButton = this.getFloatBuyButtonElem();
    floatBuyButton.dataset.variantId = variantId;
  }

  getFloatBuyButtonElem() {
    const floatBuyButton = document.querySelector('.float-buy-button');
    let floatBuyButtonElem;
    if (floatBuyButton) {
      floatBuyButtonElem = floatBuyButton;
    } else {
      const templateFloatBuyButton =
        document.getElementById('float-buy-button');
      const content = templateFloatBuyButton.content;
      floatBuyButtonElem = content.querySelector('.float-buy-button');
    }
    return floatBuyButtonElem;
  }

  replaceContentByClone(contentElem, clone) {
    if (!clone) return;
    contentElem.replaceWith(clone);
  }

  alignFloatBuyButtonContent() {
    const buyButtonContent = this.buyButton.innerHTML;

    const floatBuyButton = this.getFloatBuyButtonElem();
    floatBuyButton.innerHTML = buyButtonContent;
  }

  updatePromotionDateBanner(variantData) {
    const promotionDateBanner = document.querySelector(
      '.promotion-date-banner',
    );
    if (variantData.compareAtPrice && !promotionDateBanner) {
      this.createPromotionDateBanner();
    } else if (!variantData.compareAtPrice) {
      this.hidePromotionDateBanner();
    } else {
      this.showPromotionDateBanner();
    }
  }

  createPromotionDateBanner() {
    const templatePromotionDateBanner = document.getElementById(
      'promotion-date-banner',
    );
    if (!templatePromotionDateBanner) return;
    const promotionDateBanner =
      templatePromotionDateBanner.content.cloneNode(true);
    const parentBuyButton = this.buyButton.parentElement;
    const bannerElement = promotionDateBanner.firstElementChild;
    parentBuyButton.insertAdjacentElement('afterend', bannerElement);
  }

  hidePromotionDateBanner() {
    const promotionDateBanner = document.querySelector(
      '.promotion-date-banner',
    );
    if (promotionDateBanner?.dataset.promotionConstant) return;
    if (promotionDateBanner) promotionDateBanner.classList.add('hidden');
  }

  showPromotionDateBanner() {
    const promotionDateBanner = document.querySelector(
      '.promotion-date-banner',
    );
    if (promotionDateBanner?.dataset.promotionConstant) return;
    if (promotionDateBanner) promotionDateBanner.classList.remove('hidden');
  }

  getDiscountData() {
    const discount = document.querySelector('.promotion-in-cart-button')
      ?.dataset?.discount;
    const unit = document.querySelector('.promotion-in-cart-button')?.dataset
      ?.unit;
    return { discount, unit };
  }
}
customElements.define('variant-picker', VariantPicker);

// PaintingVariantPicker extends VariantPicker with painting-specific availability logic
class PaintingVariantPicker extends VariantPicker {
  connectedCallback() {
    super.connectedCallback();
    // Update availability on initial load
    if (this.dataset.option === 'option1' || this.dataset.option === 'option2') {
      setTimeout(() => this.updateOptionAvailability(), 0);
    }
  }

  getOptions() {
    const radioInputsChecked = document.querySelectorAll(
      'painting-variant-picker input[type="radio"]:checked',
    );
    const options = [
      radioInputsChecked[0]?.value || null,
      radioInputsChecked[1]?.value || null,
      radioInputsChecked[2]?.value || null,
    ];
    return options;
  }

  onRadioChange() {
    // Update the selected border name in the guide link (option 2)
    if (this.dataset.option === 'option2') {
      const selectedBorderNameSpan = document.getElementById('selected-border-name');
      if (selectedBorderNameSpan) {
        selectedBorderNameSpan.textContent = this.radioInput.value;
      }
    }

    // Update the selected frame name in the guide link (option 3)
    if (this.dataset.option === 'option3') {
      const selectedFrameNameSpan = document.getElementById('selected-frame-name');
      if (selectedFrameNameSpan) {
        selectedFrameNameSpan.textContent = this.radioInput.value;
      }
    }

    // Update option availability when size or border changes
    if (this.dataset.option === 'option1' || this.dataset.option === 'option2') {
      this.updateOptionAvailability();
    }

    // Call parent method to handle variant data updates
    super.onRadioChange();
  }

  updateOptionAvailability() {
    const [currentOption1, currentOption2] = this.getOptions();

    // Get all frame option pickers (option3)
    const frameOptions = document.querySelectorAll('painting-variant-picker[data-option="option3"]');
    const frameOptionsArray = Array.from(frameOptions);
    let availableCount = 0;
    let firstFrameAvailable = false;

    frameOptionsArray.forEach((framePicker, index) => {
      const frameValue = framePicker.dataset.optionValue;
      const radioInput = framePicker.querySelector('input[type="radio"]');
      const label = framePicker.querySelector('label');

      // Check if this frame is available for current size/border combination
      const isAvailable = this.variantsData.some(variant =>
        variant.option1 === currentOption1 &&
        variant.option2 === currentOption2 &&
        variant.option3 === frameValue &&
        variant.available
      );

      if (isAvailable) {
        availableCount++;
        if (index === 0) firstFrameAvailable = true;
        radioInput.disabled = false;
        label.classList.remove('grayscale', 'cursor-not-allowed');
        label.classList.add('cursor-pointer');
      } else {
        radioInput.disabled = true;
        label.classList.add('grayscale', 'cursor-not-allowed');
        label.classList.remove('cursor-pointer');

        // If this option was selected, select the first available option
        if (radioInput.checked) {
          const firstAvailable = frameOptionsArray.find(picker => {
            const value = picker.dataset.optionValue;
            return this.variantsData.some(v =>
              v.option1 === currentOption1 &&
              v.option2 === currentOption2 &&
              v.option3 === value &&
              v.available
            );
          });

          if (firstAvailable) {
            firstAvailable.querySelector('input[type="radio"]').click();
          }
        }
      }
    });

    // Show message if only the first frame (no frame) is available
    const noFramesMessage = document.getElementById('no-frames-message');
    if (noFramesMessage) {
      if (availableCount === 1 && firstFrameAvailable) {
        noFramesMessage.classList.remove('hidden');
      } else {
        noFramesMessage.classList.add('hidden');
      }
    }
  }
}
customElements.define('painting-variant-picker', PaintingVariantPicker);

class VariantToCart extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button');
    this.buyButton = document.querySelector('.buy-button');
  }

  connectedCallback() {
    this.button.addEventListener('click', this.onButtonClick);
  }

  onButtonClick = () => {
    this.buyButton.dataset.variantId = this.dataset.variantId;
    this.buyButton.click();
  };
}
customElements.define('variant-to-cart', VariantToCart);

// Size Guide Popup Handler
const sizeGuidePopup = document.getElementById('size-guide-popup');
if (sizeGuidePopup) {
  // Update size guide content when popup opens
  sizeGuidePopup.addEventListener('click', (e) => {
    // Close when clicking backdrop
    if (e.target === sizeGuidePopup) {
      sizeGuidePopup.close();
    }
  });

  // Function to update the displayed size guide image
  function updateSizeGuideImage() {
    const selectedSizeRadio = document.querySelector('painting-variant-picker input[name="option1"]:checked');
    if (!selectedSizeRadio) return;

    const selectedSize = selectedSizeRadio.value;
    const sizeGuideItems = document.querySelectorAll('.size-guide-item');

    sizeGuideItems.forEach(item => {
      if (item.dataset.size === selectedSize) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  }

  // Update image when popup opens
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
        if (sizeGuidePopup.hasAttribute('open')) {
          updateSizeGuideImage();
        }
      }
    });
  });

  observer.observe(sizeGuidePopup, { attributes: true });

  // Update image when size selection changes
  document.addEventListener('change', (e) => {
    if (e.target.matches('painting-variant-picker input[name="option1"]')) {
      if (sizeGuidePopup.hasAttribute('open')) {
        updateSizeGuideImage();
      }
    }
  });
}

// Border Guide Popup Handler
const borderGuidePopup = document.getElementById('border-guide-popup');
if (borderGuidePopup) {
  // Close when clicking backdrop
  borderGuidePopup.addEventListener('click', (e) => {
    if (e.target === borderGuidePopup) {
      borderGuidePopup.close();
    }
  });

  // Function to update the displayed border guide image
  function updateBorderGuideImage() {
    const selectedBorderRadio = document.querySelector('painting-variant-picker input[name="option2"]:checked');
    if (!selectedBorderRadio) return;

    const selectedBorder = selectedBorderRadio.value;
    const borderGuideItems = document.querySelectorAll('.border-guide-item');

    borderGuideItems.forEach(item => {
      if (item.dataset.border === selectedBorder) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  }

  // Update image when popup opens
  const borderObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
        if (borderGuidePopup.hasAttribute('open')) {
          updateBorderGuideImage();
        }
      }
    });
  });

  borderObserver.observe(borderGuidePopup, { attributes: true });

  // Update image when border selection changes
  document.addEventListener('change', (e) => {
    if (e.target.matches('painting-variant-picker input[name="option2"]')) {
      if (borderGuidePopup.hasAttribute('open')) {
        updateBorderGuideImage();
      }
    }
  });
}

// Frame Guide Popup Handler
const frameGuidePopup = document.getElementById('frame-guide-popup');
if (frameGuidePopup) {
  // Close when clicking backdrop
  frameGuidePopup.addEventListener('click', (e) => {
    if (e.target === frameGuidePopup) {
      frameGuidePopup.close();
    }
  });

  // Function to update the displayed frame guide image
  function updateFrameGuideImage() {
    // Toile : option3 = cadre. Poster : pas d'option3 -> reflète la COULEUR choisie (« Avec cadre »),
    // sinon la valeur du toggle « Cadres » (« Sans cadre »). Le guide (frames_canvas) inclut « Sans cadre »
    // + les couleurs ; si la valeur courante n'a pas d'item correspondant (contenu produit variable), le
    // filet de sécurité plus bas affiche le 1er item plutôt qu'une bulle vide.
    let selectedFrame;
    const option3Radio = document.querySelector('painting-variant-picker input[name="option3"]:checked');
    if (option3Radio) {
      selectedFrame = option3Radio.value;
    } else {
      // Poster : la pastille cochée porte la couleur (data-color-name = « Avec cadre ») ou « Sans cadre » (value).
      const posterChecked = document.querySelector('painting-variant-picker input[data-frame-mode]:checked');
      if (posterChecked) selectedFrame = posterChecked.dataset.colorName || posterChecked.value;
    }
    if (!selectedFrame) return;

    const frameGuideItems = document.querySelectorAll('.frame-guide-item');

    let matched = false;
    frameGuideItems.forEach(item => {
      const isMatch = item.dataset.frame === selectedFrame;
      item.classList.toggle('hidden', !isMatch);
      if (isMatch) matched = true;
    });
    // Filet de sécurité : ne jamais laisser la bulle vide (valeur sans item de guide) -> 1er item.
    if (!matched && frameGuideItems.length) {
      frameGuideItems.forEach((item, i) => item.classList.toggle('hidden', i !== 0));
    }
  }

  // Update image when popup opens
  const frameObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
        if (frameGuidePopup.hasAttribute('open')) {
          updateFrameGuideImage();
        }
      }
    });
  });

  frameObserver.observe(frameGuidePopup, { attributes: true });

  // Update image when frame selection changes (toile : option3 ; poster : toggle Cadres + couleur).
  document.addEventListener('change', (e) => {
    if (
      e.target.matches('painting-variant-picker input[name="option3"]') ||
      e.target.matches('painting-variant-picker input[data-frame-mode]')
    ) {
      if (frameGuidePopup.hasAttribute('open')) {
        updateFrameGuideImage();
      }
    }
  });
}

// Variant Options Scroll Arrow Handler
const variantContainers = document.querySelectorAll('.variant-options-container');
variantContainers.forEach(container => {
  const parent = container.parentElement;
  const rightArrow = parent.querySelector('.scroll-arrow-right');

  if (!rightArrow) return;

  // Update arrow visibility based on scroll position
  function updateArrowVisibility() {
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;

    if (isAtEnd || container.scrollWidth <= container.clientWidth) {
      rightArrow.classList.add('opacity-0', 'pointer-events-none');
    } else {
      rightArrow.classList.remove('opacity-0', 'pointer-events-none');
    }
  }

  // Handle arrow click
  function handleArrowClick() {
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollTo({
      left: container.scrollLeft + scrollAmount,
      behavior: 'smooth'
    });
  }

  // Add event listeners
  const rightButton = rightArrow.querySelector('button');
  if (rightButton) rightButton.addEventListener('click', handleArrowClick);
  container.addEventListener('scroll', updateArrowVisibility);

  // Initial check
  updateArrowVisibility();

  // Recheck on window resize
  window.addEventListener('resize', updateArrowVisibility);
});

// ===== Poster — options (cadre couleur + contour blanc) : idempotent & SWAP-SAFE =====
// Les handlers re-dérivent TOUJOURS leur état du DOM COURANT (aucune closure figée sur des nœuds ou
// des données de variantes) -> ils survivent au remplacement de #MainContent lors de la bascule
// Poster/Toile sans rechargement. Les écouteurs délégués sur `document` sont attachés UNE SEULE fois ;
// window.mmaInitPosterOptions() (ré)applique l'état initial au 1er chargement ET après chaque bascule.

// --- Cadre poster : la pastille couleur cochée (= « Avec cadre ») est recopiée dans les propriétés de
//     ligne « Couleur du cadre » / « _cadre » ; « Sans cadre » les vide + désactive. N'existe que sur
//     les posters (pastilles data-frame-mode présentes) -> no-op immédiat sur les toiles. ---
function mmaPosterPastilles() {
  return Array.from(document.querySelectorAll('painting-variant-picker input[data-frame-mode]'));
}
function mmaSelectedPosterSize() {
  return (
    document.querySelector('painting-variant-picker input[name="option1"]:checked')?.value || null
  );
}
// Recopie la couleur de la pastille cochée dans les propriétés de ligne (vidées + désactivées si « Sans cadre »).
function mmaSyncPosterColorProperty() {
  const pastilles = mmaPosterPastilles();
  if (!pastilles.length) return;
  const cadreNom = document.querySelector('.product-properties [data-cadre-name]');
  const cadreHandle = document.querySelector('.product-properties [data-cadre-handle]');
  const checked = pastilles.find((p) => p.checked);
  const framed = checked && checked.dataset.frameMode === 'framed';
  if (cadreNom) {
    cadreNom.disabled = !framed;
    cadreNom.value = framed ? (checked.dataset.colorName || '') : '';
  }
  if (cadreHandle) {
    cadreHandle.disabled = !framed;
    cadreHandle.value = framed ? (checked.dataset.colorHandle || '') : '';
  }
  // Libellé du guide cadre : nom de la couleur (Avec cadre) ou « Sans cadre ».
  const span = document.getElementById('selected-frame-name');
  if (span && checked) span.textContent = framed ? (checked.dataset.colorName || checked.value) : checked.value;
}
// Désactive les pastilles couleur (= Avec cadre) pour les tailles sans variante encadrée (ex. 90×120).
function mmaSyncPosterFrameAvailability() {
  const pastilles = mmaPosterPastilles();
  if (!pastilles.length) return;
  const variantsDataEl = document.getElementById('variants-data-json');
  const variantsData = variantsDataEl ? JSON.parse(variantsDataEl.textContent) : [];
  const size = mmaSelectedPosterSize();
  pastilles.forEach((input) => {
    const available = variantsData.some(
      (v) => v.option1 === size && v.option2 === input.value && v.available,
    );
    const label = input.closest('label');
    if (available) {
      input.disabled = false;
      if (label) { label.classList.remove('grayscale', 'cursor-not-allowed'); label.classList.add('cursor-pointer'); }
    } else {
      input.disabled = true;
      if (label) { label.classList.add('grayscale', 'cursor-not-allowed'); label.classList.remove('cursor-pointer'); }
      // Si la pastille indisponible était cochée, basculer sur la 1re disponible (-> change : variante + prix).
      if (input.checked) {
        const fallback = pastilles.find((p) =>
          variantsData.some((v) => v.option1 === size && v.option2 === p.value && v.available),
        );
        if (fallback) fallback.click();
      }
    }
  });
}

// --- Contour blanc (passe-partout) : échange les visuels galerie/popup « sans bord » <-> « avec bord
//     blanc » et pose la property _passe_partout. UN SEUL <img> par tuile (data-reg-* / data-pp-*) ->
//     indices carrousel/popup INCHANGÉS ; les versions passe-partout ne se TÉLÉCHARGENT qu'au 1er « Avec ». ---
function mmaApplyWhiteBorderSwap(scope, on) {
  scope.querySelectorAll('[data-pp-swap]').forEach((img) => {
    const ss = on ? img.dataset.ppSrcset : img.dataset.regSrcset;
    const s = on ? img.dataset.ppSrc : img.dataset.regSrc;
    const a = on ? img.dataset.ppAlt : img.dataset.regAlt;
    if (ss != null) img.srcset = ss; // déclenche le (télé)chargement de la version voulue
    if (s) img.src = s;
    if (a) img.alt = a;
  });
}
function mmaSetWhiteBorder(on) {
  mmaApplyWhiteBorderSwap(document, on);
  const wbName = document.querySelector('.product-properties [data-wb-name]');
  const wbFlag = document.querySelector('.product-properties [data-wb-flag]');
  if (wbName) wbName.disabled = !on;
  if (wbFlag) wbFlag.disabled = !on;
  // Drapeau global -> les clones du popup (créés à l'ouverture) reflètent le choix courant.
  document.body.classList.toggle('poster-pp-on', on);
}
// Le carrousel applique ce swap au clone du popup à l'ouverture (cf. openPopup) pour refléter le choix.
// Toujours défini (garde interne sur poster-pp-on) -> no-op tant qu'aucun contour blanc n'est actif.
window.__applyWhiteBorderSwap = (scope) => {
  if (scope && document.body.classList.contains('poster-pp-on')) mmaApplyWhiteBorderSwap(scope, true);
};

// Écouteurs délégués attachés UNE SEULE fois : ils re-dérivent l'état du DOM courant à chaque
// événement -> insensibles au remplacement de #MainContent (bascule Poster/Toile sans rechargement).
if (!window.__mmaMainProductDelegated) {
  window.__mmaMainProductDelegated = true;
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || typeof t.matches !== 'function') return;
    if (t.matches('painting-variant-picker input[name="option1"]')) mmaSyncPosterFrameAvailability();
    if (t.matches('painting-variant-picker input[data-frame-mode]')) mmaSyncPosterColorProperty();
    if (t.matches('[data-white-border]')) mmaSetWhiteBorder(t.dataset.whiteBorder === 'on');
  });
}

// (Ré)initialise l'état des options poster : au 1er chargement ET après une bascule Poster/Toile.
// Cadre : le HTML rend déjà « Sans cadre » coché + propriétés désactivées ; on calcule la disponibilité
// des couleurs pour la taille par défaut. Contour blanc : défaut « Avec » (radio « on » coché côté serveur
// + visuels passe-partout déjà rendus en primaire) -> on applique mmaSetWhiteBorder selon le radio coché,
// pour poser le drapeau poster-pp-on (reflété par les clones du popup) et synchroniser la property. Idempotent :
// le swap vise la version DÉJÀ affichée -> aucun re-téléchargement. Robuste à la bascule (le HTML re-rendu
// porte le même défaut) et sans effet sur les toiles (aucun radio [data-white-border]).
window.mmaInitPosterOptions = function mmaInitPosterOptions() {
  mmaSyncPosterFrameAvailability();
  mmaSyncPosterColorProperty();
  const wb = document.querySelector('[data-white-border]:checked');
  if (wb) mmaSetWhiteBorder(wb.dataset.whiteBorder === 'on');
};
window.mmaInitPosterOptions();
