import { useEffect, useRef, useState } from 'react';
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
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  const [bottomOffset, setBottomOffset] = useState(0);

  const [openSelectId, setOpenSelectId] = useOpenSelectId();
  const [sizeSelected] = useVariantSelected.size();
  const availableOptions = options.filter((option) =>
    isOptionExisting(option, sizeSelected),
  );

  const [variantSelected] = useVariantSelected();
  const optionSelected = variantSelected[options[0].type];

  // Guard against undefined optionSelected
  if (!optionSelected) {
    console.error('Option selected is undefined for type:', options[0]?.type);
    return null;
  }

  const isOpen =
    focusedElementRef.current?.includes(selectId) && openSelectId === selectId;

  useEffect(() => {
    if (focusedElementRef.current && focusedElementRef.current == selectId) {
      selectRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current && popupDirection === 'top') {
      const containerRect = containerRef.current.getBoundingClientRect();
      const safetyPadding = 16; // 16px padding from top of viewport

      // Use a small delay to ensure dropdown is rendered and has dimensions
      setTimeout(() => {
        if (dropdownRef.current) {
          const dropdownHeight = dropdownRef.current.scrollHeight;
          const topPosition = containerRect.bottom - dropdownHeight;

          // Check if dropdown would overflow the top
          if (topPosition < safetyPadding) {
            // Calculate how much we need to shift down
            const shiftDown = safetyPadding - topPosition;
            setBottomOffset(-shiftDown); // Negative to shift down from bottom:0
          } else {
            setBottomOffset(0); // No shift needed
          }
        }
      }, 0);
    } else {
      setBottomOffset(0);
    }
  }, [isOpen, popupDirection]);

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
      <div className="relative flex-1 h-full" ref={containerRef}>
        <div
          className={`react-select relative flex justify-between items-center rounded-lg px-3 h-full bg-white border-main border-neu shadow-neu-sm hover:shadow-neu-xs focus:outline-orange-500 focus:outline-2 ${isOpen ? 'opacity-0 pointer-events-none' : ''}`}
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
          <span className="inline-block max-w-48 pointer-events-none truncate overflow-hidden text-ellipsis whitespace-nowrap">{optionSelected.name}</span>
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="rounded-lg px-2 py-1 whitespace-nowrap border-1 border-main text-sm">
              <OptionPrice option={optionSelected} reason={window.react.errorMessage.poster} />
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
            ref={dropdownRef}
            aria-label={options[0].type}
            role="listbox"
            id={ariaControlsIdRef.current}
            className={`absolute w-full rounded-lg p-3 bg-white border-main border-neu shadow-neu-sm z-50 ${
              popupDirection === 'top'
                ? 'bottom-0'
                : 'top-0'
            }`}
            style={bottomOffset !== 0 && popupDirection === 'top' ? { bottom: `${bottomOffset}px` } : undefined}
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
