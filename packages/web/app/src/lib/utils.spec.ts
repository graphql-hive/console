// @vitest-environment jsdom
import { ThemeProvider } from '@/components/theme/theme-provider';
import { renderHook } from '@testing-library/react';
import { cn, useResolvedColors } from './utils';

describe('cn', () => {
  it('joins class names and drops the falsy ones', () => {
    expect(cn('flex', undefined, false && 'hidden', null, 'grid')).toBe('flex grid');
    expect(cn(['flex', 'grid'], { hidden: true, block: false })).toBe('flex grid hidden');
  });

  it('keeps every class: conflicts are for the cascade layers, not the join', () => {
    expect(cn('flex', 'grid', 'flex')).toBe('flex grid flex');
  });
});

describe('useResolvedColors', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('resolves theme variables to hex for widgets that cannot read CSS', () => {
    document.documentElement.style.setProperty('--fg', '0 0% 0%');
    document.documentElement.style.setProperty('--critical', '0 100% 50%');
    const { result } = renderHook(() => useResolvedColors(), { wrapper: ThemeProvider });
    expect(result.current.fg).toBe('#000000');
    expect(result.current.critical).toBe('#ff0000');
  });
});
