class RadioBundle extends HTMLElement {
  constructor() {
    super();
    this.id = this.dataset.id;
    this.productForm = this.querySelector('product-form');
  }

  connectedCallback() {
    this.productForm.isInsideBundle = true;

    this.addEventListener('click', () => {
      this.sendSelectEvent();
      this.getVariantPickersSelected();
      this.sendVariantsSelectedToProductForm();
    });

    document.body.addEventListener('bundle-selected', e => {
      const id = e.id;
      const interactiveContainer = this.querySelector('.interactive-container');

      if (id === this.id) {
        interactiveContainer.classList.remove('hide');
        this.querySelector('.select-indicator').classList.add('selected');
      } else {
        interactiveContainer.classList.add('hide');
        this.querySelector('.select-indicator').classList.remove('selected');
      }
    });

    this.initAtFirstDisplay();
  }

  sendSelectEvent() {
    const bundleSelected = new Event('bundle-selected');
    bundleSelected.id = this.id;
    document.body.dispatchEvent(bundleSelected);
  }

  getVariantPickersSelected() {
    let variantPickers = Array.from(this.querySelectorAll('variant-radios'));
    if (variantPickers.length === 0) {
      variantPickers = Array.from(this.querySelectorAll('variant-selects'));
    }

    this.variantsSelected = variantPickers.map(variantPicker => {
      variantPicker.updateOptions();
      variantPicker.updateMasterId();
      return variantPicker.currentVariant.id;
    });
  }

  sendVariantsSelectedToProductForm() {
    this.productForm.variantsSelected = this.variantsSelected;
  }

  initAtFirstDisplay() {
    if (this.nextElementSibling.src?.includes('bundle')) this.sendSelectEvent()
  }
}

customElements.define('radio-bundle', RadioBundle);
