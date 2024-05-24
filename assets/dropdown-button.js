if (!customElements.get('dropdown-button')) {
  class DropdownButton extends HTMLElement {
    constructor() {
      super();
      this.dropdownButtonTarget = document.querySelector(
        '.dropdown-button-target',
      );
      this.showButton = this.firstElementChild;
      this.hideButton = this.lastElementChild;
    }

    connectedCallback() {
      this.showButton.addEventListener('click', () => {
        this.dropdownButtonTarget.classList.remove('h-56');
        this.dropdownButtonTarget.classList.remove('after:bg-gradient-to-t');
        this.showButton.classList.add('hidden');
        this.hideButton.classList.remove('hidden');
      });

      this.hideButton.addEventListener('click', () => {
        this.dropdownButtonTarget.classList.add('h-56');
        this.dropdownButtonTarget.classList.add('after:bg-gradient-to-t');
        this.showButton.classList.remove('hidden');
        this.hideButton.classList.add('hidden');
      });
    }
  }
  customElements.define('dropdown-button', DropdownButton);
}
