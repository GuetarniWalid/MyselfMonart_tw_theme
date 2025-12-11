export default function OptionPrice({ option }) {
  // All options use the price directly from the option object
  const price = Product.formatPrice(option.price, false, false);

  function showPlus() {
    if (!option.price) return false;
    if (option.type === 'size') return false;
    return true;
  }

  return (
    <span className={showPlus() ? 'whitespace-nowrap' : ''}>
      {showPlus() && '+ '}
      {price}
    </span>
  );
}
