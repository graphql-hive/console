// @vitest-environment jsdom
import { DeliveryEvent } from '@/gql/graphql';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmailDeliveriesTable, type EmailDeliveryRow } from './email-deliveries-table';

vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  // The copy button's hook reports through the app's toast provider, absent here.
  useClipboard: () => vi.fn(),
}));

function delivery(overrides: Partial<EmailDeliveryRow> = {}): EmailDeliveryRow {
  return {
    timestamp: '2026-11-04T10:00:00.000Z',
    event: DeliveryEvent.OrganizationInvitation,
    destination: 'invitee@example.com',
    ok: true,
    statusCode: 200,
    statusText: 'OK',
    durationMs: 340,
    attempt: 1,
    maxAttempts: 25,
    metadata: {
      subject: 'You have been invited to join Acme',
      job_id: 'job-7',
      hive_request_id: 'req-1',
      message_id: 'pm-1',
    },
    ...overrides,
  };
}

describe('EmailDeliveriesTable', () => {
  it('shows the recipient, the event, the provider answer and the retry, with the details on expand', () => {
    const { container } = render(
      <EmailDeliveriesTable
        deliveries={[
          delivery({
            ok: false,
            statusCode: 422,
            statusText: '406: You tried to send to a recipient that has been marked as inactive.',
            attempt: 3,
          }),
        ]}
      />,
    );

    expect(screen.getByText('invitee@example.com')).toBeTruthy();
    expect(screen.getByText('Invitation')).toBeTruthy();
    expect(
      screen.getByText(
        '422 406: You tried to send to a recipient that has been marked as inactive.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('3 of 25')).toBeTruthy();

    fireEvent.click(container.querySelector('tbody > tr')!);
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('You have been invited to join Acme')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy MESSAGE_ID' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy HIVE_REQUEST_ID' })).toBeTruthy();
  });

  it('says so when the history could not be read', () => {
    render(<EmailDeliveriesTable deliveries={null} />);

    expect(screen.getByText('Delivery history is unavailable right now.')).toBeTruthy();
  });
});
