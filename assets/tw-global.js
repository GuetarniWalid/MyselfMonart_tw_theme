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

function removeSkeletonOnImagesLoad() {
  const images = document.querySelectorAll('img');

  images.forEach((image) => {
    if (image.complete) {
      image.parentElement.classList.remove('skeleton');
    } else {
      image.addEventListener('load', () => {
        image.parentElement?.classList.remove('skeleton');
      });
    }
  });
}
removeSkeletonOnImagesLoad();

function replacePlaceholderImages() {
  const medias = document.querySelectorAll(
    'img.placeholder, picture.placeholder source',
  );
  medias.forEach((media) => {
    media.setAttribute('srcset', media.getAttribute('data-srcset'));
    media.removeAttribute('data-srcset');
    media.onload = () => {
      media.classList.remove('blur-lg');
    };
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
      if (
        e.target.closest('summary').tagName.toLowerCase() === 'summary' &&
        targetDetail.hasAttribute('open')
      ) {
        return;
      }

      this.accordions.forEach((accordion) => {
        if (accordion === e.target) {
          accordion.toggleAttribute('open');
        } else {
          accordion.removeAttribute('open');
        }
      });
    };
  }
  customElements.define('collapsible-tab', CollapsibleTab);
}
