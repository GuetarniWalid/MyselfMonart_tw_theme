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
    return priceDifference / 100;
  }
 
  function getOthersPrice() {
    return option.price;
  }

  function formatPrice(price) {
    if (isDisabled || price === null) return window.react.errorMessage.notAllowedForThisSize;
    if (price % 1 === 0) return price + ' ' + window.Shopify.currency.symbol;
    return price.toFixed(2) + ' ' + window.Shopify.currency.symbol;
  }

  return (
    <>
      {formatPrice(price)}
    </>
  );
}
