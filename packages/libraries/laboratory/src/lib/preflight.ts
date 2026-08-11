import { useCallback, useRef, useState } from 'react';
import cryptoJsSource from 'crypto-js/crypto-js.js?raw';
import type { LaboratoryEnv, LaboratoryEnvActions, LaboratoryEnvState } from './env';
import { LaboratoryPlugin } from './plugins';

export interface LaboratoryPreflightLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'system';
  message: unknown[];
  createdAt: string;
}

export interface LaboratoryPreflightResult {
  status: 'success' | 'error';
  error?: string;
  logs: LaboratoryPreflightLog[];
  env: LaboratoryEnv;
  headers: Record<string, string>;
  pluginsState: Record<string, any>;
}

export interface LaboratoryPreflight {
  enabled: boolean;
  script: string;
  lastTestResult?: LaboratoryPreflightResult | null;
}

export interface LaboratoryPreflightState {
  preflight: LaboratoryPreflight | null;
}

/** A single `lab.prompt()` call waiting on the user. */
export interface LaboratoryPreflightPromptRequest {
  placeholder: string;
  defaultValue?: string;
  onSubmit?: (value: string | null) => void;
}

export interface LaboratoryPreflightActions {
  setPreflight: (preflight: LaboratoryPreflight) => void;
  runPreflight: (
    plugins?: LaboratoryPlugin[],
    pluginsState?: Record<string, any>,
  ) => Promise<LaboratoryPreflightResult | null>;
  setLastTestResult: (result: LaboratoryPreflightResult | null) => void;
}

/**
 * Owns the one prompt dialog every preflight run shares. Runs overlap in practice (an
 * operation run while schema polling has a prompt open), and only one request can be on
 * screen, so a displaced request is answered with null rather than left waiting.
 */
export const usePreflightPrompt = () => {
  const [isPreflightPromptModalOpen, setIsPreflightPromptModalOpen] = useState(false);

  const [preflightPromptModalProps, setPreflightPromptModalProps] =
    useState<LaboratoryPreflightPromptRequest>({
      placeholder: '',
      defaultValue: undefined,
      onSubmit: undefined,
    });

  const pendingPromptRef = useRef<LaboratoryPreflightPromptRequest['onSubmit']>(undefined);

  const answerPendingPrompt = useCallback((value: string | null) => {
    const pending = pendingPromptRef.current;
    pendingPromptRef.current = undefined;
    pending?.(value);
  }, []);

  const openPreflightPromptModal = useCallback(
    (request: LaboratoryPreflightPromptRequest) => {
      answerPendingPrompt(null);
      pendingPromptRef.current = request.onSubmit;

      setPreflightPromptModalProps({
        placeholder: request.placeholder,
        defaultValue: request.defaultValue,
        onSubmit: answerPendingPrompt,
      });

      setTimeout(() => {
        setIsPreflightPromptModalOpen(true);
      }, 200);
    },
    [answerPendingPrompt],
  );

  return {
    isPreflightPromptModalOpen,
    setIsPreflightPromptModalOpen,
    preflightPromptModalProps,
    openPreflightPromptModal,
  };
};

export const usePreflight = (props: {
  defaultPreflight?: LaboratoryPreflight | null;
  onPreflightChange?: (preflight: LaboratoryPreflight | null) => void;
  envApi: LaboratoryEnvState & LaboratoryEnvActions;
  openPreflightPromptModal?: (request: LaboratoryPreflightPromptRequest) => void;
}): LaboratoryPreflightState & LaboratoryPreflightActions => {
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

  const { openPreflightPromptModal } = props;

  const runPreflight = useCallback(
    async (plugins?: LaboratoryPlugin[], pluginsState?: Record<string, any>) => {
      if (!preflight?.enabled) {
        return null;
      }

      return runIsolatedLabScript(
        preflight.script,
        props.envApi?.env ?? { variables: {} },
        openPreflightPromptModal
          ? (placeholder, defaultValue) =>
              new Promise<string | null>(resolve =>
                openPreflightPromptModal({ placeholder, defaultValue, onSubmit: resolve }),
              )
          : undefined,
        plugins,
        pluginsState,
      );
    },
    [preflight, props.envApi.env, openPreflightPromptModal],
  );

  const setLastTestResult = useCallback(
    (result: LaboratoryPreflightResult | null) => {
      _setPreflight({
        ...(preflight ?? { script: '', enabled: true }),
        lastTestResult: result,
      });
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
  plugins: LaboratoryPlugin[] = [],
  pluginsState: Record<string, any> = {},
): Promise<LaboratoryPreflightResult> {
  const pluginsObjects = plugins
    .filter(plugin => plugin.preflight?.lab?.object)
    .map(plugin => plugin.preflight?.lab?.object);

  return new Promise(resolve => {
    const blob = new Blob(
      [
        cryptoJsSource.replace('}(this, function () {', '}(self, function () {'),
        /* javascript */ `
        const env =  {
          variables: ${JSON.stringify(env?.variables)} || {},
        };

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

              let state = ${JSON.stringify(pluginsState)};

              const setState = (id, newState) => {
                Object.assign(state[id] ?? {}, newState);
              };
              
              const lab = Object.freeze({
                environment: {
                  get: (key) => env.variables[key],
                  set: (key, value) => {
                    env.variables[key] = value;
                  },
                  delete: (key) => {
                    delete env.variables[key];
                  }
                },
                request: {
                  headers: new Headers()
                },
                prompt: (placeholder, defaultValue) => {
                  return new Promise((resolve) => {
                    promptResolve = resolve;
                    self.postMessage({ type: 'prompt', placeholder, defaultValue });
                  });
                },
                plugins: {
                  ${pluginsObjects
                    .map(obj => obj?.toString())
                    .map(obj => (obj?.startsWith('object') ? `function${obj.slice(6)}` : obj))
                    .map(
                      (obj, i) => `
                   ...(${obj})(${JSON.stringify(plugins[i].preflight?.lab?.props ?? {})}, state['${plugins[i].id}'] ?? {}, (newState) => setState('${plugins[i].id}', newState))  
                  `,
                    )
                    .join(',')}
                }
              });
  
              // Make CryptoJS available globally in the script context
              const AsyncFunction = async function () {}.constructor;
              await new AsyncFunction('lab', 'CryptoJS', 'with(lab){' + event.data.script + '}')(lab, CryptoJS);
              
              self.postMessage({ type: 'result', env: env, headers: Object.fromEntries(lab.request.headers.entries()), pluginsState: state });
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
    const headers: Record<string, string> = {};

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
            headers: data.headers,
            pluginsState: data.pluginsState,
          });
        } else {
          if (Object.keys(data.headers).length > 0) {
            logs.push({
              level: 'system',
              message: [`Headers:\n${JSON.stringify(data.headers, null, 2)}`],
              createdAt: new Date().toISOString(),
            });
          }

          resolve({
            status: 'success',
            logs,
            env: data.env,
            headers: data.headers,
            pluginsState: data.pluginsState,
          });
        }
      } else if (data.type === 'log') {
        if (data.level === 'log') {
          logs.push({
            level: 'log',
            message: data.message,
            createdAt: new Date().toISOString(),
          });
        } else if (data.level === 'warn') {
          logs.push({
            level: 'warn',
            message: data.message,
            createdAt: new Date().toISOString(),
          });
        } else if (data.level === 'error') {
          logs.push({
            level: 'error',
            message: data.message,
            createdAt: new Date().toISOString(),
          });
        } else if (data.level === 'info') {
          logs.push({
            level: 'info',
            message: data.message,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (data.type === 'header') {
        headers[data.name] = data.value;

        logs.push({
          level: 'system',
          message: [`Header ${data.name} set to ${data.value}`],
          createdAt: new Date().toISOString(),
        });
      } else if (data.type === 'prompt') {
        // Without an answer the script awaits `lab.prompt()` forever and the worker never
        // reports a result, so a missing handler has to answer with null.
        const answer = prompt?.(data.placeholder, data.defaultValue) ?? Promise.resolve(null);

        void answer
          .catch(() => null)
          .then(value => {
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
        headers: {},
        pluginsState,
      });
    };

    worker.postMessage({ type: 'init', script });
  });
}
