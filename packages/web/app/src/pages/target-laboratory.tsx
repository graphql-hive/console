import { ReactElement, useCallback, useMemo, useState } from 'react';
import { cx } from 'class-variance-authority';
import clsx from 'clsx';
import { GraphiQL } from 'graphiql';
import { buildSchema } from 'graphql';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { ConnectLabModal } from '@/components/target/laboratory/connect-lab-modal';
import { CreateOperationModal } from '@/components/target/laboratory/create-operation-modal';
import { Button } from '@/components/ui/button';
import { DocsLink } from '@/components/ui/docs-note';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaveIcon, ShareIcon } from '@/components/ui/icon';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { ToggleGroup, ToggleGroupItem } from '@/components/v2/toggle-group';
import { graphql } from '@/gql';
import { useClipboard, useNotifications, useToggle } from '@/lib/hooks';
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
  preflightScriptPlugin,
  PreflightScriptProvider,
  usePreflightScript,
} from '@/lib/preflight-sandbox/graphiql-plugin';
import { cn } from '@/lib/utils';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import {
  UnStyledButton as GraphiQLButton,
  GraphiQLProviderProps,
  Tooltip as GraphiQLTooltip,
  useEditorContext,
} from '@graphiql/react';
import { createGraphiQLFetcher, Fetcher, isAsyncIterable } from '@graphiql/toolkit';
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';
import { Repeater } from '@repeaterjs/repeater';
import { Link as RouterLink, useRouter } from '@tanstack/react-router';
import 'graphiql/style.css';
import '@graphiql/plugin-explorer/style.css';
import { PromptManager, PromptProvider } from '@/components/ui/prompt';
import { useRedirect } from '@/lib/access/common';

const explorer = explorerPlugin();

// Declare outside components, otherwise while clicking on field in explorer operationCollectionsPlugin will be open
const plugins = [explorer, operationCollectionsPlugin, preflightScriptPlugin];

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
  const notify = useNotifications();
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
    <DropdownMenu>
      <GraphiQLTooltip label={label}>
        <DropdownMenuTrigger asChild>
          <GraphiQLButton
            data-cy="save-operation"
            className={cn(
              'graphiql-toolbar-button',
              currentOperation && !isSame && 'hive-badge-is-changed relative after:top-1',
            )}
            aria-label={label}
          >
            <SaveIcon className="graphiql-toolbar-icon h-5" />
          </GraphiQLButton>
        </DropdownMenuTrigger>
      </GraphiQLTooltip>
      <DropdownMenuContent align="end">
        {!isSame && currentOperation && (
          <>
            <DropdownMenuItem
              disabled={isSame || !currentOperation}
              className="mb-0 text-red-600"
              onClick={() => {
                queryEditor?.setValue(currentOperation.query);
                clearOperation();
              }}
            >
              Discard changes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          disabled={isSame || !currentOperation}
          className={cx(
            (isSame || !currentOperation) && 'cursor-default text-gray-400 hover:bg-transparent',
          )}
          onClick={async () => {
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
              notify('Updated!', 'success');
            }
            if (error) {
              notify(error.message, 'error');
            }
          }}
        >
          Save
        </DropdownMenuItem>
        <DropdownMenuItem
          data-cy="save-operation-as"
          onClick={async () => {
            if (!collections.length) {
              notify('Please create a collection first.', 'error');
              return;
            }
            toggleOperationModal();
          }}
        >
          Save as
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateOperationModal
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        isOpen={operationModalOpen}
        close={toggleOperationModal}
        onSaveSuccess={onSaveSuccess}
      />
    </DropdownMenu>
  );
}

function substituteVariablesInHeader(
  headers: Record<string, string>,
  environmentVariables: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      if (typeof value === 'string') {
        // Replace all occurrences of `{{keyName}}` strings only if key exists in `environmentVariables`
        value = value.replaceAll(/{{(?<keyName>.*?)}}/g, (originalString, envKey) => {
          return Object.hasOwn(environmentVariables, envKey)
            ? (environmentVariables[envKey] as string)
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

  const preflightScript = usePreflightScript({ target: target ?? null });

  const fetcher = useMemo<Fetcher>(() => {
    return async (params, opts) => {
      let headers = opts?.headers;
      const url =
        (actualSelectedApiEndpoint === 'linkedApi' ? target?.graphqlEndpointUrl : undefined) ??
        mockEndpoint;

      return new Repeater(async (push, stop) => {
        let hasFinishedPreflightScript = false;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        stop.then(() => {
          if (!hasFinishedPreflightScript) {
            preflightScript.abort();
          }
        });
        try {
          const result = await preflightScript.execute();
          if (result && headers) {
            headers = substituteVariablesInHeader(headers, result);
          }
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
          const error = new Error(`Error during preflight script execution:\n\n${formatError}`);
          // We only want to expose the error message, not the whole stack trace.
          delete error.stack;
          stop(error);
          return;
        } finally {
          hasFinishedPreflightScript = true;
        }

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
    preflightScript.execute,
    preflightScript.isPreflightScriptEnabled,
  ]);

  const FullScreenIcon = isFullScreen ? ExitFullScreenIcon : EnterFullScreenIcon;

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
      {preflightScript.iframeElement}
      <div className="flex py-6">
        <div className="flex-1">
          <Title>Laboratory</Title>
          <Subtitle>Explore your GraphQL schema and run queries against your GraphQL API.</Subtitle>
          <p>
            <DocsLink className="text-muted-foreground text-sm" href="/features/laboratory">
              Learn more about the Laboratory
            </DocsLink>
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
                <Button variant="outline" className="mr-2" size="sm">
                  Connect GraphQL API Endpoint
                </Button>
              </RouterLink>
            ) : null}
            <Button onClick={toggleConnectLabModal} variant="ghost" size="sm">
              Mock Data Endpoint
            </Button>
          </div>
          <div className="self-end pt-2">
            <span className="mr-2 text-xs font-bold">Query</span>
            <ToggleGroup
              defaultValue="list"
              onValueChange={newValue => {
                setEndpointType(newValue as 'mockApi' | 'linkedApi');
              }}
              value="mock"
              type="single"
              className="bg-gray-900/50 text-gray-500"
            >
              <ToggleGroupItem
                key="mockApi"
                value="mockApi"
                title="Use Mock Schema"
                className={clsx(
                  'text-xs hover:text-white',
                  !query.fetching &&
                    actualSelectedApiEndpoint === 'mockApi' &&
                    'bg-gray-800 text-white',
                )}
                disabled={query.fetching}
              >
                Mock
              </ToggleGroupItem>
              <ToggleGroupItem
                key="linkedApi"
                value="linkedApi"
                title="Use API endpoint"
                className={cn(
                  'text-xs hover:text-white',
                  !query.fetching &&
                    actualSelectedApiEndpoint === 'linkedApi' &&
                    'bg-gray-800 text-white',
                )}
                disabled={!query.data?.target?.graphqlEndpointUrl || query.fetching}
              >
                API
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
      <Helmet>
        <style key="laboratory">{`
          .graphiql-container,
          .graphiql-dialog a {
            --color-primary: 40, 89%, 60% !important;
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
        `}</style>
      </Helmet>
      {!query.fetching && !query.stale && (
        <PreflightScriptProvider value={preflightScript}>
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
              <Button
                onClick={() => setIsFullScreen(prev => !prev)}
                variant="orangeLink"
                className="gap-2 whitespace-nowrap"
              >
                <FullScreenIcon className="size-4" />
                {isFullScreen ? 'Exit' : 'Enter'} Full Screen
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
          </GraphiQL>
        </PreflightScriptProvider>
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
}) {
  return (
    <>
      <Meta title="Schema laboratory" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Laboratory}
        className="flex h-[--content-height] flex-col pb-0"
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
