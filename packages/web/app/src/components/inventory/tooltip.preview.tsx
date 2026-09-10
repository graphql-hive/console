import { CopyIcon, UsersIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Tooltip';

/**
 * `ui/tooltip` and `v2/tooltip` as they ship today. 104 roots across 55 files, so this transcribes
 * one representative per distinct shape rather than every instance; each preview lists the call
 * sites it stands for.
 *
 * The pages themselves cannot be imported: they run GraphQL queries and several sit behind
 * permission flags. Each preview reproduces the call site's trigger, content and props.
 *
 * Worth reading the Inventory screen first. The spread here is much wider than Select's or
 * Popover's, and most of it is drift rather than intent.
 */

const ENTRIES = [
  {
    source: '34 call sites',
    origin: 'ui',
    what: 'TooltipTrigger asChild, wrapping a real element',
    coveredBy: 'Default',
  },
  {
    source: '66 call sites',
    origin: 'ui',
    what: 'TooltipTrigger with no asChild, so Radix renders a bare <button>',
    coveredBy: 'Bare trigger',
  },
  {
    source: '12 call sites',
    origin: 'ui',
    what: 'className="text-xs", overriding the component default of text-sm',
    coveredBy: 'Small text',
  },
  {
    source: '6 call sites',
    origin: 'ui',
    what: 'className="max-w-md p-4 font-normal", a paragraph rather than a label',
    coveredBy: 'Roomy paragraph',
  },
  {
    source: 'explorer/common.tsx:275, native-composition-diff.tsx:240',
    origin: 'ui',
    what: 'max-w-screen-md and max-w-[90vw], the widest in the app',
    coveredBy: 'Very wide',
  },
  {
    source: 'target-traces.tsx ×3, target-trace.tsx ×2',
    origin: 'ui',
    what: 'rounded-lg p-2 shadow-lg sm:min-w-[150px], a different look entirely',
    coveredBy: 'Traces style',
  },
  {
    source: '7 call sites',
    origin: 'ui',
    what: 'disableHoverableContent, for dense rows where the popup would cover neighbours',
    coveredBy: 'Dense rows',
  },
  {
    source: 'members/common.tsx:99, target-checks-single.tsx:981, permission-selector.tsx:154',
    origin: 'ui',
    what: 'Trigger wraps a disabled control, which never fires hover',
    coveredBy: 'Disabled trigger',
  },
  {
    source: '45 call sites',
    origin: 'ui',
    what: 'delayDuration set to 0, 100, 200 or 300 with no pattern',
    coveredBy: 'Delay values',
  },
  {
    source: 'auth-sign-up.tsx:220, organization-support.tsx:314',
    origin: 'ui',
    what: 'TooltipProvider wrapping a subtree containing no tooltip of its own',
    coveredBy: 'Stray providers',
  },
  {
    source: 'ui/sidebar.tsx:518',
    origin: 'ui',
    what: 'tooltip prop leaking the Radix content type; no call site passes it',
    coveredBy: 'Stray providers',
  },
  {
    source: 'v2/tooltip.tsx, 7 call sites',
    origin: 'v2',
    what: 'Always-on arrow, p-4, bg-neutral-5, plus ModalTooltipContext for portalling',
    coveredBy: 'v2 tooltip',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/tooltip and v2/tooltip"
      summary={
        <>
          <strong>104 roots across 55 files</strong>, grouped here by shape. Two thirds of triggers
          omit <code>asChild</code>, so Radix wraps them in a bare <code>&lt;button&gt;</code> —
          that is the single biggest thing the base API has to absorb. Four different{' '}
          <code>delayDuration</code> values are in use with no discernible pattern, and{' '}
          <code>TooltipContent</code> carries 24 distinct <code>className</code> values. Four call
          sites do not import through <code>ui/tooltip</code> at all: two reach for{' '}
          <code>@radix-ui/react-tooltip</code> directly, and four more import it relatively as{' '}
          <code>./tooltip</code>.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The two trigger shapes. This is the split that matters most for the base API.
// ---------------------------------------------------------------------------

export const Default = createPreview({
  label: 'Default',
  render: () => (
    <CallSite
      source="components/organization/Permissions.tsx:109"
      origin="ui"
      note="34 call sites use asChild, so the trigger is the element you passed. This is the shape base/floating/tooltip's `trigger` prop already expects. Here the trigger is a whole disabled Select assigned to a local `inner`, wrapped only when the viewer lacks permission."
    >
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div className="flex flex-row items-center gap-2">
              <Button variant="outline" disabled>
                Read-only
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>Your user account does not have these permissions.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CallSite>
  ),
});

export const BareTrigger = createPreview({
  label: 'Bare trigger',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="66 call sites, e.g. target-history-schema-version.tsx:324"
        origin="ui"
        note="No asChild, so Radix renders its own <button> around the children. The base component takes an element for `trigger`, so all 66 need either a hand-written wrapper or a `trigger` that accepts a string."
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Last used</TooltipTrigger>
            <TooltipContent>3 days ago</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
      <CallSite
        source="components/organization/members/list.tsx:70"
        origin="ui"
        note="Bare trigger wrapping a layout div, so Radix's implicit button sits between the trigger and that div. The empty state of the Groups cell."
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex w-fit items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                <span className="text-xs">Groups: none</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Groups can be assigned via the SCIM provider.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>

      <CallSite
        source="components/organization/members/list.tsx:97"
        origin="ui"
        note="The populated state of the same cell. Bare trigger around a Badge, and the content is a list of Badges rather than text. Its TooltipProvider is hoisted to the top of MemberGroups and shared with the empty-state tooltip above."
      >
        <TooltipProvider>
          <div className="flex w-fit items-center gap-2">
            <div className="flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Groups:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge content="platform" />
              <Badge content="sre" />
              <Tooltip>
                <TooltipTrigger>
                  <Badge variants={{ variant: 'outline' }} content="+2 more" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <ul className="space-y-1 text-left">
                    <li>
                      <Badge content="security" />
                    </li>
                    <li>
                      <Badge content="data-eng" />
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Content sizing. Base is `text-sm` with no width cap; every call site below disagrees.
// ---------------------------------------------------------------------------

export const SmallText = createPreview({
  label: 'Small text',
  render: () => (
    <CallSite
      source="components/ui/copy-icon-button.tsx:15"
      origin="ui"
      note='12 call sites set className="text-xs" against a text-sm default, the most-repeated override in the app, which suggests the default is simply wrong. This one also stacks delayDuration={0} and disableHoverableContent, so it appears instantly and closes the moment you leave.'
    >
      <TooltipProvider>
        <Tooltip delayDuration={0} disableHoverableContent>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="ml-auto">
              <CopyIcon size={10} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Copy access token</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CallSite>
  ),
});

export const RoomyParagraph = createPreview({
  label: 'Roomy paragraph',
  render: () => (
    <CallSite
      source="components/target/settings/schema-contracts.tsx:217"
      origin="ui"
      note='6 call sites use className="max-w-md p-4 font-normal" - genuinely a paragraph rather than a label, so they need both a width cap and a roomier inset. Bare trigger wrapping a ghost icon button.'
    >
      <TooltipProvider>
        <div className="flex items-center">
          <span className="text-yellow-500">Inactive</span>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon-sm" className="ml-2 text-yellow-500">
                <InfoCircledIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-4 font-normal">
              <p>
                This Contract is no longer active and no more contract versions or artifacts will be
                published for it.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </CallSite>
  ),
});

export const VeryWide = createPreview({
  label: 'Very wide',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/explorer/common.tsx:275"
        origin="ui"
        note='className="min-w-6 max-w-screen-md" — holds a schema coordinate that must not wrap.'
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Coordinate</Button>
            </TooltipTrigger>
            <TooltipContent className="min-w-6 max-w-screen-md">
              Query.productsConnection.edges.node.reviews.author.displayName
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
      <CallSite
        source="pages/native-composition-diff.tsx:240"
        origin="ui"
        note='className="flex max-w-[90vw] items-center text-pretty" — viewport-relative, so it behaves differently on every screen.'
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Composition error</Button>
            </TooltipTrigger>
            <TooltipContent className="flex max-w-[90vw] items-center text-pretty">
              Field &quot;User.email&quot; is defined in subgraph &quot;accounts&quot; but is not
              resolvable from subgraph &quot;reviews&quot;.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The traces pages run a visibly different tooltip: rounded-lg instead of rounded-md, shadow-lg
// instead of shadow-md, p-2 instead of px-3 py-1.5, plus a responsive min-width. Five call sites.
// ---------------------------------------------------------------------------

export const TracesStyle = createPreview({
  label: 'Traces style',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-traces.tsx:429, :523, :960 and pages/target-trace.tsx:536, :1714"
        origin="ui"
        note="A second tooltip look that nobody named. Compare it against Default above: rounded-lg, shadow-lg, p-2, sm:min-w-[150px]. Either it becomes a variant or these five call sites come back to the standard."
      >
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="px-4 font-mono text-xs uppercase">Sep 10 14:22:07</div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="text-neutral-11 cursor-auto overflow-hidden rounded-lg p-2 text-xs shadow-lg sm:min-w-[150px]"
            >
              2026-09-10T14:22:07.481Z
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
      <CallSite
        source="pages/target-traces.tsx:429"
        origin="ui"
        note="Same style, and `cursor-auto` appears on one of the five but not the others."
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] truncate font-mono text-xs">getProductsWithReviews</div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="text-neutral-11 overflow-hidden rounded-lg p-2 text-xs shadow-lg sm:min-w-[150px]"
            >
              getProductsWithReviews
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Behaviour rather than appearance.
// ---------------------------------------------------------------------------

export const DenseRows = createPreview({
  label: 'Dense rows',
  render: () => (
    <CallSite
      source="7 call sites, e.g. target-trace.tsx:536, oidc-integration-configuration.tsx:519"
      origin="ui"
      note="disableHoverableContent, so the popup closes as soon as the pointer leaves the trigger rather than letting it travel into the popup. Used where a hoverable popup would cover the row beneath it."
    >
      <TooltipProvider>
        <div className="flex flex-col gap-1">
          {['products', 'reviews', 'inventory'].map(subgraph => (
            <Tooltip key={subgraph} disableHoverableContent delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="border-neutral-5 hover:bg-neutral-3 cursor-default rounded-sm border px-3 py-1 text-center font-mono text-xs">
                  {subgraph}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Contributed 12 fields
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </CallSite>
  ),
});

export const DisabledTrigger = createPreview({
  label: 'Disabled trigger',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/members/common.tsx:99"
        origin="ui"
        note="The trigger wraps a disabled CommandItem. A disabled control carries pointer-events-none, so it never fires hover and the tooltip explaining WHY it is disabled never appears. This is a live bug, not just a migration hazard."
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full text-left">
              <span className="text-neutral-10 pointer-events-none block px-4 py-2 text-sm">
                Owner (disabled — never shows its tooltip)
              </span>
            </TooltipTrigger>
            <TooltipContent>This role cannot be assigned.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
      <CallSite
        source="The working shape"
        origin="ui"
        note="A plain wrapper around the disabled control does fire hover. This is what base/floating/tooltip's docblock already prescribes, and what all 6 disabled call sites need."
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block">
                <Button variant="outline" disabled>
                  Owner (wrapped — works)
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>This role cannot be assigned.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CallSite>
    </div>
  ),
});

export const DelayValues = createPreview({
  label: 'Delay values',
  render: () => (
    <CallSite
      source="45 call sites"
      origin="ui"
      note="Four values in use: 0 (19 sites), 100 (17), 200 (8), 300 (1). Hover each in turn. base/floating/tooltip defaults to 200, so adopting it silently changes 37 of these."
    >
      <div className="flex items-center gap-3">
        {[0, 100, 200, 300].map(delay => (
          <TooltipProvider key={delay} delayDuration={delay}>
            <Tooltip delayDuration={delay}>
              <TooltipTrigger asChild>
                <Button variant="outline">{delay}ms</Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Waited {delay}ms</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </CallSite>
  ),
});

export const StrayProviders = createPreview({
  label: 'Stray providers',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/auth-sign-up.tsx:220, pages/organization-support.tsx:314"
        origin="ui"
        note="A TooltipProvider wrapping a subtree that contains no tooltip of its own. It exists to supply context to tooltips inside child components. Once a single app-level provider is mounted, both are pure deletions."
      >
        <div className="border-neutral-5 rounded-md border border-dashed p-4 text-sm">
          <TooltipProvider delayDuration={200}>
            <p className="text-neutral-11">
              Nothing in this subtree renders a Tooltip. The provider is here for children.
            </p>
          </TooltipProvider>
        </div>
      </CallSite>
      <CallSite
        source="components/ui/sidebar.tsx:518"
        origin="ui"
        note="SidebarMenuButton takes `tooltip?: string | ComponentProps<typeof TooltipContent>`, leaking the Radix content type into a public prop. No call site passes it, so the prop and its whole render branch can be deleted rather than migrated."
      >
        <div className="border-neutral-5 text-neutral-10 rounded-md border border-dashed p-4 text-xs">
          Nothing renders. Dead prop.
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/v2/tooltip.tsx — a separate implementation with its own defaults, reached through
// the v2 barrel. Also supplies ModalTooltipContext, which base already solves with
// FloatingPortalContainerProvider.
// ---------------------------------------------------------------------------

export const V2Tooltip = createPreview({
  label: 'v2 tooltip',
  render: () => (
    <CallSite
      source="7 call sites via the v2 barrel, e.g. policy/rules-configuration/string-config.tsx"
      origin="v2"
      note="Different defaults from ui/tooltip: always-on arrow, p-4 rather than px-3 py-1.5, and a bg-neutral-5 surface. Its API is <Tooltip content={...}>{trigger}</Tooltip>, which is already close to the base shape."
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Badge content="require-description" variants={{ variant: 'outline' }} />
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-neutral-5 p-4 text-xs">
            Requires all types and fields to carry a description.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CallSite>
  ),
});
