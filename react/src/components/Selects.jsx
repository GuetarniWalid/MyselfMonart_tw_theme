import { useState } from 'react';
import Select from './Select';
import { v4 } from 'uuid';

export default function Selects({
  optionSets,
  optionIndexListSelected,
  setOptionIndexListSelected,
  selectIndexSelected,
  setSelectIndexSelected,
  setCurrentOption,
  drawerOpen,
  mobileSummaryRef,
  CloseButtonRef,
}) {
  const [selectFocused, setSelectFocused] = useState(null);

  const selects = optionSets.map((optionSet, index) => {
    const isOpen = selectIndexSelected === index;
    return (
      <Select
        key={v4()}
        optionSet={optionSet}
        optionIndexSelected={optionIndexListSelected[index]}
        setOptionIndexListSelected={setOptionIndexListSelected}
        optionIndexListSelected={optionIndexListSelected}
        selectIndex={index}
        setSelectIndexSelected={setSelectIndexSelected}
        isOpen={isOpen}
        setSelectFocused={setSelectFocused}
        isFocused={selectFocused === index && !isOpen}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        popupDirection="top"
        CloseButtonRef={CloseButtonRef}
        isLastSelect={index === optionSets.length - 1}
      />
    );
  });

  return (
    <div className="flex-none" ref={mobileSummaryRef}>
      {selects}
    </div>
  );
}
