import { useEffect, useRef } from 'react';
import data from '../data/data';
import { getTechnicalKey } from '../utils/functions';

export default function PopupInfo({ infoToShow, setInfoToShow, setToFocus }) {
  const ref = useRef(null);

  const technicalKey = getTechnicalKey(
    infoToShow.technicalType,
    infoToShow.technicalName,
  );

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setInfoToShow(null);
    setToFocus(true);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
      handleClick(event);
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      ref.current.focus();
    }
  }

  useEffect(() => {
    ref.current.focus();
  }, [infoToShow]);

  return (
    <div
      className="absolute inset-0 bg-black/30 flex justify-center items-center z-10"
      onClick={handleClick}
    >
      <div
        className="mx-3 bg-secondary p-8 rounded-xl border-main border-1 wt-full max-w-sm max-h-[90%] overflow-y-auto scrollbar-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={ref}
      >
        <img
          src={`${data[technicalKey].popup.image.src}&width=340`}
          alt={data[technicalKey].popup.image.alt}
          width={data[technicalKey].popup.image.width}
          height={data[technicalKey].popup.image.height}
          loading="lazy"
        />
        <h4 className="my-8 text-xl">{data[technicalKey].popup.title}</h4>
        <p
          className="leading-loose text-main-90"
          dangerouslySetInnerHTML={{
            __html: data[technicalKey].popup.description,
          }}
        />
      </div>
    </div>
  );
}
