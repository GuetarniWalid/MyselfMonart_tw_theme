import { useEffect, useRef } from 'react';

export default function   Option({
  handleOptionClick,
  option,
  value,
  selected,
  id,
  isOpen,
  isFirst,
  isLast,
  firstOptionRef,
  focusedElemRef,
  handleSelectClick,
}) {
  const ref = useRef(null)

  useEffect(() => {
    if(focusedElemRef.current && focusedElemRef.current == id) {
      ref.current.focus()
      focusedElemRef.current == null
    }
  }, [])
  

  useEffect(() => {
    if (isOpen && isFirst) {
      ref.current.focus();
      firstOptionRef.current = ref.current;
    }
  }, [isOpen]);

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionClick(value, event);
    }
    if (event.key === 'Tab' && isLast) {
      event.preventDefault();
      firstOptionRef.current.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleSelectClick()
    }
  };

  return (
    <li
      id={id}
      className={`${
        selected ? 'bg-white/50 md:bg-main-5 backdrop-blur-xl rounded-lg' : ''
      } flex justify-between py-3 px-5 mb-2 hover:bg-white/30 md:hover:bg-main-5 hover:backdrop-blur-xl md:hover:backdrop-blur-none rounded-lg cursor-pointer`}
      role="option"
      aria-selected={selected}
      onClick={(e) => handleOptionClick(value, e)}  
      tabIndex={isOpen ? '0' : '-1'}
      ref={ref}
      onKeyDown={handleKeyDown}
    >
      <span className='pointer-events-none'>{option.name}</span>
      <span className='pointer-events-none'>
        {option.price} {moneySymbol}
      </span>
    </li>
  );
}
