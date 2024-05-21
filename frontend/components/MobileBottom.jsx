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
  openSelectId,
  setOpenSelectId,
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
        openSelectId={openSelectId}
        setOpenSelectId={setOpenSelectId}
      />
    </>
  );
}
