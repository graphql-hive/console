import { useEffect, useState } from 'react';

export const useIsInView = (ref: React.RefObject<HTMLDivElement>) => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(entry.isIntersecting);
        }
      });

      observer.observe(ref.current);

      return () => observer.disconnect();
    }
  }, [ref]);

  return isInView;
};
