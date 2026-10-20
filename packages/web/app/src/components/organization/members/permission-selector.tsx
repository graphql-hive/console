import { useMemo, useRef, useState } from 'react';
import { InfoIcon, TriangleAlert } from 'lucide-react';
import { Accordion } from '@/components/ui/primitives/accordion/accordion';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Select } from '@/components/ui/primitives/floating/select/select';
import type { OnSurface } from '@/components/ui/primitives/shared-styles';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { ResultOf } from '@graphql-typed-document-node/core';
import * as styles from './permission-selector.css';

// PermissionSelector_OrganizationFragment

export const PermissionSelector_PermissionGroupsFragment = graphql(`
  fragment PermissionSelector_PermissionGroupsFragment on PermissionGroup {
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
      isAssignableByViewer
    }
  }
`);

type AvailableMembershipPermissions = Array<
  ResultOf<typeof PermissionSelector_PermissionGroupsFragment>
>;

type MembershipPermissionGroup = AvailableMembershipPermissions[number];

export type PermissionSelectorProps = {
  isReadOnly?: boolean;
  /** `raised` inside a dialog or sheet, which is everywhere this renders today. */
  onSurface?: OnSurface;
  permissionGroups: Array<FragmentType<typeof PermissionSelector_PermissionGroupsFragment>>;
  selectedPermissionIds: ReadonlySet<string>;
  onSelectedPermissionsChange: (selectedPermissionIds: ReadonlySet<string>) => void;
};

export function PermissionSelector(props: PermissionSelectorProps) {
  const permissionGroups = useFragment(
    PermissionSelector_PermissionGroupsFragment,
    props.permissionGroups,
  );
  const [groups, permissionToGroupTitleMapping, dependencyGraph] = useMemo(() => {
    const filteredGroups: Array<
      MembershipPermissionGroup & {
        selectedPermissionCount: number;
      }
    > = [];
    const permissionToGroupTitleMapping = new Map<string, string>();
    const dependencyGraph = new Map<string, Array<string>>();

    for (const group of permissionGroups) {
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
  }, [permissionGroups, props.selectedPermissionIds]);

  const permissionRefs = useRef(new Map<string, HTMLElement>());
  const [focusedPermission, setFocusedPermission] = useState(null as string | null);
  const [openAccordions, setOpenAccordions] = useState([] as Array<string>);

  return (
    <Accordion
      multiple
      // "View permission" scrolls to a row in another group by its ref, which only exists while
      // that group's panel is mounted.
      keepMounted
      value={openAccordions}
      onValueChange={setOpenAccordions}
      items={groups.map(group => ({
        value: group.title,
        label: group.title,
        trailing:
          group.selectedPermissionCount > 0 ? (
            <span>{group.selectedPermissionCount} selected</span>
          ) : undefined,
        content: (
          <div className={styles.permissionSelectorDiv}>
            {group.permissions.map(permission => {
              const needsDependency =
                !!permission.dependsOnId &&
                !props.selectedPermissionIds.has(permission.dependsOnId);

              return (
                <div className={styles.permissionSelectorDiv2} key={permission.id}>
                  <div
                    className={cn(styles.permissionSelectorDiv3)}
                    data-permission-id={permission.id}
                    ref={ref => {
                      if (ref) {
                        permissionRefs.current.set(permission.id, ref);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        (needsDependency || !permission.isAssignableByViewer) &&
                          styles.permissionSelectorDiv4,
                      )}
                    >
                      <div className={styles.permissionSelectorDiv5}>{permission.title}</div>
                      <div className={styles.permissionSelectorDiv6}>{permission.description}</div>
                    </div>
                    {permission.isAssignableByViewer === false ? (
                      <div className={styles.permissionSelectorDiv7}>
                        <Popover
                          trigger={
                            <button type="button" aria-label="Why this cannot be assigned">
                              <InfoIcon />
                            </button>
                          }
                          openOnHover
                          content={
                            <p className={styles.permissionSelectorP}>
                              Your membership has insufficient authority for assigning this
                              permission.
                            </p>
                          }
                        />
                      </div>
                    ) : permission.warning && props.selectedPermissionIds.has(permission.id) ? (
                      <div className={styles.permissionSelectorDiv8}>
                        <Popover
                          trigger={
                            <button type="button" aria-label="Warning">
                              <TriangleAlert className={styles.permissionSelectorTriangleAlert} />
                            </button>
                          }
                          openOnHover
                          content={
                            <p className={styles.permissionSelectorP2}>{permission.warning}</p>
                          }
                        />
                      </div>
                    ) : (
                      !!permission.dependsOnId &&
                      permissionToGroupTitleMapping.has(permission.dependsOnId) && (
                        <div className={styles.permissionSelectorDiv9}>
                          <Popover
                            trigger={
                              <button type="button" aria-label="Depends on another permission">
                                <InfoIcon />
                              </button>
                            }
                            openOnHover
                            content={
                              <p className={styles.permissionSelectorP3}>
                                This permission depends on another permission.{' '}
                                <Button
                                  variant="link"
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
                                    element.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'center',
                                    });
                                  }}
                                >
                                  View permission.
                                </Button>
                              </p>
                            }
                          />
                        </div>
                      )
                    )}
                    <Select
                      aria-label={permission.title}
                      onSurface={props.onSurface}
                      options={[
                        { value: 'not-selected', label: 'Not Selected' },
                        { value: 'allow', label: 'Allow' },
                      ]}
                      disabled={
                        props.isReadOnly ||
                        permission.isReadOnly ||
                        needsDependency ||
                        !permission.isAssignableByViewer
                      }
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
                      width="sm"
                    />
                  </div>
                  {focusedPermission === permission.id && (
                    <div className={styles.permissionSelectorDiv10} />
                  )}
                </div>
              );
            })}
          </div>
        ),
      }))}
    />
  );
}
