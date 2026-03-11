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
  intervalLength: number = 100,
  fireImmediately: boolean = true
) => {
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const intervalTimer = useRef<number | null>(null);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const start = useCallback(
    (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
      // Prevent context menus on long press
      if (e.cancelable) e.preventDefault();
      
      setIsPressing(true);

      if (fireImmediately) {
        actionRef.current();
      }

      // Setup the delay before firing the FIRST action (long press threshold)
      pressTimer.current = window.setTimeout(() => {
        // Fire the action once the long press delay is reached
        if (!fireImmediately) {
          actionRef.current();
        }
        
        // Then start the repeating interval
        intervalTimer.current = window.setInterval(() => {
          actionRef.current();
        }, intervalLength);
      }, delay);
    },
    [delay, intervalLength, fireImmediately]
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
