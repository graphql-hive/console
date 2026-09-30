import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Input } from '../../input/input';
import { AlertDialog } from './alert-dialog';

export const nav: NavPath = 'Base/Overlays/AlertDialog';

/**
 * A question with a confirm and a cancel. No × and no backdrop dismissal, so it can only be
 * answered. Confirm does not close the dialog by itself: the call site controls `open` and closes
 * once its mutation finishes.
 */

export const Default = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="destructive">Remove member</Button>}
      title="Remove member?"
      description="They lose access to every project in the organization. You can invite them again later."
      confirm={{ label: 'Remove', variant: 'destructive', onClick: () => setOpen(false) }}
    />
  );
});

/** While the mutation runs the actions hold and the confirm says what is happening. */
export const Pending = createPreview(() => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!pending) setOpen(next);
      }}
      trigger={<Button variant="destructive">Delete role</Button>}
      title="Delete role?"
      description="Members with this role fall back to Viewer."
      confirm={{
        label: pending ? 'Deleting...' : 'Continue',
        variant: 'destructive',
        disabled: pending,
        onClick: () => {
          setPending(true);
          setTimeout(() => {
            setPending(false);
            setOpen(false);
          }, 1500);
        },
      }}
      cancel={{ disabled: pending }}
    />
  );
});

/** The token sheets: two ways forward and no plain cancel, so the cancel takes a label. */
export const TwoActions = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Close sheet</Button>}
      title="Discard the access token draft?"
      description="What you have entered so far will be lost."
      confirm={{ label: 'Discard', variant: 'destructive', onClick: () => setOpen(false) }}
      cancel={{ label: 'Keep editing' }}
    />
  );
});

/** A question that needs an answer typed in. */
export const WithField = createPreview(() => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="destructive">Delete project</Button>}
      title="Delete project?"
      description="Type the project slug to confirm. Every target and schema version goes with it."
      confirm={{
        label: 'Delete project',
        variant: 'destructive',
        disabled: value !== 'gateway',
        onClick: () => setOpen(false),
      }}
    >
      <Input
        onSurface="raised"
        placeholder="gateway"
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="Project slug"
      />
    </AlertDialog>
  );
});

export const Playground = createPreview({
  controls: {
    title: { type: 'text', default: 'Transfer ownership?' },
    description: {
      type: 'text',
      default: 'You will lose owner access once they accept.',
    },
    confirmLabel: { type: 'text', default: 'Transfer' },
    confirmVariant: { type: 'radio', options: ['primary', 'destructive'], default: 'primary' },
    confirmDisabled: { type: 'boolean', default: false },
    cancel: { type: 'radio', options: ['Cancel', 'custom label', 'none'], default: 'Cancel' },
    cancelLabel: { type: 'text', default: 'Keep editing' },
  },
  render: v => {
    const [open, setOpen] = useState(false);
    return (
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button>Open</Button>}
        title={v.title}
        description={v.description || undefined}
        confirm={{
          label: v.confirmLabel,
          variant: v.confirmVariant as 'primary' | 'destructive',
          disabled: v.confirmDisabled,
          onClick: () => setOpen(false),
        }}
        cancel={
          v.cancel === 'none' ? false : v.cancel === 'custom label' ? { label: v.cancelLabel } : {}
        }
      />
    );
  },
});
