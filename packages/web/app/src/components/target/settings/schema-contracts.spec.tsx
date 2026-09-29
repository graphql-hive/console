// @vitest-environment jsdom
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import { makeFragmentData } from '@/gql';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CreateContractDialog,
  CreateContractDialogContentTargetFragment,
} from './schema-contracts';

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

const target = makeFragmentData(
  {
    __typename: 'Target' as const,
    id: 't-1',
    latestSchemaVersion: {
      __typename: 'SchemaVersion' as const,
      id: 'v-1',
      tags: ['public', 'internal'],
    },
  },
  CreateContractDialogContentTargetFragment,
);

function renderDialog() {
  const onOpenChange = vi.fn();
  const onCreateContract = vi.fn();
  // A fresh element each time, or React skips the update and never reads the mutation state.
  const element = () => (
    <ToastProvider>
      <CreateContractDialog
        open
        onOpenChange={onOpenChange}
        onOpenChangeComplete={() => {}}
        target={target}
        onCreateContract={onCreateContract}
      />
    </ToastProvider>
  );
  const view = render(element());
  return { ...view, element, onOpenChange, onCreateContract };
}

const nameInput = () => screen.getByPlaceholderText('Contract Name') as HTMLInputElement;
const includeInput = () => screen.getByLabelText('Included Tags') as HTMLInputElement;
const excludeInput = () => screen.getByLabelText('Excluded Tags') as HTMLInputElement;
const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create Contract' }));
  });

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
}

beforeEach(() => {
  urql.mutation.data = undefined;
  urql.mutate.mockReset();
});

describe('CreateContractDialog', () => {
  it('needs a contract name before it sends anything', async () => {
    renderDialog();
    await submit();
    expect(screen.getByText('Required')).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('collects tags from the field by Add and Enter, from the suggestions, and drops them again', async () => {
    renderDialog();
    const addButtons = () => screen.getAllByRole('button', { name: 'Add' });

    await type(includeInput(), 'public');
    await act(async () => {
      fireEvent.click(addButtons()[0]);
    });
    expect(screen.getByRole('button', { name: 'Remove public' })).toBeTruthy();
    expect(includeInput().value).toBe('');

    await type(includeInput(), 'public');
    await act(async () => {
      fireEvent.keyDown(includeInput(), { key: 'Enter' });
    });
    expect(screen.getAllByRole('button', { name: 'Remove public' }).length).toBe(1);

    await act(async () => {
      fireEvent.focus(excludeInput());
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'internal' }));
    });
    expect(screen.getByRole('button', { name: 'Remove internal' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove public' }));
    });
    expect(screen.queryByRole('button', { name: 'Remove public' })).toBeNull();
  });

  it('creates the contract for the target with its tags and the type pruning choice', async () => {
    urql.mutate.mockResolvedValue({
      data: { createContract: { ok: { createdContract: { id: 'c-1' } }, error: null } },
    });
    const { onOpenChange, onCreateContract } = renderDialog();
    await type(nameInput(), 'Public API');
    await type(includeInput(), 'public');
    await act(async () => {
      fireEvent.keyDown(includeInput(), { key: 'Enter' });
    });
    await type(excludeInput(), 'internal');
    await act(async () => {
      fireEvent.keyDown(excludeInput(), { key: 'Enter' });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox'));
    });
    await submit();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: {
        target: { byId: 't-1' },
        contractName: 'Public API',
        includeTags: ['public'],
        excludeTags: ['internal'],
        removeUnreachableTypesFromPublicApiSchema: false,
      },
    });
    expect(onCreateContract).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((await screen.findAllByText('Contract created')).length).toBeGreaterThan(0);
  });

  it('shows what the server rejected under each field and stays open', async () => {
    const result = {
      data: {
        createContract: {
          ok: null,
          error: {
            message: 'Invalid input',
            details: {
              target: null,
              contractName: 'Name is taken',
              includeTags: 'Unknown tag',
              excludeTags: null,
            },
          },
        },
      },
    };
    urql.mutate.mockResolvedValue(result);
    const { rerender, element, onOpenChange } = renderDialog();
    await type(nameInput(), 'Public API');
    await submit();
    urql.mutation.data = result.data;
    rerender(element());
    expect(screen.getByText('Name is taken')).toBeTruthy();
    expect(screen.getByText('Unknown tag')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
