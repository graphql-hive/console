import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckIcon, XIcon } from '@/components/ui/icon';
import { FragmentType, graphql, useFragment } from '@/gql';
import { PermissionLevel } from '@/gql/graphql';
import { ResultOf } from '@graphql-typed-document-node/core';

export const SelectedPermissionOverview_MemberPermissionGroupsFragment = graphql(`
  fragment SelectedPermissionOverview_MemberPermissionGroupsFragment on Organization {
    availableMemberPermissionGroups {
      id
      title
      permissions {
        id
        dependsOnId
        description
        level
        title
      }
    }
  }
`);

export type SelectedPermissionOverviewProps = {
  organization: FragmentType<typeof SelectedPermissionOverview_MemberPermissionGroupsFragment>;
  activePermissionIds: Array<string>;
  showOnlyAllowedPermissions: boolean;
};

export function SelectedPermissionOverview(props: SelectedPermissionOverviewProps) {
  const organization = useFragment(
    SelectedPermissionOverview_MemberPermissionGroupsFragment,
    props.organization,
  );
  const activePermissionIds = useMemo<ReadonlySet<string>>(
    () => new Set(props.activePermissionIds),
    [props.activePermissionIds],
  );

  // TODO: maybe these should also be sent from the API, so it is the full source of truth
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
      memberPermissionGroups={organization.availableMemberPermissionGroups}
      showOnlyAllowedPermissions={props.showOnlyAllowedPermissions}
    />
  ));
}

type AvailableMembershipPermissions = ResultOf<
  typeof SelectedPermissionOverview_MemberPermissionGroupsFragment
>['availableMemberPermissionGroups'];

type MembershipPermissionGroup = AvailableMembershipPermissions[number];

function PermissionLevelGroup(props: {
  title: string;
  permissionLevel: PermissionLevel;
  memberPermissionGroups: AvailableMembershipPermissions;
  activePermissionIds: ReadonlySet<string>;
  /** whether only allowed permissions should be shown */
  showOnlyAllowedPermissions: boolean;
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

        if (props.activePermissionIds.has(permission.id)) {
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
      defaultValue={totalAllowedCount > 0 ? props.title : undefined}
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
                    props.activePermissionIds.has(permission.id) === false ? null : (
                      <tr key={permission.id}>
                        <td>{permission.title}</td>
                        <td className="ml-2 text-right">
                          {props.activePermissionIds.has(permission.id) ? (
                            <span className="text-green-500">
                              <CheckIcon className="inline size-4" /> Allowed
                            </span>
                          ) : (
                            <span>
                              <XIcon className="inline size-4" /> Deny
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </table>
              </div>
            ),
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
