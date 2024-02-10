import usePositionDependingSize from '../hooks/usePositionDependingSize';
import ImageProductFilter from './ImageProductFilter';

export default function ImageProduct({
  size,
  matter,
  shine,
  width,
}) {
  const positionClasses = usePositionDependingSize(size);

  return (
    <div
      className={`absolute shadow-2xl transition-all duration-200 ease-out ${positionClasses} rounded overflow-hidden`}
    >
      <img
        src={window.productImageSRC}
        srcSet={`${window.productImageSRC}?width=250 250w,
          ${window.productImageSRC}?width=400 400w,
          ${window.productImageSRC}?width=600 600w,
          ${window.productImageSRC}?width=800 800w,
          ${window.productImageSRC}?width=1000 1000w,
          ${window.productImageSRC}?width=1200 1200w,`}
        sizes="90vw"
        alt={window.productImageAlt}
        width={width}
        height="auto"
        className="max-w-none"
      />
      <ImageProductFilter width={width} matter={matter} shine={shine} />
    </div>
  );
}
