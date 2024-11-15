import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, InfoIcon, XIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react';

const enum ResourceLevel {
  organization = 'organization',
  project = 'project',
  target = 'target',
  service = 'service',
}

type PermissionGroup = {
  title: string;
  permissions: Array<PermissionRecord>;
};

type PermissionRecord = {
  id: string;
  title: string;
  description: string;
  dependsOn?: string;
  readOnly?: true;
  level: ResourceLevel | Array<ResourceLevel>;
};

const permissionGroups: Array<PermissionGroup> = [
  {
    title: 'Organization',
    permissions: [
      {
        id: 'organization:describe',
        title: 'View organization',
        description: 'Member can see the organization. Permission can not be modified.',
        readOnly: true,
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:support',
        title: 'Access support tickets',
        description: 'Member can access, create and reply to support tickets.',
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:updateSlug',
        title: 'Update organization slug',
        description: 'Member can modify the organization slug.',
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:delete',
        title: 'Delete organization',
        description: 'Member can delete the Organization.',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'Members',
    permissions: [
      {
        id: 'members:describe',
        title: 'View members',
        description: 'Member can access the organization member overview.',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:assignRole',
        title: 'Assign member role',
        description: 'Member can assign roles to users.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:modifyRole',
        title: 'Modify member role',
        description: 'Member can modify, create and delete roles.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:remove',
        title: 'Remove member',
        description: 'Member can remove users from the organization.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:manageInvites',
        title: 'Manage invites',
        description: 'Member can invite users via email and modify or delete pending invites.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'Billing',
    permissions: [
      {
        id: 'billing:describe',
        title: 'View billing',
        description: 'Member can view the billing information.',
        level: ResourceLevel.organization,
      },
      {
        id: 'billing:update',
        title: 'Update billing',
        description: 'Member can change the organization plan.',
        dependsOn: 'billing:describe',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'OpenID Connect',
    permissions: [
      {
        id: 'oidc:manage',
        title: 'Manage OpenID Connect integration',
        description: 'Member can connect, modify, and remove an OIDC provider to the connection.',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'GitHub Integration',
    permissions: [
      {
        id: 'github:manage',
        title: 'Manage GitHub integration',
        description:
          'Member can connect, modify, and remove access for the GitHub integration and repository access.',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'Slack Integration',
    permissions: [
      {
        id: 'slack:manage',
        title: 'Manage Slack integration',
        description:
          'Member can connect, modify, and remove access for the Slack integration and repository access.',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'Project',
    permissions: [
      {
        id: 'project:create',
        title: 'Create project',
        description: 'Member can create new projects.',
        level: ResourceLevel.organization,
      },
      {
        id: 'project:describe',
        title: 'View project',
        description: 'Member can access the specified projects.',
        level: [ResourceLevel.project, ResourceLevel.organization],
      },
      {
        id: 'project:delete',
        title: 'Delete project',
        description: 'Member can access the specified projects.',
        level: [ResourceLevel.project, ResourceLevel.organization],
        dependsOn: 'project:describe',
      },
      {
        id: 'project:modifySettings',
        title: 'Modify Settings',
        description: 'Member can access the specified projects.',
        level: [ResourceLevel.project, ResourceLevel.organization],
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    title: 'Schema Linting',
    permissions: [
      {
        id: 'schemaLinting:modifyOrganizationSettings',
        title: 'Manage organization level schema linting',
        description: 'Member can view and modify the organization schema linting rules.',
        level: ResourceLevel.organization,
      },
      {
        id: 'schemaLinting:modifyProjectSettings',
        title: 'Manage project level schema linting',
        description: 'Member can view and modify the projects schema linting rules.',
        level: [ResourceLevel.project, ResourceLevel.organization],
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    title: 'Target',
    permissions: [
      {
        id: 'target:create',
        title: 'Create target',
        description: 'Member can create new projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization],
      },
      {
        id: 'target:delete',
        title: 'Delete target',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
      {
        id: 'target:modifySettings',
        title: 'Modify settings',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
    ],
  },
  {
    title: 'Laboratory',
    permissions: [
      {
        id: 'laboratory:describe',
        title: 'View laboratory',
        description: 'Member can access the laboratory, view and execute GraphQL documents.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
      {
        id: 'laboratory:modify',
        title: 'Modify laboratory',
        description:
          'Member can create, delete and update collections and documents in the laboratory.',
        dependsOn: 'laboratory:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
    ],
  },
  {
    title: 'App Deployments',
    permissions: [
      {
        id: 'appDeployments:describe',
        title: 'View app deployments',
        description: 'Member can view app deployments.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
    ],
  },
  {
    title: 'Schema Checks',
    permissions: [
      {
        id: 'appDeployments:describe',
        title: 'Approve schema check',
        description: 'Member can approve failed schema checks.',
        dependsOn: 'project:describe',
        level: [
          ResourceLevel.project,
          ResourceLevel.organization,
          ResourceLevel.target,
          ResourceLevel.service,
        ],
      },
    ],
  },
];

const roleFormSchema = z.object({
  name: z
    .string({
      required_error: 'Required',
    })
    .trim()
    .min(2, 'Too short')
    .max(64, 'Max 64 characters long')
    .refine(
      val => typeof val === 'string' && val.length > 0 && val[0] === val[0].toUpperCase(),
      'Must start with a capital letter',
    )
    .refine(val => val !== 'Viewer' && val !== 'Admin', 'Viewer and Admin are reserved'),
  description: z
    .string({
      required_error: 'Please enter role description',
    })
    .trim()
    .min(2, 'Too short')
    .max(256, 'Description is too long'),
});

function PermissionSelector(props: {
  resourceLevel: ResourceLevel;
  grantedPermissions: GrantedPermissions;
  updateGrantedPermissions: (group: GrantedPermissions) => void;
}) {
  const grantedPermissions = useMemo<GrantedPermissions>(() => {
    return {
      ...props.grantedPermissions,
      // A lot of the rules depends on 'project:describe'
      // However, if we are on resource level target or service, project:describe needs to be specified so it can be selected.
      ...(props.resourceLevel === ResourceLevel.target ||
      props.resourceLevel === ResourceLevel.service
        ? {
            'project:describe': 'allow',
          }
        : {}),
    };
  }, [props.resourceLevel, props.grantedPermissions]);

  const [filteredGroups, permissionGroupMapping] = useMemo(() => {
    const filteredGroups: Array<
      PermissionGroup & {
        selectedPermissionCount: number;
      }
    > = [];
    const permissionGroupMapping = new Map<string, string>();

    for (const group of permissionGroups) {
      let selectedPermissionCount = 0;

      const filteredGroupPermissions = group.permissions.filter(permission => {
        const shouldInclude = Array.isArray(permission.level)
          ? permission.level.includes(props.resourceLevel)
          : props.resourceLevel === permission.level;

        if (shouldInclude === false) {
          return false;
        }

        if (props.grantedPermissions[permission.id] !== undefined) {
          selectedPermissionCount++;
        }

        permissionGroupMapping.set(permission.id, group.title);

        return true;
      });

      if (filteredGroupPermissions.length === 0) {
        continue;
      }

      filteredGroups.push({
        ...group,
        selectedPermissionCount,
        permissions: filteredGroupPermissions,
      });
    }

    return [filteredGroups, permissionGroupMapping] as const;
  }, [props.resourceLevel, props.grantedPermissions]);
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
      {filteredGroups.map(group => {
        const dependencyGraph = new Map<string, Array<string>>();
        for (const permission of group.permissions) {
          if (!permission.dependsOn) {
            continue;
          }
          let arr = dependencyGraph.get(permission.dependsOn);
          if (!arr) {
            arr = [];
            dependencyGraph.set(permission.dependsOn, arr);
          }
          arr.push(permission.id);
        }

        return (
          <AccordionItem value={group.title} key={group.title}>
            <AccordionTrigger className="w-full" key={group.title}>
              {group.title}{' '}
              {group.selectedPermissionCount > 0 && (
                <span className="ml-auto mr-1 inline-block text-sm">
                  {group.selectedPermissionCount} selected
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent className="pl-2" forceMount={true}>
              {group.permissions.map(permission => {
                const needsDependency =
                  !!permission.dependsOn && grantedPermissions[permission.dependsOn] !== 'allow';

                return (
                  <div
                    className={cn(
                      'border-ring flex flex-row items-center justify-between space-x-4 border-orange-500 py-2 pt-0 text-sm',
                      focusedPermission === permission.id && 'margin-[-1px] border',
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
                    {!!permission.dependsOn && permissionGroupMapping.has(permission.dependsOn) && (
                      <div className="text-gray flex grow justify-end">
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
                                    const dependencyPermission = permission.dependsOn;
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
                                        permissionGroupMapping.get(dependencyPermission);
                                      if (!groupName) {
                                      }
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
                      disabled={permission.readOnly || needsDependency}
                      value={
                        permission.readOnly
                          ? 'allow'
                          : grantedPermissions[permission.id] || 'not-selected'
                      }
                      onValueChange={value => {
                        const dependents = dependencyGraph.get(permission.id) ?? [];
                        if (value === 'allow') {
                          props.updateGrantedPermissions({
                            [permission.id]: 'allow',
                            ...Object.fromEntries(
                              dependents.map(value => [value, undefined] as const),
                            ),
                          });
                        } else if (value === 'deny') {
                          props.updateGrantedPermissions({
                            [permission.id]: 'deny',
                            ...Object.fromEntries(
                              dependents.map(value => [value, 'deny'] as const),
                            ),
                          });
                        } else if (value === 'not-selected') {
                          props.updateGrantedPermissions({
                            [permission.id]: undefined,
                            ...Object.fromEntries(
                              dependents.map(value => [value, undefined] as const),
                            ),
                          });
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
                        <SelectItem value="deny">Deny</SelectItem>
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

type GrantedPermissions = { [key: string]: 'allow' | 'deny' | undefined };

function GroupTeaser(props: {
  title: string;
  grantedPermissions: GrantedPermissions;
  onClick: () => void;
  mode: GroupAccessMode;
  resourceLevel: ResourceLevel | null;
  resources: Array<string>;
}) {
  const assignedPermissionsCount = Array.from(Object.values(props.grantedPermissions)).reduce(
    (current, next) => {
      if (!next) {
        return current;
      }
      return current + 1;
    },
    0,
  );

  return (
    <Button variant="outline" className="w-full" onClick={props.onClick}>
      {props.resourceLevel && <Badge className="mr-2 capitalize">{props.resourceLevel}</Badge>}
      <span className="ml-0 mr-auto">{props.title}</span>
      {props.resourceLevel && props.resources.length === 0 ? (
        <>
          <span className="text-red-400">No {props.resourceLevel}s selected</span>
        </>
      ) : (
        <>
          {props.mode === GroupAccessMode.granular &&
            (assignedPermissionsCount > 0 ? (
              <>{assignedPermissionsCount} selected</>
            ) : (
              props.resourceLevel && <span className="text-red-400">No permissions selected</span>
            ))}
          {props.mode === GroupAccessMode.allowAll && <>All allowed</>}
          {props.mode === GroupAccessMode.denyAll && <>All denied</>}
        </>
      )}
      <ChevronRight size={16} className="ml-2" />
    </Button>
  );
}

function ResourceBadge(props: { name: string; onDelete: () => void }) {
  return (
    <Badge className="mr-1 pr-1">
      {props.name}
      <button className="ml-1" onClick={props.onDelete}>
        <XIcon size="10" />
      </button>
    </Badge>
  );
}

const enum GroupAccessMode {
  granular = 'granular',
  allowAll = 'allowAll',
  denyAll = 'denyAll',
}

type Group = {
  id: string;
  level: ResourceLevel;
  title: string;
  permissions: GrantedPermissions;
  mode: GroupAccessMode;
  resources: Array<string>;
};

function createGroup(args: { id: string; level: ResourceLevel; title: string }): Group {
  return {
    ...args,
    permissions: {},
    mode: GroupAccessMode.granular,
    resources: [],
  };
}

function GG() {
  const form = useForm({
    resolver: zodResolver(roleFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: 'New Role',
      description: '',
    },
  });

  const [selectedGroupId, setSelectedGroupId] = useState<null | string>(() => {
    try {
      return JSON.parse(localStorage.getItem('hive:prototype:permissions')!).selectedGroupId;
    } catch (err) {
      return null;
    }
  });

  const [dynamicGroups, setDynamicGroups] = useState<Array<Group>>(() => {
    try {
      return JSON.parse(localStorage.getItem('hive:prototype:permissions')!).dynamicGroups;
    } catch (err) {
      return [
        createGroup({
          id: 'default',
          level: ResourceLevel.organization,
          title: 'Global Organization Wide Permissions',
        }),
      ];
    }
  });

  const selectedGroup = dynamicGroups.find(group => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    localStorage.setItem(
      'hive:prototype:permissions',
      JSON.stringify({
        selectedGroupId,
        dynamicGroups,
      }),
    );
  }, [selectedGroupId, dynamicGroups]);

  return (
    <Card>
      <Form {...form}>
        {selectedGroup === null && (
          <>
            <CardHeader>
              <CardTitle>Member Role Editor</CardTitle>
              <CardDescription>
                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod
                tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row space-x-6">
                <div className="w-72 shrink-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a name"
                            type="text"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter a description"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grow">
                  <div className="space-y-2">
                    {dynamicGroups.map(group => {
                      return (
                        <GroupTeaser
                          key={group.id}
                          title={group.title}
                          grantedPermissions={group.permissions}
                          onClick={() => setSelectedGroupId(group.id)}
                          mode={group.mode}
                          resourceLevel={group.id === 'default' ? null : group.level}
                          resources={group.resources}
                        />
                      );
                    })}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="ml-auto mr-0 mt-3 block">
                        Add More <ChevronDown className="inline" size="16" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          const id = window.crypto.randomUUID();
                          setDynamicGroups(groups => [
                            ...groups,
                            createGroup({
                              id,
                              level: ResourceLevel.project,
                              title: 'New Group' + id,
                            }),
                          ]);
                          setSelectedGroupId(id);
                        }}
                      >
                        Project-level
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const id = window.crypto.randomUUID();
                          setDynamicGroups(groups => [
                            ...groups,
                            createGroup({
                              id,
                              level: ResourceLevel.target,
                              title: 'New Group' + id,
                            }),
                          ]);
                          setSelectedGroupId(id);
                        }}
                      >
                        Target-level
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const id = window.crypto.randomUUID();
                          setDynamicGroups(groups => [
                            ...groups,
                            createGroup({
                              id,
                              level: ResourceLevel.service,
                              title: 'Service ' + id,
                            }),
                          ]);
                          setSelectedGroupId(id);
                        }}
                      >
                        Service-level
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </>
        )}
        {selectedGroup !== null && (
          <>
            <CardHeader>
              <CardTitle>
                <span className="cursor-pointer" onClick={() => setSelectedGroupId(null)}>
                  Member Role Editor
                </span>{' '}
                <span>{'>'}</span> {selectedGroup.title}
              </CardTitle>
              {selectedGroup.id === 'default' && (
                <CardDescription>
                  These permissions apply to all resources within the organization.
                  <br /> E.g. if you grant access to projects permissions, these apply to all
                  projects.
                </CardDescription>
              )}
              {selectedGroup.level === ResourceLevel.project && (
                <CardDescription>
                  These permissions apply to all the selected projects.
                  <br /> E.g. if you grant access to access the laboratory, the member is able to
                  access the laboratory on all targets within all the selected projects.
                </CardDescription>
              )}
              {selectedGroup.level === ResourceLevel.target && (
                <CardDescription>
                  These permissions apply to all the selected targets.
                  <br /> E.g. if you grant access to approve schema checks, the member is able to
                  approve schema checks on all services within the target.
                </CardDescription>
              )}
              {selectedGroup.level === ResourceLevel.service && (
                <CardDescription>
                  These permission apply to all the selected services.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-row space-x-6">
                <div className="w-72 shrink-0 space-y-4">
                  {selectedGroup.level !== ResourceLevel.organization && (
                    <>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label>Group Title</Label>
                        <Input
                          value={selectedGroup.title}
                          onChange={ev => {
                            setDynamicGroups(groups =>
                              groups.map(group => {
                                if (group.id !== selectedGroup.id) {
                                  return group;
                                }

                                return {
                                  ...group,
                                  title: ev.target.value,
                                };
                              }),
                            );
                          }}
                        />
                      </div>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label>Selected {selectedGroup.level}s</Label>
                        <div className="flex w-full max-w-sm items-center space-x-2">
                          <Input
                            onKeyUp={ev => {
                              if (ev.key !== 'Enter') {
                                return;
                              }
                              const value: string = (ev.target as any).value;
                              (ev.target as any).value = '';

                              setDynamicGroups(groups =>
                                groups.map(group => {
                                  if (
                                    group.id !== selectedGroup.id ||
                                    group.resources.includes(value)
                                  ) {
                                    return group;
                                  }

                                  return {
                                    ...group,
                                    resources: [...group.resources, value],
                                  };
                                }),
                              );
                            }}
                          />
                          <Button type="submit">Add</Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        {selectedGroup.resources.map(resource => (
                          <ResourceBadge
                            key={resource}
                            name={resource}
                            onDelete={() => {
                              setDynamicGroups(groups =>
                                groups.map(group => {
                                  if (group.id !== selectedGroup.id) {
                                    return group;
                                  }

                                  return {
                                    ...group,
                                    resources: group.resources.filter(name => name !== resource),
                                  };
                                }),
                              );
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>Mode</Label>
                    <Select
                      value={selectedGroup.mode}
                      onValueChange={value => {
                        setDynamicGroups(groups =>
                          groups.map(group => {
                            if (group.id !== selectedGroup.id) {
                              return group;
                            }

                            return {
                              ...group,
                              mode: value as GroupAccessMode,
                            };
                          }),
                        );
                      }}
                    >
                      <SelectTrigger className="w-[150px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GroupAccessMode.granular}>Granular</SelectItem>
                        <SelectItem value={GroupAccessMode.allowAll}>Allow All</SelectItem>
                        <SelectItem value={GroupAccessMode.denyAll}>Deny all</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedGroup.mode === GroupAccessMode.granular && (
                    <p className="text-muted-foreground text-sm">
                      Grant specific permissions for the specified resources based on your
                      selection.
                    </p>
                  )}
                  {selectedGroup.mode === GroupAccessMode.allowAll && (
                    <p className="text-muted-foreground text-sm">
                      All permissions are granted for the specified resources.
                    </p>
                  )}
                  {selectedGroup.mode === GroupAccessMode.denyAll && (
                    <p className="text-muted-foreground text-sm">
                      All permissions are denied for the specified resources.
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'max-h-[500px] w-full overflow-scroll pr-5',
                    !!(
                      selectedGroup.mode === GroupAccessMode.allowAll ||
                      selectedGroup.mode === GroupAccessMode.denyAll
                    ) && 'pointer-events-none opacity-25',
                  )}
                >
                  <PermissionSelector
                    resourceLevel={selectedGroup.level}
                    grantedPermissions={
                      selectedGroup.mode === GroupAccessMode.allowAll ||
                      selectedGroup.mode === GroupAccessMode.denyAll
                        ? {}
                        : selectedGroup.permissions
                    }
                    updateGrantedPermissions={updates => {
                      setDynamicGroups(groups =>
                        groups.map(group => {
                          if (group.id !== selectedGroup.id) {
                            return group;
                          }

                          return {
                            ...group,
                            permissions: { ...group.permissions, ...updates },
                          };
                        }),
                      );
                    }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="ml-auto mr-0">
                {selectedGroup.resources.length === 0 &&
                  selectedGroup.level !== ResourceLevel.organization && (
                    <span className="pr-5 text-red-400">
                      Please add at least one {selectedGroup.level}.
                    </span>
                  )}
                {selectedGroup.id !== 'default' && (
                  <Button
                    className="mr-2"
                    onClick={() =>
                      setDynamicGroups(groups =>
                        groups.filter(group => group.id !== selectedGroup.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedGroupId(null)}
                  disabled={
                    selectedGroup.resources.length === 0 &&
                    selectedGroup.level !== ResourceLevel.organization
                  }
                >
                  <Check size={12} /> Apply
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Form>
    </Card>
  );
}

const meta: Meta<typeof GG> = {
  title: 'New Member Role Picker',
  component: GG,
};
export default meta;

// export default meta;
type Story = StoryObj<typeof GG>;

export const Default: Story = {
  render: () => (
    <div className="p-5">
      <GG />
      <Button
        onClick={() => {
          localStorage.removeItem('hive:prototype:permissions');
        }}
        className="mt-8"
      >
        Reset Local Storage state
      </Button>
    </div>
  ),
};
