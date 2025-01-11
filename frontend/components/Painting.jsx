import { useRef } from 'react';
import ImageProduct from './ImageProduct';
import useProductData from '../hooks/useProductData';
import ImageJPGDrawer from './ImageJPGDrawer';
import useIsMobile from '../hooks/useIsMobile';

export default function Painting({
  currentOption,
  optionSets,
  optionIndecesSelected,
  setCurrentOption,
}) {
  const isMobile = useIsMobile();
  const sceneRef = useRef(null);
  const productRef = useRef(null);
  const { matter, shine } = useProductData(optionIndecesSelected, optionSets);
  const sizesPortrait = ['size30x40', 'size60x80', 'size75x100', 'size90x120'];
  const sizesPersonnalizedPortrait = [
    'size20x30',
    'size30x40',
    'size40x60',
    'size60x80',
    'size75x100',
    'size90x120',
  ];
  const sizesLandscape = ['size40x30', 'size80x60', 'size100x75', 'size120x90'];
  const sizesPersonnalizedLandscape = [
    'size20x30',
    'size30x40',
    'size40x60',
    'size60x80',
    'size75x100',
    'size90x120',
  ];
  const sizesSquare = ['size40x40', 'size60x60', 'size80x80', 'size100x100'];
  const sizesAvailable =
    window.productRatio === 'portrait'
      ? sizesPortrait
      : window.productRatio === 'personalized portrait'
      ? sizesPersonnalizedPortrait
      : window.productRatio === 'landscape'
      ? sizesLandscape
      : window.productRatio === 'personalized landscape'
      ? sizesPersonnalizedLandscape
      : sizesSquare;

  const otherOptions = [
    'fixationSet',
    'fixationHook',
    'fixationRail',
    'chassis2',
    'chassis4',
    'borderWhite',
    'borderBlack',
    'borderStretched',
    'borderMirror',
    'borderFolded',
    'frameCanvasWhite',
    'frameCanvasBlackMat',
    'frameCanvasSilverOld',
    'frameCanvasOakLight',
    'frameCanvasWalnut',
    'framePosterWhite',
    'framePosterBlackMat',
    'framePosterSilverOld',
    'framePosterOakLight',
    'framePosterWalnut',
  ];

  const options = isMobile ? [...sizesAvailable, ...otherOptions] : sizesAvailable;

  return (
    <div className="relative text-center" ref={sceneRef}>
      <ImageProduct
        matter={matter}
        shine={shine}
        ref={productRef}
        currentOption={currentOption}
      />
      {options.map((option) => (
        <ImageJPGDrawer
          key={option}
          option={option}
          currentOption={currentOption}
          setCurrentOption={setCurrentOption}
          matter={matter}
        />
      ))}
    </div>
  );
}
