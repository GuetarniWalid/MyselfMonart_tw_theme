import { useRef, useState } from 'react';
import useProductFormatter from '../../hooks/useProductFormatter';
import { createPortal } from 'react-dom';
import AddCustomerDetailsPopup from '../AddCustomerDetailsPopup';
import Button from './ui/Button';
import { updateProduct } from './data/updateProduct';
import { makeOrder } from './data/makeOrder';

export default function BuyButton({
  optionSets,
  optionIndecesSelected,
  drawerOpen,
  withCustomerDetails = false,
  beforeAddProductToCartFunction = () => true,
  getProductProperties = () => null,
}) {
  const [idle, setIdle] = useState(false);
  const [showAddCustomerDetailsPopup, setShowAddCustomerDetailsPopup] =
    useState(false);
  const buttonRef = useRef(null);
  const product = useProductFormatter(optionSets, optionIndecesSelected);

  function showCustomerDetailsPopup() {
    buttonRef.current.classList.add('hidden')
    setShowAddCustomerDetailsPopup(true);
  }

  async function addProductToCart() {
    const toContinue = beforeAddProductToCartFunction();
    if (!toContinue) return;

    setIdle(true);
    try {
      const variantData = await updateProduct(product);
      const productProperties = getProductProperties();
      await makeOrder(variantData, productProperties);
    } catch (error) {
      console.log(error);
    } finally {
      setIdle(false);
    }
  }

  function afterClosePopup() {
    buttonRef.current.classList.remove('hidden')
    buttonRef.current.focus();
  }

  return (
    <>
      <Button
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        drawerOpen={drawerOpen}
        handleClick={
          withCustomerDetails ? showCustomerDetailsPopup : addProductToCart
        }
        idle={idle}
        message={withCustomerDetails ? 'Personnaliser' : 'Ajouter au panier'}
        ref={buttonRef}
      />
      {showAddCustomerDetailsPopup &&
        createPortal(
          <AddCustomerDetailsPopup
            optionSets={optionSets}
            optionIndecesSelected={optionIndecesSelected}
            drawerOpen={drawerOpen}
            setShowAddCustomerDetailsPopup={setShowAddCustomerDetailsPopup}
            afterClosePopup={afterClosePopup}
          />,
          document.getElementById('addonsDrawer'),
        )}
    </>
  );
}
