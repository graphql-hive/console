// @vitest-environment jsdom
import type * as Urql from 'urql';
import { makeFragmentData } from '@/gql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CreateAlertModal,
  CreateAlertModal_AlertChannelFragment,
  CreateAlertModal_TargetFragment,
} from './create-alert';

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
const targets = ['production', 'staging'].map(slug =>
  makeFragmentData(
    { __typename: 'Target' as const, id: `t-${slug}`, slug },
    CreateAlertModal_TargetFragment,
  ),
);
const channels = [
  { id: 'ch-1', name: 'Slack alerts' },
  { id: 'ch-2', name: 'Ops hook' },
].map(channel =>
  makeFragmentData(
    { __typename: 'AlertSlackChannel' as const, ...channel },
    CreateAlertModal_AlertChannelFragment,
  ),
);

function renderModal() {
  const toggleModalOpen = vi.fn();
  // A fresh element each time, or React skips the update and never reads the mutation state.
  const element = () => (
    <CreateAlertModal
      isOpen
      toggleModalOpen={toggleModalOpen}
      targets={targets}
      channels={channels}
    />
  );
  const view = render(element());
  return { ...view, element, toggleModalOpen };
}

const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create Alert' }));
  });

/** Base UI commits a click on an option only while it is highlighted, which focusing it does. */
async function pick(name: string, label: string) {
  const trigger = () => screen.getByRole('combobox', { name });
  await act(async () => {
    fireEvent.click(trigger());
  });
  const option = screen.getByRole('option', { name: label });
  await act(async () => {
    option.focus();
  });
  await act(async () => {
    fireEvent.click(option);
  });
  expect(trigger().textContent).toContain(label);
  await act(async () => {
    fireEvent.blur(trigger());
  });
}

beforeEach(() => {
  urql.mutation.error = undefined;
  urql.mutate.mockReset();
});

describe('CreateAlertModal', () => {
  it('starts on the one alert type and needs a channel and a target', async () => {
    renderModal();
    expect(screen.getByRole('combobox', { name: 'Type' }).textContent).toContain(
      'Schema Change Notifications',
    );
    await submit();
    expect(screen.getByText(/Must select channel|channel must/)).toBeTruthy();
    expect(screen.getByText(/Must select target|target must/)).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('creates the alert for the picked channel and target, then closes', async () => {
    urql.mutate.mockResolvedValue({
      data: { addAlert: { ok: { updatedProject: { id: 'p1' } }, error: null } },
    });
    const { toggleModalOpen } = renderModal();
    await pick('Channel', 'Ops hook');
    await pick('Target', 'staging');
    await submit();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: {
        ...slugs,
        targetSlug: 'staging',
        channelId: 'ch-2',
        type: 'SCHEMA_CHANGE_NOTIFICATIONS',
      },
    });
    expect(toggleModalOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a failed request under the fields', () => {
    urql.mutation.error = { message: 'Network down' };
    renderModal();
    expect(screen.getByText('Network down')).toBeTruthy();
  });
});
