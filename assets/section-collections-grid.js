const boxes = document.querySelectorAll('.shopify-section.collections-grid .one-collection');

boxes.forEach(box => {
  box.querySelector('.collection-title > button')?.addEventListener('click', (e) => {
    // stop bubbling
    e.stopPropagation();
    return toggleTextWrapper(box);
  });
  box.querySelector('.paragraph button')?.addEventListener('click', () => toggleTextWrapper(box));
  box.querySelector('.collection-title')?.addEventListener('click', () => {
    window.location = box.querySelector('a:first-child')?.href;
  })
});

function toggleTextWrapper(box) {
  box.querySelector('.paragraph').classList.toggle('full-height');
}
