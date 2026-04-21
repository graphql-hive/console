import { useState } from 'react';
import { Check, FileText, LogOut, Settings } from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Menu, MenuItem } from './menu/menu';
import { Popover } from './popover/popover';
import { Select } from './select/select';
import { TriggerButton } from './trigger-button';

export default {
  title: 'UI / Shared Styles',
} satisfies StoryDefault;

const selectOptions = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'LATENCY:p99', label: 'p99 latency' },
];

export const SideBySide: Story = () => {
  const [selectValue, setSelectValue] = useState('TRAFFIC');

  return (
    <div className="flex gap-12 p-16">
      {/* Column 1: Menu */}
      <div className="flex w-64 flex-col gap-4">
        <h3 className="text-neutral-12 text-sm font-semibold uppercase tracking-wider">Menu</h3>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Default</p>
          <Menu
            trigger={
              <TriggerButton label="Open Menu" />
            }
            sections={[
              [
                <MenuItem key="settings">
                  <Settings className="mr-2 size-4" />
                  Settings
                </MenuItem>,
                <MenuItem key="docs">
                  <FileText className="mr-2 size-4" />
                  Documentation
                </MenuItem>,
              ],
              <MenuItem key="logout">
                <LogOut className="mr-2 size-4" />
                Log out
              </MenuItem>,
            ]}
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">With action variant</p>
          <Menu
            trigger={
              <TriggerButton label="Actions" variant="action" />
            }
            sections={[
              [
                <MenuItem key="approve" variant="action">
                  <Check className="mr-2 size-4" />
                  Approve
                </MenuItem>,
                <MenuItem key="delete" variant="destructiveAction">
                  <LogOut className="mr-2 size-4" />
                  Delete
                </MenuItem>,
              ],
            ]}
          />
        </div>
      </div>

      {/* Column 2: Select */}
      <div className="flex w-64 flex-col gap-4">
        <h3 className="text-neutral-12 text-sm font-semibold uppercase tracking-wider">Select</h3>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Default</p>
          <Select
            options={selectOptions}
            value={selectValue}
            onValueChange={setSelectValue}
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Small</p>
          <Select
            options={[
              { value: '5', label: '5m' },
              { value: '30', label: '30m' },
              { value: '60', label: '1h' },
              { value: '10080', label: '7d' },
            ]}
            value="10080"
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Placeholder</p>
          <Select
            options={selectOptions}
            placeholder="Choose metric…"
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Custom trigger</p>
          <Select
            options={selectOptions}
            value={selectValue}
            onValueChange={setSelectValue}
            trigger={
              <TriggerButton label={selectOptions.find(o => o.value === selectValue)?.label ?? 'Pick…'} variant="action" />
            }
          />
        </div>
      </div>

      {/* Column 3: Popover */}
      <div className="flex w-64 flex-col gap-4">
        <h3 className="text-neutral-12 text-sm font-semibold uppercase tracking-wider">Popover</h3>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Structured (with title)</p>
          <Popover
            trigger={
              <TriggerButton label="Open Popover" />
            }
            title="Alert details"
            description="Configure the alert threshold and notification settings."
            content={
              <div className="space-y-2">
                <div className="text-neutral-11 text-sm">
                  Status: <span className="text-green-400">Normal</span>
                </div>
                <div className="text-neutral-11 text-sm">
                  Last evaluated: 2 minutes ago
                </div>
              </div>
            }
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">Raw content</p>
          <Popover
            trigger={
              <TriggerButton label="Info" />
            }
            content={
              <div className="p-3">
                <p className="text-neutral-11 text-sm">
                  This is a raw popover with custom content and no header.
                </p>
              </div>
            }
          />
        </div>

        <div>
          <p className="text-neutral-10 mb-2 text-xs">With arrow</p>
          <Popover
            trigger={
              <TriggerButton label="With Arrow" />
            }
            title="Tooltip-style"
            content={
              <p className="text-neutral-11 text-sm">
                Arrows point to the trigger element.
              </p>
            }
            arrow
          />
        </div>
      </div>
    </div>
  );
};
