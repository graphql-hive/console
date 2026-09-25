import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/base/button/button';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { AlertDialog } from '../overlays/alert-dialog/alert-dialog';
import { Dialog } from '../overlays/dialog/dialog';
import { Sheet } from '../overlays/sheet/sheet';
import { FloatingPortalContainerProvider } from './floating-portal-container';
import { Menu } from './menu/menu';
import { Popover } from './popover/popover';
import { Select } from './select/select';

export const nav: NavPath = 'Base/Floating/PortalContainer';

/**
 * The contract every base floating component honours: if a `FloatingPortalContainerProvider` is
 * above it, its popup portals into that element instead of `<body>`.
 *
 * Why that matters is a modal. A Base UI `Dialog` makes everything outside its popup inert, so a
 * popup that portalled to `<body>` opens fine but cannot be clicked - or the click counts as
 * outside and dismisses the dialog. The first two cases here are the same bare modal and the same
 * three components; only the provider differs. Open each one and click an option.
 *
 * The bare `@base-ui/react/dialog` modal is fixture scaffolding to show the failure: every app
 * overlay goes through the base Dialog, Sheet and AlertDialog, which publish their popup as the
 * container themselves.
 */

const OPTIONS = [
  { value: 'p50', label: 'p50 latency' },
  { value: 'p95', label: 'p95 latency' },
  { value: 'p99', label: 'p99 latency' },
];

/** The three consumers, laid out the same way in every case. */
function FloatingTrio() {
  const [metric, setMetric] = useState('p95');
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-fg-default w-16 text-xs">Select</span>
        <Select options={OPTIONS} value={metric} onValueChange={setMetric} onSurface="raised" />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-fg-default w-16 text-xs">Popover</span>
        <Popover
          trigger={<Button label="Details" onSurface="raised" />}
          content={
            <p className="text-fg-default p-3 text-sm">
              If you can read this, the popover rendered inside the modal.
            </p>
          }
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-fg-default w-16 text-xs">Menu</span>
        <Menu
          trigger={<Button label={picked ?? 'Actions'} onSurface="raised" />}
          sections={[
            [
              { label: 'Duplicate', onClick: () => setPicked('Duplicate') },
              { label: 'Archive', onClick: () => setPicked('Archive') },
            ],
          ]}
        />
      </div>
      <p className="text-fg-secondary text-xs">
        Working: the Select changes, the Popover reads, the Menu label updates.
      </p>
    </div>
  );
}

/** A bare Base UI modal, the primitive under every overlay in the app. */
function BareModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withProvider: boolean;
}) {
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const body = (
    <BaseDialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="bg-neutral-1/1 fixed inset-0 z-50 backdrop-blur-sm" />
        <BaseDialog.Popup
          ref={setPopup}
          className="bg-neutral-3 border-line fixed left-1/2 top-1/2 z-50 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 outline-none"
        >
          <BaseDialog.Title className="text-fg mb-4 text-sm font-medium">
            {props.withProvider ? 'With the provider' : 'Without the provider'}
          </BaseDialog.Title>
          <FloatingTrio />
          <div className="mt-6 flex justify-end">
            <BaseDialog.Close render={<Button variant="outline">Close</Button>} />
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );

  return props.withProvider ? (
    <FloatingPortalContainerProvider container={popup}>{body}</FloatingPortalContainerProvider>
  ) : (
    body
  );
}

export const WithProvider = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open modal (provider present)
      </Button>
      <BareModal open={open} onOpenChange={setOpen} withProvider />
    </>
  );
});

/**
 * The control. Same modal, same three components, no provider: each popup portals to `<body>`
 * and lands outside the dialog, where it is inert. Open the Select and try to pick an option.
 */
export const WithoutProvider = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open modal (no provider)
      </Button>
      <BareModal open={open} onOpenChange={setOpen} withProvider={false} />
    </>
  );
});

/**
 * The base Dialog, Sheet and AlertDialog each publish their popup through the provider, so every
 * overlay in the app can host base floating components without per-call-site wiring. One case per
 * overlay.
 */
export const InsideDialog = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Open Dialog</Button>}
      title="Inside Dialog"
    >
      <FloatingTrio />
    </Dialog>
  );
});

export const InsideSheet = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Open Sheet</Button>}
      title="Inside Sheet"
    >
      <FloatingTrio />
    </Sheet>
  );
});

export const InsideAlertDialog = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Open AlertDialog</Button>}
      title="Inside AlertDialog"
      confirm={{ label: 'Done', onClick: () => setOpen(false) }}
    >
      <FloatingTrio />
    </AlertDialog>
  );
});
