import { forwardRef, useEffect } from 'react';
import useIsMobile from '../../../hooks/useIsMobile';
import { useVariantSelected } from '../../../store/variantSelected';

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

    useEffect(() => {
      const intervalId = setInterval(() => {
        ref.current.classList.add('glass-anim');
        setTimeout(() => {
          ref.current?.classList.remove('glass-anim');
        }, 1500);
      }, 11000);

      return () => clearInterval(intervalId);
    }, []);

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
      <div className="flex-none font-bold">
        <button
          id='react-buy-button'
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          ref={ref}
          tabIndex={drawerOpen ? 0 : -1}
          className="relative flex w-full md:mx-auto justify-between items-center gap-3 bg-action outline outline-1 outline-action text-secondary backdrop-blur-xl rounded-lg px-8 focus:outline focus:outline-orange-500 focus:outline-2 mb-4 md:mb-0 md:py-2 md:text-md lg:text-lg before:w-12 before:bg-white/50 before:absolute before:-top-4 before:-bottom-4 before:right-[-60px] before:rotate-12 after:w-12 after:bg-white/20 after:absolute after:-top-4 after:-bottom-4 after:rotate-12 after:right-[-60px] overflow-hidden disabled:bg-action-70 disabled:outline-none disabled:cursor-wait"
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
      </div>
    );
  },
);

export default Button;