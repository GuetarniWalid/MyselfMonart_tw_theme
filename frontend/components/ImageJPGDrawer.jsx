import { useEffect, useState } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { useCurrentOption } from '../store/currentOption';

export default function ImageJPGDrawer({ option }) {
  const [currentOption] = useCurrentOption();
  const [startX, setStartX] = useState(0);
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (currentOption === option) {
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
        src={option.image.src}
        alt={option.image.alt}
        width="500"
        height="500"
        className="inline-block w-full object-contain"
        loading="lazy"
        srcSet={`
      ${option.image.src}&width=375 375w,
      ${option.image.src}&width=500 500w,
      ${option.image.src}&width=767 767w,
      ${option.image.src}&width=1024 1024w,
      ${option.image.src}&width=1280 1280w,
      ${option.image.src}&width=1536 1536w,
      ${option.image.src}&width=1920 1920w
      `}
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
}
