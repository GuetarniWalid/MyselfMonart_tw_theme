import Select from './Select';
import { v4 } from 'uuid';
import { useVariantSelected } from '../store/variantSelected';
import { getOptionsList, isOptionExisting } from '../utils/functions';

export default function Selects({
  drawerOpen,
  mobileSummaryRef,
}) {
  const [sizeSelected] = useVariantSelected.size();
  const [matterSelected] = useVariantSelected.matter();

  const optionsList = getOptionsList();
  const availableOptionsList = optionsList.filter(
    (options) =>
      options.filter((option) =>
        isOptionExisting(option, sizeSelected, matterSelected),
      ).length > 1,
  );

  const selects = availableOptionsList.map((options, index) => {
    const selectId = `select-${index}`;
    return (
      <Select
        key={v4()}
        options={options}
        selectId={selectId}
        drawerOpen={drawerOpen}
        popupDirection="top"
      />
    );
  });

  return (
    <div id="selects-container" className="flex-none" ref={mobileSummaryRef}>
      {selects}
    </div>
  );
}
