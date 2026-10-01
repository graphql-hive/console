// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { AlertDialog } from './alert-dialog';

describe('AlertDialog', () => {
  it('confirms without closing and cancels by closing', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Remove member?"
        description="They lose access."
        confirm={{
          label: 'Remove',
          variant: 'destructive',
          onClick: onConfirm,
          'data-cy': 'confirm',
        }}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove' }).getAttribute('data-cy')).toBe('confirm');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('labels the cancel, holds both while pending, and can drop the cancel', () => {
    const { rerender } = render(
      <AlertDialog
        open
        title="Discard draft?"
        confirm={{ label: 'Deleting...', onClick: () => {}, disabled: true }}
        cancel={{ label: 'Keep editing', disabled: true }}
      />,
    );
    expect(
      (screen.getByRole('button', { name: 'Keep editing' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Deleting...' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();

    rerender(
      <AlertDialog
        open
        title="Discard draft?"
        confirm={{ label: 'OK', onClick: () => {} }}
        cancel={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Keep editing' })).toBeNull();
    // Real buttons only: Floating UI's focus guards are spans with a button role.
    expect(screen.getByRole('alertdialog').querySelectorAll('button')).toHaveLength(1);
  });
});
