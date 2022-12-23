if (!customElements.get('dynamic-image-text')) {
  class DynamicImageText extends HTMLElement {
    constructor() {
      super();
      this.message = this.querySelector('.message p');
      this.image = this.querySelector('img');
      this.durationImageAppearanceInMs = Number(this.querySelector('.wrapper-image-message').dataset.durationAppearance + '000');
      this.currentIndex = 0;
      this.extractDynamicContent();
      setTimeout(() => {
        this.startLoop();
      }, this.durationImageAppearanceInMs);
    }

    extractDynamicContent() {
      const bindStrings = JSON.parse(this.querySelector('.content').textContent);
      const content = bindStrings.map(bindString => {
        const separeteString = bindString.split('|');
        return {
          text: separeteString[0].slice(1),
          image: separeteString[1],
        };
      });
      this.content = content;
    }

    startLoop() {
      this.currentIndex = (this.currentIndex + 1) % this.content.length;
      this.render();
    }

    async render() {
      const { text, image } = this.content[this.currentIndex];
      this.blurImage();
      this.downloadImage(image);
      await this.simulateHumanWriting(text);
      this.unblurImage(image);
      await this.wait(this.durationImageAppearanceInMs);
      this.startLoop();
    }

    blurImage() {
      this.image.classList.remove('active');
    }

    downloadImage(image) {
      this.image.src = image;
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

    unblurImage() {
      this.image.classList.add('active');
    }

    wait(ms) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, ms);
      });
    }
  }

  customElements.define('dynamic-image-text', DynamicImageText);
}
