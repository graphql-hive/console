import { useLayoutEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/components/theme/theme-provider';

// Style-related
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getNeutralColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-neutral-12').trim();
}

export function useChartStyles() {
  const { resolvedTheme } = useTheme();
  const [textColor, setTextColor] = useState(() => {
    // Read CSS variable on initial mount
    return getNeutralColor();
  });

  useLayoutEffect(() => {
    // Use requestAnimationFrame to ensure DOM updates are complete
    const rafId = requestAnimationFrame(() => {
      const color = getNeutralColor();
      setTextColor(color);
    });

    return () => cancelAnimationFrame(rafId);
  }, [resolvedTheme]);

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    legend: {
      textStyle: { color: textColor },
    },
  };
}

// Strings
export function pluralize(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return singular;
  }

  return plural;
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Errors
export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `Reached forbidden guard function with unexpected value: ${JSON.stringify(_value)}`,
  );
}

// Validation
export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T; // from lodash

export function truthy<T>(value: T): value is Truthy<T> {
  return !!value;
}
