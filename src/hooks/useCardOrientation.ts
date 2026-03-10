import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Custom hook that monitors an element's dimensions and
 * returns whether it is in a landscape (width >= height)
 * or portrait orientation.
 */
export const useCardOrientation = (ref: RefObject<HTMLElement | null>) => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    isLandscape: true,
  });

  useEffect(() => {
    if (!ref.current) return;
    
    const element = ref.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === element) {
          const { width, height } = entry.contentRect;
          setDimensions({
            width,
            height,
            isLandscape: width >= height,
          });
        }
      }
    });

    observer.observe(element);

    // Set initial size before resize events fire
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      setDimensions({
        width: rect.width,
        height: rect.height,
        isLandscape: rect.width >= rect.height,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return dimensions;
};
