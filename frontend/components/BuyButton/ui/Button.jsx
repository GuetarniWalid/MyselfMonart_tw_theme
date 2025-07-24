import { forwardRef } from 'react';
import useIsMobile from '../../../hooks/useIsMobile';
import { useVariantSelected } from '../../../store/variantSelected';
import Klarna from './Klarna';

const Button = forwardRef(
  ({ drawerOpen, handleClick, idle, message }, ref) => {
    const isMobile = useIsMobile();
    const [variantPrice] = useVariantSelected.price();
    const [upsells] = useVariantSelected.upsells();
    const upsellsPrice = upsells.reduce((acc, curr) => acc + curr.price, 0);
    const totalPrice = variantPrice + upsellsPrice;

    // Function to unescape HTML entities
    const unescapeMessage = (text) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    };

    function handleKeyDown(event) {
      if(event.key === 'Enter') {
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
      <div className="flex-none font-bold pr-3 mb-2">
        <button
          id='react-buy-button'
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          ref={ref}
          tabIndex={drawerOpen ? 0 : -1}
          className="cart-button py-0 flex items-center justify-between group glass-anim md:mb-5"
          disabled={idle}
        >
          {idle ? (
            <>
              <span className="-translate-y-2">
                <span className="rounded-full inline-block w-2 h-2 bg-secondary animate-loading mr-1">
                  {' '}
                </span>
                <span className="rounded-full inline-block w-2 h-2 bg-secondary animate-[loading_0.6s_0.2s_linear_infinite] mr-1">
                  {' '}
                </span>
                <span className="rounded-full inline-block w-2 h-2 bg-secondary animate-[loading_0.6s_0.3s_linear_infinite]">
                  {' '}
                </span>
              </span>
            </>
          ) : (
            unescapeMessage(message)
          )}
          <span className="py-4 block h-full">
            {unescapeMessage(window.react.buyButton.total)}:&nbsp;&nbsp; {Product.formatPrice(totalPrice, true, false)}
          </span>
        </button>
        <Klarna purchaseAmount={totalPrice} />
      </div>
    );
  },
);

export default Button;