import { useLayoutEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/components/theme/theme-provider';

// Style-related
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function readChartStyles() {
  const s = getComputedStyle(document.documentElement);
  const textColor = s.getPropertyValue('--color-neutral-12').trim();
  const hsl = (name: string) => `hsl(${s.getPropertyValue(name).trim()})`;
  return {
    styles: {
      backgroundColor: 'transparent' as const,
      textStyle: { color: textColor },
      legend: { textStyle: { color: textColor } },
    },
    colors: {
      primary: hsl('--chart-1'),
      error: hsl('--chart-2'),
      p75: hsl('--chart-3'),
      p90: hsl('--chart-4'),
      p95: hsl('--chart-5'),
      p99: hsl('--chart-6'),
      grid: hsl('--chart-grid'),
    },
  };
}

export function useChartStyles() {
  const { resolvedTheme } = useTheme();
  const [value, setValue] = useState(() => readChartStyles());

  useLayoutEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setValue(readChartStyles());
    });
    return () => cancelAnimationFrame(rafId);
  }, [resolvedTheme]);

  return value;
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
