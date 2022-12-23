if (!customElements.get('dropdown-button')) {
    class DropdownButton extends HTMLElement {
        connectedCallback() {
          this.querySelector('button').addEventListener('click', (e) => {
            this.previousElementSibling.firstElementChild.classList.toggle('close')
            e.target.classList.toggle('down')
          })
        }
    }

    customElements.define('dropdown-button', DropdownButton);
}
