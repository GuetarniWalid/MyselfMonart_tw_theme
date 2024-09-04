export default function useProductFormatter(
  optionSets,
  optionIndecesSelected,
) {
  const product = {
    type: 'painting',
    ratio: window.productRatio,
    productId: window.productId,
  };

  const variants = optionIndecesSelected.map((indexOptionSelected, index) => {
    const optionSet = optionSets[index];
    const optionSelected = optionSet[indexOptionSelected];
    return optionSelected.name;
  });
  product.variant = { title: variants.join('/') };

  return product;
}
