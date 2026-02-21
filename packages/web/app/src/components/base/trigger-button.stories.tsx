import { useState } from 'react';
import { ChevronDown, ListFilter, RefreshCw, X } from 'lucide-react';
import { Menu, MenuItem } from '@/components/base/menu/menu';
import type { Story, StoryDefault } from '@ladle/react';
import { Flex } from './story-utils';
import { TriggerButton } from './trigger-button';

export default {
  title: 'Base / TriggerButton',
} satisfies StoryDefault;

export const Default: Story = () => (
  <Flex>
    <TriggerButton label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
    <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: true }} />
    <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: false }} />
  </Flex>
);

export const Active: Story = () => (
  <Flex>
    <TriggerButton
      label="Client"
      accessoryInformation="2"
      variant="active"
      rightIcon={{ icon: ChevronDown, withSeparator: true }}
    />
    <TriggerButton
      label="Operation"
      accessoryInformation="O9SwSomeOperationName"
      variant="default"
      rightIcon={{
        icon: X,
        action: () => alert('Cleared!'),
        label: 'Clear filter',
        withSeparator: true,
      }}
    />
  </Flex>
);

export const Action: Story = () => (
  <Flex>
    <TriggerButton label="Save this filter view" variant="action" />
    <TriggerButton
      label="Save this filter view"
      variant="action"
      rightIcon={{ icon: ChevronDown, withSeparator: false }}
    />
  </Flex>
);

export const IconOnly: Story = () => (
  <Flex>
    <TriggerButton layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />
    <TriggerButton layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="active" />
    <TriggerButton layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="action" />
  </Flex>
);

export const WithMenu: Story = () => {
  const [count, setCount] = useState(0);
  return (
    <Flex>
      <Menu
        trigger={
          <TriggerButton
            accessoryInformation={count > 0 ? count.toString() : undefined}
            label="Client"
            variant={count > 0 ? 'active' : 'default'}
            rightIcon={{ icon: ChevronDown, withSeparator: true }}
          />
        }
        align="start"
        sections={[
          [
            <MenuItem key="add" onClick={() => setCount(c => c + 1)}>
              Add selection
            </MenuItem>,
            <MenuItem key="clear" onClick={() => setCount(0)}>
              Clear
            </MenuItem>,
          ],
        ]}
      />
    </Flex>
  );
};
