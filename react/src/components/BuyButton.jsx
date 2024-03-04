import { useEffect, useRef } from 'react';
import useCalculateTotalPrice from '../hooks/useCalculateTotalPrice';
import useProductFormatter from '../hooks/useProductFormatter';

export default function BuyButton({
  optionSets,
  optionIndexListSelected,
  drawerOpen,
}) {
  const buttonRef = useRef(null);
  const totalPrice = useCalculateTotalPrice(
    optionSets,
    optionIndexListSelected,
  );
  const product = useProductFormatter(optionSets, optionIndexListSelected);

  useEffect(() => {
    const intervalId = setInterval(() => {
      buttonRef.current.classList.add('glass-anim');
      setTimeout(() => {
        buttonRef.current?.classList.remove('glass-anim');
      }, 1500);
    }, 11000);

    return () => clearInterval(intervalId);
  }, []);

  async function handleClick() {
    try {
      const response = await fetch('http://127.0.0.1:3333/api/product/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) { 
      console.log(error);
    }
  }

  return (
    <div className="flex-none font-bold shadow-lg">
      <button
        onClick={handleClick}
        ref={buttonRef}
        tabIndex={drawerOpen ? 0 : -1}
        className="relative flex w-full justify-between items-center gap-3 bg-action text-secondary rounded-lg px-8 focus:outline focus:outline-orange-300 focus:outline-4 mb-4 md:mb-0 md:py-2 md:text-lg before:w-12 before:bg-white/50 before:absolute before:-top-4 before:-bottom-4 before:right-[-60px] before:rotate-12 after:w-12 after:bg-white/20 after:absolute after:-top-4 after:-bottom-4 after:rotate-12 after:right-[-60px] overflow-hidden"
      >
        Ajouter au panier
        <span className=" py-4 block h-full">
          Total:&nbsp;&nbsp; {totalPrice} {moneySymbol}
        </span>
      </button>
    </div>
  );
}
