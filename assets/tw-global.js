document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.obfuscate');
  links.forEach((link) => {
    link.addEventListener('click', () => makesLinksNavigable(link), false);
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        makesLinksNavigable(link);
      }
    });
  });

  // Fixed cart button click handler
  const fixedCartButton = document.getElementById('cart-button');
  if (fixedCartButton) {
    fixedCartButton.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('openCartDrawer'));
    });
  }

  // Overlay click handler for drawers
  const overlay = document.getElementById('overlay-content');
  if (overlay) {
    overlay.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('overlayClick'));
    });
  }
});

function makesLinksNavigable(link) {
  const urlInBase64 = link.dataset.url64;
  const detination = decodeURIComponent(window.atob(urlInBase64));
  if (link.dataset.blank === 'true') {
    window.open(detination, '_blank');
  } else {
    document.location.href = detination;
  }
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

waitAnimEnd = (elem) => {
  if (!elem) return;
  return new Promise((resolve) => {
    elem?.addEventListener('transitionend', resolve);
  });
};

trapFocus = (e, firstFocusableElement, lastFocusableElement) => {
  if (e.key === 'Tab' || e.code === 9) {
    if (!lastFocusableElement) {
      firstFocusableElement.focus();
      e.preventDefault();
      return;
    }
    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus();
        e.preventDefault();
      }
    }
  }
};

function removeSkeletonOnImagesLoad(container = document) {
  const images = container.querySelectorAll('img');

  images.forEach((image) => {
    // Check if this is an LQIP image that needs to be swapped
    const fullSrcset = image.getAttribute('data-srcset');

    if (fullSrcset && image.classList.contains('lqip')) {
      // Track if we've already handled this image
      let handled = false;

      const handleLqipLoad = () => {
        if (handled) return;
        handled = true;

        // Swap to full resolution image
        image.srcset = fullSrcset;
        image.removeAttribute('data-srcset');
        image.classList.remove('lqip');

        // Trigger blur removal
        const parent = image.parentElement;
        if (parent && parent.classList.contains('skeleton')) {
          parent.classList.add('loaded');
          setTimeout(() => {
            parent.classList.remove('skeleton', 'loaded');
          }, 450);
        }
      };

      // This is an LQIP image - preload the full resolution version
      const fullImage = new Image();

      // Copy the srcset and sizes for proper responsive loading
      fullImage.srcset = fullSrcset;
      if (image.sizes) {
        fullImage.sizes = image.sizes;
      }

      fullImage.onload = handleLqipLoad;
      fullImage.onerror = handleLqipLoad; // Remove skeleton even on error

      // Handle cached images - check after setting handlers
      if (fullImage.complete) {
        handleLqipLoad();
      }

      // Fallback timeout - ensure skeleton is removed after 8 seconds max
      setTimeout(() => {
        if (!handled) {
          console.warn('LQIP fallback timeout triggered for image:', image.src);
          handleLqipLoad();
        }
      }, 8000);
    } else {
      // Regular image without LQIP - use the original logic
      const handleImageLoad = () => {
        const parent = image.parentElement;
        if (parent && parent.classList.contains('skeleton')) {
          // Add loaded class to trigger blur removal transition
          parent.classList.add('loaded');

          // Wait for transition to complete before removing skeleton
          setTimeout(() => {
            parent.classList.remove('skeleton', 'loaded');
          }, 450);
        }
      };

      if (image.complete) {
        handleImageLoad();
      } else {
        image.addEventListener('load', handleImageLoad);
        image.addEventListener('error', handleImageLoad); // Remove skeleton even on error
      }
    }
  });
}
removeSkeletonOnImagesLoad();

// Make the function globally available for infinite scroll
window.removeSkeletonOnImagesLoad = removeSkeletonOnImagesLoad;

function replacePlaceholderImages() {
  const medias = document.querySelectorAll(
    'img.placeholder, picture.placeholder source',
  );
  medias.forEach((media) => {
    // Idempotent : si data-srcset a déjà été consommé (ex. tw-global.js inclus 2x
    // sur la même page : head-base + éditorial/collapsible), ne PAS réécrire srcset.
    // Sinon setAttribute('srcset', null) pose srcset="null" -> l'image charge
    // /collections/null (404), reste cassée et figée en flou (blur-lg jamais retiré).
    const fullSrcset = media.getAttribute('data-srcset');
    if (!fullSrcset) return;
    // Handlers AVANT srcset : une image en cache peut charger de façon synchrone et
    // ne jamais déclencher onload s'il est posé après -> blur-lg jamais retiré.
    media.onload = () => media.classList.remove('blur-lg');
    media.onerror = () => media.classList.remove('blur-lg');
    media.setAttribute('srcset', fullSrcset);
    media.removeAttribute('data-srcset');
  });
}
replacePlaceholderImages();

function animBlockButton() {
  const blockBuyButtons = Array.from(document.querySelectorAll('.glass-anim'));
  
  setTimeout(() => {
    blockBuyButtons.forEach((blockBuyButton) => {
      blockBuyButton.classList.remove('glass-anim');
    });
  }, 1500);
  setInterval(() => {
    const newBlockBuyButtons = document.querySelectorAll('.glass-anim');
    if(newBlockBuyButtons.length > 0) {
      blockBuyButtons.push(...newBlockBuyButtons)
    }
    blockBuyButtons.forEach((blockBuyButton) => {
      blockBuyButton.classList.add('glass-anim');
    setTimeout(() => {
        blockBuyButton.classList.remove('glass-anim');
      }, 1500);
    });
  }, 6000);
}
animBlockButton()

function shouldDisplayKlarna() {
  const currency = window.Shopify.currency.active;
  const locale = getLocale(currency);

  if (locale === 'en-US') return false;
  if(locale === 'en-CA') return false;
  return true;
}

function getLocale() {
  const currency = window.Shopify.currency.active;
  
  if (currency === 'USD') {
    return 'en-US'; //not yet supported
  } else if (currency === 'GBP') {
    return 'en-GB';
  } else if (currency === 'CHF') {
    return 'fr-CH';
  } else if (currency === 'DKK') {
    return 'da-DK';
  } else if (currency === 'CAD') {
    return 'en-CA'; // not yet supported
  } else {
    const lang = window.Shopify.locale;
    switch (lang) {
      case 'es':
        return 'es-ES';
      case 'de':
        return 'de-DE';
      case 'it':
        return 'it-IT';
      case 'en':
        return 'en-FR';
      default:
        return 'fr-FR';
    }
  }
}

// Classes
if (!customElements.get('collapsible-tab')) {
  class CollapsibleTab extends HTMLElement {
    constructor() {
      super();
      this.accordions = this.querySelectorAll('.accordion');
      this.section = this.closest('section');
    }

    connectedCallback() {
      this.accordions.forEach((accordion) => {
        accordion.addEventListener('click', this.toggleAccordions);
      });
    }

    toggleAccordions = (e) => {
      const targetDetail = e.target.closest('.accordion');
      if (!targetDetail) return;

      // Laisser passer les éléments interactifs imbriqués (lien, bouton,
      // champ de formulaire) pour qu'ils gardent leur comportement natif
      // sans déclencher l'open/close de l'accordéon.
      if (e.target.closest('a, button, input, textarea, select, label')) {
        return;
      }

      const clickedSummary = e.target.closest('summary') !== null;
      const isOpen = targetDetail.hasAttribute('open');

      // On prend le contrôle complet du toggle : on prévient la bascule
      // native du <details> (sur summary) pour pouvoir aussi refermer les
      // autres accordéons (single-open) sans concurrence avec le browser.
      e.preventDefault();

      if (clickedSummary) {
        // Click sur l'entête : toggle l'élément et ferme les frères.
        if (isOpen) {
          targetDetail.removeAttribute('open');
        } else {
          this.accordions.forEach((a) => a.removeAttribute('open'));
          targetDetail.setAttribute('open', '');
        }
      } else if (isOpen) {
        // Click n'importe où dans le corps d'un accordéon ouvert : on referme.
        targetDetail.removeAttribute('open');
      }
    };
  }
  customElements.define('collapsible-tab', CollapsibleTab);
}
