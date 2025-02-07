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
import { useMutation } from 'urql';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Subtitle } from '@/components/ui/page';
import { usePromptManager } from '@/components/ui/prompt';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLocalStorage, useLocalStorageJson, useToggle } from '@/lib/hooks';
import { GraphiQLPlugin } from '@graphiql/react';
import { Pencil1Icon } from '@radix-ui/react-icons';
import { useParams } from '@tanstack/react-router';
import { Kit } from '../kit';
import { cn } from '../utils';
import { EditorTitle } from './components/EditorTitle';
import { EnvironmentEditor } from './components/EnvironmentEditor';
import { PreflightModal } from './components/PreflightModal';
import { ScriptEditor } from './components/ScriptEditor';
import { IFrameEvents, LogRecord, PreflightWorkerState } from './shared-types';

export type PreflightResultData = Omit<IFrameEvents.Outgoing.EventData.Result, 'type' | 'runId'>;

const classes = {
  monacoMini: clsx('h-32 *:rounded-md *:bg-[#10151f]'),
  // todo: was unused, commented out for now, remove?
  // icon: clsx('absolute -left-5 top-px'),
};

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
  if (preflight === null) {
    throw new Error('PreflightContent used outside PreflightContext.Provider');
  }

  const [showModal, toggleShowModal] = useToggle();
  const params = useParams({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug',
  });

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
      <PreflightModal
        // to unmount on submit/close
        key={String(showModal)}
        isOpen={showModal}
        toggle={toggleShowModal}
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
      <div className="graphiql-doc-explorer-title flex items-center justify-between gap-4">
        Preflight Script
        <Button
          variant="orangeLink"
          size="icon-sm"
          className="size-auto gap-1"
          onClick={toggleShowModal}
          data-cy="preflight-modal-button"
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
          onClick={() => preflight.setIsEnabled(!preflight.isEnabled)}
          data-cy="toggle-preflight"
        >
          <PowerIcon className="mr-2 size-4" />
          {preflight.isEnabled ? 'On' : 'Off'}
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
        {preflight.isEnabled ? null : (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#030711]/90 p-4 text-white">
            <div className="rounded-md bg-[#0f1520] p-4 text-sm">
              Preflight Script is disabled and will not be executed
            </div>
          </div>
        )}
        <ScriptEditor
          height={128}
          value={preflight.content}
          className={cn(classes.monacoMini, 'z-10')}
          wrapperProps={{
            ['data-cy']: 'preflight-editor-mini',
          }}
          options={{
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
      <EnvironmentEditor
        height={128}
        value={preflight.environmentVariables}
        onChange={value => preflight.setEnvironmentVariables(value ?? '')}
        className={classes.monacoMini}
        wrapperProps={{
          ['data-cy']: 'env-editor-mini',
        }}
      />
    </>
  );
}
