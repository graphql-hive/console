import { useCallback, useState } from 'react';
import type { LabaratoryEnv, LabaratoryEnvActions, LabaratoryEnvState } from '@/labaratory/lib/env';

export interface LabaratoryPreflightLog {
  level: 'log' | 'warn' | 'error';
  message: unknown[];
  createdAt: string;
}

export interface LabaratoryPreflightResult {
  status: 'success' | 'error';
  error?: string;
  logs: LabaratoryPreflightLog[];
  env: LabaratoryEnv;
}

export interface LabaratoryPreflight {
  script: string;
  lastTestResult?: LabaratoryPreflightResult | null;
}

export interface LabaratoryPreflightState {
  preflight: LabaratoryPreflight | null;
}

export interface LabaratoryPreflightActions {
  setPreflight: (preflight: LabaratoryPreflight) => void;
  runPreflight: () => Promise<LabaratoryPreflightResult | null>;
  setLastTestResult: (result: LabaratoryPreflightResult | null) => void;
}

export const usePreflight = (props: {
  defaultPreflight?: LabaratoryPreflight | null;
  onPreflightChange?: (preflight: LabaratoryPreflight | null) => void;
  envApi: LabaratoryEnvState & LabaratoryEnvActions;
}): LabaratoryPreflightState & LabaratoryPreflightActions => {
  // eslint-disable-next-line react/hook-use-state
  const [preflight, _setPreflight] = useState<LabaratoryPreflight | null>(
    props.defaultPreflight ?? null,
  );

  const setPreflight = useCallback(
    (preflight: LabaratoryPreflight) => {
      _setPreflight(preflight);
      props.onPreflightChange?.(preflight);
    },
    [props],
  );

  const runPreflight = useCallback(async () => {
    if (!preflight) {
      return null;
    }

    return runIsolatedLabScript(preflight.script, props.envApi?.env ?? { variables: {} });
  }, [preflight, props.envApi.env]);

  const setLastTestResult = useCallback(
    (result: LabaratoryPreflightResult | null) => {
      _setPreflight({ ...(preflight ?? { script: '' }), lastTestResult: result });
      props.onPreflightChange?.({ ...(preflight ?? { script: '' }), lastTestResult: result });
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
  env: LabaratoryEnv,
  prompt?: (placeholder: string, defaultValue: string) => Promise<string | null>,
): Promise<LabaratoryPreflightResult> {
  return new Promise((resolve, reject) => {
    const blob = new Blob(
      [
        /* javascript */ `
        import CryptoJS from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm';
        
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
                CryptoJS: CryptoJS
              });
  
              // Make CryptoJS available globally in the script context
              const AsyncFunction = async function () {}.constructor;
              await new AsyncFunction('lab', 'CryptoJS', 'with(lab){' + event.data.script + '}')(lab, CryptoJS);
              
              self.postMessage({ type: 'result', status: 'success', env: env });
            } catch (err) {
              self.postMessage({ type: 'result', status: 'error', error: err.message || String(err) });
            }
          }
        };
      `,
      ],
      { type: 'application/javascript' },
    );

    const logs: LabaratoryPreflightLog[] = [];

    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

    worker.onmessage = ({ data }) => {
      if (data.type === 'result') {
        worker.terminate();

        if (data.status === 'success') {
          resolve({
            status: 'success',
            logs,
            env: data.env,
          });
        } else if (data.status === 'error') {
          console.error(data.error);
          reject({
            status: 'error',
            error: data.error,
            logs,
          });
        }
      } else if (data.type === 'log') {
        if (data.level === 'log') {
          logs.push({ level: 'log', message: data.message, createdAt: new Date().toISOString() });
        } else if (data.level === 'warn') {
          logs.push({ level: 'warn', message: data.message, createdAt: new Date().toISOString() });
        } else if (data.level === 'error') {
          logs.push({ level: 'error', message: data.message, createdAt: new Date().toISOString() });
        }
      } else if (data.type === 'prompt') {
        void prompt?.(data.placeholder, data.defaultValue).then(value => {
          worker.postMessage({ type: 'prompt:result', value });
        });
      }
    };

    worker.onerror = error => {
      reject({
        status: 'error',
        error: error.message,
        logs,
      });
    };

    worker.postMessage({ type: 'init', script });
  });
}
