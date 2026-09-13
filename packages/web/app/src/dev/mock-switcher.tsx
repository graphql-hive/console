import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/base/button/button';
import { Card } from '@/components/base/card/card';
import { FloatingPortalContainerProvider } from '@/components/base/floating/floating-portal-container';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';
import type { PinnableField } from './mock-server/page-fields';
import { EMPTY, encodePins, type Pins } from './pins';

/**
 * Floating control for mock mode: pick a scenario, pin fields on this page, set latency,
 * force an error. Every change is a cookie on the server followed by a reload, since these
 * are per-request server state and a reload is what re-runs every query.
 *
 * Mounted on its own React root outside the app tree (see src/main.tsx), so it stays up when
 * the app's error boundary trips, which is when you most need to switch scenario.
 */

type Status = {
  active: string;
  default: string;
  controls: { latency: number; error: string | null; pins: Pins };
  scenarios: Array<{ name: string; description: string }>;
};

type PageFields = { operations: string[]; fields: PinnableField[] };

const KIND_LABELS: Record<PinnableField['kind'], string> = {
  boolean: 'true / false',
  enum: 'enum',
  connection: 'list',
  list: 'list',
  object: 'nullable',
  number: 'number',
  string: 'text',
};

/** The values a pin can take for a field, as select options; null for free-form kinds. */
function valueOptionsFor(field: PinnableField) {
  const options: Array<{ value: string; label: string; description?: string }> = [];
  if (field.kind === 'boolean') {
    options.push({ value: 'true', label: 'true' }, { value: 'false', label: 'false' });
  } else if (field.kind === 'enum') {
    for (const member of field.enumValues ?? []) options.push({ value: member, label: member });
  } else if (field.kind === 'connection' || field.kind === 'list') {
    options.push({ value: EMPTY, label: 'Empty', description: 'A list with nothing in it' });
  } else if (field.kind !== 'object') {
    return null;
  }
  if (field.nullable) {
    options.push({ value: 'null', label: 'null', description: 'Not set at all' });
  }
  return options;
}

/** Pin values travel as JSON where they can and strings otherwise; show them the same way. */
function describePin(value: unknown): string {
  if (value === EMPTY) return 'Empty';
  if (value === null) return 'null';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

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
  const [pins, setPins] = useState<Pins>({});
  const [pinError, setPinError] = useState<string | null>(null);
  const [pageFields, setPageFields] = useState<PageFields | null>(null);
  const [pinField, setPinField] = useState('');
  const [pinValue, setPinValue] = useState('');

  useEffect(() => {
    void fetch('/__mock/scenarios')
      .then(res => res.json() as Promise<Status>)
      .then(next => {
        setStatus(next);
        setScenario(next.active);
        setLatency(next.controls.latency ? String(next.controls.latency) : '');
        setPins(next.controls.pins);
        const [operation, kind] = next.controls.error?.split('|') ?? [];
        if (kind) {
          setErrorOperation(operation);
          setErrorKind(kind);
        }
      });
  }, []);

  // Fetched when the panel opens, so it reflects the page you are on, not the one you landed on.
  useEffect(() => {
    if (!open) return;
    void fetch(`/__mock/fields?path=${encodeURIComponent(location.pathname)}`)
      .then(res => res.json() as Promise<PageFields>)
      .then(setPageFields);
  }, [open]);

  const selectedField = pageFields?.fields.find(f => f.key === pinField) ?? null;
  const valueOptions = selectedField ? valueOptionsFor(selectedField) : null;

  const addPin = () => {
    if (!selectedField || pinValue === '') return;
    let value: unknown = pinValue;
    if (pinValue === 'null') value = null;
    else if (pinValue === EMPTY) value = EMPTY;
    else if (selectedField.kind === 'boolean') value = pinValue === 'true';
    else if (selectedField.kind === 'number') value = Number(pinValue);
    setPins(current => ({ ...current, [selectedField.key]: value }));
    setPinField('');
    setPinValue('');
    setPinError(null);
  };
  const removePin = (key: string) =>
    setPins(current => Object.fromEntries(Object.entries(current).filter(([k]) => k !== key)));

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
    pins,
  };
  const dirty =
    status !== null &&
    (pending.scenario !== status.active ||
      pending.latency !== status.controls.latency ||
      pending.error !== status.controls.error ||
      encodePins(pending.pins) !== encodePins(status.controls.pins));

  // Nothing takes effect until this runs: scenario and controls are cookies the next page
  // load reads, so they are applied together and followed by exactly one reload.
  const apply = async () => {
    if (status && pending.scenario !== status.active) {
      await post('/__mock/scenario', { name: pending.scenario });
    }
    const res = await post('/__mock/controls', {
      latency: pending.latency || null,
      error: pending.error,
      pins: pending.pins,
    });
    if (!res.ok) {
      const body = (await res.json()) as { rejected?: string[] };
      setPinError(`Not in the schema: ${(body.rejected ?? []).join(', ')}`);
      return;
    }
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

                <div className="flex flex-col gap-1">
                  <span className="text-neutral-11 font-medium">Pins</span>
                  <span className="text-neutral-9">
                    Set one field this page uses to a value, on top of the scenario. The way to see
                    this page's empty or edge state without switching everything else.
                  </span>
                  {Object.entries(pins).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1 truncate">
                        <code className="text-neutral-11">
                          {key} = {describePin(value)}
                        </code>
                        {pageFields?.fields.find(f => f.key === key)?.perItem && (
                          <span className="text-neutral-9"> on every {key.split('.')[0]}</span>
                        )}
                      </div>
                      <Button onClick={() => removePin(key)}>Remove</Button>
                    </div>
                  ))}
                  {pageFields && pageFields.fields.length === 0 ? (
                    <span className="text-neutral-9">
                      Nothing recorded for this page yet. Reload it once, then reopen.
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div>
                        <Select
                          searchable
                          placeholder="Field on this page…"
                          options={(pageFields?.fields ?? []).map(field => ({
                            value: field.key,
                            label: field.key,
                            description: field.perItem
                              ? `on every ${field.key.split('.')[0]} · ${KIND_LABELS[field.kind]}`
                              : `${KIND_LABELS[field.kind]} · ${field.operations.join(', ')}`,
                          }))}
                          value={pinField}
                          onValueChange={key => {
                            setPinField(key);
                            setPinValue('');
                          }}
                        />
                      </div>
                      {selectedField && (
                        <div className="flex gap-2">
                          {valueOptions ? (
                            <div>
                              <Select
                                placeholder="Value…"
                                options={valueOptions}
                                value={pinValue}
                                onValueChange={setPinValue}
                              />
                            </div>
                          ) : (
                            <div className="grid flex-1">
                              <Input
                                inputMode={selectedField.kind === 'number' ? 'numeric' : 'text'}
                                placeholder={selectedField.kind === 'number' ? '0' : 'text'}
                                value={pinValue}
                                onChange={event => setPinValue(event.target.value)}
                                onKeyDown={event => event.key === 'Enter' && addPin()}
                              />
                            </div>
                          )}
                          <Button disabled={pinValue === ''} onClick={addPin}>
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {pinError && <span className="text-red-400">{pinError}</span>}
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
