if (!customElements.get('breadcrumb-popup')) {
  class BreadcrumbPopup extends HTMLElement {
    constructor() {
      super();
      this.button = this.querySelector('.breadcrumb-ellipsis');
      this.popupContainer = document.querySelector('.breadcrumb-popup-container');
      this.popupList = this.popupContainer?.querySelector('.breadcrumb-popup-list');
      this.isPopupOpen = false;
    }

    connectedCallback() {
      if (!this.button || !this.popupContainer) return;

      // Populate popup with hidden links
      this.populatePopup();

      // Setup interactions
      this.setupInteractions();
    }

    populatePopup() {
      if (!this.popupList) return;

      this.popupList.innerHTML = '';

      // Get home link
      const homeLink = this.querySelector('a[href="/"]');
      if (homeLink) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = homeLink.href;
        link.textContent = homeLink.dataset.text;
        link.className = 'block px-4 py-2 text-sm text-main hover:text-[#0b179e] hover:underline hover:underline-offset-2 hover:bg-main-5 transition-colors duration-150 no-underline';
        li.appendChild(link);
        this.popupList.appendChild(li);
      }

      // Get all links in breadcrumb-middle-items that are hidden on mobile
      const middleItems = this.querySelector('.breadcrumb-middle-items');
      if (middleItems) {
        const links = middleItems.querySelectorAll('a');

        links.forEach(link => {
          const classes = link.className;
          if (classes.includes('hidden md:inline') || classes.includes('md:inline')) {
            const li = document.createElement('li');
            const newLink = document.createElement('a');
            newLink.href = link.href;
            newLink.textContent = link.textContent;
            newLink.className = 'block px-4 py-2 text-sm text-main hover:text-[#0b179e] hover:underline hover:underline-offset-2 hover:bg-main-5 transition-colors duration-150 no-underline';

            li.appendChild(newLink);
            this.popupList.appendChild(li);
          }
        });
      }
    }

    setupInteractions() {
      // Toggle popup on button click
      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePopup();
      });

      // Close popup when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.popupContainer.contains(e.target) && !this.button.contains(e.target) && this.isPopupOpen) {
          this.closePopup();
        }
      });

      // Close popup on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isPopupOpen) {
          this.closePopup();
        }
      });
    }

    togglePopup() {
      if (this.isPopupOpen) {
        this.closePopup();
      } else {
        this.openPopup();
      }
    }

    openPopup() {
      // Position popup below button
      const buttonRect = this.button.getBoundingClientRect();
      this.popupContainer.style.left = `${buttonRect.left}px`;
      this.popupContainer.style.top = `${buttonRect.bottom + 4}px`;

      this.popupContainer.classList.remove('invisible', 'opacity-0');
      this.popupContainer.classList.add('opacity-100');
      this.isPopupOpen = true;
    }

    closePopup() {
      this.popupContainer.classList.add('invisible', 'opacity-0');
      this.popupContainer.classList.remove('opacity-100');
      this.isPopupOpen = false;
    }
  }

  customElements.define('breadcrumb-popup', BreadcrumbPopup);
}
