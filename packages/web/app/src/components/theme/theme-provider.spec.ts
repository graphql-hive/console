// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useMonacoTheme } from './theme-provider';

describe('useMonacoTheme', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => localStorage.clear());

  it.each([
    ['light', 'vs'],
    ['dark', 'vs-dark'],
  ])('maps the %s app theme to the built-in %s Monaco theme', (theme, expected) => {
    localStorage.setItem('hive-theme', theme);
    const { result } = renderHook(() => useMonacoTheme(), { wrapper: ThemeProvider });
    expect(result.current).toBe(expected);
  });
});
