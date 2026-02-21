import { useState } from 'react';
import { FileText, LogOut, Plus, Settings, Users } from 'lucide-react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Menu, MenuItem } from '@/components/base/menu/menu';
import type { Story, StoryDefault } from '@ladle/react';
import { Flex } from '../story-utils';

export default {
  title: 'UI / Menu',
} satisfies StoryDefault;

export const Default: Story = () => (
  <Flex>
    <Menu
      trigger={
        <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
          Open Menu
        </button>
      }
      sections={[
        [
          <MenuItem key="settings" onClick={() => console.log('settings')}>
            <Settings className="mr-2 size-4" />
            Settings
          </MenuItem>,
          <MenuItem key="docs" onClick={() => console.log('docs')}>
            <FileText className="mr-2 size-4" />
            Documentation
          </MenuItem>,
        ],
        <MenuItem key="logout" onClick={() => console.log('logout')}>
          <LogOut className="mr-2 size-4" />
          Log out
        </MenuItem>,
      ]}
    />
  </Flex>
);

export const WithSubmenu: Story = () => (
  <Flex>
    <Menu
      trigger={
        <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
          User Menu
        </button>
      }
      align="start"
      sections={[
        [
          <Menu
            key="org"
            trigger={
              <MenuItem>
                <Users className="mr-2 size-4" />
                Switch organization
              </MenuItem>
            }
            sections={[
              [
                <MenuItem key="acme" active>acme-corp</MenuItem>,
                <MenuItem key="personal">personal</MenuItem>,
                <MenuItem key="test">test-org</MenuItem>,
              ],
              <MenuItem key="create">
                <Plus className="mr-2 size-4" />
                Create organization
              </MenuItem>,
            ]}
          />,
          <MenuItem key="settings">
            <Settings className="mr-2 size-4" />
            Profile settings
          </MenuItem>,
        ],
        <MenuItem key="logout">
          <LogOut className="mr-2 size-4" />
          Log out
        </MenuItem>,
      ]}
    />
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
      <Menu
        trigger={
          <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
            Languages ({selected.size})
          </button>
        }
        sections={[
          items.map(item => (
            <MenuItem key={item} closeOnClick={false} onClick={() => toggle(item)}>
              <Checkbox checked={selected.has(item)} size="sm" visual />
              <span className="ml-2">{item}</span>
            </MenuItem>
          )),
        ]}
      />
    </Flex>
  );
};
