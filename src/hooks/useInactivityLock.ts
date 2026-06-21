"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function useInactivityLock() {
  const { lockVault, isLocked } = useAuth();
  const [timeLeftMs, setTimeLeftMs] = useState(TIMEOUT_MS);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // If the vault is currently locked, ensure the timer reads 15:00 and don't start any countdown.
    if (isLocked) {
      setTimeLeftMs(TIMEOUT_MS);
      return;
    }

    // The exact moment the vault is unlocked, we initialize the countdown.
    // This absolutely guarantees that time spent on the Lock Screen does not count as inactivity.
    lastActivityRef.current = Date.now();
    setTimeLeftMs(TIMEOUT_MS);

    let isThrottled = false;
    let throttleTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      if (isThrottled) return;
      isThrottled = true;
      
      // Update the reference to the exact millisecond the user was active
      lastActivityRef.current = Date.now();
      setTimeLeftMs(TIMEOUT_MS);
      
      // Throttle for 1 second to prevent massive state updates
      throttleTimeout = setTimeout(() => { 
        isThrottled = false; 
      }, 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = Math.max(0, TIMEOUT_MS - elapsed);
      
      setTimeLeftMs(remaining);

      // If 15 minutes of absolute inactivity pass, lock the vault immediately.
      if (remaining === 0) {
        lockVault();
      }
    }, 1000);

    // Cleanup function when component unmounts or lockVault reference changes
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
      clearTimeout(throttleTimeout);
    };
  }, [isLocked, lockVault]); // We only re-run this effect if the lock state changes

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return {
    timeLeftMs,
    timeLeftFormatted: formatTime(timeLeftMs)
  };
}
