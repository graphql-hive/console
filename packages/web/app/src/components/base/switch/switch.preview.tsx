import { useState } from 'react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Switch } from './switch';

export const nav: NavPath = 'Base/FormControls/Switch';

export const Sizes = createPreview(() => (
  <div className="flex items-center gap-6">
    <Switch size="standard" defaultChecked />
    <Switch size="small" defaultChecked />
  </div>
));

export const States = createPreview(() => (
  <div className="flex flex-col gap-4 text-[13px]">
    <label className="flex items-center gap-3">
      <Switch />
      Off
    </label>
    <label className="flex items-center gap-3">
      <Switch defaultChecked />
      On
    </label>
    <label className="flex items-center gap-3">
      <Switch disabled />
      Disabled, off
    </label>
    <label className="flex items-center gap-3">
      <Switch disabled defaultChecked />
      Disabled, on
    </label>
  </div>
));

export const InSettingsRow = createPreview(() => {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="border-neutral-5 flex w-96 items-center justify-between rounded-lg border p-4">
      <div>
        <div className="text-neutral-12 text-sm font-medium">Alert enabled</div>
        <div className="text-neutral-10 text-[13px]">
          {enabled ? 'Evaluating every 5 minutes.' : 'Paused, no notifications will be sent.'}
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </div>
  );
});

/**
 * `decorative` is for a switch that shows state but is not itself the control: the menu row or
 * card around it owns the click. Not focusable, hidden from assistive tech, and the cursor is the
 * row's. Tab through this and the switch is skipped; hover it and the cursor does not change.
 */
export const Decorative = createPreview(() => (
  <div className="hover:bg-neutral-3 flex w-64 cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px]">
    <span>Show deprecated fields</span>
    <Switch size="small" checked decorative />
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Switch, {
    size: { type: 'radio', options: ['standard', 'small'], default: 'standard' },
    checked: { type: 'boolean', default: true },
    disabled: { type: 'boolean', default: false },
    decorative: { type: 'boolean', default: false },
  }),
  render: v => (
    <Switch size={v.size} checked={v.checked} disabled={v.disabled} decorative={v.decorative} />
  ),
});
