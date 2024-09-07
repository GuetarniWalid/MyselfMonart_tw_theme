import { forwardRef, useEffect } from 'react';
import useCalculateTotalPrice from '../../../hooks/useCalculateTotalPrice';

const Button = forwardRef(
  ({ optionSets, optionIndecesSelected, drawerOpen, handleClick, idle, message }, ref) => {
    const totalPrice = useCalculateTotalPrice(
      optionSets,
      optionIndecesSelected,
    );

    useEffect(() => {
      const intervalId = setInterval(() => {
        ref.current.classList.add('glass-anim');
        setTimeout(() => {
          ref.current?.classList.remove('glass-anim');
        }, 1500);
      }, 11000);

      return () => clearInterval(intervalId);
    }, []);

    return (
      <div className="flex-none font-bold shadow-lg">
        <button
          onClick={handleClick}
          ref={ref}
          tabIndex={drawerOpen ? 0 : -1}
          className="relative flex w-full justify-between items-center gap-3 bg-action text-secondary rounded-lg px-8 focus:outline focus:outline-orange-300 focus:outline-4 mb-4 md:mb-0 md:py-2 md:text-lg before:w-12 before:bg-white/50 before:absolute before:-top-4 before:-bottom-4 before:right-[-60px] before:rotate-12 after:w-12 after:bg-white/20 after:absolute after:-top-4 after:-bottom-4 after:rotate-12 after:right-[-60px] overflow-hidden disabled:bg-action-70 disabled:cursor-wait"
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