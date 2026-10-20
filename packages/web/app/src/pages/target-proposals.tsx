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
import { cn } from '@/lib/utils';
import { getRouteApi, useNavigate, useSearch } from '@tanstack/react-router';
import * as styles from './target-proposals.css';

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
      <LayoutContent className={styles.targetProposalsPageLayoutContent}>
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
      <div className={styles.proposalsContentDiv}>
        <div className={styles.proposalsContentDiv2}>
          <SubPageLayoutHeader
            subPageTitle={<span className={styles.proposalsContentSpan}>Schema Proposals</span>}
            description="Collaborate on schema changes to reduce friction during development."
          />
        </div>
        <div className={styles.proposalsContentDiv3}>
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
      <div className={styles.targetProposalsListDiv}>
        <StageFilter selectedStages={props.filterStages ?? []} />
        {hasFilterSelection ? (
          <Button variant="outline" onClick={reset}>
            Reset Filters
          </Button>
        ) : null}
      </div>

      <div className={styles.targetProposalsListDiv2}>
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
        <div role="status" aria-label="Loading" className={styles.proposalsListDiv}>
          <span className={styles.proposalsListSpan}>Loading</span>
          {[0, 1, 2, 3].map(index => (
            <div key={index} className={styles.proposalsListDiv2}>
              <Skeleton variants={{ size: 'lg', width: 'lg' }} />
              <Skeleton variants={{ size: 'sm', width: 'md' }} />
            </div>
          ))}
        </div>
      ) : null}
      {query.data?.schemaProposals?.edges?.length === 0 && (
        <div className={styles.proposalsListDiv3}>
          <div className={styles.proposalsListDiv4}>
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
            className={cn(
              styles.proposalsListDiv5,
              props.selectedProposalId === proposal.id && styles.proposalsListDiv6,
            )}
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
              <div className={styles.proposalsListDiv7}>
                <div className={styles.proposalsListDiv8}>
                  <div className={styles.proposalsListDiv9}>
                    <span className={styles.proposalsListSpan2}>{proposal.title}</span>
                    <span className={styles.proposalsListSpan3}>
                      <StatusDot color={stageToColor(proposal.stage)} />
                    </span>
                    <span className={styles.proposalsListSpan4}>{proposal.stage}</span>
                  </div>
                  <div className={styles.proposalsListDiv10}>
                    <div className={styles.proposalsListDiv11}>
                      proposed <TimeAgo date={proposal.updatedAt} />
                    </div>
                    {proposal.author ? (
                      <div className={styles.proposalsListDiv12}>by {proposal.author}</div>
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
