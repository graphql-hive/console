import { useState } from 'react';
import { Check, FileText, LogOut, Plus, Settings, Users } from 'lucide-react';
import { Checkbox, CheckboxIndicator } from '@/components/base/checkbox';
import {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRoot,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuContent,
  MenuSubmenuTrigger,
  MenuTrigger,
} from '@/components/base/menu';
import type { Story, StoryDefault } from '@ladle/react';
import { Flex } from './story-utils';

export default {
  title: 'UI / Menu',
} satisfies StoryDefault;

export const Default: Story = () => (
  <Flex>
    <MenuRoot>
      <MenuTrigger className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
        Open Menu
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={() => console.log('settings')}>
          <Settings className="mr-2 size-4" />
          Settings
        </MenuItem>
        <MenuItem onClick={() => console.log('docs')}>
          <FileText className="mr-2 size-4" />
          Documentation
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => console.log('logout')}>
          <LogOut className="mr-2 size-4" />
          Log out
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  </Flex>
);

export const WithSubmenu: Story = () => (
  <Flex>
    <MenuRoot>
      <MenuTrigger className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
        User Menu
      </MenuTrigger>
      <MenuContent align="start">
        <MenuLabel>Jon Doe</MenuLabel>
        <MenuSeparator />
        <MenuSubmenu>
          <MenuSubmenuTrigger>
            <Users className="mr-2 size-4" />
            Switch organization
          </MenuSubmenuTrigger>
          <MenuSubmenuContent>
            <MenuItem active>acme-corp</MenuItem>
            <MenuItem>personal</MenuItem>
            <MenuItem>test-org</MenuItem>
            <MenuSeparator />
            <MenuItem>
              <Plus className="mr-2 size-4" />
              Create organization
            </MenuItem>
          </MenuSubmenuContent>
        </MenuSubmenu>
        <MenuItem>
          <Settings className="mr-2 size-4" />
          Profile settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem>
          <LogOut className="mr-2 size-4" />
          Log out
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  </Flex>
);

export const WithCheckboxItems: Story = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set(['typescript']));

  function toggle(item: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  const items = ['typescript', 'javascript', 'python', 'rust'];

  return (
    <Flex>
      <MenuRoot>
        <MenuTrigger className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
          Languages ({selected.size})
        </MenuTrigger>
        <MenuContent>
          {items.map(item => (
            <MenuItem key={item} closeOnClick={false} onClick={() => toggle(item)}>
              <Checkbox
                checked={selected.has(item)}
                size="sm"
                tabIndex={-1}
                aria-hidden
                style={{ pointerEvents: 'none' }}
              >
                <CheckboxIndicator>
                  <Check className="size-3" strokeWidth={3} />
                </CheckboxIndicator>
              </Checkbox>
              <span className="ml-2">{item}</span>
            </MenuItem>
          ))}
        </MenuContent>
      </MenuRoot>
    </Flex>
  );
};
