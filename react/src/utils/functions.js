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
