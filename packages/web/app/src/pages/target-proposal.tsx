import { useMemo } from 'react';
import { buildSchema } from 'graphql';
import { useMutation, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import {
  ProposalOverview_ChangeFragment,
  ProposalOverview_ReviewsFragment,
  toUpperSnakeCase,
} from '@/components/target/proposals';
import { StageTransitionSelect } from '@/components/target/proposals/stage-transition-select';
import { VersionSelect } from '@/components/target/proposals/version-select';
import { CardDescription } from '@/components/ui/card';
import { DiffIcon, EditIcon, GraphQLIcon } from '@/components/ui/icon';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Change } from '@graphql-inspector/core';
import { patchSchema } from '@graphql-inspector/patch';
import { NoopError } from '@graphql-inspector/patch/errors';
import { ListBulletIcon, PieChartIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import {
  ProposalOverview_ChecksFragment,
  TargetProposalChecksPage,
} from './target-proposal-checks';
import { TargetProposalDetailsPage } from './target-proposal-details';
import { TargetProposalEditPage } from './target-proposal-edit';
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
  query ProposalQuery($proposalId: ID!, $latestValidVersionReference: TargetReferenceInput) {
    schemaProposal(input: { id: $proposalId }) {
      id
      createdAt
      stage
      title
      description
      checks(after: null, input: {}) {
        ...ProposalQuery_VersionsListFragment
        ...ProposalOverview_ChecksFragment
      }
      reviews {
        ...ProposalOverview_ReviewsFragment
      }
      author
    }
    latestValidVersion(target: $latestValidVersionReference) {
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
  query ProposalChangesQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      checks(after: null, input: { latestPerService: true }) {
        edges {
          __typename
          node {
            id
            serviceName
            hasSchemaChanges
            schemaChanges {
              edges {
                node {
                  __typename
                  ...ProposalOverview_ChangeFragment
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
}) {
  return (
    <>
      <Meta title="Schema proposals" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Proposals}
        className="flex h-[--content-height] min-h-[300px] flex-col pb-0"
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
      latestValidVersionReference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
      proposalId: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });

  // fetch all proposed changes for the selected version
  const [changesQuery] = useQuery({
    query: ProposalChangesQuery,
    variables: {
      id: props.proposalId,
      // @todo versionId
      // @todo deal with pagination
    },
    requestPolicy: 'cache-and-network',
  });

  const [_, reviewSchemaProposal] = useMutation(ReviewSchemaProposalMutation);

  // This does a lot of heavy lifting to avoid having to reapply patching etc on each tab...
  // Takes all the data provided by the queries to apply the patch to the schema and
  // categorize changes.
  const services = useMemo(() => {
    return (
      changesQuery.data?.schemaProposal?.checks?.edges?.map(
        ({ node: proposalVersion }): ServiceProposalDetails => {
          const existingSchema = query.data?.latestValidVersion?.schemas.edges.find(
            ({ node: latestSchema }) =>
              (latestSchema.__typename === 'CompositeSchema' &&
                latestSchema.service === proposalVersion.serviceName) ||
              (latestSchema.__typename === 'SingleSchema' && proposalVersion.serviceName == null),
          )?.node.source;
          const beforeSchema = existingSchema?.length
            ? buildSchema(existingSchema, { assumeValid: true, assumeValidSDL: true })
            : null;
          // @todo better handle pagination
          const allChanges =
            proposalVersion.schemaChanges?.edges
              .filter(c => !!c)
              ?.map(({ node: change }): Change<any> => {
                const c = useFragment(ProposalOverview_ChangeFragment, change);
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
          const afterSchema = beforeSchema
            ? patchSchema(beforeSchema, allChanges, {
                throwOnError: false,
                onError(error, change) {
                  if (error instanceof NoopError) {
                    ignoredChanges.push({ change, error });
                    return false;
                  }
                  conflictingChanges.push({ change, error });
                  return true;
                },
              })
            : null;

          return {
            beforeSchema,
            afterSchema,
            allChanges,
            rawChanges: proposalVersion.schemaChanges?.edges.map(({ node }) => node) ?? [],
            conflictingChanges,
            ignoredChanges,
            serviceName: proposalVersion.serviceName ?? '',
          };
        },
      ) ?? []
    );
  }, [
    // @todo handle pagination
    changesQuery.data?.schemaProposal?.checks?.edges,
    query.data?.latestValidVersion?.schemas.edges,
  ]);

  const proposal = query.data?.schemaProposal;
  return (
    <>
      <div className="flex py-6">
        <div className="flex-1">
          <SubPageLayoutHeader
            subPageTitle={
              <span className="flex items-center">
                <Link
                  className="text-white"
                  to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
                  params={{
                    organizationSlug: props.organizationSlug,
                    projectSlug: props.projectSlug,
                    targetSlug: props.targetSlug,
                  }}
                >
                  Schema Proposals
                </Link>{' '}
                <span className="inline-block px-2 italic text-gray-500">/</span>{' '}
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
      <div className="flex w-full grow flex-col rounded bg-gray-900/50 p-4">
        {query.fetching ? (
          <Spinner />
        ) : (
          proposal && (
            <>
              <div className="grid grid-cols-2">
                <VersionSelect proposalId={props.proposalId} versions={proposal.checks ?? {}} />
                <div className="flex justify-end">
                  <StageTransitionSelect
                    stage={proposal.stage}
                    onSelect={async stage => {
                      const review = await reviewSchemaProposal({
                        input: {
                          schemaProposalId: props.proposalId,
                          stageTransition: stage,
                          // for monorepos and non-service related comments, use an empty string
                          serviceName: '',
                        },
                      });
                      console.log('@todo ', review);
                      refreshProposal();
                    }}
                  />
                </div>
              </div>
              <div className="p-4 py-8">
                <Title className="text-orange-500">{proposal.title}</Title>
                <div className="text-xs text-gray-400">
                  proposed <TimeAgo date={proposal.createdAt} /> by {proposal.author}
                </div>
                <div className="w-full p-2 pt-4">{proposal.description}</div>
              </div>
            </>
          )
        )}
        {changesQuery.fetching ? (
          <Spinner />
        ) : !services.length ? (
          <>
            <Title className="text-center">No changes found</Title>
            <Subtitle className="text-center">
              This proposed version would result in no changes to the latest schemas.
            </Subtitle>
          </>
        ) : (
          <TabbedContent
            {...props}
            page={props.tab}
            services={services ?? []}
            reviews={proposal?.reviews ?? {}}
            checks={proposal?.checks ?? null}
          />
        )}
      </div>
    </>
  );
};

function TabbedContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page?: string;
  services: ServiceProposalDetails[];
  reviews: FragmentType<typeof ProposalOverview_ReviewsFragment>;
  checks: FragmentType<typeof ProposalOverview_ChecksFragment> | null;
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
            search={{ page: 'details' }}
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
            search={{ page: 'schema' }}
            className="flex items-center"
          >
            <DiffIcon className="mr-2 h-5 w-auto flex-none" />
            Schema
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Tab.SUPERGRAPH} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'supergraph' }}
            className="flex items-center"
          >
            <GraphQLIcon className="mr-2 h-4 w-auto flex-none" />
            Supergraph Preview
          </Link>
        </TabsTrigger>
        <TabsTrigger variant="menu" value={Tab.CHECKS} asChild>
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              proposalId: props.proposalId,
            }}
            search={{ page: 'checks' }}
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
            search={{ page: 'edit' }}
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
          <TargetProposalChecksPage {...props} checks={props.checks} />
        </div>
      </TabsContent>
      <TabsContent value={Tab.EDIT} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalEditPage {...props} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export const ProposalTab = Tab;
