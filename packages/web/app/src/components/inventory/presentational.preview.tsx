import { AlertTriangleIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge, BadgeRounded } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { Heading } from '@/components/ui/heading';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { InlineCode } from '@/components/v2/inline-code';
import Stat from '@/components/v2/stat';
import { Tag } from '@/components/v2/tag';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Presentational';

/**
 * The ten presentational primitives: pills, banners, typography, loading states.
 *
 * These have no behaviour, so the migration is entirely about which variants survive. The export
 * audit found a lot of declared-but-unreachable ones, and several call sites reaching past the
 * variants they were given. Read the Inventory screen first.
 *
 * Counts here are `<Component` render sites, not importing files, and exclude look-alikes: an
 * earlier pass counted `<AlertDialog` as `<Alert` (45 rather than 5) and a page-local `Stat` as
 * `v2/stat` (13 rather than 7).
 */

const ENTRIES = [
  {
    source: '64 render sites across 22 files',
    origin: 'ui',
    what: 'Badge — 71 classNames against 64 instances, 8 variants of which 3 are unreachable',
    coveredBy: 'Pills',
  },
  {
    source: 'target-checks.tsx:157, target-history.tsx:125, target-alerts-rules.tsx:176 and 6 more',
    origin: 'ui',
    what: 'BadgeRounded — a status dot; colour is always a computed expression, never a literal',
    coveredBy: 'Pills',
  },
  {
    source: '16 render sites',
    origin: 'v2',
    what: 'Tag — same pill role as Badge, different scale and API; 3 of 6 colours unreachable',
    coveredBy: 'Pills',
  },
  {
    source: 'target-explorer.tsx:212, target-insights-operation.tsx:120 and 5 more',
    origin: 'ui',
    what: 'Alert — banner with title and description, 2 variants',
    coveredBy: 'Banners',
  },
  {
    source: '13 render sites across 8 files',
    origin: 'ui',
    what: 'Callout — same banner role as Alert, brighter palette, own icon set',
    coveredBy: 'Banners',
  },
  {
    source: '43 render sites across 17 files',
    origin: 'ui',
    what: 'Heading — 3 sizes, only 2 reachable; every one renders as an h3',
    coveredBy: 'Typography',
  },
  {
    source: 'pages/auth-sign-in.tsx:316',
    origin: 'ui',
    what: 'Text — 5 variant axes, 1 call site, and its arrangement prop does nothing',
    coveredBy: 'Typography',
  },
  {
    source: '43 render sites across 9 files',
    origin: 'ui',
    what: 'Skeleton — 44 classNames against 43 instances; no API beyond className',
    coveredBy: 'Loading',
  },
  {
    source: '35 render sites across 24 files',
    origin: 'ui',
    what: 'Spinner — no size prop, so 8 call sites resize it by className',
    coveredBy: 'Loading',
  },
  {
    source: 'PlanSummary.tsx ×4, organization-subscription.tsx, -manage.tsx, AdminStats.tsx',
    origin: 'v2',
    what: 'Stat — a dl/dt/dd compound. A page-local Stat of the same name shadows it elsewhere',
    coveredBy: 'Stat',
  },
  {
    source: 'components/target/settings/cdn-access-tokens.tsx:136',
    origin: 'v2',
    what: 'InlineCode — one call site, copy-to-clipboard code chip',
    coveredBy: 'InlineCode',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="10 presentational primitives"
      summary={
        <>
          <strong>Three pairs do the same job twice.</strong> Badge and Tag are both pills. Alert
          and Callout are both banners. Heading and Text are both typography, and Text has one call
          site. Each pair disagrees on scale, palette and API.
          <br />
          <br />
          <strong>Unreachable variants, delete rather than port:</strong> Badge{' '}
          <code>informal</code>; Tag <code>blue</code>, <code>orange</code>, <code>red</code>;
          Heading <code>2xl</code>; Callout <code>default</code> and its <code>emoji</code> prop.
          Zero call sites each. Badge <code>default</code>, Tag <code>gray</code> and Callout{' '}
          <code>default</code> are never passed explicitly but are reached by omission.
          <br />
          <br />
          <strong>Two components are pure className carriers.</strong> Skeleton has 44 classNames
          against 43 instances and no API at all; Badge has 71 against 64. A variant set nobody can
          reach and a className on every instance are the same signal.
          <br />
          <br />
          <strong>Two live bugs.</strong> <code>Text</code> declares an <code>arrangement</code>{' '}
          variant that the component never passes to <code>textVariants()</code>, so its one call
          site asks for <code>block</code> and gets an inline span. <code>Heading</code> renders{' '}
          <code>h1</code> only for <code>2xl</code>, which no call site uses — so all 43 headings in
          the app are <code>h3</code>, whatever their visual size.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Badge, BadgeRounded and Tag. Two pill systems and a status dot.
// ---------------------------------------------------------------------------

export const Pills = createPreview({
  label: 'Pills',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/badge.tsx"
        origin="ui"
        note="All 8 declared variants. Only the first five are reachable from a call site: default by omission, then outline (21 uses), secondary (8), success (3), warning (2), failure (2). destructive and informal have zero call sites."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge>default</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="success">success</Badge>
          <Badge variant="warning">warning</Badge>
          <Badge variant="failure">failure</Badge>
          <Badge variant="destructive">destructive (unused)</Badge>
          <Badge variant="informal">informal (unused)</Badge>
        </div>
      </CallSite>

      <CallSite
        source="permission-detail-view.tsx:71, :79, :84 and selected-permission-overview.tsx:182"
        origin="ui"
        note="The permission tables are where success/warning/failure earn their keep: Allowed, Allowed (inherited) and Denied. Two of them pin a width with w-[69px] justify-center so the three read as a column."
      >
        <div className="flex flex-col items-start gap-2">
          <Badge variant="warning">Allowed</Badge>
          <Badge className="w-[69px] justify-center" variant="success">
            Allowed
          </Badge>
          <Badge className="w-[69px] justify-center" variant="failure">
            Denied
          </Badge>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-trace.tsx ×6"
        origin="ui"
        note="The most-repeated className in the app: rounded-md px-2 py-0.5 text-[10px] font-thin, six times. It overrides the pill radius, the padding and the type scale - at which point almost nothing of the component survives except the border."
      >
        <div className="flex flex-wrap items-center gap-2">
          {['http.method', 'http.status_code', 'graphql.operation.type'].map(attr => (
            <Badge
              key={attr}
              variant="secondary"
              className="rounded-md px-2 py-0.5 text-[10px] font-thin"
            >
              {attr}
            </Badge>
          ))}
        </div>
      </CallSite>

      <CallSite
        source="permission-detail-view.tsx:107 and the three token sheets"
        origin="ui"
        note="A second recurring override: px-3 py-1 font-mono text-xs, sometimes with text-red-500. A monospace permission key, which is a different thing from a status pill."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="text-neutral-11 px-3 py-1 font-mono text-xs" variant="outline">
            project:describe
          </Badge>
          <Badge className="px-3 py-1 font-mono text-xs text-red-500" variant="outline">
            target:delete
          </Badge>
        </div>
      </CallSite>

      <CallSite
        source="target-history.tsx:125, target-alerts-rules.tsx:176, alert-conditions-panel.tsx:238 and 6 more"
        origin="ui"
        note="BadgeRounded is a status dot, not a badge. Colour is always a computed expression at the call site, never a literal - schemaVersion.isValid ? 'green' : 'red', SEVERITY_DOT_COLOR[sev]. The four semantic colours zero out the base border and padding so size-N controls the dot literally, which is why they look unlike the first five."
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm">
            <BadgeRounded color="green" />
            <BadgeRounded color="red" />
            <BadgeRounded color="yellow" />
            <BadgeRounded color="orange" />
            <BadgeRounded color="gray" />
            <span className="text-neutral-10 text-xs">original five</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <BadgeRounded color="critical" className="size-2" />
            <BadgeRounded color="warning" className="size-2" />
            <BadgeRounded color="info" className="size-2" />
            <BadgeRounded color="successSemantic" className="size-2" />
            <span className="text-neutral-10 text-xs">semantic four, size-2</span>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="components/v2/tag.tsx"
        origin="v2"
        note="The other pill system. p-2 rather than px-2.5 py-0.5, rounded-sm rather than rounded-full, and a tinted 10%-alpha fill rather than a solid one. Only yellow (8) and green (4) are used; blue, orange and red have zero call sites and gray is the default."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Tag>gray (default)</Tag>
          <Tag color="yellow">yellow</Tag>
          <Tag color="green">green</Tag>
          <Tag color="blue">blue (unused)</Tag>
          <Tag color="orange">orange (unused)</Tag>
          <Tag color="red">red (unused)</Tag>
        </div>
      </CallSite>

      <CallSite
        source="cdn-access-tokens.tsx:154, :211, :255, :275 and oidc-integration-configuration.tsx:1030"
        origin="v2"
        note="Half of Tag's call sites are not pills at all: px-4 py-2.5 with an icon and a paragraph, used as a warning banner. That is Callout's job, done with a different component and a different palette."
      >
        <div className="flex flex-col gap-3">
          <Tag color="yellow" className="px-4 py-2.5">
            <AlertTriangleIcon className="size-5" />
            Deleting an CDN access token can not be undone. After deleting the access token it might
            take up to 5 minutes before the changes are propagated across the CDN.
          </Tag>
          <Tag color="green" className="text-sm">
            This is your unique API key and it is non-recoverable. If you lose this key, you will
            need to create a new one.
          </Tag>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Alert and Callout: the same banner, twice.
// ---------------------------------------------------------------------------

export const Banners = createPreview({
  label: 'Banners',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-explorer.tsx:212 and 3 more"
        origin="ui"
        note="Alert: muted bg-neutral-3, rounded-lg, with absolute icon positioning driven by [&>svg] selectors. Four of the seven call sites are this same Outdated Schema warning, copy-pasted across the explorer pages."
      >
        <Alert className="mb-3">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Outdated Schema</AlertTitle>
          <AlertDescription className="max-w-[600px]">
            The latest schema version is <span className="font-bold">not valid</span> , thus the
            explorer might not be accurate as it is showing the{' '}
            <span className="font-bold">latest valid</span> schema version. We recommend you to
            publish a new schema version that is composable before using this explorer for decision
            making.
          </AlertDescription>
        </Alert>
      </CallSite>

      <CallSite
        source="pages/target-insights-coordinate.tsx:257"
        origin="ui"
        note="The only Alert that is neither default nor destructive: it hand-rolls an info look with border-info_10 bg-info_08 text-info. The variant it wants does not exist, so the call site invented it."
      >
        <Alert className="border-info_10 bg-info_08 text-info">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Coordinate resolutions were recently added.</AlertTitle>
          <AlertDescription>
            Your gateway was recently upgraded to add usage tracking for actual coordinate
            resolutions and errors. Please disregard the missing historic resolution data, as this
            data cannot be backfilled.
          </AlertDescription>
        </Alert>
      </CallSite>

      <CallSite
        source="components/ui/callout.tsx"
        origin="ui"
        note="Callout does the same job in a much louder register: saturated 200-level fills with 900-level text, mt-6 baked in, and its own Radix icon per type. Set one beside the Alert above - they are not the same system. The default type (orange, lightning bolt) has zero call sites."
      >
        <div className="flex flex-col gap-3">
          <Callout type="warning" className="mb-2 w-full">
            <b>Your organization has reached it's contract limit.</b>
            <br />
            The data under your organization is still being processed and no data will be lost.
            <br />
            Please contact our support team to increase your contract limit.
          </Callout>
          <Callout type="error" className="mx-auto w-2/3">
            <b>Oops, something went wrong.</b>
            <br />
            Schema composition failed for subgraph &quot;reviews&quot;.
          </Callout>
          <Callout className="mt-2" type="info">
            If you want to consume the GraphQL schema for a tool like GraphQL Code Generator, we
            instead recommend using the high-availability CDN instead.
          </Callout>
          <Callout>default type, unused by any call site</Callout>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Heading and Text.
// ---------------------------------------------------------------------------

export const Typography = createPreview({
  label: 'Typography',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="43 render sites across 17 files"
        origin="ui"
        note="Three sizes declared. xl is the default and carries most of the 43; lg is passed 6 times, all in the SSO settings; 2xl has zero call sites. Since the element is h1 only for 2xl, every heading that ships is an h3 - including the ones that visually head a page."
      >
        <div className="flex flex-col gap-3">
          <Heading size="lg">lg — Overview (SSO settings)</Heading>
          <Heading>xl — the default, 37 of 43 uses</Heading>
          <Heading size="2xl">2xl — the only h1, and unreachable</Heading>
        </div>
      </CallSite>

      <CallSite
        source="10 of 19 Heading classNames"
        origin="ui"
        note="text-center is the single most common override, 10 times - almost always a modal or sheet title. The rest are margins: mb-4, mb-2, mb-1, my-2, mb-3. A component that needs a margin at half its call sites is missing a prop."
      >
        <div className="flex w-[28rem] flex-col gap-3">
          <Heading className="text-center">Create an alert</Heading>
          <Heading size="lg" className="mb-1 text-sm">
            size=lg with text-sm — two opposing instructions on one element
          </Heading>
        </div>
      </CallSite>

      <CallSite
        source="pages/auth-sign-in.tsx:316"
        origin="ui"
        note="Text's only call site, and it does not work. It asks for arrangement='block', but the component destructures color/size/weight/align and calls textVariants({ color, size, weight, align }) - arrangement is never passed through. It also never forwards `as`, so this renders as an inline span. The centring below comes from align, not from block."
      >
        <div className="border-neutral-5 w-[28rem] rounded-md border border-dashed p-3">
          <Text arrangement="block" align="center" size="small" color="secondary">
            Don&apos;t have an account?{' '}
            <a href="#" className="text-accent underline">
              Sign up
            </a>
          </Text>
        </div>
      </CallSite>

      <CallSite
        source="components/ui/text.tsx"
        origin="ui"
        note="The rest of the variant matrix, none of which any call site uses: 5 sizes, 4 weights, 2 colours, 4 alignments. Built for a design system that never arrived."
      >
        <div className="flex flex-col gap-1">
          {(['x-small', 'small', 'medium', 'large', 'x-large'] as const).map(size => (
            <Text key={size} size={size}>
              {size}
            </Text>
          ))}
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Skeleton and Spinner.
// ---------------------------------------------------------------------------

export const Loading = createPreview({
  label: 'Loading',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="43 render sites, 44 classNames"
        origin="ui"
        note="Skeleton is three classes and a spread: bg-neutral-11/10 animate-pulse rounded-md. It has no API, so every call site sizes it by hand. The recurring shapes below are the ones worth turning into something nameable."
      >
        <div className="flex w-[28rem] flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-neutral-10 text-xs">h-10 w-1/4 — 6 uses</span>
            <Skeleton className="h-10 w-1/4" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-neutral-10 text-xs">h-10 w-1/2 — 3 uses</span>
            <Skeleton className="h-10 w-1/2" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-neutral-10 text-xs">
              inline-block h-5 w-[150px] — 3 uses, inline in a sentence
            </span>
            <Skeleton className="inline-block h-5 w-[150px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <span className="text-neutral-10 text-xs">size-9 rounded-full — an avatar</span>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="35 render sites across 24 files"
        origin="ui"
        note="Spinner has no size prop at all - only className - so 8 call sites resize it: mb-3 size-8, mr-2 size-4, mr-1 size-4, text-neutral-1 size-6. The other 27 take size-6 and the accent colour. The three sizes below are all that the app actually needs."
      >
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="mr-1 size-4" />
            <span className="text-neutral-10 text-xs">size-4, inside a button</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <span className="text-neutral-10 text-xs">size-6, the default</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Spinner className="mb-3 size-8" />
            <span className="text-neutral-10 text-xs">size-8, a full-page load</span>
          </div>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// v2/stat and v2/inline-code.
// ---------------------------------------------------------------------------

export const StatPreview = createPreview({
  label: 'Stat',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/billing/PlanSummary.tsx:100, :114, :121, :127"
        origin="v2"
        note="A dl/dt/dd compound: Label, Number, HelpText, in whatever order the call site wants. PlanSummary puts HelpText both above and below the Number to build 'up to 10M per month', which is the only reason the parts are separate."
      >
        <div className="flex flex-col gap-6">
          <Stat>
            <Stat.Label>Plan Type</Stat.Label>
            <Stat.Number>ENTERPRISE</Stat.Number>
            <Stat.HelpText>
              Enterprise plan is for organizations that needs to ship and ingest large amount of
              data, and needs ongoing support around GraphQL APIs.
            </Stat.HelpText>
          </Stat>
          <Stat>
            <Stat.Label>Operations Limit</Stat.Label>
            <Stat.HelpText>up to</Stat.HelpText>
            <Stat.Number>10M</Stat.Number>
            <Stat.HelpText>per month</Stat.HelpText>
          </Stat>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-history-schema-version.tsx:1622"
        origin="v2"
        note="A name collision worth knowing about before migrating. That page defines its OWN Stat - `<Stat label value additionalValue />` - which shadows v2/stat entirely and accounts for 6 of the 13 <Stat> matches a naive grep returns. v2/stat has 7 real render sites, not 13."
      >
        <div className="border-neutral-5 text-neutral-11 rounded-md border border-dashed p-3 text-xs">
          Not rendered: it is a page-local component, not a shared primitive. Migrating v2/stat does
          not touch it.
        </div>
      </CallSite>
    </div>
  ),
});

export const InlineCodePreview = createPreview({
  label: 'InlineCode',
  render: () => (
    <CallSite
      source="components/target/settings/cdn-access-tokens.tsx:136"
      origin="v2"
      note="One call site. A filled code chip with a copy button that posts a notification. Overlaps ui/code, which has one internal caller of its own - two components for one job, each used once."
    >
      <div className="w-[32rem]">
        <InlineCode content="hv1/8f3a11c2e4d6b90a7c5e3f1d2b4a6c8e" />
      </div>
    </CallSite>
  ),
});
