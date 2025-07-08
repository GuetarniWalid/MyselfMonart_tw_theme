import { forwardRef, useEffect } from 'react';
import { setCustomerDetails } from '../../store/customerDetails';

const Input = forwardRef(({ type, name, label, errorMessage }, ref) => {
  useEffect(() => {
    if (ref) ref.current.focus();
  }, []);

  return (
    <>
      <label
        htmlFor="customer-name"
        className="block font-heading text-lg mb-2 first:mt-0 mt-4"
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        required
        className="block w-full h-14 rounded px-4"
        ref={ref}
        onChange={(e) => {
          setCustomerDetails(prev => ({
            ...prev,
            [name]: e.target.value,
          }));
        }}
      />
      <p className="hidden text-sm text-red-500 mt-1">{errorMessage}</p>
    </>
  );
});
export default Input;
