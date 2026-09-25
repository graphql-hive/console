import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');

// Base components keep the neutral scale for their internal step ladders.
const ALLOWED = ['components/base/', 'lib/color-tokens.spec.ts'];

const PALETTES =
  'red|yellow|green|orange|blue|emerald|amber|zinc|indigo|lime|pink|purple|rose|teal|slate|gray|stone|sky|cyan|violet|fuchsia';

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'raw palette', pattern: new RegExp(`-(?:${PALETTES})-\\d{2,3}\\b`) },
  { name: 'neutral step', pattern: /\b[a-z]+(?:-[trblxy])?-neutral-\d+/ },
  { name: 'arbitrary color', pattern: /-\[(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/ },
  {
    name: 'hardcoded svg paint',
    pattern: /(?<=\s)(?:fill|stroke)=\{?["'](?:black|white|#[0-9a-fA-F]{3,8})["']/,
  },
  {
    name: 'hardcoded black/white',
    pattern: /\?\s*["'](?:black|white)["']|:\s*["'](?:black|white)["']\s*\}/,
  },
];

export function findRawColors(source: string): string[] {
  return source
    .split('\n')
    .flatMap((line, index) =>
      RULES.filter(rule => rule.pattern.test(line)).map(rule => `${index + 1}: ${rule.name}`),
    );
}

describe('findRawColors', () => {
  it('flags raw colors', () => {
    expect(findRawColors('<p className="text-red-500" />')).toEqual(['1: raw palette']);
    expect(findRawColors("'hover:bg-neutral-4'")).toEqual(['1: neutral step']);
    expect(findRawColors('<div className="bg-[#030711]" />')).toEqual(['1: arbitrary color']);
    expect(findRawColors('<rect fill="black" />')).toEqual(['1: hardcoded svg paint']);
    expect(findRawColors("fill={open ? 'currentColor' : 'black'}")).toEqual([
      '1: hardcoded black/white',
    ]);
  });

  it('ignores roles and css variables', () => {
    expect(
      findRawColors(
        '<p className="text-critical bg-surface-card border-line hover:bg-critical-tint" />',
      ),
    ).toEqual([]);
    expect(findRawColors("fill={open ? 'var(--color-fg-inverse)' : 'currentColor'}")).toEqual([]);
    expect(findRawColors("s.getPropertyValue('--neutral-12')")).toEqual([]);
  });
});

describe('app source', () => {
  it('uses semantic color roles outside components/base', () => {
    const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
      .filter(file => /\.tsx?$/.test(file))
      .filter(file => !ALLOWED.some(prefix => file.startsWith(prefix)));

    const offenders = files.flatMap(file =>
      findRawColors(readFileSync(join(SRC, file), 'utf8')).map(
        hit => `${relative(SRC, join(SRC, file))}:${hit}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});
