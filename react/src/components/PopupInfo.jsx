import data from '../data/data';
import { getTechnicalKey } from '../utils/functions';

export default function PopupInfo({ infoToShow, setInfoToShow }) {
  const technicalKey = getTechnicalKey(
    infoToShow.technicalType,
    infoToShow.technicalName,
  );

  function handleClick() {
    setInfoToShow(null);
  }

  return (
    <div
      className="absolute inset-0 bg-black/30 flex justify-center items-center"
      onClick={handleClick}
    >
      <div className="mx-3 bg-secondary p-8 rounded-xl border-main border-1 wt-full max-w-sm max-h-[90%] overflow-y-auto scrollbar-hidden">
        <img
          src={data[technicalKey].popup.image.src}
          alt={data[technicalKey].popup.image.alt}
          width={data[technicalKey].popup.image.width}
          height={data[technicalKey].popup.image.height}
          className=""
        />
        <h4 className="my-8 text-xl">{data[technicalKey].popup.title}</h4>
        <p
          className="leading-loose text-main/90"
          dangerouslySetInnerHTML={{
            __html: data[technicalKey].popup.description,
          }}
        />
      </div>
    </div>
  );
}
