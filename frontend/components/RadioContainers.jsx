import Radios from './Radios';
import RadioContainer from './RadioContainer';
import { v4 } from 'uuid';
import { getOptionsList, isOptionExisting } from '../utils/functions';
import { useVariantSelected } from '../store/variantSelected';

export default function RadioContainers({
  drawerOpen,
}) {
  const [sizeSelected] = useVariantSelected.size();
  const [matterSelected] = useVariantSelected.matter();

  //without sizes
  const optionsList = getOptionsList().slice(1);
  const availableOptionsList = optionsList.filter(options => options.filter(option => isOptionExisting(option, sizeSelected, matterSelected)).length > 1);

  const radios = availableOptionsList.map((options, index) => {
    return (
      <RadioContainer
        key={v4()}
        bulletNb={index + 2}
        title={options[0].radio.container.title}
        hasSelector={false}
      >
        <Radios
          options={options}
          indexContainer={index + 1}
          drawerOpen={drawerOpen}
          isLastContainer={index === availableOptionsList.length - 1}
        />
      </RadioContainer>
    );
  });

  return <>{radios}</>;
}
