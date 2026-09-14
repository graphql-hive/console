import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Toast';

/**
 * The toast system: `ui/toast` (the Radix primitives), `ui/toaster` (the renderer, mounted once in
 * `router.tsx`) and `ui/use-toast` (the store and the `toast()` function).
 *
 * Every preview below mounts the real `<Toaster />` and calls the real `toast()`, so these are the
 * actual toasts, not a reconstruction. The store is a module-level singleton, so a toast fired from
 * one preview stays visible while you navigate to another.
 *
 * `TOAST_LIMIT` is 1, so firing a second toast replaces the first rather than stacking.
 */

const ENTRIES = [
  {
    source: '97 of 158 calls',
    origin: 'ui',
    what: "variant: 'destructive' — by far the commonest toast is a failure",
    coveredBy: 'Variants',
  },
  {
    source: '60 of 158 calls (38 omit variant, 22 pass default explicitly)',
    origin: 'ui',
    what: 'The default toast, used for successes and confirmations alike',
    coveredBy: 'Variants',
  },
  {
    source: 'pages/target-insights-manage-filters.tsx:614',
    origin: 'ui',
    what: "variant: 'success' — used exactly once in the entire app",
    coveredBy: 'Variants',
  },
  {
    source: 'components/ui/toast.tsx:32',
    origin: 'ui',
    what: "variant: 'warning' — declared and never used",
    coveredBy: 'Variants',
  },
  {
    source: '44 files, 158 calls',
    origin: 'ui',
    what: 'title 156, description 146, variant 120 — a three-key API',
    coveredBy: 'The real API',
  },
  {
    source:
      'Toast, ToastTitle, ToastDescription, ToastClose, ToastAction, ToastViewport, ToastProvider',
    origin: 'ui',
    what: 'All 7 sub-exports have zero call sites outside toaster.tsx',
    coveredBy: 'The real API',
  },
  {
    source: 'components/ui/use-toast.ts:5, :6',
    origin: 'ui',
    what: 'TOAST_LIMIT 1 and TOAST_REMOVE_DELAY 1,000,000ms — toasts do not auto-dismiss',
    coveredBy: 'Limit and dismiss',
  },
  {
    source: "'Error' ×19, 'An error occurred' ×13, 'Success' ×9",
    origin: 'ui',
    what: 'Generic titles, written three different ways for the same situation',
    coveredBy: 'Copy',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/toast, ui/toaster and ui/use-toast"
      summary={
        <>
          <strong>158 toast() calls across 44 files, and a one-function public API.</strong> Every
          one of the seven <code>ui/toast</code> sub-exports — <code>Toast</code>,{' '}
          <code>ToastTitle</code>, <code>ToastDescription</code>, <code>ToastClose</code>,{' '}
          <code>ToastAction</code>, <code>ToastViewport</code>, <code>ToastProvider</code> — has
          zero call sites outside <code>toaster.tsx</code>. Nothing in the app composes a toast; it
          calls <code>toast(&#123; title, description, variant &#125;)</code> and that is all.
          <br />
          <br />
          <strong>Two of four variants are effectively dead.</strong> <code>destructive</code> is 97
          of 158 calls, the default covers 60, <code>success</code> is used <em>once</em>, and{' '}
          <code>warning</code> is never used at all. The app is overwhelmingly reporting failures.
          <br />
          <br />
          <strong>Toasts never auto-dismiss.</strong> <code>TOAST_REMOVE_DELAY</code> is{' '}
          <code>1_000_000</code> ms — about 16 minutes. Combined with <code>TOAST_LIMIT = 1</code>,
          a toast sits on screen until the user closes it or another replaces it. Both values are
          inherited from the shadcn source rather than chosen.
          <br />
          <br />
          <strong>
            The <code>action</code> slot is plumbed but unused.
          </strong>{' '}
          <code>ToasterToast</code> carries an <code>action?: ToastActionElement</code>,{' '}
          <code>Toaster</code> renders it, and no call site ever passes one.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

/** Mounts the real Toaster so the previews below show real toasts. */
function ToastHarness(props: { children: React.ReactNode }) {
  return (
    <>
      {props.children}
      <Toaster />
    </>
  );
}

// ---------------------------------------------------------------------------
// The four declared variants, two of which the app never reaches.
// ---------------------------------------------------------------------------

export const Variants = createPreview({
  label: 'Variants',
  render: () => <VariantButtons />,
});

function VariantButtons() {
  const { toast } = useToast();

  return (
    <ToastHarness>
      <CallSite
        source="components/ui/toast.tsx:28"
        origin="ui"
        note="Fire each in turn. TOAST_LIMIT is 1, so each one replaces the last rather than stacking - click two quickly to see that. destructive and success invert to a light foreground on a saturated fill; default stays on the neutral surface."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast({ title: 'Member role updated', description: 'Changes have been saved.' })
            }
          >
            default · 60
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'Failed to update the member role',
                description: 'You do not have permission to perform this action.',
              })
            }
          >
            destructive · 97
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'success',
                title: 'Filter updated',
                description: 'The saved filter has been updated.',
              })
            }
          >
            success · 1
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'warning',
                title: 'Warning',
                description: 'This variant is declared but no call site uses it.',
              })
            }
          >
            warning · 0
          </Button>
        </div>
      </CallSite>
    </ToastHarness>
  );
}

// ---------------------------------------------------------------------------
// What the API actually is, once you count call sites rather than exports.
// ---------------------------------------------------------------------------

export const TheRealApi = createPreview({
  label: 'The real API',
  render: () => <RealApiButtons />,
});

function RealApiButtons() {
  const { toast } = useToast();

  return (
    <ToastHarness>
      <div className="flex flex-col gap-8">
        <CallSite
          source="components/organization/members/roles.tsx:161 and 157 more"
          origin="ui"
          note="The shape of essentially every toast in the app: a title, a description that is usually a server error message, and a variant. 156 of 158 calls pass title, 146 pass description."
        >
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'Failed to update the member role',
                description: 'Role name must be unique within the organization.',
              })
            }
          >
            title + description + variant
          </Button>
        </CallSite>

        <CallSite
          source="12 of 158 calls"
          origin="ui"
          note="Title only. Reads noticeably emptier because the toast keeps its p-6 padding either way."
        >
          <Button variant="outline" onClick={() => toast({ title: 'Copied to clipboard' })}>
            title only
          </Button>
        </CallSite>

        <CallSite
          source="components/ui/toaster.tsx:12"
          origin="ui"
          note="A long description, which is the realistic case since most descriptions are raw server error text. The toast is fixed-width, so it wraps rather than growing sideways."
        >
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'An error occurred',
                description:
                  'Schema composition failed: Field "User.email" is defined in subgraph "accounts" but is not resolvable from subgraph "reviews". Check that the field is marked @shareable or resolvable via @key.',
              })
            }
          >
            long description
          </Button>
        </CallSite>
      </div>
    </ToastHarness>
  );
}

// ---------------------------------------------------------------------------
// TOAST_LIMIT and TOAST_REMOVE_DELAY.
// ---------------------------------------------------------------------------

export const LimitAndDismiss = createPreview({
  label: 'Limit and dismiss',
  render: () => <LimitButtons />,
});

function LimitButtons() {
  const { toast, dismiss } = useToast();

  return (
    <ToastHarness>
      <div className="flex flex-col gap-8">
        <CallSite
          source="components/ui/use-toast.ts:5"
          origin="ui"
          note="TOAST_LIMIT is 1. Click this three times: you get one toast, not three, and only the most recent survives. Nothing queues - the earlier two are simply gone."
        >
          <Button
            variant="outline"
            onClick={() => {
              toast({ title: 'First', description: 'Fired first.' });
              toast({ variant: 'destructive', title: 'Second', description: 'Fired second.' });
              toast({ variant: 'success', title: 'Third', description: 'Only this one shows.' });
            }}
          >
            Fire three at once
          </Button>
        </CallSite>

        <CallSite
          source="components/ui/use-toast.ts:6"
          origin="ui"
          note="TOAST_REMOVE_DELAY is 1_000_000 ms, about 16 minutes. Fire this and leave it: it will not go away on its own within any session you would sit through. Whether toasts should auto-dismiss at all is a real design question, but 16 minutes is not an answer anyone chose - it is the shadcn default."
        >
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: 'This will not auto-dismiss',
                  description: 'Not for about 16 minutes, anyway.',
                })
              }
            >
              Fire a sticky toast
            </Button>
            <Button variant="ghost" onClick={() => dismiss()}>
              dismiss()
            </Button>
          </div>
        </CallSite>
      </div>
    </ToastHarness>
  );
}

// ---------------------------------------------------------------------------
// The copy, which is worth a look before the component gets rebuilt.
// ---------------------------------------------------------------------------

export const Copy = createPreview({
  label: 'Copy',
  render: () => <CopyButtons />,
});

function CopyButtons() {
  const { toast } = useToast();

  return (
    <ToastHarness>
      <CallSite
        source="'Error' ×19, 'An error occurred' ×13, 'Success' ×9"
        origin="ui"
        note="Three ways of saying nothing, 41 times between them. The description carries the real information in each case, so the title is doing no work. Worth deciding whether a toast needs a title at all when the variant already says what kind of thing happened."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete the CDN access token.',
              })
            }
          >
            &quot;Error&quot; · 19
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: 'Failed to delete the CDN access token.',
              })
            }
          >
            &quot;An error occurred&quot; · 13
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({ title: 'Success', description: 'The CDN access token was deleted.' })
            }
          >
            &quot;Success&quot; · 9
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'destructive',
                title: 'Failed to delete the CDN access token',
                description: 'The token may already have been revoked.',
              })
            }
          >
            A specific title
          </Button>
        </div>
      </CallSite>
    </ToastHarness>
  );
}
