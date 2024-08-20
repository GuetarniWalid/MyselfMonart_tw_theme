if (!customElements.get('customer-testimonial')) {
  class CustomerTestimonial extends HTMLElement {
    constructor() {
      super();
      this.message = this.querySelector('.message p');
      this.image = this.querySelector('img,svg');
      this.durationImageAppearanceInMs = Number(this.querySelector('div[data-duration-appearance]').dataset.durationAppearance + '000');
      this.currentIndex = 0;
      this.extractDynamicContent();
      setTimeout(() => {
        this.startLoop();
      }, this.durationImageAppearanceInMs);
    }

    extractDynamicContent() {
      const bindStrings = JSON.parse(this.querySelector('.content').textContent);
      const content = bindStrings.map(bindString => {
        const separeteString = bindString.split('|||');
        return {
          text: separeteString[0].slice(1)?.trim(),
          image: separeteString[1]?.trim(),
          alt: separeteString[2]?.trim(),
        };
      });
      this.content = content;
    }

    startLoop() {
      this.currentIndex = (this.currentIndex + 1) % this.content.length;
      this.render();
    }

    async render() {
      const { text, image, alt } = this.content[this.currentIndex];
      this.blurImage();
      this.downloadImage(image, alt);
      this.unblurImage(image);
      await this.simulateHumanWriting(text);
      await this.wait(this.durationImageAppearanceInMs);
      this.startLoop();
    }

    blurImage() {
      this.image.classList.add('blur-lg');
    }

    downloadImage(image, alt) {
      this.image.src = image;
      this.image.alt = alt;
    }

    simulateHumanWriting(text) {
      return new Promise(resolve => {
        let index = 0;
        const timer = setInterval(() => {
          this.message.textContent = text.slice(0, index);
          index++;
          if (index > text.length) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    }

    async unblurImage() {
      await this.wait(2000);
      this.image.classList.remove('blur-lg');
    }

    wait(ms) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, ms);
      });
    }
  }

  customElements.define('customer-testimonial', CustomerTestimonial);
}
