import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Kind, parse, print } from 'graphql';
import { throttle } from 'lodash';
import { useMutation, useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { ConnectLabModal } from '@/components/target/laboratory/connect-lab-modal';
import { useTheme } from '@/components/theme/theme-provider';
import { DocsLink } from '@/components/ui/docs-note';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Button } from '@/components/ui/primitives/button/button';
import { ToggleGroup } from '@/components/ui/primitives/toggle-group/toggle-group';
import { graphql, useFragment } from '@/gql';
import { TargetEnvPlugin } from '@/laboratory/plugins/target-env';
import { useSlugs, useToggle } from '@/lib/hooks';
import { useApiTabValue } from '@/lib/hooks/laboratory/use-api-tab-value';
import { useCurrentOperationWithFetchingState } from '@/lib/hooks/laboratory/use-current-operation';
import { useEnvNoticeToast } from '@/lib/hooks/laboratory/use-env-notice-toast';
import { useSchemaIntrospection } from '@/lib/hooks/laboratory/use-schema-introspection';
import { useSeededLaboratoryTarget } from '@/lib/hooks/laboratory/use-seeded-laboratory-target';
import { useOperationFromQueryString } from '@/lib/hooks/laboratory/useOperationFromQueryString';
import {
  readLaboratoryDefaults,
  resolveLaboratoryTargetId,
  type LinkedOperation,
} from '@/lib/laboratory-defaults';
import { loadTargetHistory, saveTargetHistory } from '@/lib/laboratory-history-storage';
import { laboratoryStorage } from '@/lib/laboratory-storage';
import {
  Laboratory,
  LaboratoryCollection,
  LaboratoryCollectionOperation,
  LaboratoryEnv,
  LaboratoryHistory,
  LaboratoryOperation,
  LaboratoryPreflight,
  LaboratorySettings,
  LaboratoryTab,
} from '@graphql-hive/laboratory';
import { getRouteApi, Link as RouterLink, useRouter } from '@tanstack/react-router';

const laboratoryRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/laboratory',
);

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
          description
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

const UpdateCollectionMutation = graphql(`
  mutation LaboratoryUpdateCollection(
    $selector: TargetSelectorInput!
    $input: UpdateDocumentCollectionInput!
  ) {
    updateDocumentCollection(selector: $selector, input: $input) {
      error {
        message
      }
      ok {
        collection {
          id
          name
          description
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

export const CreateOperationMutation = graphql(`
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
                operations(first: 100) {
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

// Server-side lab state (collections, preflight script, linked operation). What the browser saves
// per target is read by LaboratoryMount, once the target is known and seeded.
function useLaboratoryServerState() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [{ data, fetching: dataFetching }] = useQuery({
    query: LaboratoryQuery,
    variables: {
      selector: {
        targetSlug,
        organizationSlug,
        projectSlug,
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
      throttle((collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => {
        void mutateUpdate({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          input: {
            operationId: operation.id,
            collectionId: collection.id,
            name: operation.name,
            query: operation.query,
            variables: operation.variables,
            headers: operation.headers,
          },
        });
      }, 1000),
    [mutateUpdate, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateCreate] = useMutation(CreateOperationMutation);

  // Not throttled: the lab adopts the stored id this resolves with.
  const createOperation = useCallback(
    async (collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => {
      const result = await mutateCreate({
        selector: {
          targetSlug,
          organizationSlug,
          projectSlug,
        },
        input: {
          collectionId: collection.id,
          name: operation.name,
          query: operation.query,
          variables: operation.variables,
          headers: operation.headers,
        },
      });

      const id = result.data?.createOperationInDocumentCollection.ok?.operation.id;

      return id ? { id } : undefined;
    },
    [mutateCreate, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateDelete] = useMutation(DeleteOperationMutation);

  const deleteOperation = useMemo(
    () =>
      throttle((_collection: LaboratoryCollection, operation: LaboratoryCollectionOperation) => {
        void mutateDelete({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          id: operation.id,
        });
      }, 1000),
    [mutateDelete, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateDeleteCollection] = useMutation(DeleteCollectionMutation);
  const deleteCollection = useMemo(
    () =>
      throttle((collection: LaboratoryCollection) => {
        void mutateDeleteCollection({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          id: collection.id,
        });
      }, 1000),
    [mutateDeleteCollection, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateAddCollection] = useMutation(CreateCollectionMutation);

  const addCollection = useCallback(
    async (collection: LaboratoryCollection) => {
      const result = await mutateAddCollection({
        selector: {
          targetSlug,
          organizationSlug,
          projectSlug,
        },
        input: {
          name: collection.name,
          description: collection.description,
        },
      });

      const id = result.data?.createDocumentCollection.ok?.collection.id;

      return id ? { id } : undefined;
    },
    [mutateAddCollection, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateUpdateCollection] = useMutation(UpdateCollectionMutation);
  const updateCollection = useMemo(
    () =>
      throttle((collection: LaboratoryCollection) => {
        void mutateUpdateCollection({
          selector: {
            targetSlug,
            organizationSlug,
            projectSlug,
          },
          input: {
            collectionId: collection.id,
            name: collection.name,
            description: collection.description,
          },
        });
      }, 1000),
    [mutateUpdateCollection, targetSlug, organizationSlug, projectSlug],
  );

  const [, mutateUpdatePreflight] = useMutation(UpdatePreflightScriptMutation);

  const updatePreflight = useMemo(
    () =>
      throttle((preflight: LaboratoryPreflight) => {
        void mutateUpdatePreflight({
          input: {
            selector: {
              targetSlug,
              organizationSlug,
              projectSlug,
            },
            sourceCode: preflight.script,
          },
        });
      }, 1000),
    [mutateUpdatePreflight, targetSlug, organizationSlug, projectSlug],
  );

  const { currentOperation, fetching: currentOperationFetching } =
    useCurrentOperationWithFetchingState({
      organizationSlug,
      projectSlug,
      targetSlug,
    });

  const router = useRouter();
  const { search } = router.latestLocation;
  const operationString =
    'operationString' in search && typeof search.operationString === 'string'
      ? search.operationString
      : null;

  const navigate = laboratoryRoute.useNavigate();

  // A persisted-document link imports once; the param must not survive a reload.
  useEffect(() => {
    if (operationString) {
      void navigate({ search: prev => ({ ...prev, operationString: undefined }), replace: true });
    }
  }, [navigate, operationString]);

  const operationFromQueryString = useMemo(() => {
    if (operationString) {
      try {
        const parsed = parse(operationString);
        const name = parsed.definitions.find(v => v.kind === Kind.OPERATION_DEFINITION)?.name
          ?.value;

        return {
          id: crypto.randomUUID(),
          name: name ?? 'Untitled',
          query: print(parsed),
          variables: '{}',
          headers: '{}',
          extensions: '{}',
        } satisfies LaboratoryOperation;
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    return null;
  }, [operationString]);

  // The param is stripped right away, so keep the operation until the lab has mounted with it.
  const [pendingOperation, setPendingOperation] = useState<LaboratoryOperation | null>(null);

  useEffect(() => {
    if (operationFromQueryString) {
      setPendingOperation(operationFromQueryString);
    }
  }, [operationFromQueryString]);

  const linkedOperation = useMemo((): LinkedOperation | null => {
    const fromQueryString = operationFromQueryString ?? pendingOperation;

    if (fromQueryString) {
      return { operation: fromQueryString, matchBy: 'content' };
    }

    if (currentOperation) {
      return {
        operation: {
          id: currentOperation.id,
          name: currentOperation.name,
          query: currentOperation.query,
          variables: currentOperation.variables ?? '{}',
          headers: currentOperation.headers ?? '{}',
          extensions: '{}',
        },
        matchBy: 'id',
      };
    }

    return null;
  }, [currentOperation, operationFromQueryString, pendingOperation]);

  const operationIdFromSearch = useOperationFromQueryString();

  const fetching = dataFetching || (!!operationIdFromSearch && currentOperationFetching);

  return {
    fetching,
    targetId: data?.target?.id ?? null,
    preflightScript: preflight?.preflightScript?.sourceCode ?? null,
    linkedOperation,
    onLinkedOperationConsumed: useCallback(() => setPendingOperation(null), []),
    updatePreflight,
    labProps: {
      defaultCollections: collections,
      onCollectionOperationCreate: (
        collection: LaboratoryCollection,
        operation: LaboratoryCollectionOperation,
      ) => createOperation(collection, operation),
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
      onCollectionCreate: (collection: LaboratoryCollection) => addCollection(collection),
      onCollectionUpdate: (collection: LaboratoryCollection) => {
        updateCollection(collection);
      },
      // One script per target, stored server side, so it is not private to the person editing it.
      preflightNotice:
        'It is stored in plain text on this target, where everyone with access can read it and it runs in their browser too.',
      permissions: {
        preflight: {
          update: preflight?.viewerCanModifyPreflightScript === true,
        },
        collections: {
          create: data?.target?.viewerCanModifyLaboratory === true,
          update: data?.target?.viewerCanModifyLaboratory === true,
          delete: data?.target?.viewerCanModifyLaboratory === true,
        },
        collectionsOperations: {
          create: data?.target?.viewerCanModifyLaboratory === true,
          update: data?.target?.viewerCanModifyLaboratory === true,
          delete: data?.target?.viewerCanModifyLaboratory === true,
        },
      },
    },
  };
}

/**
 * Mounts the lab from what this target saved in the browser. Keyed by target and endpoint, so
 * every remount reads the latest writes and never another target's state.
 */
export function LaboratoryMount({
  targetId,
  linkedOperation,
  onLinkedOperationConsumed,
  preflightScript,
  updatePreflight,
  ...labProps
}: {
  targetId: string;
  linkedOperation: LinkedOperation | null;
  onLinkedOperationConsumed: () => void;
  preflightScript: string | null;
  updatePreflight: (preflight: LaboratoryPreflight) => void;
} & ComponentProps<typeof Laboratory>) {
  // eslint-disable-next-line react/hook-use-state
  const [defaults] = useState(() =>
    readLaboratoryDefaults(targetId, linkedOperation, preflightScript),
  );

  // A mounted lab never reads new defaults, so a link that arrives now is dropped rather than
  // kept for the next mount, which could be another target's.
  useEffect(() => {
    onLinkedOperationConsumed();
  }, [linkedOperation, onLinkedOperationConsumed]);

  // undefined while loading, null when IndexedDB failed.
  const [history, setHistory] = useState<LaboratoryHistory[] | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void loadTargetHistory(targetId).then(loaded => {
      if (!cancelled) setHistory(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  useEnvNoticeToast();

  const historyFailed = history === null;

  const callbacks = useMemo(() => {
    const storage = laboratoryStorage(targetId);

    return {
      onEnvChange: (env: LaboratoryEnv | null) => storage.set('env', env),
      onPluginsStateChange: (pluginsState: Record<string, any>) =>
        storage.set('pluginsState', pluginsState),
      onOperationsChange: (operations: LaboratoryOperation[]) =>
        storage.set('operations', operations),
      onTabsChange: (tabs: LaboratoryTab[]) => storage.set('tabs', tabs),
      onActiveTabIdChange: (activeTabId: string | null) => storage.set('activeTabId', activeTabId),
      onSettingsChange: (settings: LaboratorySettings | null) => storage.set('settings', settings),
      onPreflightChange: (preflight: LaboratoryPreflight | null) => {
        updatePreflight(preflight ?? { script: '', enabled: true });
        storage.set('preflightEnabled', preflight?.enabled ?? false);
      },
      // Saving after a failed load would replace history this mount never read.
      onHistoryChange: historyFailed
        ? undefined
        : (next: LaboratoryHistory[]) => void saveTargetHistory(targetId, next),
    };
  }, [targetId, updatePreflight, historyFailed]);

  if (history === undefined) {
    return null;
  }

  return <Laboratory {...labProps} {...defaults} defaultHistory={history ?? []} {...callbacks} />;
}

const TargetLaboratoryPageQuery = graphql(`
  query TargetLaboratoryPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      graphqlEndpointUrl
      latestSchemaVersion {
        id
        sdl
      }
      viewerCanModifyLaboratory
    }
    ...Laboratory_IsCDNEnabledFragment
  }
`);

function LaboratoryPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetLaboratoryPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });

  const laboratoryState = useLaboratoryServerState();

  const targetId = resolveLaboratoryTargetId({
    pageTargetId: query.data?.target?.id ?? null,
    pageFetching: query.fetching,
    labTargetId: laboratoryState.targetId,
    labFetching: laboratoryState.fetching,
  });
  const seeded = useSeededLaboratoryTarget(
    targetId,
    `${organizationSlug}/${projectSlug}/${targetSlug}`,
  );

  // Read only once seeded, or a first visit misses the choice seeding copies over.
  const [actualSelectedApiEndpoint, setEndpointType] = useApiTabValue(
    seeded ? targetId : null,
    query.data?.target?.graphqlEndpointUrl ?? null,
  );

  const mockEndpoint = `${location.origin}/api/lab/${organizationSlug}/${projectSlug}/${targetSlug}`;

  const url =
    (actualSelectedApiEndpoint === 'linkedApi'
      ? query.data?.target?.graphqlEndpointUrl
      : undefined) ?? mockEndpoint;

  const [isConnectLabModalOpen, toggleConnectLabModal] = useToggle();

  const { resolvedTheme } = useTheme();

  const sdl = query.data?.target?.latestSchemaVersion?.sdl;

  const introspection = useSchemaIntrospection(sdl);

  if (!targetId || !seeded) {
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
            <div className="flex items-center gap-2">
              <Title>Laboratory</Title>
            </div>
            <Subtitle>
              Explore your GraphQL schema and run queries against your GraphQL API.
            </Subtitle>
            <p>
              <DocsLink href="/schema-registry/laboratory" text="Learn more about the Laboratory" />
            </p>
          </div>
          <div className="mr-0 ml-auto flex flex-col justify-center">
            <div>
              {query.data && !query.data.target?.graphqlEndpointUrl ? (
                <RouterLink
                  to="/$organizationSlug/$projectSlug/$targetSlug/settings"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                  }}
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
                  },
                  {
                    value: 'linkedApi',
                    label: 'API',
                    tooltip: 'Use API endpoint',
                    disabled: !query.data?.target?.graphqlEndpointUrl,
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
        <div className="flex-1 overflow-hidden rounded-lg border">
          <LaboratoryMount
            key={`${targetId}:${url}`}
            targetId={targetId}
            linkedOperation={laboratoryState.linkedOperation}
            onLinkedOperationConsumed={laboratoryState.onLinkedOperationConsumed}
            preflightScript={laboratoryState.preflightScript}
            updatePreflight={laboratoryState.updatePreflight}
            defaultEndpoint={url}
            theme={resolvedTheme}
            defaultSchemaIntrospection={introspection}
            enableDocs
            {...laboratoryState.labProps}
            plugins={[
              TargetEnvPlugin({
                organizationSlug,
                projectSlug,
                targetSlug,
              }),
            ]}
          />
        </div>
      </div>
    </>
  );
}

export function TargetLaboratoryPage() {
  return (
    <>
      <Meta title="Schema laboratory" />
      <LayoutContent className="flex h-(--content-height) flex-col pb-0">
        <LaboratoryPageContent />
      </LayoutContent>
    </>
  );
}
