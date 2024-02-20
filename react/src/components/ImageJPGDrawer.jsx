import { useState } from 'react';
import data from '../data/data';
import { getTechnicalKey } from '../utils/functions';

export default function ImageJPGDrawer({
  option,
  currentOption,
  setCurrentOption,
}) {
  const [startX, setStartX] = useState(0);

  function getInitialTwClasses(from) {
    const positions = data[option].image.position.split(' ');
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
  const technicalKey = getTechnicalKey(
    currentOption?.technicalType,
    currentOption?.technicalName,
  );
  const visible = technicalKey === option;
  const twClasses = visible
    ? data[option].image.position
    : getInitialTwClasses(data[option].image.from);

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
      className={`h-full w-full absolute transition-transform duration-300 ease-in-out bg-secondary  ${twClasses}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={data[option].image.src}
        alt={data[option].image.alt}
        width={data[option].image.width}
        height={data[option].image.height}
        className={`${data[option].image.initClasses}`}
      />
    </div>
  );
}
