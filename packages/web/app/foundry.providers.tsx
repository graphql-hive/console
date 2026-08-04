import { useEffect } from 'react';
import type { FoundryProvider } from 'react-foundry';
import { ThemeProvider, useTheme } from './src/components/theme/theme-provider';
import './src/index.css';
// Must come after index.css: it releases the app-shell rules that would otherwise paint
// foundry's own chrome.
import './foundry.css';

/**
 * Foundry's toolbar owns the light/dark/system choice and hands down an already-resolved
 * mode, so we drive ThemeProvider to that explicit value rather than letting it follow
 * the OS itself. Both would otherwise be resolving 'system' independently.
 */
function ThemeSynchronizer({ theme }: { theme: 'light' | 'dark' }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}

export const Provider: FoundryProvider = ({ children, theme }) => (
  <ThemeProvider>
    <ThemeSynchronizer theme={theme} />
    {children}
  </ThemeProvider>
);
