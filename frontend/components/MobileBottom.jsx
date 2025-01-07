import BuyButton from './BuyButton';
import Selects from './Selects';

export default function MobileBottom({
  optionIndecesSelected,
  setOptionIndecesSelected,
  optionSets,
  mobileSummaryRef,
  setCurrentOption,
  drawerOpen,
  focusedElemRef,
  openSelectId,
  setOpenSelectId,
  CloseButtonRef,
}) {
  

  return (
    <div className='absolute bottom-0 w-full px-3 md:hidden'>
      <Selects 
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        setOptionIndecesSelected={setOptionIndecesSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        mobileSummaryRef={mobileSummaryRef}
        focusedElemRef={focusedElemRef}
        openSelectId={openSelectId}
        setOpenSelectId={setOpenSelectId}
      />
      <BuyButton
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        drawerOpen={drawerOpen}
        withCustomerDetails={window.buyingWithCustomization}
        CloseButtonRef={CloseButtonRef}
      />
    </div>
  );
}
