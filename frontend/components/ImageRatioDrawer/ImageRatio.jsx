import { useRef, useEffect, useState } from 'react';
import useIsMobile from '../../hooks/useIsMobile';

export default function ImageRatio({
  src,
  alt,
  width,
  height,
  translation,
  productSize,
  productRef,
  realHeightInCm,
  positionFrom,
  positionToRight,
  handleTransitionEnd,
  sizeChangePermitted,
  toHide,
}) {
  const size = useRef(height);
  const ref = useRef(null);
  const [newTranslation, setNewTranslation] = useState(translation);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (ref.current) {
      ref.current.onload = () => {
        size.current = getReferenceHeightInPx();
      };
    }

    return () => {
      if (ref.current) {
        ref.current.onload = null;
      }
    };
  }, []);

  useEffect(() => {
    //when on mobile, let a small time before apply the translation using the hook useIsMobile
    if (isMobile && translation === 'translate-x-full' && toHide) {
      setTimeout(() => {
        setNewTranslation(translation);
      }, 2000);
    } else {
      setNewTranslation(translation);
    }
  }, [isMobile, translation, toHide]);

  function getReferenceHeightInPx() {
    if (!productRef.current) return height;
    const ratio = calculateRatioToTransformCmIntoPx();
    return realHeightInCm * ratio;
  }

  function calculateRatioToTransformCmIntoPx() {
    const productRect = productRef.current.getBoundingClientRect();
    const productHeightInPx = productRect.height;
    const productHeightInCm = productSize.height;
    return productHeightInPx / productHeightInCm;
  }

  const newSize = sizeChangePermitted ? getReferenceHeightInPx() : size.current;
  size.current = newSize;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      ref={ref}
      className={`max-w-none absolute ${positionFrom}-0 -right-${positionToRight} transition-transform duration-700 ease-in-out ${newTranslation}`}
      loading="lazy"
      onTransitionEnd={handleTransitionEnd}
      srcSet={`
        ${src}&width=400 400w,
        ${src}&width=550 550w,
        ${src}&width=750 750w
      `}
      sizes="(max-width: 425px) 400px, (max-width: 575px) 550px, (max-width: 767px) 750px, (max-width: 910px) 400px, 550px"
      style={{
        height: newSize,
      }}
    />
  );
}
