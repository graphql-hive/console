// @vitest-environment jsdom
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CreateCDNAccessTokenModal } from './cdn-access-tokens';

/** The stubs the mocked urql hooks read from; each test resets them. */
const urql = vi.hoisted(() => ({
  mutation: { data: undefined as unknown, fetching: false, error: undefined as unknown },
  mutate: vi.fn(),
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useMutation: () => [urql.mutation, urql.mutate],
}));

// The settings page imports resolve docs links through the env, which jsdom does not carry.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

const selector = { organizationSlug: 'acme', projectSlug: 'shop', targetSlug: 'production' };

// The modal reads the current target from the URL; here it renders outside a router.
vi.mock('@/lib/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useSlugs: () => selector,
}));

function renderModal() {
  const onCreateCDNAccessToken = vi.fn();
  const onClose = vi.fn();
  // A fresh element each time, or React skips the update and never reads the mutation state.
  const element = () => (
    <ToastProvider>
      <CreateCDNAccessTokenModal
        open
        onOpenChangeComplete={() => {}}
        onCreateCDNAccessToken={onCreateCDNAccessToken}
        onClose={onClose}
      />
    </ToastProvider>
  );
  const view = render(element());
  return { ...view, element, onCreateCDNAccessToken, onClose };
}

const aliasInput = () => screen.getByLabelText('CDN Access Token Alias') as HTMLInputElement;

async function submitWith(alias: string) {
  await act(async () => {
    fireEvent.change(aliasInput(), { target: { value: alias } });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  });
}

beforeEach(() => {
  urql.mutation.data = undefined;
  urql.mutate.mockReset();
});

describe('CreateCDNAccessTokenModal', () => {
  it('asks for an alias of at least 3 characters and sends nothing until then', async () => {
    renderModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });
    expect(screen.getByText('Please enter an alias')).toBeTruthy();
    await submitWith('ab');
    expect(screen.getByText(/at least 3 characters/)).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('creates the token for the target, then shows the secret once and reports it', async () => {
    const result = {
      data: {
        createCdnAccessToken: {
          error: null,
          ok: {
            createdCdnAccessToken: { id: 'tok-1' },
            secretAccessToken: 'hv2-secret',
          },
        },
      },
    };
    urql.mutate.mockResolvedValue(result);
    const { rerender, element, onCreateCDNAccessToken } = renderModal();
    await submitWith('edge cache');
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: { target: { bySelector: selector }, alias: 'edge cache' },
    });

    urql.mutation.data = result.data;
    rerender(element());
    expect(screen.getByText('hv2-secret')).toBeTruthy();
    expect(screen.getByText(/store this access token securely/)).toBeTruthy();
    expect(onCreateCDNAccessToken).toHaveBeenCalledTimes(1);
  });

  it('shows the failure in place of the form', async () => {
    const result = {
      data: { createCdnAccessToken: { error: { message: 'Alias already taken' }, ok: null } },
    };
    urql.mutate.mockResolvedValue(result);
    const { rerender, element, onCreateCDNAccessToken } = renderModal();
    await submitWith('edge cache');
    urql.mutation.data = result.data;
    rerender(element());
    expect(screen.getByText('Alias already taken')).toBeTruthy();
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
    expect(onCreateCDNAccessToken).not.toHaveBeenCalled();
  });
});
