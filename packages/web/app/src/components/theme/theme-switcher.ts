import { Monitor, Moon, Sun } from 'lucide-react';
import type { MenuEntry } from '@/components/base/floating/menu/menu';
import { useTheme, type Theme } from './theme-provider';

const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function useThemeMenuEntry(): MenuEntry {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return {
    kind: 'submenu',
    label: 'Theme',
    icon: resolvedTheme === 'dark' ? Moon : Sun,
    items: [
      [
        {
          kind: 'radio',
          value: theme,
          onValueChange: value => setTheme(value as Theme),
          options: themes,
        },
      ],
    ],
  };
}
