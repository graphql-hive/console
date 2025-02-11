import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { usePromptManager } from '@/components/ui/prompt';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLocalStorage, useLocalStorageJson } from '@/lib/hooks';
import { Kit } from '../../kit';
import { IFrameEvents, LogRecord, PreflightWorkerState } from '../shared-types';

export type PreflightResultData = Omit<IFrameEvents.Outgoing.EventData.Result, 'type' | 'runId'>;

const PreflightScript_TargetFragment = graphql(`
  fragment PreflightScript_TargetFragment on Target {
    id
    preflightScript {
      id
      sourceCode
    }
  }
`);

export type PreflightObject = ReturnType<typeof usePreflight>;

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
