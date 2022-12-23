class LAzyVideo extends HTMLElement {

  connectedCallback() {
    const lazyVideo = this.querySelector('video.lazy');

    if ('IntersectionObserver' in window) {
      const lazyVideoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (video) {
          if (video.isIntersecting) {
            for (const source in video.target.children) {
              const videoSource = video.target.children[source];
              if (typeof videoSource.tagName === 'string' && videoSource.tagName === 'SOURCE') {
                videoSource.src = videoSource.dataset.src;
              }
            }

            lazyVideo.load();
            lazyVideo.classList.remove('lazy');
            lazyVideoObserver.unobserve(video.target);
          }
        });
      });

        lazyVideoObserver.observe(lazyVideo);
    }
  }
}

customElements.define('lazy-video', LAzyVideo);