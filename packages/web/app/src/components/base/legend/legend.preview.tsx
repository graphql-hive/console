import { AlertTriangle, Check, GitCompare } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { StatusDot } from '../status-dot/status-dot';
import { Legend } from './legend';

export const nav: NavPath = 'Base/Primitives/Legend';

/** The contract picker's three icons on the check page, which show without their text until hovered. */
export const Default = createPreview(() => (
  <Legend
    items={[
      { icon: <AlertTriangle className="text-critical size-3.5" />, label: 'Failed' },
      { icon: <GitCompare className="size-3.5" />, label: 'Schema changed' },
      { icon: <Check className="text-success size-3.5" />, label: 'Passed' },
    ]}
  />
));

/** Any icon works, dots included. */
export const Dots = createPreview(() => (
  <Legend
    items={[
      { icon: <StatusDot color="success" />, label: 'Healthy' },
      { icon: <StatusDot color="warning" />, label: 'Degraded' },
      { icon: <StatusDot color="critical" />, label: 'Down' },
    ]}
  />
));

/** Right-aligned above the thing it explains, the way the pages place it. */
export const AboveContent = createPreview(() => (
  <div className="flex w-[32rem] flex-col gap-3">
    <div className="flex justify-end">
      <Legend
        items={[
          { icon: <AlertTriangle className="text-critical size-3.5" />, label: 'Failed' },
          { icon: <GitCompare className="size-3.5" />, label: 'Schema changed' },
          { icon: <Check className="text-success size-3.5" />, label: 'Passed' },
        ]}
      />
    </div>
    <div className="border-line text-fg-secondary rounded-md border p-4 text-sm">
      The band with the picker goes here.
    </div>
  </div>
));
