import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Spinner } from './spinner';

export const nav: NavPath = 'Base/Primitives/Spinner';

export const Sizes = createPreview(() => (
  <div className="text-fg-secondary flex items-end gap-8 text-xs">
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

export const InContext = createPreview(() => (
  <div className="flex flex-col gap-6 text-sm">
    <div className="border-line flex h-24 items-center justify-center rounded-md border text-center">
      <Spinner />
    </div>
    <div className="border-line-subtle bg-neutral-2 dark:bg-neutral-3 flex h-9 items-center justify-between rounded-md border px-4 text-xs">
      <span className="text-fg-secondary">Page 2</span>
      <span className="inline-flex items-center gap-2">
        <Spinner variants={{ size: 'sm' }} />
        <span className="text-fg-secondary">‹ ›</span>
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
