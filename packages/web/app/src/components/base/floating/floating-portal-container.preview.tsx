import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/base/button/button';
import { DialogContent, DialogTitle, Dialog as UiDialog } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Modal } from '@/components/v2/modal';
import * as Dialog from '@radix-ui/react-dialog';
import { FloatingPortalContainerProvider } from './floating-portal-container';
import { Menu } from './menu/menu';
import { Popover } from './popover/popover';
import { Select } from './select/select';

export const nav: NavPath = 'Base/Floating/PortalContainer';

/**
 * The contract every base floating component honours: if a `FloatingPortalContainerProvider` is
 * above it, its popup portals into that element instead of `<body>`.
 *
 * Why that matters is a modal. A Radix `Dialog` in modal mode puts `pointer-events: none` on
 * everything outside its content, so a popup that portalled to `<body>` opens fine but cannot be
 * clicked - or the click counts as outside and dismisses the dialog. The three cases here are the
 * same modal and the same three components; only the provider differs. Open each one and click an
 * option.
 *
 * The Radix `Dialog`, `ui/dialog`, `ui/sheet` and `v2/modal` imports are fixture scaffolding: the
 * base Dialog replaces them in round 6, and they are here to prove their wiring until then. None
 * belongs in a component.
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
        <span className="text-neutral-11 w-16 text-xs">Select</span>
        <Select options={OPTIONS} value={metric} onValueChange={setMetric} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-neutral-11 w-16 text-xs">Popover</span>
        <Popover
          trigger={<Button label="Details" />}
          content={
            <p className="text-neutral-11 p-3 text-sm">
              If you can read this, the popover rendered inside the modal.
            </p>
          }
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-neutral-11 w-16 text-xs">Menu</span>
        <Menu
          trigger={<Button label={picked ?? 'Actions'} />}
          sections={[
            [
              { label: 'Duplicate', onClick: () => setPicked('Duplicate') },
              { label: 'Archive', onClick: () => setPicked('Archive') },
            ],
          ]}
        />
      </div>
      <p className="text-neutral-10 text-xs">
        Working: the Select changes, the Popover reads, the Menu label updates.
      </p>
    </div>
  );
}

/** A bare Radix modal Dialog, the primitive under every overlay in the app today. */
function RadixModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withProvider: boolean;
}) {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const body = (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-neutral-5/80 fixed inset-0 z-50" />
        <Dialog.Content
          ref={setContent}
          className="bg-neutral-1 border-neutral-5 fixed left-1/2 top-1/2 z-50 w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-md border p-6"
        >
          <Dialog.Title className="text-neutral-12 mb-4 text-sm font-medium">
            {props.withProvider ? 'With the provider' : 'Without the provider'}
          </Dialog.Title>
          <FloatingTrio />
          <Dialog.Close asChild>
            <div className="mt-6 flex justify-end">
              <Button variant="outline">Close</Button>
            </div>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return props.withProvider ? (
    <FloatingPortalContainerProvider container={content}>{body}</FloatingPortalContainerProvider>
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
      <RadixModal open={open} onOpenChange={setOpen} withProvider />
    </>
  );
});

/**
 * The control. Same modal, same three components, no provider: each popup portals to `<body>`
 * and lands outside the dialog's pointer-events boundary. Open the Select and try to pick an
 * option.
 */
export const WithoutProvider = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open modal (no provider)
      </Button>
      <RadixModal open={open} onOpenChange={setOpen} withProvider={false} />
    </>
  );
});

/**
 * `ui/dialog`, `ui/sheet` and `v2/modal` each publish their content element through the
 * provider, so every overlay in the app can host base floating components without per-call-site
 * wiring. One case per overlay.
 */
export const InsideUiDialog = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open ui/dialog
      </Button>
      <UiDialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Inside ui/dialog</DialogTitle>
          <FloatingTrio />
        </DialogContent>
      </UiDialog>
    </>
  );
});

export const InsideUiSheet = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open ui/sheet
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-4">
          <SheetTitle>Inside ui/sheet</SheetTitle>
          <FloatingTrio />
        </SheetContent>
      </Sheet>
    </>
  );
});

export const InsideV2Modal = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open v2 modal
      </Button>
      <Modal open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-4">
          <span className="text-neutral-12 text-sm font-medium">Inside v2/modal</span>
          <FloatingTrio />
        </div>
      </Modal>
    </>
  );
});
