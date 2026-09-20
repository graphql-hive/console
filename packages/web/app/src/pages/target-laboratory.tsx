import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphiQL } from 'graphiql';
import { buildSchema } from 'graphql';
import { EraserIcon, MaximizeIcon, MinimizeIcon, SaveIcon, ShareIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery } from 'urql';
import { Collapsible } from '@/components/base/collapsible/collapsible';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { useToast } from '@/components/base/toast/toast';
import { Page, TargetLayout } from '@/components/layouts/target';
import { ConnectLabModal } from '@/components/target/laboratory/connect-lab-modal';
import { CreateOperationModal } from '@/components/target/laboratory/create-operation-modal';
import { Button } from '@/components/base/button/button';
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { graphql } from '@/gql';
import { useClipboard, useToggle } from '@/lib/hooks';
import { useCollections } from '@/lib/hooks/laboratory/use-collections';
import { useCurrentOperation } from '@/lib/hooks/laboratory/use-current-operation';
import {
  operationCollectionsPlugin,
  TargetLaboratoryPageQuery,
} from '@/lib/hooks/laboratory/use-operation-collections-plugin';
import { useSyncOperationState } from '@/lib/hooks/laboratory/use-sync-operation-state';
import { useOperationFromQueryString } from '@/lib/hooks/laboratory/useOperationFromQueryString';
import { useResetState } from '@/lib/hooks/use-reset-state';
import {
  LogLine,
  LogRecord,
  preflightPlugin,
  PreflightProvider,
  PreflightResultData,
  usePreflight,
} from '@/lib/preflight/graphiql-plugin';
import { cn } from '@/lib/utils';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import {
  UnStyledButton as GraphiQLButton,
  GraphiQLProviderProps,
  Tooltip as GraphiQLTooltip,
  useEditorContext,
} from '@graphiql/react';
import { createGraphiQLFetcher, Fetcher, isAsyncIterable } from '@graphiql/toolkit';
import { Repeater } from '@repeaterjs/repeater';
import { Link as RouterLink, useRouter } from '@tanstack/react-router';
import 'graphiql/style.css';
import '@graphiql/plugin-explorer/style.css';
import { Menu } from '@/components/base/floating/menu/menu';
import { ToggleGroup } from '@/components/base/toggle-group/toggle-group';
import { PromptManager, PromptProvider } from '@/components/ui/prompt';
import { useRedirect } from '@/lib/access/common';
import { Kit } from '@/lib/kit';

const explorer = explorerPlugin();

// Declare outside components, otherwise while clicking on field in explorer operationCollectionsPlugin will be open
const plugins = [explorer, operationCollectionsPlugin, preflightPlugin];

function Share(): ReactElement | null {
  const label = 'Share query';
  const copyToClipboard = useClipboard();
  const operationFromQueryString = useOperationFromQueryString();

  if (!operationFromQueryString) return null;

  return (
    <GraphiQLTooltip label={label}>
      <GraphiQLButton
        className="graphiql-toolbar-button"
        aria-label={label}
        onClick={async () => {
          await copyToClipboard(window.location.href);
        }}
      >
        <ShareIcon className="graphiql-toolbar-icon" />
      </GraphiQLButton>
    </GraphiQLTooltip>
  );
}

const UpdateOperationMutation = graphql(`
  mutation UpdateOperation(
    $selector: TargetSelectorInput!
    $input: UpdateDocumentCollectionOperationInput!
  ) {
    updateOperationInDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        operation {
          id
          name
          query
          variables
          headers
        }
      }
    }
  }
`);

function Save(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const router = useRouter();
  const [operationModalOpen, toggleOperationModal] = useToggle();
  const { collections } = useCollections({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });
  const { toast } = useToast();
  const currentOperation = useCurrentOperation({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });
  const [, mutateUpdate] = useMutation(UpdateOperationMutation);
  const { queryEditor, variableEditor, headerEditor, updateActiveTabValues } = useEditorContext()!;
  const { clearOperation } = useSyncOperationState({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });
  const operationFromQueryString = useOperationFromQueryString();

  const onSaveSuccess = useCallback(
    ({ id, name }: { id: string; name: string }) => {
      if (id) {
        if (!operationFromQueryString) {
          updateActiveTabValues({ id, title: name });
        }
        void router.navigate({
          to: '/$organizationSlug/$projectSlug/$targetSlug/laboratory',
          params: {
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
          },
          search: { operation: id },
        });
      }
      clearOperation();
    },
    [clearOperation, router],
  );
  const isSame =
    !!currentOperation &&
    currentOperation.query === queryEditor?.getValue() &&
    currentOperation.variables === variableEditor?.getValue() &&
    currentOperation.headers === headerEditor?.getValue();

  const label = 'Save operation';

  return (
    <>
      <Menu
        align="end"
        trigger={props => (
          // A function, not an element: `GraphiQLTooltip` forwards nothing, so it cannot carry
          // the trigger props down. Applying them to the button lets the tooltip wrap it.
          <GraphiQLTooltip label={label}>
            <GraphiQLButton
              {...props}
              data-cy="save-operation"
              className={cn(
                'graphiql-toolbar-button',
                currentOperation && !isSame && 'hive-badge-is-changed relative after:top-1',
              )}
              aria-label={label}
            >
              <SaveIcon className="graphiql-toolbar-icon h-5" />
            </GraphiQLButton>
          </GraphiQLTooltip>
        )}
        sections={[
          [
            !isSame &&
              currentOperation && {
                label: 'Discard changes',
                variant: 'destructiveAction' as const,
                onClick: () => {
                  queryEditor?.setValue(currentOperation.query);
                  clearOperation();
                },
              },
          ],
          [
            {
              label: 'Save',
              disabled: isSame || !currentOperation,
              onClick: async () => {
                if (!currentOperation || isSame) {
                  return;
                }
                const { error, data } = await mutateUpdate({
                  selector: {
                    targetSlug: props.targetSlug,
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                  },
                  input: {
                    name: currentOperation.name,
                    collectionId: currentOperation.collection.id,
                    query: queryEditor?.getValue(),
                    variables: variableEditor?.getValue(),
                    headers: headerEditor?.getValue(),
                    operationId: currentOperation.id,
                  },
                });
                if (data) {
                  clearOperation();
                  toast({ title: 'Updated!' });
                }
                if (error) {
                  toast({ variant: 'destructive', title: error.message });
                }
              },
            },
            {
              label: 'Save as',
              onClick: () => {
                if (!collections.length) {
                  toast({ variant: 'destructive', title: 'Please create a collection first.' });
                  return;
                }
                toggleOperationModal();
              },
              attrs: { 'data-cy': 'save-operation-as' },
            },
          ],
        ]}
      />
      <CreateOperationModal
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        isOpen={operationModalOpen}
        close={toggleOperationModal}
        onSaveSuccess={onSaveSuccess}
      />
    </>
  );
}

function substituteVariablesInHeaders(
  headers: Record<string, string>,
  environmentVariables: Record<string, Kit.Json.Primitive>,
) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      if (typeof value === 'string') {
        // Replace all occurrences of `{{keyName}}` strings only if key exists in `environmentVariables`
        value = value.replaceAll(/{{(?<keyName>.*?)}}/g, (originalString, envKey: string) => {
          return Object.hasOwn(environmentVariables, envKey)
            ? String(environmentVariables[envKey])
            : originalString;
        });
      }
      return [key, value];
    }),
  );
}

function LaboratoryPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  selectedOperationId?: string;
  defaultLaboratoryTab: 'graphiql' | 'hive-laboratory';
  onLaboratoryTabChange: (tab: 'graphiql' | 'hive-laboratory') => void;
}) {
  const [query] = useQuery({
    query: TargetLaboratoryPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });
  const router = useRouter();
  const [isConnectLabModalOpen, toggleConnectLabModal] = useToggle();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { collections } = useCollections({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });

  const userOperations = useMemo(() => {
    const operations = collections.flatMap(collection =>
      collection.operations.edges.map(o => o.node.id),
    );
    return new Set(operations);
  }, [collections]);

  const sdl = query.data?.target?.latestSchemaVersion?.sdl;
  const schema = useMemo(() => (sdl ? buildSchema(sdl) : null), [sdl]);

  const [actualSelectedApiEndpoint, setEndpointType] = useApiTabValueState(
    query.data?.target?.graphqlEndpointUrl ?? null,
  );

  const mockEndpoint = `${location.origin}/api/lab/${props.organizationSlug}/${props.projectSlug}/${props.targetSlug}`;
  const target = query.data?.target;

  const preflight = usePreflight({ target: target ?? null });

  const fetcher = useMemo<Fetcher>(() => {
    return async (params, opts) => {
      const url =
        (actualSelectedApiEndpoint === 'linkedApi' ? target?.graphqlEndpointUrl : undefined) ??
        mockEndpoint;

      return new Repeater(async (push, stop) => {
        let isPreflightExecutionDone = false;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        stop.then(() => {
          if (!isPreflightExecutionDone) {
            preflight.abortExecution();
          }
        });

        let preflightResultData: PreflightResultData;
        try {
          preflightResultData = await preflight.execute();
        } catch (err: unknown) {
          if (err instanceof Error === false) {
            throw err;
          }
          const formatError = JSON.stringify(
            {
              name: err.name,
              message: err.message,
            },
            null,
            2,
          );
          const error = new Error(`Error during preflight execution:\n\n${formatError}`);
          // We only want to expose the error message, not the whole stack trace.
          delete error.stack;
          stop(error);
          return;
        } finally {
          isPreflightExecutionDone = true;
        }

        const headers = {
          // We want to prevent users from interpolating environment variables into
          // their preflight headers. So, apply substitution BEFORE merging
          // in preflight headers.
          //
          ...substituteVariablesInHeaders(
            opts?.headers ?? {},
            preflightResultData.environmentVariables,
          ),
          ...Object.fromEntries(preflightResultData.request.headers),
        };

        const graphiqlFetcher = createGraphiQLFetcher({ url, fetch });
        const result = await graphiqlFetcher(params, {
          ...opts,
          headers,
        });

        if (isAsyncIterable(result)) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          stop.then(
            () => 'return' in result && result.return instanceof Function && result.return(),
          );
          try {
            for await (const value of result) {
              await push(value);
            }
            stop();
          } catch (err) {
            const error = new Error(err instanceof Error ? err.message : 'Unexpected error.');
            // We only want to expose the error message, not the whole stack trace.
            delete error.stack;
            stop(error);
            return;
          }
        }

        return result;
      });
    };
  }, [
    target?.graphqlEndpointUrl,
    actualSelectedApiEndpoint,
    preflight.execute,
    preflight.isEnabled,
  ]);

  const FullScreenIcon = isFullScreen ? MinimizeIcon : MaximizeIcon;

  const handleTabChange = useCallback<Exclude<GraphiQLProviderProps['onTabChange'], undefined>>(
    ({ tabs, activeTabIndex }) => {
      const activeTab = tabs.find((_, index) => index === activeTabIndex)!;
      // Set search params while clicking on tab
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug/laboratory',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
        search: { operation: userOperations.has(activeTab.id) ? activeTab.id : undefined },
      });
    },
    [userOperations],
  );

  useRedirect({
    canAccess: target?.viewerCanViewLaboratory === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      });
    },
    entity: target,
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (target?.viewerCanViewLaboratory === false) {
    return null;
  }

  return (
    <>
      {preflight.iframeElement}
      <div className="flex py-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Title>Laboratory</Title>
            <div className="bg-neutral-5 h-4 w-px" />
            <ToggleGroup
              aria-label="Laboratory version"
              value={props.defaultLaboratoryTab}
              onValueChange={value =>
                props.onLaboratoryTabChange(value as 'graphiql' | 'hive-laboratory')
              }
              options={[
                { value: 'graphiql', label: 'GraphiQL' },
                {
                  value: 'hive-laboratory',
                  label: (
                    <>
                      Hive Laboratory
                      <span className="bg-accent ml-1 size-2 rounded-full" />
                    </>
                  ),
                },
              ]}
            />
          </div>
          <Subtitle>Explore your GraphQL schema and run queries against your GraphQL API.</Subtitle>
          <p>
            <DocsLink href="/schema-registry/laboratory" text="Learn more about the Laboratory" />
          </p>
        </div>
        <div className="ml-auto mr-0 flex flex-col justify-center">
          <div>
            {query.data && !query.data.target?.graphqlEndpointUrl ? (
              <RouterLink
                to="/$organizationSlug/$projectSlug/$targetSlug/settings"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
                search={{ page: 'general' }}
              >
                <Button variant="outline" size="compact">
                  Connect GraphQL API Endpoint
                </Button>
              </RouterLink>
            ) : null}
            <Button onClick={toggleConnectLabModal} variant="ghost" size="compact">
              Mock Data Endpoint
            </Button>
          </div>
          <div className="self-end pt-2">
            <span className="mr-2 text-xs font-bold">Query</span>
            <ToggleGroup
              options={[
                {
                  value: 'mockApi',
                  label: 'Mock',
                  tooltip: 'Use Mock Schema',
                  disabled: query.fetching,
                },
                {
                  value: 'linkedApi',
                  label: 'API',
                  tooltip: 'Use API endpoint',
                  disabled: !query.data?.target?.graphqlEndpointUrl || query.fetching,
                },
              ]}
              value={actualSelectedApiEndpoint}
              onValueChange={newValue => {
                setEndpointType(newValue as 'mockApi' | 'linkedApi');
              }}
              aria-label="Query endpoint"
            />
          </div>
        </div>
      </div>
      <Helmet>
        <style key="laboratory">{`
          .graphiql-container,
          .graphiql-dialog a {
            --color-neutral-11: 40, 89%, 60% !important;
          }

          .graphiql-container {
            overflow: unset; /* remove default overflow */
          }

          .graphiql-doc-explorer-title,
          .doc-explorer-title {
            font-size: 1.125rem !important;
            line-height: 1.75rem !important;
            color: white;
          }

          .graphiql-container,
          .graphiql-dialog,
          .CodeMirror-info {
            --color-base: 223, 70%, 3.9% !important;
          }

          .graphiql-tooltip,
          .graphiql-dropdown-content,
          .CodeMirror-lint-tooltip {
            background: #030711;
          }

          .graphiql-tab {
            white-space: nowrap;
          }

          .graphiql-sidebar > button.active {
            background-color: hsla(var(--color-neutral),var(--alpha-background-light))
          }

          .graphiql-container .graphiql-footer {
            border: 0;
            margin-top: 15px;
          }

          #preflight-logs {
            background-color: hsl(var(--color-base));
            border-radius: var(--border-radius-12);
            box-shadow: var(--popover-box-shadow);
            color: hsla(var(--color-neutral), var(--alpha-tertiary));
          }

        `}</style>
      </Helmet>
      {!query.fetching && !query.stale && (
        <PreflightProvider value={preflight}>
          <GraphiQL
            fetcher={fetcher}
            shouldPersistHeaders
            plugins={plugins}
            visiblePlugin={operationCollectionsPlugin}
            schema={schema}
            forcedTheme="dark"
            className={isFullScreen ? 'fixed inset-0 bg-[#030711]' : ''}
            onTabChange={handleTabChange}
            readOnly={!!props.selectedOperationId && target?.viewerCanModifyLaboratory === false}
          >
            <GraphiQL.Logo>
              <Button onClick={() => setIsFullScreen(prev => !prev)} variant="link">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <FullScreenIcon className="size-4" />
                  {isFullScreen ? 'Exit' : 'Enter'} Full Screen
                </span>
              </Button>
            </GraphiQL.Logo>
            <GraphiQL.Toolbar>
              {({ prettify }) => (
                <>
                  {query.data?.target?.viewerCanModifyLaboratory && (
                    <Save
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                    />
                  )}
                  <Share />
                  {/* if people have no modify access they should still be able to format their own queries. */}
                  {(query.data?.target?.viewerCanModifyLaboratory === true ||
                    !props.selectedOperationId) &&
                    prettify}
                </>
              )}
            </GraphiQL.Toolbar>
            <GraphiQL.Footer>
              <div>
                {preflight.isEnabled ? (
                  <PreflightLogs logs={preflight.logs} onClear={preflight.clearLogs} />
                ) : null}
              </div>
            </GraphiQL.Footer>
          </GraphiQL>
        </PreflightProvider>
      )}
      <ConnectLabModal
        endpoint={mockEndpoint}
        close={toggleConnectLabModal}
        isOpen={isConnectLabModalOpen}
        isCDNEnabled={query.data ?? null}
      />
    </>
  );
}

export function TargetLaboratoryPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  selectedOperationId: string | undefined;
  defaultLaboratoryTab: 'graphiql' | 'hive-laboratory';
  onLaboratoryTabChange: (tab: 'graphiql' | 'hive-laboratory') => void;
}) {
  return (
    <>
      <Meta title="Schema laboratory" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Laboratory}
        className="h-(--content-height) flex flex-col pb-0"
      >
        <PromptProvider>
          <LaboratoryPageContent {...props} />
          <PromptManager />
        </PromptProvider>
      </TargetLayout>
    </>
  );
}

function useApiTabValueState(graphqlEndpointUrl: string | null) {
  const [state, setState] = useResetState<'mockApi' | 'linkedApi'>(() => {
    const value = localStorage.getItem('hive:laboratory-tab-value');
    if (!value || !['mockApi', 'linkedApi'].includes(value)) {
      return graphqlEndpointUrl ? 'linkedApi' : 'mockApi';
    }

    if (value === 'linkedApi' && graphqlEndpointUrl) {
      return 'linkedApi';
    }

    return 'mockApi';
  }, [graphqlEndpointUrl]);

  return [
    state,
    useCallback(
      (state: 'mockApi' | 'linkedApi') => {
        localStorage.setItem('hive:laboratory-tab-value', state);
        setState(state);
      },
      [setState],
    ),
  ] as const;
}

function PreflightLogs(props: { logs: LogRecord[]; onClear: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const consoleEl = consoleRef.current;
    consoleEl?.scroll({ top: consoleEl.scrollHeight, behavior: 'smooth' });
  }, [props.logs, isOpen]);

  return (
    <div
      id="preflight-logs"
      className="flex max-h-[200px] w-full flex-col overflow-hidden bg-[#030711]"
    >
      <Collapsible
        variant="panel"
        trigger="Preflight Script Logs"
        open={isOpen}
        onOpenChange={setIsOpen}
        actions={
          isOpen ? (
            <Button
              layout="iconOnly"
              icon={EraserIcon}
              aria-label="Clear logs"
              variant="ghost"
              data-cy="erase-logs"
              onClick={props.onClear}
            />
          ) : null
        }
        panelDataCy="logs"
      >
        <ScrollArea fill ref={consoleRef}>
          <div className="p-4 font-mono text-xs/[18px]">
            {props.logs.length === 0 ? (
              <div
                data-cy="empty-state"
                className="text-neutral-10 flex flex-col items-center justify-center"
              >
                <p>No logs available</p>
                <p>Execute a query to see logs</p>
              </div>
            ) : (
              props.logs.map((log, index) => <LogLine key={index} log={log} />)
            )}
          </div>
        </ScrollArea>
      </Collapsible>
    </div>
  );
}
