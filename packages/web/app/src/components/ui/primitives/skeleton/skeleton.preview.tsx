import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Skeleton } from './skeleton';

export const nav: NavPath = 'Primitives/Skeleton';

export const Shapes = createPreview(() => (
  <div className="text-fg-secondary flex items-end gap-8 text-xs">
    <span className="flex flex-col gap-2">
      <Skeleton />
      line
    </span>
    <span className="flex flex-col gap-2">
      <span className="block h-16 w-32">
        <Skeleton variants={{ shape: 'block' }} />
      </span>
      block
    </span>
    <span className="flex flex-col items-center gap-2">
      <Skeleton variants={{ shape: 'circle' }} />
      circle
    </span>
  </div>
));

export const LineSizes = createPreview(() => (
  <div className="text-fg-secondary flex flex-col gap-3 text-xs">
    {(['xs', 'sm', 'default', 'lg', 'xl'] as const).map(size => (
      <span key={size} className="flex items-center gap-4">
        <span className="w-14">{size}</span>
        <Skeleton variants={{ size }} />
      </span>
    ))}
  </div>
));

export const LineWidths = createPreview(() => (
  <div className="text-fg-secondary flex w-[32rem] flex-col gap-3 text-xs">
    {(['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const).map(width => (
      <span key={width} className="flex items-center gap-4">
        <span className="w-14 shrink-0">{width}</span>
        <Skeleton variants={{ width }} />
      </span>
    ))}
  </div>
));

// The SSO settings loading state (single-sign-on-subpage.tsx), transcribed: fixed-width spans
// around full-width lines, as the page sizes them.
export const SettingsSections = createPreview(() => (
  <div className="flex w-[48rem] flex-col gap-12">
    <section className="space-y-8">
      <span className="flex w-24">
        <Skeleton variants={{ size: 'xl', width: 'full' }} />
      </span>
      <span className="flex w-72">
        <Skeleton variants={{ width: 'full' }} />
      </span>
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-8">
            <span className="flex w-36">
              <Skeleton variants={{ width: 'full' }} />
            </span>
            <span className="flex w-80">
              <Skeleton variants={{ width: 'full' }} />
            </span>
          </div>
        ))}
      </div>
    </section>
    <section className="space-y-8">
      <span className="flex w-40">
        <Skeleton variants={{ size: 'xl', width: 'full' }} />
      </span>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-8">
            <span className="flex w-36">
              <Skeleton variants={{ width: 'full' }} />
            </span>
            <span className="flex w-72">
              <Skeleton variants={{ width: 'full' }} />
            </span>
          </div>
        ))}
      </div>
    </section>
    <section className="space-y-8">
      <span className="flex w-44">
        <Skeleton variants={{ size: 'xl', width: 'full' }} />
      </span>
      <span className="flex w-96">
        <Skeleton variants={{ width: 'full' }} />
      </span>
      <div className="flex gap-8">
        <span className="flex w-24">
          <Skeleton variants={{ width: 'full' }} />
        </span>
        <span className="flex w-24">
          <Skeleton variants={{ width: 'full' }} />
        </span>
      </div>
    </section>
    <section className="space-y-8">
      <span className="flex w-36">
        <Skeleton variants={{ size: 'xl', width: 'full' }} />
      </span>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-start justify-between">
          <div className="space-y-2">
            <span className="flex w-40">
              <Skeleton variants={{ width: 'full' }} />
            </span>
            <span className="flex w-72">
              <Skeleton variants={{ size: 'sm', width: 'full' }} />
            </span>
          </div>
          <span className="block h-6 w-11">
            <Skeleton variants={{ shape: 'block' }} />
          </span>
        </div>
      ))}
    </section>
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Skeleton, {
    variants: {
      shape: { type: 'radio', options: ['line', 'block', 'circle'], default: 'line' },
      size: { type: 'radio', options: ['xs', 'sm', 'default', 'lg', 'xl'], default: 'default' },
      width: { type: 'radio', options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'], default: 'md' },
    },
  }),
  render: v => (
    <span className="block h-24 w-64">
      <Skeleton variants={v.variants} />
    </span>
  ),
});
