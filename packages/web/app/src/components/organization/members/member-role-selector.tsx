import { FragmentType, graphql, useFragment } from '@/gql';
import { RoleSelector } from './common';

const MemberRoleSelector_OrganizationFragment = graphql(`
  fragment MemberRoleSelector_OrganizationFragment on Organization {
    id
    slug
    viewerCanAssignUserRoles
    owner {
      id
    }
    memberRoles {
      id
      name
      description
      locked
    }
  }
`);

const MemberRoleSelector_MemberFragment = graphql(`
  fragment MemberRoleSelector_MemberFragment on Member {
    id
    role {
      id
    }
    user {
      id
    }
  }
`);

export function MemberRoleSelector(props: {
  organization: FragmentType<typeof MemberRoleSelector_OrganizationFragment>;
  member: FragmentType<typeof MemberRoleSelector_MemberFragment>;
  selectedRoleId: string;
  onSelectRoleId: (roleId: string) => void;
}) {
  const organization = useFragment(MemberRoleSelector_OrganizationFragment, props.organization);
  const member = useFragment(MemberRoleSelector_MemberFragment, props.member);
  const canAssignRole = organization.viewerCanAssignUserRoles;
  const roles = organization.memberRoles ?? [];

  const memberRole = roles.find(role => role.id === props.selectedRoleId);

  if (!memberRole || !member) {
    console.error('No role or member provided to MemberRoleSelector');
    return null;
  }

  return (
    <RoleSelector
      searchPlaceholder="Select new role..."
      roles={roles}
      onSelect={role => {
        props.onSelectRoleId(role.id);
      }}
      defaultRole={memberRole}
      disabled={!canAssignRole}
      isRoleActive={role => {
        const isCurrentRole = role.id === member.id;
        if (isCurrentRole) {
          return {
            active: false,
            reason: 'This is the current role',
          };
        }

        return {
          active: true,
        };
      }}
    />
  );
}
