import { useState } from 'react';
import { Heading } from '@/components/ui/heading';
import * as Sheet from '@/components/ui/sheet';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ReactNode } from '@tanstack/react-router';
import { MemberRoleSelector } from '../../members/member-role-selector';
import { ResourceSelection, ResourceSelector } from '../../members/resource-selector';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';

const RoleMappingPickerSheet_OrganizationFragment = graphql(`
  fragment RoleMappingPickerSheet_OrganizationFragment on Organization {
    id
    slug
    memberRoles {
      edges {
        node {
          id
          permissions
        }
      }
    }
    ...ResourceSelector_OrganizationFragment
    ...MemberRoleSelector_OrganizationFragment
    availableMemberPermissionGroups {
      ...SelectedPermissionOverview_PermissionGroupFragment
    }
  }
`);

export function RoleMappingPickerSheet(props: {
  organization: FragmentType<typeof RoleMappingPickerSheet_OrganizationFragment>;
  defaultRoleId: string | null;
  close: VoidFunction;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  onSelectionChange: (selection: ResourceSelection) => void;
  onSelectedRoleIdChange: (roleId: string) => void;
  selectedRoleId: string | null;
  resourceAssignment: ResourceSelection;
}) {
  const organization = useFragment(RoleMappingPickerSheet_OrganizationFragment, props.organization);
  const [initialSelectedRoleId] = useState(props.selectedRoleId);

  const selectedRole =
    organization.memberRoles?.edges?.find(edge => edge.node.id === props.selectedRoleId)?.node ??
    null;

  return (
    <Sheet.SheetContent className="flex max-h-screen min-w-[800px] flex-col overflow-y-scroll">
      <Sheet.SheetHeader>
        <Sheet.SheetTitle>{props.title}</Sheet.SheetTitle>
        <Sheet.SheetDescription>{props.description}</Sheet.SheetDescription>
      </Sheet.SheetHeader>
      <div className="pt-2">
        <Heading size="lg" className="mb-1 text-sm">
          Assigned Member Role
        </Heading>
        <MemberRoleSelector
          organization={organization}
          currentRoleId={initialSelectedRoleId}
          selectedRoleId={props.selectedRoleId}
          onSelectRoleId={props.onSelectedRoleIdChange}
        />
        <p className="text-neutral-10 mt-2 text-sm">
          The role assigned to the user that will grant permissions.
        </p>
        {selectedRole && (
          <SelectedPermissionOverview
            showOnlyAllowedPermissions
            permissionsGroups={organization.availableMemberPermissionGroups}
            activePermissionIds={selectedRole.permissions}
            isExpanded={false}
          />
        )}
      </div>
      <div className="pt-10">
        <Heading size="lg" className="mb-1 text-sm">
          Assigned Resources
        </Heading>
        <p className="text-neutral-10 mt-2 text-sm">
          Specify the resources on which the permissions will be granted.
        </p>
        <ResourceSelector
          selection={props.resourceAssignment}
          onSelectionChange={props.onSelectionChange}
          organization={organization}
        />
      </div>
      <Sheet.SheetFooter className="mb-0 mt-auto">{props.actions}</Sheet.SheetFooter>
    </Sheet.SheetContent>
  );
}
