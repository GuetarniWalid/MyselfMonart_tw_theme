const handleIntersection = (entries, observer) => {
    if (!entries[0].isIntersecting) return;
    
    observer.unobserve(productRecommendationsSection);
    
    const url = productRecommendationsSection.dataset.url;

    fetch(url)
      .then(response => response.text())
      .then(text => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('.product-recommendations');

        if (recommendations && recommendations.innerHTML.trim().length) {
          const collection = window.location.pathname.includes('collections') && window.location.pathname.split('collections/')[1].split('/')[0];

          if(collection) {
            const aElemList = recommendations.querySelectorAll('a')
            aElemList.forEach(aElem => {
              aElem.setAttribute('href', '/collections/' + collection + aElem.getAttribute('href'))
            })
          }
          
          productRecommendationsSection.innerHTML = recommendations.innerHTML;
        }
      })
      .catch(e => {
        console.error(e);
      });
  };

  const productRecommendationsSection = document.querySelector('.product-recommendations');
  const observer = new IntersectionObserver(handleIntersection, {rootMargin: '0px 0px 200px 0px'});

  observer.observe(productRecommendationsSection);