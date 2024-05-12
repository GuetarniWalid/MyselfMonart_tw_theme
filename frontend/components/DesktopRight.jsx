import { useState } from 'react';
import RadioContainer from './RadioContainer';
import Select from './Select';
import { v4 } from 'uuid';
import RadioContainers from './RadioContainers';

export default function DesktopRight({
  optionSets,
  optionIndecesSelected,
  setOptionIndecesSelected,
  setCurrentOption,
  drawerOpen,
  desktopSelectorRef,
  CloseButtonRef,
  focusedElemRef,
  openElemRef,
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
            optionIndexSelected={optionIndecesSelected[0]}
            setOptionIndecesSelected={setOptionIndecesSelected}
            optionIndecesSelected={optionIndecesSelected}
            selectIndex={0}
            isOpen={
              focusedElemRef.current?.includes('select-0') &&
              openElemRef.current === 'select-0'
            }
            setSelectFocused={setSelectFocused}
            setCurrentOption={setCurrentOption}
            drawerOpen={drawerOpen}
            focusedElemRef={focusedElemRef}
            openElemRef={openElemRef}
            selectId="select-0"
          />
        </div>
      </RadioContainer>
      <RadioContainers
        optionSets={optionSets}
        optionIndecesSelected={optionIndecesSelected}
        setOptionIndecesSelected={setOptionIndecesSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
        focusedElemRef={focusedElemRef}
      />
    </>
  );
}
