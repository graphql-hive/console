import { useState } from 'react';
import { EllipsisIcon, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Menu } from '@/components/base/floating/menu/menu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const nav: NavPath = 'Migration/Menu';

/**
 * `ui/dropdown-menu` against `base/menu`, one preview per distinct shape rather than per call
 * site. The twelve call sites are variations on five structures, and the page-level ones need
 * urql, GraphiQL context or `ThemeSwitcher` to render at all, so this covers the shapes and
 * leaves the per-site checking to the app and to e2e.
 *
 * Both menus need a click before they show anything, so open each pair in turn. The real risks
 * of this migration are keyboard navigation, positioning inside table rows and the GraphiQL
 * panel, and the nine `data-cy` contracts, none of which this file can prove.
 *
 * Temporary scaffolding. Delete this file and the `Migration` nav group once ui/dropdown-menu is
 * gone.
 */

function Pair(props: { label: string; before: React.ReactNode; after: React.ReactNode }) {
  return (
    <div className="grid w-[42rem] grid-cols-2 gap-6">
      <div>
        <p className="text-neutral-10 mb-2 text-xs">ui/dropdown-menu: {props.label}</p>
        {props.before}
      </div>
      <div>
        <p className="text-neutral-10 mb-2 text-xs">base/menu: {props.label}</p>
        {props.after}
      </div>
    </div>
  );
}

/**
 * The row-action menu: trigger, a couple of items, a separator. Seven call sites are this shape,
 * including all three settings tables. Note the separator becomes a section boundary.
 */
export const ActionMenu = createPreview({
  label: 'Action menu (7 sites)',
  render: () => (
    <Pair
      label="trigger, items, separator"
      before={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 p-0">
              <EllipsisIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      after={
        <Menu
          align="end"
          width="sm"
          trigger={
            <Button variant="ghost" className="flex size-8 p-0">
              <EllipsisIcon className="size-4" />
            </Button>
          }
          sections={[
            [{ label: 'View details' }],
            [{ label: 'Delete', variant: 'destructiveAction' }],
          ]}
        />
      }
    />
  ),
});

/**
 * A labelled section with a destructive item, the schema-contracts and settings-table shape.
 * The `text-red-500` className becomes `variant="destructiveAction"`, which is a slightly
 * different red, worth comparing the two directly here.
 */
export const LabelAndDestructive = createPreview({
  label: 'Label + destructive item (4 sites)',
  render: () => (
    <Pair
      label="label, destructive item"
      before={
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto block">
            <EllipsisIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      after={
        <Menu
          trigger={
            <button type="button" className="ml-auto block">
              <EllipsisIcon className="size-4" />
            </button>
          }
          sections={[
            {
              label: 'Options',
              items: [
                { label: 'View Details' },
                { label: 'Delete', icon: Trash2, variant: 'destructiveAction' },
              ],
            },
          ]}
        />
      }
    />
  ),
});

/**
 * The theme switcher: a submenu whose content is a radio group. The old one needs an explicit
 * `DropdownMenuPortal`; `base/menu` always portals. The indicator moves from a leading circle to
 * a trailing check, so the rows keep their left edge aligned with icon-first items.
 */
export const SubmenuWithRadioGroup = createPreview({
  label: 'Submenu + radio group (theme-switcher)',
  render: () => {
    function Preview() {
      const [before, setBefore] = useState('system');
      const [after, setAfter] = useState('system');

      const themes = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
      ];

      return (
        <Pair
          label="submenu, radio group"
          before={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Account</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="mr-2 size-4" />
                    Theme
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={before} onValueChange={setBefore}>
                        {themes.map(({ value, label, icon: Icon }) => (
                          <DropdownMenuRadioItem key={value} value={value}>
                            <Icon className="mr-2 size-4" />
                            {label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          }
          after={
            <Menu
              trigger={<Button variant="ghost">Account</Button>}
              sections={[
                [
                  { label: 'Settings' },
                  {
                    kind: 'submenu',
                    label: 'Theme',
                    icon: Sun,
                    items: [
                      [
                        {
                          kind: 'radio',
                          value: after,
                          onValueChange: setAfter,
                          options: themes,
                        },
                      ],
                    ],
                  },
                ],
              ]}
            />
          }
        />
      );
    }

    return <Preview />;
  },
});

/**
 * `members/roles.tsx` wraps two items in a `TooltipTrigger` so a disabled item can explain why it
 * is disabled. That puts a non-item element between the popup and its items, so the thing to check
 * is that arrow-key navigation still reaches both items, and that the tooltip still fires on the
 * disabled one.
 */
export const ItemInTooltip = createPreview({
  label: 'Item wrapped in a Tooltip (members/roles)',
  render: () => (
    <Pair
      label="disabled item with a tooltip"
      before={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex size-8 p-0">
              <EllipsisIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger className="block w-full">
                  <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Only an admin can edit this role.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      after={
        <Menu
          align="end"
          width="sm"
          trigger={
            <Button variant="ghost" className="flex size-8 p-0">
              <EllipsisIcon className="size-4" />
            </Button>
          }
          sections={[
            [
              { label: 'Edit', disabled: true, tooltip: 'Only an admin can edit this role.' },
              { label: 'Duplicate' },
            ],
          ]}
        />
      }
    />
  ),
});

/**
 * The GraphiQL operation menu's trigger is invisible until its parent row is hovered, via
 * `[div:hover>&]:opacity-100`. It survives migration untouched because `trigger` is the caller's
 * own element, and the point of this preview is to confirm that. Hover the dashed row.
 */
export const HoverRevealTrigger = createPreview({
  label: 'Hover-reveal trigger (laboratory)',
  render: () => (
    <Pair
      label="trigger visible on row hover"
      before={
        <div className="border-neutral-5 flex items-center gap-2 rounded-md border border-dashed p-2">
          <span className="text-sm">GetProducts</span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="text-neutral-12 ml-auto opacity-0 transition-opacity [div:hover>&]:opacity-100">
              <EllipsisIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Copy link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      after={
        <div className="border-neutral-5 flex items-center gap-2 rounded-md border border-dashed p-2">
          <span className="text-sm">GetProducts</span>
          <Menu
            modal={false}
            align="end"
            trigger={
              <button
                type="button"
                className="text-neutral-12 ml-auto opacity-0 transition-opacity [div:hover>&]:opacity-100"
              >
                <EllipsisIcon className="size-4" />
              </button>
            }
            sections={[[{ label: 'Copy link' }]]}
          />
        </div>
      }
    />
  ),
});
