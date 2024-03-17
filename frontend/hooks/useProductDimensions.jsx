import { useEffect, useState } from 'react';
import { getWidthAccordingScene } from '../utils/functions';

export default function useProductDimensions(size, sceneRef) {
  const [productWidth, setProductWidth] = useState(400);

  useEffect(() => {
    const updateProductWidth = () => {
      const sceneWidth = sceneRef.current?.offsetWidth;

      if (size.width <= 40) {
        setProductWidth(getWidthAccordingScene(40, sceneWidth));
      } else if (size.width <= 60) {
        setProductWidth(getWidthAccordingScene(50, sceneWidth));
      } else if (size.width <= 75) {
        setProductWidth(getWidthAccordingScene(55, sceneWidth));
      } else if (size.width <= 80) {
        setProductWidth(getWidthAccordingScene(60, sceneWidth));
      } else if (size.width <= 100) {
        setProductWidth(getWidthAccordingScene(70, sceneWidth));
      } else if (size.width <= 120) {
        setProductWidth(getWidthAccordingScene(80, sceneWidth));
      } else {
        setProductWidth(getWidthAccordingScene(90, sceneWidth));
      }
    };

    updateProductWidth();
    window.addEventListener('resize', updateProductWidth);

    return () => window.removeEventListener('resize', updateProductWidth);
  }, [size, sceneRef]);
  return productWidth;
}
