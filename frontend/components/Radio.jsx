import { useEffect, useRef } from 'react';
import InfoButton from './InfoButton';
import OptionPrice from './OptionPrice';
import { useVariantSelected } from '../store/variantSelected';
import { getVariantBySizeAndMatter } from '../utils/functions';
import { useFocusedElementRef } from '../store/FocusedElementContext';

export default function Radio({
  option,
  index,
  indexContainer,
  drawerOpen,
  isLastRadio,
}) {
  const ref = useRef(null);
  const focusedElementRef = useFocusedElementRef();
  const [sizeSelected] = useVariantSelected.size();
  const [optionSelected, setOptionSelected] =
    useVariantSelected[option.type]();

  useEffect(() => {
    if (
      focusedElementRef.current &&
      focusedElementRef.current[0] === indexContainer &&
      focusedElementRef.current[1] === index
    ) {
      ref.current.focus();
      focusedElementRef.current = null;
    }
  }, []);

  function handleRadioClick() {
    setOptionSelected(option);
    focusedElementRef.current = [indexContainer, index];
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleRadioClick();
    }
  }

  function isMatterExisting() {
    return getVariantBySizeAndMatter(sizeSelected.name, option.name);
  }

  const isChecked = optionSelected.key === option.key;
  const isMatterExist = option.type === 'matter' ? isMatterExisting() : true;

  return (
    <div className="lg:w-1/2 p-1 w-full">
      <div
        ref={ref}
        onClick={isMatterExist ? handleRadioClick : undefined}
        onKeyDown={isMatterExist ? handleKeyDown : undefined}
        className={`${option.type} ${optionSelected.key} ${option.key} flex flex-col justify-between px-4 py-5 rounded h-full text-center ${
          isChecked
            ? 'bg-main-5 outline outline-main-20 outline-1 focus:outline-main-50 focus:outline-2'
            : ''
        } ${
          isMatterExist
            ? 'cursor-pointer hover:bg-main-5'
            : 'cursor-not-allowed opacity-50'
        }`}
        tabIndex={drawerOpen ? 0 : -1}
        role="radio"
        aria-checked={isChecked ? 'true' : 'false'}
        aria-labelledby={'label-' + option.name}
      >
        <div>
          <img
            src={option.radio.image.src}
            alt={option.radio.image.alt}
            width={200}
            srcSet={`${option.radio.image.src}&width=200 200w, ${option.radio.image.src}&width=300 300w, ${option.radio.image.src}&width=400 400w`}
            sizes="(max-width: 836px) 300px, (max-width: 1023px) 400px, (max-width: 1120px) 200px, 300px"
            loading="lazy"
            className="h-36 object-contain mx-auto"
          />
          <p className="my-2 text-lg" id={'label-' + option.name}>
            {option.name}
          </p>
        </div>
        <div>
          <p className="inline-block bg-main-5 rounded-lg px-4 py-1 whitespace-nowrap my-4">
            <OptionPrice option={option} />
          </p>
          <InfoButton
            option={option}
            nextToRadio={true}
            isLastRadio={isLastRadio}
          />
        </div>
      </div>
    </div>
  );
}
