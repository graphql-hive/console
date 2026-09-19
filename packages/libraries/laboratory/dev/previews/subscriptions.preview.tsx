/**
 * One preview per subscription transport, so each can be opened and run without walking
 * through the settings form. The mock endpoint serves all of them at once (SSE from yoga
 * itself, the two WebSocket protocols from dev/subscription-transports.ts); the only
 * thing these previews change is which one the client picks.
 *
 * The seeded "Subscription" tab is the one to run. Every transport should stream three
 * events and then complete.
 */
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Laboratory } from '../../src/components/laboratory/laboratory';
import { defaultLaboratorySettings, type LaboratorySettings } from '../../src/lib/settings';
import { devCollections } from '../collections';
import '../legacy-ws-shim';
import { devActiveTabId, devOperations, devTabs } from '../operations';
import { devPreflight } from '../preflight';

export const nav: NavPath = 'Laboratory/Subscriptions';

const PROTOCOLS = ['SSE', 'GRAPHQL_SSE', 'WS', 'LEGACY_WS'] as const;

const settingsFor = (
  protocol: LaboratorySettings['subscriptions']['protocol'],
): LaboratorySettings => ({
  ...defaultLaboratorySettings,
  subscriptions: { protocol },
});

const LaboratoryWith = ({ settings }: { settings: LaboratorySettings }) => (
  <Laboratory
    enableDocs
    theme="dark"
    defaultEndpoint={`${window.location.origin}/graphql`}
    defaultSettings={settings}
    defaultCollections={devCollections}
    defaultOperations={devOperations}
    defaultTabs={devTabs}
    defaultActiveTabId={devActiveTabId}
    defaultPreflight={devPreflight}
  />
);

export const SSE = createPreview(() => <LaboratoryWith settings={settingsFor('SSE')} />);

export const GraphQLSSE = createPreview({
  label: 'GRAPHQL_SSE',
  render: () => <LaboratoryWith settings={settingsFor('GRAPHQL_SSE')} />,
});

export const WS = createPreview(() => <LaboratoryWith settings={settingsFor('WS')} />);

export const LegacyWS = createPreview({
  label: 'LEGACY_WS',
  render: () => <LaboratoryWith settings={settingsFor('LEGACY_WS')} />,
});

export const Protocols = createPreview({
  controls: controlsFor(Laboratory, {
    defaultSettings: {
      type: 'select',
      label: 'Protocol',
      options: PROTOCOLS,
      default: 'WS',
      derive: settingsFor,
    },
  }),
  // Settings are seeded once at mount, so the key remounts the Laboratory on a switch.
  render: v => (
    <LaboratoryWith key={v.defaultSettings.subscriptions.protocol} settings={v.defaultSettings} />
  ),
});
