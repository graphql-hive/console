import { useCallback, useState } from 'react';
import cryptoJsSource from 'crypto-js/crypto-js.js?raw';
import type { LaboratoryEnv, LaboratoryEnvActions, LaboratoryEnvState } from '@/laboratory/lib/env';

export interface LaboratoryPreflightLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: unknown[];
  createdAt: string;
}

export interface LaboratoryPreflightResult {
  status: 'success' | 'error';
  error?: string;
  logs: LaboratoryPreflightLog[];
  env: LaboratoryEnv;
}

export interface LaboratoryPreflight {
  enabled: boolean;
  script: string;
  lastTestResult?: LaboratoryPreflightResult | null;
}

export interface LaboratoryPreflightState {
  preflight: LaboratoryPreflight | null;
}

export interface LaboratoryPreflightActions {
  setPreflight: (preflight: LaboratoryPreflight) => void;
  runPreflight: () => Promise<LaboratoryPreflightResult | null>;
  setLastTestResult: (result: LaboratoryPreflightResult | null) => void;
}

export const usePreflight = (props: {
  defaultPreflight?: LaboratoryPreflight | null;
  onPreflightChange?: (preflight: LaboratoryPreflight | null) => void;
  envApi: LaboratoryEnvState & LaboratoryEnvActions;
}): LaboratoryPreflightState & LaboratoryPreflightActions => {
  // eslint-disable-next-line react/hook-use-state
  const [preflight, _setPreflight] = useState<LaboratoryPreflight | null>(
    props.defaultPreflight ?? null,
  );

  const setPreflight = useCallback(
    (preflight: LaboratoryPreflight) => {
      _setPreflight(preflight);
      props.onPreflightChange?.(preflight);
    },
    [props],
  );

  const runPreflight = useCallback(async () => {
    if (!preflight?.enabled) {
      return null;
    }

    return runIsolatedLabScript(preflight.script, props.envApi?.env ?? { variables: {} });
  }, [preflight, props.envApi.env]);

  const setLastTestResult = useCallback(
    (result: LaboratoryPreflightResult | null) => {
      _setPreflight({ ...(preflight ?? { script: '', enabled: true }), lastTestResult: result });
      props.onPreflightChange?.({
        ...(preflight ?? { script: '', enabled: true }),
        lastTestResult: result,
      });
    },
    [preflight, props],
  );

  return {
    preflight,
    setPreflight,
    runPreflight,
    setLastTestResult,
  };
};

export async function runIsolatedLabScript(
  script: string,
  env: LaboratoryEnv,
  prompt?: (placeholder: string, defaultValue: string) => Promise<string | null>,
): Promise<LaboratoryPreflightResult> {
  return new Promise(resolve => {
    const blob = new Blob(
      [
        cryptoJsSource.replace('}(this, function () {', '}(self, function () {'),
        /* javascript */ `
        const env = ${JSON.stringify(env)};

        let promptResolve = null;

        self.onmessage = async (event) => {
          if (event.data.type === 'prompt:result') {
            promptResolve?.(event.data.value || null);
          }

          if (event.data.type === 'init') {
            try {
              self.console = {
                log: (...args) => {
                  self.postMessage({ type: 'log', level: 'log', message: args });
                },
                warn: (...args) => {
                  self.postMessage({ type: 'log', level: 'warn', message: args });
                },
                error: (...args) => {
                  self.postMessage({ type: 'log', level: 'error', message: args });
                },
                info: (...args) => {
                  self.postMessage({ type: 'log', level: 'info', message: args });
                },
              };
              
              const lab = Object.freeze({
                request: (endpoint, query, options) => {
                  return fetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ query, variables: options?.variables, extensions: options?.extensions }),
                    headers: {
                      'Content-Type': 'application/json',
                      ...options?.headers,
                    },
                  });
                },
                environment: {
                  get: (key) => env.variables[key],
                  set: (key, value) => {
                    env.variables[key] = value;
                  },
                  delete: (key) => {
                    delete env.variables[key];
                  }
                },
                prompt: (placeholder, defaultValue) => {
                  return new Promise((resolve) => {
                    promptResolve = resolve;
                    self.postMessage({ type: 'prompt', placeholder, defaultValue });
                  });
                },
                // CryptoJS: CryptoJS
              });
  
              // Make CryptoJS available globally in the script context
              const AsyncFunction = async function () {}.constructor;
              await new AsyncFunction('lab', 'CryptoJS', 'with(lab){' + event.data.script + '}')(lab, CryptoJS);
              
              self.postMessage({ type: 'result', env: env });
            } catch (err) {
              self.console.error(err);
              self.postMessage({ type: 'result', error: err.message || String(err) });
            }
          }
        };
      `,
      ],
      { type: 'application/javascript' },
    );

    const logs: LaboratoryPreflightLog[] = [];

    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

    worker.onmessage = ({ data }) => {
      if (data.type === 'result') {
        worker.terminate();

        if (data.error) {
          resolve({
            status: 'error',
            error: data.error,
            logs,
            env,
          });
        } else {
          resolve({
            status: 'success',
            logs,
            env: data.env,
          });
        }
      } else if (data.type === 'log') {
        if (data.level === 'log') {
          logs.push({ level: 'log', message: data.message, createdAt: new Date().toISOString() });
        } else if (data.level === 'warn') {
          logs.push({ level: 'warn', message: data.message, createdAt: new Date().toISOString() });
        } else if (data.level === 'error') {
          logs.push({ level: 'error', message: data.message, createdAt: new Date().toISOString() });
        } else if (data.level === 'info') {
          logs.push({ level: 'info', message: data.message, createdAt: new Date().toISOString() });
        }
      } else if (data.type === 'prompt') {
        void prompt?.(data.placeholder, data.defaultValue).then(value => {
          worker.postMessage({ type: 'prompt:result', value });
        });
      }
    };

    worker.onerror = error => {
      resolve({
        status: 'error',
        error: error.message,
        logs,
        env,
      });
    };

    worker.postMessage({ type: 'init', script });
  });
}
