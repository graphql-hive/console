import { ReactElement, ReactNode, useMemo, useState } from 'react';
import {
  ArrowRight,
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
  InfoIcon,
  Layers,
  ListTree,
  Minus,
  Plus,
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
          severityLevel
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
    }
    origin {
      ...GraphVersionHeader_GraphVersionOriginFragment
    }
    ...GraphVersionSummary_GraphVersionFragment
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
      label: 'Summary',
      tooltip: 'A summary of the changes.',
      disabledReason: null,
    },
    {
      value: 'full-schema',
      icon: <FileCode2 className="h-4 w-auto flex-none" />,
      label: 'Schema',
      tooltip: 'Show diff of the schema',
      disabledReason: graphVersion?.schemaCompositionErrors
        ? 'Not available as the supergraph composition failed.'
        : null,
    },
    {
      value: 'supergraph',
      icon: <Layers className="h-4 w-auto flex-none" />,
      label: 'Supergraph',
      tooltip: 'Show diff of the supergraph',
      disabledReason: graphVersion?.schemaCompositionErrors
        ? 'Not available as the supergraph composition failed.'
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
    <div className="flex w-full min-w-0 flex-1 flex-col py-6">
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
                      className={cn(
                        'items-center-safe mx-3 inline-flex pb-2',
                        item.disabledReason && 'text-neutral-8 hover:text-neutral-8',
                      )}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  {item.disabledReason && (
                    <TooltipContent className="font-sm max-w-md p-2">
                      {item.disabledReason}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </TooltipProvider>
        <div className="mt-8 space-y-8 px-4">
          {selectedView === 'details' && (
            <>
              {graphVersion.isFirstComposableVersion ? (
                <FirstComposableGraphVersion />
              ) : (
                <>
                  {graphVersion.schemaCompositionErrors && (
                    <CompositionErrors compositionErrors={graphVersion.schemaCompositionErrors} />
                  )}
                  <GraphVersionSummary graphVersion={graphVersion} />
                </>
              )}
            </>
          )}
          {selectedView === 'full-schema' && (
            <GraphQLSchemaView
              title="Public GraphQL Schema"
              subtitle="The GraphQL Schema used by GraphQL consumers."
              changes={graphVersion.sdlChanges?.edges.map(edge => edge.node) ?? null}
              currentSdl={graphVersion.sdl ?? ''}
              previousSdl={graphVersion.previousDiffableGraphVersion?.sdl ?? null}
              name={`schema@${graphVersion.id.substring(0, 8)}`}
            />
          )}
          {selectedView === 'supergraph' && (
            <GraphQLSchemaView
              title="Supergraph"
              subtitle="Learn how the supergraph consumed by the Federation Router is affected."
              changes={graphVersion.supergraphChanges?.edges.map(edge => edge.node) ?? null}
              currentSdl={graphVersion.supergraphSdl ?? ''}
              previousSdl={graphVersion.previousDiffableGraphVersion?.supergraphSdl ?? null}
              name={`supergraph@${graphVersion.id.substring(0, 8)}`}
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
  name: string;
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
        <GenericGraphCard
          title={<>{props.name}</>}
          children={
            <div className="px-5">
              {props.changes?.length ? (
                <ChangesBlock changes={props.changes} />
              ) : props.previousSdl ? (
                <NoGraphChanges />
              ) : (
                <>This is the initial version! No changes available. Check out the Diff tho</>
              )}
            </div>
          }
        ></GenericGraphCard>
      )}
      {viewMode === 'raw' && props.currentSdl && (
        <GenericGraphCard title={<>{props.name}</>}>
          <SDLView sdl={props.currentSdl} />
        </GenericGraphCard>
      )}
      {viewMode === 'diff' && (
        <GenericGraphCard title={<>{props.name}</>}>
          <SDLDiffView before={props.previousSdl ?? ''} after={props.currentSdl} />
        </GenericGraphCard>
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

function SubgraphCard(props: {
  diff: any;
  renderChildren?: () => ReactNode;
  isInitiallyCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(props.isInitiallyCollapsed ?? false);
  return (
    <div className="border-border bg-neutral-2 dark:bg-neutral-3 divide-y overflow-hidden rounded-xl border">
      <SubgraphRow
        subgraphDiff={props.diff}
        children={
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setIsCollapsed(isCollapsed => !isCollapsed)}
          >
            {isCollapsed && <ChevronUpIcon />}
            {!isCollapsed && <ChevronDownIcon />}
          </Button>
        }
      />
      {props.renderChildren && !isCollapsed && props.renderChildren()}
    </div>
  );
}

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
          <SubgraphCard
            diff={diff}
            renderChildren={() => (
              <div className="px-5">
                <ChangesBlock changes={diff.changes?.edges.map(edge => edge.node) ?? null} />
              </div>
            )}
          />
        );
      }

      if (diff.__typename === 'SubgraphDiffRemoved') {
        return (
          <SubgraphCard
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
            <h2 className="text-foreground text-base font-semibold">Subgraphs</h2>
            <p className="text-muted-foreground text-sm">
              Per-subgraph state and changes introduced by this version.
            </p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        <div className="space-y-4">{nodes}</div>
      </>
    );
  }

  if (viewMode === 'diff') {
    return (
      <>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">Subgraphs</h2>
            <p className="text-muted-foreground text-sm">
              Per-subgraph state and changes introduced by this version.
            </p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SubgraphCard
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
                diff={diff}
                renderChildren={() => (
                  <SDLDiffView before={''} after={diff.addedSubgraphVersion.sdl} />
                )}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <SubgraphCard
                diff={diff}
                isInitiallyCollapsed
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffRemoved') {
            return (
              <SubgraphCard
                diff={diff}
                renderChildren={() => (
                  <SDLDiffView before={diff.removedSubgraphVersion.sdl} after={''} />
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
            <h2 className="text-foreground text-base font-semibold">Subgraphs</h2>
            <p className="text-muted-foreground text-sm">
              Per-subgraph state and changes introduced by this version.
            </p>
          </div>
          <ViewModeToggle active={viewMode} onChange={setViewMode} />
        </div>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SubgraphCard
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.addedSubgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SubgraphCard
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffUnchanged') {
            return (
              <SubgraphCard
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
      className="font-mono-tight group inline-flex items-center gap-1.5 rounded-md text-xs"
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
    ... on SubgraphRemoveOrigin {
      removedSubgraphs {
        name
        versionId
      }
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
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <GitCommit className="text-muted-foreground h-3.5 w-3.5" />
                <Link
                  className="font-mono-tight text-xs"
                  to="/$organizationSlug/$projectSlug/$targetSlug/history/$graphName/version/$graphVersionId"
                  params={{
                    graphName: origin.sourceGraphName,
                    graphVersionId: origin.sourceGraphVersionId,
                  }}
                >
                  {origin.sourceGraphName}@{origin.sourceGraphVersionId.substring(0, 8)}
                </Link>
              </span>
              <div className="text-[12px]">via Graph Version Promotion</div>
            </>
          )}
          {origin.__typename === 'SubgraphPublishOrigin' && (
            <>
              {origin.publishedSubgraphs.map(subgraph => (
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
                  <GitCommit className="text-muted-foreground h-3.5 w-3.5" />
                  <CopyChip
                    value={subgraph.versionId}
                    label={`${subgraph.name}@${subgraph.versionId.substring(0, 8)}`}
                  />
                </span>
              ))}
              <div className="text-[12px]">via Subgraph Publish</div>
            </>
          )}
          {origin.__typename === 'SubgraphRemoveOrigin' && (
            <>
              {origin.removedSubgraphs.map(subgraph => (
                <span className="mt-1 inline-flex items-center gap-1.5 text-sm">
                  <GitCommit className="text-muted-foreground h-3.5 w-3.5" />
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
    <code className="border-border bg-code-bg font-mono-tight text-code-fg mx-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 align-baseline text-[12px] leading-none">
      {props.children}
    </code>
  );
}

const GraphVersionSummary_GraphVersionFragment = graphql(`
  fragment GraphVersionSummary_GraphVersionFragment on GraphVersion {
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
    sdlChanges {
      edges {
        node {
          isSafeBasedOnUsage
          severityLevel
        }
      }
    }
    supergraphChanges {
      edges {
        __typename
      }
    }
  }
`);

export const GraphVersionSummary = (props: {
  graphVersion: FragmentType<typeof GraphVersionSummary_GraphVersionFragment>;
}) => {
  const graphVersion = useFragment(GraphVersionSummary_GraphVersionFragment, props.graphVersion);

  const subgraphStats = useMemo(() => {
    const data = {
      total: 0,
      added: 0,
      removed: 0,
      updated: 0,
    };

    for (const diff of graphVersion.subgraphDiffs) {
      if (diff.__typename == 'SubgraphDiffAdded') {
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
      totalChanges: graphVersion.sdlChanges?.edges.length ?? 0,
      breakingChanges: 0,
      notSafeChanges: 0,
    };

    for (const change of graphVersion.sdlChanges?.edges ?? []) {
      if (change.node.severityLevel === SeverityLevelType.Breaking) {
        data.breakingChanges++;

        if (!change.node.isSafeBasedOnUsage) {
          data.notSafeChanges++;
        }
      }
    }

    return data;
  }, [graphVersion.sdlChanges]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-foreground text-base font-semibold">Summary</h2>
        <p className="text-muted-foreground mt-0.5 text-[13px]">
          Changes introduced by this version.
        </p>
      </div>

      <div className="bg-neutral-2 dark:bg-neutral-3 border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-6">
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
                      <span className="pl-2 text-base text-red-500/80">
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

      <div className="border-border bg-neutral-2 dark:bg-neutral-3 overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-3">
          <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]">
            <span>Subgraph Change Overview</span>
          </div>
        </div>
        <ul className="divide-y">
          {graphVersion.subgraphDiffs
            .sort(diff => (diff.__typename === 'SubgraphDiffUnchanged' ? 1 : -1))
            .map(diff => (
              <li className={cn(diff.__typename === 'SubgraphDiffUnchanged' && 'opacity-50')}>
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
          : 'text-foreground';
  return (
    <div className="bg-surface flex flex-col gap-1.5 px-5 py-4">
      <span className="text-muted-foreground text-[10.5px] font-medium uppercase tracking-[0.14em]">
        {props.label}
      </span>
      <span>
        <span
          className={cn(
            'font-mono-tight text-xl leading-none tracking-tight',
            props.value !== 0 && toneText,
          )}
        >
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
    text: 'text-neutral-7',
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
            <code className="font-mono-tight py-0.5 text-xs">
              {subgraphDiff.subgraphVersion.serviceName}@
              {subgraphDiff.subgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffAdded' && (
            <code className="font-mono-tight py-0.5 text-xs">
              {subgraphDiff.addedSubgraphVersion.serviceName}@
              {subgraphDiff.addedSubgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffChanged' && (
            <>
              <code className="font-mono-tight py-0.5 text-xs">
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.previousSubgraphVersion.id.substring(0, 8)}
              </code>
              <ArrowRight className="text-muted-foreground h-3 w-3" />
              <code className="font-mono-tight py-0.5 text-xs">
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.subgraphVersion.id.substring(0, 8)}
              </code>
            </>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffRemoved' && (
            <code className="font-mono-tight py-0.5 text-xs">
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
      className="font-mono-tight text-neutral-11 hover:text-foreground inline-flex w-fit items-center gap-1 text-[11.5px] transition-colors"
    >
      {props.url}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function GenericGraphCard(props: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-border bg-neutral-2 dark:bg-neutral-3 divide-y overflow-hidden rounded-xl border">
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
            <code className="font-mono-tight py-0.5 text-xs">{props.title}</code>
          </div>
        </div>
      </div>
      {props.children}
    </div>
  );
}
