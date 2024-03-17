document.addEventListener('shopify:block:select', function (event) {
  const blockSelectedIsSlide = event.target.classList.contains('slideshow__slide');
  if (!blockSelectedIsSlide) return;

  const parentSlideshowComponent = event.target.closest('slideshow-component');
  parentSlideshowComponent.pause();

  setTimeout(function () {
    parentSlideshowComponent.slider.scrollTo({
      left: event.target.offsetLeft,
    });
  }, 200);
});

document.addEventListener('shopify:block:deselect', function (event) {
  const blockDeselectedIsSlide = event.target.classList.contains('slideshow__slide');
  if (!blockDeselectedIsSlide) return;
  const parentSlideshowComponent = event.target.closest('slideshow-component');
  if (parentSlideshowComponent.autoplayButtonIsSetToPlay) parentSlideshowComponent.play();
});

//cart drawer section
let cartDrawerOpen = false;
let innerCartDrawerTransition;
document.addEventListener('shopify:section:select', function (event) {
  const cartDrawer = event.target.querySelector('cart-drawer');
  if (event.detail.sectionId === 'cart-drawer') {
    if (cartDrawerOpen) {
      const drawerInner = cartDrawer.querySelector('.drawer__inner');
      innerCartDrawerTransition = 'transform var(--duration-default) ease;';
      drawerInner.style.transition = 'none';
    }
    const cartLink = document.querySelector('#cart-icon-bubble');
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartDrawer.open(cartLink);
    cartDrawerOpen = true;
  }
});

document.addEventListener('shopify:section:deselect', function (event) {
  if (event.detail.sectionId === 'cart-drawer') {
    const cartDrawer = event.target.querySelector('cart-drawer');
    if (innerCartDrawerTransition) {
      const drawerInner = cartDrawer.querySelector('.drawer__inner');
      drawerInner.style = `transition: ${innerCartDrawerTransition}`;
    }
    cartDrawer.closest('cart-drawer').close();
    cartDrawerOpen = false;
    innerCartDrawerTransition = null;
  }
});
