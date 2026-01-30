import React from 'react';
import { EllipsisIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Table',
};

export const Default: Story = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
        <TableHead className="text-right">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">Alice Johnson</TableCell>
        <TableCell>alice@example.com</TableCell>
        <TableCell>Admin</TableCell>
        <TableCell className="text-right">Active</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Bob Smith</TableCell>
        <TableCell>bob@example.com</TableCell>
        <TableCell>Developer</TableCell>
        <TableCell className="text-right">Active</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Carol Williams</TableCell>
        <TableCell>carol@example.com</TableCell>
        <TableCell>Designer</TableCell>
        <TableCell className="text-right">Inactive</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

export const WithCaption: Story = () => (
  <Table>
    <TableCaption>A list of team members and their roles.</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Role</TableHead>
        <TableHead className="text-right">Projects</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">Alice Johnson</TableCell>
        <TableCell>Team Lead</TableCell>
        <TableCell className="text-right">12</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Bob Smith</TableCell>
        <TableCell>Backend Developer</TableCell>
        <TableCell className="text-right">8</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Carol Williams</TableCell>
        <TableCell>Frontend Developer</TableCell>
        <TableCell className="text-right">10</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

// Based on usage in project/settings/access-tokens/project-access-tokens-table.tsx
export const AccessTokensTable: Story = () => {
  const tokens = [
    {
      id: '1',
      title: 'Production API Token',
      firstCharacters: 'hive_',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      title: 'Staging Environment',
      firstCharacters: 'hive_',
      createdAt: '2024-01-20T14:45:00Z',
    },
    {
      id: '3',
      title: 'CI/CD Pipeline',
      firstCharacters: 'hive_',
      createdAt: '2024-02-01T09:15:00Z',
    },
  ];

  return (
    <Table>
      <TableCaption>
        <Button size="sm" variant="outline" className="ml-auto mr-0 flex">
          Load more
        </Button>
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead className="w-[100px]">Private Key</TableHead>
          <TableHead className="text-right">Created At</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map(token => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">{token.title}</TableCell>
            <TableCell className="font-mono">{token.firstCharacters}••••••••</TableCell>
            <TableCell className="text-right">
              {new Date(token.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right align-middle">
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-auto block">
                  <EllipsisIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const WithRowActions: Story = () => {
  const operations = [
    { id: '1', name: 'GetUser', requests: '1,234,567', avgDuration: '45ms' },
    { id: '2', name: 'ListProducts', requests: '987,654', avgDuration: '120ms' },
    { id: '3', name: 'CreateOrder', requests: '456,789', avgDuration: '230ms' },
    { id: '4', name: 'UpdateUser', requests: '234,567', avgDuration: '67ms' },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Operation</TableHead>
          <TableHead className="text-right">Requests</TableHead>
          <TableHead className="text-right">Avg Duration</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {operations.map(op => (
          <TableRow key={op.id}>
            <TableCell className="font-medium">{op.name}</TableCell>
            <TableCell className="text-right">{op.requests}</TableCell>
            <TableCell className="text-right">{op.avgDuration}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost">
                  View
                </Button>
                <Button size="sm" variant="ghost">
                  Analyze
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const WithSelection: Story = () => {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set(['2']));

  const users = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Developer' },
    { id: '3', name: 'Carol Williams', email: 'carol@example.com', role: 'Designer' },
    { id: '4', name: 'David Brown', email: 'david@example.com', role: 'Developer' },
  ];

  const allSelected = users.every(user => selectedRows.has(user.id));

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedRows(new Set(users.map(u => u.id)));
                  } else {
                    setSelectedRows(new Set());
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id} data-state={selectedRows.has(user.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedRows.has(user.id)}
                  onCheckedChange={checked => {
                    const updated = new Set(selectedRows);
                    if (checked) {
                      updated.add(user.id);
                    } else {
                      updated.delete(user.id);
                    }
                    setSelectedRows(updated);
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-neutral-11 text-sm">
        {selectedRows.size > 0 ? `${selectedRows.size} row(s) selected` : 'No rows selected'}
      </p>
    </div>
  );
};

export const SchemaVersions: Story = () => {
  const versions = [
    {
      id: '1',
      version: 'v1.2.3',
      changes: '+3 fields, -1 field',
      author: 'Alice Johnson',
      date: '2024-02-15',
      status: 'active',
    },
    {
      id: '2',
      version: 'v1.2.2',
      changes: '+1 field',
      author: 'Bob Smith',
      date: '2024-02-10',
      status: 'inactive',
    },
    {
      id: '3',
      version: 'v1.2.1',
      changes: 'Breaking: removed User.email',
      author: 'Alice Johnson',
      date: '2024-02-05',
      status: 'inactive',
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Changes</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map(version => (
          <TableRow key={version.id}>
            <TableCell className="font-mono font-medium">{version.version}</TableCell>
            <TableCell className="text-neutral-11">{version.changes}</TableCell>
            <TableCell>{version.author}</TableCell>
            <TableCell>{version.date}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  version.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-neutral-3 text-neutral-11'
                }`}
              >
                {version.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Table Component</h2>
      <p className="text-neutral-11 mb-4">
        Accessible table component for displaying tabular data with headers, rows, and cells.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Table</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Item 1</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Item 2</TableCell>
                  <TableCell>Inactive</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-neutral-10 text-xs">
            Width: <code className="text-neutral-12">w-full</code>
            <br />
            Font size: <code className="text-neutral-12">text-sm</code>
            <br />
            Overflow: <code className="text-neutral-12">overflow-auto</code> on container
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Row Hover State</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Hover over this row</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Or this one</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-neutral-10 text-xs">
            Hover: <code className="text-neutral-12">hover:bg-neutral-3/50</code>
            <br />
            Transition: <code className="text-neutral-12">transition-colors</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Table Headers</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column 1</TableHead>
                  <TableHead className="text-right">Right Aligned</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
          <p className="text-neutral-10 text-xs">
            Text color: <code className="text-neutral-12">text-neutral-10</code>
            <br />
            Font weight: <code className="text-neutral-12">font-medium</code>
            <br />
            Height: <code className="text-neutral-12">h-10</code>
            <br />
            Padding: <code className="text-neutral-12">px-2</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Row Borders</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Row 1 (has border)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Row 2 (has border)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Row 3 (no border - last row)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-neutral-10 text-xs">
            Header row: <code className="text-neutral-12">[&_tr]:border-b</code>
            <br />
            Body rows: <code className="text-neutral-12">border-b</code>
            <br />
            Last row: <code className="text-neutral-12">[&_tr:last-child]:border-0</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">Table</code>: Root container with overflow wrapper
          </li>
          <li>
            <code className="text-neutral-12">TableHeader</code>: Table head section (thead)
          </li>
          <li>
            <code className="text-neutral-12">TableBody</code>: Table body section (tbody)
          </li>
          <li>
            <code className="text-neutral-12">TableFooter</code>: Table footer section (tfoot)
          </li>
          <li>
            <code className="text-neutral-12">TableRow</code>: Table row (tr)
          </li>
          <li>
            <code className="text-neutral-12">TableHead</code>: Header cell (th)
          </li>
          <li>
            <code className="text-neutral-12">TableCell</code>: Data cell (td)
          </li>
          <li>
            <code className="text-neutral-12">TableCaption</code>: Table caption/description
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Patterns</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">With Checkboxes</p>
          <p className="text-neutral-10 text-xs">
            First column contains checkboxes for row selection. Use{' '}
            <code className="text-neutral-12">data-state="selected"</code> to highlight selected
            rows.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">With Actions</p>
          <p className="text-neutral-10 text-xs">
            Last column typically contains action buttons or dropdown menus. Use{' '}
            <code className="text-neutral-12">text-right</code> and{' '}
            <code className="text-neutral-12">align-middle</code> for proper alignment.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Load More</p>
          <p className="text-neutral-10 text-xs">
            TableCaption can contain a "Load more" button for pagination. Position with{' '}
            <code className="text-neutral-12">ml-auto</code>.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage in Codebase</h2>
      <div className="space-y-2">
        <p className="text-neutral-11 text-sm">Tables are used throughout the codebase:</p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>Access tokens: project-access-tokens-table.tsx</li>
          <li>Schema changes: target/history/errors-and-changes.tsx</li>
          <li>App versions: pages/target-app-version.tsx, target-apps.tsx</li>
          <li>Traces: pages/target-traces.tsx</li>
          <li>Support tickets: pages/organization-support.tsx</li>
        </ul>
      </div>
    </div>
  </div>
);
