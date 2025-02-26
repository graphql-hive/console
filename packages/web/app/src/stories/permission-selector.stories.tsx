import { useState } from 'react';
import { makeFragmentData } from '@/gql';
import { Meta, StoryObj } from '@storybook/react';
import {
  PermissionSelector,
  PermissionSelector_PermissionGroupsFragment,
  PermissionSelectorProps,
} from '../components/organization/members/permission-selector';
import { availableMemberPermissionGroups } from './utils';

const meta: Meta<typeof PermissionSelector> = {
  title: 'Permission Selector',
  component: PermissionSelector,
};

export default meta;

type Story = StoryObj<typeof PermissionSelector>;

const defaultProps: Omit<
  PermissionSelectorProps,
  'selectedPermissionIds' | 'onSelectedPermissionsChange'
> = {
  permissionGroups: availableMemberPermissionGroups.map(value =>
    makeFragmentData(value as any, PermissionSelector_PermissionGroupsFragment),
  ),
  isReadOnly: false,
};

function Template(args: PermissionSelectorProps) {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(() => new Set<string>());

  return (
    <PermissionSelector
      {...defaultProps}
      {...args}
      selectedPermissionIds={selectedPermissionIds}
      onSelectedPermissionsChange={set => {
        setSelectedPermissionIds(new Set(set));
      }}
    />
  );
}

export const Default: Story = {
  name: 'Default',
  render: Template,
  args: {},
};
