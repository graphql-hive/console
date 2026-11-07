import { useState } from 'react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Button } from '../button/button';
import { Card } from '../card/card';
import { Menu } from '../floating/menu/menu';
import { Switch } from './switch';
import * as styles from './switch.preview.css';

export const nav: NavPath = 'Primitives/FormControls/Switch';

export const Sizes = createPreview(() => (
  <div className={styles.div}>
    <Switch size="standard" defaultChecked />
    <Switch size="small" defaultChecked />
  </div>
));

export const States = createPreview(() => (
  <div className={styles.div2}>
    <label className={styles.label}>
      <Switch />
      Off
    </label>
    <label className={styles.label}>
      <Switch defaultChecked />
      On
    </label>
    <label className={styles.label}>
      <Switch disabled />
      Disabled, off
    </label>
    <label className={styles.label}>
      <Switch disabled defaultChecked />
      Disabled, on
    </label>
  </div>
));

export const InSettingsRow = createPreview(() => {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className={styles.div3}>
      <Card>
        <div className={styles.div4}>
          <div>
            <div className={styles.div5}>Alert enabled</div>
            <div className={styles.div6}>
              {enabled ? 'Evaluating every 5 minutes.' : 'Paused, no notifications will be sent.'}
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </Card>
    </div>
  );
});

/**
 * `decorative` is for a switch that shows state but is not itself the control: the menu row
 * around it owns the click. Not focusable, hidden from assistive tech, and the cursor is the
 * row's. Menu's `toggle` row is the one shipped user; open it and tab: the switch is skipped.
 */
export const Decorative = createPreview(() => {
  const [checked, setChecked] = useState(true);
  return (
    <Menu
      trigger={<Button label="View options" />}
      minWidth="md"
      sections={[
        [{ kind: 'toggle', label: 'Show deprecated fields', checked, onCheckedChange: setChecked }],
      ]}
    />
  );
});

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
