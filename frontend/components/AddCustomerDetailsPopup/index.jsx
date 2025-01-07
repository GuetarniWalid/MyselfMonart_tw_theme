import { useEffect, useRef } from 'react';
import BuyButton from '../BuyButton';
import Input from './Input';

export default function AddCustomerDetailsPopup({
  optionSets,
  optionIndecesSelected,
  drawerOpen,
  setShowAddCustomerDetailsPopup,
  afterClosePopup,
}) {
  const firstRef = useRef(null);
  const inputsContainerRef = useRef(null);

  function closePopup(e) {
    e.preventDefault();
    e.stopPropagation();
    setShowAddCustomerDetailsPopup(false);
    afterClosePopup();
  }

  function verifyCustomerDetails() {
    const inputs = inputsContainerRef.current.querySelectorAll('input');
    let allInputsValid = true;
    inputs.forEach((input) => {
      if (!input.value) {
        input.classList.add('border-2', 'border-red-500', 'bg-red-100');
        input.nextElementSibling.classList.remove('hidden');
        allInputsValid = false;
      } else {
        input.classList.remove('border-2', 'border-red-500', 'bg-red-100');
        input.nextElementSibling.classList.add('hidden');
      }
    });
    return allInputsValid;
  }

  function handleKeyDown(event) {
    if (event.key === 'Tab') {
      if (event.target.nodeName === 'BUTTON') {
        event.preventDefault();
        firstRef.current.focus();
      }
    }
  }
  function getProductProperties() {
    const inputs = inputsContainerRef.current.querySelectorAll('input');
    const productProperties = {};
    inputs.forEach((input) => {
      productProperties[input.name] = input.value;
    });
    return productProperties;
  }

  useEffect(() => {
    firstRef.current.focus();
  }, []);

  const lang = document.querySelector('html').lang;
  const inputs = window.customerDetailsSchema.map((input, index) => (
    <Input
      key={index}
      type={input.type}
      name={input.name}
      label={input.label[lang]}
      errorMessage={input.errorMessage[lang]}
      ref={index === 0 ? firstRef : null}
    />
  ));


  return (
    <div
      className="absolute inset-0 bg-black/30 flex justify-center items-center z-10"
      onClick={closePopup}
    >
      <div
        className="mx-1 bg-secondary p-8 rounded-xl border-main border-1 w-full max-w-lg max-h-[90%] overflow-y-auto scrollbar-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        ref={inputsContainerRef}
      >
        {inputs}
        <div className="mt-8">
          <BuyButton
            optionSets={optionSets}
            optionIndecesSelected={optionIndecesSelected}
            drawerOpen={drawerOpen}
            withCustomerDetails={false}
            beforeAddProductToCartFunction={verifyCustomerDetails}
            getProductProperties={getProductProperties}
          />
        </div>
      </div>
    </div>
  );
}
