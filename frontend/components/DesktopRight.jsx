import RadioContainer from './RadioContainer';
import Select from './Select';
import { v4 } from 'uuid';
import RadioContainers from './RadioContainers';
import { getOptionsByType } from '../utils/functions';


export default function DesktopRight({
  drawerOpen,
  desktopSelectorRef,
}) {
  const sizes = getOptionsByType('size');

  return (
    <div className="hidden md:block h-full overflow-y-auto custom-scrollbar pr-5">
      <RadioContainer
        bulletNb={1}
        title={sizes[0].radio.container.title}
        hasSelector={true}
      >
        <div ref={desktopSelectorRef}>
          <Select
            key={v4()}
            options={sizes}
            drawerOpen={drawerOpen}
            selectId="select-0"
            popupDirection="bottom"
          />
        </div>
      </RadioContainer>
      <RadioContainers
        drawerOpen={drawerOpen}
      />
    </div>
  );
}
