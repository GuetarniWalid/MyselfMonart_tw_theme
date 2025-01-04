import { useState } from 'react';
import ReferenceImageComponent from './ReferenceImageComponent';
import useShowImageRatio from '../../hooks/useShowImageRatio';
import data from '../../data/data';

const REFERENCE_IMAGES = {
  GIRL: {
    data: data.girl,
    realHeightInCm: 175,
    maxProductHeight: 10000,
  },
  CAT: {
    data: data.cat,
    realHeightInCm: 25,
    maxProductHeight: 60,
  },
  //   COFFEE_CUP: {
  //     src: '/path/to/coffee-cup.png',
  //     realHeightInCm: 15,
  //     maxProductHeight: 40,
  //   },
};

export default function ReferenceImageDrawer({
  productSize,
  productRef,
  currentOption,
}) {
  const visible = useShowImageRatio(currentOption);

  function selectAppropriateReference() {
    const productHeightInCm = productSize.height;
    const sortedReferences = sortReferencesInAscendingOrder();

    const selectedReference = sortedReferences.find(
      (reference) => productHeightInCm <= reference[1].maxProductHeight,
    );
    return selectedReference[1];
  }

  function sortReferencesInAscendingOrder() {
    return Object.entries(REFERENCE_IMAGES).sort(
      (a, b) => a[1].realHeightInCm - b[1].realHeightInCm,
    );
  }

  const selectedReference = selectAppropriateReference();

  return (
    <ReferenceImageComponent
      src={selectedReference.data.image.src}
      alt={selectedReference.data.image.alt}
      width={selectedReference.data.image.width}
      height={selectedReference.data.image.height}
      visible={visible}
      productSize={productSize}
      productRef={productRef}
      realHeightInCm={selectedReference.realHeightInCm}
    />
  );
}
