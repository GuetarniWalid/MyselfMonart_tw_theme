if (!customElements.get('mansory-grid')) {
  class ErrorCard extends HTMLElement {
    constructor() {
      super();
      this.error = this.querySelector('.error');
      this.crossButton = this.error.querySelector('.error svg');
      this.errorDuration = this.dataset.errorDuration * 1000;
    }

    connectedCallback() {
      this.crossButton.addEventListener('click', () => {
        this.hideError();
      });

      document.body.addEventListener('new-error', e => {
        this.showError(e.detail.message);
      });
    }

    showError(message) {
      this.error.classList.remove('hidden');
      this.error.classList.add('bounce');
      this.error.querySelector('p').textContent = message;
      this.timer = setTimeout(() => {
        this.hideError();
      }, this.errorDuration);
    }

    hideError() {
      this.error.classList.add('hidden');
      this.error.classList.remove('bounce');
      clearTimeout(this.timer);
    }
  }

  customElements.define('error-card', ErrorCard);
}
