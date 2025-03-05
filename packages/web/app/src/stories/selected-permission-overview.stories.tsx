import { makeFragmentData } from '@/gql';
import { Meta, StoryObj } from '@storybook/react';
import {
  SelectedPermissionOverview,
  SelectedPermissionOverview_PermissionGroupFragment,
  SelectedPermissionOverviewProps,
} from '../components/organization/members/selected-permission-overview';
import { availableMemberPermissionGroups } from './utils';

const meta: Meta<typeof SelectedPermissionOverview> = {
  title: 'Selected Permission Overview',
  component: SelectedPermissionOverview,
};

export default meta;
type Story = StoryObj<typeof SelectedPermissionOverview>;

const defaultProps: SelectedPermissionOverviewProps = {
  permissionsGroups: availableMemberPermissionGroups.map(value =>
    makeFragmentData(value as any, SelectedPermissionOverview_PermissionGroupFragment),
  ),
  activePermissionIds: [],
  showOnlyAllowedPermissions: false,
};

function Template(args: SelectedPermissionOverviewProps) {
  return <SelectedPermissionOverview {...defaultProps} {...args} />;
}

export const Default: Story = {
  name: 'Default',
  render: Template,
  args: {
    activePermissionIds: [],
    showOnlyAllowedPermissions: false,
  },
};

export const OnlyAllowedPermissions: Story = {
  name: 'OnlyAllowedPermissions',
  render: Template,
  args: {
    activePermissionIds: [
      'organization:describe',
      'billing:describe',
      'billing:update',
      'project:describe',
      'member:describe',
      'member:modify',
    ],
    showOnlyAllowedPermissions: true,
  },
};
