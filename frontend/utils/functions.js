export function getOptionsByType(type) {
  return Object.entries(window.paintingOptions[type]).map(
    ([key, option]) => option,
  );
}

export function getVariantBySizeAndMatter(size, matter) {
  return window.variants.find(variant => variant.option1 === size && variant.option2 === matter);
}

export function getOptionsList() {
  return Object.entries(window.paintingOptions).map(([key, option]) => option);
}

export function isOptionExisting(option, sizeSelected, matterSelected) {
  if (option.availableOn === null) return true;
  return option.availableOn.includes(
    `${sizeSelected.key}/${matterSelected.key}`,
  );
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