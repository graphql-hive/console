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
      edges {
        node {
          id
          name
          description
          isLocked
        }
      }
    }
  }
`);

export function MemberRoleSelector(props: {
  organization: FragmentType<typeof MemberRoleSelector_OrganizationFragment>;
  selectedRoleId: string | null;
  onSelectRoleId: (roleId: string) => void;
  currentRoleId: string | null;
}) {
  const organization = useFragment(MemberRoleSelector_OrganizationFragment, props.organization);
  const canAssignRole = organization.viewerCanAssignUserRoles;
  const roles = organization.memberRoles?.edges.map(edge => edge.node) ?? [];

  const memberRole = roles.find(role => role.id === props.selectedRoleId);

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
        const isCurrentRole = role.id === props.currentRoleId;
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
