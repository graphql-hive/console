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

    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, delay);

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}

export function isAsyncIterable<T>(val: unknown): val is AsyncIterable<T> {
  return typeof Object(val)[Symbol.asyncIterator] === 'function';
}

// Exclude whitespace and characters that are never part of a bare URL in log text.
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/g;

export type TextToken = { type: 'text'; value: string } | { type: 'url'; value: string };

/**
 * Split text into plain-text and http(s) URL tokens, preserving all original characters
 * (incl. newlines/whitespace). Only https?:// is matched, so javascript:/data: can't be linked.
 */
export function tokenizeUrls(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    let url = match[0];
    // Trailing punctuation is usually sentence punctuation, not part of the URL.
    let trailer = url.match(/[.,;:!?]+$/)?.[0] ?? '';
    if (trailer) {
      url = url.slice(0, -trailer.length);
    }
    // Drop an unbalanced closing paren, e.g. "(see https://x.com/a)".
    if (url.endsWith(')') && !url.includes('(')) {
      url = url.slice(0, -1);
      trailer = ')' + trailer;
    }

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    tokens.push({ type: 'url', value: url });
    if (trailer) {
      tokens.push({ type: 'text', value: trailer });
    }
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}
