/**
 * One preview per subscription transport, so each can be opened and run without walking
 * through the settings form. The mock endpoint serves all of them at once (SSE from yoga
 * itself, the two WebSocket protocols from dev/subscription-transports.ts); the only
 * thing these previews change is which one the client picks.
 *
 * The seeded "Subscription" tab is the one to run. Every transport should stream three
 * events and then complete.
 */
import { createPreview, defineControls, type NavPath } from 'react-foundry';
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

const LaboratoryWith = ({
  protocol,
}: {
  protocol: LaboratorySettings['subscriptions']['protocol'];
}) => (
  <Laboratory
    enableDocs
    theme="dark"
    defaultEndpoint={`${window.location.origin}/graphql`}
    defaultSettings={settingsFor(protocol)}
    defaultCollections={devCollections}
    defaultOperations={devOperations}
    defaultTabs={devTabs}
    defaultActiveTabId={devActiveTabId}
    defaultPreflight={devPreflight}
  />
);

export const SSE = createPreview(() => <LaboratoryWith protocol="SSE" />);

export const GraphQLSSE = createPreview({
  label: 'GRAPHQL_SSE',
  render: () => <LaboratoryWith protocol="GRAPHQL_SSE" />,
});

export const WS = createPreview(() => <LaboratoryWith protocol="WS" />);

export const LegacyWS = createPreview({
  label: 'LEGACY_WS',
  render: () => <LaboratoryWith protocol="LEGACY_WS" />,
});

export const Protocols = createPreview({
  controls: defineControls({
    protocol: { type: 'select', options: [...PROTOCOLS], default: 'WS' },
  }),
  // Settings are seeded once at mount, so the key remounts the Laboratory on a switch.
  render: values => <LaboratoryWith key={values.protocol} protocol={values.protocol} />,
});
