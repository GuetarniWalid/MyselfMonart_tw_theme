import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageProductFilter from './ImageProductFilter';
import useIsMobile from '../hooks/useIsMobile';

const ImageProduct = forwardRef(({ matter, shine, currentOption }, ref) => {
  const [isClicked, setIsClicked] = useState(false);
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (
      currentOption &&
      (currentOption.technicalName === 'null' ||
        currentOption.technicalType === 'matter' ||
        currentOption.technicalType === 'shine')
    ) {
      setVisible(true);
      return;
    } else if (currentOption) {
      setVisible(false);
    } else {
      if (isMobile) {
        const timeout = setTimeout(() => {
          setVisible(true);
        }, 2500);

        return () => clearTimeout(timeout);
      } else {
        setVisible(true);
      }
    }
  }, [currentOption]);

  function handleClick() {
    setIsClicked(!isClicked);
  }

  const imageContent = (
    <div
      className={`relative inline-block transition-all duration-200 ease-out rounded overflow-hidden${
        visible ? '' : ' opacity-0'
      }`}
      onClick={handleClick}
      ref={!isClicked ? ref : null}
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
      <ImageProductFilter
        width={728}
        matter={matter}
        shine={shine}
        currentOption={currentOption}
      />
    </div>
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
