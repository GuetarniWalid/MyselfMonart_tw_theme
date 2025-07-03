import { forwardRef } from 'react';
import useIsMobile from '../../../hooks/useIsMobile';
import { useVariantSelected } from '../../../store/variantSelected';

const Button = forwardRef(({ drawerOpen, handleClick, idle, message }, ref) => {
  const isMobile = useIsMobile();
  const [variantPrice] = useVariantSelected.price();
  const [upsells] = useVariantSelected.upsells();
  const upsellsPrice = upsells.reduce((acc, curr) => acc + curr.price, 0);
  const totalPrice = variantPrice + upsellsPrice;
  const discountedPrice = Product.getPriceDiscounted(
    totalPrice,
    window.promotion.discount,
    window.promotion.discountUnit,
  );

  // Function to unescape HTML entities
  const unescapeMessage = (text) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleClick(event);
    }
    if (event.key === 'Tab' && !event.shiftKey && isMobile) {
      event.preventDefault();
      document.getElementById('addons-drawer-close-button').focus();
    }
    if (event.key === 'Tab' && !isMobile) {
      event.preventDefault();
      document.getElementById('addons-drawer-close-button').focus();
    }
  }

  return (
    <div className="flex-none font-bold">
      <div className="pr-3">
        <button
          id="react-buy-button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          ref={ref}
          tabIndex={drawerOpen ? 0 : -1}
          className="cart-button py-0 flex items-center justify-between group glass-anim"
          disabled={idle}
        >
          <span className="promotion-in-cart-button inline-flex w-full items-center justify-between gap-2">
            <span className="relative inline-block whitespace-nowrap">
              <span
                className={`cart-button-text inline-block pointer-events-none py-4 md:py-5 whitespace-nowrap ${
                  window.promotion.reason ? 'buy-button-top-anim' : ''
                } transition-transform duration-300 ease-in-out`}
              >
                {unescapeMessage(message)}
              </span>
              {window.promotion.reason && (
                <span className="promotion-reason-text inline-block py-4 md:py-5 absolute bottom-0 left-0 transition-transform duration-300 ease-in-out buy-button-bottom-anim whitespace-nowrap">
                  {window.promotion.reason}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap inline-flex gap-2 items-center">
              <span className="relative inline-block">
                <span className="inline-block py-4 md:py-5 transition-transform duration-300 ease-in-out buy-button-top-anim">
                  <span className="crossed-price relative crossed-line-anim before:absolute before:top-1/2 before:bg-main before:left-0 before:w-full before:h-[2px] before:rounded-2xl min-w-16 whitespace-nowrap">
                    {Product.formatPrice(totalPrice, true, false)}
                  </span>
                </span>
                <span className="main-price inline-block py-4 md:py-5 transition-transform duration-300 ease-in-out buy-button-bottom-anim absolute bottom-0 right-0 text-right whitespace-nowrap">
                  {Product.formatPrice(discountedPrice, true, false)}
                </span>
              </span>
              <span className="reduction-price inline-block bg-red-600 border-main border-neu text-sm text-secondary rounded-lg px-3 py-2 whitespace-nowrap shadow-neu-sm">
                -{' '}
                {window.promotion.discountUnit === '%'
                  ? `${window.promotion.discount} %`
                  : Product.formatPrice(
                      window.promotion.discount,
                      false,
                      false,
                    )}
              </span>
            </span>
          </span>
        </button>
      </div>
      {window.promotion.date && (
        <div className="relative bg-white z-10 flex items-center justify-center py-1 pt-2 md:pt-1 md:border-1 border-main md:rounded-md mt-4 before:absolute before:left-1/2 before:-translate-x-1/2 before:bg-white before:inset-0 before:w-screen before:-z-10 md:before:hidden">
          <span>{window.promotion.date}</span>
        </div>
      )}
    </div>
  );
});

export default Button;
