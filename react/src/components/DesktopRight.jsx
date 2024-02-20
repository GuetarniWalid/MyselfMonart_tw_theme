import { useState } from 'react';
import RadioContainer from './RadioContainer';
import Select from './Select';
import { v4 } from 'uuid';

export default function DesktopRight({
  optionSets,
  optionIndexListSelected,
  selectIndexSelected,
  setSelectIndexSelected,
  setOptionIndexListSelected,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
}) {
  const [selectFocused, setSelectFocused] = useState(null);
  

  return (
    <RadioContainer>
      <Select
        key={v4()}
        optionSet={optionSets[0]}
        optionIndexSelected={optionIndexListSelected[0]}
        setOptionIndexListSelected={setOptionIndexListSelected}
        optionIndexListSelected={optionIndexListSelected}
        selectIndex={0}
        setSelectIndexSelected={setSelectIndexSelected}
        isOpen={selectIndexSelected === 0}
        setSelectFocused={setSelectFocused}
        isFocused={selectFocused === 0 && !(selectIndexSelected === 0)}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
        isLast={false}
      />
    </RadioContainer>
  );
}
