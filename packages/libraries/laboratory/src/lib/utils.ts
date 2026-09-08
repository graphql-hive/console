import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];

/** Formats a byte count for display, e.g. 0 -> "0 B", 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;

  // Bytes are always whole; larger units keep one decimal unless it is a round number.
  return `${exponent === 0 ? value : Number(value.toFixed(1))} ${BYTE_UNITS[exponent]}`;
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

/**
 * Ends a stream when the signal aborts, whatever the source does with it:
 * @graphql-tools/executor-legacy-ws ignores `request.signal` entirely, so a stopped
 * LEGACY_WS subscription would otherwise keep streaming until the server finished.
 * Racing the abort also covers a source whose return() never settles a pending next().
 */
export async function* untilAborted<T>(
  source: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncIterable<T> {
  const iterator = source[Symbol.asyncIterator]();
  const aborted = new Promise<{ done: true }>(resolve => {
    if (signal.aborted) {
      resolve({ done: true });
      return;
    }

    signal.addEventListener('abort', () => resolve({ done: true }), { once: true });
  });

  try {
    // The signal is checked first because a source that always has a value ready
    // wins every race against it, and the run would never stop.
    while (!signal.aborted) {
      const next = await Promise.race([iterator.next(), aborted]);

      if (next.done) {
        return;
      }

      yield next.value;
    }
  } finally {
    await iterator.return?.(undefined);
  }
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
