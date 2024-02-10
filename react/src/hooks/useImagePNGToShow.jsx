export default function useImagePNGToShow(currentOption) {
  const currentOptionIsSize = currentOption?.technicalType === 'size';

  return {
    showGirl: currentOptionIsSize,
    showPlant: !currentOptionIsSize,
    showCouch: !currentOptionIsSize,
  };
}
