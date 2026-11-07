import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { useTheme } from '@/components/theme/theme-provider';
import * as shared from '@/styles/shared.css';
import { Badge } from './badge/badge';
import { Button } from './button/button';
import { Card } from './card/card';
import { Select, type SelectOption } from './floating/select/select';
import { Input } from './input/input';
import { Dialog } from './overlays/dialog/dialog';
import { StatusDot } from './status-dot/status-dot';
import { ToggleGroup } from './toggle-group/toggle-group';
import * as styles from './semantic-colors.preview.css';

export const nav: NavPath = 'Primitives/Foundations/SemanticColors';

/** A tinted pill is `bg-<state>-tint text-<state>-text`, a dot is `bg-<state>`, a hover is `-muted`. */
const STATES = [
  {
    name: 'success',
    solid: styles.statesSolid,
    steps: [styles.statesClass, styles.statesClass2, styles.statesClass3, styles.statesClass4],
    text: styles.statesText,
    textOnTint: styles.statesTextOnTint,
    use: 'a check passed, a version is valid, a permission is allowed',
  },
  {
    name: 'warning',
    solid: styles.statesSolid2,
    steps: [styles.statesClass5, styles.statesClass6, styles.statesClass7, styles.statesClass8],
    text: styles.statesText2,
    textOnTint: styles.statesTextOnTint2,
    use: 'allowed with a caveat, a warning-level alert',
  },
  {
    name: 'critical',
    solid: styles.statesSolid3,
    steps: [styles.statesClass9, styles.statesClass10, styles.statesClass11, styles.statesClass12],
    text: styles.statesText3,
    textOnTint: styles.statesTextOnTint3,
    use: 'a failed check, a denied permission, an error',
  },
  {
    name: 'info',
    solid: styles.statesSolid4,
    steps: [styles.statesClass13, styles.statesClass14, styles.statesClass15, styles.statesClass16],
    text: styles.statesText4,
    textOnTint: styles.statesTextOnTint4,
    use: 'an info-level alert, a neutral note',
  },
] as const;

const STEP_LABELS = ['', 'muted', 'tint-strong', 'tint', 'tint-subtle'];

export const Tokens = createPreview(() => (
  <div className={styles.div}>
    {STATES.map(state => (
      <div key={state.name} className={styles.div2}>
        <div className={styles.div3}>{state.name}</div>
        <div className={shared.row.gap4}>
          <div className={styles.div5}>
            {[state.solid, ...state.steps].map((cls, index) => (
              <div key={cls} className={styles.div6}>
                <div className={`${styles.div7} ${cls}`} />
                <span className={styles.span}>{STEP_LABELS[index] || 'solid'}</span>
              </div>
            ))}
          </div>
          <span className={`${state.text} ${styles.span2}`}>Aa</span>
          <span className={`${state.textOnTint} ${state.steps[2]} ${styles.span3}`}>
            -text on tint
          </span>
          <span className={styles.span4}>{state.use}</span>
        </div>
      </div>
    ))}
  </div>
));

const SURFACES = [
  { token: 'surface-page', cls: styles.surfacesCls, light: 3, dark: 2 },
  { token: 'surface-card', cls: styles.surfacesCls2, light: 2, dark: 3 },
  { token: 'surface-card-hover', cls: styles.surfacesCls3, light: 1, dark: 4 },
  { token: 'surface-overlay', cls: styles.surfacesCls4, light: 3, dark: 3 },
  { token: 'surface-floating', cls: styles.surfacesCls5, light: 2, dark: 4 },
  { token: 'surface-control', cls: styles.surfacesCls6, light: 2, dark: 3 },
  { token: 'surface-control-raised', cls: styles.surfacesCls7, light: 1, dark: 5 },
  { token: 'surface-selected', cls: styles.surfacesCls8, light: 5, dark: 5 },
  { token: 'surface-inverse', cls: styles.surfacesCls9, light: 12, dark: 12 },
  { token: 'surface-hover', cls: styles.surfacesCls10, light: 4, dark: 4 },
  { token: 'surface-pressed', cls: styles.surfacesCls11, light: 3, dark: 5 },
  { token: 'surface-inset', cls: styles.surfacesCls12, light: 1, dark: 2 },
  { token: 'surface-code', cls: styles.surfacesCls13, light: 5, dark: 5 },
  { token: 'surface-skeleton', cls: styles.surfacesCls14, light: 5, dark: 5 },
  { token: 'surface-stripe', cls: styles.surfacesCls15, light: 2, dark: 3 },
];

const FOREGROUNDS = [
  { token: 'fg', cls: styles.foregroundsCls, step: 12 },
  { token: 'fg-default', cls: styles.foregroundsCls2, step: 11 },
  { token: 'fg-secondary', cls: styles.foregroundsCls3, step: 10 },
  { token: 'fg-muted', cls: styles.foregroundsCls4, step: 9 },
  { token: 'fg-subtle', cls: styles.foregroundsCls5, step: 8 },
];

const LINES = [
  { token: 'line', cls: styles.linesCls, light: 5, dark: 5 },
  { token: 'line-subtle', cls: styles.linesCls2, light: 4, dark: 4 },
  { token: 'line-strong', cls: styles.linesCls3, light: 6, dark: 6 },
  { token: 'line-control', cls: styles.linesCls4, light: 5, dark: 4 },
];

function useStep() {
  const { resolvedTheme } = useTheme();
  return {
    theme: resolvedTheme,
    step: (role: { light: number; dark: number }) => `n${role[resolvedTheme]}`,
  };
}

/** `nN` is the neutral step each role resolves to in the current theme. */
export const Roles = createPreview(() => {
  const { theme, step } = useStep();
  return (
    <div className={styles.div8}>
      <div className={styles.div9}>{theme}</div>
      <div className={shared.stack.gap2}>
        {SURFACES.map(role => (
          <div key={role.token} className={shared.row.gap3}>
            <div className={`${styles.div12} ${role.cls}`} />
            <span className={styles.span5}>{role.token}</span>
            <span className={styles.span6}>{step(role)}</span>
          </div>
        ))}
      </div>
      <div className={shared.stack.gap1}>
        {FOREGROUNDS.map(role => (
          <div key={role.token} className={styles.div14}>
            <span className={`${role.cls} ${styles.span7}`}>The schema check passed</span>
            <span className={styles.span6}>
              {role.token} n{role.step}
            </span>
          </div>
        ))}
        <div className={styles.div15}>fg-inverse on surface-inverse</div>
      </div>
      <div className={shared.stack.gap2}>
        {LINES.map(role => (
          <div key={role.token} className={shared.row.gap3}>
            <div className={`${styles.div16} ${role.cls}`} />
            <span className={styles.span5}>{role.token}</span>
            <span className={styles.span6}>{step(role)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Every raised control on surface-overlay; all four should rest on the same fill and border. */
export const RaisedControls = createPreview(() => {
  const [metric, setMetric] = useState('TRAFFIC');
  const [mode, setMode] = useState('api');
  return (
    <div className={styles.div17}>
      <Input onSurface="raised" placeholder="Input" />
      <Select options={METRICS} value={metric} onValueChange={setMetric} onSurface="raised" />
      <div className={shared.row.gap3}>
        <Button onSurface="raised">Button</Button>
        <ToggleGroup
          options={[
            { value: 'api', label: 'API' },
            { value: 'mock', label: 'Mock' },
          ]}
          value={mode}
          onValueChange={setMode}
          onSurface="raised"
          aria-label="Mode"
        />
      </div>
    </div>
  );
});

const METRICS: SelectOption[] = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'LATENCY:p99', label: 'p99 latency' },
];

/** Real components on the page and on a raised card; a raised card takes raised controls. */
export const OnThePage = createPreview(() => {
  const [metric, setMetric] = useState('TRAFFIC');
  return (
    <div className={styles.div18}>
      <Card title="This is a card on the page" description="Base card: line border, no fill.">
        <div className={shared.stack.gap3}>
          <Input placeholder="Input on surface-control" />
          <Select options={METRICS} value={metric} onValueChange={setMetric} />
        </div>
      </Card>
      <Card
        variants={{ onSurface: 'raised' }}
        title="This is a card on a raised surface"
        description="Raised card: surface-card fill, line-subtle border."
      >
        <div className={shared.stack.gap3}>
          <Input onSurface="raised" placeholder="Input on surface-control-raised" />
          <Select options={METRICS} value={metric} onValueChange={setMetric} onSurface="raised" />
          <p className={styles.p}>
            fg-muted body with <code className={styles.code}>surface-code</code>
          </p>
        </div>
      </Card>
    </div>
  );
});

/** Opens from a button so the overlay, its backdrop and the floating popup render for real. */
export const InAnOverlay = createPreview(() => {
  const [metric, setMetric] = useState('TRAFFIC');
  return (
    <Dialog
      trigger={<Button variant="primary">Open dialog</Button>}
      title="This is a dialog on surface-overlay"
      description="Every control in here takes onSurface raised."
      footer={<Button onSurface="raised">Cancel</Button>}
    >
      <div className={shared.stack.gap3}>
        <Input onSurface="raised" placeholder="Input on surface-control-raised" />
        <Select options={METRICS} value={metric} onValueChange={setMetric} onSurface="raised" />
      </div>
    </Dialog>
  );
});

/** The same four states as the components that carry them. */
export const InComponents = createPreview(() => (
  <div className={shared.stack.gap3}>
    {STATES.map(state => (
      <div key={state.name} className={styles.div20}>
        <span className={styles.span8}>{state.name}</span>
        <StatusDot color={state.name} />
        <Badge content={state.name} variants={{ variant: state.name }} />
        <Badge content={state.name} variants={{ variant: state.name, size: 'sm', mono: true }} />
      </div>
    ))}
  </div>
));
