import { useState, type ReactElement, type ReactNode } from 'react';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { Heading } from '@/components/ui/heading';
import { FragmentType, graphql, useFragment } from '@/gql';
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

/** A role and the resources it applies to, for a member or a group mapping. */
export function RoleMappingPickerSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** The button that opens the sheet, when one sits beside it. */
  trigger?: ReactElement;
  organization: FragmentType<typeof RoleMappingPickerSheet_OrganizationFragment>;
  defaultRoleId: string | null;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  onSelectionChange: (selection: ResourceSelection) => void;
  onSelectedRoleIdChange: (roleId: string) => void;
  selectedRoleId: string | null;
  resourceAssignment: ResourceSelection;
}) {
  const organization = useFragment(RoleMappingPickerSheet_OrganizationFragment, props.organization);
  /* eslint-disable-next-line react/hook-use-state */
  const [initialSelectedRoleId] = useState(props.selectedRoleId);

  const selectedRole =
    organization.memberRoles?.edges?.find(edge => edge.node.id === props.selectedRoleId)?.node ??
    null;

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      onOpenChangeComplete={props.onOpenChangeComplete}
      trigger={props.trigger}
      width="lg"
      title={props.title}
      description={props.description}
      footer={props.actions}
    >
      <div className="pt-2">
        <Heading size="lg" className="mb-1 text-sm">
          Assigned Member Role
        </Heading>
        <MemberRoleSelector
          onSurface="raised"
          organization={organization}
          currentRoleId={initialSelectedRoleId}
          selectedRoleId={props.selectedRoleId}
          onSelectRoleId={props.onSelectedRoleIdChange}
        />
        <p className="text-fg-secondary mt-2 text-sm">
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
        <p className="text-fg-secondary mt-2 text-sm">
          Specify the resources on which the permissions will be granted.
        </p>
        <ResourceSelector
          selection={props.resourceAssignment}
          onSelectionChange={props.onSelectionChange}
          organization={organization}
        />
      </div>
    </Sheet>
  );
}
