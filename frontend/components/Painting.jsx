import { useRef, useMemo } from 'react';
import ImageProduct from './ImageProduct';
import ImageJPGDrawer from './ImageJPGDrawer';
import useIsMobile from '../hooks/useIsMobile';
import { getOptionsByType } from '../utils/functions';

export default function Painting() {
  const isMobile = useIsMobile();
  const sceneRef = useRef(null);
  const productRef = useRef(null);

  const sizes = useMemo(() => getOptionsByType('size'), []);
  const thicknesses = useMemo(() => getOptionsByType('thickness'), []);
  const borders = useMemo(() => getOptionsByType('border'), []);
  const fixations = useMemo(
    () =>
      getOptionsByType('fixation').filter((option) =>
        !option.key.includes('Null'),
      ),
    [],
  );
  const framesCanvas = useMemo(
    () =>
      getOptionsByType('frameCanvas').filter((option) =>
        !option.key.includes('Null'),
      ),
    [],
  );
  const framesPoster = useMemo(
    () =>
      getOptionsByType('framePoster').filter((option) =>
        !option.key.includes('Null'),
      ),
    [],
  );

  const otherOptions = useMemo(
    () => [
      ...fixations,
      ...thicknesses,
      ...borders,
      ...framesCanvas,
      ...framesPoster,
    ],
    [fixations, thicknesses, borders, framesCanvas, framesPoster],
  );

  const options = useMemo(
    () => (isMobile ? [...sizes, ...otherOptions] : sizes),
    [isMobile, sizes, otherOptions],
  );

  return (
    <div className="relative text-center lg:h-[80%] lg:mb-2" ref={sceneRef}>
      <ImageProduct ref={productRef} />
      {options.map((option) => (
        <ImageJPGDrawer key={option.type + option.key} option={option} />
      ))}
    </div>
  );
}
