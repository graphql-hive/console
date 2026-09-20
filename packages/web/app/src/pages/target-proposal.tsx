import { GraphQLIcon } from '@/components/ui/brand-icon';
import { useMemo } from 'react';
import { buildASTSchema, buildSchema, GraphQLSchema, parse } from 'graphql';
import { ChartPie, CheckIcon, FileDiffIcon, List, PencilIcon, XIcon } from 'lucide-react';
import { useMutation, useQuery } from 'urql';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import {
  SecondaryNavigation,
  type SecondaryNavigationItem,
} from '@/components/base/navigation/secondary-navigation/secondary-navigation';
import { Page, TargetLayout } from '@/components/layouts/target';
import { CompositionErrorsSection_SchemaErrorConnection } from '@/components/target/history/errors-and-changes';
import {
  Proposal_ChangeFragment,
  Proposal_ReviewsFragment,
  toUpperSnakeCase,
} from '@/components/target/proposals';
import { SaveProposalProvider } from '@/components/target/proposals/save-proposal-modal';
import { StageTransitionSelect } from '@/components/target/proposals/stage-transition-select';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { addTypeForExtensions } from '@/lib/proposals/utils';
import { Change } from '@graphql-inspector/core';
import { errors, patchSchema } from '@graphql-inspector/patch';
import { NoopError, ValueMismatchError } from '@graphql-inspector/patch/errors';
import { Link } from '@tanstack/react-router';
import {
  ProposalOverview_ChecksFragment,
  TargetProposalChecksPage,
} from './target-proposal-checks';
import { TargetProposalDetailsPage } from './target-proposal-details';
import {
  Proposals_EditProposalMeFragment,
  Proposals_EditProposalProposalFragment,
  Proposals_EditProposalTargetFragment,
  TargetProposalEditPage,
} from './target-proposal-edit';
import { TargetProposalSchemaPage } from './target-proposal-schema';
import { TargetProposalSupergraphPage } from './target-proposal-supergraph';
import { ServiceProposalDetails } from './target-proposal-types';

enum Tab {
  SCHEMA = 'schema',
  SUPERGRAPH = 'supergraph',
  DETAILS = 'details',
  CHECKS = 'checks',
  EDIT = 'edit',
}

const ProposalQuery = graphql(/* GraphQL  */ `
  query ProposalQuery(
    $id: ID!
    $projectRef: ProjectReferenceInput!
    $targetRef: TargetReferenceInput!
    $version: String
  ) {
    me {
      id
      displayName
      ...Proposals_EditProposalMeFragment
    }
    project(reference: $projectRef) {
      id
      type
    }
    target(reference: $targetRef) {
      ...Proposals_EditProposalTargetFragment
    }
    schemaProposal(input: { id: $id }) {
      id
      author
      createdAt
      stage
      title
      description
      compositionStatus
      compositionTimestamp
      compositionStatusReason
      checks(after: $version, input: {}) {
        ...ProposalOverview_ChecksFragment
      }
      reviews {
        ...Proposal_ReviewsFragment
      }
      ...Proposals_EditProposalProposalFragment
    }
    latestValidVersion(target: $targetRef) {
      id
      # sdl
      schemas {
        edges {
          node {
            ... on CompositeSchema {
              id
              source
              service
            }
            ... on SingleSchema {
              id
              source
            }
          }
        }
      }
    }
  }
`);

const ProposalChangesQuery = graphql(/* GraphQL */ `
  query ProposalChanges($id: ID!, $v: String) {
    schemaProposal(input: { id: $id }) {
      id
      checks(after: $v, input: { latestPerService: true }) {
        edges {
          node {
            id
            # ... on FailedSchemaCheck {
            #   compositionErrors {
            #     ...CompositionErrorsSection_SchemaErrorConnection
            #   }
            # }
            schemaSDL
            serviceName
            schemaChanges: schemaProposalChanges {
              edges {
                node {
                  ...Proposal_ChangeFragment
                }
              }
            }
          }
        }
      }
    }
  }
`);

const ReviewSchemaProposalMutation = graphql(/* GraphQL */ `
  mutation ReviewSchemaProposalMutation($input: ReviewSchemaProposalInput!) {
    reviewSchemaProposal(input: $input) {
      ok {
        __typename
      }
      error {
        message
      }
    }
  }
`);

export function TargetProposalsSinglePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  tab?: string;
  version?: string;
  timestamp?: number;
}) {
  return (
    <>
      <Meta title="Schema proposals" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Proposals}
        className="h-(--content-height) flex min-h-[300px] flex-col pb-0"
      >
        <ProposalsContent {...props} />
      </TargetLayout>
    </>
  );
}

const ProposalsContent = (props: Parameters<typeof TargetProposalsSinglePage>[0]) => {
  // fetch main page details
  const [query, refreshProposal] = useQuery({
    query: ProposalQuery,
    variables: {
      projectRef: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
        },
      },
      targetRef: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
      id: props.proposalId,
      version: props.version,
      // pass the timestamp to force a refresh when proposals are updated
      timestamp: props.timestamp,
    },
    requestPolicy: 'cache-and-network',
  });

  // fetch all proposed changes for the selected version
  const [changesQuery] = useQuery({
    query: ProposalChangesQuery,
    variables: {
      id: props.proposalId,
      v: props.version,
      // pass the timestamp to force a refresh when proposals are updated
      timestamp: props.timestamp,

      // @todo deal with pagination
    },
    // don't cache this because caching can make it behave strangely --
    // by giving it only partial results
    requestPolicy: 'network-only',
  });

  const [_, reviewSchemaProposal] = useMutation(ReviewSchemaProposalMutation);

  const projectType = query.data?.project?.type;
  const isDistributedGraph =
    projectType === ProjectType.Federation || projectType === ProjectType.Stitching;

  // This does a lot of heavy lifting to avoid having to reapply patching etc on each tab...
  // Takes all the data provided by the queries to apply the patch to the schema and
  // categorize changes.
  const services = useMemo(() => {
    if (changesQuery.fetching || query.fetching) {
      return [];
    }
    return (
      changesQuery.data?.schemaProposal?.checks?.edges?.map(
        ({ node: proposalVersion }): ServiceProposalDetails => {
          let compositionErrors:
            | FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>
            | undefined;
          // if (proposalVersion.__typename === 'FailedSchemaCheck') {
          //   compositionErrors = proposalVersion.compositionErrors ?? undefined;
          // }

          const existingSchema = query.data?.latestValidVersion?.schemas.edges.find(
            ({ node: latestSchema }) =>
              (latestSchema.__typename === 'CompositeSchema' &&
                latestSchema.service === proposalVersion.serviceName) ||
              latestSchema.__typename === 'SingleSchema' /* &&
                (proposalVersion.serviceName == null || proposalVersion.serviceName === '') */,
          )?.node.source;

          let beforeSchema: GraphQLSchema | null = null;
          if (existingSchema?.length) {
            const ast = addTypeForExtensions(parse(existingSchema));
            beforeSchema = buildASTSchema(ast, { assumeValid: true, assumeValidSDL: true });
          }

          // @todo better handle pagination
          const allChanges =
            proposalVersion.schemaChanges?.edges
              .filter(c => !!c)
              ?.map(({ node: change }): Change<any> => {
                // @todo don't useFragment here...
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const c = useFragment(Proposal_ChangeFragment, change);
                return {
                  criticality: {
                    // isSafeBasedOnUsage: ,
                    // reason: ,
                    level: c.severityLevel as any,
                  },
                  message: c.message,
                  meta: c.meta,
                  type: (c.meta && toUpperSnakeCase(c.meta?.__typename)) ?? '', // convert to upper snake
                  path: c.path?.join('.'),
                };
              }) ?? [];

          const conflictingChanges: Array<{ change: Change; error: Error }> = [];
          const ignoredChanges: Array<{ change: Change; error: Error }> = [];
          let buildError: Error | null = null;
          let afterSchema: GraphQLSchema | null = null;
          if (beforeSchema) {
            afterSchema = patchSchema(beforeSchema, allChanges, {
              onError(error, change) {
                if (error instanceof NoopError) {
                  ignoredChanges.push({ change, error });
                } else if (!(error instanceof ValueMismatchError)) {
                  // totally ignore value mismatches
                  conflictingChanges.push({ change, error });
                }
                return errors.looseErrorHandler(error, change);
              },
            });
          } else {
            try {
              afterSchema = buildSchema(proposalVersion.schemaSDL, {
                assumeValid: true,
                assumeValidSDL: true,
              });
            } catch (e: unknown) {
              console.error(e);
              buildError = e as Error;
            }
          }

          return {
            beforeSchema,
            afterSchema,
            buildError,
            allChanges,
            rawChanges: proposalVersion.schemaChanges?.edges.map(({ node }) => node) ?? [],
            conflictingChanges,
            ignoredChanges,
            serviceName: proposalVersion.serviceName ?? '',
            compositionErrors,
          };
        },
      ) ?? []
    );
  }, [
    // @todo handle pagination
    changesQuery.data?.schemaProposal?.checks?.edges,
    query.data?.latestValidVersion?.schemas.edges,
    changesQuery.fetching,
    query.fetching,
  ]);
  const proposal = query.data?.schemaProposal;

  const ChangesBody = useMemo(() => {
    if (changesQuery.fetching) {
      return <Spinner />;
    }

    if (changesQuery.error) {
      return (
        <>
          <Title className="text-center">Unexpected Error</Title>
          <Subtitle className="text-center">
            An unexpected error occurred when requesting the schema proposal.
            <br />
            We've been notified of this issue. Try again later.
          </Subtitle>
        </>
      );
    }

    if (!services.length) {
      return (
        <>
          <Title className="text-center">No changes found</Title>
          <Subtitle className="text-center">
            This proposed version would result in no changes to the latest schemas.
          </Subtitle>
        </>
      );
    }
    if (!proposal || !query.data?.target) {
      return (
        <>
          <Title className="text-center">Error loading data</Title>
          <Subtitle className="text-center">Proposal details could not be loaded.</Subtitle>
        </>
      );
    }
    return (
      <TabbedContent
        {...props}
        page={props.tab}
        services={services ?? []}
        reviews={proposal.reviews ?? {}}
        checks={proposal.checks ?? null}
        isDistributedGraph={isDistributedGraph}
        proposal={proposal}
        target={query.data.target}
        me={query.data.me}
      />
    );
  }, [
    services,
    props.tab,
    props.version,
    proposal?.reviews,
    proposal?.checks,
    changesQuery.error,
    changesQuery.fetching,
  ]);

  return (
    <>
      <div className="flex py-6">
        <div className="flex-1">
          <SubPageLayoutHeader
            subPageTitle={
              <span className="flex items-center">
                <Link
                  className="text-neutral-12"
                  to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                    targetSlug: props.targetSlug,
                  }}
                >
                  Schema Proposals
                </Link>{' '}
                <span className="text-neutral-10 inline-block px-2 italic">/</span>{' '}
                {/* @todo use query data to show loading */}
                {props.proposalId ? (
                  `${props.proposalId}`
                ) : (
                  <Skeleton className="inline-block h-5 w-[150px]" />
                )}
              </span>
            }
            description="Collaborate on schema changes to reduce friction during development."
          />
        </div>
      </div>
      <div className="bg-neutral-2/50 flex w-full grow flex-col rounded-sm p-4">
        {query.fetching ? (
          <Spinner />
        ) : (
          proposal && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                {/* <VersionSelect proposalId={props.proposalId} versions={proposal.versions ?? {}} /> */}
                <Title className="flex grow flex-row items-center gap-2 truncate">
                  <div className="truncate">{proposal.title}</div>
                  <Tooltip
                    align="start"
                    maxWidth="lg"
                    trigger={
                      <span className="inline-flex">
                        {proposal?.compositionStatus === 'ERROR' ? (
                          <XIcon className="text-red-600" />
                        ) : null}
                        {proposal?.compositionStatus === 'SUCCESS' ? (
                          <CheckIcon className="text-emerald-500" />
                        ) : null}
                      </span>
                    }
                    content={
                      <>
                        {proposal?.compositionStatus === 'ERROR' ? (
                          <>
                            Composition Error{' '}
                            {proposal.compositionTimestamp ? (
                              <>
                                (<TimeAgo date={proposal.compositionTimestamp} />)
                              </>
                            ) : null}
                            {proposal.compositionStatusReason
                              ?.split('\n')
                              .map((e, i) => <div key={i}>- {e}</div>) ?? 'Unknown cause.'}{' '}
                          </>
                        ) : null}
                        {proposal?.compositionStatus === 'SUCCESS' ? 'Composes Successfully' : null}
                      </>
                    }
                  />
                </Title>
                <div className="flex-col justify-end">
                  <StageTransitionSelect
                    stage={proposal.stage}
                    onSelect={async stage => {
                      const _review = await reviewSchemaProposal({
                        input: {
                          schemaProposalId: props.proposalId,
                          stageTransition: stage,
                          // for monorepos and non-service related comments, use an empty string
                          serviceName: '',
                        },
                      });
                      // @todo use urqlCache to invalidate the proposal and refresh?
                      refreshProposal();
                    }}
                  />
                </div>
              </div>
              <div className="mb-6 mt-2">
                {proposal.description ? (
                  <div className="w-full border-l-2 p-4">{proposal.description}</div>
                ) : null}
                <div className="text-neutral-10 mt-4 pr-2 text-right text-xs">
                  proposed <TimeAgo date={proposal.createdAt} /> by {proposal.author}
                </div>
              </div>
            </>
          )
        )}
        {ChangesBody}
      </div>
    </>
  );
};

function TabbedContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  version?: string;
  page?: string;
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof Proposal_ReviewsFragment>;
  checks: FragmentType<typeof ProposalOverview_ChecksFragment> | null;
  proposal: FragmentType<typeof Proposals_EditProposalProposalFragment>;
  target: FragmentType<typeof Proposals_EditProposalTargetFragment>;
  me: FragmentType<typeof Proposals_EditProposalMeFragment> | null;
  isDistributedGraph: boolean;
}) {
  const page = props.page ?? Tab.DETAILS;
  const proposalLink = {
    to: '/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId',
    params: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      proposalId: props.proposalId,
    },
  } as const;
  const versionSearch = props.version ? { version: props.version } : {};
  const sections: SecondaryNavigationItem[] = [
    {
      ...proposalLink,
      value: Tab.DETAILS,
      label: 'Details',
      icon: List,
      search: { page: 'details', ...versionSearch },
    },
    {
      ...proposalLink,
      value: Tab.SCHEMA,
      label: 'Schema',
      icon: FileDiffIcon,
      search: { page: 'schema', ...versionSearch },
    },
    {
      ...proposalLink,
      value: Tab.SUPERGRAPH,
      label: 'Supergraph Preview',
      icon: GraphQLIcon,
      visible: props.isDistributedGraph,
      search: { page: 'supergraph', ...versionSearch },
    },
    {
      ...proposalLink,
      value: Tab.CHECKS,
      label: 'Checks',
      icon: ChartPie,
      search: { page: 'checks', ...versionSearch },
    },
    // Edit always refers to the latest version, so it carries no version.
    { ...proposalLink, value: Tab.EDIT, label: 'Edit', icon: PencilIcon, search: { page: 'edit' } },
  ];

  return (
    <div className="w-full">
      <div className="border-neutral-5 border-b">
        <SecondaryNavigation aria-label="Proposal" value={page} items={sections} size="sm" />
      </div>
      <div className="flex grow flex-row pt-4">
        {page === Tab.DETAILS && <TargetProposalDetailsPage {...props} />}
        {page === Tab.SCHEMA && <TargetProposalSchemaPage {...props} />}
        {page === Tab.SUPERGRAPH && <TargetProposalSupergraphPage {...props} />}
        {page === Tab.CHECKS && <TargetProposalChecksPage {...props} />}
        {page === Tab.EDIT && (
          <SaveProposalProvider>
            <TargetProposalEditPage {...props} />
          </SaveProposalProvider>
        )}
      </div>
    </div>
  );
}

export const ProposalTab = Tab;
