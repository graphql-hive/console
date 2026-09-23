import { useState } from 'react';
import clsx from 'clsx';
import { InfoIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { PolicyConfigBox } from '@/components/policy/policy-config-box';
import { CrossCircledIcon, ExclamationTriangleIcon, MinusCircledIcon } from '@radix-ui/react-icons';
import { Popover } from '../floating/popover/popover';
import { ToggleGroup } from './toggle-group';

export const nav: NavPath = 'Base/FormControls/ToggleGroup/Component Examples';

/**
 * Every ToggleGroup in the app, transcribed with its real surroundings. The laboratory pages run
 * GraphiQL and the policy pages a form over GraphQL, so none can be imported.
 *
 * History: all four were `v2/toggle-group` (Radix) until round 4. The component shipped no pressed
 * state, so each site painted its own with a className, and every group carried a copy-pasted
 * `defaultValue="list"` that matched no item.
 */

const ENTRIES = [
  {
    source: 'pages/target-laboratory.tsx:503',
    origin: 'base',
    what: 'Mock / API endpoint switch in the laboratory toolbar',
    coveredBy: 'Laboratory endpoint',
  },
  {
    source: 'pages/target-laboratory-new.tsx:857',
    origin: 'base',
    what: 'The same switch on the new laboratory page',
    coveredBy: 'Laboratory endpoint',
  },
  {
    source: 'pages/target-laboratory.tsx:459 and pages/target-laboratory-new.tsx:799',
    origin: 'base',
    what: 'GraphiQL / Hive Laboratory page switch beside the title (was ui/tabs until round 7)',
    coveredBy: 'Laboratory switch',
  },
  {
    source: 'components/policy/rules-configuration/severity-toggle.tsx:47',
    origin: 'base',
    what: 'Policy rule severity: icon-only options with a tooltip each',
    coveredBy: 'Severity',
  },
  {
    source: 'components/policy/rules-configuration/enum-config.tsx:48',
    origin: 'base',
    what: 'Policy rule enum property, options from the rule’s JSON schema',
    coveredBy: 'Enum property',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/toggle-group"
      summary={
        <>
          Five groups, all single-select. Two endpoint switches and the page switch on the
          laboratory pages, and two in the schema policy form: an icon-only severity picker and a
          text picker over an enum.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

function LaboratorySwitch() {
  const [tab, setTab] = useState('graphiql');
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-12 text-2xl font-semibold">Laboratory</span>
      <div className="bg-neutral-5 h-4 w-px" />
      <ToggleGroup
        aria-label="Laboratory version"
        value={tab}
        onValueChange={setTab}
        options={[
          { value: 'graphiql', label: 'GraphiQL' },
          {
            value: 'hive-laboratory',
            label: (
              <>
                Hive Laboratory
                <span className="bg-accent ml-1 size-2 rounded-full" />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export const LaboratorySwitchPreview = createPreview({
  label: 'Laboratory switch',
  render: () => (
    <CallSite
      source="pages/target-laboratory.tsx:459 and pages/target-laboratory-new.tsx:799"
      origin="base"
      note="Beside the Laboratory title. Pressing the other option swaps the whole page below, so the router holds the value; the accent dot marks the new laboratory."
    >
      <LaboratorySwitch />
    </CallSite>
  ),
});

function LaboratoryEndpoint(props: { hasEndpoint: boolean; fetching: boolean }) {
  const [endpoint, setEndpoint] = useState('mockApi');
  return (
    <div className="self-end pt-2">
      <span className="mr-2 text-xs font-bold">Query</span>
      <ToggleGroup
        options={[
          {
            value: 'mockApi',
            label: 'Mock',
            tooltip: 'Use Mock Schema',
            disabled: props.fetching,
          },
          {
            value: 'linkedApi',
            label: 'API',
            tooltip: 'Use API endpoint',
            disabled: !props.hasEndpoint || props.fetching,
          },
        ]}
        value={endpoint}
        onValueChange={setEndpoint}
        aria-label="Query endpoint"
      />
    </div>
  );
}

export const LaboratoryEndpointPreview = createPreview({
  label: 'Laboratory endpoint',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-laboratory.tsx:503 and pages/target-laboratory-new.tsx:857"
        origin="base"
        note="Byte-identical on both pages. The pressed option is the endpoint actually in use, which the old markup only approximated by className."
      >
        <LaboratoryEndpoint hasEndpoint fetching={false} />
      </CallSite>

      <CallSite
        source="the same, for a target with no GraphQL endpoint"
        origin="base"
        note="API is disabled until the target has an endpoint URL."
      >
        <LaboratoryEndpoint hasEndpoint={false} fetching={false} />
      </CallSite>

      <CallSite
        source="the same, while the target query is in flight"
        origin="base"
        note="Both options are disabled while fetching."
      >
        <LaboratoryEndpoint hasEndpoint fetching />
      </CallSite>
    </div>
  ),
});

/** SeverityLevelToggle with `canTurnOff`, so all three options are present. */
function Severity() {
  const [severity, setSeverity] = useState('WARNING');
  const options = [
    {
      value: 'OFF',
      label: 'Disables a rule defined at the organization level',
      icon: (active: boolean) => (
        <MinusCircledIcon
          className={clsx(active ? 'text-neutral-12' : 'text-neutral-8', 'hover:text-neutral-12')}
        />
      ),
    },
    {
      value: 'WARNING',
      label: 'Warning',
      icon: (active: boolean) => (
        <ExclamationTriangleIcon
          className={clsx(active ? 'text-orange-500' : 'text-neutral-8', 'hover:text-orange-500')}
        />
      ),
    },
    {
      value: 'ERROR',
      label: 'Error',
      icon: (active: boolean) => (
        <CrossCircledIcon
          className={clsx(active ? 'text-red-600' : 'text-neutral-8', 'hover:text-red-600')}
        />
      ),
    },
  ];
  return (
    <PolicyConfigBox title="severity" className="row-start-1 row-end-6 first:pl-0">
      <ToggleGroup
        options={options.map(level => ({
          value: level.value,
          label: level.icon(severity === level.value),
          tooltip: level.label,
        }))}
        value={severity}
        onValueChange={setSeverity}
        aria-label="Severity"
      />
    </PolicyConfigBox>
  );
}

export const SeverityPreview = createPreview({
  label: 'Severity',
  render: () => (
    <CallSite
      source="components/policy/rules-configuration/severity-toggle.tsx:47"
      origin="base"
      note="Icon-only options, each named by its tooltip. The pressed colour differs per option, so the call site computes it and passes the icon as the label. The Off option only appears on project-level policy for rules the organization defined."
    >
      <Severity />
    </CallSite>
  ),
});

/** PolicyEnumSelect for naming-convention's `types` property, whose enum is the style list. */
function EnumProperty() {
  const [value, setValue] = useState<string | undefined>('PascalCase');
  const options = ['camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE', 'kebab-case'].map(v => ({
    label: v,
    value: v,
  }));
  return (
    <PolicyConfigBox
      title={
        <div className="flex items-center">
          <div>types</div>
          <Popover
            trigger={
              <button type="button" aria-label="About this option" className="text-accent ml-2">
                <InfoIcon className="size-4" />
              </button>
            }
            openOnHover
            content={<p className="text-neutral-11 text-sm">Naming style for type names.</p>}
          />
        </div>
      }
    >
      <ToggleGroup options={options} value={value} onValueChange={setValue} aria-label="types" />
    </PolicyConfigBox>
  );
}

export const EnumPropertyPreview = createPreview({
  label: 'Enum property',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/policy/rules-configuration/enum-config.tsx:48"
        origin="base"
        note="Options come straight from the rule's JSON schema enum; the title is the property name and the info popover its description."
      >
        <EnumProperty />
      </CallSite>

      <CallSite
        source="the same, before a value is chosen"
        origin="base"
        note="An undefined value presses nothing; the rule sets the schema default on mount."
      >
        <PolicyConfigBox title="types">
          <ToggleGroup
            options={[
              { label: 'camelCase', value: 'camelCase' },
              { label: 'PascalCase', value: 'PascalCase' },
            ]}
            value={undefined}
            onValueChange={() => {}}
            aria-label="types"
          />
        </PolicyConfigBox>
      </CallSite>
    </div>
  ),
});
