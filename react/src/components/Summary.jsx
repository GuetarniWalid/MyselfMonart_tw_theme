import { useState } from 'react';
import Select from './Select';
import { v4 } from 'uuid';

export default function Summary({
  optionIndexListSelected,
  setOptionIndexListSelected,
  optionSets,
  selectIndexSelected,
  setSelectIndexSelected,
  SummaryRef,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef
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
        CloseButtonRef={CloseButtonRef}
        isLast={index === optionSets.length - 1}
      />
    );
  });

  return (
    <div className="flex-none" ref={SummaryRef}>
      {selects}
    </div>
  );
}
