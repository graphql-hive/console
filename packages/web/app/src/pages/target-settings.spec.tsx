// @vitest-environment jsdom
import type { ReactNode } from 'react';
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import type * as Router from '@tanstack/react-router';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GraphQLEndpointUrl } from './target-settings';

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
