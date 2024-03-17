import BuyButton from './BuyButton';
import Selects from './Selects';

export default function MobileBottom({
  optionIndexListSelected,
  setOptionIndexListSelected,
  optionSets,
  selectIndexSelected,
  setSelectIndexSelected,
  mobileSummaryRef,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
}) {
  

  return (
    <>
      <BuyButton
        optionSets={optionSets}
        optionIndexListSelected={optionIndexListSelected}
        drawerOpen={drawerOpen}
      />
      <Selects 
        optionSets={optionSets}
        optionIndexListSelected={optionIndexListSelected}
        setOptionIndexListSelected={setOptionIndexListSelected}
        selectIndexSelected={selectIndexSelected}
        setSelectIndexSelected={setSelectIndexSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        mobileSummaryRef={mobileSummaryRef}
        CloseButtonRef={CloseButtonRef}
      />
    </>
  );
}
