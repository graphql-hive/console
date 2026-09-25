import { cn } from './utils';

describe('cn', () => {
  it('keeps a text colour next to one of the theme font sizes', () => {
    // Regression: tailwind-merge read `text-control` and `text-2xs` as colours and dropped the
    // colour merged with them, so every base field rendered in its inherited colour.
    expect(cn('text-fg h-9 text-control')).toBe('text-fg h-9 text-control');
    expect(cn('text-fg text-2xs font-mono')).toBe('text-fg text-2xs font-mono');
  });

  it('still resolves a font size conflict to the last one', () => {
    expect(cn('text-sm', 'text-control')).toBe('text-control');
    expect(cn('text-control', 'text-sm')).toBe('text-sm');
  });

  it('still resolves a colour conflict to the last one', () => {
    expect(cn('text-fg-default text-control', 'text-fg')).toBe('text-control text-fg');
  });
});
