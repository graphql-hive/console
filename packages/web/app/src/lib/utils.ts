import { useLayoutEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/components/theme/theme-provider';

// Style-related
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert HSL values (h in degrees, s and l in percent) to a hex string. */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function readChartStyles() {
  const s = getComputedStyle(document.documentElement);
  const textColor = s.getPropertyValue('--color-neutral-12').trim();

  // Convert HSL CSS variables (e.g. "45 93% 47%") to hex strings.
  // ECharts can't parse modern comma-less HSL like hsl(45 93% 47%),
  // so we convert to hex which it handles natively.
  const hex = (name: string) => {
    const raw = s.getPropertyValue(name).trim();
    if (!raw) return '#888';
    const [h, sVal, l] = raw.split(' ').map(v => parseFloat(v));
    return hslToHex(h, sVal, l);
  };

  /** Convert a raw HSL CSS variable to an rgba() string with the given alpha. */
  const rgba = (name: string, alpha: number) => {
    const raw = s.getPropertyValue(name).trim();
    if (!raw) return `rgba(128,128,128,${alpha})`;
    const [h, sVal, l] = raw.split(' ').map(v => parseFloat(v));
    const hexColor = hslToHex(h, sVal, l);
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return {
    styles: {
      backgroundColor: 'transparent' as const,
      textStyle: { color: textColor },
      legend: { textStyle: { color: textColor } },
    },
    colors: {
      primary: hex('--chart-1'),
      error: hex('--chart-2'),
      p75: hex('--chart-3'),
      p90: hex('--chart-4'),
      p95: hex('--chart-5'),
      p99: hex('--chart-6'),
      grid: hex('--chart-grid'),
      /** Semi-transparent text color overlay — for label pills on colored surfaces. */
      overlayBg: rgba('--neutral-12', 0.7),
      /** Page-background color — for text on overlayBg pills. */
      overlayText: hex('--neutral-1'),
      /** Semi-transparent text color — for subtle borders on colored surfaces. */
      overlayBorder: rgba('--neutral-12', 0.2),
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
