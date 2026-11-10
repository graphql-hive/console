// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { DeliveryEvent } from '@/gql/graphql';
import type * as Router from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ChannelDeliveriesTable,
  metadataValue,
  statusPopover,
  type ChannelDeliveryRow,
} from './channel-deliveries-table';

// The cells link into the app; here they render outside a router.
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof Router>()),
  Link: (props: { children?: ReactNode; to?: string; params?: Record<string, string> }) => (
    <a
      href={Object.entries(props.params ?? {}).reduce(
        (to, [key, value]) => to.replace(`$${key}`, value),
        props.to ?? '#',
      )}
    >
      {props.children}
    </a>
  ),
  useRouter: () => ({ navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
}));
vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSlugs: () => ({ organizationSlug: 'acme', projectSlug: 'shop' }),
  // The copy button's hook reports through the app's toast provider, absent here.
  useClipboard: () => vi.fn(),
}));

const targets = [{ id: 't1', slug: 'production' }];

function delivery(overrides: Partial<ChannelDeliveryRow> = {}): ChannelDeliveryRow {
  return {
    timestamp: '2026-11-03T10:00:00.000Z',
    event: DeliveryEvent.SchemaChange,
    ok: false,
    statusCode: 404,
    statusText: 'Not Found',
    durationMs: 120,
    attempt: 1,
    metadata: {
      'Hive-Request-ID': 'req-1',
      'Hive-Event': 'schema_change',
      'Hive-Target-ID': 't1',
      'Hive-Schema-ID': 'v1',
      'User-Agent': 'Hive-Webhooks/1.2.3',
      'Idempotency-Key': 'schema-change:v1:c1',
    },
    ...overrides,
  };
}

describe('statusPopover', () => {
  it('offers the full status only when it is too long for the column', () => {
    expect(statusPopover('404 Not Found')).toBeUndefined();
    expect(statusPopover('431 Request Header Fields Too Large')).toBe(
      '431 Request Header Fields Too Large',
    );
    expect(statusPopover("ETIMEDOUT: Timeout awaiting 'request' for 10000ms")).toBe(
      "ETIMEDOUT: Timeout awaiting 'request' for 10000ms",
    );
  });
});

describe('ChannelDeliveriesTable', () => {
  it('shows the status the destination answered and links the schema id to its version', () => {
    const { container } = render(
      <ChannelDeliveriesTable deliveries={[delivery()]} targets={targets} />,
    );

    expect(screen.getByText('404 Not Found')).toBeTruthy();
    expect(screen.getByText('Schema change')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'production' }).getAttribute('href')).toBe(
      '/acme/shop/production',
    );

    fireEvent.click(container.querySelector('tbody > tr')!);
    expect(screen.getByText('Headers sent')).toBeTruthy();
    expect(screen.getByText('req-1')).toBeTruthy();
    expect(screen.getByText('schema-change:v1:c1')).toBeTruthy();
    expect(screen.getByText('Hive-Webhooks/1.2.3')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'v1' }).getAttribute('href')).toBe(
      '/acme/shop/production/history/v1',
    );
    expect(screen.getByRole('button', { name: 'Copy HIVE-SCHEMA-ID' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy HIVE-REQUEST-ID' })).toBeTruthy();
  });

  it('shows a Slack attempt by its API result alone, with its message metadata', () => {
    render(
      <ChannelDeliveriesTable
        deliveries={[
          delivery({
            event: DeliveryEvent.MetricAlert,
            ok: true,
            statusCode: null,
            statusText: 'ok',
            metadata: {
              event_type: 'metric_alert',
              hive_request_id: 'req-2',
              hive_target_id: 't1',
              idempotency_key: 'metric-alert:s1:c1',
              user_agent: 'Hive-Webhooks/1.2.3',
            },
          }),
        ]}
        targets={targets}
      />,
    );

    expect(screen.getByText('ok')).toBeTruthy();
    expect(screen.getByText('Metric alert')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Metric alert' })).toBeNull();
    expect(screen.getByRole('link', { name: 'production' })).toBeTruthy();
  });

  it('says so when the history could not be read', () => {
    render(<ChannelDeliveriesTable deliveries={null} targets={[]} />);

    expect(screen.getByText('Delivery history is unavailable right now.')).toBeTruthy();
  });
});

describe('metadataValue', () => {
  it('reads a header by its webhook name or its Slack metadata form', () => {
    expect(metadataValue({ 'Hive-Target-ID': 't1' }, 'Hive-Target-ID')).toBe('t1');
    expect(metadataValue({ hive_target_id: 't1' }, 'Hive-Target-ID')).toBe('t1');
    expect(metadataValue({}, 'Hive-Target-ID')).toBeNull();
  });
});
