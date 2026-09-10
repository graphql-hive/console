import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Avatar } from '@/components/v2/avatar';
import { Combobox } from '@/components/v2/combobox';
import { Markdown } from '@/components/v2/markdown';
import { Slider } from '@/components/v2/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/v2/toggle-group';
import { cn } from '@/lib/utils';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/V2Leftovers';

/**
 * The five `v2/` primitives with no `ui/` counterpart: Avatar, Slider, ToggleGroup, Combobox and
 * Markdown. 20 render sites between them, and each is the only implementation of its kind.
 *
 * Unlike the rest of Phase 0 there is nothing to compare against here — no second version exists,
 * so these are transcriptions of the only thing that ships.
 *
 * Counts exclude look-alikes: `<Combobox` also matches the Headless UI one in
 * `transfer-organization-ownership.tsx`, which is a different component entirely (4 matches, 3
 * real).
 */

const ENTRIES = [
  {
    source:
      'ui/user-menu.tsx:127, alert-activity-table.tsx:123, alert-conditions-panel.tsx, target-alerts-rules.tsx:253',
    origin: 'v2',
    what: 'Avatar — 4 sites, all shape=circle, and none passes src so all render the fallback',
    coveredBy: 'Avatar',
  },
  {
    source: 'pages/organization-subscription-manage.tsx:469',
    origin: 'v2',
    what: 'Slider — one site, the operations rate-limit picker',
    coveredBy: 'Slider',
  },
  {
    source:
      'target-laboratory.tsx:511, target-laboratory-new.tsx, severity-toggle.tsx, enum-config.tsx',
    origin: 'v2',
    what: 'ToggleGroup — 4 groups, 6 items, and every item carries a className',
    coveredBy: 'ToggleGroup',
  },
  {
    source: 'pages/target-settings.tsx:356, :429, multiselect-config.tsx:42',
    origin: 'v2',
    what: 'Combobox — 3 sites, all multi-select tag pickers, built on react-select',
    coveredBy: 'Combobox',
  },
  {
    source:
      'explorer/common.tsx:26, :277, scalar-type.tsx, policy-list-item.tsx:75, rules-configuration/index.tsx',
    origin: 'v2',
    what: 'Markdown — 5 sites rendering schema descriptions through snarkdown + dompurify',
    coveredBy: 'Markdown',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="v2 avatar, slider, toggle-group, combobox, markdown"
      summary={
        <>
          <strong>Five components, 20 render sites, no ui/ counterparts.</strong> Each is the only
          implementation of its kind in the app, so unlike the rest of Phase 0 there is nothing to
          compare against — these are transcriptions of the only thing that ships.
          <br />
          <br />
          <strong>Avatar never shows an image.</strong> All four call sites pass{' '}
          <code>shape=&quot;circle&quot;</code> and none passes <code>src</code>, so every avatar in
          the app renders the empty accent-tinted fallback. The <code>square</code> shape (the
          component&apos;s own default) and the <code>lg</code> and <code>md</code> sizes are
          unreachable.
          <br />
          <br />
          <strong>Slider has one call site and no variants.</strong> It is a thin Radix wrapper with
          no props of its own — everything passes straight through.
          <br />
          <br />
          <strong>ToggleGroup styles nothing.</strong> The component contributes{' '}
          <code>inline-flex rounded-md shadow-sm</code> and each item gets padding and corner
          rounding; the entire active state is built at the call site with <code>data-state</code>
          -free conditional classNames. All 6 items carry one, and the laboratory pair are
          byte-identical.
          <br />
          <br />
          <strong>Combobox drags in react-select.</strong> Three call sites, all multi-select tag
          pickers over the same shape. It is the last consumer of that dependency now that{' '}
          <code>v2/autocomplete</code> is dead.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// v2/avatar — four sites, one shape, no images.
// ---------------------------------------------------------------------------

export const AvatarPreview = createPreview({
  label: 'Avatar',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="alert-activity-table.tsx:123 and pages/target-alerts-rules.tsx:253"
        origin="v2"
        note="Identical in both files: size=xs, shape=circle, an alt but no src. Radix Avatar falls back to the empty Root, so what ships is a 20px accent-tinted dot beside the name."
      >
        <span className="text-neutral-12 inline-flex items-center gap-2">
          <Avatar size="xs" shape="circle" alt="User" />
          User
        </span>
      </CallSite>

      <CallSite
        source="components/ui/user-menu.tsx:127"
        origin="v2"
        note="The only site with a className, adding a 2px accent ring. Default size md, still no src."
      >
        <Avatar shape="circle" className="border-accent_80 border-2" />
      </CallSite>

      <CallSite
        source="components/v2/avatar.tsx"
        origin="v2"
        note="The full declared surface, none of which the app reaches: four sizes, a square shape (which is the component's own default), and a fallback slot. Square uses rounded-sm below lg and rounded-md at lg."
      >
        <div className="flex items-end gap-4">
          {(['xs', 'sm', 'md', 'lg'] as const).map(size => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Avatar size={size} shape="circle" />
              <span className="text-neutral-10 text-xs">{size} circle</span>
            </div>
          ))}
          {(['xs', 'sm', 'md', 'lg'] as const).map(size => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Avatar size={size} shape="square" />
              <span className="text-neutral-10 text-xs">{size} square</span>
            </div>
          ))}
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// v2/slider — one call site.
// ---------------------------------------------------------------------------

export const SliderPreview = createPreview({
  label: 'Slider',
  render: () => <SliderExample />,
});

function SliderExample() {
  const [value, setValue] = useState([12]);

  return (
    <CallSite
      source="pages/organization-subscription-manage.tsx:469"
      origin="v2"
      note="The only Slider in the app: the operations rate-limit picker, paired with a text input that shows the same number. The component adds no props of its own - min, max, step, value, onValueChange and disabled all pass straight through to Radix."
    >
      <div className="w-[28rem] space-y-2">
        <Slider
          min={1}
          max={300}
          step={1}
          value={value}
          onValueChange={setValue}
          aria-label="value"
        />
        <div className="text-neutral-11 text-sm">{value[0]}M operations per month</div>
      </div>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// v2/toggle-group — the component styles the container, the call site styles the state.
// ---------------------------------------------------------------------------

export const ToggleGroupPreview = createPreview({
  label: 'ToggleGroup',
  render: () => <ToggleGroupExamples />,
});

function ToggleGroupExamples() {
  const [endpoint, setEndpoint] = useState('mockApi');
  const [severity, setSeverity] = useState('warning');

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-laboratory.tsx:511 and pages/target-laboratory-new.tsx"
        origin="v2"
        note="Byte-identical in both laboratory pages. Note the active state: the component provides no data-[state=on] styling at all, so the call site computes bg-neutral-5 text-neutral-12 itself from its own state. It also passes both value and defaultValue, which Radix treats as controlled."
      >
        <ToggleGroup
          type="single"
          value={endpoint}
          onValueChange={v => v && setEndpoint(v)}
          className="text-neutral-10 bg-neutral-2/50"
        >
          <ToggleGroupItem
            value="mockApi"
            title="Use Mock Schema"
            className={cn(
              'hover:text-neutral-12 text-xs',
              endpoint === 'mockApi' && 'bg-neutral-5 text-neutral-12',
            )}
          >
            Mock
          </ToggleGroupItem>
          <ToggleGroupItem
            value="linkedApi"
            title="Use API endpoint"
            className={cn(
              'hover:text-neutral-12 text-xs',
              endpoint === 'linkedApi' && 'bg-neutral-5 text-neutral-12',
            )}
          >
            API
          </ToggleGroupItem>
        </ToggleGroup>
      </CallSite>

      <CallSite
        source="components/policy/rules-configuration/severity-toggle.tsx"
        origin="v2"
        note="The policy severity picker, same pattern with three options. Every ToggleGroupItem in the app carries a className because the component ships no selected state of its own."
      >
        <ToggleGroup type="single" value={severity} onValueChange={v => v && setSeverity(v)}>
          {['off', 'warning', 'error'].map(level => (
            <ToggleGroupItem
              key={level}
              value={level}
              className={cn(
                'hover:text-neutral-12 text-xs capitalize',
                severity === level && 'bg-neutral-5 text-neutral-12',
              )}
            >
              {level}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v2/combobox — the last react-select consumer.
// ---------------------------------------------------------------------------

export const ComboboxPreview = createPreview({
  label: 'Combobox',
  render: () => <ComboboxExample />,
});

function ComboboxExample() {
  const [value, setValue] = useState([{ label: 'web-app', value: 'web-app' }]);

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-settings.tsx:356, :429"
        origin="v2"
        note="Two identical multi-select tag pickers - client names and app deployment names - both mapping a string[] to { label, value } pairs on the way in and back on the way out. Type to filter, click an x to remove."
      >
        <div className="w-[28rem]">
          <Combobox
            name="clientNames"
            placeholder="Select..."
            value={value}
            options={[
              { label: 'web-app', value: 'web-app' },
              { label: 'ios-app', value: 'ios-app' },
              { label: 'android-app', value: 'android-app' },
              { label: 'internal-tooling', value: 'internal-tooling' },
            ]}
            onChange={next => setValue([...next])}
            onBlur={() => {}}
          />
        </div>
      </CallSite>

      <CallSite
        source="components/policy/rules-configuration/multiselect-config.tsx:42"
        origin="v2"
        note="The third site, w-full inside a policy rule row. Same shape again: three call sites, one pattern, and react-select carried for all of it. With v2/autocomplete dead, this is the dependency's last consumer."
      >
        <div className="w-[28rem]">
          <Combobox
            name="options"
            placeholder="Select Options"
            className="w-full"
            options={[
              { label: 'camelCase', value: 'camelCase' },
              { label: 'PascalCase', value: 'PascalCase' },
              { label: 'snake_case', value: 'snake_case' },
            ]}
            onChange={() => {}}
            onBlur={() => {}}
          />
        </div>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v2/markdown — schema descriptions, sanitised.
// ---------------------------------------------------------------------------

export const MarkdownPreview = createPreview({
  label: 'Markdown',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/explorer/common.tsx:26"
        origin="v2"
        note="Renders a GraphQL schema description. snarkdown converts, dompurify sanitises, and the result goes in through dangerouslySetInnerHTML - the sanitiser is the only thing between a schema description and script injection, so it is load-bearing rather than decorative. Styling comes from a global .hive-markdown class in index.css, not from the component."
      >
        <div className="w-[32rem]">
          <Markdown
            className="text-neutral-10 text-left text-sm"
            content={
              'The `products` connection returns a paginated list.\n\nSee the [pagination guide](https://example.com) for cursor semantics. Supports **forward** and *backward* paging.'
            }
          />
        </div>
      </CallSite>

      <CallSite
        source="components/target/explorer/common.tsx:277"
        origin="v2"
        note="The same component inside a tooltip, rendering a deprecation reason. Markdown in a tooltip is the case most likely to overflow, since the content is author-supplied."
      >
        <div className="border-neutral-5 w-[20rem] rounded-md border p-2">
          <Markdown
            className="text-neutral-10"
            content="Use `productsConnection` instead. This field will be removed in **v3**."
          />
        </div>
      </CallSite>

      <CallSite
        source="components/policy/policy-list-item.tsx:75"
        origin="v2"
        note="A policy rule description at text-sm, followed by a DocsLink. Five sites in total and four of the five pass a className, all of them adjusting colour or size."
      >
        <div className="w-[32rem]">
          <Markdown
            content="Requires all types and fields to have a description. Set `ignoreTypes` to skip specific types."
            className="text-sm"
          />
        </div>
      </CallSite>
    </div>
  ),
});
