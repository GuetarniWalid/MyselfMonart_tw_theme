import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AddCustomerDetailsPopup from '../AddCustomerDetailsPopup';
import Button from './ui/Button';
import { makeOrder } from './data/makeOrder';
import { useVariantSelected } from '../../store/variantSelected';

export default function BuyButton({
  drawerOpen,
  withCustomerDetails = false,
  beforeAddProductToCartFunction = () => true,
}) {
  const [idle, setIdle] = useState(false);
  const [showAddCustomerDetailsPopup, setShowAddCustomerDetailsPopup] =
    useState(false);
  const buttonRef = useRef(null);
  const [items] = useVariantSelected.items();

  function showCustomerDetailsPopup() {
    buttonRef.current.classList.add('hidden');
    setShowAddCustomerDetailsPopup(true);
  }

  async function addProductToCart() {
    const toContinue = beforeAddProductToCartFunction();
    if (!toContinue) return;

    setIdle(true);
    try {
      await makeOrder(items);
    } catch (error) {
      console.log(error);
    } finally {
      setIdle(false);
    }
  }

  function afterClosePopup() {
    buttonRef.current.classList.remove('hidden');
    buttonRef.current.focus();
  }

  return (
    <div>
      <Button
        drawerOpen={drawerOpen}
        handleClick={
          withCustomerDetails ? showCustomerDetailsPopup : addProductToCart
        }
        idle={idle}
        message={
          withCustomerDetails
            ? window.react.buyButton.addCustomerDetails
            : window.react.buyButton.addProductToCart
        }
        ref={buttonRef}
      />
      {showAddCustomerDetailsPopup &&
        createPortal(
          <AddCustomerDetailsPopup
            drawerOpen={drawerOpen}
            setShowAddCustomerDetailsPopup={setShowAddCustomerDetailsPopup}
            afterClosePopup={afterClosePopup}
          />,
          document.getElementById('addonsDrawer'),
        )}
    </div>
  );
}
