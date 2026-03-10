import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook to handle continuous firing of an action while a button is held down.
 * It also tracks the total delta accumulated during the hold.
 *
 * @param action - the function to call on every interval tick
 * @param delay - how long to wait before starting repeated actions (ms)
 * @param intervalLength - milliseconds between each action fire
 */
export const useContinuousHold = (
  action: () => void,
  delay: number = 400,
  intervalLength: number = 100
) => {
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const intervalTimer = useRef<number | null>(null);

  const start = useCallback(
    (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
      // Prevent context menus on long press
      if (e.cancelable) e.preventDefault();
      
      setIsPressing(true);

      // Fire the first action immediately on press
      action();

      // Setup the delay before interval firing
      pressTimer.current = window.setTimeout(() => {
        intervalTimer.current = window.setInterval(() => {
          action();
        }, intervalLength);
      }, delay);
    },
    [action, delay, intervalLength]
  );

  const stop = useCallback(() => {
    setIsPressing(false);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (intervalTimer.current) clearInterval(intervalTimer.current);
    pressTimer.current = null;
    intervalTimer.current = null;
  }, []);

  // Ensure timers are cleared on unmount
  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    isPressing,
    start,
    stop,
    handlers: {
      onPointerDown: start,
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
};
