import { useState } from 'react';
import ImageRatio from './ImageRatio';

export default function DrawingLogic({
  src,
  imageName,
  alt,
  width,
  height,
  productSize,
  productRef,
  realHeightInCm,
  positionFrom,
  positionToRight,
  show,
}) {
  const [displayImageName, setDisplayImageName] = useState(imageName);
  const [isSizeChangePermitted, setIsSizeChangePermitted] = useState(true);
  const [newSrc, setNewSrc] = useState(src);
  const [newPositionFrom, setNewPositionFrom] = useState(positionFrom);
  const [newPositionToRight, setNewPositionToRight] = useState(positionToRight);
  const [newAlt, setNewAlt] = useState(alt);

  const handleTransitionEnd = (e) => {
    if (e.propertyName === 'transform') {
      const className = e.target.className;
      if (className.includes('translate-x-full')) {
        setDisplayImageName(imageName);
        setIsSizeChangePermitted(true);
        setNewSrc(src);
        setNewPositionFrom(positionFrom);
        setNewPositionToRight(positionToRight);
        setNewAlt(alt);
      } else {
        setIsSizeChangePermitted(false);
      }
    }
  };

  function getTranslation(nextVisibility) {
    return nextVisibility === 'hide' ? 'translate-x-full' : '';
  }

  function nextVisibilityState() {
    if (!show || displayImageName !== imageName) {
      return 'hide';
    }
    return 'show';
  }

  const nextVisibility = nextVisibilityState();
  const translation = getTranslation(nextVisibility);

  return (
    <ImageRatio
      src={newSrc}
      alt={newAlt}
      width={width}
      height={height}
      productSize={productSize}
      productRef={productRef}
      realHeightInCm={realHeightInCm}
      positionFrom={newPositionFrom}
      positionToRight={newPositionToRight}
      translation={translation}
      handleTransitionEnd={handleTransitionEnd}
      sizeChangePermitted={isSizeChangePermitted || displayImageName === imageName}
      toHide={!show}
    />
  );
}

