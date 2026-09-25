import { createPreview, type NavPath } from 'react-foundry';
import { useTheme } from '../theme/theme-provider';
import { Badge } from './badge/badge';
import { StatusDot } from './status-dot/status-dot';

export const nav: NavPath = 'Base/Foundations/SemanticColors';

/** A tinted pill is `bg-<state>-tint text-<state>`, a dot is `bg-<state>`, a hover is `-muted`. */
const STATES = [
  {
    name: 'success',
    solid: 'bg-success',
    steps: [
      'bg-success-muted',
      'bg-success-tint-strong',
      'bg-success-tint',
      'bg-success-tint-subtle',
    ],
    text: 'text-success',
    use: 'a check passed, a version is valid, a permission is allowed',
  },
  {
    name: 'warning',
    solid: 'bg-warning',
    steps: [
      'bg-warning-muted',
      'bg-warning-tint-strong',
      'bg-warning-tint',
      'bg-warning-tint-subtle',
    ],
    text: 'text-warning',
    use: 'allowed with a caveat, a warning-level alert',
  },
  {
    name: 'critical',
    solid: 'bg-critical',
    steps: [
      'bg-critical-muted',
      'bg-critical-tint-strong',
      'bg-critical-tint',
      'bg-critical-tint-subtle',
    ],
    text: 'text-critical',
    use: 'a failed check, a denied permission, an error',
  },
  {
    name: 'info',
    solid: 'bg-info',
    steps: ['bg-info-muted', 'bg-info-tint-strong', 'bg-info-tint', 'bg-info-tint-subtle'],
    text: 'text-info',
    use: 'an info-level alert, a neutral note',
  },
] as const;

const STEP_LABELS = ['', 'muted', 'tint-strong', 'tint', 'tint-subtle'];

export const Tokens = createPreview(() => (
  <div className="flex flex-col gap-5">
    {STATES.map(state => (
      <div key={state.name} className="grid grid-cols-[6rem_1fr] items-center gap-4">
        <div className="text-fg-muted text-2xs font-mono">{state.name}</div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[state.solid, ...state.steps].map((cls, index) => (
              <div key={cls} className="flex flex-col items-center gap-1">
                <div className={`border-line size-9 rounded-sm border ${cls}`} />
                <span className="text-fg-muted text-2xs font-mono">
                  {STEP_LABELS[index] || 'solid'}
                </span>
              </div>
            ))}
          </div>
          <span className={`${state.text} text-sm font-medium`}>Aa</span>
          <span className="text-fg-muted text-2xs">{state.use}</span>
        </div>
      </div>
    ))}
  </div>
));

const SURFACES = [
  { token: 'surface-page', cls: 'bg-surface-page', light: 3, dark: 2 },
  { token: 'surface-card', cls: 'bg-surface-card', light: 2, dark: 3 },
  { token: 'surface-card-hover', cls: 'bg-surface-card-hover', light: 1, dark: 4 },
  { token: 'surface-overlay', cls: 'bg-surface-overlay', light: 3, dark: 3 },
  { token: 'surface-floating', cls: 'bg-surface-floating', light: 2, dark: 4 },
  { token: 'surface-control', cls: 'bg-surface-control', light: 2, dark: 3 },
  { token: 'surface-control-raised', cls: 'bg-surface-control-raised', light: 2, dark: 4 },
  { token: 'surface-selected', cls: 'bg-surface-selected', light: 5, dark: 5 },
  { token: 'surface-inverse', cls: 'bg-surface-inverse', light: 12, dark: 12 },
  { token: 'surface-hover', cls: 'bg-surface-hover', light: 4, dark: 4 },
  { token: 'surface-pressed', cls: 'bg-surface-pressed', light: 3, dark: 5 },
  { token: 'surface-inset', cls: 'bg-surface-inset', light: 1, dark: 2 },
  { token: 'surface-code', cls: 'bg-surface-code', light: 3, dark: 3 },
  { token: 'surface-skeleton', cls: 'bg-surface-skeleton', light: 3, dark: 3 },
  { token: 'surface-stripe', cls: 'bg-surface-stripe', light: 2, dark: 3 },
];

const FOREGROUNDS = [
  { token: 'fg', cls: 'text-fg', step: 12 },
  { token: 'fg-default', cls: 'text-fg-default', step: 11 },
  { token: 'fg-secondary', cls: 'text-fg-secondary', step: 10 },
  { token: 'fg-muted', cls: 'text-fg-muted', step: 9 },
  { token: 'fg-subtle', cls: 'text-fg-subtle', step: 8 },
];

const LINES = [
  { token: 'line', cls: 'border-line', light: 5, dark: 5 },
  { token: 'line-subtle', cls: 'border-line-subtle', light: 4, dark: 4 },
  { token: 'line-strong', cls: 'border-line-strong', light: 6, dark: 6 },
  { token: 'line-control', cls: 'border-line-control', light: 5, dark: 4 },
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
    <div className="flex w-[28rem] flex-col gap-6">
      <div className="text-fg text-sm font-medium">{theme}</div>
      <div className="flex flex-col gap-2">
        {SURFACES.map(role => (
          <div key={role.token} className="flex items-center gap-3">
            <div className={`border-line size-8 shrink-0 rounded-sm border ${role.cls}`} />
            <span className="text-fg-secondary text-2xs font-mono">{role.token}</span>
            <span className="text-fg-subtle text-2xs ml-auto font-mono">{step(role)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {FOREGROUNDS.map(role => (
          <div key={role.token} className="flex items-baseline gap-3">
            <span className={`${role.cls} text-sm`}>The schema check passed</span>
            <span className="text-fg-subtle text-2xs ml-auto font-mono">
              {role.token} n{role.step}
            </span>
          </div>
        ))}
        <div className="bg-surface-inverse text-fg-inverse mt-1 self-start rounded-sm px-2 py-1 text-xs">
          fg-inverse on surface-inverse
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {LINES.map(role => (
          <div key={role.token} className="flex items-center gap-3">
            <div className={`bg-surface-card h-6 w-16 shrink-0 rounded-sm border ${role.cls}`} />
            <span className="text-fg-secondary text-2xs font-mono">{role.token}</span>
            <span className="text-fg-subtle text-2xs ml-auto font-mono">{step(role)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export const SurfaceNesting = createPreview(() => (
  <div className="bg-surface-page text-fg-default flex w-[28rem] flex-col gap-4 p-5">
    <div className="bg-surface-card border-line-subtle flex flex-col gap-3 rounded-md border p-4">
      <span className="text-fg text-sm font-medium">surface-card</span>
      <div className="bg-surface-control border-line-control text-fg-subtle rounded-sm border px-3 py-2 text-sm">
        surface-control
      </div>
    </div>
    <div className="bg-surface-overlay border-line flex flex-col gap-3 rounded-lg border p-4 shadow-lg">
      <span className="text-fg text-sm font-medium">surface-overlay</span>
      <div className="bg-surface-control-raised border-line-control text-fg-subtle rounded-sm border px-3 py-2 text-sm">
        surface-control-raised
      </div>
      <div className="bg-surface-floating border-line flex flex-col rounded-md border p-1 text-sm shadow-md">
        <span className="rounded-sm px-2 py-1">surface-floating</span>
        <span className="bg-surface-selected text-fg rounded-sm px-2 py-1">surface-selected</span>
      </div>
    </div>
  </div>
));

export const ControlRaisedConflict = createPreview(() => (
  <div className="bg-surface-overlay flex w-[28rem] flex-col gap-3 p-5">
    <div className="bg-surface-control-raised border-line-control text-fg-subtle rounded-sm border px-3 py-2 text-sm">
      Input raised (n2 / n4)
    </div>
    <div className="bg-neutral-1 border-line dark:bg-neutral-5 dark:border-line-strong text-fg-subtle rounded-sm border px-3 py-2 text-sm">
      controlSurface raised (n1 / n5)
    </div>
  </div>
));

/** The same four states as the components that carry them. */
export const InComponents = createPreview(() => (
  <div className="flex flex-col gap-3">
    {STATES.map(state => (
      <div key={state.name} className="flex items-center gap-4 text-sm">
        <span className="text-fg-muted text-2xs w-16 font-mono">{state.name}</span>
        <StatusDot color={state.name} />
        <Badge content={state.name} variants={{ variant: state.name }} />
        <Badge content={state.name} variants={{ variant: state.name, size: 'sm', mono: true }} />
      </div>
    ))}
  </div>
));
