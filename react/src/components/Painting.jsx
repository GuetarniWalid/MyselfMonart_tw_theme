import { useRef } from 'react';
import ImagePNGDrawer from './ImagePNGDrawer/ImagePNGDrawer';
import { images } from '../data/images';
import useImagePNGToShow from '../hooks/useImagePNGToShow';
import ImageProduct from './ImageProduct';
import useProductData from '../hooks/useProductData';
import GirlPNGDrawer from './ImagePNGDrawer/GirlPNGDrawer';
import useProductDimensions from '../hooks/useProductDimensions';

export default function Painting({
  currentOption,
  optionSets,
  optionIndexListSelected,
}) {
  const sceneRef = useRef(null);
  const { showGirl, showPlant, showCouch } = useImagePNGToShow(currentOption);
  const { size, matter, fixation, chassis, frame, shine, border } =
    useProductData(optionIndexListSelected, optionSets);
  const productWidthInPx = useProductDimensions(size, sceneRef);

  return (
    <div className="relative flex-1 overflow-hidden md:max-w-lg" ref={sceneRef}>
      <img
        src={images.background.src}
        srcSet={images.background.srcSet}
        sizes={images.background.sizes}
        alt={images.background.alt}
        width={images.background.width}
        height={images.background.height}
        className="skeleton w-full h-full object-cover"
      />
      <ImageProduct
        size={size}
        matter={matter}
        shine={shine}
        width={productWidthInPx}
      />
      <ImagePNGDrawer
        src={images.plant.src}
        alt={images.plant.alt}
        width={images.plant.width}
        height={images.plant.height}
        position={images.plant.position}
        from={images.plant.from}
        initClasses={images.plant.initClasses}
        visible={showPlant}
      />
      <ImagePNGDrawer
        src={images.couch.src}
        alt={images.couch.alt}
        width={images.couch.width}
        height={images.couch.height}
        position={images.couch.position}
        from={images.couch.from}
        initClasses={images.couch.initClasses}
        visible={showCouch}
      />
      <GirlPNGDrawer
        src={images.girl.src}
        alt={images.girl.alt}
        from={images.girl.from}
        initClasses={images.girl.initClasses}
        visible={showGirl}
        size={size}
        productWidthInPx={productWidthInPx}
      />
      
    </div>
  );
}
