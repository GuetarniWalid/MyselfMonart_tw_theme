export default function Image({ src, alt }) {
  return (
    <img
      src={`${src}&width=500`}
      alt={alt}
      width="500"
      height="500"
      loading="lazy"
      className="w-full"
    />
  );
}
