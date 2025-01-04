import useShowImageRatio from '../../hooks/useShowImageRatio';
import data from '../../data/data';
import DrawingLogic from './DrawingLogic';

const IMAGES = {
  GIRL: {
    data: data.girl,
    imageName: 'girl',
    realHeightInCm: 175,
    maxProductHeight: 10000,
    positionFrom: 'top',
    positionToRight: '1/4',
  },
  CAT: {
    data: data.cat,
    imageName: 'cat',
    realHeightInCm: 25,
    maxProductHeight: 60,
    positionFrom: 'bottom',
    positionToRight: '0',
  },
};

export default function ImageSelector({
  productSize,
  productRef,
  currentOption,
}) {
  const toShow = useShowImageRatio(currentOption);

  function selectAppropriateReference() {
    const productHeightInCm = productSize.height;
    const sortedReferences = sortReferencesInAscendingOrder();

    const selectedReference = sortedReferences.find(
      (reference) => productHeightInCm <= reference[1].maxProductHeight,
    );
    return selectedReference[1];
  }

  function sortReferencesInAscendingOrder() {
    return Object.entries(IMAGES).sort(
      (a, b) => a[1].realHeightInCm - b[1].realHeightInCm,
    );
  }

  const selectedReference = selectAppropriateReference();

  return (
    <DrawingLogic
      src={selectedReference.data.image.src}
      imageName={selectedReference.imageName}
      alt={selectedReference.data.image.alt}
      width={selectedReference.data.image.width}
      height={selectedReference.data.image.height}
      productSize={productSize}
      productRef={productRef}
      realHeightInCm={selectedReference.realHeightInCm}
      positionFrom={selectedReference.positionFrom}
      positionToRight={selectedReference.positionToRight}
      show={toShow}
    />
  );
}
