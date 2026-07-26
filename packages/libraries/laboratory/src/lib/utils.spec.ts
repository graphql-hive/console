import { formatBytes, tokenizeUrls } from './utils';

describe('formatBytes', () => {
  it('renders small payloads in bytes instead of rounding them away to 0', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(142)).toBe('142 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('switches to KB at 1024 and keeps one decimal', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(20_480)).toBe('20 KB');
  });

  it('switches to MB and GB, capping at the largest unit', () => {
    expect(formatBytes(1024 ** 2)).toBe('1 MB');
    expect(formatBytes(2.5 * 1024 ** 2)).toBe('2.5 MB');
    expect(formatBytes(1024 ** 3)).toBe('1 GB');
    expect(formatBytes(1024 ** 4)).toBe('1024 GB');
  });

  it('treats negative and non-finite values as empty', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
  });

  it('counts UTF-8 bytes rather than string length for multi-byte content', () => {
    const text = JSON.stringify({ name: '日本語' });
    expect(text.length).toBe(14);
    expect(formatBytes(new TextEncoder().encode(text).length)).toBe('20 B');
  });
});

describe('tokenizeUrls', () => {
  it('returns nothing for an empty string', () => {
    expect(tokenizeUrls('')).toEqual([]);
  });

  it('keeps plain text with no URL as a single text token', () => {
    expect(tokenizeUrls('no links here')).toEqual([{ type: 'text', value: 'no links here' }]);
  });

  it('does not linkify bare domains or non-http(s) schemes', () => {
    const input = 'go to example.com or javascript:alert(1) or data:text/html,x or ftp://h/f';
    expect(tokenizeUrls(input)).toEqual([{ type: 'text', value: input }]);
  });

  it('linkifies an http URL surrounded by text', () => {
    expect(tokenizeUrls('visit http://example.com now')).toEqual([
      { type: 'text', value: 'visit ' },
      { type: 'url', value: 'http://example.com' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('linkifies a URL at the start and at the end without empty text tokens', () => {
    expect(tokenizeUrls('https://a.com')).toEqual([{ type: 'url', value: 'https://a.com' }]);
    expect(tokenizeUrls('see https://a.com')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'url', value: 'https://a.com' },
    ]);
  });

  it('linkifies multiple URLs in one string', () => {
    expect(tokenizeUrls('a https://one.com b https://two.com')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'url', value: 'https://one.com' },
      { type: 'text', value: ' b ' },
      { type: 'url', value: 'https://two.com' },
    ]);
  });

  it('preserves query strings and fragments inside the URL', () => {
    expect(tokenizeUrls('open https://example.com/device?code=ABCD-1234#frag')).toEqual([
      { type: 'text', value: 'open ' },
      { type: 'url', value: 'https://example.com/device?code=ABCD-1234#frag' },
    ]);
  });

  it('strips trailing sentence punctuation from the URL', () => {
    expect(tokenizeUrls('go https://example.com.')).toEqual([
      { type: 'text', value: 'go ' },
      { type: 'url', value: 'https://example.com' },
      { type: 'text', value: '.' },
    ]);
    expect(tokenizeUrls('really https://example.com?!')).toEqual([
      { type: 'text', value: 'really ' },
      { type: 'url', value: 'https://example.com' },
      { type: 'text', value: '?!' },
    ]);
  });

  it('drops an unbalanced closing paren that wraps the URL', () => {
    expect(tokenizeUrls('(see https://x.com/a)')).toEqual([
      { type: 'text', value: '(see ' },
      { type: 'url', value: 'https://x.com/a' },
      { type: 'text', value: ')' },
    ]);
  });

  it('keeps balanced parens that are part of the URL', () => {
    expect(tokenizeUrls('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual([
      { type: 'url', value: 'https://en.wikipedia.org/wiki/Foo_(bar)' },
    ]);
    expect(tokenizeUrls('https://en.wikipedia.org/wiki/Foo_(bar).')).toEqual([
      { type: 'url', value: 'https://en.wikipedia.org/wiki/Foo_(bar)' },
      { type: 'text', value: '.' },
    ]);
  });

  it('preserves newlines and surrounding whitespace', () => {
    expect(tokenizeUrls('line1\nhttps://x.com\nline2')).toEqual([
      { type: 'text', value: 'line1\n' },
      { type: 'url', value: 'https://x.com' },
      { type: 'text', value: '\nline2' },
    ]);
  });

  it('handles a wrapping paren and a trailing period together', () => {
    const input = 'Wrapped: (see https://example.com/a). Trailing: https://example.com/b.';
    expect(tokenizeUrls(input)).toEqual([
      { type: 'text', value: 'Wrapped: (see ' },
      { type: 'url', value: 'https://example.com/a' },
      { type: 'text', value: ').' },
      { type: 'text', value: ' Trailing: ' },
      { type: 'url', value: 'https://example.com/b' },
      { type: 'text', value: '.' },
    ]);
  });
});
