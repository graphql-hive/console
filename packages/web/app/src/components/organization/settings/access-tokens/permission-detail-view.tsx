import * as Accordion from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import * as Tooltip from '@/components/ui/tooltip';
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
        <Accordion.AccordionContent className="ml-1 flex max-w-[800px] flex-wrap items-start overflow-x-scroll">
          {group.resolvedPermissionGroups.map(group => (
            <div className="w-[50%] min-w-[400px] pb-4 pr-12" key={group.title}>
              <table key={group.title} className="w-full">
                <tr>
                  <th className="pb-2 text-left">{group.title}</th>
                </tr>
                {group.permissions.map(permission => (
                  <tr key={permission.permission.id}>
                    <td>{permission.permission.title}</td>
                    <td className="ml-2 text-right">
                      {permission.isGranted ? (
                        permission.permission.warning ? (
                          <Tooltip.TooltipProvider>
                            <Tooltip.Tooltip>
                              <Tooltip.TooltipTrigger>
                                <Badge variant="warning">Allowed</Badge>
                              </Tooltip.TooltipTrigger>
                              <Tooltip.TooltipContent>
                                {permission.permission.warning}
                              </Tooltip.TooltipContent>
                            </Tooltip.Tooltip>
                          </Tooltip.TooltipProvider>
                        ) : (
                          <Badge variant="success">Allowed</Badge>
                        )
                      ) : (
                        <Badge variant="failure">Denied</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </table>
            </div>
          ))}
          <div className="w-full space-y-1">
            {group.resolvedResourceIds == null ? (
              <p className="text-gray-400">
                Granted on all {permissionLevelToResourceName(group.level)}
              </p>
            ) : (
              <>
                <p className="text-gray-400">
                  Granted on {permissionLevelToResourceName(group.level)}:
                </p>
                <ul className="flex list-none flex-wrap gap-1">
                  {group.resolvedResourceIds.map(id => (
                    <li key={id}>
                      <Badge
                        className="text-neutral-11 px-3 py-1 font-mono text-xs"
                        variant="outline"
                      >
                        {id}
                      </Badge>
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
