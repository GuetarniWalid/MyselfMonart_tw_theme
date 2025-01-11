import { useEffect, useRef } from 'react';
import data from '../../data/data';
import { getTechnicalKey } from '../../utils/functions';
import Image from './Image';
import YoutubeVideo from './YoutubeVideo';

export default function PopupInfo({ infoToShow, setInfoToShow, setToFocus }) {
  const ref = useRef(null);

  const technicalKey = getTechnicalKey(
    infoToShow.technicalType,
    infoToShow.technicalName,
    infoToShow.matter,
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

  function getYoutubeVideoId(technicalKey) {
    return data[technicalKey].popup.youtubeVideoId;
  }

  useEffect(() => {
    ref.current.focus();
  }, [infoToShow]);

  const youtubeVideoId = getYoutubeVideoId(technicalKey);

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
        {youtubeVideoId ? (
          <YoutubeVideo technicalKey={technicalKey} data={data} />
        ) : (
          <Image technicalKey={technicalKey} data={data} />
        )}
        <h4 className="my-8 text-xl px-8">{data[technicalKey].popup.title}</h4>
        <p
          className="leading-loose text-main-90 px-8"
          dangerouslySetInnerHTML={{
            __html: data[technicalKey].popup.description,
          }}
        />
      </div>
    </div>
  );
}
