const boxes = document.querySelectorAll('.shopify-section.collections-grid .one-collection');

boxes.forEach(box => {
  box.querySelector('.collection-title > button')?.addEventListener('click', () => {
    return toggleTextWrapper(box);
  });
  box.querySelector('.paragraph button')?.addEventListener('click', () => toggleTextWrapper(box));
});

function toggleTextWrapper(box) {
  box.querySelector('.paragraph').classList.toggle('full-height');
}
