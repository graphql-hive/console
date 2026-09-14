import { createPreview, type NavPath } from 'react-foundry';

export const nav: NavPath = 'Base/Foundations/TypeScale';

/**
 * The type scale: Tailwind's steps plus the two the app kept typing by hand. `control` (13px) is
 * the size of UI text: buttons, inputs, menus, chips, description lists, card bodies. `2xs`
 * (10px) is micro text: badges, subgraph chips, tick labels, mono timestamps. Both carry a
 * line-height now, where the old arbitrary values inherited whatever the parent had.
 */
const STEPS = [
  { name: '2xs', px: 10, lh: 14, cls: 'text-2xs', use: 'badges, chips, tick labels' },
  { name: 'xs', px: 12, lh: 16, cls: 'text-xs', use: 'secondary text, tooltips, descriptions' },
  { name: 'control', px: 13, lh: 18, cls: 'text-control', use: 'buttons, inputs, menus, chips' },
  { name: 'sm', px: 14, lh: 20, cls: 'text-sm', use: 'body' },
  { name: 'base', px: 16, lh: 24, cls: 'text-base', use: 'lead paragraphs' },
  { name: 'lg', px: 18, lh: 28, cls: 'text-lg', use: 'section headings' },
  { name: 'xl', px: 20, lh: 28, cls: 'text-xl', use: 'page titles' },
  { name: '2xl', px: 24, lh: 32, cls: 'text-2xl', use: 'stat values' },
] as const;

const SAMPLE = 'Schema checks run on the composed API schema.';

export const Steps = createPreview(() => (
  <div className="flex flex-col gap-4">
    {STEPS.map(step => (
      <div key={step.name} className="grid grid-cols-[6rem_1fr] items-baseline gap-4">
        <div className="text-neutral-9 text-2xs font-mono">
          {step.name}
          <br />
          {step.px}/{step.lh}
        </div>
        <div>
          <div className={`text-neutral-12 ${step.cls}`}>{SAMPLE}</div>
          <div className="text-neutral-9 text-2xs">{step.use}</div>
        </div>
      </div>
    ))}
  </div>
));

/**
 * The three sizes that sit next to each other most often, on one control row: a compact chip
 * (control), its description (xs), and a badge (2xs).
 */
export const SideBySide = createPreview(() => (
  <div className="flex items-center gap-3">
    <span className="border-neutral-5 bg-neutral-2 dark:bg-neutral-3 text-neutral-11 text-control rounded-sm border px-3 py-1.5 font-medium">
      Filter
    </span>
    <span className="text-neutral-11 text-xs">3 dimensions selected</span>
    <span className="bg-neutral-4 text-neutral-12 text-2xs rounded-sm px-1.5 py-0.5 uppercase">
      beta
    </span>
  </div>
));
