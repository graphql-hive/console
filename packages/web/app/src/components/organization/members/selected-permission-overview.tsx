import { useMemo } from 'react';
import { Accordion } from '@/components/base/accordion/accordion';
import { PermissionTable } from '@/components/organization/permission-table';
import { FragmentType, graphql, useFragment } from '@/gql';
import { PermissionLevelType } from '@/gql/graphql';
import { ResultOf } from '@graphql-typed-document-node/core';

export const SelectedPermissionOverview_PermissionGroupFragment = graphql(`
  fragment SelectedPermissionOverview_PermissionGroupFragment on PermissionGroup {
    id
    title
    permissions {
      id
      dependsOnId
      description
      level
      title
      isReadOnly
      warning
    }
  }
`);

export type SelectedPermissionOverviewProps = {
  permissionsGroups: Array<FragmentType<typeof SelectedPermissionOverview_PermissionGroupFragment>>;
  activePermissionIds: Array<string>;
  showOnlyAllowedPermissions: boolean;
  /** default: true */
  isExpanded?: boolean;
  /** option for injecting additional content within a permission group. */
  additionalGroupContent?: (group: { level: PermissionLevelType }) => React.ReactNode;
  /** Exclude organization for project settings. */
  excludeOrganization?: boolean;
};

export function SelectedPermissionOverview(props: SelectedPermissionOverviewProps) {
  const permissionGroups = useFragment(
    SelectedPermissionOverview_PermissionGroupFragment,
    props.permissionsGroups,
  );
  const activePermissionIds = useMemo<ReadonlySet<string>>(
    () => new Set(props.activePermissionIds),
    [props.activePermissionIds],
  );

  const items = [
    {
      level: PermissionLevelType.Project,
      title: 'Project',
    },
    {
      level: PermissionLevelType.Target,
      title: 'Target',
    },
    {
      level: PermissionLevelType.Service,
      title: 'Service',
    },
    {
      level: PermissionLevelType.AppDeployment,
      title: 'App Deployment',
    },
  ];

  if (!props.excludeOrganization) {
    items.unshift({
      level: PermissionLevelType.Organization,
      title: 'Organization',
    });
  }

  return items.map(group => (
    <PermissionLevelGroup
      key={group.level}
      permissionLevel={group.level}
      title={group.title}
      activePermissionIds={activePermissionIds}
      memberPermissionGroups={permissionGroups}
      showOnlyAllowedPermissions={props.showOnlyAllowedPermissions}
      isExpanded={props.isExpanded ?? true}
      additionalContent={props.additionalGroupContent?.(group) ?? null}
    />
  ));
}

type AvailableMembershipPermissions = Array<
  ResultOf<typeof SelectedPermissionOverview_PermissionGroupFragment>
>;

type MembershipPermissionGroup = AvailableMembershipPermissions[number];

function PermissionLevelGroup(props: {
  title: string;
  permissionLevel: PermissionLevelType;
  memberPermissionGroups: AvailableMembershipPermissions;
  activePermissionIds: ReadonlySet<string>;
  /** whether only allowed permissions should be shown */
  showOnlyAllowedPermissions: boolean;
  isExpanded: boolean;
  additionalContent: React.ReactNode | null;
}) {
  const [filteredGroups, totalAllowedCount] = useMemo(() => {
    let totalAllowedCount = 0;

    const filteredGroups: Array<
      MembershipPermissionGroup & {
        totalAllowedCount: number;
      }
    > = [];
    for (const group of props.memberPermissionGroups) {
      let groupTotalAllowedCount = 0;

      const filteredPermissions = group.permissions.filter(permission => {
        if (permission.level !== props.permissionLevel) {
          return false;
        }

        if (props.activePermissionIds.has(permission.id) || permission.isReadOnly) {
          totalAllowedCount++;
          groupTotalAllowedCount++;
        }

        return true;
      });

      if (filteredPermissions.length === 0) {
        continue;
      }

      filteredGroups.push({
        ...group,
        permissions: filteredPermissions,
        totalAllowedCount: groupTotalAllowedCount,
      });
    }

    return [filteredGroups, totalAllowedCount];
  }, [props.permissionLevel, props.activePermissionIds, props.memberPermissionGroups]);

  if (totalAllowedCount === 0 && props.showOnlyAllowedPermissions) {
    // hide group fully if no permissions are selected
    return null;
  }

  return (
    <Accordion
      defaultValue={totalAllowedCount > 0 && props.isExpanded ? [props.title] : undefined}
      items={[
        {
          value: props.title,
          label: props.title,
          trailing: <span>{totalAllowedCount} allowed</span>,
          content: (
            <div className="ml-1 flex max-w-[800px] flex-wrap items-start overflow-x-auto">
              {filteredGroups.map(group =>
                props.showOnlyAllowedPermissions && group.totalAllowedCount === 0 ? null : (
                  <div className="w-[50%] min-w-[400px] pb-4 pr-12" key={group.id}>
                    <PermissionTable
                      title={group.title}
                      permissions={group.permissions.flatMap(permission => {
                        const granted =
                          props.activePermissionIds.has(permission.id) || permission.isReadOnly;
                        if (props.showOnlyAllowedPermissions && !granted) {
                          return [];
                        }
                        return [
                          {
                            id: permission.id,
                            title: permission.title,
                            granted,
                            warning: permission.warning,
                          },
                        ];
                      })}
                    />
                  </div>
                ),
              )}
              {props.additionalContent}
            </div>
          ),
        },
      ]}
    />
  );
}
