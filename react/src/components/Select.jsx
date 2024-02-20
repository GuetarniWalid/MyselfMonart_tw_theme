import { useEffect, useRef } from 'react';
import { v4 } from 'uuid';
import Option from './Option';
import SelectInfoButton from './SelectInfoButton';

export default function Select({
  optionSet,
  optionIndexSelected,
  setOptionIndexListSelected,
  optionIndexListSelected,
  selectIndex,
  setSelectIndexSelected,
  isOpen,
  setSelectFocused,
  isFocused,
  setCurrentOption,
  drawerOpen,
  CloseButtonRef,
  isLast,
}) {
  const selectRef = useRef(null);
  const firstOptionRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      selectRef.current.focus();
    }
  }, [isFocused]);

  function handleSelectClick() {
    if (isOpen) {
      setSelectIndexSelected(null);
      return;
    }
    setCurrentOption(optionSet[optionIndexSelected]);
    setSelectFocused(selectIndex);
    setSelectIndexSelected(selectIndex);
  }

  function handleOptionClick(value) {
    setSelectIndexSelected(null);
    const newOptionIndexListSelected = [...optionIndexListSelected];
    newOptionIndexListSelected[selectIndex] = value;
    setOptionIndexListSelected(newOptionIndexListSelected);
    setCurrentOption(optionSet[value]);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectClick();
    } else if (event.key === 'Tab' && isLast) {
      event.preventDefault();
      CloseButtonRef.current.focus();
    }
  }

  const optionIdBase = `option-${selectIndex}`;

  const options = optionSet.map((option, index) => {
    return (
      <Option
        key={v4()}
        handleOptionClick={handleOptionClick}
        option={option}
        value={index}
        selected={index === optionIndexSelected}
        id={`${optionIdBase}-${index}`}
        isOpen={isOpen}
        isFirst={index === 0}
        isLast={index === optionSet.length - 1}
        firstOptionRef={firstOptionRef}
        setSelectIndexSelected={setSelectIndexSelected}
        selectRef={selectRef}
      />
    );
  });

  return (
    <div className="flex gap-3 h-12 mb-3">
      <div className="relative flex-1 h-full">
        <div
          className={`relative flex justify-between items-center  rounded-lg px-3 h-full bg-white ${
            isOpen && 'border-main border-1'
          }`}
          role="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={handleSelectClick}
          tabIndex={isOpen || !drawerOpen ? '-1' : '0'}
          onKeyDown={handleKeyDown}
          ref={selectRef}
        >
          <span>{optionSet[optionIndexSelected].name}</span>
          <div className="flex items-center gap-5">
            <span className="bg-main/10 rounded-lg px-2 py-1 whitespace-nowrap">
              {optionSet[optionIndexSelected].price} {moneySymbol}
            </span>
            <div className="w-6 h-6 bg-main/10 rounded-full flex justify-center items-center">
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
            role="listbox"
            className="absolute bg-white -top-3 -translate-y-full w-full rounded-lg p-3 shadow-[0_-13px_28px_5px_rgba(0,0,0,0.1)]"
            aria-activedescendant={`${optionIdBase}-${optionIndexSelected}`}
          >
            {options}
          </ul>
        )}
      </div>
      <SelectInfoButton
        technicalName={optionSet[optionIndexSelected].technicalName}
        technicalType={optionSet[optionIndexSelected].technicalType}
      />
    </div>
  );
}
