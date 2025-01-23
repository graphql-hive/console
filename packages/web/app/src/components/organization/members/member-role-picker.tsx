import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
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
  const { toast } = useToast();

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
          disabled={assignRoleState.fetching}
          onClick={async () => {
            try {
              const result = await assignRole({
                input: {
                  organizationSlug: organization.slug,
                  roleId: selectedRoleId,
                  userId: member.user.id,
                  resources:
                    transformResourceSelectionToGraphQLMemberResourceAssignmentInput(selection),
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
          {assignRoleState.fetching ? 'Loading...' : 'Confirm'}
        </Button>
      </DialogFooter>
    </>
  );
}

function transformResourceSelectionToGraphQLMemberResourceAssignmentInput(
  selection: ResourceSelection,
): GraphQLSchema.MemberResourceAssignmentInput {
  if (selection.projects === '*') {
    return {
      allProjects: true,
    };
  }

  return {
    projects: selection.projects.map(project => ({
      projectId: project.id,
      targets:
        project.targets === '*'
          ? { allTargets: true }
          : {
              targets: project.targets.map(target => ({
                targetId: target.id,
                appDeployments: { appDeployments: [] },
                services:
                  target.services === '*'
                    ? { allServices: true }
                    : { services: target.services.map(service => ({ serviceName: service })) },
              })),
            },
    })),
  };
}
