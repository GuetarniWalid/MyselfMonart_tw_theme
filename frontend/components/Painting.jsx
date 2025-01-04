import { useRef } from 'react';
import ImageProduct from './ImageProduct';
import useProductData from '../hooks/useProductData';
import ImageJPGDrawer from './ImageJPGDrawer';
import BuyButton from './BuyButton';
import ReferenceImageDrawer from './ImageRatioDrawer/ImageSelector';

export default function Painting({
  currentOption,
  optionSets,
  optionIndecesSelected,
  setCurrentOption,
}) {
  const sceneRef = useRef(null);
  const productRef = useRef(null);
  const { size, matter, shine } = useProductData(
    optionIndecesSelected,
    optionSets,
  );

  return (
    <div className="max-h-full overflow-hidden">
      <div className="relative text-center" ref={sceneRef}>
        <ImageProduct matter={matter} shine={shine} ref={productRef} />
        <ReferenceImageDrawer
          productSize={size}
          size={size}
          productRef={productRef}
          currentOption={currentOption}
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
      <div>
        <BuyButton
          optionSets={optionSets}
          optionIndecesSelected={optionIndecesSelected}
          drawerOpen={true}
          withCustomerDetails={window.buyingWithCustomization}
        />
      </div>
    </div>
  );
}
