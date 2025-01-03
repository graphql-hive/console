import { useMemo, useRef, useState } from 'react';
import { InfoIcon } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { ResultOf } from '@graphql-typed-document-node/core';

export const PermissionSelector_OrganizationFragment = graphql(`
  fragment PermissionSelector_OrganizationFragment on Organization {
    id
    availableMemberPermissionGroups {
      id
      title
      permissions {
        id
        dependsOnId
        description
        level
        title
        isReadOnly
      }
    }
  }
`);

type AvailableMembershipPermissions = ResultOf<
  typeof PermissionSelector_OrganizationFragment
>['availableMemberPermissionGroups'];

type MembershipPermissionGroup = AvailableMembershipPermissions[number];

export type PermissionSelectorProps = {
  organization: FragmentType<typeof PermissionSelector_OrganizationFragment>;
  selectedPermissionIds: ReadonlySet<string>;
  onSelectedPermissionsChange: (selectedPermissionIds: ReadonlySet<string>) => void;
};

export function PermissionSelector(props: PermissionSelectorProps) {
  const organization = useFragment(PermissionSelector_OrganizationFragment, props.organization);
  const [groups, permissionToGroupTitleMapping, dependencyGraph] = useMemo(() => {
    const filteredGroups: Array<
      MembershipPermissionGroup & {
        selectedPermissionCount: number;
      }
    > = [];
    const permissionToGroupTitleMapping = new Map<string, string>();
    const dependencyGraph = new Map<string, Array<string>>();

    for (const group of organization.availableMemberPermissionGroups) {
      let selectedPermissionCount = 0;

      for (const permission of group.permissions) {
        if (props.selectedPermissionIds.has(permission.id)) {
          selectedPermissionCount++;
        }

        if (permission.dependsOnId) {
          let arr = dependencyGraph.get(permission.dependsOnId);
          if (!arr) {
            arr = [];
            dependencyGraph.set(permission.dependsOnId, arr);
          }
          arr.push(permission.id);
        }
        permissionToGroupTitleMapping.set(permission.id, group.title);
      }

      filteredGroups.push({
        ...group,
        selectedPermissionCount,
      });
    }

    return [filteredGroups, permissionToGroupTitleMapping, dependencyGraph] as const;
  }, [organization.availableMemberPermissionGroups]);

  const permissionRefs = useRef(new Map<string, HTMLElement>());
  const [focusedPermission, setFocusedPermission] = useState(null as string | null);
  const [openAccordions, setOpenAccordions] = useState([] as Array<string>);

  return (
    <Accordion
      type="multiple"
      className="w-full"
      value={openAccordions}
      onValueChange={values => setOpenAccordions(values)}
    >
      {groups.map(group => {
        return (
          <AccordionItem value={group.title} key={group.title}>
            <AccordionTrigger className="w-full" key={group.title}>
              {group.title}{' '}
              <span className="ml-auto mr-0">
                {group.selectedPermissionCount > 0 && (
                  <span className="mr-1 inline-block text-sm">
                    {group.selectedPermissionCount} selected
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pl-2 pt-1" forceMount>
              {group.permissions.map(permission => {
                const needsDependency =
                  !!permission.dependsOnId &&
                  !props.selectedPermissionIds.has(permission.dependsOnId);

                return (
                  <div
                    className={cn(
                      'flex flex-row items-center justify-between space-x-4 border-orange-500 pb-2 text-sm',
                      focusedPermission === permission.id && '-m-[1px] border',
                    )}
                    key={permission.id}
                    data-permission-id={permission.id}
                    ref={ref => {
                      if (ref) {
                        permissionRefs.current.set(permission.id, ref);
                      }
                    }}
                  >
                    <div className={cn(needsDependency && 'opacity-30')}>
                      <div className="font-semibold text-white">{permission.title}</div>
                      <div className="text-xs text-gray-400">{permission.description}</div>
                    </div>
                    {!!permission.dependsOnId &&
                      permissionToGroupTitleMapping.has(permission.dependsOnId) && (
                        <div className="flex grow justify-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  This permission depends on another permission.{' '}
                                  <Button
                                    variant="orangeLink"
                                    onClick={() => {
                                      const dependencyPermission = permission.dependsOnId;
                                      if (!dependencyPermission) {
                                        return;
                                      }
                                      const element =
                                        permissionRefs.current.get(dependencyPermission);

                                      if (!element) {
                                        return;
                                      }
                                      setOpenAccordions(values => {
                                        const groupName =
                                          permissionToGroupTitleMapping.get(dependencyPermission);

                                        if (groupName && values.includes(groupName) === false) {
                                          return [...values, groupName];
                                        }
                                        return values;
                                      });
                                      setFocusedPermission(dependencyPermission);
                                      element.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                  >
                                    View permission.
                                  </Button>
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    <Select
                      disabled={permission.isReadOnly || needsDependency}
                      value={
                        permission.isReadOnly || props.selectedPermissionIds.has(permission.id)
                          ? 'allow'
                          : 'not-selected'
                      }
                      onValueChange={value => {
                        const dependents = dependencyGraph.get(permission.id) ?? [];
                        if (value === 'allow') {
                          props.onSelectedPermissionsChange(
                            new Set([...props.selectedPermissionIds, permission.id]),
                          );
                        } else if (value === 'not-selected') {
                          const selectedPermissionIds = new Set(props.selectedPermissionIds);
                          selectedPermissionIds.delete(permission.id);
                          for (const dependent of dependents) {
                            selectedPermissionIds.delete(dependent);
                          }
                          props.onSelectedPermissionsChange(selectedPermissionIds);
                        }
                        setFocusedPermission(null);
                      }}
                    >
                      <SelectTrigger className="w-[150px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-selected">Not Selected</SelectItem>
                        <SelectItem value="allow">Allow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
