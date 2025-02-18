import { useState } from 'react';
import { makeFragmentData } from '@/gql';
import { Meta, StoryObj } from '@storybook/react';
import {
  PermissionSelector,
  PermissionSelector_OrganizationFragment,
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
  organization: makeFragmentData(
    {
      __typename: 'Organization',
      id: 'foo',
      availableMemberPermissionGroups: availableMemberPermissionGroups as any,
    },
    PermissionSelector_OrganizationFragment,
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
