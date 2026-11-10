// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import {
  describeInvitationDelivery,
  InvitationDeliveryStatus,
  type InvitationDelivery,
} from './invitation-delivery-cell';

const now = Date.parse('2026-11-03T12:00:00.000Z');

function delivery(overrides: Partial<InvitationDelivery> = {}): InvitationDelivery {
  return {
    timestamp: '2026-11-03T10:00:00.000Z',
    ok: true,
    statusCode: 200,
    statusText: 'OK',
    attempt: 1,
    maxAttempts: 25,
    ...overrides,
  };
}

describe('describeInvitationDelivery', () => {
  it('reports a missing attempt as having no delivery record', () => {
    expect(describeInvitationDelivery(null, now)).toEqual({
      label: 'No delivery record',
      dot: 'neutral',
      tooltip: 'No delivery attempt has been recorded yet.',
    });
  });

  it('dates an accepted email and points at the spam folder', () => {
    expect(describeInvitationDelivery(delivery(), now)).toEqual({
      label: 'Sent',
      dot: 'success',
      tooltip:
        'Accepted by the mail provider 2h ago. Accepted email can still land in a spam folder; ask the invitee to check there if it has not arrived.',
    });
  });

  it('shows the attempt within the budget and that Hive retries', () => {
    expect(
      describeInvitationDelivery(
        delivery({
          ok: false,
          statusCode: 422,
          statusText: '406: You tried to send to a recipient that has been marked as inactive.',
          attempt: 2,
        }),
        now,
      ),
    ).toEqual({
      label: 'Failed (attempt 2 of 25)',
      dot: 'critical',
      tooltip:
        '422 406: You tried to send to a recipient that has been marked as inactive. Hive will try again.',
    });
  });

  it('says retrying has stopped once the budget is spent, without a status code', () => {
    expect(
      describeInvitationDelivery(
        delivery({
          ok: false,
          statusCode: null,
          statusText: 'ECONNREFUSED: connect ECONNREFUSED',
          attempt: 25,
        }),
        now,
      ),
    ).toEqual({
      label: 'Failed (attempt 25 of 25)',
      dot: 'critical',
      tooltip: 'ECONNREFUSED: connect ECONNREFUSED. Hive has stopped retrying.',
    });
  });
});

describe('InvitationDeliveryStatus', () => {
  it('renders the state label', () => {
    render(<InvitationDeliveryStatus delivery={delivery({ ok: false, attempt: 3 })} />);
    expect(screen.getByText('Failed (attempt 3 of 25)')).toBeTruthy();
  });
});
