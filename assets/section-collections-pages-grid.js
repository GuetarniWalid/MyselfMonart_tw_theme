if (!window.collectionGridExist) {
  if (!window.boxes) {
    window.collectionGridExist = true
    window.boxes = document.querySelectorAll('.collections-pages-grid .one-collection');

    window.boxes.forEach((box) => {
      box
        .querySelector('.show-more')
        ?.addEventListener('click', (e) => toggleTextWrapper(box));

      box
        .querySelector('.close')
        ?.addEventListener('click', () => toggleTextWrapper(box));
    });

    function toggleTextWrapper(box) {
      box.querySelector('.paragraph').classList.toggle('hidden');
    }
  }
}
