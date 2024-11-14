import { ReactElement, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
        title: 'View',
        description: 'Member can see the organization. Permission can not be modified.',
        readOnly: true,
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:support',
        title: 'Support',
        description: 'Member can access, create and reply to support tickets.',
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:updateSlug',
        title: 'Update Slug',
        description: 'Member can modify the organization slug.',
        level: ResourceLevel.organization,
      },
      {
        id: 'organization:delete',
        title: 'Delete',
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
        title: 'View',
        description: 'Member can view the organization members.',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:assignRole',
        title: 'Assign Role',
        description: 'Member can assign roles to users.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:modifyRole',
        title: 'Modify Role',
        description: 'Member can modify, create and delete roles.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:remove',
        title: 'Remove Member',
        description: 'Member can remove users from the Organization.',
        dependsOn: 'members:describe',
        level: ResourceLevel.organization,
      },
      {
        id: 'members:manageInvites',
        title: 'Manage Invites',
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
        title: 'Describe',
        description: 'Member can see the billing information.',
        level: ResourceLevel.organization,
      },
      {
        id: 'billing:update',
        title: 'Manage project level schema linting',
        description: 'Member can see the billing information.',
        dependsOn: 'billing:describe',
        level: ResourceLevel.organization,
      },
    ],
  },
  {
    title: 'Open ID Connect',
    permissions: [
      {
        id: 'oidc:manage',
        title: 'Manage Integration',
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
        title: 'Manage Integration',
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
        title: 'Manage Slack Integration',
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
        title: 'Create Project',
        description: 'Member can create new projects.',
        level: ResourceLevel.organization,
      },
      {
        id: 'project:describe',
        title: 'View Project',
        description: 'Member can access the specified projects.',
        level: [ResourceLevel.project, ResourceLevel.organization],
      },
      {
        id: 'project:delete',
        title: 'View Project',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization],
      },
      {
        id: 'project:modifySettings',
        title: 'Modify Settings',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization],
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
        description: 'Member can view and modify the organization schema linting rules.',
        level: [ResourceLevel.project, ResourceLevel.organization],
        dependsOn: 'project:view',
      },
    ],
  },
  {
    title: 'Target',
    permissions: [
      {
        id: 'target:create',
        title: 'Create Target',
        description: 'Member can create new projects.',
        level: [ResourceLevel.project, ResourceLevel.organization],
      },
      {
        id: 'target:delete',
        title: 'Delete Target',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
      {
        id: 'target:modifySettings',
        title: 'Modify Settings',
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
        title: 'View Laboratory',
        description: 'Member can access the laboratory, view and execute GraphQL documents.',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
      {
        id: 'laboratory:modify',
        title: 'Modify Laboratory',
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
        title: 'View App Deployments',
        description: 'Member can view app deployments.',
        level: [ResourceLevel.project, ResourceLevel.organization, ResourceLevel.target],
      },
    ],
  },
  {
    title: 'Schema Checks',
    permissions: [
      {
        id: 'appDeployments:describe',
        title: 'Approve Schema Check',
        description: 'Member can approve failed schema checks.',
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
  grantedPermissions: Record<string, 'allow' | 'deny' | undefined>;
  updateGrantedPermissions: (group: Record<string, 'allow' | 'deny' | undefined>) => void;
}) {
  return (
    <Accordion type="multiple" className="w-full">
      {permissionGroups.map(group => {
        let selectedPermissions = 0;
        for (const permission of group.permissions) {
          if (props.grantedPermissions[permission.id] !== undefined) {
            selectedPermissions++;
          }
        }

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

        const filteredGroupPermissions = group.permissions.filter(permission =>
          Array.isArray(permission.level)
            ? permission.level.includes(props.resourceLevel)
            : props.resourceLevel === permission.level,
        );

        if (filteredGroupPermissions.length === 0) {
          return null;
        }

        return (
          <AccordionItem value={group.title}>
            <AccordionTrigger className="w-full" key={group.title}>
              {group.title}{' '}
              {selectedPermissions > 0 && (
                <span className="ml-auto mr-1 inline-block text-sm">
                  {selectedPermissions} selected
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent className="pl-2">
              {filteredGroupPermissions.map(permission => {
                const needsDependency =
                  !!permission.dependsOn &&
                  props.grantedPermissions[permission.dependsOn] !== 'allow';
                return (
                  <div
                    className="flex flex-row items-center justify-between space-x-4 py-2 pt-0 text-sm"
                    key={permission.id}
                  >
                    <div className={cn(needsDependency && 'opacity-30')}>
                      <div className="font-semibold text-white">{permission.title}</div>
                      <div className="text-xs text-gray-400">{permission.description}</div>
                    </div>
                    <Select
                      disabled={permission.readOnly || needsDependency}
                      value={
                        needsDependency
                          ? ''
                          : permission.readOnly
                            ? 'allow'
                            : props.grantedPermissions[permission.id] || 'not-selected'
                      }
                      onValueChange={value => {
                        const dependents = dependencyGraph.get(permission.id) ?? [];
                        if (value === 'allow') {
                          props.updateGrantedPermissions({
                            [permission.id]: 'allow',
                          });
                        } else if (value === 'deny') {
                          props.updateGrantedPermissions({
                            [permission.id]: 'deny',
                            ...Object.fromEntries(
                              dependents.map(value => [[value, undefined] as const]),
                            ),
                          });
                        } else if (value === 'not-selected') {
                          props.updateGrantedPermissions({
                            [permission.id]: undefined,
                            ...Object.fromEntries(
                              dependents.map(value => [[value, undefined] as const]),
                            ),
                          });
                        }
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
      <span className="ml-0 mr-auto">{props.title}</span>
      {assignedPermissionsCount > 0 && <>{assignedPermissionsCount} selected</>}
      <ChevronRight size={16} className="ml-2" />
    </Button>
  );
}

function GG(props: { mode?: 'read-only'; role?: { name: string; description: string } }) {
  const form = useForm({
    resolver: zodResolver(roleFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: props.role?.name ?? 'New Role',
      description: props.role?.description,
    },
    disabled: props.mode === 'read-only',
  });

  const [selectedGroupId, setSelectedGroupId] = useState<null | string>(null);

  const [dynamicGroups, setDynamicGroups] = useState<
    Array<{
      id: string;
      level: ResourceLevel;
      title: string;
      permissions: { [key: string]: 'allow' | 'deny' | undefined };
      canDelete?: true;
    }>
  >([
    {
      id: 'default',
      level: ResourceLevel.organization,
      title: 'Global Organization Wide Permissions',
      permissions: {},
    },
  ]);

  const selectedGroup = dynamicGroups.find(group => group.id === selectedGroupId) ?? null;

  return (
    <Dialog open>
      <Form {...form}>
        <DialogContent className="min-h-[550px] max-w-[960px]">
          {selectedGroup === null && (
            <>
              <DialogHeader>
                <DialogTitle>Member Role Editor</DialogTitle>
                <DialogDescription>
                  Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod
                  tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
                </DialogDescription>
              </DialogHeader>
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
                            {
                              id,
                              level: ResourceLevel.project,
                              permissions: {},
                              title: 'Project ' + id,
                            },
                          ]);
                        }}
                      >
                        Project-level
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const id = window.crypto.randomUUID();
                          setDynamicGroups(groups => [
                            ...groups,
                            {
                              id,
                              level: ResourceLevel.target,
                              permissions: {},
                              title: 'Target ' + id,
                            },
                          ]);
                        }}
                      >
                        Target-level
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const id = window.crypto.randomUUID();
                          setDynamicGroups(groups => [
                            ...groups,
                            {
                              id,
                              level: ResourceLevel.service,
                              permissions: {},
                              title: 'Service ' + id,
                            },
                          ]);
                        }}
                      >
                        Service-level
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </>
          )}
          {selectedGroup !== null && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <span className="cursor-pointer" onClick={() => setSelectedGroupId(null)}>
                    Member Role Editor
                  </span>{' '}
                  <span>{'>'}</span> {selectedGroup.title}
                </DialogTitle>
                <p className="mt-1 text-xs text-gray-400">
                  These permissions apply to all resources within the organization.
                  <br /> E.g. if you grant access to projects permissions, these apply to all
                  projects.
                </p>
              </DialogHeader>
              <div className="max-h-[500px] overflow-scroll pr-5">
                <PermissionSelector
                  resourceLevel={selectedGroup.level}
                  grantedPermissions={selectedGroup.permissions}
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
            </>
          )}
        </DialogContent>
      </Form>
    </Dialog>
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
    </div>
  ),
};
