export default function ImagePNGDrawer({
  src,
  alt,
  width,
  height,
  position,
  from,
  initClasses,
  visible,
  customStyle
}) {
  function getInitialTwClasses(from) {
    const positions = position.split(' ');
    const positionsWithoutFrom = positions.filter((p) => !p.includes(from));

    switch (from) {
      case 'left':
        return 'left-0';
      case 'right':
        return `right-0 translate-x-full ${positionsWithoutFrom.join(' ')}`;
      case 'top':
        return 'top-0';
      case 'bottom':
        return 'bottom-0';
      default:
        return '';
    }
  }
  const twClasses = visible ? position : getInitialTwClasses(from);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`absolute transition-transform duration-500 ease-in-out ${twClasses} ${initClasses}`}
      style={customStyle}
    />
  );
}
