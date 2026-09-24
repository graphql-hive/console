// @vitest-environment jsdom
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { UserSettingsModal } from './settings';

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

const me = { id: 'u1', fullName: 'Ada Lovelace', displayName: 'ada', canSwitchOrganization: true };

function renderModal() {
  const toggleModalOpen = vi.fn();
  const view = render(
    <ToastProvider>
      <UserSettingsModal isOpen toggleModalOpen={toggleModalOpen} />
    </ToastProvider>,
  );
  return { ...view, toggleModalOpen };
}

const fullNameInput = () => screen.getByLabelText('Full name') as HTMLInputElement;
const displayNameInput = () => screen.getByLabelText('Display name') as HTMLInputElement;

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  });
}

beforeEach(() => {
  urql.query.data = { me };
  urql.mutation.data = undefined;
  urql.mutation.error = undefined;
  urql.mutate.mockReset();
});

describe('UserSettingsModal', () => {
  it('starts on the profile the query returns', async () => {
    renderModal();
    await act(async () => {});
    expect(fullNameInput().value).toBe('Ada Lovelace');
    expect(displayNameInput().value).toBe('ada');
  });

  it('requires both names and sends nothing until they are there', async () => {
    renderModal();
    await act(async () => {
      fireEvent.change(fullNameInput(), { target: { value: '' } });
      fireEvent.change(displayNameInput(), { target: { value: '' } });
    });
    await submit();
    expect(screen.getByText('Full name is required')).toBeTruthy();
    expect(screen.getByText('Display name is required')).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('sends the edited profile, then closes and confirms', async () => {
    urql.mutate.mockResolvedValue({
      data: { updateMe: { ok: { updatedUser: { ...me, displayName: 'lovelace' } }, error: null } },
    });
    const { toggleModalOpen } = renderModal();
    await act(async () => {
      fireEvent.change(displayNameInput(), { target: { value: 'lovelace' } });
    });
    await submit();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: { fullName: 'Ada Lovelace', displayName: 'lovelace' },
    });
    expect(toggleModalOpen).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Profile updated')).toBeTruthy();
  });

  it('shows a rejected field under its input and the reason in a toast, and stays open', async () => {
    const result = {
      data: {
        updateMe: {
          ok: null,
          error: {
            message: 'Invalid input',
            inputErrors: { fullName: 'Full name is too long', displayName: null },
          },
        },
      },
    };
    urql.mutate.mockResolvedValue(result);
    const { toggleModalOpen, rerender } = renderModal();
    await submit();
    urql.mutation.data = result.data;
    rerender(
      <ToastProvider>
        <UserSettingsModal isOpen toggleModalOpen={toggleModalOpen} />
      </ToastProvider>,
    );
    expect(screen.getByText('Full name is too long')).toBeTruthy();
    // Under the form and in the toast.
    expect((await screen.findAllByText('Invalid input')).length).toBeGreaterThan(0);
    expect(toggleModalOpen).not.toHaveBeenCalled();
  });
});
