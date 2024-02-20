export default function useImagePNGToShow(currentOption) {
  const currentOptionIsSize = currentOption?.technicalType === 'size';

  return {
    showGirl: currentOptionIsSize,
    showFurniture: !currentOptionIsSize,
  };
}
