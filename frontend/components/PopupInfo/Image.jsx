export default function Image({ technicalKey, data }) {
  return (
    <img
      src={`${data[technicalKey].popup.image.src}&width=500`}
      alt={data[technicalKey].popup.image.alt}
      width="500"
      height="500"
      loading="lazy"
      className="w-full"
    />
  );
}
