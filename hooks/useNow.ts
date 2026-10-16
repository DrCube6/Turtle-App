import { useEffect, useState } from 'react';

// Current time, refreshed every `intervalMs` - for "5 min ago" labels
export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
