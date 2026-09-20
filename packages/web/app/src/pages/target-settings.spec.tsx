// @vitest-environment jsdom
import type { ReactNode } from 'react';
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import type * as Router from '@tanstack/react-router';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DangerousChangeType } from '@/gql/graphql';
import { DangerousChangeTypeForm, GraphQLEndpointUrl } from './target-settings';

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

// The page resolves docs links and the app origin through the env, which jsdom does not carry.
vi.mock('@/env/frontend', () => ({
  env: {
    appBaseUrl: 'http://localhost:3000',
    graphqlPublicOrigin: 'http://localhost:3001',
    docsUrl: 'https://the-guild.dev/graphql/hive/docs',
  },
}));

// The page also mounts the Monaco editor and router links, neither of which runs in jsdom.
vi.mock('@/components/schema-editor', () => ({ SchemaEditor: () => null }));
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof Router>()),
  Link: (props: { children?: ReactNode }) => <a href="#">{props.children}</a>,
  useRouter: () => ({ navigate: vi.fn() }),
}));

const selector = { organizationSlug: 'acme', projectSlug: 'shop', targetSlug: 'production' };

describe('GraphQLEndpointUrl', () => {
  function renderForm(graphqlEndpointUrl: string | null) {
    // A fresh element each time, or React skips the update and never reads the mutation state.
    const element = () => (
      <ToastProvider>
        <GraphQLEndpointUrl graphqlEndpointUrl={graphqlEndpointUrl} {...selector} />
      </ToastProvider>
    );
    const view = render(element());
    return { ...view, element };
  }

  const urlInput = () => screen.getByPlaceholderText('Endpoint Url') as HTMLInputElement;
  const save = () =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

  async function type(value: string) {
    await act(async () => {
      fireEvent.change(urlInput(), { target: { value } });
      fireEvent.blur(urlInput());
    });
  }

  beforeEach(() => {
    urql.mutation.data = undefined;
    urql.mutate.mockReset();
  });

  it('starts on the saved endpoint and refuses anything that is not a URL', async () => {
    renderForm('https://api.example.com/graphql');
    expect(urlInput().value).toBe('https://api.example.com/graphql');
    expect(urlInput().getAttribute('name')).toBe('graphqlEndpointUrl');
    await type('nope');
    expect(screen.getByText('Please enter a valid url.')).toBeTruthy();
    await save();
    expect(urql.mutate).not.toHaveBeenCalled();
  });

  it('saves the endpoint for the target and confirms', async () => {
    urql.mutate.mockResolvedValue({
      data: {
        updateTargetGraphQLEndpointUrl: {
          ok: { target: { id: 't-1', graphqlEndpointUrl: 'https://api.example.com/v2' } },
          error: null,
        },
      },
    });
    renderForm(null);
    await type('https://api.example.com/v2');
    await save();
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      input: { target: { bySelector: selector }, graphqlEndpointUrl: 'https://api.example.com/v2' },
    });
    expect(
      (await screen.findAllByText('GraphQL endpoint url updated successfully')).length,
    ).toBeGreaterThan(0);
  });

  it('reports a refused endpoint', async () => {
    const result = {
      data: {
        updateTargetGraphQLEndpointUrl: { ok: null, error: { message: 'Endpoint unreachable' } },
      },
    };
    urql.mutate.mockResolvedValue(result);
    const { rerender, element } = renderForm(null);
    await type('https://api.example.com/v2');
    await save();
    urql.mutation.data = result.data;
    rerender(element());
    expect((await screen.findAllByText('Endpoint unreachable')).length).toBeGreaterThan(0);
  });
});

describe('DangerousChangeTypeForm', () => {
  function renderForm(props: {
    considerDangerousAsBreaking?: boolean;
    failAll?: boolean;
    types?: DangerousChangeType[];
  }) {
    const element = (override: typeof props = props) => (
      <ToastProvider>
        <DangerousChangeTypeForm
          considerDangerousAsBreaking={override.considerDangerousAsBreaking ?? true}
          initialFailAllDangerousChanges={override.failAll ?? false}
          initialFailingChangeTypes={override.types ?? []}
          {...selector}
        />
      </ToastProvider>
    );
    const view = render(element());
    return { ...view, element };
  }

  const failAllBox = () => screen.getAllByRole('checkbox')[0] as HTMLElement;
  const typeBox = (label: string) =>
    screen.getByText(label).closest('div')!.querySelector('[role="checkbox"]') as HTMLElement;
  const saveButton = () =>
    screen.getByRole('button', { name: 'Save selections' }) as HTMLButtonElement;
  const click = (element: HTMLElement) =>
    act(async () => {
      fireEvent.click(element);
    });

  beforeEach(() => {
    urql.mutate.mockReset();
  });

  it('starts from the saved selection and holds Save until something changes', async () => {
    renderForm({ types: [DangerousChangeType.EnumValueAdded] });
    expect(failAllBox().getAttribute('aria-checked')).toBe('false');
    expect(typeBox('ENUM_VALUE_ADDED').getAttribute('aria-checked')).toBe('true');
    expect(typeBox('INPUT_FIELD_ADDED').getAttribute('aria-checked')).toBe('false');
    expect(saveButton().disabled).toBe(true);

    await click(typeBox('INPUT_FIELD_ADDED'));
    expect(saveButton().disabled).toBe(false);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('saves the picked types for the target and settles once the target refreshes', async () => {
    urql.mutate.mockResolvedValue({
      data: { updateTargetFailingDangerousChanges: { ok: { target: { id: 't-1' } }, error: null } },
    });
    const { rerender, element } = renderForm({ types: [DangerousChangeType.EnumValueAdded] });
    await click(typeBox('INPUT_FIELD_ADDED'));
    await click(saveButton());
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      selector,
      failingChangeTypes: [DangerousChangeType.EnumValueAdded, DangerousChangeType.InputFieldAdded],
      failAllDangerousChanges: false,
    });

    rerender(
      element({
        types: [DangerousChangeType.EnumValueAdded, DangerousChangeType.InputFieldAdded],
      }),
    );
    expect(screen.getByText('Saved just now')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('refuses an empty selection unless every dangerous change fails', async () => {
    urql.mutate.mockResolvedValue({
      data: { updateTargetFailingDangerousChanges: { ok: { target: { id: 't-1' } }, error: null } },
    });
    renderForm({ types: [DangerousChangeType.EnumValueAdded] });
    await click(typeBox('ENUM_VALUE_ADDED'));
    await click(saveButton());
    expect(screen.getByText(/at least 1/)).toBeTruthy();
    expect(urql.mutate).not.toHaveBeenCalled();

    await click(failAllBox());
    expect(typeBox('ENUM_VALUE_ADDED').getAttribute('aria-disabled')).toBe('true');
    await click(saveButton());
    expect(urql.mutate).toHaveBeenCalledTimes(1);
    expect(urql.mutate.mock.calls[0][0]).toEqual({
      selector,
      failingChangeTypes: [],
      failAllDangerousChanges: true,
    });
  });

  it('reports a refused save', async () => {
    urql.mutate.mockResolvedValue({
      data: {
        updateTargetFailingDangerousChanges: { ok: null, error: { message: 'Not allowed' } },
      },
    });
    renderForm({ types: [DangerousChangeType.EnumValueAdded] });
    await click(typeBox('INPUT_FIELD_ADDED'));
    await click(saveButton());
    expect(screen.getByText('Dangerous change types were not updated.')).toBeTruthy();
    expect(screen.getByText('Not allowed')).toBeTruthy();
  });

  it('is inert while dangerous changes are not treated as breaking', () => {
    renderForm({ considerDangerousAsBreaking: false, types: [DangerousChangeType.EnumValueAdded] });
    expect(failAllBox().getAttribute('aria-disabled')).toBe('true');
    expect(typeBox('ENUM_VALUE_ADDED').getAttribute('aria-disabled')).toBe('true');
    expect(saveButton().disabled).toBe(true);
  });
});
