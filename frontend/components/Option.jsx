import { useEffect, useMemo, useRef } from 'react';
import { useVariantSelected } from '../store/variantSelected';
import { setCurrentOption } from '../store/currentOption';
import OptionPrice from './OptionPrice';
import { getVariantBySizeAndMatter } from '../utils/functions';
import useIsMobile from '../hooks/useIsMobile';
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
  const isMobile = useIsMobile();
  const [variantSelected] = useVariantSelected();
  const [sizeSelected] = useVariantSelected.size();
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

  function isMatterExisting() {
    return getVariantBySizeAndMatter(sizeSelected.name, option.name);
  }

  const isSelected = option.key === optionSelected.key;
  const isExisting = useMemo(() => {
    if (option.type === 'matter') return true;

    const variants = window.variants;
    const size =
      option.type === 'size' ? option.name : variantSelected.size.name;
    const matter = variantSelected.matter.name;
    const variant = variants.find(
      (variant) => variant.option1 === size && variant.option2 === matter,
    );
    return !!variant;
  }, [variantSelected]);

  const isMatterExist = option.type === 'matter' ? isMatterExisting() : true;
  const isDisabled = !isExisting || !isMatterExist;
  
  return (
    <li
      id={id}
      className={`${
        isSelected ? 'bg-main-10 rounded-lg border-main border-1' : ''
      }
        ${
          isDisabled
            ? isMobile
              ? 'rounded-lg cursor-not-allowed text-gray-600'
              : 'bg-gray-200 rounded-lg cursor-not-allowed text-gray-600'
            : 'cursor-pointer hover:bg-white/30 md:hover:bg-main-5 hover:backdrop-blur-xl md:hover:backdrop-blur-none'
        }
      flex justify-between py-3 px-5 mb-2 rounded-lg`}
      role="option"
      aria-selected={isSelected}
      onClick={isDisabled ? undefined : handleClick}
      tabIndex={isOpen ? '0' : '-1'}
      ref={ref}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
    >
      <span className={`${isDisabled ? 'line-through' : ''} pointer-events-none`}>{option.name}</span>
      <span className="pointer-events-none">
        <OptionPrice option={option} isDisabled={isDisabled}/>
      </span>
    </li>
  );
}
