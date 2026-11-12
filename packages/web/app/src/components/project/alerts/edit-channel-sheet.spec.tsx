// @vitest-environment jsdom
import type * as Urql from 'urql';
import { AlertChannelType } from '@/gql/graphql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EditChannelSheet, type EditableChannel } from './edit-channel-sheet';

/** The stubs the mocked urql hooks read from; each test resets them. */
const urql = vi.hoisted(() => ({
  mutation: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  mutate: vi.fn(),
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useMutation: () => [urql.mutation, urql.mutate],
}));

const slugs = { organizationSlug: 'acme', projectSlug: 'shop' };

// The sheet reads the current project from the URL and reports through the app's toast provider;
// here it renders outside both.
vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSlugs: () => slugs,
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/primitives/toast/toast', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/ui/primitives/toast/toast')>()),
  useToast: () => ({ toast }),
}));

const webhookChannel: EditableChannel = {
  id: 'c1',
  name: 'Ops hook',
  type: AlertChannelType.Webhook,
  destination: 'https://hooks.example.com/hive',
};

async function open(channel: EditableChannel) {
  render(<EditChannelSheet channel={channel} />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit channel' }));
  });
}

async function fill(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await act(async () => {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  });
}

const save = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  });

beforeEach(() => {
  urql.mutation.data = undefined;
  urql.mutate.mockReset();
  toast.mockReset();
});

describe('EditChannelSheet', () => {
  it('starts from the channel, keeps its type, and sends only what changed', async () => {
    urql.mutate.mockResolvedValue({
      data: { updateAlertChannel: { ok: { updatedAlertChannel: { id: 'c1' } }, error: null } },
    });
    await open(webhookChannel);

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Ops hook');
    expect(screen.getByLabelText('Endpoint')).toHaveProperty('value', webhookChannel.destination);
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveProperty('disabled', true);

    await fill('Name', 'Ops hook (prod)');
    await save();

    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: { ...slugs, channelId: 'c1', name: 'Ops hook (prod)', slack: null, webhook: null },
    });
    expect(toast).toHaveBeenCalledWith({ title: 'Channel updated.' });
  });

  it('moves a Slack channel by sending the new channel alone', async () => {
    urql.mutate.mockResolvedValue({
      data: { updateAlertChannel: { ok: { updatedAlertChannel: { id: 'c2' } }, error: null } },
    });
    await open({ id: 'c2', name: 'Team', type: AlertChannelType.Slack, destination: '#alerts' });

    await fill('Slack Channel', '#alerts-prod');
    await save();

    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: {
        ...slugs,
        channelId: 'c2',
        name: null,
        slack: { channel: '#alerts-prod' },
        webhook: null,
      },
    });
  });

  it('closes without a request when nothing changed, and shows what the server rejected under its field', async () => {
    const rejected = {
      data: {
        updateAlertChannel: {
          ok: null,
          error: {
            message: 'Please check your input.',
            inputErrors: {
              name: null,
              webhookEndpoint: 'URL must be at most 500 characters long',
              slackChannel: null,
            },
          },
        },
      },
    };
    urql.mutate.mockResolvedValue(rejected);
    await open(webhookChannel);

    await save();
    expect(urql.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Edit channel' }));
    });
    await fill('Endpoint', 'https://hooks.example.com/other');
    await save();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('URL must be at most 500 characters long')).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });
});
