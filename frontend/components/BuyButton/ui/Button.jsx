import { forwardRef, useEffect } from 'react';
import useCalculateTotalPrice from '../../../hooks/useCalculateTotalPrice';
import useIsMobile from '../../../hooks/useIsMobile';

const Button = forwardRef(
  ({ optionSets, optionIndecesSelected, drawerOpen, handleClick, idle, message, CloseButtonRef }, ref) => {
    const totalPrice = useCalculateTotalPrice(
      optionSets,
      optionIndecesSelected,
    );
    const isMobile = useIsMobile();

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
      // if(event.key === 'Enter') {
      //   handleClick(event);
      // }
      if (event.key === 'Tab' && isMobile) {
        event.preventDefault();
        CloseButtonRef.current.focus();
      }
    }

    return (
      <div className="flex-none font-bold">
        <button
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
            message
          )}
          <span className=" py-4 block h-full">
            Total:&nbsp;&nbsp; {totalPrice} {moneySymbol}
          </span>
        </button>
      </div>
    );
  },
);

export default Button;