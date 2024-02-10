export default function usePositionDependingSize(size) {
  function getTopClass() {
    if (size.width <= 60) {
      return 'top-8';
    } else {
      return'top-8';
    }
  }

  return `left-1/2 -translate-x-1/2 ${getTopClass()}`;
}
