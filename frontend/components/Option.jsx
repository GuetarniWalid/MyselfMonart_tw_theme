import { useEffect, useRef } from 'react';
import { useVariantSelected } from '../store/variantSelected';
import { setCurrentOption } from '../store/currentOption';
import OptionPrice from './OptionPrice';
import { useFocusedElementRef } from '../store/FocusedElementContext';

export default function Option({
  id,
  option,
  isOpen,
  isFirst,
  isLast,
  firstOptionRef,
  handleSelectClick,
}) {
  const ref = useRef(null);
  const focusedElementRef = useFocusedElementRef();
  const [optionSelected, setOptionSelected] =
    useVariantSelected[option.type]();

  useEffect(() => {
    if (focusedElementRef.current && focusedElementRef.current == id) {
      ref.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen && isFirst) {
      ref.current.focus();
      firstOptionRef.current = ref.current;
    }
  }, [isOpen]);

  function handleClick(e) {
    e?.stopPropagation();
    setCurrentOption(option);
    setOptionSelected(option);
    focusedElementRef.current = e.target.id;
    handleSelectClick();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
    if (event.key === 'Tab' && isLast) {
      event.preventDefault();
      firstOptionRef.current.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleSelectClick();
    }
  }

  const isSelected = option.key === optionSelected.key;

  return (
    <li
      id={id}
      className={`${
        isSelected ? 'bg-main-10 rounded-lg border-main border-1' : ''
      } cursor-pointer hover:bg-white/30 md:hover:bg-main-5 hover:backdrop-blur-xl md:hover:backdrop-blur-none flex justify-between items-center py-3 px-5 mb-2 rounded-lg`}
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      tabIndex={isOpen ? '0' : '-1'}
      ref={ref}
      onKeyDown={handleKeyDown}
    >
      <span className="pointer-events-none">{option.name}</span>
      <span className="pointer-events-none max-w-20">
        <OptionPrice option={option} />
      </span>
    </li>
  );
}
