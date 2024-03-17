export default function useProductFormatter(
  optionSets,
  optionIndexListSelected,
) {
  const product = {
    ratio: window.productRatio,
    title: window.productTitle,
    status: 'draft',
    images: [
      {
        src: window.productImageSRC,
        filename: window.filename,
        alt: window.productImageAlt,
        position: 1,
      },
    ],
  };

  const variants = optionIndexListSelected.map((indexOptionSelected, index) => {
    const optionSet = optionSets[index];
    const optionSelected = optionSet[indexOptionSelected];
    return optionSelected.name;
  });
  product.variants = [{ option1: variants.join('/') }];

  return product;
}
