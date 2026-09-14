import { Badge } from '@/components/base/badge/badge';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import * as Accordion from '@/components/ui/accordion';
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
    <Accordion.Accordion
      type="single"
      defaultValue={totalAllowedCount > 0 ? group.title : undefined}
      collapsible
    >
      <Accordion.AccordionItem value={group.title}>
        <Accordion.AccordionTrigger className="w-full">
          {group.title}
          <span className="ml-auto mr-2">{totalAllowedCount} allowed</span>
        </Accordion.AccordionTrigger>
        <Accordion.AccordionContent className="flex max-w-[800px] flex-wrap items-start overflow-x-scroll pl-2">
          {group.resolvedPermissionGroups.map(group => (
            <div className="w-[50%] min-w-[400px] pb-4 pr-12" key={group.title}>
              <table key={group.title} className="w-full">
                <tr>
                  <th className="pb-2 text-left">{group.title}</th>
                </tr>
                {group.permissions.map(permission => (
                  <tr key={permission.permission.id}>
                    <td className="pl-2">{permission.permission.title}</td>
                    <td className="ml-2 pb-1 text-right">
                      {permission.isGranted ? (
                        permission.permission.warning ? (
                          <Tooltip
                            trigger={
                              <span className="inline-flex w-[69px] justify-center">
                                <Badge content="Allowed" variants={{ variant: 'warning' }} />
                              </span>
                            }
                            content={permission.permission.warning}
                          />
                        ) : (
                          <span className="inline-flex w-[69px] justify-center">
                            <Badge content="Allowed" variants={{ variant: 'success' }} />
                          </span>
                        )
                      ) : (
                        <span className="inline-flex w-[69px] justify-center">
                          <Badge content="Denied" variants={{ variant: 'critical' }} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </table>
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
        </Accordion.AccordionContent>
      </Accordion.AccordionItem>
    </Accordion.Accordion>
  );
}
