import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageProductFilter from './ImageProductFilter';
import useIsMobile from '../hooks/useIsMobile';
import { useCurrentOption } from '../store/currentOption';

const ImageProduct = forwardRef(({}, ref) => {
  const [isClicked, setIsClicked] = useState(false);
  const [visible, setVisible] = useState(true);
  const isMobile = useIsMobile();
  const [currentOption] = useCurrentOption();

  useEffect(() => {
    if (isMobile) {
      if (
        currentOption &&
        (currentOption.key.includes('Null') ||
          currentOption.type === 'matter' ||
          currentOption.type === 'shine')
      ) {
        setVisible(true);
        return;
      } else if (currentOption) {
        setVisible(false);
        return;
      }

      const timeout = setTimeout(() => {
        setVisible(true);
      }, 2500);

      return () => clearTimeout(timeout);
    } else {
      setVisible(currentOption?.type !== 'size');
    }
  }, [currentOption]);

  useEffect(() => {
    if(isClicked) {
      document.activeElement.blur();
    }
  }, [isClicked]);

  function handleClick() {
    setIsClicked(!isClicked);
  }

  const imageContent = (
    <button
      className={`relative inline-block transition-all duration-200 ease-out rounded overflow-hidden${
        visible ? '' : ' opacity-0'
      }`}
      onClick={handleClick}
      ref={!isClicked ? ref : null}
      tabIndex={isClicked ? -1 : 0}
    >
      <img
        src={window.productImageSRC}
        srcSet={`${window.productImageSRC}&width=250 250w,
          ${window.productImageSRC}&width=400 400w,
          ${window.productImageSRC}&width=600 600w,
          ${window.productImageSRC}&width=800 800w,
          ${window.productImageSRC}&width=1000 1000w,
          ${window.productImageSRC}&width=1200 1200w,`}
        sizes="(max-width: 768px) 95vw, 50vw"
        alt={window.productImageAlt}
        width="728"
        height="auto"
        loading="lazy"
        className="md:max-h-[90vh] w-auto"
      />
      <ImageProductFilter width={728} />
    </button>
  );

  return isClicked && isMobile
    ? createPortal(
        <div
          className="absolute z-10 inset-0 bg-black/50 flex items-center justify-center"
          onClick={handleClick}
        >
          {imageContent}
        </div>,
        document.getElementById('addonsDrawer'),
      )
    : imageContent;
});

export default ImageProduct;
