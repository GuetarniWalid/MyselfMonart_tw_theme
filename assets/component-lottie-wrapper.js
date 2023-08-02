if (!window.LottieWrapperDeclared) {
  window.LottieWrapperDeclared = true;

  (async () => {
    class LottieWrapper extends HTMLElement {
      constructor() {
        super();
        this.player = this.querySelector('lottie-player');
        this.playerId = `#${this.player.id}`;
        this.shadowStyle = this.dataset.shadowStyle;
        this.mode = this.dataset?.mode;
        this.actionsInJson = this.dataset?.actions;
        if (this.actionsInJson) {
          this.actions = JSON.parse(this.actionsInJson.replaceAll('`', '"').replaceAll('-', ','));
        }
      }

      async connectedCallback() {
        const style = document.createElement('style');
        style.innerHTML = this.shadowStyle;

        await this.addShadowStyle(style);
        if (!this.mode || !this.actions) return;
        LottieInteractivity.create({
          mode: this.mode,
          player: this.playerId,
          actions: this.actions,
        });
      }

      async addShadowStyle(style) {
        return new Promise(resolve => {
          if (this.player.shadowRoot) {
            this.player.shadowRoot.appendChild(style);
            resolve();
          } else {
            const timer = setInterval(() => {
              if (this.player.shadowRoot) {
                this.player.shadowRoot.appendChild(style);
                clearInterval(timer);
                resolve();
              }
            }, 100);
          }
        });
      }
    }

    async function loadScript(FILE_URL) {
      return new Promise((resolve, reject) => {
        try {
          const scriptEle = document.createElement('script');
          scriptEle.type = 'text/javascript';
          scriptEle.defer = true;
          scriptEle.src = FILE_URL;

          scriptEle.addEventListener('load', ev => {
            resolve({ status: true });
          });

          scriptEle.addEventListener('error', ev => {
            reject({
              status: false,
              message: `Failed to load the script ＄{FILE_URL}`,
            });
          });

          document.body.appendChild(scriptEle);
        } catch (error) {
          console.error(error);
        }
      });
    }

    await loadScript('https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js');
    await loadScript('https://unpkg.com/@lottiefiles/lottie-interactivity@latest/dist/lottie-interactivity.min.js');
    customElements.define('lottie-wrapper', LottieWrapper);
  })();
}
