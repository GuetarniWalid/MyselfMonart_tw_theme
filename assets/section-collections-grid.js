if (!window.boxes) {
  window.boxes = document.querySelectorAll('.collections-grid .one-collection');

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
