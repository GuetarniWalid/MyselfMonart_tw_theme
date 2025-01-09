export default function Image({ technicalKey, data }) {
  return (
    <img
      src={`${data[technicalKey].popup.image.src}&width=500`}
      alt={data[technicalKey].popup.image.alt}
      width={data[technicalKey].popup.image.width}
      height={data[technicalKey].popup.image.height}
      loading="lazy"
      className="w-full"
    />
  );
}
