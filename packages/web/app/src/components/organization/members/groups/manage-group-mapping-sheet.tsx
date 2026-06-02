import { ReactNode, useState } from 'react';
import { useMutation } from 'urql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Sheet from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { RoleMappingPickerSheet } from '../../settings/shared/role-mapping-picker-sheet';
import {
  createResourceSelectionFromResourceAssignment,
  ResourceSelection,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
} from '../resource-selector';

const ManageGroupMapping_AddGroupMappingToGroupMutation = graphql(`
  mutation ManageGroupMapping_CreateGroupRoleMappingMutation($input: AddGroupMappingToGroupInput!) {
    addGroupMappingToGroup(input: $input) {
      ok {
        group {
          id
          ...GroupRow_GroupFragment
          roleMappings {
            ...ManageGroupMappingSheet_ExistingGroupRoleMappingFragment
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const ManageGroupMapping_CreateGroupMappingToGroupMutation = graphql(`
  mutation ManageGroupMapping_UpdateGroupMapping($input: UpdateGroupMappingInput!) {
    updateGroupMapping(input: $input) {
      ok {
        group {
          id
          ...GroupRow_GroupFragment
          roleMappings {
            ...ManageGroupMappingSheet_ExistingGroupRoleMappingFragment
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const ManageGroupMapping_GroupFragment = graphql(`
  fragment ManageGroupMapping_GroupFragment on Group {
    id
    name
  }
`);

const ManageGroupMapping_OrganizationFragment = graphql(`
  fragment ManageGroupMapping_OrganizationFragment on Organization {
    id
    ...RoleMappingPickerSheet_OrganizationFragment
  }
`);

const ManageGroupMappingSheet_ExistingGroupRoleMappingFragment = graphql(`
  fragment ManageGroupMappingSheet_ExistingGroupRoleMappingFragment on GroupRoleMapping {
    id
    role {
      id
    }
    resourceAssignment {
      ...createResourceSelectionFromResourceAssignment_ResourceAssignmentFragment
    }
  }
`);

type ManageGroupMappingSheetProps = {
  group: FragmentType<typeof ManageGroupMapping_GroupFragment>;
  organization: FragmentType<typeof ManageGroupMapping_OrganizationFragment>;
  existingGroupRoleMapping: null | FragmentType<
    typeof ManageGroupMappingSheet_ExistingGroupRoleMappingFragment
  >;
  close: () => void;
};

export function ManageGroupMappingSheet(props: ManageGroupMappingSheetProps): ReactNode {
  const group = useFragment(ManageGroupMapping_GroupFragment, props.group);
  const organization = useFragment(ManageGroupMapping_OrganizationFragment, props.organization);
  const existingGroupMapping = useFragment(
    ManageGroupMappingSheet_ExistingGroupRoleMappingFragment,
    props.existingGroupRoleMapping,
  );

  const { toast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState(existingGroupMapping?.role.id ?? null);
  const [selection, setSelection] = useState<ResourceSelection>(() =>
    existingGroupMapping?.resourceAssignment
      ? createResourceSelectionFromResourceAssignment(existingGroupMapping.resourceAssignment)
      : ({
          mode: GraphQLSchema.ResourceAssignmentModeType.All,
          projects: [],
        } satisfies ResourceSelection),
  );
  const [addGroupMappingToGroupState, addGroupMappingToGroup] = useMutation(
    ManageGroupMapping_AddGroupMappingToGroupMutation,
  );
  const [updateGroupMappingState, updateGroupMapping] = useMutation(
    ManageGroupMapping_CreateGroupMappingToGroupMutation,
  );

  return (
    <Sheet.Sheet open onOpenChange={props.close}>
      <RoleMappingPickerSheet
        organization={organization}
        selectedRoleId={selectedRoleId}
        onSelectedRoleIdChange={setSelectedRoleId}
        onSelectionChange={setSelection}
        resourceAssignment={selection}
        close={props.close}
        defaultRoleId={null}
        title={
          existingGroupMapping ? (
            <>Adjust Group Role Mapping</>
          ) : (
            <>
              Add new group role mapping to <Badge>{group.name}</Badge>
            </>
          )
        }
        description={<>Assign a role with permissions to the group role.</>}
        actions={
          existingGroupMapping ? (
            <>
              <Button onClick={props.close} variant="ghost">
                Abort
              </Button>
              <Button
                disabled={updateGroupMappingState.fetching}
                onClick={async () => {
                  if (!selectedRoleId) {
                    return;
                  }
                  try {
                    const result = await updateGroupMapping({
                      input: {
                        groupMappingId: existingGroupMapping.id,
                        roleId: selectedRoleId,
                        assignedResources:
                          resourceSlectionToGraphQLSchemaResourceAssignmentInput(selection),
                      },
                    });
                    if (result.error) {
                      toast({
                        variant: 'destructive',
                        title: `Failed to update group mapping.`,
                        description: result.error.message,
                      });
                    } else if (result.data?.updateGroupMapping.error) {
                      toast({
                        variant: 'destructive',
                        title: `Failed to update group mapping.`,
                        description: result.data?.updateGroupMapping.error.message,
                      });
                    } else if (result.data?.updateGroupMapping.ok) {
                      toast({
                        title: `Updated group mapping.`,
                      });
                      props.close();
                    }
                  } catch (error: any) {
                    console.error(error);
                    toast({
                      variant: 'destructive',
                      title: `Failed to update group mapping.`,
                      description: 'message' in error ? error.message : String(error),
                    });
                  }
                }}
              >
                {updateGroupMappingState.fetching ? 'Loading...' : 'Update Group Mapping'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={props.close} variant="ghost">
                Abort
              </Button>
              <Button
                disabled={addGroupMappingToGroupState.fetching}
                onClick={async () => {
                  if (!selectedRoleId) {
                    return;
                  }
                  try {
                    const result = await addGroupMappingToGroup({
                      input: {
                        groupId: group.id,
                        roleId: selectedRoleId,
                        assignedResources:
                          resourceSlectionToGraphQLSchemaResourceAssignmentInput(selection),
                      },
                    });
                    if (result.error) {
                      toast({
                        variant: 'destructive',
                        title: `Failed to create mapping.`,
                        description: result.error.message,
                      });
                    } else if (result.data?.addGroupMappingToGroup.error) {
                      toast({
                        variant: 'destructive',
                        title: `Failed to create mapping.`,
                        description: result.data?.addGroupMappingToGroup.error.message,
                      });
                    } else if (result.data?.addGroupMappingToGroup.ok) {
                      toast({
                        title: `Created new mapping.`,
                      });
                      props.close();
                    }
                  } catch (error: any) {
                    console.error(error);
                    toast({
                      variant: 'destructive',
                      title: `Failed to create mapping.`,
                      description: 'message' in error ? error.message : String(error),
                    });
                  }
                }}
              >
                {addGroupMappingToGroupState.fetching ? 'Loading...' : 'Create Role Assignment'}
              </Button>
            </>
          )
        }
      />
    </Sheet.Sheet>
  );
}
