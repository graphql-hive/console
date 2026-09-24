import { Accordion } from '@/components/base/accordion/accordion';
import { Badge } from '@/components/base/badge/badge';
import { PermissionTable } from '@/components/organization/permission-table';
import { FragmentType, graphql, useFragment } from '@/gql';
import { permissionLevelToResourceName } from './shared-helpers';

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
            <div className="flex max-w-[800px] flex-wrap items-start overflow-x-auto pl-2">
              {group.resolvedPermissionGroups.map(group => (
                <div className="w-[50%] min-w-[400px] pb-4 pr-12" key={group.title}>
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
              <div className="w-full space-y-1">
                {group.resolvedResourceIds == null ? (
                  <p className="text-red-500">
                    Not granted on any {permissionLevelToResourceName(group.level).slice(0, -1)}.
                  </p>
                ) : (
                  <>
                    <p className="text-neutral-10">
                      Granted on {permissionLevelToResourceName(group.level)}:
                    </p>
                    <ul className="flex list-none flex-wrap gap-1">
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
