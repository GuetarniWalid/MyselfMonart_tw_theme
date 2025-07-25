import { useEffect, useRef } from 'react';
import { v4 } from 'uuid';
import Option from './Option';
import InfoButton from './InfoButton';
import { setCurrentOption } from '../store/currentOption';
import { useOpenSelectId } from '../store/openSelectId';
import { useVariantSelected } from '../store/variantSelected';
import { isOptionExisting } from '../utils/functions';
import OptionPrice from './OptionPrice';
import { useFocusedElementRef } from '../store/FocusedElementContext';

export default function Select({
  options,
  drawerOpen,
  selectId,
  popupDirection,
}) {
  const selectRef = useRef(null);
  const firstOptionRef = useRef(null);
  const ariaControlsIdRef = useRef(v4());
  const focusedElementRef = useFocusedElementRef();

  const [openSelectId, setOpenSelectId] = useOpenSelectId();
  const [sizeSelected] = useVariantSelected.size();
  const [matterSelected] = useVariantSelected.matter();
  const availableOptions = options.filter((option) =>
    isOptionExisting(option, sizeSelected, matterSelected),
  );

  const [variantSelected] = useVariantSelected();
  const optionSelected = variantSelected[options[0].type];

  const isOpen =
    focusedElementRef.current?.includes(selectId) && openSelectId === selectId;

  useEffect(() => {
    if (focusedElementRef.current && focusedElementRef.current == selectId) {
      selectRef.current.focus();
    }
  }, []);

  function handleSelectClick(e) {
    e?.stopPropagation();
    if (isOpen) {
      focusedElementRef.current = selectId;
      selectRef.current.focus();
      setCurrentOption(null);
      setOpenSelectId(null);
      return;
    }
    focusedElementRef.current = selectId + '-option-0';
    setCurrentOption(optionSelected);
    setOpenSelectId(selectId);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectClick();
    }
  }

  function haveToBeHidden() {
    const index = Number(selectId.split('-')[1]);
    const openSelectIndex = Number(openSelectId?.split('-')[1]);
    return index < openSelectIndex;
  }
  const toBeHidden = haveToBeHidden();

  const optionList = availableOptions.map((option, index) => {
    return (
      <Option
        key={v4()}
        option={option}
        id={`${selectId}-option-${index}`}
        isOpen={isOpen}
        isFirst={index === 0}
        isLast={index === options.length - 1}
        firstOptionRef={firstOptionRef}
        selectId={selectId}
        handleSelectClick={handleSelectClick}
      />
    );
  });

  return (
    <div className={`flex gap-3 h-12 mb-3 ${toBeHidden ? 'hidden' : ''}`}>
      <div className="relative flex-1 h-full">
        <div
          className="react-select relative flex justify-between items-center rounded-lg px-3 h-full bg-white border-main border-neu shadow-neu-sm hover:shadow-neu-xs focus:outline-orange-500 focus:outline-2"
          role="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={ariaControlsIdRef.current}
          onClick={handleSelectClick}
          tabIndex={isOpen || !drawerOpen ? '-1' : '0'}
          onKeyDown={handleKeyDown}
          ref={selectRef}
          id={selectId}
        >
          <span className="absolute inset-0 rounded-lg bg-[#848484]/30 backdrop-blur-xl -z-10 md:hidden">
            {' '}
          </span>
          <span className="pointer-events-none">{optionSelected.name}</span>
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="rounded-lg px-2 py-1 whitespace-nowrap border-1 border-main text-sm">
              <OptionPrice option={optionSelected} />
            </span>
            <div className="w-6 h-6 flex justify-center items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6l1.41-1.42Z"
                />
              </svg>
            </div>
          </div>
        </div>
        {isOpen && (
          <ul
            aria-label={options[0].type}
            role="listbox"
            id={ariaControlsIdRef.current}
            className={`absolute w-full rounded-lg p-3 bg-white border-main border-neu shadow-neu-sm ${
              popupDirection === 'top'
                ? '-top-3 -translate-y-full'
                : '-bottom-3 translate-y-full'
            }`}
            aria-activedescendant={`${selectId}-option-0`}
          >
            {optionList}
          </ul>
        )}
      </div>
      <InfoButton option={optionSelected} nextToRadio={false} />
    </div>
  );
}
