import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cx } from 'class-variance-authority';
import clsx from 'clsx';
import { GraphiQL } from 'graphiql';
import { buildSchema } from 'graphql';
import { throttle } from 'lodash';
import { ChevronDownIcon, EraserIcon } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { ConnectLabModal } from '@/components/target/laboratory/connect-lab-modal';
import { CreateOperationModal } from '@/components/target/laboratory/create-operation-modal';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { PromptManager, PromptProvider } from '@/components/ui/prompt';
import { QueryError } from '@/components/ui/query-error';
import { ToggleGroup, ToggleGroupItem } from '@/components/v2/toggle-group';
import { graphql, useFragment } from '@/gql';
import {
  Laboratory,
  LaboratoryCollection,
  LaboratoryCollectionOperation,
  LaboratoryHistory,
  LaboratoryOperation,
  LaboratoryPreflight,
  LaboratoryTab,
} from '@/laboratory';
import { LaboratoryApi } from '@/laboratory/components/laboratory/context';
import { useRedirect } from '@/lib/access/common';
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
import { Kit } from '@/lib/kit';
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
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';
import { Repeater } from '@repeaterjs/repeater';
import { Link as RouterLink, useRouter } from '@tanstack/react-router';

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

const localStoragePrefix = 'hive:laboratory:';

const getLocalStorageState = (key: string, defaultValue: any) => {
  const value = localStorage.getItem(`${localStoragePrefix}${key}`);
  return value ? JSON.parse(value) : defaultValue;
};

const setLocalStorageState = (key: string, value: any) => {
  localStorage.setItem(`${localStoragePrefix}${key}`, JSON.stringify(value));
};

export const LaboratoryPreflightScriptTargetFragment = graphql(`
  fragment LaboratoryPreflightScriptTargetFragment on Target {
    id
    preflightScript {
      id
      sourceCode
    }
    viewerCanModifyPreflightScript
  }
`);

export const LaboratoryQuery = graphql(`
  query Laboratory($selector: TargetSelectorInput!) {
    target(reference: { bySelector: $selector }) {
      id
      documentCollections {
        edges {
          cursor
          node {
            id
            name
            description
            operations(first: 100) {
              edges {
                node {
                  id
                  name
                  query
                  variables
                  headers
                }
                cursor
              }
            }
          }
        }
      }
      ...LaboratoryPreflightScriptTargetFragment
      viewerCanModifyLaboratory
      viewerCanViewLaboratory
    }
  }
`);

export const CreateCollectionMutation = graphql(`
  mutation LaboratoryCreateCollection(
    $selector: TargetSelectorInput!
    $input: CreateDocumentCollectionInput!
  ) {
    createDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
        collection {
          id
          name
          operations(first: 100) {
            edges {
              cursor
              node {
                id
                name
              }
              cursor
            }
          }
        }
      }
    }
  }
`);

const UpdateOperationMutation = graphql(`
  mutation LaboratoryUpdateOperation(
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

const CreateOperationMutation = graphql(`
  mutation LaboratoryCreateOperation(
    $selector: TargetSelectorInput!
    $input: CreateDocumentCollectionOperationInput!
  ) {
    createOperationInDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        operation {
          id
          name
        }
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                operations {
                  edges {
                    node {
                      id
                    }
                    cursor
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export const DeleteCollectionMutation = graphql(`
  mutation LaboratoryDeleteCollection($selector: TargetSelectorInput!, $id: ID!) {
    deleteDocumentCollection(selector: $selector, id: $id) {
      error {
        message
      }
      ok {
        deletedId
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
              }
            }
          }
        }
      }
    }
  }
`);

export const DeleteOperationMutation = graphql(`
  mutation LaboratoryDeleteOperation($selector: TargetSelectorInput!, $id: ID!) {
    deleteOperationInDocumentCollection(selector: $selector, id: $id) {
      error {
        message
      }
      ok {
        deletedId
        updatedTarget {
          id
          documentCollections {
            edges {
              cursor
              node {
                id
                operations {
                  edges {
                    node {
                      id
                    }
                    cursor
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

export const UpdatePreflightScriptMutation = graphql(`
  mutation LaboratoryUpdatePreflightScript($input: UpdatePreflightScriptInput!) {
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

function useLaboratoryState(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): Partial<LaboratoryApi> & { fetching: boolean } {
  const [{ data, fetching }] = useQuery({
    query: LaboratoryQuery,
    variables: {
      selector: {
        targetSlug: props.targetSlug,
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
      },
    },
  });

  const preflight = useFragment(LaboratoryPreflightScriptTargetFragment, data?.target ?? null);

  const collections = useMemo(
    () =>
      data?.target?.documentCollections.edges
        .map(v => v.node)
        .map(
          collection =>
            ({
              id: collection.id,
              name: collection.name,
              createdAt: new Date().toISOString(),
              operations: collection.operations.edges
                .map(v => v.node)
                .map(
                  operation =>
                    ({
                      id: operation.id,
                      name: operation.name,
                      query: operation.query,
                      variables: operation.variables ?? '{}',
                      headers: operation.headers ?? '{}',
                      extensions: '{}',
                      description: '',
                      createdAt: new Date().toISOString(),
                    }) satisfies LaboratoryCollectionOperation,
                ),
            }) satisfies LaboratoryCollection,
        ),
    [data?.target?.documentCollections.edges],
  );

  const [, mutateUpdate] = useMutation(UpdateOperationMutation);

  const updateOperation = useMemo(
    () =>
      throttle(
        (collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) =>
          mutateUpdate({
            selector: {
              targetSlug: props.targetSlug,
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
            },
            input: {
              operationId: operation.id,
              collectionId: collection.id,
              name: operation.name,
              query: operation.query,
              variables: operation.variables,
              headers: operation.headers,
            },
          }),
        1000,
      ),
    [mutateUpdate, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  const [, mutateCreate] = useMutation(CreateOperationMutation);

  const createOperation = useMemo(
    () =>
      throttle((collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => {
        mutateCreate({
          selector: {
            targetSlug: props.targetSlug,
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
          },
          input: {
            collectionId: collection.id,
            name: operation.name,
            query: operation.query,
            variables: operation.variables,
            headers: operation.headers,
          },
        });
      }, 1000),
    [mutateCreate, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  const [, mutateDelete] = useMutation(DeleteOperationMutation);

  const deleteOperation = useMemo(
    () =>
      throttle((collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => {
        mutateDelete({
          selector: {
            targetSlug: props.targetSlug,
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
          },
          id: operation.id,
        });
      }, 1000),
    [mutateDelete, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  const [, mutateDeleteCollection] = useMutation(DeleteCollectionMutation);
  const deleteCollection = useMemo(
    () =>
      throttle((collection: LaboratoryCollection) => {
        mutateDeleteCollection({
          selector: {
            targetSlug: props.targetSlug,
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
          },
          id: collection.id,
        });
      }, 1000),
    [mutateDeleteCollection, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  const [, mutateAddCollection] = useMutation(CreateCollectionMutation);

  const addCollection = useMemo(
    () =>
      throttle((collection: LaboratoryCollection) => {
        mutateAddCollection({
          selector: {
            targetSlug: props.targetSlug,
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
          },
          input: {
            name: collection.name,
            description: collection.description,
          },
        });
      }, 1000),
    [mutateAddCollection, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  const [, mutateUpdatePreflight] = useMutation(UpdatePreflightScriptMutation);

  const updatePreflight = useMemo(
    () =>
      throttle((preflight: LaboratoryPreflight) => {
        mutateUpdatePreflight({
          input: {
            selector: {
              targetSlug: props.targetSlug,
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
            },
            sourceCode: preflight.script,
          },
        });
      }, 1000),
    [mutateUpdatePreflight, props.targetSlug, props.organizationSlug, props.projectSlug],
  );

  return {
    fetching,
    defaultCollections: collections,
    defaultOperations: getLocalStorageState('operations', []),
    defaultHistory: getLocalStorageState('history', []),
    defaultTabs: getLocalStorageState('tabs', []),
    defaultActiveTabId: getLocalStorageState('activeTabId', null),
    defaultPreflight: preflight?.preflightScript?.sourceCode
      ? { script: preflight.preflightScript.sourceCode }
      : null,
    onOperationsChange: (operations: LaboratoryOperation[]) => {
      setLocalStorageState('operations', operations);
    },
    onHistoryChange: (history: LaboratoryHistory[]) => {
      setLocalStorageState('history', history);
    },
    onTabsChange: (tabs: LaboratoryTab[]) => {
      setLocalStorageState('tabs', tabs);
    },
    onActiveTabIdChange: (activeTabId: string | null) => {
      setLocalStorageState('activeTabId', activeTabId);
    },
    onCollectionOperationCreate: (
      collection: LaboratoryCollection,
      operation: LaboratoryCollectionOperation,
    ) => {
      createOperation(collection, operation);
    },
    onCollectionOperationUpdate: (
      collection: LaboratoryCollection,
      operation: LaboratoryCollectionOperation,
    ) => {
      updateOperation(collection, operation);
    },
    onCollectionOperationDelete: (
      collection: LaboratoryCollection,
      operation: LaboratoryCollectionOperation,
    ) => {
      deleteOperation(collection, operation);
    },
    onCollectionDelete: (collection: LaboratoryCollection) => {
      deleteCollection(collection);
    },
    onCollectionCreate: (collection: LaboratoryCollection) => {
      addCollection(collection);
    },
    onPreflightChange: (preflight: LaboratoryPreflight | null) => {
      updatePreflight(preflight ?? { script: '' });
    },
    permissions: {
      preflight: {
        update: preflight?.viewerCanModifyPreflightScript === true,
      },
      collections: {
        create: data?.target?.viewerCanModifyLaboratory === true,
        delete: data?.target?.viewerCanModifyLaboratory === true,
      },
      collectionsOperations: {
        create: data?.target?.viewerCanModifyLaboratory === true,
        update: data?.target?.viewerCanModifyLaboratory === true,
        delete: data?.target?.viewerCanModifyLaboratory === true,
      },
    },
  };
}

function LaboratoryPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  selectedOperationId?: string;
}) {
  const laboratoryState = useLaboratoryState({
    organizationSlug: props.organizationSlug,
    projectSlug: props.projectSlug,
    targetSlug: props.targetSlug,
  });

  const [query] = useQuery({
    query: TargetLaboratoryPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  const [isConnectLabModalOpen, toggleConnectLabModal] = useToggle();

  const [actualSelectedApiEndpoint, setEndpointType] = useApiTabValueState(
    query.data?.target?.graphqlEndpointUrl ?? null,
  );

  const mockEndpoint = `${location.origin}/api/lab/${props.organizationSlug}/${props.projectSlug}/${props.targetSlug}`;

  const url =
    (actualSelectedApiEndpoint === 'linkedApi'
      ? query.data?.target?.graphqlEndpointUrl
      : undefined) ?? mockEndpoint;

  useRedirect({
    canAccess: query.data?.target?.viewerCanViewLaboratory === true,
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
    entity: query.data?.target,
  });

  if (laboratoryState.fetching) {
    return null;
  }

  return (
    <>
      <ConnectLabModal
        endpoint={mockEndpoint}
        close={toggleConnectLabModal}
        isOpen={isConnectLabModalOpen}
        isCDNEnabled={query.data ?? null}
      />
      <div className="flex size-full flex-col gap-3 py-6">
        <div className="flex">
          <div className="flex-1">
            <Title>Laboratory</Title>
            <Subtitle>
              Explore your GraphQL schema and run queries against your GraphQL API.
            </Subtitle>
            <p>
              <DocsLink
                className="text-muted-foreground text-sm"
                href="/schema-registry/laboratory"
              >
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
        <div className="flex-1 overflow-hidden rounded-lg border">
          <Laboratory key={url} defaultEndpoint={url} {...laboratoryState} />
        </div>
      </div>
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
        <LaboratoryPageContent {...props} />
      </TargetLayout>
    </>
  );
}
