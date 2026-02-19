import { useState } from 'react';
import { ChevronDown, ListFilter, X } from 'lucide-react';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/base/menu/menu';
import type { Story, StoryDefault } from '@ladle/react';
import { Flex } from './story-utils';
import { TriggerButton } from './trigger-button';

export default {
  title: 'Base / TriggerButton',
} satisfies StoryDefault;

export const rightIconWithSeparator: Story = () => (
  <Flex>
    <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: true }} />
  </Flex>
);

export const rightIconWithoutSeparator: Story = () => (
  <Flex>
    <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: false }} />
  </Flex>
);

export const WithSelectedValue: Story = () => (
  <Flex>
    <TriggerButton
      label="Operation"
      accessoryInformation="O9SwSomeOperationName"
      rightIcon={{ icon: X, action: () => alert('Cleared!'), label: 'Clear filter', withSeparator: true }}
    />
  </Flex>
);

export const Active: Story = () => (
  <Flex>
    <TriggerButton label="Client" accessoryInformation="2" variant="active" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
  </Flex>
);

export const DateTrigger: Story = () => (
  <Flex>
    <TriggerButton label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
  </Flex>
);

export const WithMenu: Story = () => {
  const [count, setCount] = useState(0);
  return (
    <Flex>
      <MenuRoot>
        <MenuTrigger
          render={
            <TriggerButton
              accessoryInformation={count > 0 ? count.toString() : undefined}
              label="Client"
              variant={count > 0 ? 'active' : 'default'}
              rightIcon={{ icon: ChevronDown, withSeparator: true }}
            />
          }
        />
        <MenuContent align="start">
          <MenuItem onClick={() => setCount(c => c + 1)}>Add selection</MenuItem>
          <MenuItem onClick={() => setCount(0)}>Clear</MenuItem>
        </MenuContent>
      </MenuRoot>
    </Flex>
  );
};

export const AllStates: Story = () => (
  <Flex>
    <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: true }} />
    <TriggerButton
      label="Operation"
      accessoryInformation="O9SwSomeOperationName"
      rightIcon={{ icon: X, action: () => {}, label: 'Clear filter', withSeparator: true }}
    />
    <TriggerButton label="Client" accessoryInformation="2" variant="active" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
    <TriggerButton label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
  </Flex>
);
