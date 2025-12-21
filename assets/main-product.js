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

      // Fetch current cart state to update bubble
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      const headerId = this.getHeaderId(button);
      this.renderNewSections(json, cart, headerId);
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
    const selectedFrameRadio = document.querySelector('painting-variant-picker input[name="option3"]:checked');
    if (!selectedFrameRadio) return;

    const selectedFrame = selectedFrameRadio.value;
    const frameGuideItems = document.querySelectorAll('.frame-guide-item');

    frameGuideItems.forEach(item => {
      if (item.dataset.frame === selectedFrame) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
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

  // Update image when frame selection changes
  document.addEventListener('change', (e) => {
    if (e.target.matches('painting-variant-picker input[name="option3"]')) {
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
