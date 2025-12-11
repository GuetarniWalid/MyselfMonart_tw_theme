import Radio from './Radio';
import { v4 } from 'uuid';
import { useVariantSelected } from '../store/variantSelected';
import { isOptionExisting } from '../utils/functions';

export default function Radios({
  options,
  indexContainer,
  drawerOpen,
  isLastContainer,
}) {
  const [sizeSelected] = useVariantSelected.size();
  const availableOptions = options.filter(option => isOptionExisting(option, sizeSelected));

  return (
    <div className="flex flex-wrap md:justify-center" role="radiogroup">
      {availableOptions.map((option, index) => {
        return (
          <Radio
            key={v4()}
            option={option}
            index={index}
            indexContainer={indexContainer}
            drawerOpen={drawerOpen}
            isLastRadio={index === options.length - 1 && isLastContainer}
          />
        );
      })}
    </div>
  );
}
