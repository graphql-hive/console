import '../src/index.css';
import './ladle.css';
import { useEffect } from 'react';
import type { GlobalProvider } from '@ladle/react';
import { ThemeProvider, useTheme } from '../src/components/theme/theme-provider';

function ThemeSynchronizer({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    if (theme === 'dark' || theme === 'light') {
      setTheme(theme);
    } else {
      setTheme('system');
    }
  }, [theme, setTheme]);
  return null;
}

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <ThemeProvider>
    <ThemeSynchronizer theme={globalState.theme} />
    {children}
  </ThemeProvider>
);
