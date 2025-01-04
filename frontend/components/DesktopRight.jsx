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
  openSelectId,
  setOpenSelectId,
}) {
  return (
    <div className='hidden md:block h-full overflow-y-auto custom-scrollbar pr-5'>
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
              openSelectId === 'select-0'
            }
            setCurrentOption={setCurrentOption}
            drawerOpen={drawerOpen}
            focusedElemRef={focusedElemRef}
            setOpenSelectId={setOpenSelectId}
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
    </div>
  );
}
