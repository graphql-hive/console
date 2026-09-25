// @vitest-environment jsdom
import type * as Urql from 'urql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CreateChannelModal } from './create-channel';

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

// The modal reads the current project from the URL; here it renders outside a router.
vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSlugs: () => slugs,
}));

function renderModal() {
  const toggleModalOpen = vi.fn();
  // A fresh element each time, or React skips the update and never reads the mutation state.
  const element = () => <CreateChannelModal isOpen toggleModalOpen={toggleModalOpen} />;
  const view = render(element());
  return { ...view, element, toggleModalOpen };
}

const typeTrigger = () => screen.getByRole('combobox', { name: 'Type' });
const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create Channel' }));
  });

/** Base UI commits a click on an option only while it is highlighted, which focusing it does. */
async function pickType(label: string) {
  await act(async () => {
    fireEvent.click(typeTrigger());
  });
  const option = screen.getByRole('option', { name: label });
  await act(async () => {
    option.focus();
  });
  await act(async () => {
    fireEvent.click(option);
  });
  expect(typeTrigger().textContent).toContain(label);
  await act(async () => {
    fireEvent.blur(typeTrigger());
  });
}

async function fill(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await act(async () => {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  });
}

beforeEach(() => {
  urql.mutation.data = undefined;
  urql.mutate.mockReset();
});

describe('CreateChannelModal', () => {
  it('needs a name and a type before it sends anything', async () => {
    renderModal();
    await submit();
    expect(screen.getByText('Must enter name')).toBeTruthy();
    expect(screen.getByText(/Must select type|type must be one of/)).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('creates a Slack channel that has to start with # or @, then closes', async () => {
    urql.mutate.mockResolvedValue({
      data: { addAlertChannel: { ok: { updatedProject: { id: 'p1' } }, error: null } },
    });
    const { toggleModalOpen } = renderModal();
    await fill('Name', 'Hive alerts');
    await pickType('Slack');
    expect(screen.queryByLabelText('Endpoint')).toBeNull();
    await fill('Slack Channel', 'general');
    expect(screen.getByText('Must start with a @ or # character')).toBeTruthy();
    await fill('Slack Channel', '#general');
    await submit();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: {
        ...slugs,
        name: 'Hive alerts',
        type: 'SLACK',
        slack: { channel: '#general' },
        webhook: null,
      },
    });
    expect(toggleModalOpen).toHaveBeenCalledTimes(1);
  });

  it('creates a webhook channel with a valid endpoint', async () => {
    urql.mutate.mockResolvedValue({
      data: { addAlertChannel: { ok: { updatedProject: { id: 'p1' } }, error: null } },
    });
    renderModal();
    await fill('Name', 'Ops hook');
    await pickType('Webhook');
    expect(screen.queryByLabelText('Slack Channel')).toBeNull();
    await fill('Endpoint', 'not a url');
    expect(screen.getByText(/valid URL/)).toBeTruthy();
    await fill('Endpoint', 'https://hooks.example.com/hive');
    await submit();
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: {
        ...slugs,
        name: 'Ops hook',
        type: 'WEBHOOK',
        slack: null,
        webhook: { endpoint: 'https://hooks.example.com/hive' },
      },
    });
  });

  it('points at the setup guide for MS Teams until an endpoint is pasted in', async () => {
    renderModal();
    await pickType('MS Teams Webhook');
    const guide = /set up an incoming webhook connector in MS Teams/;
    expect(screen.getByRole('link', { name: guide })).toBeTruthy();
    await fill('Endpoint', 'https://teams.example.com/hook');
    expect(screen.queryByRole('link', { name: guide })).toBeNull();
  });

  it('shows what the server rejected under its field and stays open', async () => {
    const result = {
      data: {
        addAlertChannel: {
          ok: null,
          error: {
            message: 'Invalid input',
            inputErrors: { name: 'Name is taken', webhookEndpoint: null, slackChannel: null },
          },
        },
      },
    };
    urql.mutate.mockResolvedValue(result);
    const { rerender, element, toggleModalOpen } = renderModal();
    await fill('Name', 'Hive alerts');
    await pickType('Slack');
    await fill('Slack Channel', '#general');
    await submit();
    urql.mutation.data = result.data;
    rerender(element());
    expect(screen.getByText('Name is taken')).toBeTruthy();
    expect(toggleModalOpen).not.toHaveBeenCalled();
  });
});
