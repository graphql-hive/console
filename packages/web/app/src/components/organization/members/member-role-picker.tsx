import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { RoleMappingPickerSheet } from '../settings/shared/role-mapping-picker-sheet';
import {
  createResourceSelectionFromResourceAssignment,
  ResourceSelection,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
} from './resource-selector';

const MemberRolePicker_OrganizationFragment = graphql(`
  fragment MemberRolePicker_OrganizationFragment on Organization {
    id
    slug
    ...RoleMappingPickerSheet_OrganizationFragment
  }
`);

const MemberRolePicker_MemberFragment = graphql(`
  fragment MemberRolePicker_MemberFragment on Member {
    id
    user {
      id
      displayName
      email
    }
    role {
      id
    }
    resourceAssignment {
      ...createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment
    }
  }
`);

const MemberRolePicker_AssignRoleMutation = graphql(`
  mutation OrganizationMemberRoleSwitcher_AssignRoleMutation($input: AssignMemberRoleInput!) {
    assignMemberRole(input: $input) {
      ok {
        updatedMember {
          id
          role {
            id
            name
          }
          user {
            id
            displayName
          }
          ...OrganizationMemberRow_MemberFragment
        }
        previousMemberRole {
          id
          # Updates the members count of the role
          membersCount
        }
      }
      error {
        message
      }
    }
  }
`);

export function MemberRolePicker(props: {
  organization: FragmentType<typeof MemberRolePicker_OrganizationFragment>;
  member: FragmentType<typeof MemberRolePicker_MemberFragment>;
  close: VoidFunction;
}) {
  const organization = useFragment(MemberRolePicker_OrganizationFragment, props.organization);
  const member = useFragment(MemberRolePicker_MemberFragment, props.member);
  const [selectedRoleId, setSelectedRoleId] = useState(member.role.id);
  const [selection, setSelection] = useState<ResourceSelection>(() =>
    createResourceSelectionFromResourceAssignment(member.resourceAssignment),
  );

  const [assignRoleState, assignRole] = useMutation(MemberRolePicker_AssignRoleMutation);
  const { toast } = useToast();

  return (
    <RoleMappingPickerSheet
      close={props.close}
      organization={organization}
      defaultRoleId={member.role.id}
      resourceAssignment={selection}
      onSelectedRoleIdChange={setSelectedRoleId}
      onSelectionChange={setSelection}
      selectedRoleId={selectedRoleId}
      title={
        <>
          Assign Member Role for {member.user.displayName} ({member.user.email})
        </>
      }
      description={
        <>
          A member can be granted permissions by attaching a member role. The access to the
          resources within the project can further be restricted.
        </>
      }
      actions={
        <>
          <Button onClick={props.close} variant="ghost">
            Abort
          </Button>
          <Button
            disabled={assignRoleState.fetching}
            onClick={async () => {
              try {
                const result = await assignRole({
                  input: {
                    organization: {
                      bySelector: {
                        organizationSlug: organization.slug,
                      },
                    },
                    memberRole: {
                      byId: selectedRoleId,
                    },
                    member: {
                      byId: member.user.id,
                    },
                    resources: resourceSlectionToGraphQLSchemaResourceAssignmentInput(selection),
                  },
                });
                if (result.error) {
                  toast({
                    variant: 'destructive',
                    title: `Failed to assign role to ${member.user.displayName}`,
                    description: result.error.message,
                  });
                } else if (result.data?.assignMemberRole.error) {
                  toast({
                    variant: 'destructive',
                    title: `Failed to assign role to ${member.user.displayName}`,
                    description: result.data.assignMemberRole.error.message,
                  });
                } else if (result.data?.assignMemberRole.ok) {
                  toast({
                    title: `Assigned ${result.data?.assignMemberRole.ok.updatedMember.role.name} to ${result.data.assignMemberRole.ok.updatedMember.user.displayName}`,
                  });
                  props.close();
                }
              } catch (error: any) {
                console.error(error);
                toast({
                  variant: 'destructive',
                  title: `Failed to assign role to ${member.user.displayName}`,
                  description: 'message' in error ? error.message : String(error),
                });
              }
            }}
          >
            {assignRoleState.fetching ? 'Loading...' : 'Assign Role to user'}
          </Button>
        </>
      }
    />
  );
}
