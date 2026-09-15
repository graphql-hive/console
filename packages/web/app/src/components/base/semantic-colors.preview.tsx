import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from './badge/badge';
import { StatusDot } from './status-dot/status-dot';

export const nav: NavPath = 'Base/Foundations/SemanticColors';

/**
 * The four state colours and their alpha steps, as defined in `index.css`. `success`, `warning`,
 * `critical` and `info` each come as the full token plus `_80`, `_30`, `_10` and `_08`, so a
 * component paints a state without reaching for a raw green, yellow or red: a tinted pill is
 * `bg-<state>_10 text-<state>`, a dot is `bg-<state>`, a hover is `_80`.
 */
const STATES = [
  {
    name: 'success',
    solid: 'bg-success',
    steps: ['bg-success_80', 'bg-success_30', 'bg-success_10', 'bg-success_08'],
    text: 'text-success',
    use: 'a check passed, a version is valid, a permission is allowed',
  },
  {
    name: 'warning',
    solid: 'bg-warning',
    steps: ['bg-warning_80', 'bg-warning_30', 'bg-warning_10', 'bg-warning_08'],
    text: 'text-warning',
    use: 'allowed with a caveat, a warning-level alert',
  },
  {
    name: 'critical',
    solid: 'bg-critical',
    steps: ['bg-critical_80', 'bg-critical_30', 'bg-critical_10', 'bg-critical_08'],
    text: 'text-critical',
    use: 'a failed check, a denied permission, an error',
  },
  {
    name: 'info',
    solid: 'bg-info',
    steps: ['bg-info_80', 'bg-info_30', 'bg-info_10', 'bg-info_08'],
    text: 'text-info',
    use: 'an info-level alert, a neutral note',
  },
] as const;

const STEP_LABELS = ['', '_80', '_30', '_10', '_08'];

export const Tokens = createPreview(() => (
  <div className="flex flex-col gap-5">
    {STATES.map(state => (
      <div key={state.name} className="grid grid-cols-[6rem_1fr] items-center gap-4">
        <div className="text-neutral-9 text-2xs font-mono">{state.name}</div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[state.solid, ...state.steps].map((cls, index) => (
              <div key={cls} className="flex flex-col items-center gap-1">
                <div className={`border-neutral-5 size-9 rounded-sm border ${cls}`} />
                <span className="text-neutral-9 text-2xs font-mono">
                  {STEP_LABELS[index] || 'solid'}
                </span>
              </div>
            ))}
          </div>
          <span className={`${state.text} text-sm font-medium`}>Aa</span>
          <span className="text-neutral-9 text-2xs">{state.use}</span>
        </div>
      </div>
    ))}
  </div>
));

/** The same four states as the components that carry them. */
export const InComponents = createPreview(() => (
  <div className="flex flex-col gap-3">
    {STATES.map(state => (
      <div key={state.name} className="flex items-center gap-4 text-sm">
        <span className="text-neutral-9 text-2xs w-16 font-mono">{state.name}</span>
        <StatusDot color={state.name} />
        <Badge content={state.name} variants={{ variant: state.name }} />
        <Badge content={state.name} variants={{ variant: state.name, size: 'sm', mono: true }} />
      </div>
    ))}
  </div>
));
