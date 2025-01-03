import { makeFragmentData } from '@/gql';
import { Meta, StoryObj } from '@storybook/react';
import {
  SelectedPermissionOverview,
  SelectedPermissionOverview_MemberPermissionGroupsFragment,
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
  organization: makeFragmentData(
    {
      __typename: 'Organization',
      availableMemberPermissionGroups: availableMemberPermissionGroups as any,
    },
    SelectedPermissionOverview_MemberPermissionGroupsFragment,
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
    ],
    showOnlyAllowedPermissions: true,
  },
};
