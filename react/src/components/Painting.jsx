import { useRef } from 'react';
import ImagePNGDrawer from './ImagePNGDrawer/ImagePNGDrawer';
import useImagePNGToShow from '../hooks/useImagePNGToShow';
import ImageProduct from './ImageProduct';
import useProductData from '../hooks/useProductData';
import useProductDimensions from '../hooks/useProductDimensions';
import ImageJPGDrawer from './ImageJPGDrawer';
import data from '../data/data';
const { background, furniture, girl } = data;

export default function Painting({
  currentOption,
  optionSets,
  optionIndexListSelected,
  setCurrentOption,
}) {
  const sceneRef = useRef(null);
  const productRef = useRef(null);
  const { showGirl, showFurniture } = useImagePNGToShow(currentOption);
  const { size, matter, fixation, chassis, frame, shine, border } =
    useProductData(optionIndexListSelected, optionSets);
  const productWidthInPx = useProductDimensions(size, sceneRef);

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className="relative overflow-hidden md:max-w-lg py-10 text-center min-h-full" ref={sceneRef}>
        <img
          src={background.image.src}
          srcSet={background.image.srcSet}
          sizes={background.image.sizes}
          alt={background.image.alt}
          width={background.image.width}
          height={background.image.height}
          className="skeleton -z-10 absolute top-0 left-0 w-full h-full object-cover"
        />
        <ImageProduct
          matter={matter}
          shine={shine}
          width={productWidthInPx}
          ref={productRef}
        />
        <ImagePNGDrawer
          src={furniture.image.src}
          alt={furniture.image.alt}
          width={furniture.image.width}
          height={furniture.image.height}
          position={furniture.image.position}
          from={furniture.image.from}
          initClasses={furniture.image.initClasses}
          stickyTo={furniture.image.stickyTo}
          visible={showFurniture}
          productSize={size}
          productWidthInPx={productWidthInPx}
          imageWidthInCm={150}
          productRef={productRef}
          sceneRef={sceneRef}
          nbOfOptions={optionIndexListSelected.length}
        />
        <ImagePNGDrawer
          src={girl.image.src}
          alt={girl.image.alt}
          width={girl.image.width}
          height={girl.image.height}
          position={girl.image.position}
          from={girl.image.from}
          initClasses={girl.image.initClasses}
          stickyTo={girl.image.stickyTo}
          visible={showGirl}
          size={size}
          productWidthInPx={productWidthInPx}
          imageWidthInCm={93.4}
          productRef={productRef}
          sceneRef={sceneRef}
          nbOfOptions={optionIndexListSelected.length}
        />
        {[
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
          'frameWhite',
          'frameBlackMat',
          'frameSilverOld',
          'frameOakLight',
          'frameWalnut',
        ].map((option) => (
          <ImageJPGDrawer
            key={option}
            option={option}
            currentOption={currentOption}
            setCurrentOption={setCurrentOption}
          />
        ))}
      </div>
    </div>
  );
}
