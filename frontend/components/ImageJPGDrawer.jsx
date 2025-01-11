import { useEffect, useState } from 'react';
import data from '../data/data';
import { getTechnicalKey } from '../utils/functions';
import useIsMobile from '../hooks/useIsMobile';

export default function ImageJPGDrawer({
  option,
  currentOption,
  setCurrentOption,
  matter,
}) {
  const [startX, setStartX] = useState(0);
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const technicalKey = getTechnicalKey(
      currentOption?.technicalType,
      currentOption?.technicalName,
      matter,
    );

    if (technicalKey === option) {
      setVisible(true);
    } else if (currentOption) {
      setVisible(false);
    } else {
      if (isMobile) {
        const timeout = setTimeout(() => {
          setVisible(false);
        }, 2500);
        
        return () => clearTimeout(timeout);
      } else {
        setVisible(false);
      }
    }
  }, [currentOption]);

  function handleTouchStart(e) {
    setStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    if (endX > startX + 50) {
      setCurrentOption(null);
    }
  }

  return (
    <div
      className={`h-full w-full absolute top-0 -right-[1px] transition-transform duration-300 ease-in-out md:z-10${
        visible ? '' : ' translate-x-full'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={data[option].image.src}
        alt={data[option].image.alt}
        width="500"
        height="500"
        className="inline-block w-full object-contain"
        loading="lazy"
        srcSet={`
      ${data[option].image.src}&width=375 375w,
      ${data[option].image.src}&width=500 500w,
      ${data[option].image.src}&width=767 767w,
      ${data[option].image.src}&width=1024 1024w,
      ${data[option].image.src}&width=1280 1280w,
      ${data[option].image.src}&width=1536 1536w,
      ${data[option].image.src}&width=1920 1920w
      `}
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
}
