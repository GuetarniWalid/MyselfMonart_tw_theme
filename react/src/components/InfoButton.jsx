import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PopupInfo from './PopupInfo';

export default function InfoButton({
  technicalName,
  technicalType,
  nextToRadio,
  CloseButtonRef,
  isLast,
}) {
  const [infoToShow, setInfoToShow] = useState(null);
  const [toFocus, setToFocus] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (toFocus) {
      ref.current.focus();
      setToFocus(false);
      console.log(document.activeElement);
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
    if (event.key === 'Tab' && isLast) {
      event.preventDefault();
      CloseButtonRef.current.focus();
    }
  }

  return (
    <>
      <button
        className={`bg-white h-full w-12 rounded flex justify-center items-center ${
          nextToRadio ? 'md:h-auto md:w-full gap-1 md:py-2 md:shadow' : ''
        } `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={ref}
      >
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
