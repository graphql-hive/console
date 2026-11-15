// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { render, waitFor } from '@testing-library/react';
import { LaboratoryMount } from './target-laboratory-new';

const mocks = vi.hoisted(() => ({ Laboratory: vi.fn((_props: unknown) => null) }));

vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => ({ Editor: () => null, Laboratory: mocks.Laboratory }));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

const operation = (id: string) => ({
  id,
  name: id,
  query: `query ${id} { __typename }`,
  variables: '{}',
  headers: '{}',
  extensions: '{}',
});

function renderMount(props: Partial<ComponentProps<typeof LaboratoryMount>>) {
  const allProps = {
    targetId: 'target-a',
    linkedOperation: null,
    onLinkedOperationConsumed: vi.fn(),
    preflightScript: null,
    updatePreflight: vi.fn(),
    ...props,
  } as ComponentProps<typeof LaboratoryMount>;

  const view = render(
    <ToastProvider>
      <LaboratoryMount {...allProps} />
    </ToastProvider>,
  );

  return {
    ...view,
    rerenderWith: (next: Partial<ComponentProps<typeof LaboratoryMount>>) =>
      view.rerender(
        <ToastProvider>
          <LaboratoryMount {...allProps} {...next} />
        </ToastProvider>,
      ),
  };
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('LaboratoryMount', () => {
  it('drops a link that arrives while mounted instead of keeping it for the next mount', async () => {
    const onLinkedOperationConsumed = vi.fn();
    const { rerenderWith } = renderMount({ onLinkedOperationConsumed });
    await waitFor(() => expect(mocks.Laboratory).toHaveBeenCalled());
    onLinkedOperationConsumed.mockClear();

    rerenderWith({
      linkedOperation: { operation: operation('late'), matchBy: 'content' },
      onLinkedOperationConsumed,
    });

    expect(onLinkedOperationConsumed).toHaveBeenCalledTimes(1);
  });
});
