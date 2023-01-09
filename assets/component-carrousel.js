if (!customElements.get('snap-carrousel')) {
  class SnapCarroussel extends HTMLElement {
    defaultDistanceFromLeft = null;
    nextScrollDurationMilli = 2000;
    timer = null;
    lastLiVisible = null;
    toStopScroll = false;

    constructor() {
      super();
      console.log('constuctorrr');
      this.ul = this.querySelector('ul');
      this.liList = this.ul.querySelectorAll('li');
    }

    connectedCallback() {
      this.liList.forEach(li => {
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                clearTimeout(this.timer);
                this.waitUntilNextScroll(entry);
              }
            });
          },
          { threshold: 1 }
        );
        observer.observe(li);
      });

      this.ul.addEventListener('touchstart', this.stopScrolling.bind(this));
      this.ul.addEventListener('touchend', this.restartScrolling.bind(this));
      this.ul.addEventListener('mouseenter', this.stopScrolling.bind(this));
      this.ul.addEventListener('mouseleave', this.restartScrolling.bind(this));
    }

    waitUntilNextScroll(entry) {
      this.lastLiVisible = entry.target;
      if (this.toStopScroll) return;
      this.timer = setTimeout(() => {
        this.scroll(entry);
      }, this.nextScrollDurationMilli);
    }

    scroll(entry) {
      const isLastLi = this.checkLiPosition(entry);
      isLastLi ? this.scrollToFirstLi() : this.scrollToNextLi(entry);
    }

    checkLiPosition(entry) {
      const { target } = this.getData(entry);
      return target === this.liList[this.liList.length - 1];
    }

    scrollToNextLi(entry) {
      const { liWidth } = this.getData(entry);
      this.ul.scrollLeft = this.ul.scrollLeft + liWidth;
    }

    scrollToFirstLi() {
      this.ul.scrollLeft = 0;
    }

    getData(entry) {
      return {
        liWidth: entry.boundingClientRect.width,
        target: entry.target,
      };
    }

    stopScrolling() {
      this.toStopScroll = true;
      clearTimeout(this.timer);
    }

    restartScrolling() {
      this.toStopScroll = false;
      const entry = {
        target: this.lastLiVisible,
        boundingClientRect: { width: this.lastLiVisible.getBoundingClientRect().width },
      };
      this.waitUntilNextScroll(entry);
    }
  }
  customElements.define('snap-carrousel', SnapCarroussel);
}
