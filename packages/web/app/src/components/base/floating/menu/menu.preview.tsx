import { Check, FileText, LogOut, Settings, Trash2 } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Menu, MenuItem } from './menu';

export const nav: NavPath = 'Base/Floating/Menu';

export const Default = createPreview(() => (
  <Menu
    trigger={<Button label="Open menu" />}
    sections={[
      [
        <MenuItem key="settings">
          <Settings className="size-4" />
          Settings
        </MenuItem>,
        <MenuItem key="docs">
          <FileText className="size-4" />
          Documentation
        </MenuItem>,
      ],
    ]}
  />
));

/** Each nested array is a section; foundry renders a separator between them. */
export const Sections = createPreview(() => (
  <Menu
    trigger={<Button label="Account" />}
    sections={[
      [
        <MenuItem key="settings">
          <Settings className="size-4" />
          Settings
        </MenuItem>,
        <MenuItem key="docs">
          <FileText className="size-4" />
          Documentation
        </MenuItem>,
      ],
      <MenuItem key="logout">
        <LogOut className="size-4" />
        Log out
      </MenuItem>,
    ]}
  />
));

export const ItemVariants = createPreview(() => (
  <Menu
    trigger={<Button label="Actions" variant="action" />}
    sections={[
      [
        <MenuItem key="default">Default item</MenuItem>,
        <MenuItem key="approve" variant="action">
          <Check className="size-4" />
          Approve
        </MenuItem>,
        <MenuItem key="delete" variant="destructiveAction">
          <Trash2 className="size-4" />
          Delete
        </MenuItem>,
      ],
      <MenuItem key="link" variant="navigationLink">
        View all
      </MenuItem>,
    ]}
  />
));

/** A nested `Menu` used as a trigger becomes a submenu, positioned to the right. */
export const Submenu = createPreview(() => (
  <Menu
    trigger={<Button label="Filter" />}
    sections={[
      [
        <Menu
          key="client"
          trigger={<MenuItem>Client</MenuItem>}
          sections={[
            [
              <MenuItem key="cli">Hive CLI</MenuItem>,
              <MenuItem key="gateway">hive-gateway</MenuItem>,
              <MenuItem key="yoga">graphql-yoga</MenuItem>,
            ],
          ]}
        />,
        <Menu
          key="target"
          trigger={<MenuItem>Target</MenuItem>}
          sections={[
            [
              <MenuItem key="prod">production</MenuItem>,
              <MenuItem key="staging">staging</MenuItem>,
            ],
          ]}
        />,
      ],
    ]}
  />
));

export const Compact = createPreview(() => (
  <Menu
    trigger={<Button label="Sort" />}
    minWidth="none"
    sections={[
      [<MenuItem key="asc">Ascending</MenuItem>, <MenuItem key="desc">Descending</MenuItem>],
    ]}
  />
));

export const Disabled = createPreview(() => (
  <Menu
    trigger={<Button label="Open menu" />}
    sections={[
      [
        <MenuItem key="enabled">Enabled item</MenuItem>,
        <MenuItem key="disabled" disabled>
          Disabled item
        </MenuItem>,
      ],
    ]}
  />
));
