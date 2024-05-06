import data from '../data/data';
import { getTechnicalKey } from '../utils/functions';
import InfoButton from './InfoButton';

export default function Radio({
  option,
  index,
  optionIndexListSelected,
  setOptionIndexListSelected,
  indexContainer,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
  isLastRadio,
  isChecked,
}) {
  const technicalKey = getTechnicalKey(
    option.technicalType,
    option.technicalName,
  );

  function handleRadioClick() {
    const newOptionIndexListSelected = [...optionIndexListSelected];
    newOptionIndexListSelected[indexContainer] = index;
    setOptionIndexListSelected(newOptionIndexListSelected);
    setCurrentOption(option);
  }

  return (
    <div className="lg:w-1/2 p-1">
      <div
        onClick={handleRadioClick}
        className={`flex flex-col justify-between hover:bg-main-5 px-4 py-5 rounded h-full text-center cursor-pointer ${
          isChecked &&
          'bg-main-5 outline outline-main-20 outline-1 focus:outline-main-50 focus:outline-2'
        }`}
        tabIndex={drawerOpen ? 0 : -1}
        role="radio"
        aria-checked={isChecked ? 'true' : 'false'}
        aria-labelledby={'label-' + option.name}
      >
        <div>
          <img
            src={data[technicalKey].radio.image.src}
            alt={data[technicalKey].radio.image.alt}
            width={data[technicalKey].radio.image.width}
            height={data[technicalKey].radio.image.height}
            srcSet={`${data[technicalKey].radio.image.src}&width=200 200w, ${data[technicalKey].radio.image.src}&width=300 300w, ${data[technicalKey].radio.image.src}&width=400 400w`}
            sizes="(max-width: 836px) 300px, (max-width: 1023px) 400px, (max-width: 1120px) 200px, 300px"
            loading="lazy"
            className="h-36 object-contain"
          />
          <p className="my-2 text-lg" id={'label-' + option.name}>
            {option.name}
          </p>
        </div>
        <div>
          <p className="inline-block bg-main-5 rounded-lg px-4 py-1 whitespace-nowrap my-4">
            {option.price}
            {moneySymbol}
          </p>
          <InfoButton
            technicalName={option.technicalName}
            technicalType={option.technicalType}
            nextToRadio={true}
            CloseButtonRef={CloseButtonRef}
            isLast={isLastRadio}
          />
        </div>
      </div>
    </div>
  );
}
