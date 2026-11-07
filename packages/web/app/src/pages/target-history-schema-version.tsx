import { ReactElement, ReactNode, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowRightIcon,
  BoxIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  Clock,
  DownloadIcon,
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
  ListIcon,
  ListTree,
  Minus,
  Plus,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useQuery } from 'urql';
import { ContractFailuresTable } from '@/components/target/checks/contract-failures-table';
import { changeSafetyStats } from '@/components/target/history/change-safety-stats';
import { CompositionErrorsCard } from '@/components/target/history/composition-errors-card';
import { ChangesBlock } from '@/components/target/history/errors-and-changes';
import { CodeScrollArea, File, FileDiff } from '@/components/ui/diffs';
import { Link } from '@/components/ui/link';
import { NotFound } from '@/components/ui/not-found/not-found';
import { Button } from '@/components/ui/primitives/button/button';
import { CopyChip } from '@/components/ui/primitives/copy-chip/copy-chip';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';
import { QueryError } from '@/components/ui/query-error';
import { ScopeBar } from '@/components/ui/scope-bar/scope-bar';
import { useSdlDiff } from '@/components/ui/sdl-diff';
import { TabbedView } from '@/components/ui/tabbed-view/tabbed-view';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn, formatCount } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { targetHistorySchemaVersionStyles } from './target-history-schema-version.css';

/** A status icon inside a tab, explained on hover. */
function StatusTooltip(props: { icon: React.ReactNode; label: string }) {
  return (
    <Tooltip
      trigger={<span className={shared.inlineFlex}>{props.icon}</span>}
      content={props.label}
    />
  );
}

export const TargetHistoryGraphVersion_ActiveGraphVersionQuery = graphql(`
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

export function TargetHistorySchemaVersionPage(props: { schemaVersionId: string }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetHistoryGraphVersion_ActiveGraphVersionQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      schemaVersionId: props.schemaVersionId,
    },
  });

  const isLoading = query.fetching || query.stale;

  if (isLoading) {
    return (
      <div className={targetHistorySchemaVersionStyles.pending}>
        <span className={targetHistorySchemaVersionStyles.spacedBelow}>
          <Spinner variants={{ size: 'lg' }} />
        </span>
        Loading schema version...
      </div>
    );
  }

  const schemaVersion = query.data?.project?.target?.schemaVersion ?? null;

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showError
        showLogoutButton={false}
        className={targetHistorySchemaVersionStyles.error}
      />
    );
  }

  if (!schemaVersion) {
    return (
      <NotFound
        title="Schema Version not found."
        description="This schema version does not seem to exist anymore."
        showBackButton={false}
      />
    );
  }

  return <SchemaVersionView schemaVersion={schemaVersion} />;
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
          ...FilterableSchemaChangeBlock_ChangesFragment
        }
      }
    }
    sdl
    sdlChanges: schemaChanges {
      edges {
        node {
          ...FilterableSchemaChangeBlock_ChangesFragment
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
                ...FilterableSchemaChangeBlock_ChangesFragment
                severityLevel
              }
            }
          }
          schemaCompositionErrors {
            edges {
              node {
                message
              }
            }
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
  schemaVersion: FragmentType<typeof SchemaVersionView_SchemaVersionFragment>;
};

function SchemaVersionView(props: SchemaVersionViewProps) {
  const schemaVersion = useFragment(SchemaVersionView_SchemaVersionFragment, props.schemaVersion);

  const [selectedItem, setSelectedItem] = useResetState<string>(
    () => 'default',
    [schemaVersion.id],
  );
  const contractVersionNode = useMemo(
    () =>
      schemaVersion.contractVersions?.edges?.find(edge => edge.node.id === selectedItem)?.node ??
      null,
    [selectedItem, schemaVersion],
  );
  const [selectedView, setSelectedView] = useResetState<string>(
    () => 'details',
    [!!schemaVersion.subgraphDiffs],
  );

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

  const contractVersions = schemaVersion.contractVersions?.edges ?? [];
  // Without contracts there is nothing to pick, but the default graph keeps its status glyph.
  const contractPicker = !contractVersions.length ? (
    schemaVersion.contractVersions?.edges ? (
      <span className={targetHistorySchemaVersionStyles.count}>
        {versionStatusIcon(schemaVersion, DEFAULT_GRAPH_LABELS)}
        Default Graph
      </span>
    ) : undefined
  ) : (
    <Select
      aria-label="Contract version"
      value={selectedItem}
      onValueChange={setSelectedItem}
      label={
        <span className={targetHistorySchemaVersionStyles.inlineMeta}>
          {contractVersionNode
            ? versionStatus(contractVersionNode, CONTRACT_LABELS).icon
            : versionStatus(schemaVersion, DEFAULT_GRAPH_LABELS).icon}
          {contractVersionNode
            ? `${contractVersionNode.contractName}@${contractVersionNode.id.substring(0, 8)}`
            : 'Default Graph'}
        </span>
      }
      options={[
        {
          value: 'default',
          label: 'Default Graph',
          trailing: versionStatusTrailing(schemaVersion, DEFAULT_GRAPH_LABELS),
        },
        ...contractVersions.map(edge => ({
          value: edge.node.id,
          label: `${edge.node.contractName}@${edge.node.id.substring(0, 8)}`,
          trailing: versionStatusTrailing(edge.node, CONTRACT_LABELS),
        })),
      ]}
      size="compact"
      width="auto"
    />
  );

  // The picker opens on the default graph, so a contract version that failed is named here first.
  const failures = contractVersions.flatMap(edge =>
    edge.node.isComposable
      ? []
      : [
          {
            key: edge.node.id,
            label: `${edge.node.contractName}@${edge.node.id.substring(0, 8)}`,
            reason: 'Contract composition failed.',
            detail: formatCount(edge.node.schemaCompositionErrors?.edges.length ?? 0, 'error'),
            onView: () => setSelectedItem(edge.node.id),
          },
        ],
  );

  const summary =
    schemaVersion.subgraphDiffs === null && contractOrVersion.isFirstComposableVersion ? (
      <FirstComposableGraphVersion />
    ) : (
      <>
        {contractOrVersion.schemaCompositionErrors && (
          <CompositionErrorsCard compositionErrors={contractOrVersion.schemaCompositionErrors} />
        )}
        <SchemaVersionSummary schemaVersion={schemaVersion} contractVersion={contractVersionNode} />
        {!schemaVersion.subgraphDiffs && (
          <GraphQLSchemaView
            title="GraphQL Schema"
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
        )}
      </>
    );

  const publicSchema = contractOrVersion.schemaCompositionErrors ? (
    <>
      <CompositionErrorsCard compositionErrors={contractOrVersion.schemaCompositionErrors} />
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
  );

  const supergraph = contractOrVersion.schemaCompositionErrors ? (
    <>
      <CompositionErrorsCard compositionErrors={contractOrVersion.schemaCompositionErrors} />
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
  );

  return (
    <div className={targetHistorySchemaVersionStyles.root}>
      <div className={targetHistorySchemaVersionStyles.spacedBelow}>
        <SchemaVersionHeader schemaVersion={schemaVersion} />
      </div>
      {/* A monolithic schema has no subgraphs, so its summary sits on the page without tabs. */}
      {schemaVersion.subgraphDiffs ? (
        <div className={targetHistorySchemaVersionStyles.tabs}>
          {failures.length ? (
            <div className={targetHistorySchemaVersionStyles.spacedBelow}>
              <ContractFailuresTable
                title={`${failures.length} of ${contractVersions.length} contracts failed`}
                aside={`${contractVersions.length - failures.length} passed`}
                items={failures}
              />
            </div>
          ) : null}
          {contractPicker ? <ScopeBar picker={contractPicker} /> : null}
          <TabbedView
            value={selectedView}
            onValueChange={setSelectedView}
            items={[
              {
                value: 'details',
                label: 'Summary',
                icon: ListIcon,
                content: <div className={targetHistorySchemaVersionStyles.tab}>{summary}</div>,
              },
              {
                value: 'full-schema',
                label: 'Schema',
                icon: FileCode2,
                content: <div className={targetHistorySchemaVersionStyles.tab}>{publicSchema}</div>,
              },
              {
                value: 'supergraph',
                label: 'Supergraph',
                icon: Layers,
                content: <div className={targetHistorySchemaVersionStyles.tab}>{supergraph}</div>,
              },
              {
                value: 'service-schema',
                label: 'Subgraphs',
                icon: BoxIcon,
                content: (
                  <div className={targetHistorySchemaVersionStyles.tab}>
                    <GraphVersionSubgraphView subgraphDiffs={schemaVersion.subgraphDiffs} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className={targetHistorySchemaVersionStyles.summaryOnly}>{summary}</div>
      )}
    </div>
  );
}

type VersionStatusFlags = { hasSchemaChanges: boolean; isComposable: boolean };
type VersionStatusLabels = { changed: string; succeeded: string; failed: string };

/** The glyph and the words for a version's outcome; the trigger takes the glyph, the list both. */
function versionStatus(version: VersionStatusFlags, labels: VersionStatusLabels) {
  if (version.hasSchemaChanges) {
    return {
      icon: <GitCompareIcon className={targetHistorySchemaVersionStyles.statusCompareIcon} />,
      label: labels.changed,
      state: 'Schema changed',
    };
  }
  if (version.isComposable) {
    return {
      icon: <CheckIcon className={targetHistorySchemaVersionStyles.statusPassedIcon} />,
      label: labels.succeeded,
      state: 'No changes',
    };
  }
  return {
    icon: <TriangleAlertIcon className={targetHistorySchemaVersionStyles.statusFailedIcon} />,
    label: labels.failed,
    state: 'Failed',
  };
}

function versionStatusIcon(version: VersionStatusFlags, labels: VersionStatusLabels) {
  const status = versionStatus(version, labels);
  return <StatusTooltip icon={status.icon} label={status.label} />;
}

/** A picker row's status: glyph and state in words, the reason on hover. */
function versionStatusTrailing(version: VersionStatusFlags, labels: VersionStatusLabels) {
  const status = versionStatus(version, labels);
  return (
    <StatusTooltip
      icon={
        <span className={targetHistorySchemaVersionStyles.statusTrailing}>
          {status.icon}
          {status.state}
        </span>
      }
      label={status.label}
    />
  );
}

const DEFAULT_GRAPH_LABELS: VersionStatusLabels = {
  changed: 'Main graph schema changed',
  succeeded: 'Composition succeeded.',
  failed: 'Composition failed.',
};

const CONTRACT_LABELS: VersionStatusLabels = {
  changed: 'Contract schema changed',
  succeeded: 'Contract composition succeeded.',
  failed: 'Contract composition failed.',
};

function GraphQLSchemaView(props: {
  title: string;
  subtitle: string;
  changes: Array<FragmentType<typeof FilterableSchemaChangeBlock_ChangesFragment>> | null;
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
    <span className={shared.row.gap1}>
      {props.fromName && (
        <>
          {props.fromName}
          <ArrowRightIcon className={targetHistorySchemaVersionStyles.serviceArrow} />
        </>
      )}
      {props.toName}
    </span>
  );

  return (
    <>
      <div className={targetHistorySchemaVersionStyles.header}>
        <SectionHeader title={props.title} subtitle={props.subtitle} />
        {props.previousSdl && <ViewModeToggle active={viewMode} onChange={setViewMode} />}
      </div>
      {viewMode === 'changes' && (
        <FilterableSchemaChangeBlock
          title={titleNode}
          changes={props.changes}
          hasPreviousVersion={props.previousSdl !== null}
        />
      )}
      {viewMode === 'diff' && (
        <GenericGraphCard
          title={titleNode}
          actions={
            <span className={targetHistorySchemaVersionStyles.sortHint}>
              Sorted by kind and name
            </span>
          }
        >
          {/* Fills the viewport below the tab strip and the two headers (11rem), as SdlPane does. */}
          <div className={targetHistorySchemaVersionStyles.sdl}>
            {(props.previousSdl ?? '') === props.currentSdl ? (
              <div className={targetHistorySchemaVersionStyles.sdlPadded}>
                <NoGraphChanges />
              </div>
            ) : (
              <SDLDiffView
                before={props.previousSdl ?? ''}
                after={props.currentSdl}
                sorted
                tooLargeMessage="Every change is listed under Changes. To browse the full schema, switch to View."
              />
            )}
          </div>
        </GenericGraphCard>
      )}
      {viewMode === 'raw' && props.currentSdl && (
        <GenericGraphCard
          title={<>{props.toName}</>}
          actions={
            <>
              <DownloadButton contents={props.currentSdl} fileName={props.toName + '.graphqls'} />
            </>
          }
        >
          <SDLView sdl={props.currentSdl} />
        </GenericGraphCard>
      )}
    </>
  );
}

function DownloadButton(props: { contents: string; fileName: string }) {
  return (
    <Tooltip
      trigger={
        <Button
          variant="ghost"
          size="compact"
          onClick={() => {
            const element = document.createElement('a');
            element.setAttribute(
              'href',
              'data:text/plain;charset=utf-8, ' + encodeURIComponent(props.contents),
            );
            element.setAttribute('download', props.fileName);
            document.body.appendChild(element);
            element.click();

            document.body.removeChild(element);
          }}
        >
          <DownloadIcon className={targetHistorySchemaVersionStyles.downloadIcon} /> Download
        </Button>
      }
      content={`Download ${props.fileName}`}
    />
  );
}

const FilterableSchemaChangeBlock_ChangesFragment = graphql(`
  fragment FilterableSchemaChangeBlock_ChangesFragment on SchemaChange {
    severityLevel
    ...ChangesBlock_SchemaChangeFragment
  }
`);

function FilterableSchemaChangeBlock(props: {
  title: ReactNode;
  changes: Array<FragmentType<typeof FilterableSchemaChangeBlock_ChangesFragment>> | null;
  hasPreviousVersion: boolean;
}) {
  const [selectedChangeType, setSelectedChangeType] = useState(null as SeverityLevelType | null);
  const changes = useFragment(FilterableSchemaChangeBlock_ChangesFragment, props.changes);

  const filteredChanges = useMemo(() => {
    if (selectedChangeType === null) {
      return changes;
    }

    return changes?.filter(change => change.severityLevel === selectedChangeType);
  }, [changes, selectedChangeType]);

  return (
    <div className={targetHistorySchemaVersionStyles.changes}>
      <ChangeTypeToggle selectedChangeType={selectedChangeType} onChange={setSelectedChangeType} />
      <GenericGraphCard title={props.title}>
        <div className={targetHistorySchemaVersionStyles.changesPadded}>
          {filteredChanges?.length ? (
            <div className={targetHistorySchemaVersionStyles.changesBody}>
              <ChangesBlock explorerLinks="version" changes={filteredChanges} />
            </div>
          ) : selectedChangeType !== null ? (
            <div className={targetHistorySchemaVersionStyles.changesEmpty}>
              No changes of this change type.
            </div>
          ) : props.hasPreviousVersion ? (
            <div className={targetHistorySchemaVersionStyles.changesPending}>
              <NoGraphChanges />
            </div>
          ) : (
            <div className={targetHistorySchemaVersionStyles.changesEmpty}>
              This is the initial version! No changes available.{' '}
            </div>
          )}
        </div>
      </GenericGraphCard>
    </div>
  );
}

const SchemaVersionSubgraphView__SubgraphDiffFragment = graphql(`
  fragment SchemaVersionSubgraphView__SubgraphDiffFragment on SubgraphDiff {
    ...SubgraphRow_SubgraphDiffFragment
    ... on SubgraphDiffAdded {
      subgraphVersion {
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
            severityLevel
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
  diff: FragmentType<typeof SubgraphRow_SubgraphDiffFragment>;
  renderChildren?: () => ReactNode;
  isInitiallyCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(props.isInitiallyCollapsed ?? false);
  return (
    <div className={targetHistorySchemaVersionStyles.card}>
      <SubgraphRow
        subgraphDiff={props.diff}
        className={targetHistorySchemaVersionStyles.cardHeaderRow}
      >
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setIsCollapsed(isCollapsed => !isCollapsed)}
        >
          {isCollapsed && <ChevronUpIcon />}
          {!isCollapsed && <ChevronDownIcon />}
        </Button>
      </SubgraphRow>
      {props.renderChildren && !isCollapsed && (
        <div className={targetHistorySchemaVersionStyles.cardBody}>{props.renderChildren()}</div>
      )}
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

  const Component = useMemo(
    () =>
      function Component(props: { children: ReactNode }) {
        return (
          <>
            <div className={targetHistorySchemaVersionStyles.header}>
              <SectionHeader
                title="Subgraphs"
                subtitle="Per-subgraph state and changes introduced by this version."
              />
              <ViewModeToggle active={viewMode} onChange={setViewMode} />
            </div>
            {props.children}
          </>
        );
      },
    [viewMode],
  );

  if (viewMode === 'changes') {
    return (
      <Component>
        <GraphVersionSubgraphChangesView subgraphDiffs={props.subgraphDiffs} />
      </Component>
    );
  }

  if (viewMode === 'diff') {
    return (
      <Component>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffChanged') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={
                  diff.previousSubgraphVersion.sdl === diff.subgraphVersion.sdl
                    ? () => (
                        <p className={targetHistorySchemaVersionStyles.subgraphNote}>
                          The SDL did not change. This can happen if only the service url has
                          changed or the subgraph was manually published or force published to
                          multiple targets instead of being promoted.
                        </p>
                      )
                    : () => (
                        <SDLDiffView
                          before={diff.previousSubgraphVersion.sdl}
                          after={diff.subgraphVersion.sdl}
                        />
                      )
                }
              />
            );
          }

          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={() => <SDLDiffView before="" after={diff.subgraphVersion.sdl} />}
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
      </Component>
    );
  }

  if (viewMode === 'raw') {
    return (
      <Component>
        {subgraphDiffs.map(diff => {
          if (diff.__typename === 'SubgraphDiffAdded') {
            return (
              <SubgraphCard
                key={diff.__typename + diff.subgraphVersion.id}
                diff={diff}
                renderChildren={() => <SDLView sdl={diff.subgraphVersion.sdl} />}
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
      </Component>
    );
  }

  viewMode satisfies never;
  return null;
}

function GraphVersionSubgraphChangesView(props: {
  subgraphDiffs: Array<FragmentType<typeof SchemaVersionSubgraphView__SubgraphDiffFragment>>;
}) {
  const [selectedChangeType, setSelectedChangeType] = useState(null as SeverityLevelType | null);
  const subgraphDiffs = useFragment(
    SchemaVersionSubgraphView__SubgraphDiffFragment,
    props.subgraphDiffs,
  );

  const nodes = useMemo(
    () =>
      subgraphDiffs.map(diff => {
        if (diff.__typename === 'SubgraphDiffChanged') {
          const edges =
            selectedChangeType === null
              ? diff.changes?.edges
              : diff.changes?.edges.filter(edge => edge.node.severityLevel === selectedChangeType);
          return (
            <SubgraphCard
              key={diff.__typename + diff.subgraphVersion.id}
              diff={diff}
              renderChildren={() => (
                <div className={targetHistorySchemaVersionStyles.changesPadded}>
                  {edges?.length ? (
                    <div className={targetHistorySchemaVersionStyles.subgraphChanges}>
                      <ChangesBlock
                        explorerLinks="version"
                        changes={edges?.map(edge => edge.node) ?? []}
                      />
                    </div>
                  ) : selectedChangeType === null ? (
                    <div className={targetHistorySchemaVersionStyles.subgraphChangesEmpty}>
                      No changes available.
                    </div>
                  ) : (
                    <div className={targetHistorySchemaVersionStyles.subgraphChangesEmpty}>
                      No Changes available for this type.
                    </div>
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
                <div className={targetHistorySchemaVersionStyles.subgraphChangesNote}>
                  Subgraph removed in this version. Its types are no longer part of the supergraph.
                </div>
              )}
            />
          );
        }

        if (diff.__typename === 'SubgraphDiffAdded') {
          return (
            <SubgraphCard
              key={diff.__typename + diff.subgraphVersion.id}
              diff={diff}
              renderChildren={() => (
                <div className={targetHistorySchemaVersionStyles.subgraphChangesNote}>
                  New subgraph introduced in this version. No prior schema to diff against.
                </div>
              )}
            />
          );
        }

        return null;
      }),
    [selectedChangeType, subgraphDiffs],
  );

  return (
    <div className={targetHistorySchemaVersionStyles.changes}>
      <ChangeTypeToggle selectedChangeType={selectedChangeType} onChange={setSelectedChangeType} />
      <div className={targetHistorySchemaVersionStyles.subgraphChangesList}>
        {nodes.some(node => node !== null) ? nodes : <>No Changes</>}
      </div>
    </div>
  );
}

export function SDLDiffView(props: {
  before: string;
  after: string;
  /** Compare sorted copies, for composed schemas whose definition order carries no meaning. */
  sorted?: boolean;
  /** What to read instead when the diff is too large to show: where the changes and the schema are. */
  tooLargeMessage?: ReactNode;
}) {
  const result = useSdlDiff(props.before, props.after, props.sorted ?? false);

  if (result === null) {
    return (
      <div className={targetHistorySchemaVersionStyles.diffMessage}>
        <Spinner variants={{ size: 'sm' }} label="Preparing diff" />
        Preparing diff…
      </div>
    );
  }

  switch (result.kind) {
    case 'unchanged':
      return <SDLView sdl={props.after} />;
    case 'order-only':
      return (
        <>
          <SDLDiffNotice
            icon={<CircleCheckIcon className={targetHistorySchemaVersionStyles.checkIcon} />}
            title="No changes apart from order"
          >
            Both schemas have the same definitions. Only their order or formatting differs.
          </SDLDiffNotice>
          <SDLView sdl={props.after} />
        </>
      );
    case 'too-large':
      return (
        <SDLDiffNotice
          icon={<InfoIcon className={targetHistorySchemaVersionStyles.infoIcon} />}
          title="Diff too large to display"
        >
          {props.tooLargeMessage ?? 'The schemas differ in too many lines to compare here.'}
        </SDLDiffNotice>
      );
    case 'diff':
      return (
        <CodeScrollArea>
          <FileDiff
            fileDiff={result.fileDiff}
            options={{
              disableFileHeader: true,
              diffStyle: 'unified',
            }}
          />
        </CodeScrollArea>
      );
  }
}

function SDLDiffNotice(props: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={targetHistorySchemaVersionStyles.diffNotice}>
      <div className={targetHistorySchemaVersionStyles.diffNoticeHeader}>
        {props.icon}
        <h2 className={targetHistorySchemaVersionStyles.diffNoticeTitle}>{props.title}</h2>
      </div>
      <p className={targetHistorySchemaVersionStyles.noticeText}>{props.children}</p>
    </div>
  );
}

export function SDLView(props: { sdl: string }) {
  return (
    <CodeScrollArea>
      <div className={targetHistorySchemaVersionStyles.sdlView}>
        <File
          file={{
            name: 'schema.graphql',
            contents: props.sdl,
          }}
          options={{
            disableFileHeader: true,
          }}
        />
      </div>
    </CodeScrollArea>
  );
}

function FirstComposableGraphVersion() {
  return (
    <div className={targetHistorySchemaVersionStyles.notice}>
      <div className={targetHistorySchemaVersionStyles.noticeHeader}>
        <CircleCheckIcon className={targetHistorySchemaVersionStyles.checkIcon} />
        <h2 className={targetHistorySchemaVersionStyles.noticeTitle}>First composable graph</h2>
      </div>
      <p className={targetHistorySchemaVersionStyles.noticeText}>
        Congratulations! This is the first version of the graph that is composable.
      </p>
    </div>
  );
}

function NoGraphChanges() {
  return (
    <div className={targetHistorySchemaVersionStyles.notice}>
      <div className={targetHistorySchemaVersionStyles.noticeHeader}>
        <CircleCheckIcon className={targetHistorySchemaVersionStyles.checkIcon} />
        <h2 className={targetHistorySchemaVersionStyles.noticeTitle}>No Graph Changes</h2>
      </div>
      <p className={targetHistorySchemaVersionStyles.noticeText}>
        There are no public facing changes in the graph.
      </p>
    </div>
  );
}

const SchemaVersionHeader_SchemaVersionFragment = graphql(`
  fragment SchemaVersionHeader_SchemaVersionFragment on SchemaVersion {
    id
    isValid
    origin {
      ... on SchemaVersionPublishOrigin {
        revision
        publishedSubgraphs {
          name
          versionId
          revision
        }
      }
      ... on SchemaVersionPromoteOrigin {
        ...SchemaVersionPromotionOriginContents_SchemaVersionPromoteOriginFragment
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

const SchemaVersionPromotionOriginContents_SchemaVersionPromoteOriginFragment = graphql(`
  fragment SchemaVersionPromotionOriginContents_SchemaVersionPromoteOriginFragment on SchemaVersionPromoteOrigin {
    schemaVersionId
    targetId
    targetSlug
  }
`);

function SchemaVersionPromotionOriginContents(props: {
  origin: FragmentType<
    typeof SchemaVersionPromotionOriginContents_SchemaVersionPromoteOriginFragment
  >;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const origin = useFragment(
    SchemaVersionPromotionOriginContents_SchemaVersionPromoteOriginFragment,
    props.origin,
  );
  const displayName = (
    <>
      {origin.targetSlug}@{origin.schemaVersionId.substring(0, 8)}
    </>
  );

  return (
    <>
      <span className={targetHistorySchemaVersionStyles.inlineMeta}>
        <GitCommit className={targetHistorySchemaVersionStyles.commitIcon} />
        {origin.targetSlug === targetSlug ? (
          <Link
            className={targetHistorySchemaVersionStyles.commitLink}
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{
              organizationSlug,
              projectSlug,
              targetSlug: origin.targetSlug,
              versionId: origin.schemaVersionId,
            }}
          >
            {origin.targetSlug}@{origin.schemaVersionId.substring(0, 8)}
          </Link>
        ) : (
          <span>{displayName}</span>
        )}
      </span>
      <div>via Graph Version Promotion</div>
    </>
  );
}

function SchemaVersionHeader(props: {
  schemaVersion: FragmentType<typeof SchemaVersionHeader_SchemaVersionFragment>;
}) {
  const schemaVersion = useFragment(SchemaVersionHeader_SchemaVersionFragment, props.schemaVersion);

  const origin = (
    <>
      {schemaVersion.origin.__typename === 'SchemaVersionPromoteOrigin' && (
        <SchemaVersionPromotionOriginContents origin={schemaVersion.origin} />
      )}
      {schemaVersion.origin.__typename === 'SchemaVersionPublishOrigin' && (
        <>
          {schemaVersion.origin.publishedSubgraphs?.map(subgraph => (
            <span
              className={targetHistorySchemaVersionStyles.inlineMeta}
              key={subgraph.name + '|' + subgraph.versionId}
            >
              <GitCommit className={targetHistorySchemaVersionStyles.commitIcon} />
              <CopyChip
                value={subgraph.versionId}
                label={`${subgraph.name}@${subgraph.revision ?? subgraph.versionId.substring(0, 8)}`}
              />
            </span>
          ))}
          <div>
            {schemaVersion.origin.publishedSubgraphs?.length ? (
              <>via Subgraph Publish</>
            ) : (
              <>Schema Publish</>
            )}
          </div>
        </>
      )}
      {schemaVersion.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
        <>
          {schemaVersion.origin.removedSubgraphs.map(subgraph => (
            <span
              className={targetHistorySchemaVersionStyles.inlineMeta}
              key={subgraph.name + '|' + subgraph.versionId}
            >
              <GitCommit className={targetHistorySchemaVersionStyles.commitIcon} />
              <CopyChip
                value={subgraph.versionId}
                label={`${subgraph.name}@${subgraph.versionId.substring(0, 8)}`}
              />
            </span>
          ))}
          <div>via Subgraph Delete</div>
        </>
      )}
    </>
  );

  const sourceControl = schemaVersion.githubMetadata ? (
    <span className={targetHistorySchemaVersionStyles.commitMeta}>
      <GitCommit className={targetHistorySchemaVersionStyles.commitIcon} />
      <CopyChip
        value={schemaVersion.githubMetadata.commit}
        label={schemaVersion.githubMetadata.commit.slice(0, 7)}
      />
      <span className={targetHistorySchemaVersionStyles.branch}>
        <GitBranch className={targetHistorySchemaVersionStyles.branchIcon} />
        {schemaVersion.githubMetadata.repository}
      </span>
    </span>
  ) : schemaVersion.meta?.commit ? (
    <span className={targetHistorySchemaVersionStyles.inlineMeta}>
      <GitCommit className={targetHistorySchemaVersionStyles.commitIcon} />
      <CopyChip value={schemaVersion.meta.commit} label={schemaVersion.meta.commit.slice(0, 7)} />
    </span>
  ) : null;

  return (
    <header>
      <div className={targetHistorySchemaVersionStyles.title}>
        <h1 className={targetHistorySchemaVersionStyles.titleText}>Graph Version</h1>
        <CopyChip
          value={schemaVersion.id}
          label={
            schemaVersion.origin.__typename === 'SchemaVersionPublishOrigin' &&
            schemaVersion.origin.revision
              ? schemaVersion.origin.revision
              : schemaVersion.id.slice(0, 8)
          }
        />
      </div>
      <p className={targetHistorySchemaVersionStyles.titleDescription}>
        Detailed view of the graph version changes.
      </p>
      <div className={targetHistorySchemaVersionStyles.meta}>
        <DescriptionList
          variants={{ termStyle: 'title', columns: 'auto' }}
          rows={[
            {
              items: [
                {
                  term: 'Status',
                  description: (
                    <span className={targetHistorySchemaVersionStyles.inlineMeta}>
                      <StatusDot color={schemaVersion.isValid ? 'success' : 'critical'} />
                      {schemaVersion.isValid ? 'Composable' : 'Failed'}
                    </span>
                  ),
                },
                { term: 'Origin', description: origin },
                ...(sourceControl ? [{ term: 'Source Control', description: sourceControl }] : []),
                {
                  term: 'Created at',
                  description: (
                    <>
                      <span className={targetHistorySchemaVersionStyles.inlineMeta}>
                        <Clock className={targetHistorySchemaVersionStyles.metaIcon} />
                        <TimeAgo date={schemaVersion.date} />
                      </span>
                      {schemaVersion.meta?.author && (
                        <span className={targetHistorySchemaVersionStyles.metaValue}>
                          by {schemaVersion.meta.author}
                        </span>
                      )}
                    </>
                  ),
                },
              ],
            },
          ]}
        />
      </div>
    </header>
  );
}

type SchemaViewMode = 'changes' | 'diff' | 'raw';

const schemaViewModes: { id: SchemaViewMode; label: string; Icon: typeof ListTree }[] = [
  { id: 'changes', label: 'Changes', Icon: ListTree },
  { id: 'diff', label: 'Diff', Icon: GitCompare },
  { id: 'raw', label: 'View', Icon: FileIcon },
];

function ViewModeToggle(props: { active: SchemaViewMode; onChange: (m: SchemaViewMode) => void }) {
  return (
    <div className={targetHistorySchemaVersionStyles.toggle}>
      {schemaViewModes.map(m => {
        const isActive = m.id === props.active;
        const Icon = m.Icon;
        return (
          <button
            key={m.id}
            onClick={() => props.onChange(m.id)}
            className={targetHistorySchemaVersionStyles.viewModeButton({ active: isActive })}
          >
            <Icon className={targetHistorySchemaVersionStyles.toggleIcon} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

const breakingChangeTypeModes: { id: SeverityLevelType; label: string; dotColor: string }[] = [
  {
    id: SeverityLevelType.Breaking,
    label: 'Breaking',
    dotColor: targetHistorySchemaVersionStyles.severityDot.breaking,
  },
  {
    id: SeverityLevelType.Dangerous,
    label: 'Dangerous',
    dotColor: targetHistorySchemaVersionStyles.severityDot.dangerous,
  },
  {
    id: SeverityLevelType.Safe,
    label: 'Safe',
    dotColor: targetHistorySchemaVersionStyles.severityDot.safe,
  },
];

function ChangeTypeToggle(props: {
  selectedChangeType: SeverityLevelType | null;
  onChange: (selectedChangeType: SeverityLevelType | null) => void;
}) {
  return (
    <div className={targetHistorySchemaVersionStyles.toggle}>
      <button
        onClick={() => props.onChange(null)}
        className={targetHistorySchemaVersionStyles.changeTypeButton({
          active: props.selectedChangeType === null,
        })}
      >
        <span
          className={cn(
            targetHistorySchemaVersionStyles.changeTypeDot,
            targetHistorySchemaVersionStyles.severityDot.all,
          )}
        />
        All
      </button>
      {breakingChangeTypeModes.map(m => {
        const isActive = m.id === props.selectedChangeType;
        return (
          <button
            key={m.id}
            onClick={() => props.onChange(m.id)}
            className={targetHistorySchemaVersionStyles.changeTypeButton({ active: isActive })}
          >
            <span className={cn(targetHistorySchemaVersionStyles.changeTypeDot, m.dotColor)} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

const SchemaVersionSummary_SchemaVersionFragment = graphql(`
  fragment SchemaVersionSummary_SchemaVersionFragment on SchemaVersion {
    id
    isComposable
    subgraphDiffs {
      ...SubgraphRow_SubgraphDiffFragment
      ... on SubgraphDiffAdded {
        subgraphVersion {
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
          isUsageTracked
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
          isUsageTracked
        }
      }
    }
  }
`);

function SectionHeader(props: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className={targetHistorySchemaVersionStyles.sectionTitle}>{props.title}</h2>
      <p className={targetHistorySchemaVersionStyles.sectionSubtitle}>{props.subtitle}</p>
    </div>
  );
}

export const SchemaVersionSummary = (props: {
  schemaVersion: FragmentType<typeof SchemaVersionSummary_SchemaVersionFragment>;
  contractVersion: null | FragmentType<typeof SchemaVersionSummary_ContractVersionFragment>;
}) => {
  const schemaVersion = useFragment(
    SchemaVersionSummary_SchemaVersionFragment,
    props.schemaVersion,
  );
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

    for (const diff of schemaVersion.subgraphDiffs ?? []) {
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
  }, [schemaVersion.subgraphDiffs]);

  const publicChangeStats = useMemo(
    () =>
      changeSafetyStats(
        (contractVersion ?? schemaVersion).sdlChanges?.edges.map(edge => edge.node) ?? [],
      ),
    [schemaVersion.sdlChanges, contractVersion?.sdlChanges],
  );

  return (
    <div className={shared.stack.gap6}>
      <SectionHeader title="Summary" subtitle="Changes introduced by this version." />
      <div className={targetHistorySchemaVersionStyles.stats}>
        <Stat label="Schema changes" value={publicChangeStats.totalChanges} />
        <Stat
          label="Breaking changes"
          value={publicChangeStats.breakingChanges}
          additionalValue={
            publicChangeStats.breakingChanges && schemaVersion.isComposable ? (
              publicChangeStats.notSafe ? (
                <Tooltip
                  trigger={
                    <span className={targetHistorySchemaVersionStyles.statBreaking}>
                      <ShieldAlertIcon
                        size="14"
                        className={targetHistorySchemaVersionStyles.statInlineIcon}
                      />
                      {publicChangeStats.notSafe} not safe
                    </span>
                  }
                  content="Some changes are in use, or usage isn't recorded for what they touch."
                />
              ) : (
                <Tooltip
                  trigger={
                    <span className={targetHistorySchemaVersionStyles.statSafe}>
                      <CheckIcon
                        size="14"
                        className={targetHistorySchemaVersionStyles.statInlineIcon}
                      />{' '}
                      All safe
                    </span>
                  }
                  content="All these changes are safe based on usage reporting data."
                />
              )
            ) : null
          }
        />
        <Stat label="Total Subgraphs" value={subgraphStats.total} />
        <Stat
          label="Added subgraphs"
          value={subgraphStats.added}
          className={targetHistorySchemaVersionStyles.statWide}
        />
        <Stat
          label="Removed Subgraphs "
          value={subgraphStats.removed}
          className={targetHistorySchemaVersionStyles.statWide}
        />
        <Stat
          label="Updated Subgraphs "
          value={subgraphStats.updated}
          className={targetHistorySchemaVersionStyles.statWide}
        />
      </div>

      {schemaVersion.subgraphDiffs && (
        <div className={targetHistorySchemaVersionStyles.subgraphs}>
          <div className={targetHistorySchemaVersionStyles.subgraphsHeader}>
            <div className={targetHistorySchemaVersionStyles.subgraphsTitle}>Subgraph Overview</div>
          </div>
          <ul className={targetHistorySchemaVersionStyles.subgraphsList}>
            {schemaVersion.subgraphDiffs
              .sort(diff => (diff.__typename === 'SubgraphDiffUnchanged' ? 1 : -1))
              .map((diff, index) => (
                <li
                  className={targetHistorySchemaVersionStyles.subgraphDiff({
                    unchanged: diff.__typename === 'SubgraphDiffUnchanged',
                  })}
                  key={`${schemaVersion.id}_${index}`}
                >
                  <SubgraphRow subgraphDiff={diff} />
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const Stat = (props: {
  label: string;
  value: number;
  additionalValue?: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(targetHistorySchemaVersionStyles.stat, props.className)}>
      <span className={targetHistorySchemaVersionStyles.statLabel}>{props.label}</span>
      <span>
        <span className={targetHistorySchemaVersionStyles.statValue}>
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
    ...targetHistorySchemaVersionStyles.kind.added,
  },
  SubgraphDiffRemoved: {
    label: 'Removed',
    Icon: Minus,
    ...targetHistorySchemaVersionStyles.kind.removed,
  },
  SubgraphDiffChanged: {
    label: 'Updated',
    Icon: GitCompareArrows,
    ...targetHistorySchemaVersionStyles.kind.changed,
  },
  SubgraphDiffUnchanged: {
    label: 'Unchanged',
    Icon: CircleIcon,
    ...targetHistorySchemaVersionStyles.kind.unchanged,
  },
} as const;

const SubgraphRow_SubgraphDiffFragment = graphql(`
  fragment SubgraphRow_SubgraphDiffFragment on SubgraphDiff {
    ... on SubgraphDiffAdded {
      subgraphVersion {
        serviceName
        id
        revision
        url
      }
    }
    ... on SubgraphDiffRemoved {
      removedSubgraphVersion {
        serviceName
        id
        revision
        url
      }
    }
    ... on SubgraphDiffChanged {
      subgraphVersion {
        serviceName
        id
        revision
        url
      }
      previousSubgraphVersion {
        id
        revision
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
        revision
        serviceName
        url
      }
    }
  }
`);

function SubgraphRow(props: {
  subgraphDiff: FragmentType<typeof SubgraphRow_SubgraphDiffFragment>;
  children?: ReactNode;
  className?: string;
}) {
  const subgraphDiff = useFragment(SubgraphRow_SubgraphDiffFragment, props.subgraphDiff);

  const meta = kindMeta[subgraphDiff.__typename];
  const Icon = meta.Icon;

  return (
    <div className={cn(targetHistorySchemaVersionStyles.subgraph, props.className)}>
      <span className={cn(targetHistorySchemaVersionStyles.subgraphIcon, meta.bg)}>
        <Icon className={cn(targetHistorySchemaVersionStyles.subgraphIconGlyph, meta.text)} />
      </span>

      <div className={targetHistorySchemaVersionStyles.subgraphBody}>
        <div className={targetHistorySchemaVersionStyles.subgraphTitle}>
          {subgraphDiff.__typename === 'SubgraphDiffUnchanged' && (
            <code className={targetHistorySchemaVersionStyles.subgraphName}>
              {subgraphDiff.subgraphVersion.serviceName}@
              {subgraphDiff.subgraphVersion.revision ??
                subgraphDiff.subgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffAdded' && (
            <code className={targetHistorySchemaVersionStyles.subgraphName}>
              {subgraphDiff.subgraphVersion.serviceName}@
              {subgraphDiff.subgraphVersion.revision ??
                subgraphDiff.subgraphVersion.id.substring(0, 8)}
            </code>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffChanged' && (
            <>
              <code className={targetHistorySchemaVersionStyles.subgraphName}>
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.previousSubgraphVersion.revision ??
                  subgraphDiff.previousSubgraphVersion.id.substring(0, 8)}
              </code>
              <ArrowRight className={targetHistorySchemaVersionStyles.subgraphArrow} />
              <code className={targetHistorySchemaVersionStyles.subgraphName}>
                {subgraphDiff.subgraphVersion.serviceName}@
                {subgraphDiff.subgraphVersion.revision ??
                  subgraphDiff.subgraphVersion.id.substring(0, 8)}
              </code>
            </>
          )}
          {subgraphDiff.__typename === 'SubgraphDiffRemoved' && (
            <code className={targetHistorySchemaVersionStyles.subgraphName}>
              {subgraphDiff.removedSubgraphVersion.serviceName}@
              {subgraphDiff.removedSubgraphVersion.revision ??
                subgraphDiff.removedSubgraphVersion.id.substring(0, 8)}
            </code>
          )}
        </div>
        {subgraphDiff.__typename === 'SubgraphDiffUnchanged' && (
          <SubgraphLink url={subgraphDiff.subgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffAdded' && (
          <SubgraphLink url={subgraphDiff.subgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffChanged' && (
          <SubgraphLink url={subgraphDiff.subgraphVersion.url} />
        )}
        {subgraphDiff.__typename === 'SubgraphDiffRemoved' && (
          <SubgraphLink url={subgraphDiff.removedSubgraphVersion.url} />
        )}
      </div>

      <span className={cn(targetHistorySchemaVersionStyles.subgraphKind, meta.text)}>
        {subgraphDiff.__typename === 'SubgraphDiffChanged' && subgraphDiff.changes && (
          <span className={targetHistorySchemaVersionStyles.subgraphKindLabel}>
            {subgraphDiff.changes.edges.length} change
            {subgraphDiff.changes.edges.length === 1 ? null : 's'}
          </span>
        )}
        <span className={cn(targetHistorySchemaVersionStyles.subgraphKindDot, meta.dot)} />
        <span className={shared.weight.medium}>{meta.label}</span>
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
      className={targetHistorySchemaVersionStyles.subgraphLink}
    >
      {props.url}
      <ExternalLink className={targetHistorySchemaVersionStyles.subgraphLinkIcon} />
    </a>
  );
}

function GenericGraphCard(props: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={targetHistorySchemaVersionStyles.card}>
      <div className={targetHistorySchemaVersionStyles.graphCardHeader}>
        <span
          className={cn(
            targetHistorySchemaVersionStyles.subgraphIcon,
            targetHistorySchemaVersionStyles.kind.unchanged.bg,
          )}
        >
          <BoxIcon className={targetHistorySchemaVersionStyles.subgraphIconGlyph} />
        </span>
        <div className={targetHistorySchemaVersionStyles.graphCardBody}>
          <div className={targetHistorySchemaVersionStyles.graphCardTitle}>
            <code className={targetHistorySchemaVersionStyles.subgraphName}>{props.title}</code>
          </div>
        </div>
        {props.actions ? <>{props.actions}</> : null}
      </div>
      {props.children && (
        <div className={targetHistorySchemaVersionStyles.cardBody}>{props.children}</div>
      )}
    </div>
  );
}
