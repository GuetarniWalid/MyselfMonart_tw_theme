export default function ImageProductFilter({ width }) {
  // Always show canvas painting texture filter for all products
  return (
    <img
      src="https://cdn.shopify.com/s/files/1/0623/2388/4287/files/texture-toile.jpg?v=1706818351"
      alt={window.canvasTexture}
      width={width}
      height="auto"
      srcSet="https://cdn.shopify.com/s/files/1/0623/2388/4287/files/texture-toile.jpg?v=1706818351&width=250 250w,https://cdn.shopify.com/s/files/1/0623/2388/4287/files/texture-toile.jpg?v=1706818351&width=400 400w,https://cdn.shopify.com/s/files/1/0623/2388/4287/files/texture-toile.jpg?v=1706818351&width=600 600w,https://cdn.shopify.com/s/files/1/0623/2388/4287/files/texture-toile.jpg?v=1706818351&width=800 800w"
      sizes="95vw"
      className="absolute top-0 left-0 w-full h-full object-cover opacity-10"
      loading="lazy"
    />
  );
}
