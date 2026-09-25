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
import { InfoIcon, PencilIcon, PlayIcon, PowerIcon, XIcon } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { useMutation } from 'urql';
import { z } from 'zod';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { useToast } from '@/components/base/toast/toast';
import { useTheme } from '@/components/theme/theme-provider';
import { Subtitle } from '@/components/ui/page';
import { usePromptManager } from '@/components/ui/prompt';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLocalStorage, useLocalStorageJson, useToggle } from '@/lib/hooks';
import { GraphiQLPlugin } from '@graphiql/react';
import { Editor as MonacoEditor, OnMount, type Monaco } from '@monaco-editor/react';
import { captureException } from '@sentry/react';
import { getRouteApi } from '@tanstack/react-router';
import { Kit } from '../kit';
import { cn } from '../utils';
import labApiDefinitionRaw from './lab-api-declaration?raw';
import { IFrameEvents, LogMessage } from './shared-types';

export type PreflightResultData = Omit<IFrameEvents.Outgoing.EventData.Result, 'type' | 'runId'>;

export const preflightPlugin: GraphiQLPlugin = {
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
  content: PreflightContent,
};

const targetRoute = getRouteApi('/authenticated/$organizationSlug/$projectSlug/$targetSlug');

const classes = {
  monaco: clsx('*:bg-editor'),
  monacoMini: clsx('h-32 *:rounded-md *:bg-editor'),
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
    defaultLanguage: 'javascript',
    options: {
      ...sharedMonacoProps.options,
    },
  },
} satisfies Record<'script' | 'env', ComponentPropsWithoutRef<typeof MonacoEditor>>;

function useMonacoTheme() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? 'vs-dark' : 'vs';
}

function exposeMonacoEditorForE2E(name: string, editor: editor.IStandaloneCodeEditor) {
  if (!import.meta.env.DEV) {
    return;
  }

  const global = window as unknown as {
    __HIVE_E2E_MONACO_EDITORS?: Record<string, editor.IStandaloneCodeEditor>;
  };

  global.__HIVE_E2E_MONACO_EDITORS ??= {};
  global.__HIVE_E2E_MONACO_EDITORS[name] = editor;
}

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
    viewerCanModifyPreflightScript
  }
`);

export type LogRecord = LogMessage | { type: 'separator' };

export const enum PreflightWorkerState {
  running,
  ready,
}

function PromiseWithResolvers<T>() {
  let resolve: (value: T) => void;
  let reject: (error: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    reject: reject!,
    resolve: resolve!,
  };
}

export function usePreflight(args: {
  target: FragmentType<typeof PreflightScript_TargetFragment> | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prompt = usePromptManager();

  const target = useFragment(PreflightScript_TargetFragment, args.target);
  const [isEnabled, setIsEnabled] = useLocalStorageJson(
    // todo: ability to pass historical keys for seamless gradual migration to new key names.
    // 'hive:laboratory:isPreflightEnabled',
    'hive:laboratory:isPreflightScriptEnabled',
    z.boolean().default(false),
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

  const abortExecutionRef = useRef<null | (() => void)>(null);

  async function execute(
    script = target?.preflightScript?.sourceCode ?? '',
    isPreview = false,
  ): Promise<PreflightResultData> {
    const resultEnvironmentVariablesDecoded: PreflightResultData['environmentVariables'] =
      Kit.tryOr(
        () => JSON.parse(latestEnvironmentVariablesRef.current),
        // todo: find a better solution than blowing away the user's
        // invalid localStorage state.
        //
        // For example if the user has:
        //
        // { "foo": "bar }
        //
        // Then when they "Run Script" it will be replaced with:
        //
        // {}
        //
        () => ({}),
      );
    const result: PreflightResultData = {
      request: {
        headers: [],
      },
      environmentVariables: resultEnvironmentVariablesDecoded,
    };

    if (isPreview === false && !isEnabled) {
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
          // Preflight has read/write relationship with environment variables.
          environmentVariables: result.environmentVariables,
        } satisfies IFrameEvents.Incoming.EventData,
        '*',
      );

      let isFinished = false;
      const isFinishedD = PromiseWithResolvers<void>();
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
        // Since we cannot know if the event source is Preflight, we cannot perform an exhaustive check.
        //
        // Kit.neverCase(ev.data);
        //
        console.debug(
          'preflight sandbox graphiql plugin: An unknown window message event received. Ignoring.',
          ev,
        );
      }

      window.addEventListener('message', eventHandler);
      abortExecutionRef.current = () => {
        contentWindow.postMessage({
          type: IFrameEvents.Incoming.Event.abort,
          id,
        } satisfies IFrameEvents.Incoming.EventData);

        closedOpenedPrompts();

        abortExecutionRef.current = null;
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

  function abortExecution() {
    abortExecutionRef.current?.();
  }

  // terminate worker when leaving laboratory
  useEffect(
    () => () => {
      abortExecutionRef.current?.();
    },
    [],
  );

  return {
    execute,
    abortExecution,
    isEnabled,
    setIsEnabled,
    content: target?.preflightScript?.sourceCode ?? '',
    viewerCanModifyPreflightScript: target?.viewerCanModifyPreflightScript ?? false,
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

type PreflightObject = ReturnType<typeof usePreflight>;

const PreflightContext = createContext<PreflightObject | null>(null);
export const PreflightProvider = PreflightContext.Provider;

function PreflightContent() {
  const preflight = useContext(PreflightContext);
  const monacoTheme = useMonacoTheme();
  if (preflight === null) {
    throw new Error('PreflightContent used outside PreflightContext.Provider');
  }

  const [showModal, toggleShowModal] = useToggle();
  const [modalSession, setModalSession] = useState(0);
  const params = targetRoute.useParams();

  const [, mutate] = useMutation(UpdatePreflightScriptMutation);

  const { toast } = useToast();

  const handleContentChange = useCallback(async (newValue = '') => {
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
      {preflight.viewerCanModifyPreflightScript && (
        <PreflightModal
          key={modalSession}
          isOpen={showModal}
          toggle={toggleShowModal}
          onOpenChangeComplete={open => {
            if (!open) {
              setModalSession(s => s + 1);
            }
          }}
          execute={value =>
            preflight.execute(value, true).catch(err => {
              console.error(err);
            })
          }
          state={preflight.state}
          abortExecution={preflight.abortExecution}
          logs={preflight.logs}
          clearLogs={preflight.clearLogs}
          content={preflight.content}
          onContentChange={handleContentChange}
          envValue={preflight.environmentVariables}
          onEnvValueChange={preflight.setEnvironmentVariables}
        />
      )}
      <div className="graphiql-doc-explorer-title flex items-center justify-between gap-4">
        Preflight Script
        {preflight.viewerCanModifyPreflightScript && (
          <Button variant="link" onClick={toggleShowModal} data-cy="preflight-modal-button">
            <span className="flex items-center gap-1">
              <PencilIcon className="size-4 shrink-0" />
              Edit
            </span>
          </Button>
        )}
      </div>
      <Subtitle>
        Before each GraphQL request begins, this script is executed automatically - for example, to
        handle authentication.
      </Subtitle>

      <div className="mt-3">
        <Button
          size="compact"
          variant="outline"
          onClick={() => preflight.setIsEnabled(!preflight.isEnabled)}
          data-cy="toggle-preflight"
        >
          <PowerIcon className="mr-2 size-4" />
          {preflight.isEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <EditorTitle className="mt-6 flex cursor-not-allowed items-center gap-2">
        Script <Badge content="JavaScript" variants={{ variant: 'outline' }} />
      </EditorTitle>
      <Subtitle className="mb-3 cursor-not-allowed">Read-only view of the script</Subtitle>
      <div className="relative">
        {preflight.isEnabled ? null : (
          <div className="text-fg bg-editor-backdrop/90 absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="bg-editor rounded-md p-4 text-sm">
              Preflight Script is disabled and will not be executed
            </div>
          </div>
        )}
        <MonacoEditor
          height={128}
          value={preflight.content}
          {...monacoProps.script}
          theme={monacoTheme}
          className={cn(classes.monacoMini, 'z-10')}
          wrapperProps={{
            ['data-cy']: 'preflight-editor-mini',
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
        Environment variables <Badge content="JSON" variants={{ variant: 'outline' }} />
      </EditorTitle>
      <Subtitle className="mb-3">
        Declare variables that can be used by both the script and headers.
      </Subtitle>
      <MonacoEditor
        height={128}
        value={preflight.environmentVariables}
        onChange={value => preflight.setEnvironmentVariables(value ?? '')}
        onMount={editor => exposeMonacoEditorForE2E('env-editor-mini', editor)}
        {...monacoProps.env}
        theme={monacoTheme}
        className={classes.monacoMini}
        wrapperProps={{
          ['data-cy']: 'env-editor-mini',
        }}
      />
    </>
  );
}

function PreflightModal({
  isOpen,
  toggle,
  onOpenChangeComplete,
  content,
  state,
  execute,
  abortExecution,
  logs,
  clearLogs,
  onContentChange,
  envValue,
  onEnvValueChange,
}: {
  isOpen: boolean;
  toggle: () => void;
  onOpenChangeComplete: (open: boolean) => void;
  content?: string;
  state: PreflightWorkerState;
  execute: (script: string) => void;
  abortExecution: () => void;
  logs: Array<LogRecord>;
  clearLogs: () => void;
  onContentChange: (value: string) => void;
  envValue: string;
  onEnvValueChange: (value: string) => void;
}) {
  const monacoTheme = useMonacoTheme();
  const scriptEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const envEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const handleScriptEditorDidMount: OnMount = useCallback(editor => {
    scriptEditorRef.current = editor;
    exposeMonacoEditorForE2E('preflight-editor', editor);
  }, []);

  const handleEnvEditorDidMount: OnMount = useCallback(editor => {
    envEditorRef.current = editor;
    exposeMonacoEditorForE2E('env-editor', editor);
  }, []);

  const handleMonacoEditorBeforeMount = useCallback(async (monaco: Monaco) => {
    // Lazy-load the TS language service on first preflight mount if it hasn't
    // already been registered. `schema-editor.tsx` configures Monaco with the
    // lean `editor.api` entry (no languages bundled), so `monaco.languages
    // .typescript` is only defined after this side-effect import has run.
    if (!monaco.languages.typescript) {
      await import('monaco-editor/esm/vs/language/typescript/monaco.contribution');
    }

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
    onContentChange(scriptEditorRef.current?.getValue() ?? '');
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
      onOpenChange={(open, details) => {
        // Escape inside Monaco leaves the editor's own mode, not the modal.
        if (
          !open &&
          details.reason === 'escape-key' &&
          details.event.target instanceof HTMLTextAreaElement
        ) {
          details.cancel();
          return;
        }
        if (!open) {
          abortExecution();
        }
        toggle();
      }}
      onOpenChangeComplete={onOpenChangeComplete}
      width="xl"
      title="Edit your Preflight Script"
      description={
        <>
          This script will run in each user's browser and be stored in plain text on our servers.
          Don't share any secrets here.
          <br />
          All team members can view the script and toggle it off when they need to.
        </>
      }
      footer={
        <>
          <p className="text-fg-default me-auto flex items-center gap-2 text-sm">
            <InfoIcon className="size-4 shrink-0" />
            Changes made to this Preflight Script will apply to all users on your team using this
            target.
          </p>
          <Button type="button" variant="outline" onClick={toggle} data-cy="preflight-modal-cancel">
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            data-cy="preflight-modal-submit"
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid h-[60vh] grid-cols-2 [&_section]:grow">
        <div className="mr-4 flex flex-col">
          <div className="flex justify-between p-2">
            <EditorTitle className="flex gap-2">
              Script Editor
              <Badge content="JavaScript" variants={{ variant: 'outline' }} />
            </EditorTitle>
            <Button
              variant="link"
              onClick={e => {
                e.stopPropagation();
                if (state === PreflightWorkerState.running) {
                  abortExecution();
                  return;
                }

                execute(scriptEditorRef.current?.getValue() ?? '');
              }}
              data-cy="run-preflight"
            >
              <span className="flex items-center gap-1">
                {state === PreflightWorkerState.running && (
                  <>
                    <XIcon className="size-4 shrink-0" />
                    Stop Script
                  </>
                )}
                {state === PreflightWorkerState.ready && (
                  <>
                    <PlayIcon className="size-4 shrink-0" />
                    Run Script
                  </>
                )}
              </span>
            </Button>
          </div>
          <MonacoEditor
            value={content}
            beforeMount={handleMonacoEditorBeforeMount}
            onMount={handleScriptEditorDidMount}
            {...monacoProps.script}
            theme={monacoTheme}
            options={{
              ...monacoProps.script.options,
              wordWrap: 'wordWrapColumn',
            }}
            wrapperProps={{
              ['data-cy']: 'preflight-editor',
            }}
          />
        </div>
        <div className="flex h-[inherit] flex-col">
          <div className="flex justify-between p-2">
            <EditorTitle>Console Output</EditorTitle>
            <Button
              variant="link"
              onClick={clearLogs}
              disabled={state === PreflightWorkerState.running}
            >
              <span className="flex items-center gap-1">
                <XIcon className="size-3 shrink-0" />
                Clear Output
              </span>
            </Button>
          </div>
          <div className="bg-editor flex h-1/2 flex-col">
            <ScrollArea fill ref={consoleRef} data-cy="console-output">
              <section className="py-2.5 pl-[26px] pr-2.5 font-mono text-xs/[18px]">
                {logs.map((log, index) => (
                  <LogLine key={index} log={log} />
                ))}
              </section>
            </ScrollArea>
          </div>
          <EditorTitle className="flex gap-2 p-2">
            Environment Variables
            <Badge content="JSON" variants={{ variant: 'outline' }} />
          </EditorTitle>
          <MonacoEditor
            value={envValue}
            onChange={value => onEnvValueChange(value ?? '')}
            onMount={handleEnvEditorDidMount}
            {...monacoProps.env}
            theme={monacoTheme}
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
    </Dialog>
  );
}

const LOG_COLORS = {
  error: 'text-critical',
  info: 'text-success',
  warn: 'text-warning',
  log: 'text-fg-secondary',
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
