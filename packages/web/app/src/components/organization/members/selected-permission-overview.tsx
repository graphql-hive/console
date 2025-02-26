import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { PermissionLevel } from '@/gql/graphql';
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
  additionalGroupContent?: (group: { level: PermissionLevel }) => React.ReactNode;
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

  return [
    {
      level: PermissionLevel.Organization,
      title: 'Organization',
    },
    {
      level: PermissionLevel.Project,
      title: 'Project',
    },
    {
      level: PermissionLevel.Target,
      title: 'Target',
    },
    {
      level: PermissionLevel.Service,
      title: 'Service',
    },
    {
      level: PermissionLevel.AppDeployment,
      title: 'App Deployment',
    },
  ].map(group => (
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
  permissionLevel: PermissionLevel;
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
      type="single"
      defaultValue={totalAllowedCount > 0 && props.isExpanded ? props.title : undefined}
      collapsible
    >
      <AccordionItem value={props.title}>
        <AccordionTrigger className="w-full">
          {props.title}
          <span className="ml-auto mr-2">{totalAllowedCount} allowed</span>
        </AccordionTrigger>
        <AccordionContent className="ml-1 flex max-w-[800px] flex-wrap items-start overflow-x-scroll">
          {filteredGroups.map(group =>
            props.showOnlyAllowedPermissions && group.totalAllowedCount === 0 ? null : (
              <div className="w-[50%] min-w-[400px] pb-4 pr-12" key={group.id}>
                <table key={group.title} className="w-full">
                  <tr>
                    <th className="pb-2 text-left">{group.title}</th>
                  </tr>
                  {group.permissions.map(permission =>
                    props.showOnlyAllowedPermissions &&
                    props.activePermissionIds.has(permission.id) === false &&
                    !permission.isReadOnly ? null : (
                      <tr key={permission.id}>
                        <td>{permission.title}</td>
                        <td className="ml-2 text-right">
                          {props.activePermissionIds.has(permission.id) || permission.isReadOnly ? (
                            permission.warning ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="warning">Allowed</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>{permission.warning}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Badge variant="success">Allowed</Badge>
                            )
                          ) : (
                            <Badge variant="failure">Denied</Badge>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </table>
              </div>
            ),
          )}
          {props.additionalContent}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
