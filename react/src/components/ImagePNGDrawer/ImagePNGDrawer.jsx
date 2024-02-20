import { useRef, useLayoutEffect, useState } from 'react';
import { getRelativeImageSize } from '../../utils/functions';

export default function ImagePNGDrawer({
  src,
  alt,
  width,
  height,
  position,
  from,
  initClasses,
  stickyTo,
  visible,
  productSize,
  productWidthInPx,
  imageWidthInCm,
  productRef,
  sceneRef,
  nbOfOptions
}) {
  const ref = useRef(null);
  const [verticalCollision, setVerticalCollision] = useState(false);

  useLayoutEffect(() => {
    const sceneRect = sceneRef.current?.getBoundingClientRect();
    const productRect = productRef.current?.getBoundingClientRect();
    const imageRect = ref.current?.getBoundingClientRect();
    
    if (productRect && imageRect && sceneRect) {
      if (stickyTo.vertical === 'bottom') {
        setVerticalCollision(
          productRect.bottom > sceneRect.bottom - imageRect.height,
        );
      }
    }
  }, [sceneRef.current, productRef.current, ref.current, productWidthInPx, nbOfOptions]);


  function getInitialTwClasses(from) {
    if(visible) return position;

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

  const imageWidthInPx = getRelativeImageSize(
    imageWidthInCm,
    productSize,
    productWidthInPx,
  );

  const imageStyle = {};
  if (imageWidthInPx) {
    imageStyle.width = `${imageWidthInPx}px`;
  }

  if (verticalCollision && stickyTo.vertical === 'bottom') {
    const productBottom = productRef.current.getBoundingClientRect().bottom;
    imageStyle.top = `${productBottom}px`;
  } else {
    imageStyle.top = '';
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`absolute transition-transform duration-500 ease-in-out ${getInitialTwClasses(from)} ${initClasses}`}
      style={imageStyle}
      ref={ref}
    />
  );
}
