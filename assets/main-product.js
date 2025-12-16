class MainProductCarousel extends HTMLElement {
  constructor() {
    super();
    this.medias = Array.from(this.querySelectorAll('.img-wrapper'));
    this.thumbnailMedias = Array.from(
      this.querySelectorAll('.thumb-img-wrapper'),
    );
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
  }

  connectedCallback() {
    this.medias.forEach((media) => {
      media.addEventListener('click', () => {
        this.openPopup();
      });
      media.querySelector('.zoom')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.popupOpen) {
          this.openPopup();
        }
      });
    });

    this.thumbnailMedias.forEach((media) => {
      media.addEventListener('click', () => {
        const index = this.thumbnailMedias.indexOf(media);
        const diffFromCurrentMedia = index - this.currentMediaIndex;
        this.displayNextMedia(diffFromCurrentMedia);
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
      if (this.scrollTimeout !== null) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        this.imageWidth = this.imageWidth | this.mesureImageWidth();
        this.carouselScrollFromLeft = this.carousel.scrollLeft;
        const diff = Math.round(this.carouselScrollFromLeft / this.imageWidth);
        this.currentMediaIndex = diff;
        this.changeImageCounter();
        this.shiftNextMediaToLeft();
        this.centerContainedImage();
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
    this.renderOldZoomDefocusable();
    this.scrollToNextMedia(diffFromCurrentMedia);
    this.currentMediaIndex += diffFromCurrentMedia;
    this.renderCurrentZoomFocusable();
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

  renderOldZoomDefocusable = () => {
    this.medias[this.currentMediaIndex]
      .querySelector('.zoom')
      ?.removeAttribute('tabindex');
  };

  renderCurrentZoomFocusable = () => {
    if (this.medias[this.currentMediaIndex].classList.contains('model-3d'))
      return;
    this.medias[this.currentMediaIndex].querySelector('.zoom').tabIndex = 0;
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

  shiftNextMediaToLeft = () => {
    const currentMedia = this.medias[this.currentMediaIndex].firstElementChild;
    const nextMedia =
      this.medias[this.currentMediaIndex + 1]?.firstElementChild;
    currentMedia.classList.replace('-translate-x-8', 'translate-x-0');
    nextMedia?.classList.replace('translate-x-0', '-translate-x-8');
  };

  centerContainedImage = () => {
    const currentMedia = this.medias[this.currentMediaIndex].firstElementChild;
    currentMedia.classList.remove('object-left');

    const nextMedia =
      this.medias[this.currentMediaIndex + 1]?.firstElementChild;
    if (nextMedia?.classList.contains('object-contain')) {
      nextMedia?.classList.add('object-left');
    }

    const previousMedia =
      this.medias[this.currentMediaIndex - 1]?.firstElementChild;
    if (previousMedia?.classList.contains('object-contain')) {
      previousMedia?.classList.add('object-left');
    }
  };
}
customElements.define('main-product-carousel', MainProductCarousel);

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
    const button = e.target;
    try {
      this.displayLoader(button);
      const productProperties = this.getproductProperties();
      const json = await this.buyFetch(button, productProperties);
      const headerId = this.getHeaderId(button);
      this.renderNewSections(json, headerId);
      setTimeout(() => {
        const cartDrawerButton = document.getElementById('cart-button');
        cartDrawerButton.click();
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
          items: [{ id: variantId, quantity: 1 }],
          productProperties,
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

  renderNewSections({ items, sections }, headerId) {
    const bubble = document.getElementById('bubble-nb-product');
    const newBubble = this.getSectionInnerJSON(
      sections[headerId],
      '#bubble-nb-product',
    );
    bubble.innerHTML = newBubble;

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
      productProperties[input.name] = input.value;
    });
    return productProperties;
  }
}
customElements.define('main-product-blocks', MainProductBlocks);

class VariantPicker extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('button');
    this.buyButton = document.querySelector('.buy-button');
    this.variantsData = JSON.parse(
      document.getElementById('variants-data-json').textContent,
    );
  }

  connectedCallback() {
    this.button.addEventListener('click', this.onButtonClick);
  }

  onButtonClick = () => {
    this.unColorPreviousButtonSelected();
    this.colorButtonSelected();
    const variantData = this.getVariantData();
    if (!this.buyButton) return;
    this.buyButton.dataset.variantId = variantData.id;
    this.updateBuyButtonContent(variantData);
    this.updatePromotionDateBanner(variantData);
  };

  unColorPreviousButtonSelected() {
    const container = this.closest('.container');
    const previousVariantPickerSelected = container.querySelector(
      'variant-picker[data-selected="true"]',
    );
    if (previousVariantPickerSelected) {
      previousVariantPickerSelected.dataset.selected = 'false';
      const previousButton =
        previousVariantPickerSelected.querySelector('button');
      previousButton.classList.replace('bg-main-90', 'bg-white');
      previousButton.classList.remove('text-secondary');
      previousButton.classList.add('border-main');
    }
  }

  colorButtonSelected() {
    this.button.classList.replace('bg-white', 'bg-main-90');
    this.button.classList.add('text-secondary');
    this.button.classList.remove('border-main');
    this.dataset.selected = 'true';
  }

  getVariantData() {
    const [option1, option2, option3] = this.getOptions();
    const currentVariant = this.variantsData.find(
      (variant) =>
        variant.option1 === option1 &&
        variant.option2 === option2 &&
        variant.option3 === option3,
    );
    return {
      id: currentVariant.id,
      compareAtPrice: currentVariant.compare_at_price,
      price: currentVariant.price,
      title: currentVariant.title,
    };
  }

  getOptions() {
    const variantPickersSelected = document.querySelectorAll(
      'variant-picker[data-selected="true"]',
    );
    const options = [
      variantPickersSelected[0]?.dataset.optionValue || null,
      variantPickersSelected[1]?.dataset.optionValue || null,
      variantPickersSelected[2]?.dataset.optionValue || null,
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
