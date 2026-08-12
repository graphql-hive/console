// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreflightPromptModal } from './preflight-prompt-modal';

const mount = (onSubmit: (value: string | null) => void) => {
  const onOpenChange = vi.fn();

  render(
    <PreflightPromptModal
      open
      onOpenChange={onOpenChange}
      title="Noun"
      placeholder="e.g. cat"
      onSubmit={onSubmit}
    />,
  );

  return { onOpenChange, input: () => screen.getByPlaceholderText('e.g. cat') };
};

describe('PreflightPromptModal', () => {
  it('renders the script-supplied title and description', () => {
    render(
      <PreflightPromptModal
        open
        onOpenChange={vi.fn()}
        title="API token"
        description="Used for this request only"
        placeholder="hv_..."
      />,
    );

    expect(screen.getByText('API token')).toBeDefined();
    expect(screen.getByText('Used for this request only')).toBeDefined();
    expect(screen.getByPlaceholderText('hv_...')).toBeDefined();
  });

  // A script can raise a prompt with no user action behind it (an operation run, or schema
  // polling), so the dialog's own voice has to stay the lab's.
  it('keeps the script out of the dialog title', () => {
    render(<PreflightPromptModal open onOpenChange={vi.fn()} title="Enter your Hive password" />);

    expect(screen.getByRole('heading', { name: 'Preflight script request' })).toBeDefined();
  });

  it('answers with null when cancelled, even with a valid value typed', async () => {
    const onSubmit = vi.fn();
    const { input, onOpenChange } = mount(onSubmit);

    fireEvent.change(input(), { target: { value: 'dog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(null));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('answers with the submitted value', async () => {
    const onSubmit = vi.fn();
    const { input } = mount(onSubmit);

    fireEvent.change(input(), { target: { value: 'dog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('dog'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // The script stays suspended on `lab.prompt()` until the modal answers, and an empty field
  // fails validation, so dismissing has to answer on the form's behalf.
  it('answers with null when dismissed with an empty field', async () => {
    const onSubmit = vi.fn();
    const { input, onOpenChange } = mount(onSubmit);

    fireEvent.change(input(), { target: { value: 'dog' } });
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(null));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the typed value when dismissed with a valid field', async () => {
    const onSubmit = vi.fn();
    const { input } = mount(onSubmit);

    fireEvent.change(input(), { target: { value: 'dog' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('dog'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('answers once when submitting and then dismissing', async () => {
    const onSubmit = vi.fn();
    const { input } = mount(onSubmit);

    fireEvent.change(input(), { target: { value: 'dog' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('dog'));

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
