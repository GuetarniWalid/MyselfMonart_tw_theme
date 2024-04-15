import { useEffect, useRef, useState } from 'react';
import useCalculateTotalPrice from '../hooks/useCalculateTotalPrice';
import useProductFormatter from '../hooks/useProductFormatter';

export default function BuyButton({
  optionSets,
  optionIndexListSelected,
  drawerOpen,
}) {
  const [idle, setIdle] = useState(false);
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

  async function updateProduct() {
    const serverUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3333' : 'https://backend.myselfmonart.com';
    const response = await fetch(serverUrl + '/api/product/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const json = await response.json();
    return json.newVariantId;
  }

  async function makeOrder(variantID) {
    const response = await fetch(
      'https://' +
        Shopify.shop +
        '/cart/add.js?sections=tw-cart-drawer,tw-header',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ id: variantID, quantity: 1 }],
        }),
      },
    );
    if (!response.ok) throw new Error("Une erreur inattendu s'est produite.");
    const json = await response.json();
    renderNewSections(json);
    const closeButton = document.getElementById('addons-drawer-close-button');
    closeButton.click();
    setTimeout(() => {
      const cartDrawerButton = document.getElementById('cart-button');
      cartDrawerButton.click();
    }, 300);
  }

  async function handleClick() {
    setIdle(true);
    try {
      const variantCreatedID = await updateProduct();
      await makeOrder(variantCreatedID);
    } catch (error) {
      console.log(error);
    } finally {
      setIdle(false);
    }
  }

  function renderNewSections(json) {
    const bubble = document.getElementById('bubble-nb-product');
    const newBubble = getSectionInnerJSON(
      json.sections['tw-header'],
      '#bubble-nb-product',
    );
    bubble.innerHTML = newBubble;

    const sectionDrawer = document.getElementById(
      'shopify-section-tw-cart-drawer',
    );
    const newSectionDrawer = getSectionInnerJSON(
      json.sections['tw-cart-drawer'],
      '#shopify-section-tw-cart-drawer',
    );
    sectionDrawer.innerHTML = newSectionDrawer;
  }

  function getSectionInnerJSON(json, selector) {
    return new DOMParser()
      .parseFromString(json, 'text/html')
      .querySelector(selector).innerHTML;
  }

  return (
    <div className="flex-none font-bold shadow-lg">
      <button
        onClick={handleClick}
        ref={buttonRef}
        tabIndex={drawerOpen ? 0 : -1}
        className="relative flex w-full justify-between items-center gap-3 bg-action text-secondary rounded-lg px-8 focus:outline focus:outline-orange-300 focus:outline-4 mb-4 md:mb-0 md:py-2 md:text-lg before:w-12 before:bg-white/50 before:absolute before:-top-4 before:-bottom-4 before:right-[-60px] before:rotate-12 after:w-12 after:bg-white/20 after:absolute after:-top-4 after:-bottom-4 after:rotate-12 after:right-[-60px] overflow-hidden disabled:bg-action/70 disabled:cursor-wait"
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
          'Ajouter au panier'
        )}
        <span className=" py-4 block h-full">
          Total:&nbsp;&nbsp; {totalPrice} {moneySymbol}
        </span>
      </button>
    </div>
  );
}
