import { useState } from 'react';

export function useTimed(wait: number = 1000) {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const handler = () => {
    if (timer) {
        clearTimeout(timer);
    }
    setTimer(setTimeout(() => {
      setTimer(null)
    }, wait));
  }
  return [timer !== null, handler] as const;
}
