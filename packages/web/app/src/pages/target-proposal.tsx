import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { userText } from '@/components/proposal/util';
import { StageTransitionSelect } from '@/components/target/proposals/stage-transition-select';
import { VersionSelect } from '@/components/target/proposals/version-select';
import { CardDescription } from '@/components/ui/card';
import { DiffIcon, EditIcon, GraphQLIcon } from '@/components/ui/icon';
import { Meta } from '@/components/ui/meta';
import { Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';
import { CubeIcon, ListBulletIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import { TargetProposalDetailsPage } from './target-proposal-details';
import { TargetProposalEditPage } from './target-proposal-edit';
import { TargetProposalSchemaPage } from './target-proposal-schema';
import { TargetProposalSupergraphPage } from './target-proposal-supergraph';

enum Tab {
  SCHEMA = 'schema',
  SUPERGRAPH = 'supergraph',
  DETAILS = 'details',
  EDIT = 'edit',
}

const ProposalQuery = graphql(/* GraphQL  */ `
  query ProposalQuery($id: ID!) {
    schemaProposal(input: { id: $id }) {
      id
      createdAt
      updatedAt
      commentsCount
      stage
      title
      description
      versions(first: 30, after: null, input: { onlyLatest: true }) {
        ...ProposalQuery_VersionsListFragment
      }
      # latestVersions: versions(first: 30, after: null, input: { onlyLatest: true }) {
      #   edges {
      #     __typename
      #     node {
      #       id
      #       serviceName
      #       reviews {
      #         edges {
      #           cursor
      #           node {
      #             id
      #             comments {
      #               __typename
      #             }
      #           }
      #         }
      #       }
      #     }
      #   }
      # }
      user {
        id
        email
        displayName
        fullName
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
              <>
                <CardDescription>
                  Collaborate on schema changes to reduce friction during development.
                </CardDescription>
              </>
            }
          />
        </div>
      </div>
      <SinglePageContent {...props} />
    </>
  );
};

function SinglePageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  tab?: string;
}) {
  const [query] = useQuery({
    query: ProposalQuery,
    variables: {
      reference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
      id: props.proposalId,
    },
    requestPolicy: 'cache-and-network',
  });
  const proposal = query.data?.schemaProposal;
  return (
    <div className="flex w-full grow flex-col rounded bg-gray-900/50 p-4">
      {query.fetching ? (
        <Spinner />
      ) : (
        proposal && (
          <>
            <div className="flex flex-row">
              <div className="flex-col">
                <VersionSelect proposalId={props.proposalId} versions={proposal.versions ?? {}} />
              </div>
              <div className="grow flex-col" />
              <div className="flex-col">
                <StageTransitionSelect stage={proposal.stage} />
              </div>
            </div>
            <div className="p-4">
              <Title className="text-orange-500">{proposal.title}</Title>
              <div className="text-xs text-gray-400">
                proposed <TimeAgo date={proposal.createdAt} /> by {userText(proposal.user)}
              </div>
              <div className="w-full py-2">{proposal.description}</div>
            </div>
          </>
        )
      )}
      <TabbedContent {...props} page={props.tab} />
    </div>
  );
}

function TabbedContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page?: string;
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
            <GraphQLIcon className="mr-2 h-5 w-auto flex-none" />
            Supergraph Preview
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
            <EditIcon className="mr-2 h-4 w-auto flex-none" />
            <span>Edit</span>
          </Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={Tab.DETAILS} variant="content" className="w-full p-6">
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
      <TabsContent value={Tab.EDIT} variant="content" className="w-full">
        <div className="flex grow flex-row">
          <TargetProposalEditPage {...props} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export const ProposalTab = Tab;
