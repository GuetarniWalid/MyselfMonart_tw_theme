import Radios from './Radios';
import RadioContainer from './RadioContainer';
import data from '../data/data';
import { v4 } from 'uuid';

export default function RadioContainers({
  optionSets,
  optionIndexListSelected,
  setOptionIndexListSelected,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
}) {
  //without sizes
  const radios = optionSets.slice(1).map((optionSet, index) => {
    const labelGroupId =
      'labelGroupId' + data[optionSet[0].technicalType].radio.title.split(' ').join('');
    return (
      <RadioContainer
        key={v4()}
        bulletNb={index + 2}
        title={data[optionSet[0].technicalType].radio.title}
        hasSelector={false}
        labelGroupId={labelGroupId}
      >
        <Radios
          optionSet={optionSet}
          optionIndexSelected={optionIndexListSelected[index + 1]}
          optionIndexListSelected={optionIndexListSelected}
          setOptionIndexListSelected={setOptionIndexListSelected}
          indexContainer={index + 1}
          setCurrentOption={setCurrentOption}
          drawerOpen={drawerOpen}
          CloseButtonRef={CloseButtonRef}
          isLastContainer={index === optionSets.length - 2}
          labelGroupId={labelGroupId}
        />
      </RadioContainer>
    );
  });

  return <>{radios}</>;
}
