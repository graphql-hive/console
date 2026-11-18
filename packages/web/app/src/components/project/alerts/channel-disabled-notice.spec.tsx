// @vitest-environment jsdom
import type * as Urql from 'urql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChannelDisabledNotice } from './channel-disabled-notice';

/** The stubs the mocked urql hook reads from; each test resets them. */
const urql = vi.hoisted(() => ({
  mutation: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  mutate: vi.fn(),
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useMutation: () => [urql.mutation, urql.mutate],
}));

// The notice reports through the app's toast provider; here it renders outside it.
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/primitives/toast/toast', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/ui/primitives/toast/toast')>()),
  useToast: () => ({ toast }),
}));

const enable = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Enable channel' }));
  });

beforeEach(() => {
  urql.mutate.mockReset();
  toast.mockReset();
});

describe('ChannelDisabledNotice', () => {
  it('says why the channel is silent and enables it', async () => {
    urql.mutate.mockResolvedValue({
      data: { enableAlertChannel: { ok: { enabledAlertChannel: { id: 'c1' } }, error: null } },
    });
    render(<ChannelDisabledNotice channelId="c1" disabledAt={new Date().toISOString()} />);

    expect(screen.getByText(/Hive disabled this channel/)).toBeTruthy();
    expect(screen.getByText(/failing for 48 hours/)).toBeTruthy();
    await enable();

    expect(urql.mutate).toHaveBeenCalledWith({ input: { channelId: 'c1' } });
    expect(toast).toHaveBeenCalledWith({ title: 'Channel enabled.' });
  });

  it('reports a refusal instead of claiming success', async () => {
    urql.mutate.mockResolvedValue({
      data: {
        enableAlertChannel: {
          ok: null,
          error: { message: 'Alert channel not found or already enabled.' },
        },
      },
    });
    render(<ChannelDisabledNotice channelId="c1" disabledAt={new Date().toISOString()} />);

    await enable();

    expect(toast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'Failed to enable channel.',
      description: 'Alert channel not found or already enabled.',
    });
  });
});
