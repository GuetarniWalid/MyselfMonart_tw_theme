import { useEffect, useRef } from 'react';
import { v4 } from 'uuid';
import Option from './Option';
import InfoButton from './InfoButton';

export default function Select({
  optionSet,
  optionIndexSelected,
  setOptionIndecesSelected,
  optionIndecesSelected,
  selectIndex,
  isOpen,
  setCurrentOption,
  drawerOpen,
  popupDirection,
  CloseButtonRef,
  isLastSelect,
  focusedElemRef,
  setOpenSelectId,
  selectId,
}) {
  const selectRef = useRef(null);
  const firstOptionRef = useRef(null);
  const ariaControlsIdRef = useRef(v4());
  
  useEffect(() => {
    if(focusedElemRef.current && focusedElemRef.current == selectId) {
      selectRef.current.focus()
      focusedElemRef.current == null
    }
  }, [])

  function handleSelectClick(e) {
    e.stopPropagation();
    if (isOpen) {
      setCurrentOption(null);
      focusedElemRef.current = selectId
      setOpenSelectId(null);
      return;
    }
    focusedElemRef.current = selectId + '-option-0';
    setOpenSelectId(selectId);
    setCurrentOption(optionSet[optionIndexSelected]);
  }

  function handleOptionClick(value, event) {
    const newOptionIndexListSelected = [...optionIndecesSelected];
    newOptionIndexListSelected[selectIndex] = value;
    setOptionIndecesSelected(newOptionIndexListSelected);
    setCurrentOption(optionSet[value]);
    focusedElemRef.current = event.target.id;
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectClick();
    }
  }

  const options = optionSet.map((option, index) => {
    return (
      <Option
        key={v4()}
        handleOptionClick={handleOptionClick}
        option={option}
        value={index}
        selected={index === optionIndexSelected}
        id={`${selectId}-option-${index}`}
        isOpen={isOpen}
        isFirst={index === 0}
        isLast={index === optionSet.length - 1}
        firstOptionRef={firstOptionRef}
        focusedElemRef={focusedElemRef}
        selectId={selectId}
        handleSelectClick={handleSelectClick}
      />
    );
  });

  return (
    <div className="flex gap-3 h-12 mb-3">
      <div className="relative flex-1 h-full">
        <div
          className={`relative flex justify-between items-center  rounded-lg px-3 h-full bg-white ${
            isOpen && 'outline outline-main outline-1'
          }`}
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
          <span className='pointer-events-none'>{optionSet[optionIndexSelected].name}</span>
          <div className="flex items-center gap-5 pointer-events-none">
            <span className="bg-main-10 rounded-lg px-2 py-1 whitespace-nowrap">
              {optionSet[optionIndexSelected].price} {moneySymbol}
            </span>
            <div className="w-6 h-6 bg-main-10 rounded-full flex justify-center items-center">
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
            aria-label={optionSet[optionIndexSelected].technicalType}
            role="listbox"
            id={ariaControlsIdRef.current}
            className={`absolute bg-white w-full rounded-lg p-3 ${
              popupDirection === 'top'
                ? '-top-3 -translate-y-full shadow-[0_-13px_28px_5px_rgba(0,0,0,0.1)]'
                : '-bottom-3 translate-y-full shadow-[0_13px_28px_5px_rgba(0,0,0,0.1)]'
            }`}
            aria-activedescendant={`${selectId}-option-${optionIndexSelected}`}
          >
            {options}
          </ul>
        )}
      </div>
      <InfoButton
        technicalName={optionSet[optionIndexSelected].technicalName}
        technicalType={optionSet[optionIndexSelected].technicalType}
        nextToRadio={false}
        CloseButtonRef={CloseButtonRef}
        isLast={isLastSelect}
      />
    </div>
  );
}
