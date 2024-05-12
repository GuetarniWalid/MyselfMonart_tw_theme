import { useRef, useLayoutEffect, useState } from 'react';
import { getRelativeImageSize } from '../../utils/functions';

export default function FurniturePNGDrawer({
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
  const [isImageLoaded, setImageLoaded] = useState(false);

  useLayoutEffect(() => {
    if (!visible || !isImageLoaded) return;
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    const productRect = productRef.current?.getBoundingClientRect();
    const furnitureRect = ref.current?.getBoundingClientRect();
    if (!sceneRect || !productRect || !furnitureRect) return;

    const furnitureWidthInPx = getRelativeImageSize(
      imageWidthInCm,
      productSize,
      productWidthInPx,
    );

    //image width + horizontal position
    ref.current.style.width = furnitureWidthInPx + 'px';

    //image height + vertical position
    const ratio = ref.current.naturalWidth / ref.current.naturalHeight;
    const furnitureHeightInPx = furnitureWidthInPx / ratio;
    //40 is the padding of the scene
    if (furnitureHeightInPx > sceneRect.height - productRect.height - 40) {
      ref.current.style.top = productRect.bottom - sceneRect.top + 'px';
    } else {
      ref.current.style.top = '';
    }
  }, [
    sceneRef.current,
    productRef.current,
    ref.current,
    isImageLoaded,
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
      ref={ref}
      className={`absolute transition-transform duration-500 ease-in-out max-w-none ${getInitialTwClasses(
        from,
      )} ${initClasses}`}
      loading="lazy"
      onLoad={() => setImageLoaded(true)}
      srcSet={`
      ${src}&width=900 900w,
      ${src}&width=1000 1000w,
      ${src}&width=1150 1200w`}
      sizes="(max-width: 465px) 930px, (max-width: 767px) 1200px, 1160px"
    />
  );
}
