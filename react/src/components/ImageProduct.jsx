import { forwardRef } from 'react';
import ImageProductFilter from './ImageProductFilter';

const ImageProduct = forwardRef(({ matter, shine, width }, ref) => {
  return (
    <div
      className={`relative inline-block shadow-2xl transition-all duration-200 ease-out rounded overflow-hidden`}
      ref={ref}
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
});
export default ImageProduct;
