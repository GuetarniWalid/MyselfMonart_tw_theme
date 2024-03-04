import { useRef, useLayoutEffect } from 'react';
import { getRelativeImageSize } from '../../utils/functions';

export default function GirlPNGDrawer({
  src,
  alt,
  width,
  height,
  position,
  from,
  initClasses,
  visible,
  productSize,
  productWidthInPx,
  imageWidthInCm,
  productRef,
  sceneRef,
  nbOfOptions,
  isMobile,
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!visible) return;
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    const productRect = productRef.current?.getBoundingClientRect();
    const girlRect = ref.current?.getBoundingClientRect();
    if (!sceneRect || !productRect || !girlRect) return;

    const girlWidthInPx = getRelativeImageSize(
      imageWidthInCm,
      productSize,
      productWidthInPx,
    );

    //image width + horizontal position
    ref.current.style.width = girlWidthInPx + 'px';
    const productTiersWidth = productWidthInPx / 3;
    const lastProductTiersFromLeft = productRect.left + productTiersWidth * 2;
    const girlTiersWidth = girlWidthInPx / 3;
    ref.current.style.left = lastProductTiersFromLeft - sceneRect.left - girlTiersWidth + 'px';

    //image height + vertical position
    const ratio = ref.current.naturalWidth / ref.current.naturalHeight;
    const girlHeightInPx = girlWidthInPx / ratio;

    if (girlHeightInPx > sceneRect.height) {
      ref.current.style.top = sceneRect.top + 100 + 'px';
    } else {
      ref.current.style.top = '';
    }
  }, [
    sceneRef.current,
    productRef.current,
    ref.current,
    productWidthInPx,
    nbOfOptions,
    visible,
    isMobile,
  ]);

  function getInitialTwClasses(from) {
    if (visible) return position;

    const positions = position.split(' ');
    const positionsWithoutFrom = positions.filter((p) => !p.includes(from));

    switch (from) {
      case 'left':
        return 'left-0';
      case 'right':
        return `right-0 translate-x-full ${positionsWithoutFrom.join(' ')}`;
      case 'top':
        return 'top-0';
      case 'bottom':
        return 'bottom-0';
      default:
        return '';
    }
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`absolute transition-transform duration-500 ease-in-out ${getInitialTwClasses(
        from,
      )} ${initClasses}`}
      ref={ref}
      loading="lazy"
      srcSet={`
      ${src}&width=400 400w,
      ${src}&width=550 550w,
      ${src}&width=750 750w`}
      sizes="(max-width: 425px) 400px, (max-width: 575px) 550px, (max-width: 767px) 750px, (max-width: 910px) 400px, 550px"
    />
  );
}
