import {
  ComponentPropsWithoutRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import type { editor } from 'monaco-editor';
import { useMutation } from 'urql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Subtitle, Title } from '@/components/ui/page';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLocalStorage, useToggle } from '@/lib/hooks';
import { GraphiQLPlugin } from '@graphiql/react';
import { Editor as MonacoEditor, OnMount } from '@monaco-editor/react';
import {
  Cross2Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  Pencil1Icon,
  TriangleRightIcon,
} from '@radix-ui/react-icons';
import { useParams } from '@tanstack/react-router';
import type { LogMessage } from './preflight-script-worker';
import workerUrl from './preflight-script-worker?worker&url';

const PreflightWorker = Worker.bind(null, env.laboratory.preflightWorkerUrl || workerUrl, {
  type: import.meta.env.DEV ? 'module' : undefined,
});

export const preflightScriptPlugin: GraphiQLPlugin = {
  icon: () => (
    <svg
      viewBox="0 0 256 256"
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="16"
    >
      <path d="M136 160h40" />
      <path d="m80 96 40 32-40 32" />
      <rect width="192" height="160" x="32" y="48" rx="8.5" />
    </svg>
  ),
  title: 'Preflight Script',
  content: PreflightScriptContent,
};

const classes = {
  monaco: clsx('*:bg-[#10151f]'),
  monacoMini: clsx('h-32 *:rounded-md *:bg-[#10151f]'),
  icon: clsx('absolute -left-5 top-px'),
};

const sharedMonacoProps = {
  theme: 'vs-dark',
  className: classes.monaco,
  options: {
    minimap: { enabled: false },
    padding: {
      top: 10,
    },
    scrollbar: {
      horizontalScrollbarSize: 6,
      verticalScrollbarSize: 6,
    },
  },
} satisfies ComponentPropsWithoutRef<typeof MonacoEditor>;

const monacoProps = {
  env: {
    ...sharedMonacoProps,
    defaultLanguage: 'json',
    options: {
      ...sharedMonacoProps.options,
      lineNumbers: 'off',
      tabSize: 2,
    },
  },
  script: {
    ...sharedMonacoProps,
    theme: 'vs-dark',
    defaultLanguage: 'javascript',
    options: {
      ...sharedMonacoProps.options,
    },
  },
} satisfies Record<'script' | 'env', ComponentPropsWithoutRef<typeof MonacoEditor>>;

type PayloadLog = { type: 'log'; message: string };
type PayloadError = { type: 'error'; error: Error };
type PayloadResult = { type: 'result'; environmentVariables: Record<string, unknown> };
type PayloadReady = { type: 'ready' };

type WorkerMessagePayload = PayloadResult | PayloadLog | PayloadError | PayloadReady;

const PREFLIGHT_TIMEOUT = 30_000;

const UpdatePreflightScriptMutation = graphql(`
  mutation UpdatePreflightScript($input: UpdatePreflightScriptInput!) {
    updatePreflightScript(input: $input) {
      ok {
        updatedTarget {
          id
          preflightScript {
            id
            sourceCode
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const PreflightScript_TargetFragment = graphql(`
  fragment PreflightScript_TargetFragment on Target {
    id
    preflightScript {
      id
      sourceCode
    }
  }
`);

type LogRecord = LogMessage | { type: 'separator' };

function safeParseJSON(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

const enum PreflightWorkerState {
  running,
  ready,
}

export function usePreflightScript(args: {
  target: FragmentType<typeof PreflightScript_TargetFragment> | null;
}) {
  const target = useFragment(PreflightScript_TargetFragment, args.target);
  const [isPreflightScriptEnabled, setIsPreflightScriptEnabled] = useLocalStorage(
    'hive:laboratory:isPreflightScriptEnabled',
    false,
  );
  const [environmentVariables, setEnvironmentVariables] = useLocalStorage(
    'hive:laboratory:environment',
    '',
  );
  const latestEnvironmentVariablesRef = useRef(environmentVariables);
  useEffect(() => {
    latestEnvironmentVariablesRef.current = environmentVariables;
  });

  const [state, setState] = useState<PreflightWorkerState>(PreflightWorkerState.ready);
  const [logs, setLogs] = useState<LogRecord[]>([]);

  const currentRun = useRef<null | Function>(null);

  async function execute(script = target?.preflightScript?.sourceCode ?? '', isPreview = false) {
    if (isPreview === false && !isPreflightScriptEnabled) {
      return safeParseJSON(latestEnvironmentVariablesRef.current);
    }
    try {
      setState(PreflightWorkerState.running);

      const now = Date.now();
      setLogs(prev => [...prev, '> Start running script']);

      const worker = new PreflightWorker();

      const isReadyD = Promise.withResolvers<void>();
      const isFinishedD = Promise.withResolvers<void>();

      const timeout = setTimeout(() => {
        setLogs(logs => [
          ...logs,
          new Error(
            `Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`,
          ),
        ]);
        isFinishedD.resolve();
      }, PREFLIGHT_TIMEOUT);

      currentRun.current = () => {
        clearTimeout(timeout);
        setLogs(logs => [
          ...logs,
          '> Preflight script interrupted by user',
          {
            type: 'separator' as const,
          },
        ]);
        isFinishedD.resolve();
      };

      worker.onmessage = (ev: MessageEvent<WorkerMessagePayload>) => {
        if (ev.data.type === 'ready') {
          isReadyD.resolve();
          return;
        }

        if (ev.data.type === 'result') {
          const mergedEnvironmentVariables = {
            ...safeParseJSON(latestEnvironmentVariablesRef.current),
            ...ev.data.environmentVariables,
          };
          setEnvironmentVariables(JSON.stringify(mergedEnvironmentVariables, null, 2));
          setLogs(logs => [
            ...logs,
            `> End running script. Done in ${(Date.now() - now) / 1000}s`,
            {
              type: 'separator' as const,
            },
          ]);
          isFinishedD.resolve();
          clearTimeout(timeout);
          return;
        }
        if (ev.data.type === 'log') {
          const message = ev.data.message;
          setLogs(logs => [...logs, message]);
          return;
        }
        if (ev.data.type === 'error') {
          const error = ev.data.error;
          setLogs(logs => [...logs, error]);
          isFinishedD.resolve();
          clearTimeout(timeout);
          return;
        }

        throw new Error('Received unexpected response from worker.');
      };

      await isReadyD.promise;

      worker.postMessage({
        script,
        environmentVariables: (environmentVariables && safeParseJSON(environmentVariables)) || {},
      });

      await isFinishedD.promise;
      setState(PreflightWorkerState.ready);

      worker.onmessage = () => {};
      worker.terminate();
    } catch (err) {
      if (err instanceof Error) {
        setLogs(prev => [
          ...prev,
          err,
          '> Preflight script failed',
          {
            type: 'separator' as const,
          },
        ]);
        setState(PreflightWorkerState.ready);
        return safeParseJSON(latestEnvironmentVariablesRef.current);
      }
      throw err;
    }

    return safeParseJSON(latestEnvironmentVariablesRef.current);
  }

  function abort() {
    currentRun.current?.();
  }

  // terminate worker when leaving laboratory
  useEffect(
    () => () => {
      currentRun.current?.();
    },
    [],
  );

  return {
    execute,
    abort,
    isPreflightScriptEnabled,
    setIsPreflightScriptEnabled,
    script: target?.preflightScript?.sourceCode ?? '',
    environmentVariables,
    setEnvironmentVariables,
    state,
    logs,
    clearLogs: () => setLogs([]),
  } as const;
}

type PreflightScriptObject = ReturnType<typeof usePreflightScript>;

const PreflightScriptContext = createContext<PreflightScriptObject | null>(null);
export const PreflightScriptProvider = PreflightScriptContext.Provider;

function PreflightScriptContent() {
  const preflightScript = useContext(PreflightScriptContext);
  if (preflightScript === null) {
    throw new Error('PreflightScriptContent used outside PreflightScriptContext.Provider');
  }

  const [showModal, toggleShowModal] = useToggle();
  const params = useParams({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug',
  });

  const [, mutate] = useMutation(UpdatePreflightScriptMutation);

  const { toast } = useToast();

  const handleScriptChange = useCallback(async (newValue = '') => {
    const { data, error } = await mutate({
      input: {
        selector: params,
        sourceCode: newValue,
      },
    });
    const err = error || data?.updatePreflightScript?.error;

    if (err) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Update',
      description: 'Preflight script has been updated successfully',
      variant: 'default',
    });
  }, []);

  return (
    <>
      <PreflightScriptModal
        // to unmount on submit/close
        key={String(showModal)}
        isOpen={showModal}
        toggle={toggleShowModal}
        scriptValue={preflightScript.script}
        executeScript={value =>
          preflightScript.execute(value, true).catch(err => {
            console.error(err);
          })
        }
        state={preflightScript.state}
        abortScriptRun={preflightScript.abort}
        logs={preflightScript.logs}
        clearLogs={preflightScript.clearLogs}
        onScriptValueChange={handleScriptChange}
        envValue={preflightScript.environmentVariables}
        onEnvValueChange={preflightScript.setEnvironmentVariables}
      />
      <div className="graphiql-doc-explorer-title flex items-center justify-between gap-4">
        Preflight Script
        <Button
          variant="orangeLink"
          size="icon-sm"
          className="size-auto gap-1"
          onClick={toggleShowModal}
          data-cy="preflight-script-modal-button"
        >
          <Pencil1Icon className="shrink-0" />
          Edit
        </Button>
      </div>
      <Subtitle>
        This script is run before each operation submitted, e.g. for automated authentication.
      </Subtitle>

      <div className="flex items-center gap-2 text-sm">
        <Switch
          checked={preflightScript.isPreflightScriptEnabled}
          onCheckedChange={v => preflightScript.setIsPreflightScriptEnabled(v)}
          className="my-4"
          data-cy="toggle-preflight-script"
        />
        <span className="w-6">{preflightScript.isPreflightScriptEnabled ? 'ON' : 'OFF'}</span>
      </div>

      {preflightScript.isPreflightScriptEnabled && (
        <MonacoEditor
          height={128}
          value={preflightScript.script}
          {...monacoProps.script}
          className={classes.monacoMini}
          wrapperProps={{
            ['data-cy']: 'preflight-script-editor-mini',
          }}
          options={{
            ...monacoProps.script.options,
            lineNumbers: 'off',
            readOnly: true,
          }}
        />
      )}

      <Title className="mt-6 flex items-center gap-2">
        Environment variables{' '}
        <Badge className="text-xs" variant="outline">
          JSON
        </Badge>
      </Title>
      <Subtitle>Define variables to use in your Headers</Subtitle>
      <MonacoEditor
        height={128}
        value={preflightScript.environmentVariables}
        onChange={value => preflightScript.setEnvironmentVariables(value ?? '')}
        {...monacoProps.env}
        className={classes.monacoMini}
        wrapperProps={{
          ['data-cy']: 'env-editor-mini',
        }}
      />
    </>
  );
}

function PreflightScriptModal({
  isOpen,
  toggle,
  scriptValue,
  executeScript,
  state,
  abortScriptRun,
  logs,
  clearLogs,
  onScriptValueChange,
  envValue,
  onEnvValueChange,
}: {
  isOpen: boolean;
  toggle: () => void;
  scriptValue?: string;
  executeScript: (script: string) => void;
  state: PreflightWorkerState;
  abortScriptRun: () => void;
  logs: Array<LogRecord>;
  clearLogs: () => void;
  onScriptValueChange: (value: string) => void;
  envValue: string;
  onEnvValueChange: (value: string) => void;
}) {
  const scriptEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const envEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const consoleRef = useRef<HTMLElement>(null);

  const handleScriptEditorDidMount: OnMount = useCallback(editor => {
    scriptEditorRef.current = editor;
  }, []);

  const handleEnvEditorDidMount: OnMount = useCallback(editor => {
    envEditorRef.current = editor;
  }, []);
  const handleSubmit = useCallback(() => {
    onScriptValueChange(scriptEditorRef.current?.getValue() ?? '');
    onEnvValueChange(envEditorRef.current?.getValue() ?? '');
    toggle();
  }, []);

  useEffect(() => {
    const consoleEl = consoleRef.current;
    consoleEl?.scroll({ top: consoleEl.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          abortScriptRun();
        }
        toggle();
      }}
    >
      <DialogContent
        className="w-11/12 max-w-[unset] xl:w-4/5"
        onEscapeKeyDown={ev => {
          // prevent pressing escape in monaco to close the modal
          if (ev.target instanceof HTMLTextAreaElement) {
            ev.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit your Preflight Script</DialogTitle>
          <DialogDescription>
            This script will run in each user's browser and be stored in plain text on our servers.
            Don't share any secrets here 🤫.
            <br />
            All team members can view the script and toggle it off when they need to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid h-[60vh] grid-cols-2 [&_section]:grow">
          <div className="flex flex-col">
            <div className="flex justify-between p-2">
              <Title className="flex gap-2">
                Script Editor
                <Badge className="text-xs" variant="outline">
                  JavaScript
                </Badge>
              </Title>
              <Button
                variant="orangeLink"
                size="icon-sm"
                className="size-auto gap-1"
                onClick={() => {
                  if (state === PreflightWorkerState.running) {
                    abortScriptRun();
                    return;
                  }

                  executeScript(scriptEditorRef.current?.getValue() ?? '');
                }}
                data-cy="run-preflight-script"
              >
                {state === PreflightWorkerState.running && (
                  <>
                    <Cross2Icon className="shrink-0" />
                    Stop Script
                  </>
                )}
                {state === PreflightWorkerState.ready && (
                  <>
                    <TriangleRightIcon className="shrink-0" />
                    Run Script
                  </>
                )}
              </Button>
            </div>
            <MonacoEditor
              value={scriptValue}
              onMount={handleScriptEditorDidMount}
              {...monacoProps.script}
              options={{
                ...monacoProps.script.options,
                wordWrap: 'wordWrapColumn',
              }}
              wrapperProps={{
                ['data-cy']: 'preflight-script-editor',
              }}
            />
          </div>
          <div className="flex h-[inherit] flex-col">
            <div className="flex justify-between p-2">
              <Title>Console Output</Title>
              <Button
                variant="orangeLink"
                size="icon-sm"
                className="size-auto gap-1"
                onClick={clearLogs}
                disabled={state === PreflightWorkerState.running}
              >
                <Cross2Icon className="shrink-0" height="12" />
                Clear Output
              </Button>
            </div>
            <section
              ref={consoleRef}
              className='h-1/2 overflow-hidden overflow-y-scroll bg-[#10151f] py-2.5 pl-[26px] pr-2.5 font-[Menlo,Monaco,"Courier_New",monospace] text-xs/[18px]'
              data-cy="console-output"
            >
              {logs.map((log, index) => {
                let type = '';
                if (log instanceof Error) {
                  type = 'error';
                  log = `${log.name}: ${log.message}`;
                }
                if (typeof log === 'string') {
                  type ||= log.split(':')[0].toLowerCase();

                  const ComponentToUse = {
                    error: CrossCircledIcon,
                    warn: ExclamationTriangleIcon,
                    info: InfoCircledIcon,
                  }[type];

                  return (
                    <div
                      key={index}
                      className={clsx(
                        'relative',
                        {
                          error: 'text-red-500',
                          warn: 'text-yellow-500',
                          info: 'text-green-500',
                        }[type],
                      )}
                    >
                      {ComponentToUse && <ComponentToUse className={classes.icon} />}
                      {log}
                    </div>
                  );
                }
                return <hr key={index} className="my-2 border-dashed border-current" />;
              })}
            </section>
            <Title className="flex gap-2 p-2">
              Environment Variables
              <Badge className="text-xs" variant="outline">
                JSON
              </Badge>
            </Title>
            <MonacoEditor
              value={envValue}
              onChange={value => onEnvValueChange(value ?? '')}
              onMount={handleEnvEditorDidMount}
              {...monacoProps.env}
              options={{
                ...monacoProps.env.options,
                wordWrap: 'wordWrapColumn',
              }}
              wrapperProps={{
                ['data-cy']: 'env-editor',
              }}
            />
          </div>
        </div>
        <DialogFooter className="items-center">
          <p className="me-5 flex items-center gap-2 text-sm">
            <InfoCircledIcon />
            Changes made to this Preflight Script will apply to all users on your team using this
            target.
          </p>
          <Button type="button" onClick={toggle} data-cy="preflight-script-modal-cancel">
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            data-cy="preflight-script-modal-submit"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
