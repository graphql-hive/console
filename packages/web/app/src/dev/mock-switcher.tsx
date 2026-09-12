import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/base/button/button';
import { Card } from '@/components/base/card/card';
import { FloatingPortalContainerProvider } from '@/components/base/floating/floating-portal-container';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';

/**
 * Floating control for mock mode: pick a scenario, set latency, force an error. Every change
 * is a cookie on the server followed by a reload, since scenario and controls are per-request
 * server state and a reload is what re-runs every query.
 *
 * Mounted on its own React root outside the app tree (see src/main.tsx), so it stays up when
 * the app's error boundary trips, which is when you most need to switch scenario.
 */

type Status = {
  active: string;
  default: string;
  controls: { latency: number; error: string | null };
  scenarios: Array<{ name: string; description: string }>;
};

const ERROR_KIND_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'graphql', label: 'GraphQL error', description: 'A normal error in the response' },
  {
    value: 'network',
    label: 'Network error',
    description: 'A 503 the client sees as a connection failure',
  },
  {
    value: 'unexpected',
    label: 'Unexpected error',
    description: 'The GraphQL error the app treats as a crash',
  },
];

function post(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function Switcher() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [scenario, setScenario] = useState('');
  const [latency, setLatency] = useState('');
  const [errorOperation, setErrorOperation] = useState('*');
  const [errorKind, setErrorKind] = useState('off');

  useEffect(() => {
    void fetch('/__mock/scenarios')
      .then(res => res.json() as Promise<Status>)
      .then(next => {
        setStatus(next);
        setScenario(next.active);
        setLatency(next.controls.latency ? String(next.controls.latency) : '');
        const [operation, kind] = next.controls.error?.split('|') ?? [];
        if (kind) {
          setErrorOperation(operation);
          setErrorKind(kind);
        }
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pending = {
    scenario,
    latency: Number(latency) || 0,
    error: errorKind !== 'off' ? `${errorOperation.trim() || '*'}|${errorKind}` : null,
  };
  const dirty =
    status !== null &&
    (pending.scenario !== status.active ||
      pending.latency !== status.controls.latency ||
      pending.error !== status.controls.error);

  // Nothing takes effect until this runs: scenario and controls are cookies the next page
  // load reads, so they are applied together and followed by exactly one reload.
  const apply = async () => {
    if (status && pending.scenario !== status.active) {
      await post('/__mock/scenario', { name: pending.scenario });
    }
    await post('/__mock/controls', {
      latency: pending.latency || null,
      error: pending.error,
    });
    location.reload();
  };

  const scenarioOptions =
    status?.scenarios.map(scenario => ({
      value: scenario.name,
      label: scenario.name === status.default ? `${scenario.name} (startup)` : scenario.name,
      description: scenario.description,
    })) ?? [];

  // Popups portal into this element so they share its stacking context and sit above the card.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setContainer}
      className="fixed bottom-4 right-4 z-[2147483000] flex flex-col items-end gap-2 text-xs"
    >
      {open && status && (
        <FloatingPortalContainerProvider container={container}>
          <div className="w-[360px]">
            <Card title="Mock mode" variants={{ onSurface: 'raised' }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-11 font-medium">Scenario</span>
                  {/* Block wrapper: the trigger is inline-flex and must not stretch full width. */}
                  <div>
                    <Select
                      options={scenarioOptions}
                      value={scenario}
                      onValueChange={setScenario}
                    />
                  </div>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-neutral-11 font-medium">Latency (ms)</span>
                  <span className="text-neutral-9">
                    Delays every response. The way to see skeletons and spinners, including ones
                    debounced past a fast local response.
                  </span>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={latency}
                    onChange={event => setLatency(event.target.value)}
                  />
                </label>

                <div className="flex flex-col gap-1">
                  <span className="text-neutral-11 font-medium">Forced error</span>
                  <span className="text-neutral-9">
                    Makes matching requests fail so you can see the error UI. Other requests keep
                    working, so one component can show its error state while the page around it
                    loads normally.
                  </span>
                  <div>
                    <Select
                      options={ERROR_KIND_OPTIONS}
                      value={errorKind}
                      onValueChange={setErrorKind}
                    />
                  </div>
                  <Input
                    placeholder="* for every request, or an operation name like TargetLayoutQuery"
                    value={errorOperation}
                    disabled={errorKind === 'off'}
                    onChange={event => setErrorOperation(event.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" disabled={!dirty} onClick={() => void apply()}>
                    Apply and reload
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </FloatingPortalContainerProvider>
      )}
      <Button variant={open ? 'active' : 'default'} onClick={() => setOpen(o => !o)}>
        MOCK{status ? ` · ${status.active}` : ''}
      </Button>
    </div>
  );
}

export function mount() {
  const id = 'hive-mock-switcher';
  if (document.getElementById(id)) return;
  const container = document.createElement('div');
  container.id = id;
  document.body.append(container);
  createRoot(container).render(<Switcher />);
}
