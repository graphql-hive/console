import { CalendarDays, Trash2Icon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/ui/button';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Button';

/**
 * `ui/button` — 335 render sites across 124 files, the largest single component in the app.
 *
 * Far too many to transcribe individually, so this is one preview per distinct shape, with the
 * counts that matter for the API underneath each. The Inventory screen carries the distributions.
 *
 * There is no v2 counterpart in use: `v2/radix-button.tsx` exists but is dead code, reachable only
 * from the equally dead `v2/radix-select.tsx`.
 */

const ENTRIES = [
  {
    source: '120 of 335 sites (106 implicit, 14 explicit)',
    origin: 'ui',
    what: 'variant=default — the neutral grey button, and the commonest thing on screen',
    coveredBy: 'Variants',
  },
  {
    source: '68 sites',
    origin: 'ui',
    what: 'variant=outline — bordered, the second most common',
    coveredBy: 'Variants',
  },
  {
    source: '50 sites',
    origin: 'ui',
    what: 'variant=ghost — no chrome until hover, usually an icon button',
    coveredBy: 'Variants',
  },
  {
    source: '29 sites',
    origin: 'ui',
    what: 'variant=destructive — red fill, delete and revoke actions',
    coveredBy: 'Variants',
  },
  {
    source: '23 + 11 sites',
    origin: 'ui',
    what: 'variant=link and variant=orangeLink — near-identical, and 6 more sites rebuild the latter by hand',
    coveredBy: 'The link problem',
  },
  {
    source: '17 + 17 sites',
    origin: 'ui',
    what: 'variant=primary and variant=secondary — the least used of the eight',
    coveredBy: 'Variants',
  },
  {
    source: '261 default, 23 sm, 19 icon-sm, 18 lg, 9 icon, 3 icon-xs, 2 xs',
    origin: 'ui',
    what: '7 sizes, of which 3 are icon-only squares',
    coveredBy: 'Sizes',
  },
  {
    source: '116 sites',
    origin: 'ui',
    what: 'className carrying w-full — the single largest override, a missing width variant',
    coveredBy: 'Width and alignment',
  },
  {
    source: '30 sites, ~28 of them wrapping a Link or an anchor',
    origin: 'ui',
    what: 'asChild — almost entirely to make the button a link',
    coveredBy: 'Buttons that are links',
  },
  {
    source: 'ui/alert-dialog.tsx:88, :100, ui/calendar.tsx:21, :37, alert-event-detail.tsx:288',
    origin: 'ui',
    what: 'buttonVariants() called directly, so the cva is public API and not just an internal',
    coveredBy: 'buttonVariants as API',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/button"
      summary={
        <>
          <strong>335 render sites across 124 files.</strong> 147 carry a className (44%) and 30 use{' '}
          <code>asChild</code>. Counted with a tag-aware matcher: a naive{' '}
          <code>&lt;Button[^&gt;]*className=</code> spans tag boundaries and reports 351 and 40.
          <br />
          <br />
          <strong>Two variants are the same variant.</strong> <code>orangeLink</code> is{' '}
          <code>link</code> plus <code>h-auto p-0</code>. Six call sites write{' '}
          <code>variant=&quot;link&quot; className=&quot;h-auto p-0&quot;</code> instead —
          rebuilding <code>orangeLink</code> by hand because the name does not describe what it
          does. One site uses <code>orangeLink</code> <em>and</em> re-applies{' '}
          <code>h-auto p-0</code> on top.
          <br />
          <br />
          <strong>116 sites make the button full-width by className.</strong> <code>w-full</code> 27
          times literally, <code>w-full justify-center</code> 12 more, and the rest inside longer
          strings. That is a missing prop, and it is the single largest category of override.
          <br />
          <br />
          <strong>
            <code>asChild</code> is a link affordance in disguise.
          </strong>{' '}
          Of 30 uses, around 28 wrap a TanStack <code>&lt;Link&gt;</code> or an{' '}
          <code>&lt;a&gt;</code>. Whatever base Button offers in its place has to make &quot;a
          button that navigates&quot; the easy path.
          <br />
          <br />
          <strong>
            <code>buttonVariants</code> is public API.
          </strong>{' '}
          Five call sites outside the component apply the cva to something that is not a Button at
          all — an AlertDialog action, two calendar day cells, a link. Deleting the export breaks
          them.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// All eight variants, in usage order.
// ---------------------------------------------------------------------------

export const Variants = createPreview({
  label: 'Variants',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/button.tsx"
        origin="ui"
        note="All eight, ordered by how often each is used. default is 120 of 335 - a neutral grey fill that reads as the ordinary button. primary (the accent fill) is used 17 times, so the loudest variant is one of the rarest."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>default · 120</Button>
          <Button variant="outline">outline · 68</Button>
          <Button variant="ghost">ghost · 50</Button>
          <Button variant="destructive">destructive · 29</Button>
          <Button variant="link">link · 23</Button>
          <Button variant="secondary">secondary · 17</Button>
          <Button variant="primary">primary · 17</Button>
          <Button variant="orangeLink">orangeLink · 11</Button>
        </div>
      </CallSite>

      <CallSite
        source="components/ui/button.tsx"
        origin="ui"
        note="Disabled, which every variant handles differently. default alone adds disabled:ring-1 disabled:ring-neutral-5 and an !important background reset, so it keeps an outline when disabled while the others just fade to 50%."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>default</Button>
          <Button variant="outline" disabled>
            outline
          </Button>
          <Button variant="primary" disabled>
            primary
          </Button>
          <Button variant="destructive" disabled>
            destructive
          </Button>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The seven sizes.
// ---------------------------------------------------------------------------

export const Sizes = createPreview({
  label: 'Sizes',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="261 default, 23 sm, 18 lg, 2 xs"
        origin="ui"
        note="The text sizes. 261 of 335 buttons take the h-10 default; xs is used twice in the entire app."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">lg · 18</Button>
          <Button>default · 261</Button>
          <Button size="sm">sm · 23</Button>
          <Button size="xs">xs · 2</Button>
        </div>
      </CallSite>

      <CallSite
        source="19 icon-sm, 9 icon, 3 icon-xs"
        origin="ui"
        note="The icon-only squares. icon-xs is size-4, which is smaller than the 16px icon usually put inside it - the icon overflows its own button. Almost all of these are ghost."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon">
            <Trash2Icon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Trash2Icon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-xs">
            <Trash2Icon className="size-3" />
          </Button>
          <span className="text-neutral-10 text-xs">icon · 9, icon-sm · 19, icon-xs · 3</span>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// link vs orangeLink: two names for one thing.
// ---------------------------------------------------------------------------

export const TheLinkProblem = createPreview({
  label: 'The link problem',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/button.tsx"
        origin="ui"
        note="orangeLink is link plus h-auto p-0. Both are text-accent with a hover underline - the name suggests a colour difference that does not exist. Side by side the only difference is that link keeps the h-10 button box, so it sits on a taller line."
      >
        <div className="flex flex-col items-start gap-2">
          <div className="border-neutral-5 rounded-md border border-dashed">
            <Button variant="link">variant=&quot;link&quot; — keeps h-10 py-2 px-4</Button>
          </div>
          <div className="border-neutral-5 rounded-md border border-dashed">
            <Button variant="orangeLink">variant=&quot;orangeLink&quot; — h-auto p-0</Button>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="ui/query-error.tsx, components/error.tsx, target-checks-affected-deployments.tsx and 3 more"
        origin="ui"
        note="Six call sites write variant='link' className='h-auto p-0', which is orangeLink spelled out. They are visually identical to the orangeLink above. The variant exists; its name just does not say what it is for."
      >
        <div className="flex flex-col items-start gap-2">
          <Button variant="link" className="h-auto p-0">
            Rebuilt by hand
          </Button>
          <Button variant="orangeLink">The variant that already does this</Button>
        </div>
      </CallSite>

      <CallSite
        source="components/target/insights/list.tsx:70"
        origin="ui"
        note="And one site passes orangeLink AND re-applies h-auto p-0 on top of it, which the variant already contains. Nobody was sure what orangeLink did."
      >
        <Button variant="orangeLink" className="h-auto p-0" title="getProductsWithReviews">
          getProductsWithReviews
        </Button>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The largest className category.
// ---------------------------------------------------------------------------

export const WidthAndAlignment = createPreview({
  label: 'Width and alignment',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="116 sites carry w-full, 27 of them as the whole className"
        origin="ui"
        note="Full-width buttons are everywhere: modal footers, auth forms, sheet actions. 12 sites also add justify-center on top, though the base class already centres. This is the clearest missing prop on the component."
      >
        <div className="flex w-[24rem] flex-col gap-2">
          <Button className="w-full">w-full · 27 literal</Button>
          <Button variant="primary" className="w-full justify-center">
            w-full justify-center · 12
          </Button>
          <div className="flex w-full gap-2">
            <Button size="lg" className="w-full justify-center">
              Cancel
            </Button>
            <Button size="lg" variant="primary" className="w-full justify-center">
              Create Alert
            </Button>
          </div>
        </div>
      </CallSite>

      <CallSite
        source="ml-auto ×12, ml-auto mr-0 flex ×4, ml-2 ×2, mr-2 ×3"
        origin="ui"
        note="The second category: the button pushing itself around inside its parent. A button that has to set its own margin to sit where it belongs is being asked to do the layout's job."
      >
        <div className="border-neutral-5 flex w-[24rem] rounded-md border border-dashed p-2">
          <Button variant="secondary" className="ml-auto">
            ml-auto · 12
          </Button>
        </div>
      </CallSite>

      <CallSite
        source="date-range-picker.tsx:381, :412"
        origin="ui"
        note="The outlier worth keeping in view: a ghost icon button absolutely positioned inside a text field. size-6 px-0 with -translate-y-1/2 - none of which the size scale offers."
      >
        <div className="relative flex w-[20rem]">
          <input
            className="border-neutral-5 text-neutral-12 h-10 w-full rounded-md border px-3 py-2 font-mono text-xs"
            defaultValue="now-30d"
            readOnly
          />
          <Button variant="ghost" className="absolute right-2 top-1/2 size-6 -translate-y-1/2 px-0">
            <CalendarDays className="size-3.5" />
          </Button>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// asChild, which is nearly always about navigation.
// ---------------------------------------------------------------------------

export const ButtonsThatAreLinks = createPreview({
  label: 'Buttons that are links',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="30 asChild sites, ~28 wrapping a Link or an anchor"
        origin="ui"
        note="This is what asChild is actually for in this app: making a button navigate. auth-verify-email.tsx does it three times, auth-sign-in and auth-sign-up once each, and every settings page has one. An anchor stands in for the TanStack Link here since the preview router only resolves app routes."
      >
        <div className="flex w-[24rem] flex-col gap-2">
          <Button asChild className="w-full">
            <a href="#">Go to your organization</a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="#">Sign in instead</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="#">Back to traces</a>
          </Button>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-alerts.tsx"
        origin="ui"
        note="The awkward one: a ghost button that is really a nav item, so it needs h-auto justify-start text-left to stop behaving like a button. Three of the component's own defaults undone at once."
      >
        <div className="flex w-[16rem] flex-col">
          {['Overview', 'Rules', 'Activity'].map(item => (
            <Button key={item} variant="ghost" className="h-auto justify-start text-left" asChild>
              <a href="#">{item}</a>
            </Button>
          ))}
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// buttonVariants used on things that are not Buttons.
// ---------------------------------------------------------------------------

export const ButtonVariantsAsApi = createPreview({
  label: 'buttonVariants as API',
  render: () => (
    <CallSite
      source="ui/alert-dialog.tsx:88, :100, ui/calendar.tsx:21, :37, alert-event-detail.tsx:288"
      origin="ui"
      note="Five call sites import the cva and apply it to something that is not a Button: AlertDialogAction and AlertDialogCancel, two react-day-picker day cells, and a plain anchor. base/button exports its own buttonVariants and base/filter-dropdown already consumes it as chipClass, so the pattern carries over - but it means the variant set is a public contract, not an implementation detail."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 w-40 text-xs">AlertDialogAction</span>
          <Button>Continue</Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 w-40 text-xs">AlertDialogCancel</span>
          <Button variant="outline" className="mt-2 sm:mt-0">
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 w-40 text-xs">calendar day cell</span>
          <Button variant="ghost" size="icon-sm">
            14
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-10 w-40 text-xs">an anchor</span>
          <Button variant="primary" asChild>
            <a href="#">View alert</a>
          </Button>
        </div>
      </div>
    </CallSite>
  ),
});
