import { useMemo } from 'react';
import { buildASTSchema, buildSchema, GraphQLSchema, parse } from 'graphql';
import { useMutation, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { CompositionErrorsSection_SchemaErrorConnection } from '@/components/target/history/errors-and-changes';
import {
  Proposal_ChangeFragment,
  Proposal_ReviewsFragment,
  toUpperSnakeCase,
} from '@/components/target/proposals';
import { SaveProposalProvider } from '@/components/target/proposals/save-proposal-modal';
import { StageTransitionSelect } from '@/components/target/proposals/stage-transition-select';
import {
  ProposalQuery_VersionsListFragment,
  VersionSelect,
} from '@/components/target/proposals/version-select';
import { CardDescription } from '@/components/ui/card';
import { CheckIcon, DiffIcon, EditIcon, GraphQLIcon, XIcon } from '@/components/ui/icon';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { addTypeForExtensions } from '@/lib/proposals/utils';
import { Change } from '@graphql-inspector/core';
import { errors, patchSchema } from '@graphql-inspector/patch';
import { NoopError, ValueMismatchError } from '@graphql-inspector/patch/errors';
import { ListBulletIcon, PieChartIcon } from '@radix-ui/react-icons';
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
      versions: checks(after: null, input: {}) {
        ...ProposalQuery_VersionsListFragment
      }
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
        versions={proposal.versions ?? null}
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
            description={
              <CardDescription>
                Collaborate on schema changes to reduce friction during development.
              </CardDescription>
            }
          />
        </div>
      </div>
      <div className="bg-neutral-2/50 flex w-full grow flex-col rounded-sm p-4">
        {query.fetching ? (
          <Spinner />
        ) : (
          proposal && (
            <>
              <div className="grid grid-cols-2">
                <VersionSelect proposalId={props.proposalId} versions={proposal.versions ?? {}} />
                <div className="flex justify-end">
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
              <div className="p-4 py-8">
                <Title>
                  {proposal.title}
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger>
                        {proposal?.compositionStatus === 'error' ? (
                          <XIcon className="text-red-600" />
                        ) : null}
                        {proposal?.compositionStatus === 'success' ? (
                          <CheckIcon className="text-emerald-500" />
                        ) : null}
                      </TooltipTrigger>
                      <TooltipContent align="start">
                        {proposal?.compositionStatus === 'error' ? (
                          <>
                            Composition Error{' '}
                            {proposal.compositionTimestamp ? (
                              <>
                                (<TimeAgo date={proposal.compositionTimestamp} />)
                              </>
                            ) : null}
                            {proposal.compositionStatusReason
                              ?.split('\n')
                              .map(e => <div>- {e}</div>) ?? 'Unknown cause.'}{' '}
                          </>
                        ) : null}
                        {proposal?.compositionStatus === 'success' ? 'Composes Successfully' : null}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Title>
                <div className="text-neutral-10 text-xs">
                  proposed <TimeAgo date={proposal.createdAt} /> by {proposal.author}
                </div>
                <div className="w-full p-2 pt-4">{proposal.description}</div>
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
  versions: FragmentType<typeof ProposalQuery_VersionsListFragment> | null;
  proposal: FragmentType<typeof Proposals_EditProposalProposalFragment>;
  target: FragmentType<typeof Proposals_EditProposalTargetFragment>;
  me: FragmentType<typeof Proposals_EditProposalMeFragment> | null;
  isDistributedGraph: boolean;
}) {
  return (
    <Tabs value={props.page} defaultValue={Tab.DETAILS}>
      <TabsList variant="menu" className="w-full">
        <TabsTrigger variant="menu" value={Tab.DETAILS} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'details', ...(props.version ? { version: props.version } : {}) }}
            className="flex items-center"
          >
            <ListBulletIcon className="mr-2 h-5 w-auto flex-none" />
            Details
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Tab.SCHEMA} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'schema', ...(props.version ? { version: props.version } : {}) }}
            className="flex items-center"
          >
            <DiffIcon className="mr-2 h-5 w-auto flex-none" />
            Schema
          </Link>
        </TabsTrigger>
        {props.isDistributedGraph ? (
          <TabsTrigger variant="menu" value={Tab.SUPERGRAPH} asChild>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                proposalId: props.proposalId,
              }}
              search={{ page: 'supergraph', ...(props.version ? { version: props.version } : {}) }}
              className="flex items-center"
            >
              <GraphQLIcon className="mr-2 h-4 w-auto flex-none" />
              Supergraph Preview
            </Link>
          </TabsTrigger>
        ) : null}
        <TabsTrigger variant="menu" value={Tab.CHECKS} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'checks', ...(props.version ? { version: props.version } : {}) }}
            className="flex items-center"
          >
            <PieChartIcon className="mr-2 h-4 w-auto flex-none" />
            Checks
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Tab.EDIT} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'edit' }} // don't set version here. Always refer to latest on edit.
            className="flex items-center"
          >
            <EditIcon className="mr-2 h-3 w-auto flex-none" />
            Edit
          </Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={Tab.DETAILS} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalDetailsPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Tab.SCHEMA} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalSchemaPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Tab.SUPERGRAPH} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalSupergraphPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Tab.CHECKS} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalChecksPage {...props} />
        </div>
      </TabsContent>
      <TabsContent value={Tab.EDIT} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <SaveProposalProvider>
            <TargetProposalEditPage {...props} />
          </SaveProposalProvider>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export const ProposalTab = Tab;
