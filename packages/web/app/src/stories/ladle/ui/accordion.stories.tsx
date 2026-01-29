import React from 'react';
import type { Story } from '@ladle/react';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckIcon } from 'lucide-react';

export const Default: Story = () => (
  <Accordion type="single" collapsible className="w-full max-w-md">
    <AccordionItem value="item-1">
      <AccordionTrigger>What is GraphQL Hive?</AccordionTrigger>
      <AccordionContent>
        GraphQL Hive is a schema registry for your GraphQL APIs. It helps you track changes,
        prevent breaking changes, and monitor usage.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Multiple: Story = () => (
  <Accordion type="single" collapsible className="w-full max-w-md">
    <AccordionItem value="item-1">
      <AccordionTrigger>Is it accessible?</AccordionTrigger>
      <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>Is it styled?</AccordionTrigger>
      <AccordionContent>
        Yes. It comes with default styles that are customizable via Tailwind.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-3">
      <AccordionTrigger>Is it animated?</AccordionTrigger>
      <AccordionContent>
        Yes. It uses CSS transitions for smooth open and close animations.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const MultipleOpen: Story = () => {
  const [openItems, setOpenItems] = React.useState<string[]>(['item-1', 'item-2']);

  return (
    <Accordion
      type="multiple"
      className="w-full max-w-md"
      value={openItems}
      onValueChange={setOpenItems}
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Schema Registry</AccordionTrigger>
        <AccordionContent>
          Track all your GraphQL schema changes in one place. See who made changes, when, and why.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Breaking Change Detection</AccordionTrigger>
        <AccordionContent>
          Automatically detect breaking changes before they reach production. Get warnings for
          changes that could break existing clients.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Usage Analytics</AccordionTrigger>
        <AccordionContent>
          Monitor how your GraphQL API is being used. Identify slow queries, unused fields, and
          optimization opportunities.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// Based on usage in target/history/errors-and-changes.tsx
export const SchemaChanges: Story = () => (
  <div className="w-full max-w-2xl space-y-2">
    <Accordion type="single" collapsible>
      <AccordionItem value="breaking-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="text-left text-red-400">
              <div>
                <span className="text-gray-600">
                  Field <code className="text-neutral-12">User.email</code> removed
                </span>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">
          <div>
            <h4 className="text-neutral-12 mb-1 text-sm font-medium">
              Affected Operations (based on usage)
            </h4>
            <p className="text-neutral-11 text-sm">
              This breaking change affects 3 operations that query the User.email field. Consider
              using a deprecation period before removing.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <Accordion type="single" collapsible>
      <AccordionItem value="safe-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="text-left text-yellow-400">
              <div>
                <span className="text-gray-600">
                  Field <code className="text-neutral-12">User.phone</code> deprecated
                </span>
                <span className="cursor-pointer text-yellow-500">
                  {' '}
                  <CheckIcon className="inline size-3" /> Safe based on usage data
                </span>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">
          <p className="text-neutral-11 text-sm">
            No operations currently use this field, so deprecation is safe.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <Accordion type="single" collapsible>
      <AccordionItem value="safe-2">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="text-left text-emerald-400">
              <div>
                <span className="text-gray-600">
                  Field <code className="text-neutral-12">User.avatar</code> added
                </span>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">
          <p className="text-neutral-11 text-sm">
            New field added to the User type. This is a safe, non-breaking change.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

// Based on usage in organization/members/permission-selector.tsx
export const PermissionGroups: Story = () => {
  const [openGroups, setOpenGroups] = React.useState<string[]>(['Organization']);
  const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(
    new Set(['org:read', 'org:settings']),
  );

  const permissionGroups = [
    {
      title: 'Organization',
      permissions: [
        { id: 'org:read', label: 'Read organization data' },
        { id: 'org:write', label: 'Modify organization settings' },
        { id: 'org:delete', label: 'Delete organization' },
        { id: 'org:settings', label: 'Manage organization settings' },
      ],
    },
    {
      title: 'Project',
      permissions: [
        { id: 'project:read', label: 'Read project data' },
        { id: 'project:write', label: 'Create and modify projects' },
        { id: 'project:delete', label: 'Delete projects' },
      ],
    },
    {
      title: 'Target',
      permissions: [
        { id: 'target:read', label: 'Read target data' },
        { id: 'target:write', label: 'Modify target settings' },
        { id: 'target:registry:read', label: 'Read schema registry' },
        { id: 'target:registry:write', label: 'Push schema changes' },
      ],
    },
  ];

  return (
    <div className="w-full max-w-lg">
      <Accordion
        type="multiple"
        className="w-full"
        value={openGroups}
        onValueChange={values => setOpenGroups(values)}
      >
        {permissionGroups.map(group => {
          const selectedCount = group.permissions.filter(p =>
            selectedPermissions.has(p.id),
          ).length;

          return (
            <AccordionItem value={group.title} key={group.title}>
              <AccordionTrigger
                className="w-full"
                aria-label={`${group.title} permission group with ${selectedCount} permissions selected`}
              >
                {group.title}{' '}
                <span className="ml-auto mr-0">
                  {selectedCount > 0 && (
                    <span className="mr-1 inline-block text-sm">{selectedCount} selected</span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-2 pt-1">
                {group.permissions.map(permission => (
                  <div className="flex flex-row items-center space-x-4 pb-2 text-sm" key={permission.id}>
                    <Checkbox
                      id={permission.id}
                      checked={selectedPermissions.has(permission.id)}
                      onCheckedChange={checked => {
                        const newSelected = new Set(selectedPermissions);
                        if (checked) {
                          newSelected.add(permission.id);
                        } else {
                          newSelected.delete(permission.id);
                        }
                        setSelectedPermissions(newSelected);
                      }}
                    />
                    <label htmlFor={permission.id} className="flex-1 cursor-pointer">
                      {permission.label}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

// Based on usage in target/proposals/change-detail.tsx
export const ChangeDetail: Story = () => (
  <div className="w-full max-w-2xl space-y-2">
    <Accordion type="single">
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 text-gray-600 hover:no-underline">
            <div className="flex w-full flex-row items-center text-left">
              <div>
                Type <code className="text-neutral-12">Query.user</code> return type changed from{' '}
                <code className="text-neutral-12">User</code> to{' '}
                <code className="text-neutral-12">User!</code>
              </div>
              <div className="min-w-fit grow pr-2 md:flex-none">
                <span className="text-yellow-400">⚠️</span>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
          <p className="text-neutral-11 text-sm">
            Making a field non-nullable is a breaking change. Clients that handle null values will
            need to be updated.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <Accordion type="single">
      <AccordionItem value="item-2">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 text-gray-600 hover:no-underline">
            <div className="flex w-full flex-row items-center text-left">
              <div>
                Argument <code className="text-neutral-12">limit</code> added to{' '}
                <code className="text-neutral-12">Query.users</code>
              </div>
              <div className="min-w-fit grow pr-2 md:flex-none">
                <span className="text-emerald-400">✓</span>
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>
          <p className="text-neutral-11 text-sm">
            Adding an optional argument is a safe change. Existing queries will continue to work
            without modification.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Accordion Component</h2>
      <p className="text-neutral-11 mb-4">
        Collapsible sections to organize content. Based on Radix UI Accordion.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Accordion</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Click to expand</AccordionTrigger>
                <AccordionContent>
                  Content is revealed when you click the trigger above.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-b</code> on AccordionItem
            <br />
            Hover: <code className="text-neutral-12">hover:underline</code> on trigger
            <br />
            Icon: <code className="text-neutral-12">ChevronDown</code> rotates 180deg when open
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Multiple Items</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>First section</AccordionTrigger>
                <AccordionContent>First section content</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Second section</AccordionTrigger>
                <AccordionContent>Second section content</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Third section</AccordionTrigger>
                <AccordionContent>Third section content</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <p className="text-xs text-neutral-10">
            Type: <code className="text-neutral-12">type="single"</code> - only one open at a time
            <br />
            Collapsible: Can close the open item
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Multiple Open (type="multiple")</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Accordion type="multiple" className="w-full" defaultValue={['item-1', 'item-2']}>
              <AccordionItem value="item-1">
                <AccordionTrigger>First section (open by default)</AccordionTrigger>
                <AccordionContent>First section content</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Second section (open by default)</AccordionTrigger>
                <AccordionContent>Second section content</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Third section</AccordionTrigger>
                <AccordionContent>Third section content</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <p className="text-xs text-neutral-10">
            Type: <code className="text-neutral-12">type="multiple"</code> - multiple items can be
            open simultaneously
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">Accordion</code>: Root container (type, collapsible,
            value props)
          </li>
          <li>
            <code className="text-neutral-12">AccordionItem</code>: Individual collapsible section
            (value prop required)
          </li>
          <li>
            <code className="text-neutral-12">AccordionTrigger</code>: Clickable header with
            chevron icon
          </li>
          <li>
            <code className="text-neutral-12">AccordionContent</code>: Collapsible content area
          </li>
          <li>
            <code className="text-neutral-12">AccordionHeader</code>: Optional wrapper for trigger
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Animation</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10">
          Chevron rotation:{' '}
          <code className="text-neutral-12">[&[data-state=open]&gt;svg]:rotate-180</code>
          <br />
          Duration: <code className="text-neutral-12">transition-transform duration-200</code>
          <br />
          Content visibility:{' '}
          <code className="text-neutral-12">data-[state=closed]:hidden</code>
        </p>
      </div>
    </div>
  </div>
);
