import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FragmentType, graphql, useFragment } from '@/gql';
import { MemberRoleSelector } from './member-role-selector';
import { ResourceSelector, type ResourceSelection } from './resource-selector';

const MemberRolePicker_OrganizationFragment = graphql(`
  fragment MemberRolePicker_OrganizationFragment on Organization {
    id
    slug
    ...ResourceSelector_OrganizationFragment
    ...MemberRoleSelector_OrganizationFragment
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
      allProjects
      projects {
        project {
          id
          slug
        }
        targets {
          allTargets
          targets {
            target {
              id
              slug
            }
            services {
              allServices
              services
            }
            appDeployments {
              allAppDeployments
              appDeployments
            }
          }
        }
      }
    }
    ...MemberRoleSelector_MemberFragment
  }
`);

const MemberRolePicker_AssignRoleMutation = graphql(`
  mutation OrganizationMemberRoleSwitcher_AssignRoleMutation($input: AssignMemberRoleInput!) {
    assignMemberRole(input: $input) {
      ok {
        updatedMember {
          id
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
}) {
  const organization = useFragment(MemberRolePicker_OrganizationFragment, props.organization);
  const member = useFragment(MemberRolePicker_MemberFragment, props.member);
  const [selectedRoleId, setSelectedRoleId] = useState(member.role.id);
  const [selection, setSelection] = useState<ResourceSelection>(() => ({
    projects:
      member.resourceAssignment.allProjects === true
        ? '*'
        : (member.resourceAssignment.projects ?? []).map(record => ({
            id: record.project.id,
            slug: record.project.slug,
            targets:
              record.targets.allTargets === true
                ? '*'
                : (record.targets.targets ?? []).map(record => ({
                    id: record.target.id,
                    slug: record.target.slug,
                    appDeployments:
                      record.appDeployments.allAppDeployments === true
                        ? '*'
                        : (record.appDeployments.appDeployments ?? []),
                    services:
                      record.services.allServices === true ? '*' : (record.services.services ?? []),
                  })),
          })),
  }));

  const [assignRoleState, assignRole] = useMutation(MemberRolePicker_AssignRoleMutation);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Assign Member Role for {member.user.displayName} ({member.user.email})
        </DialogTitle>
        <DialogDescription>
          A member can be granted permissions by attaching a member role. The access to the
          resources within the project can further be restricted.
        </DialogDescription>
      </DialogHeader>
      <div>
        <div className="mb-1 text-sm font-bold">Member Role</div>
        <MemberRoleSelector
          organization={organization}
          member={member}
          selectedRoleId={selectedRoleId}
          onSelectRoleId={roleId => setSelectedRoleId(roleId)}
        />
      </div>
      <div>
        <div className="mb-1 text-sm font-bold">Resources</div>
        <ResourceSelector
          selection={selection}
          onSelectionChange={setSelection}
          organization={organization}
        />
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            assignRole({
              input: {
                organizationSlug: organization.slug,
                roleId: selectedRoleId,
                userId: member.user.id,
                resources: selection,
              },
            });
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}

// const { toast } = useToast();

// if (result.error) {
//             toast({
//               variant: 'destructive',
//               title: `Failed to assign role to ${props.memberName}`,
//               description: result.error.message,
//             });
//           } else if (result.data?.assignMemberRole.error) {
//             toast({
//               variant: 'destructive',
//               title: `Failed to assign role to ${props.memberName}`,
//               description: result.data.assignMemberRole.error.message,
//             });
//           } else if (result.data?.assignMemberRole.ok) {
//             toast({
//               title: `Assigned ${role.name} to ${result.data.assignMemberRole.ok.updatedMember.user.displayName}`,
//             });
//           }
//         } catch (error: any) {
//           console.error(error);
//           toast({
//             variant: 'destructive',
//             title: `Failed to assign role to ${props.memberName}`,
//             description: 'message' in error ? error.message : String(error),
//           });
//         }
