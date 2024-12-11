import {
  ComponentPropsWithoutRef,
  Dispatch,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import type { editor } from 'monaco-editor';
import { useMutation, useQuery } from 'urql';
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
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
import { graphql } from '@/gql';
import { useToggle } from '@/lib/hooks';
import { GraphiQLPlugin, useExecutionContext } from '@graphiql/react';
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
import PreflightWorker from './preflight-script-worker?worker';

const PREFLIGHT_TIMEOUT = 30_000; // 30,000 ms = 30 seconds

const usePreflightScriptStore = createWithEqualityFn(
  persist<{
    script: string;
    env: string;
    disabled: boolean;
    // We can't put method in actions object since we save in localStorage
    setScript: Dispatch<string>;
    setDisabled: Dispatch<boolean>;
    setEnv: Dispatch<string | undefined>;
  }>(
    set => ({
      script: '',
      env: '',
      disabled: false,
      setScript: script => set({ script }),
      setDisabled: disabled => set({ disabled }),
      setEnv: env => set({ env }),
    }),
    {
      name: 'preflight-script-storage',
    },
  ),
  shallow,
);

const usePreflightScriptState = () =>
  usePreflightScriptStore(state => ({
    script: state.script,
    env: state.env,
    disabled: state.disabled,
  }));

const { setScript, setDisabled, setEnv } = usePreflightScriptStore.getState();

// We need to reassign to new instance after calling `.terminate()` method
let preflightWorker = new PreflightWorker();

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

type ResultLog = { type: 'log'; message: string };
type ResultError = { error: Error };
type ResultEnv = { environmentVariables: Record<string, unknown> };

type PreflightScriptResult = ResultEnv | ResultLog | ResultError;

let timerId = 0;

export async function executeScript() {
  const { disabled, script, env } = usePreflightScriptStore.getState();
  const environmentVariables = env ? JSON.parse(env) : {};

  if (disabled) {
    return { environmentVariables };
  }
  clearTimeout(timerId);
  preflightWorker.postMessage({ script, environmentVariables });

  const { promise, resolve } = Promise.withResolvers<Exclude<PreflightScriptResult, ResultLog>>();
  preflightWorker.onmessage = ({ data }: MessageEvent<PreflightScriptResult>) => {
    if ('type' in data) return;
    clearTimeout(timerId);
    if ('environmentVariables' in data) {
      const { environmentVariables } = data;
      setEnv(JSON.stringify(environmentVariables, null, 2));
      resolve({ environmentVariables });
      return;
    }
    resolve({ error: data.error });
  };
  timerId = window.setTimeout(() => {
    resolve({
      error: new Error(
        `Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`,
      ),
    });
    stopWorker();
  }, PREFLIGHT_TIMEOUT);
  return promise;
}

const TargetQuery = graphql(`
  query Target($selector: TargetSelectorInput!) {
    target(selector: $selector) {
      id
      preflightScript {
        id
        sourceCode
      }
    }
  }
`);

const UpdatePreflightScriptMutation = graphql(`
  mutation UpdatePreflightScript(
    $selector: TargetSelectorInput!
    $input: UpdatePreflightScriptInput!
  ) {
    updatePreflightScript(selector: $selector, input: $input) {
      ok {
        preflightScript {
          id
          sourceCode
        }
      }
      error {
        message
      }
    }
  }
`);

function stopWorker() {
  preflightWorker.terminate(); // This kills the worker
  preflightWorker = new PreflightWorker();
}

function PreflightScriptContent() {
  const [showModal, toggleShowModal] = useToggle();
  const { env, disabled } = usePreflightScriptState();
  const params = useParams({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug',
  });
  const [query, refetchQuery] = useQuery({
    query: TargetQuery,
    variables: { selector: params },
  });
  const { isFetching } = useExecutionContext({ nonNull: true, caller: PreflightScriptContent });

  useEffect(() => {
    if (!isFetching) {
      // Stop worker in case user aborted execution
      stopWorker();
    }
  }, [isFetching]);

  const [, mutate] = useMutation(UpdatePreflightScriptMutation);

  const preflightScript = query.data?.target?.preflightScript;
  const { toast } = useToast();

  const handleScriptChange = useCallback(
    async (newValue = '') => {
      const preflightId = preflightScript?.id;
      const { data, error } = await mutate({
        selector: params,
        input: { sourceCode: newValue },
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

      const action = preflightId ? 'updated' : 'created';
      if (!preflightId) {
        refetchQuery({
          requestPolicy: 'cache-and-network',
        });
      }
      toast({
        title: action[0].toUpperCase() + action.slice(1),
        description: `Preflight script has been ${action} successfully`,
        variant: 'default',
      });
      setScript(data!.updatePreflightScript.ok!.preflightScript.sourceCode);
    },
    [preflightScript],
  );

  const script = preflightScript?.sourceCode;

  return (
    <>
      <PreflightScriptModal
        // to unmount on submit/close
        key={String(showModal)}
        isOpen={showModal}
        toggle={toggleShowModal}
        scriptValue={script}
        onScriptValueChange={handleScriptChange}
        envValue={env}
        onEnvValueChange={setEnv}
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
          checked={!disabled}
          onCheckedChange={v => setDisabled(!v)}
          className="my-4"
          data-cy="disable-preflight-script"
        />
        <span className="w-6">{disabled ? 'OFF' : 'ON'}</span>
      </div>

      {!disabled && (
        <MonacoEditor
          height={128}
          value={script}
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
        value={env}
        onChange={setEnv}
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
  onScriptValueChange,
  envValue,
  onEnvValueChange,
}: {
  isOpen: boolean;
  toggle: () => void;
  scriptValue?: string;
  onScriptValueChange: (value?: string) => void;
  envValue: string;
  onEnvValueChange: (value?: string) => void;
}) {
  const scriptEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const envEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [logs, setLogs] = useState<(LogMessage | { type: 'separator' })[]>([]);
  const consoleRef = useRef<HTMLElement>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleScriptEditorDidMount: OnMount = useCallback(editor => {
    scriptEditorRef.current = editor;
  }, []);

  const handleEnvEditorDidMount: OnMount = useCallback(editor => {
    envEditorRef.current = editor;
  }, []);
  const handleSubmit = useCallback(() => {
    onScriptValueChange(scriptEditorRef.current?.getValue());
    onEnvValueChange(envEditorRef.current?.getValue());
    toggle();
  }, []);

  const handleStopScript = useCallback(() => {
    stopWorker();
    setLogs(prev => [...prev, '> Preflight script interrupted by user', { type: 'separator' }]);
    setIsRunning(false);
  }, []);

  const handleRunScript = useCallback(async () => {
    const now = Date.now();
    clearTimeout(timerId);

    if (isRunning) {
      handleStopScript();
      return;
    }

    setIsRunning(true);
    setLogs(prev => [...prev, '> Start running script']);

    const env = envEditorRef.current?.getValue() ?? '';
    preflightWorker.postMessage({
      script: scriptEditorRef.current?.getValue() ?? '',
      environmentVariables: env ? JSON.parse(env) : {},
    });
    preflightWorker.onmessage = ({ data }: MessageEvent<PreflightScriptResult>) => {
      setLogs(prev => {
        const result = [...prev];
        const log =
          'environmentVariables' in data ? '' : 'error' in data ? data.error : data.message;
        result.push(log);
        const isTerminated = 'environmentVariables' in data || 'error' in data;
        if (isTerminated) {
          clearTimeout(timerId);
          const last = prev.at(-1);
          const isLastSeparator =
            typeof last === 'object' && 'type' in last && last.type === 'separator';
          if (!isLastSeparator) {
            result.push(`> End running script. Done in ${(Date.now() - now) / 1000}s`, {
              type: 'separator' as const,
            });
          }
          setIsRunning(false);
        }
        if ('environmentVariables' in data) {
          setEnv(JSON.stringify(data.environmentVariables, null, 2));
        }
        return result;
      });
    };
    timerId = window.setTimeout(() => {
      stopWorker();
      setLogs(prev => [
        ...prev,
        new Error(`Preflight script execution timed out after ${PREFLIGHT_TIMEOUT / 1000} seconds`),
        { type: 'separator' },
      ]);
      setIsRunning(false);
    }, PREFLIGHT_TIMEOUT);
  }, [isRunning]);

  useEffect(() => {
    const consoleEl = consoleRef.current;

    consoleEl?.scroll({ top: consoleEl.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open && isRunning) {
          handleStopScript();
        }
        toggle();
      }}
    >
      <DialogContent className="w-11/12 max-w-[unset] xl:w-4/5">
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
                onClick={handleRunScript}
                data-cy="run-preflight-script"
              >
                {isRunning ? (
                  <>
                    <Cross2Icon className="shrink-0" />
                    Stop Script
                  </>
                ) : (
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
                onClick={() => setLogs([])}
                disabled={isRunning}
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
