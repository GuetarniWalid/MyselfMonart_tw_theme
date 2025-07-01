import { useVariantSelected } from '../store/variantSelected';
import { getVariantBySizeAndMatter } from '../utils/functions';

export default function OptionPrice({ option, isDisabled }) {
  const [sizeSelected] = useVariantSelected.size();

  let price;
  switch (option.type) {
    case 'matter':
      price = getMatterPrice();
      break;
    default:
      price = getOthersPrice();
  }

  function getMatterPrice() {
    const sizePrice = window.variants.find(
      (variant) => variant.option1 === sizeSelected.name,
    ).price;
    const variant = getVariantBySizeAndMatter(sizeSelected.name, option.name);
    if (!variant) return null;
    const totalPrice = variant.price;
    const priceDifference = totalPrice - sizePrice;
    return Product.formatPrice(priceDifference, false, true);
  }
 
  function getOthersPrice() {
    return Product.formatPrice(option.price, false, false);
  }

  function formatPrice(price) {
    if (isDisabled || price === null) return window.react.errorMessage.notAllowedForThisSize;
    return price;
  }

  function showPlus() {
    if (!option.price) return false;
    if (option.type === 'size') return false;
    return true;
  }

  return (
    <>
      {showPlus() && '+ '}
      {formatPrice(price)}
    </>
  );
}
