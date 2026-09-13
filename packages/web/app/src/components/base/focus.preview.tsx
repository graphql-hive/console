import { useState } from 'react';
import { Copy } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from './button/button';
import { Checkbox } from './checkbox/checkbox';
import { Select } from './floating/select/select';
import { Input } from './input/input';
import { Switch } from './switch/switch';

export const nav: NavPath = 'Base/Foundations/Focus';

/**
 * Keyboard focus, one treatment for every control: a 2px accent outline, 2px off the edge, on
 * `:focus-visible` only, so a mouse click does not paint it but Tab does. `outline` rather than a
 * box-shadow ring, because an outline needs no offset colour and so reads the same on the page,
 * on a card and inside a popover.
 *
 * Click into the frame, then Tab through. Before this, base Button had `outline-none` and nothing
 * else, so a Select trigger or a form button gave a keyboard user no sign of where they were.
 */
export const TabThrough = createPreview(() => {
  const [on, setOn] = useState(true);
  const [value, setValue] = useState('p95');
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Save alert</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete</Button>
        <Button label="Last 7 days" />
        <Button layout="iconOnly" icon={Copy} aria-label="Copy" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={[
            { value: 'p50', label: 'p50 latency' },
            { value: 'p95', label: 'p95 latency' },
          ]}
          value={value}
          onValueChange={setValue}
        />
        <Input placeholder="Search…" />
        <Switch checked={on} onCheckedChange={setOn} aria-label="Enable" />
        <Checkbox defaultChecked aria-label="Include" />
      </div>
    </div>
  );
});

/** The same controls on a raised surface: the outline sits off the edge, so the fill does not matter. */
export const OnRaised = createPreview(() => (
  <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 flex w-[26rem] flex-wrap items-center gap-3 rounded-md border p-4">
    <Button variant="outline">On a card</Button>
    <Button label="Raised trigger" onSurface="raised" />
    <Switch defaultChecked aria-label="Enable" />
  </div>
));
