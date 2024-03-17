export function getProductSize(size) {
  const [width, height] = size.split('x').map(Number);

  return {
    width,
    height,
  };
}

export function getAspectRatio(productWidth, productHeight) {
  if (productWidth === productHeight) {
    return 'square';
  } else if (productWidth > productHeight) {
    return 'landscape';
  } else {
    return 'portrait';
  }
}

export function getWidthAccordingScene(percent, sceneWidth) {
  return (percent * sceneWidth) / 100;
}

export function getTechnicalKey(technicaltype = '', technicalName = '') {
  if (typeof technicalName === 'number') {
    technicalName = String(technicalName);
  }

  const technicalNamesWithoutUnderscore = technicalName.split('_');
  const technicalNamesWithoutDash = technicalNamesWithoutUnderscore.map(
    (word) => {
      return word.split('-');
    },
  );
  const technicalNameSplit = technicalNamesWithoutDash.flat();
  const technicalNameSplitUppercase = technicalNameSplit.map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return technicaltype + technicalNameSplitUppercase.join('');
}

export function getRelativeImageSize(realWidthInCm, productSize, productWidthInPx) {
  const productWidthInCm = productSize?.width ?? 40;
  const ratioProductCmToPx = productWidthInPx / productWidthInCm;
  const imageWidthInPx = realWidthInCm * ratioProductCmToPx;
  return imageWidthInPx;
}