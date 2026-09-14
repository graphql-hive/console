import { useState } from 'react';
import { AlertTriangleIcon, X } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, CallSiteGroup, InventoryList } from '@/components/inventory/shared';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { Tag } from '@/components/v2/tag';
import { cn } from '@/lib/utils';
import { Button } from '../button/button';
import { Tooltip } from '../floating/tooltip/tooltip';
import { Badge } from './badge';

export const nav: NavPath = 'Base/Primitives/Badge/Component Examples';

/**
 * Every pill in the app, by shape, old beside new. `ui/badge` has 41 instances in 22 files and
 * `v2/tag` 16 in 10; base Badge already had 6. Each shape below is transcribed from one of its
 * sites and lists the others it stands for.
 *
 * Two shapes leave the component: the clickable contract tag chips are buttons, and the
 * warning-banner Tags are callouts.
 */

const ENTRIES = [
  {
    source:
      'target-alerts-rules.tsx:158, members/roles.tsx:650, project/settings/native-composition.tsx:230, access-tokens-table.tsx:121',
    origin: 'ui',
    what: 'Plain word pills: Paused, default, experimental, and an outline label',
    coveredBy: 'Word pills',
  },
  {
    source:
      'permission-detail-view.tsx:71, :77, :82; selected-permission-overview.tsx:182, :188, :191',
    origin: 'ui',
    what: 'Allowed / Allowed with a warning / Denied in the permission tables, two pinned to w-[69px]',
    coveredBy: 'Word pills',
  },
  {
    source:
      'pages/target-trace.tsx:831, :847, :863, :1531, :1547, :1563; traces/target-traces-filter.tsx:245; pages/target-apps.tsx:161',
    origin: 'ui',
    what: 'Counts beside tab labels and filter rows, every one restyled by className',
    coveredBy: 'Count pills',
  },
  {
    source: 'pages/target-traces.tsx:496, :951; pages/target-trace.tsx:519, :1103, :1758',
    origin: 'ui',
    what: 'Ok / Error in a 30% tint, uppercase; an exception name in solid red',
    coveredBy: 'Status pills',
  },
  {
    source: 'permission-detail-view.tsx:105 and the three create-*-access-token sheets (2 each)',
    origin: 'ui',
    what: 'Permission and resource ids in mono; "No targets selected." in red',
    coveredBy: 'Mono keys',
  },
  {
    source:
      'target/settings/schema-contracts.tsx:261, :268 (table) and :568, :667 (clickable, with an ×)',
    origin: 'ui',
    what: 'Contract include / exclude tags; the clickable ones become buttons',
    coveredBy: 'Tag chips',
  },
  {
    source:
      'lib/preflight/graphiql-plugin.tsx:583, :618, :742, :814; pages/target-apps.tsx:187, :196',
    origin: 'ui',
    what: 'Outline labels: JavaScript, JSON, and a last-used time with a tooltip',
    coveredBy: 'Word pills',
  },
  {
    source:
      'members/list.tsx:85, :91, :101, :355; members/groups.tsx:285, :444; manage-group-mapping-sheet.tsx:129',
    origin: 'base',
    what: 'Already on base: group names, "+N more", Disabled',
    coveredBy: 'Word pills',
  },
  {
    source:
      'pages/target-settings.tsx:1048, :1054; alerts/create-channel.tsx:234; laboratory/connect-lab-modal.tsx:79; alerts/channels-table.tsx:73',
    origin: 'v2',
    what: 'Tag as a pill: a threshold, a channel handle, a channel type',
    coveredBy: 'Tag pills',
  },
  {
    source:
      'target/settings/cdn-access-tokens.tsx ×4, oidc-integration-configuration.tsx:1016, oidc-registered-domain-sheet.tsx:359; registry-access-token.tsx:173 and the three token sheets',
    origin: 'v2',
    what: 'Tag as a banner: a warning or a "keep this key" note with a paragraph inside',
    coveredBy: 'Tag banners',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/badge, v2/tag and base/badge"
      summary={
        <>
          <strong>
            Five shapes of Badge, and only the word pill uses the component as designed.
          </strong>{' '}
          Counts, status pills and mono keys each restyle size, radius, padding or type by
          className. <code>destructive</code> and <code>informal</code> have no sites.
          <br />
          <br />
          <strong>Tag is two things.</strong> Six of its sixteen sites are pills; ten are banners
          with an icon and a paragraph, which is Callout&apos;s job.
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
            <td className="py-1">{props.render(state)}</td>
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
      <CallSiteGroup label="A word beside a name">
        <CallSite
          source="pages/target-alerts-rules.tsx:158, members/roles.tsx:650, native-composition.tsx:230"
          origin="ui"
          note="outline, no className: the one shape ui/badge handles as designed."
        >
          <div className="flex items-center gap-4 text-xs">
            <span className="text-neutral-12 inline-flex items-center gap-2 font-medium">
              High latency <UiBadge variant="outline">Paused</UiBadge>
            </span>
            <span className="text-neutral-12 inline-flex items-center gap-2">
              Viewer <UiBadge variant="outline">default</UiBadge>
            </span>
            <span className="text-neutral-12 inline-flex items-center gap-2">
              Native composition <UiBadge variant="outline">experimental</UiBadge>
            </span>
          </div>
        </CallSite>
        <CallSite
          source="base/badge"
          origin="base"
          note="Same three, rounded-md rather than the old pill radius."
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
      </CallSiteGroup>

      <CallSiteGroup label="Permission tables">
        <CallSite
          source="access-tokens/permission-detail-view.tsx:71 and members/selected-permission-overview.tsx:182"
          origin="ui"
          note="success, warning and failure as solid fills. Two of the three pin w-[69px] justify-center so the column lines up; the warning one wraps a Tooltip."
        >
          <PermissionRows
            render={state =>
              state === 'allowed' ? (
                <UiBadge className="w-[69px] justify-center" variant="success">
                  Allowed
                </UiBadge>
              ) : state === 'warned' ? (
                <Tooltip
                  trigger={
                    <span className="inline-flex">
                      <UiBadge variant="warning">Allowed</UiBadge>
                    </span>
                  }
                  content="Granting this permission allows changing the organization URL."
                />
              ) : (
                <UiBadge className="w-[69px] justify-center" variant="failure">
                  Denied
                </UiBadge>
              )
            }
          />
        </CallSite>
        <CallSite
          source="base/badge"
          origin="base"
          note="success, warning and critical, tinted. The column width moves to the cell, since the pill takes no className."
        >
          <PermissionRows
            render={state =>
              state === 'allowed' ? (
                <Badge content="Allowed" variants={{ variant: 'success' }} />
              ) : state === 'warned' ? (
                <Tooltip
                  trigger={
                    <span className="inline-flex">
                      <Badge content="Allowed" variants={{ variant: 'warning' }} />
                    </span>
                  }
                  content="Granting this permission allows changing the organization URL."
                />
              ) : (
                <Badge content="Denied" variants={{ variant: 'critical' }} />
              )
            }
          />
        </CallSite>
      </CallSiteGroup>

      <CallSiteGroup label="Outline labels">
        <CallSite
          source="lib/preflight/graphiql-plugin.tsx:583 and pages/target-apps.tsx:187"
          origin="ui"
          note="outline with text-xs, which is already the base size. The apps one wraps a TimeAgo and carries cursor-help under a Tooltip."
        >
          <div className="flex items-center gap-6 text-sm">
            <span className="text-neutral-11 inline-flex items-center gap-2">
              Script
              <UiBadge className="text-xs" variant="outline">
                JavaScript
              </UiBadge>
            </span>
            <Tooltip
              trigger={
                <UiBadge className="cursor-help text-xs" variant="outline">
                  3 days ago
                </UiBadge>
              }
              content="Sep 11, 2026 14:02:11"
            />
          </div>
        </CallSite>
        <CallSite
          source="base/badge"
          origin="base"
          note="The apps site formats the time to a string first, since content stays a string."
        >
          <div className="flex items-center gap-6 text-sm">
            <span className="text-neutral-11 inline-flex items-center gap-2">
              Script
              <Badge content="JavaScript" variants={{ variant: 'outline' }} />
            </span>
            <Tooltip
              trigger={
                <span className="inline-flex cursor-help">
                  <Badge content="3 days ago" variants={{ variant: 'outline' }} />
                </span>
              }
              content="Sep 11, 2026 14:02:11"
            />
          </div>
        </CallSite>
      </CallSiteGroup>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Count pills
// ---------------------------------------------------------------------------

export const CountPills = createPreview({
  label: 'Count pills',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-trace.tsx:831 (×6) and traces/target-traces-filter.tsx:245"
        origin="ui"
        note="The most-repeated className in the app: text-2xs rounded-md px-2 py-0.5 font-thin, six times on the trace page. The filter count is a second recipe: rounded-sm px-1 font-mono font-normal."
      >
        <div className="flex items-center gap-8 text-sm">
          <button type="button" className="border-b-2 border-[#2662d8] p-2">
            <div className="flex items-center gap-x-2">
              <div>Events</div>
              <UiBadge variant="secondary" className="text-2xs rounded-md px-2 py-0.5 font-thin">
                3
              </UiBadge>
            </div>
          </button>
          <span className="inline-flex w-48 items-center justify-between">
            ok
            <UiBadge variant="secondary" className="rounded-sm px-1 font-mono font-normal">
              1,204
            </UiBadge>
          </span>
        </div>
      </CallSite>
      <CallSite source="base/badge" origin="base" note="size=sm; the filter count adds mono.">
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
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

export const StatusPills = createPreview({
  label: 'Status pills',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-traces.tsx:496, :951 and pages/target-trace.tsx:519, :1103, :1758"
        origin="ui"
        note="outline with the border removed and a 30% green or red tint painted on, uppercase, rounded-sm. The exception name is solid red-900 with a red-700 border at text-2xs."
      >
        <div className="flex items-center gap-4">
          {[true, false].map(status => (
            <UiBadge
              key={String(status)}
              variant="outline"
              className={cn(
                'rounded-sm border-0 px-1 text-xs font-medium uppercase',
                status ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400',
              )}
            >
              {status ? 'Ok' : 'Error'}
            </UiBadge>
          ))}
          <UiBadge variant="outline" className="text-2xs border-red-700 bg-red-900 text-red-300">
            GraphQLError
          </UiBadge>
        </div>
      </CallSite>
      <CallSite
        source="base/badge"
        origin="base"
        note="Ordinary success and critical pills, no uppercase. The exception name is critical, sm, mono."
      >
        <div className="flex items-center gap-4">
          <Badge content="Ok" variants={{ variant: 'success' }} />
          <Badge content="Error" variants={{ variant: 'critical' }} />
          <Badge
            content="GraphQLError"
            variants={{ variant: 'critical', size: 'sm', mono: true }}
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Mono keys
// ---------------------------------------------------------------------------

export const MonoKeys = createPreview({
  label: 'Mono keys',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="access-tokens/permission-detail-view.tsx:105 and create-access-token-sheet-content.tsx:373, :383"
        origin="ui"
        note="outline with px-3 py-1 font-mono text-xs, in a list of granted resources; the empty case is the same recipe in text-red-500."
      >
        <ul className="flex flex-wrap gap-1">
          {['production', 'staging'].map(id => (
            <li key={id}>
              <UiBadge className="text-neutral-11 px-3 py-1 font-mono text-xs" variant="outline">
                {id}
              </UiBadge>
            </li>
          ))}
          <li>
            <UiBadge className="px-3 py-1 font-mono text-xs text-red-500" variant="outline">
              No services selected.
            </UiBadge>
          </li>
        </ul>
      </CallSite>
      <CallSite
        source="base/badge"
        origin="base"
        note="outline and mono; the empty case is critical and mono."
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
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Tag chips
// ---------------------------------------------------------------------------

function RemovableTags(props: { render: (tag: string, remove: () => void) => React.ReactNode }) {
  const [tags, setTags] = useState(['public', 'internal', 'beta']);
  return (
    <div className="flex-1 pl-3">
      {tags.map(tag => props.render(tag, () => setTags(prev => prev.filter(t => t !== tag))))}
    </div>
  );
}

export const TagChips = createPreview({
  label: 'Tag chips',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSiteGroup label="In the contracts table">
        <CallSite
          source="target/settings/schema-contracts.tsx:261"
          origin="ui"
          note="default variant with mr-1 to space the chips."
        >
          <div>
            {['public', 'internal'].map(tag => (
              <UiBadge className="mr-1" key={tag}>
                {tag}
              </UiBadge>
            ))}
          </div>
        </CallSite>
        <CallSite
          source="base/badge"
          origin="base"
          note="A gap on the wrapper instead of a margin on each chip."
        >
          <div className="flex flex-wrap gap-1">
            {['public', 'internal'].map(tag => (
              <Badge key={tag} content={tag} />
            ))}
          </div>
        </CallSite>
      </CallSiteGroup>

      <CallSiteGroup label="In the contract form">
        <CallSite
          source="target/settings/schema-contracts.tsx:568"
          origin="ui"
          note="A Badge with an onClick and an × inside: click removes the tag. A button wearing a badge."
        >
          <RemovableTags
            render={(tag, remove) => (
              <UiBadge key={tag} className="mr-1 cursor-pointer" onClick={remove}>
                {tag}
                <X size={16} className="pl-1" />
              </UiBadge>
            )}
          />
        </CallSite>
        <CallSite
          source="base/button"
          origin="base"
          note="A compact Button, so it is focusable and announced as a button. The whole tag picker becomes a Combobox in round 9."
        >
          <RemovableTags
            render={(tag, remove) => (
              <span key={tag} className="mr-1 inline-flex">
                <Button size="compact" onClick={remove} aria-label={`Remove ${tag}`}>
                  {tag}
                  <X className="size-3" />
                </Button>
              </span>
            )}
          />
        </CallSite>
      </CallSiteGroup>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Tag pills
// ---------------------------------------------------------------------------

export const TagPills = createPreview({
  label: 'Tag pills',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-settings.tsx:1048, alerts/create-channel.tsx:234, alerts/channels-table.tsx:73"
        origin="v2"
        note="Tag as a pill: yellow with py-0 for a threshold in a sentence, gray for a channel handle, and a colour per channel type (Slack green, Webhook yellow, MS Teams orange, Discord blue)."
      >
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <Tag color="yellow" className="py-0">
              10%
            </Tag>{' '}
            - the field was requested by more than 10% of all GraphQL operations in recent 30 days
          </div>
          <p className="text-neutral-10">
            Use <Tag>#channel</Tag> or <Tag>@username</Tag> form.
          </p>
          <div className="flex gap-2">
            <Tag color="green" className="whitespace-nowrap">
              SLACK
            </Tag>
            <Tag color="yellow" className="whitespace-nowrap">
              WEBHOOK
            </Tag>
            <Tag color="orange" className="whitespace-nowrap">
              MSTEAMS_WEBHOOK
            </Tag>
            <Tag color="blue" className="whitespace-nowrap">
              DISCORD
            </Tag>
          </div>
        </div>
      </CallSite>
      <CallSite
        source="base/badge"
        origin="base"
        note="warning for the threshold, secondary mono for the handles. Channel types have no semantic meaning, so they all take the same neutral pill."
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
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Tag banners
// ---------------------------------------------------------------------------

export const TagBanners = createPreview({
  label: 'Tag banners',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="target/settings/cdn-access-tokens.tsx:155 (and 5 more yellow), registry-access-token.tsx:173 (and 3 more green)"
        origin="v2"
        note="Not pills: px-4 py-2.5 with an icon and a paragraph. The green one is the 'keep this key' note under a newly created token."
      >
        <div className="flex w-[36rem] flex-col gap-3">
          <Tag color="yellow" className="px-4 py-2.5">
            <AlertTriangleIcon className="size-5" />
            Failed to create the CDN access token.
          </Tag>
          <Tag color="green">
            This is your unique API key and it is non-recoverable. If you lose this key, you will
            need to create a new one.
          </Tag>
        </div>
      </CallSite>
      <CallSite
        source="ui/callout"
        origin="ui"
        note="Callout is the banner component the app already has. It has no success type, so the key note lands on info until round 5's banner work decides."
      >
        <div className="flex w-[36rem] flex-col gap-3">
          <Callout type="warning">Failed to create the CDN access token.</Callout>
          <Callout type="info">
            This is your unique API key and it is non-recoverable. If you lose this key, you will
            need to create a new one.
          </Callout>
        </div>
      </CallSite>
    </div>
  ),
});
