import { useState } from 'react';
import RadioContainer from './RadioContainer';
import Select from './Select';
import { v4 } from 'uuid';
import RadioContainers from './RadioContainers';

export default function DesktopRight({
  optionSets,
  optionIndexListSelected,
  selectIndexSelected,
  setSelectIndexSelected,
  setOptionIndexListSelected,
  setCurrentOption,
  drawerOpen,
  desktopSelectorRef,
  CloseButtonRef,
}) {
  const [selectFocused, setSelectFocused] = useState(null);
  return (
    <>
      <RadioContainer
        bulletNb={1}
        title="Choisissez votre taille"
        hasSelector={true}
      >
        <div ref={desktopSelectorRef}>
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
          />
        </div>
      </RadioContainer>
      <RadioContainers
        optionSets={optionSets}
        optionIndexListSelected={optionIndexListSelected}
        setOptionIndexListSelected={setOptionIndexListSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
      />
    </>
  );
}
