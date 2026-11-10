// @vitest-environment jsdom
import { DeliveryHealthStatus } from '@/gql/graphql';
import { render, screen } from '@testing-library/react';
import { ChannelHealthWarning } from './channel-health-warning';

const now = new Date('2026-11-03T12:00:00Z');

describe('ChannelHealthWarning', () => {
  it.each([DeliveryHealthStatus.Healthy, DeliveryHealthStatus.Unknown])(
    'shows nothing for a %s channel',
    status => {
      const { container } = render(
        <ChannelHealthWarning health={{ status, failingSince: null }} now={now} />,
      );
      expect(container.firstChild).toBeNull();
    },
  );

  it('shows nothing while a channel has been failing for less than an hour', () => {
    const { container } = render(
      <ChannelHealthWarning
        health={{
          status: DeliveryHealthStatus.Failing,
          failingSince: '2026-11-03T11:30:00Z',
        }}
        now={now}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('warns once a channel has been failing for an hour, with the last response', () => {
    render(
      <ChannelHealthWarning
        health={{
          status: DeliveryHealthStatus.Failing,
          failingSince: '2026-11-03T09:00:00Z',
          lastStatusCode: 404,
          lastStatusText: 'Not Found',
        }}
        now={now}
      />,
    );
    expect(screen.getByText(/This channel has been failing since/)).toBeTruthy();
    expect(screen.getByText(/failing for 48 hours/)).toBeTruthy();
    expect(screen.getByText('Last response: 404 Not Found')).toBeTruthy();
  });
});
