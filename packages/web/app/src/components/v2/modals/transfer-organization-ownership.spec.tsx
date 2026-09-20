// @vitest-environment jsdom
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import { makeFragmentData } from '@/gql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  TransferOrganizationOwnershipModal,
  TransferOrganizationOwnershipModal_OrganizationFragment,
} from './transfer-organization-ownership';

/** The stubs the mocked urql hooks read from; each test resets them. */
const urql = vi.hoisted(() => ({
  query: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  mutation: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  mutate: vi.fn(),
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useQuery: () => [urql.query, vi.fn()],
  useMutation: () => [urql.mutation, urql.mutate],
}));

const member = (id: string, displayName: string, email: string, isOwner = false) => ({
  node: { id: `m-${id}`, isOwner, user: { id, fullName: displayName, displayName, email } },
});

const organization = makeFragmentData(
  { __typename: 'Organization' as const, id: 'org-1', slug: 'acme' },
  TransferOrganizationOwnershipModal_OrganizationFragment,
);

function renderModal() {
  const toggleModalOpen = vi.fn();
  render(
    <ToastProvider>
      <TransferOrganizationOwnershipModal
        isOpen
        toggleModalOpen={toggleModalOpen}
        organization={organization}
      />
    </ToastProvider>,
  );
  return { toggleModalOpen };
}

const ownerTrigger = () => screen.getByRole('combobox', { name: 'New owner' });
const confirmationInput = () =>
  screen.getByLabelText('Type the name of this organization to confirm') as HTMLInputElement;
const transferButton = () =>
  screen.getByRole('button', { name: 'Transfer this organization' }) as HTMLButtonElement;

/** Base UI commits an option on mouse-up once its guard against the opening click has passed. */
async function pickOwner(name: string) {
  await act(async () => {
    fireEvent.click(ownerTrigger());
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
  });
  const option = screen.getByRole('option', { name: new RegExp(name) });
  await act(async () => {
    fireEvent.mouseMove(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option);
  });
  expect(ownerTrigger().textContent).toContain(name);
  await act(async () => {
    fireEvent.blur(ownerTrigger());
  });
}

async function confirmWith(value: string) {
  await act(async () => {
    fireEvent.change(confirmationInput(), { target: { value } });
    fireEvent.blur(confirmationInput());
  });
}

beforeEach(() => {
  urql.query.data = {
    organization: {
      id: 'org-1',
      slug: 'acme',
      members: {
        edges: [
          member('u-owner', 'Grace Hopper', 'grace@example.com', true),
          member('u-ada', 'Ada Lovelace', 'ada@example.com'),
          member('u-alan', 'Alan Turing', 'alan@example.com'),
        ],
      },
    },
  };
  urql.mutate.mockReset();
});

describe('TransferOrganizationOwnershipModal', () => {
  it('offers every member but the owner, and holds the transfer until both fields are set', async () => {
    renderModal();
    expect(transferButton().disabled).toBe(true);
    await act(async () => {
      fireEvent.click(ownerTrigger());
    });
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Alan Turing/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Grace Hopper/ })).toBeNull();
  });

  it('only accepts the organization slug as confirmation', async () => {
    renderModal();
    await pickOwner('Ada Lovelace');
    await confirmWith('acme-typo');
    expect(transferButton().disabled).toBe(true);
    await confirmWith('acme');
    expect(transferButton().disabled).toBe(false);
  });

  it('requests the transfer to the picked member, then closes and confirms', async () => {
    urql.mutate.mockResolvedValue({
      data: { requestOrganizationTransfer: { ok: { email: 'ada@example.com' }, error: null } },
    });
    const { toggleModalOpen } = renderModal();
    await pickOwner('Ada Lovelace');
    await confirmWith('acme');
    await act(async () => {
      fireEvent.click(transferButton());
    });
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: { organizationSlug: 'acme', userId: 'u-ada' },
    });
    expect(toggleModalOpen).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Ownership transfer requested')).toBeTruthy();
  });

  it('reports a refused transfer and stays open', async () => {
    urql.mutate.mockResolvedValue({
      data: {
        requestOrganizationTransfer: { ok: null, error: { message: 'Member is not verified' } },
      },
    });
    const { toggleModalOpen } = renderModal();
    await pickOwner('Ada Lovelace');
    await confirmWith('acme');
    await act(async () => {
      fireEvent.click(transferButton());
    });
    // The toast and its live-region mirror.
    expect((await screen.findAllByText('Member is not verified')).length).toBeGreaterThan(0);
    expect(toggleModalOpen).not.toHaveBeenCalled();
  });
});
