if (!customElements.get('pickup-availability')) {
  customElements.define('pickup-availability', class PickupAvailability extends HTMLElement {
    constructor() {
      super();

      if(!this.hasAttribute('available')) return;

      this.errorHtml = this.querySelector('template').content.firstElementChild.cloneNode(true);
      this.onClickRefreshList = this.onClickRefreshList.bind(this);
      this.fetchAvailability(this.dataset.variantId);
    }

    fetchAvailability(variantId) {
      let rootUrl = this.dataset.rootUrl;
      if (!rootUrl.endsWith("/")) {
        rootUrl = rootUrl + "/";
      }
      const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

      fetch(variantSectionUrl)
        .then(response => response.text())
        .then(text => {
          const sectionInnerHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('.shopify-section');
          this.renderPreview(sectionInnerHTML);
        })
        .catch(e => {
          const button = this.querySelector('button');
          if (button) button.removeEventListener('click', this.onClickRefreshList);
          this.renderError();
        });
    }

    onClickRefreshList(evt) {
      this.fetchAvailability(this.dataset.variantId);
    }

    renderError() {
      this.innerHTML = '';
      this.appendChild(this.errorHtml);

      this.querySelector('button').addEventListener('click', this.onClickRefreshList);
    }

    renderPreview(sectionInnerHTML) {
      const drawer = document.querySelector('pickup-availability-drawer');
      if (drawer) drawer.remove();
      if (!sectionInnerHTML.querySelector('pickup-availability-preview')) {
        this.innerHTML = "";
        this.removeAttribute('available');
        return;
      }

      this.innerHTML = sectionInnerHTML.querySelector('pickup-availability-preview').outerHTML;
      this.setAttribute('available', '');

      document.body.appendChild(sectionInnerHTML.querySelector('pickup-availability-drawer'));

      const button = this.querySelector('button');
      if (button) button.addEventListener('click', (evt) => {
        document.querySelector('pickup-availability-drawer').show(evt.target);
      });
    }
  });
}

if (!customElements.get('pickup-availability-drawer')) {
  customElements.define('pickup-availability-drawer', class PickupAvailabilityDrawer extends HTMLElement {
    constructor() {
      super();

      this.onBodyClick = this.handleBodyClick.bind(this);

      this.querySelector('button').addEventListener('click', () => {
        this.hide();
      });

      this.addEventListener('keyup', (event) => {
        if(event.code.toUpperCase() === 'ESCAPE') this.hide();
      });

      // Piège de focus : même mécanique que cart-drawer.js:19 — un handler `keydown` qui
      // délègue au trapFocus global (assets/tw-global.js), lequel attend un ÉVÉNEMENT.
      this.addEventListener('keydown', (e) => {
        if (!this.hasAttribute('open')) return;
        const focusables = this.focusableElements();
        if (!focusables.length) return;
        trapFocus(e, focusables[0], focusables[focusables.length - 1]);
      });
    }

    focusableElements() {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(this.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
    }

    handleBodyClick(evt) {
      const target = evt.target;
      if (target != this && !target.closest('pickup-availability-drawer') && target.id != 'ShowPickupAvailabilityDrawer') {
        this.hide();
      }
    }

    hide() {
      this.removeAttribute('open');
      document.body.removeEventListener('click', this.onBodyClick);
      document.body.classList.remove('overflow-hidden');
      removeTrapFocus(this.focusElement);
    }

    show(focusElement) {
      this.focusElement = focusElement;
      this.setAttribute('open', '');
      document.body.addEventListener('click', this.onBodyClick);
      document.body.classList.add('overflow-hidden');
      // Le drawer porte tabindex="-1" et role="dialog" (sections/pickup-availability.liquid:34) :
      // on lui donne le focus, le piège Tab est posé en keydown dans le constructeur.
      this.focus();
    }
  });
}
