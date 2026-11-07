import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { StageFilter } from '@/components/target/proposals/stage-filter';
import { stageToColor } from '@/components/target/proposals/util';
import { Link } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Button } from '@/components/ui/primitives/button/button';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { SchemaProposalStage } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import * as shared from '@/styles/shared.css';
import { getRouteApi, useNavigate, useSearch } from '@tanstack/react-router';
import { targetProposalsStyles } from './target-proposals.css';

const proposalsRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/proposals',
);

export function TargetProposalsPage(props: {
  filterUserIds?: string[];
  filterStages?: string[];
  selectedProposalId?: string;
}) {
  return (
    <>
      <Meta title="Schema proposals" />
      <LayoutContent className={targetProposalsStyles.page}>
        <ProposalsContent {...props} />
      </LayoutContent>
    </>
  );
}

const ProposalsContent = (props: Parameters<typeof TargetProposalsPage>[0]) => {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const navigate = useNavigate();
  const proposeChange = () => {
    void navigate({
      to: '/$organizationSlug/$projectSlug/$targetSlug/proposals/new',
      params: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
    });
  };
  return (
    <>
      <div className={targetProposalsStyles.header}>
        <div className={shared.fill}>
          <SubPageLayoutHeader
            subPageTitle={<span className={shared.row.base}>Schema Proposals</span>}
            description="Collaborate on schema changes to reduce friction during development."
          />
        </div>
        <div className={targetProposalsStyles.headerEnd}>
          <Button onClick={proposeChange}>Propose a change</Button>
        </div>
      </div>
      <TargetProposalsList {...props} />
    </>
  );
};

export const ProposalsQuery = graphql(`
  query listProposals($input: SchemaProposalsInput!) {
    schemaProposals(input: $input) {
      edges {
        node {
          id
          title
          stage
          updatedAt
          author
        }
        cursor
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`);

function proposalStages(stages?: string[]) {
  return [
    ...(stages ?? [
      SchemaProposalStage.Draft,
      SchemaProposalStage.Open,
      SchemaProposalStage.Approved,
    ]),
  ]
    .sort()
    .map(s => s.toUpperCase() as SchemaProposalStage);
}

export function proposalsVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  stages?: string[],
) {
  return { input: { target: { bySelector: slugs }, stages: proposalStages(stages) } };
}

function TargetProposalsList(props: Parameters<typeof TargetProposalsPage>[0]) {
  const navigate = proposalsRoute.useNavigate();
  const reset = () => {
    void navigate({
      search: { stage: undefined, user: undefined },
    });
  };
  const hasFilterSelection = !!(props.filterStages?.length || props.filterUserIds?.length);

  return (
    <>
      <div className={targetProposalsStyles.layout}>
        <StageFilter selectedStages={props.filterStages ?? []} />
        {hasFilterSelection ? (
          <Button variant="outline" onClick={reset}>
            Reset Filters
          </Button>
        ) : null}
      </div>

      <div className={targetProposalsStyles.panel}>
        <ProposalsList {...props} />
      </div>
    </>
  );
}

// The document passes no cursor, so this is the API's first page; a "load more" only repeated it.
const ProposalsList = (props: {
  filterUserIds?: string[];
  filterStages?: string[];
  selectedProposalId?: string;
}) => {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: ProposalsQuery,
    variables: proposalsVariables(
      { organizationSlug, projectSlug, targetSlug },
      props.filterStages,
    ),
  });
  const search = useSearch({ strict: false });
  const hasFilter = props.filterStages?.length || props.filterUserIds?.length;

  return (
    <>
      {query.error && !query.data ? (
        <QueryError
          organizationSlug={organizationSlug}
          error={query.error}
          showLogoutButton={false}
        />
      ) : null}
      {query.fetching && !query.data ? (
        <div role="status" aria-label="Loading" className={shared.stack.base}>
          <span className={shared.srOnly}>Loading</span>
          {[0, 1, 2, 3].map(index => (
            <div key={index} className={targetProposalsStyles.skeleton}>
              <Skeleton variants={{ size: 'lg', width: 'lg' }} />
              <Skeleton variants={{ size: 'sm', width: 'md' }} />
            </div>
          ))}
        </div>
      ) : null}
      {query.data?.schemaProposals?.edges?.length === 0 && (
        <div className={targetProposalsStyles.empty}>
          <div className={shared.fullWidth}>
            <Title>
              No proposals {hasFilter ? 'match your search criteria' : 'have been created yet'}
            </Title>
            <Subtitle>To get started, use the Hive CLI to propose a schema change.</Subtitle>
          </div>
        </div>
      )}
      {query.data?.schemaProposals?.edges?.map(({ node: proposal }) => {
        return (
          <div
            key={proposal.id}
            className={targetProposalsStyles.proposal({
              selected: props.selectedProposalId === proposal.id,
            })}
          >
            <Link
              key={proposal.id}
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                proposalId: proposal.id,
              }}
              search={{
                ...search,
                page: undefined,
              }}
              variant="secondary"
            >
              <div className={targetProposalsStyles.proposalRow}>
                <div className={targetProposalsStyles.proposalBody}>
                  <div className={targetProposalsStyles.proposalTitleRow}>
                    <span className={targetProposalsStyles.proposalTitle}>{proposal.title}</span>
                    <span className={targetProposalsStyles.proposalStatus}>
                      <StatusDot color={stageToColor(proposal.stage)} />
                    </span>
                    <span className={shared.fg.secondary}>{proposal.stage}</span>
                  </div>
                  <div className={targetProposalsStyles.proposalMeta}>
                    <div className={shared.truncate}>
                      proposed <TimeAgo date={proposal.updatedAt} />
                    </div>
                    {proposal.author ? (
                      <div className={shared.truncate}>by {proposal.author}</div>
                    ) : null}
                  </div>
                </div>
                {/* <div
                  className={cn(
                    'hidden items-center justify-end gap-1 text-right text-fg-secondary sm:flex',
                  )}
                >
                  <span>{proposal.commentsCount}</span>
                  <ChatBubbleIcon />
                </div> */}
              </div>
            </Link>
          </div>
        );
      })}
    </>
  );
};
