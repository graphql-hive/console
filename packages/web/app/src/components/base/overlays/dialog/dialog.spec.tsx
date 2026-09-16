// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './dialog';

describe('Dialog', () => {
  it('renders the title, description, body and footer when open, on the width rung', () => {
    render(
      <Dialog
        open
        width="lg"
        title="Create collection"
        description="Keeps operations together."
        footer={<button type="button">Create</button>}
        attrs={{ 'data-cy': 'create-collection' }}
      >
        <p>Body</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-cy')).toBe('create-collection');
    expect(dialog.className).toContain('max-w-[640px]');
    expect(screen.getByRole('heading', { name: 'Create collection' })).toBeTruthy();
    expect(screen.getByText('Keeps operations together.')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
  });

  it('closes from the corner button and hides it when told to', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Dialog open onOpenChange={onOpenChange} title="Rename" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());

    rerender(<Dialog open onOpenChange={onOpenChange} title="Rename" closeButton={false} />);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('renders nothing until opened, and opens from its trigger', () => {
    render(
      <Dialog trigger={<button type="button">Open it</button>} title="Welcome">
        <p>Hello</p>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
