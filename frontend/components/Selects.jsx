import useProductData from '../hooks/useProductData';
import Select from './Select';
import { v4 } from 'uuid';

export default function Selects({
  optionSets,
  optionIndecesSelected,
  setOptionIndecesSelected,
  setCurrentOption,
  drawerOpen,
  mobileSummaryRef,
  focusedElemRef,
  openSelectId,
  setOpenSelectId,
}) {
  const { matter } = useProductData(optionIndecesSelected, optionSets);

  const selects = optionSets.map((optionSet, index) => {
    const selectId = `select-${index}`;
    return (
      <Select
        key={v4()}
        optionSet={optionSet}
        optionIndexSelected={optionIndecesSelected[index]}
        setOptionIndecesSelected={setOptionIndecesSelected}
        optionIndecesSelected={optionIndecesSelected}
        selectIndex={index}
        focusedElemRef={focusedElemRef}
        setOpenSelectId={setOpenSelectId}
        isOpen={
          focusedElemRef.current?.includes(selectId) &&
          openSelectId === selectId
        }
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        popupDirection="top"
        selectId={selectId}
        matter={matter}
      />
    );
  });

  return (
    <div className="flex-none" ref={mobileSummaryRef}>
      {selects}
    </div>
  );
}
