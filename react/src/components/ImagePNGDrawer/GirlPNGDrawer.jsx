import ImagePNGDrawer from './ImagePNGDrawer';

export default function GirlPNGDrawer({
  src,
  alt,
  from,
  initClasses,
  visible,
  size,
  productWidthInPx,
}) {
  const girlWidthInCm = 93.4;
  const productWidthInCm = size.width;
  const ratioProductCmToPx = productWidthInPx / productWidthInCm;
  const girlWidthInPx = girlWidthInCm * ratioProductCmToPx;

  function positionAccordingWidth() {
    if (size.width <= 30) {
      return 'top-32 -right-32';
    } else if (size.width <= 40) {
      return 'top-32 -right-20';
    } else if (size.width <= 60) {
      return 'top-36 -right-14';
    } else if (size.width <= 80) {
      return 'bottom-0 -right-10';
    } else {
      return 'bottom-0 right-0';
    }
  }

  return (
    <ImagePNGDrawer
      src={src}
      alt={alt}
      width="auto"
      height={'auto'}
      position={positionAccordingWidth()}
      from={from}
      initClasses={initClasses}
      visible={visible}
      customStyle={girlWidthInPx ? { width: `${girlWidthInPx}px` } : {}}
    />
  );
}
