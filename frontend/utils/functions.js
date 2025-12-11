export function getOptionsByType(type) {
  return Object.entries(window.paintingOptions[type]).map(
    ([key, option]) => option,
  );
}

export function getVariantBySizeAndBorder(size, border) {
  return window.variants.find(variant => variant.option1 === size && variant.option2 === border);
}

export function getOptionsList() {
  return Object.entries(window.paintingOptions).map(([key, option]) => option);
}

export function isOptionExisting(option, sizeSelected) {
  if (option.availableOn === null) return true;
  // Check if the selected size is in the availableOn array
  return option.availableOn.includes(sizeSelected.key);
}

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

export function getRelativeImageSize(
  realWidthInCm,
  productSize,
  productWidthInPx,
) {
  const productWidthInCm = productSize?.width ?? 40;
  const ratioProductCmToPx = productWidthInPx / productWidthInCm;
  const imageWidthInPx = realWidthInCm * ratioProductCmToPx;
  return imageWidthInPx;
}