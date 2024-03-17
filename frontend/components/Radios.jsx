import Radio from './Radio';
import { v4 } from 'uuid';

export default function Radios({
  optionSet,
  optionIndexSelected,
  optionIndexListSelected,
  setOptionIndexListSelected,
  indexContainer,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
  isLastContainer,
  labelGroupId,
}) {
  return (
    <div
      className="flex flex-wrap"
      role="radiogroup"
      aria-labelledby={labelGroupId}
    >
      {optionSet.map((option, index) => {
        return (
          <Radio
            key={v4()}
            option={option}
            index={index}
            optionIndexListSelected={optionIndexListSelected}
            setOptionIndexListSelected={setOptionIndexListSelected}
            indexContainer={indexContainer}
            setCurrentOption={setCurrentOption}
            drawerOpen={drawerOpen}
            CloseButtonRef={CloseButtonRef}
            isLastRadio={index === optionSet.length - 1 && isLastContainer}
            isChecked={optionIndexSelected === index}
          />
        );
      })}
    </div>
  );
}
