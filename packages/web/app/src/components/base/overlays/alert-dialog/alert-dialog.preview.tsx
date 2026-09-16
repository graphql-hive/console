import { useState } from 'react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialog as LegacyAlertDialog,
} from '@/components/ui/alert-dialog';
import { Button as LegacyButton } from '@/components/ui/button';
import { Button } from '../../button/button';
import { Input } from '../../input/input';
import { AlertDialog } from './alert-dialog';

export const nav: NavPath = 'Base/Overlays/AlertDialog';

/**
 * A question with a confirm and a cancel. No × and no backdrop dismissal, so it can only be
 * answered. Confirm does not close the dialog by itself: every legacy call site controls `open`
 * and closes after its mutation, and four of them had to fight Radix's auto-close to do so.
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

/**
 * The same question on `ui/alert-dialog` and on base, for the gate. The legacy action prevents
 * the default so the dialog stays open, as the members list does.
 */
export const Legacy = createPreview(() => {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3">
      <LegacyButton variant="destructive" onClick={() => setLegacyOpen(true)}>
        Legacy
      </LegacyButton>
      <LegacyAlertDialog open={legacyOpen} onOpenChange={setLegacyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to every project in the organization. You can invite them again
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={event => {
                event.preventDefault();
                setLegacyOpen(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </LegacyAlertDialog>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button variant="destructive">Base</Button>}
        title="Remove member?"
        description="They lose access to every project in the organization. You can invite them again later."
        confirm={{ label: 'Remove', variant: 'destructive', onClick: () => setOpen(false) }}
      />
    </div>
  );
});

export const Playground = createPreview({
  controls: controlsFor(AlertDialog, {
    title: { type: 'text', default: 'Remove member?' },
    description: {
      type: 'text',
      default: 'They lose access to every project in the organization.',
    },
  }),
  render: v => (
    <AlertDialog
      trigger={<Button variant="destructive">Open</Button>}
      title={v.title}
      description={v.description}
      confirm={{ label: 'Remove', variant: 'destructive', onClick: () => {} }}
    />
  ),
});
