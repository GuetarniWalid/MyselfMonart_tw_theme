import { useEffect, useRef } from 'react';
import Image from './Image';
import YoutubeVideo from './YoutubeVideo';

export default function PopupInfo({ option, setShowPopup, setToFocus }) {
  const ref = useRef(null);

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup(false);
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

  function getPopupData() {
    const type = option.type;
    const [optionSelected] = window.paintingOptions[type].filter(o => o.key === option.key);
    return optionSelected.popup;
  }

  useEffect(() => {
    ref.current.focus();
  }, [option]);

  const popup = getPopupData();

  return (
    <div
      className="absolute inset-0 bg-black/30 flex justify-center items-center z-10"
      onClick={handleClick}
    >
      <div
        className="mx-3 bg-secondary rounded-xl w-full max-w-sm max-h-[90%] overflow-y-auto scrollbar-hidden pb-8"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={ref}
      >
        {popup.youtubeVideoId ? (
          <YoutubeVideo id={popup.youtubeVideoId} />
        ) : (
          <Image src={popup.image.src} alt={popup.image.alt} />
        )}
        <h4 className="my-8 text-xl px-8">{popup.title}</h4>
        <p
          className="leading-loose text-main-90 px-8"
          dangerouslySetInnerHTML={{
            __html: popup.description,
          }}
        />
      </div>
    </div>
  );
}
