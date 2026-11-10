// @vitest-environment jsdom
import { ToastProvider } from '@/components/ui/primitives/toast/toast';
import { makeFragmentData } from '@/gql';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CopyOperationButton,
  GraphQLOperationBody_OperationFragment,
} from './target-insights-operation';

vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

function renderButton(body: string | null) {
  const operation =
    body === null
      ? null
      : makeFragmentData(
          { __typename: 'Operation' as const, body },
          GraphQLOperationBody_OperationFragment,
        );
  return render(
    <ToastProvider>
      <CopyOperationButton operation={operation} />
    </ToastProvider>,
  );
}

describe('CopyOperationButton', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  it('copies the whole document, printed the way the body view shows it', async () => {
    renderButton('query Me{me{id}}');
    fireEvent.click(screen.getByRole('button', { name: 'Copy operation' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith('query Me {\n  me {\n    id\n  }\n}');
  });

  it('is disabled while there is nothing to copy', () => {
    renderButton(null);
    expect(screen.getByRole('button', { name: 'Copy operation' })).toHaveProperty('disabled', true);
    expect(writeText).not.toHaveBeenCalled();
  });
});
