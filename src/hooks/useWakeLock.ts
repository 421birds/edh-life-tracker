import { useEffect, useRef } from 'react';

/**
 * Custom hook to prevent device sleep using the Screen Wake Lock API.
 * @param enabled Whether to request the wake lock.
 */
export const useWakeLock = (enabled: boolean) => {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    if (!enabled || !('wakeLock' in navigator)) {
      return;
    }

    const requestWakeLock = async () => {
      try {
        // Request a screen wake lock
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active');
        
        // Listen for the lock being released (e.g. if the user switches tabs)
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
        });
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    // Re-request the wake lock when the page becomes visible again
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
};
