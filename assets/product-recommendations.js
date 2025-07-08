if (!customElements.get('product-recommendations')) {
  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      const handleIntersection = (entries, observer) => {
        if (!entries[0].isIntersecting) return;

        observer.unobserve(this);

        const url = this.dataset.url;

        fetch(url)
          .then((response) => response.text())
          .then((text) => {
            const html = document.createElement('div');
            html.innerHTML = text;
            const recommendations = html.querySelector(
              '.product-recommendations',
            );

            if (recommendations && recommendations.innerHTML.trim().length) {
              const collection =
                window.location.pathname.includes('collections') &&
                window.location.pathname.split('collections/')[1].split('/')[0];

              if (collection) {
                const aElemList = recommendations.querySelectorAll('a');
                aElemList.forEach((aElem) => {
                  aElem.setAttribute(
                    'href',
                    '/collections/' + collection + aElem.getAttribute('href'),
                  );
                });
              }

              this.querySelector('.product-recommendations').innerHTML =
                recommendations.innerHTML;
            }
          })
          .catch((e) => {
            console.error(e);
          });
      };

      const observer = new IntersectionObserver(handleIntersection, {
        rootMargin: '0px 0px 200px 0px',
      });
      observer.observe(this);
    }
  }
  customElements.define('product-recommendations', ProductRecommendations);
}
