import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PopupInfo from './PopupInfo';

export default function InfoButton({
  technicalName,
  technicalType,
  nextToRadio,
}) {
  const [infoToShow, setInfoToShow] = useState(null);
  const [toFocus, setToFocus] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (toFocus) {
      ref.current.focus();
      setToFocus(false);
    }
  }, [toFocus]);

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setInfoToShow({
      technicalName,
      technicalType,
    });
  }

  function handleKeyDown(event) {
    if(event.key === 'Enter') {
      handleClick(event);
    }
  }

  return (
    <>
      <button
        className={`relative h-full w-12 rounded flex justify-center items-center bg-white/30 md:bg-white backdrop-blur-xl md:backdrop-blur-none text-white md:text-main outline outline-1 outline-white/90 focus:outline-orange-500 focus:outline-2${
          nextToRadio ? ' md:h-auto md:w-full gap-1 md:py-2 md:shadow' : ''
        } `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={ref}
      >
        <span className='absolute inset-0 rounded bg-[#848484]/40 backdrop-blur-xl -z-10 md:hidden'> </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 15 15"
        >
          <title>Information</title>
          <path
            fill="currentColor"
            d="M7.5 1C6.7 1 6 1.7 6 2.5S6.7 4 7.5 4S9 3.3 9 2.5S8.3 1 7.5 1M4 5v1s2 0 2 2v2c0 2-2 2-2 2v1h7v-1s-2 0-2-2V6c0-.5-.5-1-1-1z"
          />
        </svg>
        {nextToRadio && <span>Info</span>}
      </button>
      {infoToShow &&
        createPortal(
          <PopupInfo
            infoToShow={infoToShow}
            setInfoToShow={setInfoToShow}
            setToFocus={setToFocus}
          />,
          document.getElementById('addonsDrawer'),
        )}
    </>
  );
}
