import { ReactElement, ReactNode, useState } from 'react';
import {
  BoxIcon,
  Check,
  Clock,
  Copy,
  FileCode2,
  FileIcon,
  GitBranch,
  GitCommit,
  GitCompare,
  Layers,
  ListTree,
} from 'lucide-react';
import { useQuery } from 'urql';
import { NotFoundContent } from '@/components/common/not-found-content';
import {
  ChangesBlock,
  ChangesBlock_SchemaChangeFragment,
  CompositionErrorsSection,
} from '@/components/target/history/errors-and-changes';
import { BadgeRounded } from '@/components/ui/badge';
import { Link } from '@/components/ui/link';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn } from '@/lib/utils';
import { File, MultiFileDiff } from '@pierre/diffs/react';
import {
  CheckCircledIcon,
  CrossCircledIcon,
  CubeIcon,
  ListBulletIcon,
} from '@radix-ui/react-icons';

const TargetHistoryGraphVersion_ActiveGraphVersionQuery = graphql(`
  query TargetHistoryGraphVersion_ActiveGraphVersionQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $graphName: String!
    $graphVersionId: ID!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      type
      target: targetBySlug(targetSlug: $targetSlug) {
        id
        graph(name: $graphName) {
          id
          graphVersion(id: $graphVersionId) {
            id
            ...GraphVersionView_GraphVersionFragment
          }
        }
      }
    }
  }
`);

export function TargetHistoryGraphVersionPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  graphName: string;
  graphVersionId: string;
}) {
  const [query] = useQuery({
    query: TargetHistoryGraphVersion_ActiveGraphVersionQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      graphName: props.graphName,
      graphVersionId: props.graphVersionId,
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

  const graphVersion = query.data?.project?.target?.graph?.graphVersion ?? null;

  if (!graphVersion) {
    return (
      <NotFoundContent
        heading="Graph Version not found."
        subheading="This graph version does not seem to exist anymore."
        includeBackButton={false}
      />
    );
  }

  if (query.error) {
    return (
      <div className="m-3 rounded-lg bg-red-500/20 p-8">
        <div className="mb-3 flex items-center gap-3">
          <CrossCircledIcon className="h-6 w-auto text-red-500" />
          <h2 className="text-neutral-12 text-lg font-medium">Failed to compare schemas</h2>
        </div>
        <p className="text-neutral-10 text-base">
          Previous or current schema is most likely incomplete and was force published
        </p>
        <pre className="text-neutral-12 mt-5 whitespace-pre-wrap rounded-lg bg-red-900 p-3 text-xs">
          {query.error.graphQLErrors?.[0]?.message ?? query.error.networkError?.message}
        </pre>
      </div>
    );
  }

  return <GraphVersionView graphVersion={graphVersion} />;
}

const GraphVersionView_GraphVersionFragment = graphql(`
  fragment GraphVersionView_GraphVersionFragment on GraphVersion {
    id
    createdAt
    isComposable
    isValid
    isFirstComposableVersion
    schemaCompositionErrors {
      ...CompositionErrorsSection_SchemaErrorConnection
    }
    supergraphSdl
    supergraphChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
        }
      }
    }
    sdl
    sdlChanges {
      edges {
        node {
          ...ChangesBlock_SchemaChangeFragment
        }
      }
    }
    previousDiffableGraphVersion {
      id
      supergraphSdl
      sdl
    }
    subgraphDiffs {
      ...GraphVersionSubgraphView__SubgraphDiffFragment
      ... on SubgraphDiffAdded {
        addedSubgraphVersion {
          serviceName
          id
        }
      }
      ... on SubgraphDiffRemoved {
        removedSubgraphVersion {
          serviceName
          id
        }
      }
      ... on SubgraphDiffChanged {
        subgraphVersion {
          serviceName
          id
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
    }
    origin {
      ...GraphVersionHeader_GraphVersionOriginFragment
    }
  }
`);

type GraphVersionViewProps = {
  graphVersion: FragmentType<typeof GraphVersionView_GraphVersionFragment>;
};

function GraphVersionView(props: GraphVersionViewProps) {
  const graphVersion = useFragment(GraphVersionView_GraphVersionFragment, props.graphVersion);

  const [selectedView, setSelectedView] = useState<string>('details');

  const availableViews: Array<{
    value: string;
    label: string | ReactElement;
    tooltip: string;
    icon: ReactElement;
    disabledReason: null | string;
  }> = [
    {
      value: 'details',
      icon: <ListBulletIcon className="h-4 w-auto flex-none" />,
      label: 'Overview',
      tooltip: 'A summary of the changes.',
      disabledReason: null,
    },
    {
      value: 'full-schema',
      icon: <FileCode2 className="h-4 w-auto flex-none" />,
      label: 'Schema',
      tooltip: 'Show diff of the schema',
      disabledReason: graphVersion?.schemaCompositionErrors ? 'Composition failed.' : null,
    },
    {
      value: 'supergraph',
      icon: <Layers className="h-4 w-auto flex-none" />,
      label: 'Supergraph',
      tooltip: 'Show diff of the supergraph',
      disabledReason: graphVersion?.schemaCompositionErrors
        ? 'Composition failed.'
        : graphVersion?.supergraphSdl
          ? null
          : 'No supergraph.',
    },
    {
      value: 'service-schema',
      icon: <CubeIcon className="h-4 w-auto flex-none" />,
      label: 'Subgraphs',
      tooltip: 'Show diff of the subgraphs',
      disabledReason: null,
    },
  ];

  return (
    <div className="flex w-full flex-col py-6">
      <div className="mb-3">
        <GraphVersionHeader
          meta={{
            author: {
              email: 'laurinquast@googlemail.com',
              name: 'Laurin Quast',
            },
            git: {
              repository: 'the-guild/console',
              branch: 'main',
              commit: '85136c79cbf9fe36bb9d05d0639c70c265c18d37',
            },
            service: 'graphql',
            isValid: graphVersion.isValid,
            triggeredAgo: graphVersion.createdAt,
            versionId: graphVersion.id,
          }}
          origin={graphVersion.origin}
        />
        <TooltipProvider>
          <Tabs
            value={selectedView}
            onValueChange={value => setSelectedView(value)}
            className="mt-6"
          >
            <TabsList variant="content">
              {availableViews.map((item, index) => (
                <Tooltip key={item.value}>
                  <TooltipTrigger>
                    <TabsTrigger
                      value={item.value}
                      disabled={!!item.disabledReason}
                      variant="content"
                      className={cn('items-center-safe mx-3 inline-flex pb-2')}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  {item.disabledReason && (
                    <TooltipContent className="max-w-md p-4 font-normal">
                      {item.disabledReason}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </TooltipProvider>
        <div className="my-4 mt-0 px-4 pt-4">
          {selectedView === 'details' && (
            <>
              {graphVersion.isFirstComposableVersion && <FirstComposableGraphVersion />}
              {graphVersion.schemaCompositionErrors && (
                <CompositionErrorsSection
                  compositionErrors={graphVersion.schemaCompositionErrors}
                />
              )}
              <ul>
                {graphVersion.subgraphDiffs.map(diff => {
                  if (diff.__typename === 'SubgraphDiffAdded') {
                    return (
                      <li>
                        Subgraph{' '}
                        <span className="font-mono">
                          {diff.addedSubgraphVersion.serviceName}@$
                          {diff.addedSubgraphVersion.id.substring(0, 8)}
                        </span>{' '}
                        was added
                      </li>
                    );
                  }
                  if (diff.__typename === 'SubgraphDiffChanged') {
                    return (
                      <li>
                        Subgraph{' '}
                        <span className="font-mono">{diff.subgraphVersion.serviceName}</span> was
                        changed from{' '}
                        <span className="font-mono">
                          {diff.previousSubgraphVersion.id.substring(0, 8)}
                        </span>{' '}
                        to{' '}
                        <span className="font-mono">{diff.subgraphVersion.id.substring(0, 8)}</span>
                        {diff.changes?.edges.length && ` (${diff.changes?.edges.length} changes)`}
                      </li>
                    );
                  }
                  if (diff.__typename === 'SubgraphDiffRemoved') {
                    return (
                      <li>
                        Subgraph{' '}
                        <span className="font-mono">
                          {diff.removedSubgraphVersion.serviceName}@
                          {diff.removedSubgraphVersion.id.substring(0, 8)}
                        </span>{' '}
                        was removed
                      </li>
                    );
                  }

                  return null;
                })}
                {graphVersion.supergraphChanges?.edges.length && (
                  <li>{graphVersion.supergraphChanges?.edges.length} change(s) to Supergraph</li>
                )}
                {graphVersion.sdlChanges?.edges.length && (
                  <li>{graphVersion.sdlChanges?.edges.length} change(s) to Public Schema</li>
                )}
              </ul>
            </>
          )}
          {selectedView === 'full-schema' && (
            <GraphQLSchemaView
              title="Public GraphQL schema"
              subtitle="See how the public GraphQL schema used by clients is affected."
              changes={graphVersion.sdlChanges?.edges.map(edge => edge.node) ?? null}
              currentSdl={graphVersion.sdl ?? ''}
              previousSdl={graphVersion.previousDiffableGraphVersion?.sdl ?? null}
              header={<SubgraphHeader serviceName="schema" id={graphVersion.id} />}
            />
          )}
          {selectedView === 'supergraph' && (
            <GraphQLSchemaView
              title="Supergraph"
              subtitle="Learn how the supergraph consumed by the Federation Router is affected."
              changes={graphVersion.supergraphChanges?.edges.map(edge => edge.node) ?? null}
              currentSdl={graphVersion.supergraphSdl ?? ''}
              previousSdl={graphVersion.previousDiffableGraphVersion?.supergraphSdl ?? null}
              header={<SubgraphHeader serviceName="supergraph" id={graphVersion.id} />}
            />
          )}
          {selectedView === 'service-schema' && (
            <GraphVersionSubgraphView subgraphDiffs={graphVersion.subgraphDiffs} />
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
  header: ReactNode;
}): ReactElement {
  const [viewMode, setViewMode] = useResetState<'changes' | 'diff' | 'raw'>(() => {
    if (!props.previousSdl) {
      return 'raw';
    }
    return 'changes';
  }, [props.previousSdl, props.currentSdl]);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-foreground text-base font-semibold">{props.title}</h2>
          <p className="text-muted-foreground text-sm">{props.subtitle}</p>
        </div>
        {props.previousSdl && <ViewModeToggle active={viewMode} onChange={setViewMode} />}
      </div>
      {viewMode === 'changes' && (
        <>
          {props.changes?.length ? (
            <ChangesBlock changes={props.changes} />
          ) : props.previousSdl ? (
            <NoGraphChanges />
          ) : (
            <>This is the initial version! No changes available. Check out the Diff tho</>
          )}
        </>
      )}
      {viewMode === 'raw' && props.currentSdl && (
        <div className="mt-4">
          <File
            file={{
              name: 'schema.graphql',
              contents: props.currentSdl,
            }}
            options={{
              theme: { dark: 'pierre-dark', light: 'pierre-light' },
            }}
            renderCustomHeader={() => props.header}
          />
        </div>
      )}
      {viewMode === 'diff' && (
        <div className="mt-4">
          <MultiFileDiff
            options={{
              theme: { dark: 'pierre-dark', light: 'pierre-light' },
            }}
            oldFile={{
              name: 'schema.graphql',
              contents: props.previousSdl ?? '',
            }}
            newFile={{
              name: 'schema.graphql',
              contents: props.currentSdl,
            }}
            renderCustomHeader={() => props.header}
          />
        </div>
      )}
    </>
  );
}

const GraphVersionSubgraphView__SubgraphDiffFragment = graphql(`
  fragment GraphVersionSubgraphView__SubgraphDiffFragment on SubgraphDiff {
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

function GraphVersionSubgraphView(props: {
  subgraphDiffs: Array<FragmentType<typeof GraphVersionSubgraphView__SubgraphDiffFragment>>;
}) {
  const subgraphDiffs = useFragment(
    GraphVersionSubgraphView__SubgraphDiffFragment,
    props.subgraphDiffs,
  );

  const [viewMode, setViewMode] = useState<'changes' | 'diff' | 'raw'>('changes');

  if (viewMode === 'changes') {
    const nodes = subgraphDiffs.map(diff => {
      if (diff.__typename === 'SubgraphDiffChanged') {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-foreground text-base font-semibold">
                  Subgraph <span className="font-mono">{diff.subgraphVersion.serviceName}</span>
                </h2>
                <p className="text-muted-foreground text-sm">See how the subgraph changed.</p>
              </div>
            </div>
            <>
              {diff.changes?.edges?.length ? (
                <ChangesBlock changes={diff.changes?.edges.map(edge => edge.node) ?? null} />
              ) : (
                <NoGraphChanges />
              )}
            </>
          </>
        );
      }

      if (diff.__typename === 'SubgraphDiffRemoved') {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-foreground text-base font-semibold">
                  Subgraph{' '}
                  <span className="font-mono">{diff.removedSubgraphVersion.serviceName}</span>
                </h2>
                <p className="text-muted-foreground text-sm">This subgraph was removed.</p>
              </div>
            </div>
          </>
        );
      }

      if (diff.__typename === 'SubgraphDiffAdded') {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-foreground text-base font-semibold">
                  Subgraph{' '}
                  <span className="font-mono">{diff.addedSubgraphVersion.serviceName}</span>
                </h2>
                <p className="text-muted-foreground text-sm">This subgraph was added.</p>
              </div>
            </div>
          </>
        );
      }

      return null;
    });

    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">Subgraph Changes</h2>
            <p className="text-muted-foreground text-sm">See how the subgraphs changed.</p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        <div className="mt-8">{nodes}</div>
      </>
    );
  }

  if (viewMode === 'diff') {
    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">Subgraph Diff View</h2>
            <p className="text-muted-foreground text-sm">See all changed subgraphs.</p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <DiffSubgraphView
                before={{
                  sdl: diff.previousSubgraphVersion.sdl,
                }}
                after={diff.subgraphVersion}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <div className="mt-4">
                <DiffSubgraphView
                  before={{ sdl: '' }}
                  after={{
                    id: diff.addedSubgraphVersion.id,
                    sdl: diff.addedSubgraphVersion.sdl,
                    serviceName: diff.addedSubgraphVersion.serviceName,
                  }}
                />
              </div>
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <div className="bg-neutral-1 mt-4">
                <SubgraphHeader
                  id={diff.subgraphVersion.id}
                  serviceName={diff.subgraphVersion.serviceName}
                  className="pb-2"
                />
                <div className="text-neutral-8 mt-2 px-4 pb-4">No Changes</div>
              </div>
            );
          }

          if (diff.__typename === 'SubgraphDiffRemoved') {
            return (
              <div className="bg-neutral-1 mt-4">
                <SubgraphHeader
                  id={diff.removedSubgraphVersion.id}
                  serviceName={diff.removedSubgraphVersion.serviceName}
                  className="pb-2"
                />
                <div className="text-neutral-8 mt-2 px-4 pb-4">This subgraph was removed</div>
              </div>
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
            <h2 className="text-foreground text-base font-semibold">All Subgraphs</h2>
            <p className="text-muted-foreground text-sm">
              See all subgraphs of this graph version.
            </p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SingleSubgraphView
                id={diff.addedSubgraphVersion.id}
                sdl={diff.addedSubgraphVersion.sdl}
                serviceName={diff.addedSubgraphVersion.serviceName}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SingleSubgraphView
                id={diff.subgraphVersion.id}
                sdl={diff.subgraphVersion.sdl}
                serviceName={diff.subgraphVersion.serviceName}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <SingleSubgraphView
                id={diff.subgraphVersion.id}
                sdl={diff.subgraphVersion.sdl}
                serviceName={diff.subgraphVersion.serviceName}
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

function SubgraphHeader(props: { serviceName: string; id: string; className?: string }) {
  return (
    <div className={cn('flex items-center px-4 py-4', props.className)}>
      <BoxIcon size="20" />
      <span className="ml-2 font-mono font-bold">
        {props.serviceName}@
        <CopyChip value={props.id} label={props.id.substring(0, 8)} />
      </span>
    </div>
  );
}

function DiffSubgraphView(props: {
  before: { sdl: string };
  after: { id: string; serviceName: string; sdl: string };
}) {
  return (
    <div className="mt-4">
      <MultiFileDiff
        renderCustomHeader={() => (
          <SubgraphHeader id={props.after.id} serviceName={props.after.serviceName} />
        )}
        options={{
          theme: { dark: 'pierre-dark', light: 'pierre-light' },
        }}
        oldFile={{
          name: 'schema.graphql',
          contents: props.before.sdl,
        }}
        newFile={{
          name: 'schema.graphql',
          contents: props.after.sdl,
        }}
      />
    </div>
  );
}

function SingleSubgraphView(props: { id: string; serviceName: string; sdl: string }) {
  return (
    <div className="mt-4">
      <File
        renderCustomHeader={() => <SubgraphHeader id={props.id} serviceName={props.serviceName} />}
        file={{
          name: 'schema.graphql',
          contents: props.sdl,
        }}
        options={{
          theme: { dark: 'pierre-dark', light: 'pierre-light' },
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
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(props.value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="font-mono-tight text-muted-foreground-strong hover:text-foreground group inline-flex items-center gap-1.5 rounded-md text-[12.5px] transition-colors"
    >
      <span className="truncate">{props.label ?? props.value}</span>
      {copied ? (
        <Check className="text-severity-safe h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

interface Meta {
  versionId: string;
  isValid: boolean;
  service: string;
  triggeredAgo: string;
  author: { name: string; email: string };
  git: {
    repository: string;
    branch: string;
    commit: string;
  };
}

function MetaCell(props: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs font-bold uppercase tracking-[0.05em]">
        {props.label}
      </div>
      <div className="mt-1">{props.children}</div>
    </div>
  );
}

const GraphVersionHeader_GraphVersionOriginFragment = graphql(`
  fragment GraphVersionHeader_GraphVersionOriginFragment on GraphVersionOrigin {
    ... on SubgraphPublishOrigin {
      publishedSubgraphs {
        name
        versionId
      }
    }
    ... on GraphVersionPromotionOrigin {
      sourceGraphName
      sourceGraphVersionId
    }
  }
`);

function GraphVersionHeader(props: {
  meta: Meta;
  origin: FragmentType<typeof GraphVersionHeader_GraphVersionOriginFragment>;
}) {
  const origin = useFragment(GraphVersionHeader_GraphVersionOriginFragment, props.origin);
  return (
    <header>
      <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
        <span>Schema Registry</span>
        <span className="text-border-strong">/</span>
        <span>Versions</span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-foreground text-[28px] font-semibold leading-tight tracking-tight">
          Graph Version
        </h1>
        <CopyChip value={props.meta.versionId} label={props.meta.versionId.slice(0, 8)} />
      </div>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Detailed view of the graph version changes.
      </p>

      <div className="border-border bg-neutral-2 dark:bg-neutral-3 mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border px-5 py-4 sm:grid-cols-4">
        <MetaCell label="Status">
          <span className="inline-flex items-center gap-1.5">
            <BadgeRounded color={props.meta.isValid ? 'green' : 'red'} />
            <span className="text-foreground text-sm font-medium">
              {props.meta.isValid ? 'Composable' : 'Failed'}
            </span>
          </span>
        </MetaCell>
        <MetaCell label="Triggered">
          <span className="text-foreground inline-flex items-center gap-1.5 text-sm">
            <Clock className="text-muted-foreground h-3.5 w-3.5" />
            <TimeAgo date={props.meta.triggeredAgo} />
          </span>
          <span className="text-muted-foreground mt-0.5 block text-[12px]">
            by {props.meta.author.name}
          </span>
        </MetaCell>
        <MetaCell label="Source">
          <div>{props.meta.git.repository}</div>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
            <GitCommit className="text-muted-foreground h-3.5 w-3.5" />
            <CopyChip value={props.meta.git.commit} label={props.meta.git.commit.slice(0, 7)} />
            <span className="text-muted-foreground ml-1 inline-flex items-center gap-1 text-[12px]">
              <GitBranch className="h-3 w-3" />
              {props.meta.git.branch}
            </span>
          </span>
        </MetaCell>
        <MetaCell label="Origin">
          {origin.__typename === 'GraphVersionPromotionOrigin' && (
            <>
              Promoted from{' '}
              <Link
                className="font-mono-tight text-sm"
                to="/$organizationSlug/$projectSlug/$targetSlug/history/$graphName/version/$graphVersionId"
                params={{
                  graphName: origin.sourceGraphName,
                  graphVersionId: origin.sourceGraphVersionId,
                }}
              >
                {origin.sourceGraphName}@{origin.sourceGraphVersionId.substring(0, 8)}
              </Link>
            </>
          )}
          {origin.__typename === 'SubgraphPublishOrigin' && (
            <>
              Subgraph publish{' '}
              {origin.publishedSubgraphs.map(subgraph => (
                <span className="font-mono-tight text-sm">
                  {subgraph.name}@{subgraph.versionId.substring(0, 8)}
                </span>
              ))}
            </>
          )}
        </MetaCell>
      </div>
    </header>
  );
}

type SchemaViewMode = 'changes' | 'diff' | 'raw';

const modes: { id: SchemaViewMode; label: string; Icon: typeof ListTree }[] = [
  { id: 'changes', label: 'Changes', Icon: ListTree },
  { id: 'diff', label: 'SDL diff', Icon: GitCompare },
  { id: 'raw', label: 'SDL', Icon: FileIcon },
];

export const ViewModeToggle = (props: {
  active: SchemaViewMode;
  onChange: (m: SchemaViewMode) => void;
}) => {
  return (
    <div className="border-border bg-surface inline-flex items-center gap-1 rounded-lg border p-1">
      {modes.map(m => {
        const isActive = m.id === props.active;
        const Icon = m.Icon;
        return (
          <button
            key={m.id}
            onClick={() => props.onChange(m.id)}
            className={cn(
              'hover:bg-neutral-5/50 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] transition-colors',
              isActive ? 'bg-neutral-5/40 text-foreground' : 'hover:text-foreground',
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
