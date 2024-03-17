import { useEffect } from 'react';

export default function Option({
  handleOptionClick,
  option,
  value,
  selected,
  id,
  isOpen,
  isFirst,
  isLast,
  firstOptionRef,
  setSelectIndexSelected,
}) {
  useEffect(() => {
    if (isOpen && isFirst) {
      firstOptionRef.current.focus();
    }
  }, [isOpen]);

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionClick(value);
    }
    if (event.key === 'Tab' && isLast) {
      event.preventDefault();
      firstOptionRef.current.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSelectIndexSelected(null);
    }
  };

  return (
    <li
      id={id}
      className={`${
        selected && 'bg-main/5'
      } flex justify-between py-3 px-5 mb-2 hover:bg-main/5 cursor-pointer`}
      role="option"
      aria-selected={selected}
      onClick={() => handleOptionClick(value)}
      tabIndex={isOpen ? '0' : '-1'}
      ref={isFirst ? firstOptionRef : null}
      onKeyDown={handleKeyDown}
    >
      <span>{option.name}</span>
      <span>
        {option.price} {moneySymbol}
      </span>
    </li>
  );
}
