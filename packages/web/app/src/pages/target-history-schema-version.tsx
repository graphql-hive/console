import { ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowRightIcon,
  BoxIcon,
  Check,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  FileIcon,
  GitBranch,
  GitCommit,
  GitCompare,
  GitCompareArrows,
  GitCompareIcon,
  InfoIcon,
  Layers,
  ListTree,
  Minus,
  Plus,
  ShieldAlertIcon,
  XCircleIcon,
} from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { useQuery } from 'urql';
import { NotFoundContent } from '@/components/common/not-found-content';
import {
  ChangesBlock,
  ChangesBlock_SchemaChangeFragment,
  CompositionErrorsSection_SchemaErrorConnection,
} from '@/components/target/history/errors-and-changes';
import { BadgeRounded } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn } from '@/lib/utils';
import { File, MultiFileDiff } from '@pierre/diffs/react';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
} from '@radix-ui/react-icons';

const TargetHistoryGraphVersion_ActiveGraphVersionQuery = graphql(`
  query TargetHistoryGraphVersion_ActiveGraphVersionQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $schemaVersionId: ID!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      type
      target: targetBySlug(targetSlug: $targetSlug) {
        id
        schemaVersion(id: $schemaVersionId) {
          id
          ...SchemaVersionView_SchemaVersionFragment
        }
      }
    }
  }
`);

export function TargetHistorySchemaVersionPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaVersionId: string;
}) {
  const [query] = useQuery({
    query: TargetHistoryGraphVersion_ActiveGraphVersionQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      schemaVersionId: props.schemaVersionId,
    },
  });

  const isLoading = query.fetching || query.stale;

  if (isLoading) {
    return (
      <div className="text-neutral-10 flex size-full flex-col items-center justify-center self-center text-sm">
        <Spinner className="mb-3 size-8" />
        Loading schema version...
      </div>
    );
  }

  const schemaVersion = query.data?.project?.target?.schemaVersion ?? null;

  if (!schemaVersion) {
    return (
      <NotFoundContent
        heading="Schema Version not found."
        subheading="This schema version does not seem to exist anymore."
        includeBackButton={false}
      />
    );
  }

  if (query.error) {
    return (
      <div className="m-3 rounded-lg bg-red-500/20 p-8">
        <div className="mb-3 flex items-center gap-3">
          <CrossCircledIcon className="h-6 w-auto text-red-500" />
          <h2 className="text-neutral-12 text-lg font-medium">An unexpected error occured.</h2>
        </div>
        <pre className="text-neutral-12 mt-5 whitespace-pre-wrap rounded-lg bg-red-900 p-3 text-xs">
          {query.error.graphQLErrors?.[0]?.message ?? query.error.networkError?.message}
        </pre>
      </div>
    );
  }

  return (
    <SchemaVersionView
      schemaVersion={schemaVersion}
      organizationSlug={props.organizationSlug}
      projectSlug={props.projectSlug}
    />
  );
}

const SchemaVersionView_SchemaVersionFragment = graphql(`
  fragment SchemaVersionView_SchemaVersionFragment on SchemaVersion {
    id
    date
    isComposable
    hasSchemaChanges
    isValid
    isFirstComposableVersion
    schemaCompositionErrors {
      ...CompositionErrorsSection_SchemaErrorConnection
    }
    supergraphSdl: supergraph
    supergraphChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
        }
      }
    }
    sdl
    sdlChanges: schemaChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
          severityLevel
        }
      }
    }
    previousDiffableVersion: previousDiffableSchemaVersion {
      id
      supergraphSdl: supergraph
      sdl
    }
    subgraphDiffs {
      ...SchemaVersionSubgraphView__SubgraphDiffFragment
    }
    ...SchemaVersionHeader_SchemaVersionFragment
    ...SchemaVersionSummary_SchemaVersionFragment
    contractVersions {
      edges {
        node {
          id
          contractName
          hasSchemaChanges
          isComposable
          isFirstComposableVersion
          supergraphSdl: supergraphSDL
          sdl: compositeSchemaSDL
          sdlChanges: schemaChanges {
            edges {
              node {
                ...ChangesBlock_SchemaChangeFragment
                severityLevel
              }
            }
          }
          schemaCompositionErrors {
            ...CompositionErrorsSection_SchemaErrorConnection
          }
          previousDiffableVersion: previousDiffableContractVersion {
            id
            supergraphSdl: supergraphSDL
            sdl: compositeSchemaSDL
          }
          ...SchemaVersionSummary_ContractVersionFragment
        }
      }
    }
  }
`);

type SchemaVersionViewProps = {
  organizationSlug: string;
  projectSlug: string;
  schemaVersion: FragmentType<typeof SchemaVersionView_SchemaVersionFragment>;
};

function SchemaVersionView(props: SchemaVersionViewProps) {
  const schemaVersion = useFragment(SchemaVersionView_SchemaVersionFragment, props.schemaVersion);

  const [selectedItem, setSelectedItem] = useState<string>('default');
  const contractVersionNode = useMemo(
    () =>
      schemaVersion.contractVersions?.edges?.find(edge => edge.node.id === selectedItem)?.node ??
      null,
    [selectedItem],
  );
  const [selectedView, setSelectedView] = useState<string>('details');

  const availableViews: Array<{
    value: string;
    label: string | ReactElement;
    tooltip: string;
    icon: ReactElement;
  }> = [
    {
      value: 'details',
      icon: <ListBulletIcon className="h-4 w-auto flex-none" />,
      label: 'Summary',
      tooltip: 'A summary of the changes.',
    },
    {
      value: 'full-schema',
      icon: <FileCode2 className="h-4 w-auto flex-none" />,
      label: 'Schema',
      tooltip: 'Show diff of the schema',
    },
  ];

  if (schemaVersion.subgraphDiffs) {
    availableViews.push(
      {
        value: 'supergraph',
        icon: <Layers className="h-4 w-auto flex-none" />,
        label: 'Supergraph',
        tooltip: 'Show diff of the supergraph',
      },
      {
        value: 'service-schema',
        icon: <CubeIcon className="h-4 w-auto flex-none" />,
        label: 'Subgraphs',
        tooltip: 'Show diff of the subgraphs',
      },
    );
  }

  const contractOrVersion = useMemo(() => {
    if (contractVersionNode) {
      return {
        id: contractVersionNode.id,
        schemaCompositionErrors: contractVersionNode.schemaCompositionErrors,
        isFirstComposableVersion: contractVersionNode.isFirstComposableVersion,
        isComposable: contractVersionNode.isComposable,
        sdlChanges: contractVersionNode.sdlChanges,
        sdl: contractVersionNode.sdl,
        supergraphSdl: contractVersionNode.supergraphSdl,
        supergraphChanges: null,
        previousDiffableVersion: contractVersionNode.previousDiffableVersion,
      };
    }

    return {
      id: schemaVersion.id,
      schemaCompositionErrors: schemaVersion.schemaCompositionErrors,
      isFirstComposableVersion: schemaVersion.isFirstComposableVersion,
      isComposable: schemaVersion.isComposable,
      sdlChanges: schemaVersion.sdlChanges,
      sdl: schemaVersion.sdl,
      supergraphSdl: schemaVersion.supergraphSdl,
      supergraphChanges: schemaVersion.supergraphChanges,
      previousDiffableVersion: schemaVersion.previousDiffableVersion,
    };
  }, [schemaVersion, contractVersionNode]);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col py-6">
      <div className="mb-3">
        <SchemaVersionHeader
          schemaVersion={schemaVersion}
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
        />
        {schemaVersion.contractVersions?.edges && (
          <Tabs
            defaultValue="default"
            className="mt-3"
            value={selectedItem}
            onValueChange={value => setSelectedItem(value)}
          >
            <TabsList className="w-full justify-start rounded-b-none bg-transparent px-2 py-0">
              <TabsTrigger
                value="default"
                className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
              >
                <span className="font-mono text-[12px]">Default Graph</span>
                <TooltipProvider>
                  <Tooltip>
                    {schemaVersion.hasSchemaChanges ? (
                      <>
                        <TooltipTrigger>
                          <GitCompareIcon className="size-4 pl-1" />
                        </TooltipTrigger>
                        <TooltipContent>Main graph schema changed</TooltipContent>
                      </>
                    ) : schemaVersion.isComposable ? (
                      <>
                        <TooltipTrigger>
                          <CheckIcon className="size-4 pl-1" />
                        </TooltipTrigger>
                        <TooltipContent>Composition succeeded.</TooltipContent>
                      </>
                    ) : (
                      <>
                        <TooltipTrigger>
                          <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                        </TooltipTrigger>
                        <TooltipContent>Composition failed.</TooltipContent>
                      </>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </TabsTrigger>
              {schemaVersion.contractVersions?.edges.map(edge => (
                <TabsTrigger
                  value={edge.node.id}
                  key={edge.node.id}
                  className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
                >
                  <span className="font-mono text-[12px]">
                    {edge.node.contractName}@{edge.node.id.substring(0, 8)}
                  </span>

                  <TooltipProvider>
                    <Tooltip>
                      {edge.node.hasSchemaChanges ? (
                        <>
                          <TooltipTrigger>
                            <GitCompareIcon className="size-4 pl-1" />
                          </TooltipTrigger>
                          <TooltipContent>Contract schema changed</TooltipContent>
                        </>
                      ) : edge.node.isComposable ? (
                        <>
                          <TooltipTrigger>
                            <CheckIcon className="size-4 pl-1" />
                          </TooltipTrigger>
                          <TooltipContent>Contract composition succeeded.</TooltipContent>
                        </>
                      ) : (
                        <>
                          <TooltipTrigger>
                            <ExclamationTriangleIcon className="size-4 pl-1 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>Contract composition failed.</TooltipContent>
                        </>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <TooltipProvider>
          <Tabs
            value={selectedView}
            onValueChange={value => setSelectedView(value)}
            className="mt-6"
          >
            <TabsList variant="content">
              {availableViews.map(item => (
                <Tooltip key={item.value}>
                  <TooltipTrigger>
                    <TabsTrigger
                      value={item.value}
                      variant="content"
                      className={cn('items-center-safe mx-3 inline-flex pb-2')}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </TooltipProvider>
        <div className="mt-8 space-y-8 px-4">
          {selectedView === 'details' && (
            <>
              {contractOrVersion.isFirstComposableVersion ? (
                <FirstComposableGraphVersion />
              ) : (
                <>
                  {contractOrVersion.schemaCompositionErrors && (
                    <CompositionErrors
                      compositionErrors={contractOrVersion.schemaCompositionErrors}
                    />
                  )}
                  <GraphVersionSummary
                    schemaVersion={schemaVersion}
                    contractVersion={contractVersionNode}
                  />
                </>
              )}
            </>
          )}
          {selectedView === 'full-schema' &&
            (contractOrVersion.schemaCompositionErrors ? (
              <>
                <CompositionErrors compositionErrors={contractOrVersion.schemaCompositionErrors} />
                <p>No schema available as the composition did not succeed.</p>
              </>
            ) : (
              <GraphQLSchemaView
                title="Public GraphQL Schema"
                subtitle="The GraphQL Schema used by GraphQL consumers."
                changes={contractOrVersion.sdlChanges?.edges.map(edge => edge.node) ?? null}
                currentSdl={contractOrVersion.sdl ?? ''}
                previousSdl={contractOrVersion.previousDiffableVersion?.sdl ?? null}
                fromName={
                  contractOrVersion.previousDiffableVersion
                    ? `schema@${contractOrVersion.previousDiffableVersion.id.substring(0, 8)}`
                    : null
                }
                toName={`schema@${contractOrVersion.id.substring(0, 8)}`}
              />
            ))}
          {selectedView === 'supergraph' &&
            (contractOrVersion.schemaCompositionErrors ? (
              <>
                <CompositionErrors compositionErrors={contractOrVersion.schemaCompositionErrors} />
                <p>No supergraph available as the composition did not succeed.</p>
              </>
            ) : (
              <GraphQLSchemaView
                title="Supergraph"
                subtitle="Learn how the supergraph consumed by the Federation Router is affected."
                changes={contractOrVersion.supergraphChanges?.edges.map(edge => edge.node) ?? null}
                currentSdl={contractOrVersion.supergraphSdl ?? ''}
                previousSdl={contractOrVersion.previousDiffableVersion?.supergraphSdl ?? null}
                fromName={
                  contractOrVersion.previousDiffableVersion
                    ? `supergraph@${contractOrVersion.previousDiffableVersion.id.substring(0, 8)}`
                    : null
                }
                toName={`supergraph@${schemaVersion.id.substring(0, 8)}`}
              />
            ))}
          {selectedView === 'service-schema' && schemaVersion.subgraphDiffs && (
            <GraphVersionSubgraphView subgraphDiffs={schemaVersion.subgraphDiffs} />
          )}
        </div>
      </div>
    </div>
  );
}

function GraphQLSchemaView(props: {
  title: string;
  subtitle: string;
  changes: Array<FragmentType<typeof ChangesBlock_SchemaChangeFragment>> | null;
  currentSdl: string;
  previousSdl: string | null;
  fromName: string | null;
  toName: string;
}): ReactElement {
  const [viewMode, setViewMode] = useResetState<'changes' | 'diff' | 'raw'>(() => {
    if (!props.previousSdl) {
      return 'raw';
    }
    return 'changes';
  }, [props.previousSdl, props.currentSdl]);

  const titleNode = (
    <span className="flex items-center gap-1">
      {props.fromName && (
        <>
          {props.fromName}
          <ArrowRightIcon className="inline size-3" />
        </>
      )}
      {props.toName}
    </span>
  );

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{props.title}</h2>
          <p className="text-sm">{props.subtitle}</p>
        </div>
        {props.previousSdl && <ViewModeToggle active={viewMode} onChange={setViewMode} />}
      </div>
      {viewMode === 'changes' && (
        <GenericGraphCard title={titleNode}>
          <div className="px-5">
            {props.changes?.length ? (
              <ChangesBlock
                changes={props.changes}
                projectSlug=""
                organizationSlug=""
                schemaCheckId=""
                targetSlug=""
              />
            ) : props.previousSdl ? (
              <div className="py-3">
                <NoGraphChanges />
              </div>
            ) : (
              <>This is the initial version! No changes available.</>
            )}
          </div>
        </GenericGraphCard>
      )}
      {viewMode === 'diff' && (
        <GenericGraphCard title={titleNode}>
          {(props.previousSdl ?? '') === props.currentSdl ? (
            <div className="px-5 py-3">
              <NoGraphChanges />
            </div>
          ) : (
            <SDLDiffView before={props.previousSdl ?? ''} after={props.currentSdl} />
          )}
        </GenericGraphCard>
      )}
      {viewMode === 'raw' && props.currentSdl && (
        <GenericGraphCard title={<>{props.toName}</>}>
          <SDLView sdl={props.currentSdl} />
        </GenericGraphCard>
      )}
    </>
  );
}

const SchemaVersionSubgraphView__SubgraphDiffFragment = graphql(`
  fragment SchemaVersionSubgraphView__SubgraphDiffFragment on SubgraphDiff {
    ... on SubgraphDiffAdded {
      addedSubgraphVersion {
        id
        sdl
        serviceName
      }
    }
    ... on SubgraphDiffChanged {
      subgraphVersion {
        id
        sdl
        serviceName
      }
      previousSubgraphVersion {
        id
        sdl
        serviceName
      }
      changes {
        edges {
          node {
            ...ChangesBlock_SchemaChangeFragment
          }
        }
      }
    }
    ... on SubgraphDiffRemoved {
      removedSubgraphVersion {
        id
        sdl
        serviceName
      }
    }
    ... on SubgraphDiffUnchanged {
      subgraphVersion {
        id
        sdl
        serviceName
      }
    }
  }
`);

function SubgraphCard(props: {
  diff: any;
  renderChildren?: () => ReactNode;
  isInitiallyCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(props.isInitiallyCollapsed ?? false);
  return (
    <div className="bg-neutral-2 dark:bg-neutral-3 divide-y overflow-hidden rounded-xl border">
      <SubgraphRow subgraphDiff={props.diff}>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => setIsCollapsed(isCollapsed => !isCollapsed)}
        >
          {isCollapsed && <ChevronUpIcon />}
          {!isCollapsed && <ChevronDownIcon />}
        </Button>
      </SubgraphRow>
      {props.renderChildren && !isCollapsed && props.renderChildren()}
    </div>
  );
}

function GraphVersionSubgraphView(props: {
  subgraphDiffs: Array<FragmentType<typeof SchemaVersionSubgraphView__SubgraphDiffFragment>>;
}) {
  const subgraphDiffs = useFragment(
    SchemaVersionSubgraphView__SubgraphDiffFragment,
    props.subgraphDiffs,
  );

  const [viewMode, setViewMode] = useState<'changes' | 'diff' | 'raw'>('changes');

  if (viewMode === 'changes') {
    const nodes = subgraphDiffs.map(diff => {
      if (diff.__typename === 'SubgraphDiffChanged') {
        return (
          <SubgraphCard
            key={diff.__typename + diff.subgraphVersion.id}
            diff={diff}
            renderChildren={() => (
              <div className="px-5">
                {diff.changes ? (
                  <ChangesBlock
                    changes={diff.changes?.edges.map(edge => edge.node) ?? []}
                    projectSlug=""
                    organizationSlug=""
                    schemaCheckId=""
                    targetSlug=""
                  />
                ) : (
                  <div className="py-3">No changes available.</div>
                )}
              </div>
            )}
          />
        );
      }

      if (diff.__typename === 'SubgraphDiffRemoved') {
        return (
          <SubgraphCard
            key={diff.__typename + diff.removedSubgraphVersion.id}
            diff={diff}
            renderChildren={() => (
              <div className="bg-neutral-1 dark:bg-neutral-2 px-5 py-5 text-xs">
                Subgraph removed in this version. Its types are no longer part of the supergraph.
              </div>
            )}
          />
        );
      }

      if (diff.__typename === 'SubgraphDiffAdded') {
        return (
          <SubgraphCard
            key={diff.__typename + diff.addedSubgraphVersion.id}
            diff={diff}
            renderChildren={() => (
              <div className="bg-neutral-1 dark:bg-neutral-2 px-5 py-5 text-xs">
                New subgraph introduced in this version. No prior schema to diff against.
              </div>
            )}
          />
        );
      }

      return null;
    });

    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Subgraphs</h2>
            <p className="text-sm">Per-subgraph state and changes introduced by this version.</p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        <div className="space-y-4">
          {nodes.some(node => node !== null) ? nodes : <>No Changes</>}
        </div>
      </>
    );
  }

  if (viewMode === 'diff') {
    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Subgraphs</h2>
            <p className="text-sm">Per-subgraph state and changes introduced by this version.</p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={() => (
                  <SDLDiffView
                    before={diff.previousSubgraphVersion.sdl}
                    after={diff.subgraphVersion.sdl}
                  />
                )}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.addedSubgraphVersion.id}
                diff={diff}
                renderChildren={() => (
                  <SDLDiffView before="" after={diff.addedSubgraphVersion.sdl} />
                )}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                isInitiallyCollapsed
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffRemoved') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.removedSubgraphVersion.id}
                diff={diff}
                renderChildren={() => (
                  <SDLDiffView before={diff.removedSubgraphVersion.sdl} after="" />
                )}
              />
            );
          }

          return null;
        })}
      </>
    );
  }

  if (viewMode === 'raw') {
    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Subgraphs</h2>
            <p className="text-sm">Per-subgraph state and changes introduced by this version.</p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.addedSubgraphVersion.id}
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.addedSubgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
              />
            );
          }

          return null;
        })}
      </>
    );
  }

  return null;
}

function SDLDiffView(props: { before: string; after: string }) {
  return (
    <MultiFileDiff
      options={{
        theme: { dark: 'pierre-dark', light: 'pierre-light' },
        disableFileHeader: true,
        diffStyle: 'unified',
      }}
      oldFile={{
        name: 'schema.graphql',
        contents: props.before,
      }}
      newFile={{
        name: 'schema.graphql',
        contents: props.after,
      }}
    />
  );
}

function SDLView(props: { sdl: string }) {
  return (
    <div className="max-w-[inherit]">
      <File
        file={{
          name: 'schema.graphql',
          contents: props.sdl,
        }}
        options={{
          theme: { dark: 'pierre-dark', light: 'pierre-light' },
          disableFileHeader: true,
        }}
      />
    </div>
  );
}

function FirstComposableGraphVersion() {
  return (
    <div className="cursor-default">
      <div className="mb-3 flex items-center gap-3">
        <CheckCircledIcon className="h-4 w-auto text-emerald-500" />
        <h2 className="text-neutral-12 text-base font-medium">First composable graph</h2>
      </div>
      <p className="text-neutral-10 text-xs">
        Congratulations! This is the first version of the graph that is composable.
      </p>
    </div>
  );
}

function NoGraphChanges() {
  return (
    <div className="cursor-default">
      <div className="mb-3 flex items-center gap-3">
        <CheckCircledIcon className="h-4 w-auto text-emerald-500" />
        <h2 className="text-neutral-12 text-base font-medium">No Graph Changes</h2>
      </div>
      <p className="text-neutral-10 text-xs">There are no public facing changes in the graph.</p>
    </div>
  );
}

function CopyChip(props: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cleanPendingTimer() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
  }

  useEffect(() => cleanPendingTimer, []);

  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(props.value);
        setCopied(true);
        cleanPendingTimer();
        timeoutRef.current = setTimeout(() => setCopied(false), 1200);
      }}
      className="group inline-flex items-center gap-1.5 rounded-md text-xs"
    >
      <span className="truncate">{props.label ?? props.value}</span>
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function MetaCell(props: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold uppercase tracking-[0.05em]">{props.label}</div>
      <div className="mt-1">{props.children}</div>
    </div>
  );
}

const SchemaVersionHeader_SchemaVersionFragment = graphql(`
  fragment SchemaVersionHeader_SchemaVersionFragment on SchemaVersion {
    id
    isValid
    origin {
      ... on SchemaVersionPublishOrigin {
        publishedSubgraphs {
          name
          versionId
        }
      }
      ... on SchemaVersionPromoteOrigin {
        schemaVersionId
        targetId
        targetName
      }
      ... on SchemaVersionSubgraphRemoveOrigin {
        removedSubgraphs {
          name
          versionId
        }
      }
    }
    date
    meta {
      author
      commit
    }
    githubMetadata {
      commit
      repository
    }
  }
`);

function SchemaVersionHeader(props: {
  organizationSlug: string;
  projectSlug: string;
  schemaVersion: FragmentType<typeof SchemaVersionHeader_SchemaVersionFragment>;
}) {
  const schemaVersion = useFragment(SchemaVersionHeader_SchemaVersionFragment, props.schemaVersion);
  return (
    <header>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold leading-tight tracking-tight">Graph Version</h1>
        <CopyChip value={schemaVersion.id} label={schemaVersion.id.slice(0, 8)} />
      </div>
      <p className="mt-1.5 text-sm">Detailed view of the graph version changes.</p>
      <div
        className={cn(
          'bg-neutral-2 dark:bg-neutral-3 mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border px-5 py-4 sm:grid-cols-3',
          (schemaVersion.githubMetadata || schemaVersion.meta?.commit) && 'sm:grid-cols-4',
        )}
      >
        <MetaCell label="Status">
          <span className="inline-flex items-center gap-1.5">
            <BadgeRounded color={schemaVersion.isValid ? 'green' : 'red'} className="mx-0" />
            <span className="text-sm font-medium">
              {schemaVersion.isValid ? 'Composable' : 'Failed'}
            </span>
          </span>
        </MetaCell>
        <MetaCell label="Origin">
          {schemaVersion.origin.__typename === 'SchemaVersionPromoteOrigin' && (
            <>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <GitCommit className="h-3.5 w-3.5" />
                <Link
                  className="text-xs"
                  to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                    targetSlug: schemaVersion.origin.targetName,
                    versionId: schemaVersion.origin.schemaVersionId,
                  }}
                >
                  {schemaVersion.origin.targetName}@
                  {schemaVersion.origin.schemaVersionId.substring(0, 8)}
                </Link>
              </span>
              <div className="text-[12px]">via Graph Version Promotion</div>
            </>
          )}
          {schemaVersion.origin.__typename === 'SchemaVersionPublishOrigin' && (
            <>
              {schemaVersion.origin.publishedSubgraphs?.map(subgraph => (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 text-sm"
                  key={subgraph.name + '|' + subgraph.versionId}
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  <CopyChip
                    value={subgraph.versionId}
                    label={`${subgraph.name}@${subgraph.versionId.substring(0, 8)}`}
                  />
                </span>
              ))}
              <div className="text-[12px]">via Subgraph Publish</div>
            </>
          )}
          {schemaVersion.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
            <>
              {schemaVersion.origin.removedSubgraphs.map(subgraph => (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 text-sm"
                  key={subgraph.name + '|' + subgraph.versionId}
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  <CopyChip
                    value={subgraph.versionId}
                    label={`${subgraph.name}@${subgraph.versionId.substring(0, 8)}`}
                  />
                </span>
              ))}
              <div className="text-[12px]">via Subgraph Delete</div>
            </>
          )}
        </MetaCell>
        {schemaVersion.githubMetadata ? (
          <MetaCell label="Source">
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
              <GitCommit className="h-3.5 w-3.5" />
              <CopyChip
                value={schemaVersion.githubMetadata.commit}
                label={schemaVersion.githubMetadata.commit.slice(0, 7)}
              />
              <span className="ml-1 inline-flex items-center gap-1 text-[12px]">
                <GitBranch className="h-3 w-3" />
                {schemaVersion.githubMetadata.repository}
              </span>
            </span>
          </MetaCell>
        ) : schemaVersion.meta?.commit ? (
          <MetaCell label="Source">
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
              <GitCommit className="h-3.5 w-3.5" />
              <CopyChip
                value={schemaVersion.meta.commit}
                label={schemaVersion.meta.commit.slice(0, 7)}
              />
            </span>
          </MetaCell>
        ) : null}
        <MetaCell label="created at">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            <TimeAgo date={schemaVersion.date} />
          </span>
          {schemaVersion.meta?.author && (
            <span className="mt-0.5 block text-[12px]">by {schemaVersion.meta.author}</span>
          )}
        </MetaCell>
      </div>
    </header>
  );
}

type SchemaViewMode = 'changes' | 'diff' | 'raw';

const modes: { id: SchemaViewMode; label: string; Icon: typeof ListTree }[] = [
  { id: 'changes', label: 'Changes', Icon: ListTree },
  { id: 'diff', label: 'Diff', Icon: GitCompare },
  { id: 'raw', label: 'View', Icon: FileIcon },
];

export const ViewModeToggle = (props: {
  active: SchemaViewMode;
  onChange: (m: SchemaViewMode) => void;
}) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border p-1">
      {modes.map(m => {
        const isActive = m.id === props.active;
        const Icon = m.Icon;
        return (
          <button
            key={m.id}
            onClick={() => props.onChange(m.id)}
            className={cn(
              'hover:bg-neutral-5/50 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] transition-colors',
              isActive ? 'bg-neutral-5/40' : 'hover:',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
};

const CompositionErrors = (props: {
  compositionErrors: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
}) => {
  const compositionErrors = useFragment(
    CompositionErrorsSection_SchemaErrorConnection,
    props.compositionErrors,
  );

  return (
    <div className="bg-neutral-1 overflow-hidden rounded-xl border border-red-300/20">
      <div className="flex items-start gap-3 border-b border-red-300/20 bg-red-700 px-5 py-4 dark:bg-red-900/40">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-300/20">
          <XCircleIcon className="h-4 w-4 text-red-500" />
        </div>

        <div className="text-neutral-4 dark:text-neutral-12 min-w-0">
          <h3 className="text-sm font-semibold">Supergraph not composable</h3>
          <p className="mt-0.5 text-[12.5px]">
            Errors occurred while attempting to compose the supergraph from its subgraphs.
          </p>
        </div>

        <span className="focus:ring-ring ml-auto inline-flex items-center rounded-full border border-red-700 bg-red-900 px-2.5 py-0.5 text-[10px] font-semibold text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(237,46,57,0.7)]" />
          {compositionErrors.edges.length} error
          {compositionErrors.edges.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="text-neutral-12 flex items-center gap-2 px-5 pt-4">
        <span className="text-xs font-medium uppercase">Composition errors</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-md p-4 font-normal">
              <p>
                If composition errors occur it is impossible to generate a supergraph and public API
                schema.
              </p>
              <p className="mt-1">
                Composition errors can be caused by changes to the underlying schemas that causes
                conflicts with other subgraphs.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ul className="divide-neutral-4 divide-y px-1 pb-2">
        {compositionErrors.edges.map((err, idx) => (
          <li key={idx} className="flex gap-3 px-4 py-3">
            <span className="text-neutral-8 mt-0.5 w-6 shrink-0 select-none font-mono text-xs">
              {String(idx + 1).padStart(2, '0')}
            </span>

            <p className="text-neutral-12 flex flex-wrap items-baseline gap-y-1 text-sm">
              <CompositionError message={err.node.message} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function CompositionError(props: { message: string }) {
  return reactStringReplace(
    reactStringReplace(
      reactStringReplace(props.message, /"([^"]+)"/g, (match, index) => {
        return <Token key={match + index}>{match}</Token>;
      }),
      /(@[^. ]+)/g,
      (match, index) => {
        return <Token key={match + index}>{match}</Token>;
      },
    ),
    /Unknown type ([A-Za-z_0-9]+)/g,
    (match, index) => {
      return (
        <span key={match + index}>
          Unknown type <Token>{match}</Token>
        </span>
      );
    },
  );
}

function Token(props: { children: React.ReactNode }) {
  return (
    <code className="mx-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 align-baseline text-[12px] leading-none">
      {props.children}
    </code>
  );
}

const SchemaVersionSummary_SchemaVersionFragment = graphql(`
  fragment SchemaVersionSummary_SchemaVersionFragment on SchemaVersion {
    id
    isComposable
    subgraphDiffs {
      ...SubgraphRow_SubgraphDiffFragment
      ... on SubgraphDiffAdded {
        addedSubgraphVersion {
          serviceName
          id
          url
        }
      }
      ... on SubgraphDiffRemoved {
        removedSubgraphVersion {
          serviceName
          id
          url
        }
      }
      ... on SubgraphDiffChanged {
        subgraphVersion {
          serviceName
          id
          url
        }
        previousSubgraphVersion {
          id
        }
        changes {
          edges {
            __typename
          }
        }
      }
      ... on SubgraphDiffUnchanged {
        subgraphVersion {
          id
          serviceName
          url
        }
      }
    }
    sdlChanges: schemaChanges {
      edges {
        node {
          isSafeBasedOnUsage
          severityLevel
        }
      }
    }
  }
`);

const SchemaVersionSummary_ContractVersionFragment = graphql(`
  fragment SchemaVersionSummary_ContractVersionFragment on ContractVersion {
    id
    sdlChanges: schemaChanges {
      edges {
        node {
          isSafeBasedOnUsage
          severityLevel
        }
      }
    }
  }
`);

export const GraphVersionSummary = (props: {
  schemaVersion: FragmentType<typeof SchemaVersionSummary_SchemaVersionFragment>;
  contractVersion: null | FragmentType<typeof SchemaVersionSummary_ContractVersionFragment>;
}) => {
  const graphVersion = useFragment(SchemaVersionSummary_SchemaVersionFragment, props.schemaVersion);
  const contractVersion = useFragment(
    SchemaVersionSummary_ContractVersionFragment,
    props.contractVersion,
  );

  const subgraphStats = useMemo(() => {
    const data = {
      total: 0,
      added: 0,
      removed: 0,
      updated: 0,
    };

    for (const diff of graphVersion.subgraphDiffs ?? []) {
      if (diff.__typename === 'SubgraphDiffAdded') {
        data.total++;
        data.added++;
      }
      if (diff.__typename === 'SubgraphDiffChanged') {
        data.total++;
        data.updated++;
      }
      if (diff.__typename === 'SubgraphDiffRemoved') {
        data.removed++;
      }
      if (diff.__typename === 'SubgraphDiffUnchanged') {
        data.total++;
      }
    }

    return data;
  }, [graphVersion.subgraphDiffs]);

  const publicChangeStats = useMemo(() => {
    const data = {
      totalChanges: (contractVersion ?? graphVersion).sdlChanges?.edges.length ?? 0,
      breakingChanges: 0,
      notSafeChanges: 0,
    };

    for (const change of (contractVersion ?? graphVersion).sdlChanges?.edges ?? []) {
      if (change.node.severityLevel === SeverityLevelType.Breaking) {
        data.breakingChanges++;

        if (!change.node.isSafeBasedOnUsage) {
          data.notSafeChanges++;
        }
      }
    }

    return data;
  }, [graphVersion.sdlChanges, contractVersion?.sdlChanges]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Summary</h2>
        <p className="mt-0.5 text-[13px]">Changes introduced by this version.</p>
      </div>

      <div className="bg-neutral-2 dark:bg-neutral-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-6">
        <Stat label="Schema changes" value={publicChangeStats.totalChanges} tone="muted" />
        <Stat
          label="Breaking changes"
          value={publicChangeStats.breakingChanges}
          tone="muted"
          additionalValue={
            publicChangeStats.breakingChanges && graphVersion.isComposable ? (
              publicChangeStats.notSafeChanges ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="flex items-center gap-0.5 text-xs text-red-500/80 lg:text-sm">
                        <ShieldAlertIcon className="inline size-2 md:size-3" />
                        {publicChangeStats.breakingChanges} not safe
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Some changes are not safe based on usage data.</TooltipContent>{' '}
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="pl-2 text-base text-green-500">
                        <CheckIcon size="14" className="inline" /> All safe
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      All these changes are safe based on usage reporting data.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            ) : null
          }
        />
        <Stat label="Total Subgraphs" value={subgraphStats.total} tone="muted" />
        <Stat label="Subgraphs added" value={subgraphStats.added} tone="safe" />
        <Stat label="Subgraphs removed" value={subgraphStats.removed} tone="danger" />
        <Stat label="Subgraphs updated" value={subgraphStats.updated} tone="info" />
      </div>

      <div className="bg-neutral-2 dark:bg-neutral-3 overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]">
            <span>Subgraph Overview</span>
          </div>
        </div>
        <ul className="divide-y">
          {(graphVersion.subgraphDiffs ?? [])
            .sort(diff => (diff.__typename === 'SubgraphDiffUnchanged' ? 1 : -1))
            .map((diff, index) => (
              <li
                className={cn(diff.__typename === 'SubgraphDiffUnchanged' && 'opacity-50')}
                key={`${graphVersion.id}_${index}`}
              >
                <SubgraphRow subgraphDiff={diff} />
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

const Stat = (props: {
  label: string;
  value: number;
  tone: 'safe' | 'danger' | 'info' | 'muted';
  additionalValue?: ReactNode;
}) => {
  const toneText =
    props.tone === 'safe'
      ? 'text-yellow-600'
      : props.tone === 'danger'
        ? 'text-red-600'
        : props.tone === 'info'
          ? 'text-blue-600'
          : '';
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.14em]">{props.label}</span>
      <span>
        <span className={cn('text-xl leading-none tracking-tight', props.value !== 0 && toneText)}>
          {props.value === 0 ? '-' : props.value}
        </span>
        {props.additionalValue && <> {props.additionalValue}</>}
      </span>
    </div>
  );
};

const kindMeta = {
  SubgraphDiffAdded: {
    label: 'Added',
    Icon: Plus,
    text: 'text-yellow-800',
    bg: 'bg-yellow-600',
    ring: 'ring-yellow-500/25',
    dot: 'bg-yellow-600',
  },
  SubgraphDiffRemoved: {
    label: 'Removed',
    Icon: Minus,
    text: 'text-red-900',
    bg: 'bg-red-400',
    ring: 'ring-red-500/25',
    dot: 'bg-red-600',
  },
  SubgraphDiffChanged: {
    label: 'Updated',
    Icon: GitCompareArrows,
    text: 'text-neutral-800',
    bg: 'bg-blue-600',
    ring: 'ring-blue-500/25',
    dot: 'bg-blue-600',
  },
  SubgraphDiffUnchanged: {
    label: 'Unchanged',
    Icon: CircleIcon,
    text: 'text-neutral-800',
    bg: 'bg-neutral-3',
    ring: 'ring-neutral-6',
    dot: 'bg-neutral-5',
  },
} as const;

const SubgraphRow_SubgraphDiffFragment = graphql(`
  fragment SubgraphRow_SubgraphDiffFragment on SubgraphDiff {
    ... on SubgraphDiffAdded {
      addedSubgraphVersion {
        serviceName
        id
        url
      }
    }
    ... on SubgraphDiffRemoved {
      removedSubgraphVersion {
        serviceName
        id
        url
      }
    }
    ... on SubgraphDiffChanged {
      subgraphVersion {
        serviceName
        id
        url
      }
      previousSubgraphVersion {
        id
      }
      changes {
        edges {
          __typename
        }
      }
    }
    ... on SubgraphDiffUnchanged {
      subgraphVersion {
        id
        serviceName
        url
      }
    }
  }
`);

function SubgraphRow(props: {
  subgraphDiff: FragmentType<typeof SubgraphRow_SubgraphDiffFragment>;
  children?: ReactNode;
}) {
  const subgraphDiff = useFragment(SubgraphRow_SubgraphDiffFragment, props.subgraphDiff);

  const meta = kindMeta[subgraphDiff.__typename];
  const Icon = meta.Icon;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1',
          meta.bg,
          meta.ring,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', meta.text)} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {subgraphDiff.__typename === 'SubgraphDiffUnchanged' && (
            <code className="py-0.5 text-xs">
              {subgraphDiff.subgraphVersion.serviceName}@
              {subgraphDiff.subgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffAdded' && (
            <code className="py-0.5 text-xs">
              {subgraphDiff.addedSubgraphVersion.serviceName}@
              {subgraphDiff.addedSubgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffChanged' && (
            <>
              <code className="py-0.5 text-xs">
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.previousSubgraphVersion.id.substring(0, 8)}
              </code>
              <ArrowRight className="h-3 w-3" />
              <code className="py-0.5 text-xs">
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.subgraphVersion.id.substring(0, 8)}
              </code>
            </>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffRemoved' && (
            <code className="py-0.5 text-xs">
              {subgraphDiff.removedSubgraphVersion.serviceName}@
              {subgraphDiff.removedSubgraphVersion.id.substring(0, 8)}
            </code>
          )}
        </div>
        {subgraphDiff.__typename === 'SubgraphDiffUnchanged' && (
          <SubgraphLink url={subgraphDiff.subgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffAdded' && (
          <SubgraphLink url={subgraphDiff.addedSubgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffChanged' && (
          <SubgraphLink url={subgraphDiff.subgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffRemoved' && (
          <SubgraphLink url={subgraphDiff.removedSubgraphVersion.url} />
        )}
      </div>

      <span className={cn('inline-flex items-center gap-1.5 text-[12px]', meta.text)}>
        {subgraphDiff.__typename === 'SubgraphDiffChanged' && subgraphDiff.changes && (
          <span className="mr-2">
            {subgraphDiff.changes.edges.length} change
            {subgraphDiff.changes.edges.length === 1 ? null : 's'}
          </span>
        )}
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        <span className="font-medium">{meta.label}</span>
        {props.children}
      </span>
    </div>
  );
}

function SubgraphLink(props: { url: string }) {
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      className="text-neutral-11 inline-flex w-fit items-center gap-1 text-[11.5px]"
    >
      {props.url}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function GenericGraphCard(props: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="bg-neutral-2 dark:bg-neutral-3 divide-y overflow-hidden rounded-xl border">
      <div className="flex items-center gap-4 px-5 py-3.5">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1',
            'bg-neutral-3',
            'ring-neutral-6',
          )}
        >
          <BoxIcon className={cn('h-3.5 w-3.5')} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <code className="py-0.5 text-xs">{props.title}</code>
          </div>
        </div>
      </div>
      {props.children}
    </div>
  );
}
