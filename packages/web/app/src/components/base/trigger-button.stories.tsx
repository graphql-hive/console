import { useState } from 'react';
import { ListFilter } from 'lucide-react';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/base/menu/menu';
import type { Story, StoryDefault } from '@ladle/react';
import { Flex } from './story-utils';
import { TriggerButton } from './trigger-button';

export default {
  title: 'Base / TriggerButton',
} satisfies StoryDefault;

export const Default: Story = () => (
  <Flex>
    <TriggerButton label="Filter" icon={<ListFilter className="size-4" />} />
  </Flex>
);

export const WithSelectedValue: Story = () => (
  <Flex>
    <TriggerButton
      label="Operation"
      value="O9SwSomeOperationName"
      onDismiss={() => alert('Cleared!')}
    />
  </Flex>
);

export const Active: Story = () => (
  <Flex>
    <TriggerButton label="Client" badge={2} variant="active" />
  </Flex>
);

export const DateTrigger: Story = () => (
  <Flex>
    <TriggerButton label="Last 7 days" />
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
              label="Client"
              badge={count > 0 ? count : undefined}
              variant={count > 0 ? 'active' : 'default'}
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
    <TriggerButton label="Filter" icon={<ListFilter className="size-4" />} />
    <TriggerButton label="Operation" value="O9SwSomeOperationName" onDismiss={() => {}} />
    <TriggerButton label="Client" badge={2} variant="active" />
    <TriggerButton label="Last 7 days" />
  </Flex>
);
