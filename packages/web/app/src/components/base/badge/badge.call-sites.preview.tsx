import { useState } from 'react';
import { X } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Callout } from '@/components/ui/callout';
import { Button } from '../button/button';
import { Tooltip } from '../floating/tooltip/tooltip';
import { Badge } from './badge';

export const nav: NavPath = 'Base/Primitives/Badge/Component Examples';

/**
 * Every pill in the app, by shape, transcribed from one of its sites with the others listed
 * under it.
 *
 * History: `ui/badge` (41 instances) and `v2/tag` (16) until round 5. Only the word pill used
 * the old component as designed; counts, status pills and mono keys each restyled it by
 * className, and Tag was half pills and half banners. Two shapes left the component: the
 * clickable contract tag chips are base Buttons, and the ten banner Tags are Callouts.
 */

const ENTRIES = [
  {
    source:
      'target-alerts-rules.tsx:159, members/roles.tsx:650, native-composition.tsx:230, access-tokens-table.tsx:121, graphiql-plugin.tsx ×4, target-apps.tsx ×2',
    origin: 'base',
    what: 'A word beside a name: Paused, default, experimental, JavaScript, JSON, a last-used time',
    coveredBy: 'Word pills',
  },
  {
    source: 'permission-detail-view.tsx ×3, selected-permission-overview.tsx ×3',
    origin: 'base',
    what: 'Allowed / Allowed with a warning / Denied in the permission tables',
    coveredBy: 'Word pills',
  },
  {
    source: 'target-trace.tsx ×6, traces/target-traces-filter.tsx:245',
    origin: 'base',
    what: 'Counts beside tab labels and filter rows, size=sm',
    coveredBy: 'Count pills',
  },
  {
    source: 'target-traces.tsx ×2, target-trace.tsx ×3',
    origin: 'base',
    what: 'Ok / Error, and an exception name in critical sm mono',
    coveredBy: 'Status pills',
  },
  {
    source: 'permission-detail-view.tsx:105 and the three create-*-access-token sheets (2 each)',
    origin: 'base',
    what: 'Permission and resource ids in mono; "No targets selected." in critical',
    coveredBy: 'Mono keys',
  },
  {
    source: 'target/settings/schema-contracts.tsx ×2 (table) and ×2 (removable, as base Button)',
    origin: 'base',
    what: 'Contract include / exclude tags',
    coveredBy: 'Tag chips',
  },
  {
    source: 'members/list.tsx ×4, members/groups.tsx ×2, manage-group-mapping-sheet.tsx:129',
    origin: 'base',
    what: 'Group names, "+N more", Disabled',
    coveredBy: 'Word pills',
  },
  {
    source: 'target-settings.tsx ×2, alerts/create-channel.tsx ×2, alerts/channels-table.tsx:73',
    origin: 'base',
    what: 'A usage threshold, a channel handle, a channel type',
    coveredBy: 'Tag pills',
  },
  {
    source:
      'cdn-access-tokens.tsx ×4, oidc-integration-configuration.tsx, oidc-registered-domain-sheet.tsx; registry-access-token.tsx and the three token sheets',
    origin: 'ui',
    what: 'Banners, now ui/callout: warnings, and the "keep this key" note',
    coveredBy: 'Tag banners',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/badge"
      summary={
        <>
          Seven variants over one shape. The semantic four are tinted on the theme tokens;{' '}
          <code>size=sm</code> is the count pill and <code>mono</code> the identifier pill. The
          banners are listed for completeness: they are Callouts, not badges.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Word pills
// ---------------------------------------------------------------------------

function PermissionRows(props: {
  render: (state: 'allowed' | 'warned' | 'denied') => React.ReactNode;
}) {
  return (
    <table className="text-sm">
      <tbody>
        {(
          [
            ['organization:describe', 'allowed'],
            ['organization:modifySlug', 'warned'],
            ['organization:delete', 'denied'],
          ] as const
        ).map(([key, state]) => (
          <tr key={key}>
            <td className="text-neutral-11 py-1 pr-6 font-mono text-xs">{key}</td>
            <td className="py-1 text-right">{props.render(state)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const WordPills = createPreview({
  label: 'Word pills',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-alerts-rules.tsx:159, members/roles.tsx:650, native-composition.tsx:230"
        origin="base"
        note="outline beside a name."
      >
        <div className="flex items-center gap-4 text-xs">
          <span className="text-neutral-12 inline-flex items-center gap-2 font-medium">
            High latency <Badge content="Paused" variants={{ variant: 'outline' }} />
          </span>
          <span className="text-neutral-12 inline-flex items-center gap-2">
            Viewer <Badge content="default" variants={{ variant: 'outline' }} />
          </span>
          <span className="text-neutral-12 inline-flex items-center gap-2">
            Native composition <Badge content="experimental" variants={{ variant: 'outline' }} />
          </span>
        </div>
      </CallSite>

      <CallSite
        source="access-tokens/permission-detail-view.tsx:71 and members/selected-permission-overview.tsx:182"
        origin="base"
        note="success, warning and critical in the permission tables. The detail view pins each pill in a 69px span so the column lines up; the warning one wraps a Tooltip."
      >
        <PermissionRows
          render={state =>
            state === 'allowed' ? (
              <span className="inline-flex w-[69px] justify-center">
                <Badge content="Allowed" variants={{ variant: 'success' }} />
              </span>
            ) : state === 'warned' ? (
              <Tooltip
                trigger={
                  <span className="inline-flex w-[69px] justify-center">
                    <Badge content="Allowed" variants={{ variant: 'warning' }} />
                  </span>
                }
                content="Granting this permission allows changing the organization URL."
              />
            ) : (
              <span className="inline-flex w-[69px] justify-center">
                <Badge content="Denied" variants={{ variant: 'critical' }} />
              </span>
            )
          }
        />
      </CallSite>

      <CallSite
        source="lib/preflight/graphiql-plugin.tsx:583 and pages/target-apps.tsx:187"
        origin="base"
        note="outline labels. The apps one formats its last-used time to a string and sits in a cursor-help span under a Tooltip."
      >
        <div className="flex items-center gap-6 text-sm">
          <span className="text-neutral-11 inline-flex items-center gap-2">
            Script
            <Badge content="JavaScript" variants={{ variant: 'outline' }} />
          </span>
          <Tooltip
            trigger={
              <span className="inline-flex cursor-help">
                <Badge content="3d ago" variants={{ variant: 'outline' }} />
              </span>
            }
            content="Sep 11, 2026 14:02:11"
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Count pills
// ---------------------------------------------------------------------------

export const CountPills = createPreview({
  label: 'Count pills',
  render: () => (
    <CallSite
      source="pages/target-trace.tsx:831 (×6) and traces/target-traces-filter.tsx:245"
      origin="base"
      note="size=sm beside a tab label; the filter count adds mono."
    >
      <div className="flex items-center gap-8 text-sm">
        <button type="button" className="border-b-2 border-[#2662d8] p-2">
          <div className="flex items-center gap-x-2">
            <div>Events</div>
            <Badge content="3" variants={{ variant: 'secondary', size: 'sm' }} />
          </div>
        </button>
        <span className="inline-flex w-48 items-center justify-between">
          ok
          <Badge content="1,204" variants={{ variant: 'secondary', size: 'sm', mono: true }} />
        </span>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

export const StatusPills = createPreview({
  label: 'Status pills',
  render: () => (
    <CallSite
      source="pages/target-traces.tsx:496, :951 and pages/target-trace.tsx:519, :1103, :1758"
      origin="base"
      note="Ordinary success and critical pills for Ok / Error; the exception name is critical, sm, mono."
    >
      <div className="flex items-center gap-4">
        <Badge content="Ok" variants={{ variant: 'success' }} />
        <Badge content="Error" variants={{ variant: 'critical' }} />
        <Badge content="GraphQLError" variants={{ variant: 'critical', size: 'sm', mono: true }} />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Mono keys
// ---------------------------------------------------------------------------

export const MonoKeys = createPreview({
  label: 'Mono keys',
  render: () => (
    <CallSite
      source="access-tokens/permission-detail-view.tsx:105 and create-access-token-sheet-content.tsx:373, :383"
      origin="base"
      note="outline and mono in a list of granted resources; the empty case is critical and mono."
    >
      <ul className="flex flex-wrap gap-1">
        {['production', 'staging'].map(id => (
          <li key={id}>
            <Badge content={id} variants={{ variant: 'outline', mono: true }} />
          </li>
        ))}
        <li>
          <Badge content="No services selected." variants={{ variant: 'critical', mono: true }} />
        </li>
      </ul>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Tag chips
// ---------------------------------------------------------------------------

function RemovableTags() {
  const [tags, setTags] = useState(['public', 'internal', 'beta']);
  return (
    <div className="flex flex-1 flex-wrap gap-1 pl-3">
      {tags.map(tag => (
        <Button
          key={tag}
          type="button"
          size="compact"
          aria-label={`Remove ${tag}`}
          onClick={() => setTags(prev => prev.filter(t => t !== tag))}
        >
          {tag}
          <X className="size-3" />
        </Button>
      ))}
    </div>
  );
}

export const TagChips = createPreview({
  label: 'Tag chips',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="target/settings/schema-contracts.tsx:261"
        origin="base"
        note="The contracts table: default pills with a gap on the wrapper."
      >
        <div className="flex flex-wrap gap-1">
          {['public', 'internal'].map(tag => (
            <Badge key={tag} content={tag} />
          ))}
        </div>
      </CallSite>

      <CallSite
        source="target/settings/schema-contracts.tsx:568"
        origin="base"
        note="The contract form: a compact base Button per tag, type=button so it cannot submit the form, click removes. The whole tag picker becomes a Combobox in round 9."
      >
        <RemovableTags />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Tag pills
// ---------------------------------------------------------------------------

export const TagPills = createPreview({
  label: 'Tag pills',
  render: () => (
    <CallSite
      source="pages/target-settings.tsx:1048, alerts/create-channel.tsx:234, alerts/channels-table.tsx:73"
      origin="base"
      note="Formerly v2/tag: warning for a usage threshold in a sentence, secondary mono for the channel handles, and the same neutral pill for every channel type, since Slack versus Discord is not a state."
    >
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <Badge content="10%" variants={{ variant: 'warning' }} /> - the field was requested by
          more than 10% of all GraphQL operations in recent 30 days
        </div>
        <p className="text-neutral-10">
          Use <Badge content="#channel" variants={{ variant: 'secondary', mono: true }} /> or{' '}
          <Badge content="@username" variants={{ variant: 'secondary', mono: true }} /> form.
        </p>
        <div className="flex gap-2">
          {['SLACK', 'WEBHOOK', 'MSTEAMS_WEBHOOK', 'DISCORD'].map(type => (
            <Badge key={type} content={type} variants={{ variant: 'secondary' }} />
          ))}
        </div>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Tag banners
// ---------------------------------------------------------------------------

export const TagBanners = createPreview({
  label: 'Tag banners',
  render: () => (
    <CallSite
      source="target/settings/cdn-access-tokens.tsx:156 and registry-access-token.tsx:173"
      origin="ui"
      note="Formerly v2/tag with an icon and a paragraph inside; now ui/callout. It has no success type, so the key note sits on info until round 5's banner work decides."
    >
      <div className="flex w-[36rem] flex-col gap-3">
        <Callout type="warning">Failed to create the CDN access token.</Callout>
        <Callout type="info">
          This is your unique API key and it is non-recoverable. If you lose this key, you will need
          to create a new one.
        </Callout>
      </div>
    </CallSite>
  ),
});
