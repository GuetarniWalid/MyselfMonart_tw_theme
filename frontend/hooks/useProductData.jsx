import { getProductSize } from '../utils/functions';

export default function useProductData(optionIndecesSelected, optionSets) {
  const optionsSelected = {};

  optionIndecesSelected.forEach((optionIndexSelected, i) => {
    if (
      optionSets[i][optionIndexSelected].technicalType ===
      'size'
    ) {
      optionsSelected.size = getProductSize(
        optionSets[i][optionIndexSelected].technicalName,
        );
      } else {
      optionsSelected[optionSets[i][optionIndexSelected].technicalType] =
        optionSets[i][optionIndexSelected].technicalName;
    }
  });

  return optionsSelected;
}
