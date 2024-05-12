import BuyButton from './BuyButton';
import Selects from './Selects';

export default function MobileBottom({
  optionIndecesSelected,
  setOptionIndecesSelected,
  optionSets,
  mobileSummaryRef,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
  focusedElemRef,
  openElemRef,
}) {
  

  return (
    <>
      <BuyButton
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        drawerOpen={drawerOpen}
      />
      <Selects 
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        setOptionIndecesSelected={setOptionIndecesSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        mobileSummaryRef={mobileSummaryRef}
        CloseButtonRef={CloseButtonRef}
        focusedElemRef={focusedElemRef}
        openElemRef={openElemRef}
      />
    </>
  );
}
