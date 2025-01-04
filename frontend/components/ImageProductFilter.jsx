export default function ImageProductFilter({ width, matter, shine }) {
  return (
    <>
      {matter === 'canvas' && (
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
      )}
      {(matter === 'aluminium' || matter === 'aluminium-plexi') && (
        <span
          className={`block absolute -top-10 -bottom-3 -left-10 w-1/3 rotate-12 bg-gradient-to-r ${
            shine === 'shine' || matter === 'aluminium-plexi'
              ? 'from-white/60 to-white/20'
              : 'from-white/50 to-white/0'
          }`}
        >
          {' '}
        </span>
      )}
      {(matter === 'poster') && (
        <span
          className={`block absolute top-1/2 -left-10 -right-10 h-2/3 bg-gradient-to-b from-transparent via-white/40 to-white/20'`}
        >
          {' '}
        </span>
      )}
    </>
  );
}
