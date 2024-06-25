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
    this.imageConter = this.imageConter || this.querySelector('.image-counter');
    this.imageConter.textContent = this.currentMediaIndex + 1;
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
      this.animBlockButton();
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
    }
    this.buyButton.classList.remove('hidden');
  };

  createBuyButton = () => {
    if (!this.buttonTemplate) return;
    const clone = this.buttonTemplate.content.cloneNode(true);
    document.body.appendChild(clone);
    this.buyButton = document.body.querySelector('.float-buy-button');
    this.buyButton.addEventListener('click', this.onBuyButtonClick);
  };

  animBlockButton = () => {
    setInterval(() => {
      this.blockBuyButton.classList.add('glass-anim');
      setTimeout(() => {
        this.blockBuyButton.classList.remove('glass-anim');
      }, 1500);
    }, 11000);
  };

  onBuyButtonClick = async (e) => {
    const button = e.target;
    try {
      this.displayLoader(button);
      const variantId = button.dataset.variantId;
      const response = await fetch(
        '/cart/add.js?sections=tw-cart-drawer,tw-header',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{ id: variantId, quantity: 1 }],
          }),
        },
      );
      if (!response.ok) throw new Error("Une erreur inattendu s'est produite.");
      const json = await response.json();
      this.renderNewSections(json);
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

  renderNewSections({ items, sections }) {
    const bubble = document.getElementById('bubble-nb-product');
    const newBubble = this.getSectionInnerJSON(
      sections['tw-header'],
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

    const variantTitleToFillElem = sectionDrawer.querySelector(
      '.variant-title-to-fill',
    );
    if (variantTitleToFillElem) {
      variantTitleToFillElem.textContent = items[0].variant_title;
    }

    const variantPriceToFillElem = sectionDrawer.querySelector(
      '.variant-price-to-fill',
    );
    if (variantPriceToFillElem) {
      const moneySymbol = variantPriceToFillElem.textContent.split('0')[0];
      variantPriceToFillElem.textContent = moneySymbol + items[0].price / 100;
    }
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
    const buttonHeight = button.clientHeight;
    button.style.height = buttonHeight + 'px';
    button.classList.add('justify-center');
    Array.from(button.children).forEach((child) => {
      if (child.classList.contains('loader')) child.classList.remove('hidden');
      else child.classList.add('hidden');
    });
  }

  hideLoader(button) {
    button.style.height = '';
    button.classList.remove('justify-center');
    Array.from(button.children).forEach((child) => {
      if (child.classList.contains('loader')) child.classList.add('hidden');
      else child.classList.remove('hidden');
    });
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
    const [variantId, variantPrice] = this.getVariantData();
    if (!this.buyButton) return;
    this.buyButton.dataset.variantId = variantId;
    this.updateFloatBuyButton(variantId);
    this.updateDisplayedPrice(variantPrice);
  };

  colorButtonSelected() {
    this.button.classList.replace('bg-main-5', 'bg-main');
    this.button.classList.add('text-secondary');
    this.dataset.selected = 'true';
  }

  unColorPreviousButtonSelected() {
    const container = this.closest('.container');
    const previousVariantPickerSelected = container.querySelector(
      'variant-picker[data-selected="true"]',
    );
    if (previousVariantPickerSelected) {
      previousVariantPickerSelected.dataset.selected = 'false';
      const previousButton =
        previousVariantPickerSelected.querySelector('button');
      previousButton.classList.replace('bg-main', 'bg-main-5');
      previousButton.classList.remove('text-secondary');
    }
  }

  getVariantData() {
    const [option1, option2, option3] = this.getOptions();
    const currentVariant = this.variantsData.find(
      (variant) =>
        variant.option1 === option1 &&
        variant.option2 === option2 &&
        variant.option3 === option3,
    );
    return [currentVariant.id, currentVariant.price];
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

  updateDisplayedPrice(newPrice) {
    const priceElem = document.getElementById('main-price');
    if (!priceElem) return;
    const moneySymbol = priceElem.dataset.moneySymbol;
    const moneyTrigram = priceElem.textContent.split(' ')[1];
    let newPriceString = '';
    if (moneyTrigram) newPriceString = moneySymbol;
    newPriceString += (Number(newPrice) / 100).toFixed(2);
    if (moneyTrigram) newPriceString += ' ' + moneyTrigram;
    priceElem.textContent = newPriceString;
  }

  updateFloatBuyButton(variantId) {
    const floatBuyButton = document.querySelector('.float-buy-button');
    if (floatBuyButton) floatBuyButton.dataset.variantId = variantId;
    else {
      const templateFloatBuyButton =
        document.getElementById('float-buy-button');
      const content = templateFloatBuyButton.content;
      const floatBuyButton = content.querySelector('.float-buy-button');
      floatBuyButton.dataset.variantId = variantId;
    }
  }
}
customElements.define('variant-picker', VariantPicker);
