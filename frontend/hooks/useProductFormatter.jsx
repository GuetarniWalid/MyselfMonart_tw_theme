export default function useProductFormatter(
  optionSets,
  optionIndexListSelected,
) {
  const product = {
    ratio: window.productRatio,
    productId: window.productId,
  };

  const variants = optionIndexListSelected.map((indexOptionSelected, index) => {
    const optionSet = optionSets[index];
    const optionSelected = optionSet[indexOptionSelected];
    return optionSelected.name;
  });
  product.variant = { title: variants.join('/') };

  return product;
}
