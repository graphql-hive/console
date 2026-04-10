import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function splitIdentifier(input: string): string[] {
  return input
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map(w => w.toLowerCase());
}

export async function asyncInterval(
  fn: () => Promise<void>,
  delay: number,
  signal?: AbortSignal,
): Promise<void> {
  while (!signal?.aborted) {
    await fn();

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
  }
}
