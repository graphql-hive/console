import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Select } from '../floating/select/select';
import { Input } from '../input/input';
import { Separator } from './separator';

export const nav: NavPath = 'Base/Primitives/Separator';

export const Horizontal = createPreview(() => (
  <div className="text-neutral-11 flex w-80 flex-col gap-3 text-sm">
    <p>Schema checks run on the composed API schema.</p>
    <Separator />
    <p>Each check compares against the latest valid version.</p>
  </div>
));

/**
 * The toolbar above the projects and targets lists: search, a divider, sort. The divider is a
 * control's height (32px) so it reads as part of the row; the spacing around it is the row's
 * gap.
 */
export const InToolbar = createPreview(() => {
  const [sortBy, setSortBy] = useState('requests');
  return (
    <div className="flex flex-row items-center gap-x-2">
      <Input type="search" placeholder="Search..." />
      <Separator orientation="vertical" />
      <Select
        options={[
          {
            value: 'requests',
            label: 'Requests',
            description: 'GraphQL requests made in the last 7 days.',
          },
          {
            value: 'versions',
            label: 'Schema Versions',
            description: 'Schemas published in last 7 days.',
          },
          { value: 'name', label: 'Name', description: 'Sort by project name.' },
        ]}
        value={sortBy}
        onValueChange={setSortBy}
      />
    </div>
  );
});

/** `stretch` fills the row instead, for a divider between things taller than a control. */
export const Stretch = createPreview(() => (
  <div className="text-neutral-11 flex items-center gap-4 text-sm">
    <div className="border-neutral-5 h-16 w-40 rounded-md border p-3">A tall neighbour</div>
    <Separator orientation="vertical" />
    <span>control height</span>
    <Separator orientation="vertical" stretch />
    <span>stretch</span>
  </div>
));
