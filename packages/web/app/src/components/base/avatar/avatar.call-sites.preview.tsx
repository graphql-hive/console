import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Avatar } from './avatar';

export const nav: NavPath = 'Base/Primitives/Avatar/Component Examples';

/**
 * Every Avatar in the app, transcribed with its real markup so a change to the component can be
 * judged against what ships.
 *
 * History: all four were `v2/avatar` (Radix) until round 4. Every site passed `shape="circle"` and
 * none passed `src`, so what shipped was a 20px accent dot with a person icon; base draws initials
 * from `alt` instead and is always a circle.
 */

const ENTRIES = [
  {
    source: 'components/target/alerts/alert-activity-table.tsx:124',
    origin: 'base',
    what: 'Created by cell of the alert activity table, xs beside the name',
    coveredBy: 'Beside a name',
  },
  {
    source: 'pages/target-alerts-rules.tsx:257',
    origin: 'base',
    what: 'Created by cell of the alert rules table, xs beside the name',
    coveredBy: 'Beside a name',
  },
  {
    source: 'components/target/alerts/alert-conditions-panel.tsx:158',
    origin: 'base',
    what: "Created by in a rule's conditions sheet, xs beside the name",
    coveredBy: 'Beside a name',
  },
  {
    source: 'components/ui/user-menu.tsx:119',
    origin: 'base',
    what: 'The header user-menu trigger, outlined, with the viewer’s initials',
    coveredBy: 'User menu trigger',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/avatar"
      summary={
        <>
          Four sites, two shapes: an <code>xs</code> avatar beside a creator&apos;s name in the
          alerts tables and sheet, and the <code>md</code> outlined one that opens the user menu. No
          site passes <code>src</code>; the schema carries no avatar URL today.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

export const BesideAName = createPreview({
  label: 'Beside a name',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/alerts/alert-activity-table.tsx:124 and pages/target-alerts-rules.tsx:257"
        origin="base"
        note="The Created by column of the alert activity and rules tables."
      >
        <span className="text-neutral-12 inline-flex items-center gap-2 text-xs">
          <Avatar size="xs" alt="User" />
          User
        </span>
      </CallSite>

      <CallSite
        source="components/target/alerts/alert-conditions-panel.tsx:158"
        origin="base"
        note="The same cell inside a rule's conditions sheet, at the sheet's text size."
      >
        <span className="inline-flex items-center gap-2">
          <Avatar size="xs" alt="User" />
          <span>User</span>
        </span>
      </CallSite>
    </div>
  ),
});

export const UserMenuTrigger = createPreview({
  label: 'User menu trigger',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/user-menu.tsx:119"
        origin="base"
        note="The header avatar that opens the user menu: outlined, with the viewer's initials."
      >
        <div className="cursor-pointer" data-cy="user-menu-trigger">
          <Avatar variant="outlined" alt="User" />
        </div>
      </CallSite>

      <CallSite
        source="components/ui/user-menu.tsx:119, before the viewer has loaded"
        origin="base"
        note="No name yet, so the person icon, and the trigger pulses until the organization query resolves."
      >
        <div className="animate-pulse cursor-pointer">
          <Avatar variant="outlined" />
        </div>
      </CallSite>
    </div>
  ),
});
