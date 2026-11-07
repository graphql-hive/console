import { PermissionTable } from '@/components/organization/permission-table';
import { Accordion } from '@/components/ui/primitives/accordion/accordion';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as shared from '@/styles/shared.css';
import { permissionLevelToResourceName } from './shared-helpers';
import { permissionDetailViewStyles } from './permission-detail-view.css';

const PermissionDetailView_ResolvedResourcePermissionGroup = graphql(`
  fragment PermissionDetailView_ResolvedResourcePermissionGroup on ResolvedResourcePermissionGroup {
    level
    resolvedResourceIds
    title
    resolvedPermissionGroups {
      title
      permissions {
        isGranted
        permission {
          id
          title
          description
          warning
        }
      }
    }
  }
`);

export function PermissionDetailView(props: {
  resolvedResourcePermissionGroup: FragmentType<
    typeof PermissionDetailView_ResolvedResourcePermissionGroup
  >;
}) {
  const group = useFragment(
    PermissionDetailView_ResolvedResourcePermissionGroup,
    props.resolvedResourcePermissionGroup,
  );

  const totalAllowedCount = group.resolvedPermissionGroups.reduce(
    (prev, current) =>
      prev +
      current.permissions.reduce((prev, current) => (current.isGranted ? prev + 1 : prev), 0),
    0,
  );

  return (
    <Accordion
      defaultValue={totalAllowedCount > 0 ? [group.title] : undefined}
      items={[
        {
          value: group.title,
          label: group.title,
          trailing: <span>{totalAllowedCount} allowed</span>,
          content: (
            <div className={permissionDetailViewStyles.groups}>
              {group.resolvedPermissionGroups.map(group => (
                <div className={permissionDetailViewStyles.group} key={group.title}>
                  <PermissionTable
                    title={group.title}
                    permissions={group.permissions.map(permission => ({
                      id: permission.permission.id,
                      title: permission.permission.title,
                      granted: permission.isGranted,
                      warning: permission.permission.warning,
                    }))}
                  />
                </div>
              ))}
              <div className={permissionDetailViewStyles.resources}>
                {group.resolvedResourceIds == null ? (
                  <p className={shared.fg.critical}>
                    Not granted on any {permissionLevelToResourceName(group.level).slice(0, -1)}.
                  </p>
                ) : (
                  <>
                    <p className={shared.fg.secondary}>
                      Granted on {permissionLevelToResourceName(group.level)}:
                    </p>
                    <ul className={permissionDetailViewStyles.resourceList}>
                      {group.resolvedResourceIds.map(id => (
                        <li key={id}>
                          <Badge content={id} variants={{ variant: 'outline', mono: true }} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
