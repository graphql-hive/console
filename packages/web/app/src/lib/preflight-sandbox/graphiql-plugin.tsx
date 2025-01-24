import {
  ComponentPropsWithoutRef,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { PowerIcon } from 'lucide-react';
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
import { Subtitle } from '@/components/ui/page';
import { usePromptManager } from '@/components/ui/prompt';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLocalStorage, useToggle } from '@/lib/hooks';
import { GraphiQLPlugin } from '@graphiql/react';
import { Editor as MonacoEditor, OnMount, type Monaco } from '@monaco-editor/react';
import { Cross2Icon, InfoCircledIcon, Pencil1Icon, TriangleRightIcon } from '@radix-ui/react-icons';
import { captureException } from '@sentry/react';
import { useParams } from '@tanstack/react-router';
import { Kit } from '../kit';
import { cn } from '../utils';
import labApiDefinitionRaw from './lab-api-declaration?raw';
import { IFrameEvents, LogMessage } from './shared-types';

export type PreflightScriptResultData = Omit<
  IFrameEvents.Outgoing.EventData.Result,
  'type' | 'runId'
>;

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

function EditorTitle(props: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('cursor-default text-base font-semibold tracking-tight', props.className)}>
      {props.children}
    </div>
  );
}

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

export type LogRecord = LogMessage | { type: 'separator' };

export const enum PreflightWorkerState {
  running,
  ready,
}

export function usePreflightScript(args: {
  target: FragmentType<typeof PreflightScript_TargetFragment> | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prompt = usePromptManager();

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

  async function execute(
    script = target?.preflightScript?.sourceCode ?? '',
    isPreview = false,
  ): Promise<PreflightScriptResultData> {
    const resultEnvironmentVariablesDecoded: PreflightScriptResultData['environmentVariables'] =
      Kit.tryOr(
        () => JSON.parse(latestEnvironmentVariablesRef.current),
        () => ({}),
      );
    const result: PreflightScriptResultData = {
      request: {
        headers: [],
      },
      environmentVariables: resultEnvironmentVariablesDecoded,
    };

    if (isPreview === false && !isPreflightScriptEnabled) {
      return result;
    }

    const id = crypto.randomUUID();
    setState(PreflightWorkerState.running);
    const now = Date.now();
    setLogs(prev => [
      ...prev,
      {
        level: 'log',
        message: 'Running script...',
      },
    ]);

    try {
      const contentWindow = iframeRef.current?.contentWindow;

      if (!contentWindow) {
        throw new Error('Could not load iframe embed.');
      }

      contentWindow.postMessage(
        {
          type: IFrameEvents.Incoming.Event.run,
          id,
          script,
          // Preflight Script has read/write relationship with environment variables.
          environmentVariables: result.environmentVariables,
        } satisfies IFrameEvents.Incoming.EventData,
        '*',
      );

      let isFinished = false;
      const isFinishedD = Promise.withResolvers<void>();
      const openedPromptIds = new Set<number>();

      // eslint-disable-next-line no-inner-declarations
      function setFinished() {
        isFinished = true;
        isFinishedD.resolve();
      }

      // eslint-disable-next-line no-inner-declarations
      function closedOpenedPrompts() {
        if (openedPromptIds.size) {
          for (const promptId of openedPromptIds) {
            prompt.closePrompt(promptId, null);
          }
        }
      }

      // eslint-disable-next-line no-inner-declarations
      async function eventHandler(ev: IFrameEvents.Outgoing.MessageEvent) {
        if (ev.data.type === IFrameEvents.Outgoing.Event.prompt) {
          const promptId = ev.data.promptId;
          openedPromptIds.add(promptId);
          await prompt
            .openPrompt({
              id: promptId,
              title: ev.data.message,
              defaultValue: ev.data.defaultValue,
            })
            .then(value => {
              if (isFinished) {
                // ignore prompt response if the script has already finished
                return;
              }

              openedPromptIds.delete(promptId);
              contentWindow?.postMessage(
                {
                  type: IFrameEvents.Incoming.Event.promptResponse,
                  id,
                  promptId,
                  value,
                } satisfies IFrameEvents.Incoming.EventData,
                '*',
              );
            });
          return;
        }

        if (ev.data.type === IFrameEvents.Outgoing.Event.result) {
          const mergedEnvironmentVariables = {
            ...result.environmentVariables,
            ...ev.data.environmentVariables,
          };
          result.environmentVariables = mergedEnvironmentVariables;
          result.request.headers = ev.data.request.headers;

          // Cause the new state of environment variables to be
          // written back to local storage.
          const mergedEnvironmentVariablesEncoded = JSON.stringify(
            result.environmentVariables,
            null,
            2,
          );
          setEnvironmentVariables(mergedEnvironmentVariablesEncoded);
          latestEnvironmentVariablesRef.current = mergedEnvironmentVariablesEncoded;

          setLogs(logs => [
            ...logs,
            {
              level: 'log',
              message: `Done in ${(Date.now() - now) / 1000}s`,
            },
            {
              type: 'separator' as const,
            },
          ]);
          setFinished();
          return;
        }

        if (ev.data.type === IFrameEvents.Outgoing.Event.error) {
          const error = ev.data.error;
          setLogs(logs => [
            ...logs,
            {
              level: 'error',
              message: error.message,
              line: error.line,
              column: error.column,
            },
            {
              level: 'log',
              message: 'Script failed',
            },
            {
              type: 'separator' as const,
            },
          ]);
          setFinished();
          closedOpenedPrompts();
          return;
        }

        if (ev.data.type === IFrameEvents.Outgoing.Event.log) {
          const log = ev.data.log;
          setLogs(logs => [...logs, log]);
          return;
        }

        if (ev.data.type === IFrameEvents.Outgoing.Event.ready) {
          console.debug('preflight sandbox graphiql plugin: noop iframe event:', ev.data);
          return;
        }

        if (ev.data.type === IFrameEvents.Outgoing.Event.start) {
          console.debug('preflight sandbox graphiql plugin: noop iframe event:', ev.data);
          return;
        }

        // Window message events can be emitted from unknowable sources.
        // For example when our e2e tests runs within Cypress GUI, we see a `MessageEvent` with `.data` of `{ vscodeScheduleAsyncWork: 3 }`.
        // Since we cannot know if the event source is Preflight Script, we cannot perform an exhaustive check.
        //
        // Kit.neverCase(ev.data);
        //
        console.debug(
          'preflight sandbox graphiql plugin: An unknown window message event received. Ignoring.',
          ev,
        );
      }

      window.addEventListener('message', eventHandler);
      currentRun.current = () => {
        contentWindow.postMessage({
          type: IFrameEvents.Incoming.Event.abort,
          id,
        } satisfies IFrameEvents.Incoming.EventData);

        closedOpenedPrompts();

        currentRun.current = null;
      };

      await isFinishedD.promise;
      window.removeEventListener('message', eventHandler);

      setState(PreflightWorkerState.ready);

      return result;
    } catch (err) {
      if (err instanceof Error) {
        setLogs(prev => [
          ...prev,
          {
            level: 'error',
            message: err.message,
          },
          {
            level: 'log',
            message: 'Script failed',
          },
          {
            type: 'separator' as const,
          },
        ]);
        setState(PreflightWorkerState.ready);
        return result;
      }
      throw err;
    }
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
    iframeElement: (
      <iframe
        src="/__preflight-embed"
        title="preflight-worker"
        className="hidden"
        data-cy="preflight-embed-iframe"
        /**
         * In DEV we need to use "allow-same-origin", as otherwise the embed can not instantiate the webworker (which is loaded from an URL).
         * In PROD the webworker is not
         */
        sandbox={'allow-scripts' + (import.meta.env.DEV ? ' allow-same-origin' : '')}
        ref={iframeRef}
      />
    ),
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
        Before each GraphQL request begins, this script is executed automatically - for example, to
        handle authentication.
      </Subtitle>

      <div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() =>
            preflightScript.setIsPreflightScriptEnabled(!preflightScript.isPreflightScriptEnabled)
          }
          data-cy="toggle-preflight-script"
        >
          <PowerIcon className="mr-2 size-4" />
          {preflightScript.isPreflightScriptEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <EditorTitle className="mt-6 flex cursor-not-allowed items-center gap-2">
        Script{' '}
        <Badge className="text-xs" variant="outline">
          JavaScript
        </Badge>
      </EditorTitle>
      <Subtitle className="mb-3 cursor-not-allowed">Read-only view of the script</Subtitle>
      <div className="relative">
        {preflightScript.isPreflightScriptEnabled ? null : (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#030711]/90 p-4 text-white">
            <div className="rounded-md bg-[#0f1520] p-4 text-sm">
              Preflight Script is disabled and will not be executed
            </div>
          </div>
        )}
        <MonacoEditor
          height={128}
          value={preflightScript.script}
          {...monacoProps.script}
          className={cn(classes.monacoMini, 'z-10')}
          wrapperProps={{
            ['data-cy']: 'preflight-script-editor-mini',
          }}
          options={{
            ...monacoProps.script.options,
            lineNumbers: 'off',
            domReadOnly: true,
            readOnly: true,
            hover: {
              enabled: false,
            },
          }}
        />
      </div>

      <EditorTitle className="mt-6 flex items-center gap-2">
        Environment variables{' '}
        <Badge className="text-xs" variant="outline">
          JSON
        </Badge>
      </EditorTitle>
      <Subtitle className="mb-3">
        Declare variables that can be used by both the script and headers.
      </Subtitle>
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

  const handleMonacoEditorBeforeMount = useCallback((monaco: Monaco) => {
    // Add custom typings for globalThis
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
        ${labApiDefinitionRaw}
        declare const lab: LabAPI;
      `,
      'global.d.ts',
    );
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
            Don't share any secrets here.
            <br />
            All team members can view the script and toggle it off when they need to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid h-[60vh] grid-cols-2 [&_section]:grow">
          <div className="mr-4 flex flex-col">
            <div className="flex justify-between p-2">
              <EditorTitle className="flex gap-2">
                Script Editor
                <Badge className="text-xs" variant="outline">
                  JavaScript
                </Badge>
              </EditorTitle>
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
              beforeMount={handleMonacoEditorBeforeMount}
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
              <EditorTitle>Console Output</EditorTitle>
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
              className="h-1/2 overflow-hidden overflow-y-scroll bg-[#10151f] py-2.5 pl-[26px] pr-2.5 font-mono text-xs/[18px]"
              data-cy="console-output"
            >
              {logs.map((log, index) => (
                <LogLine key={index} log={log} />
              ))}
            </section>
            <EditorTitle className="flex gap-2 p-2">
              Environment Variables
              <Badge className="text-xs" variant="outline">
                JSON
              </Badge>
            </EditorTitle>
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

const LOG_COLORS = {
  error: 'text-red-400',
  info: 'text-emerald-400',
  warn: 'text-yellow-400',
  log: 'text-gray-400',
};

export function LogLine({ log }: { log: LogRecord }) {
  if ('type' in log && log.type === 'separator') {
    return <hr className="my-2 border-dashed border-current" />;
  }

  if ('level' in log && log.level in LOG_COLORS) {
    return (
      <div className={LOG_COLORS[log.level]}>
        {log.level}: {log.message}
        {log.line && log.column ? ` (${log.line}:${log.column})` : ''}
      </div>
    );
  }

  captureException(new Error('Unexpected log type in Preflight Script output'), {
    extra: { log },
  });
  return null;
}
