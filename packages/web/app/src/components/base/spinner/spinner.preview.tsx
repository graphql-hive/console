import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Spinner } from './spinner';

export const nav: NavPath = 'Base/Primitives/Spinner';

/**
 * Lucide's loader in the accent colour, so a spinner matches the rest of the icon set. It
 * replaces the Chakra-copied ring in `ui/spinner`, which was the same colour but its own shape
 * and spun twice as fast. The three sizes are the ones the app's spinners already use: 16px beside
 * text, 24px as the default, 32px for a page that has nothing else to show yet.
 */
export const Sizes = createPreview(() => (
  <div className="text-neutral-10 flex items-end gap-8 text-xs">
    <span className="flex flex-col items-center gap-2">
      <Spinner variants={{ size: 'sm' }} />
      sm
    </span>
    <span className="flex flex-col items-center gap-2">
      <Spinner />
      default
    </span>
    <span className="flex flex-col items-center gap-2">
      <Spinner variants={{ size: 'lg' }} />
      lg
    </span>
  </div>
));

/**
 * Where it sits today: the DataTable loading row and cursor paging bar, and the centered block a
 * page shows before its first result.
 */
export const InContext = createPreview(() => (
  <div className="flex flex-col gap-6 text-sm">
    <div className="border-neutral-5 flex h-24 items-center justify-center rounded-md border text-center">
      <Spinner />
    </div>
    <div className="border-neutral-4 bg-neutral-2 dark:bg-neutral-3 flex h-9 items-center justify-between rounded-md border px-4 text-xs">
      <span className="text-neutral-10">Page 2</span>
      <span className="inline-flex items-center gap-2">
        <Spinner variants={{ size: 'sm' }} />
        <span className="text-neutral-10">‹ ›</span>
      </span>
    </div>
    <div className="flex flex-col items-center">
      <Spinner />
      <div className="mt-2 text-xs">Loading app deployments</div>
    </div>
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Spinner, {
    label: { type: 'text', default: 'Loading' },
    variants: {
      size: { type: 'radio', options: ['sm', 'default', 'lg'], default: 'default' },
    },
  }),
  render: v => <Spinner label={v.label} variants={v.variants} />,
});
