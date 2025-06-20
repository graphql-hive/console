import { useEffect, useState } from 'react';
import { useQuery } from 'urql';
import {
  ListNavigationProvider,
  ListNavigationTrigger,
  ListNavigationWrapper,
  useListNavCollapsedToggle,
  useListNavigationContext,
} from '@/components/common/ListNavigation';
import { Page, TargetLayout } from '@/components/layouts/target';
import { StageFilter } from '@/components/target/proposals/stage-filter';
import { UserFilter } from '@/components/target/proposals/user-filter';
import { BadgeRounded } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Spinner } from '@/components/ui/spinner';
import { TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';
import { SchemaProposalStage } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { ChatBubbleIcon, PinLeftIcon, PinRightIcon } from '@radix-ui/react-icons';
import { Outlet, useRouter, useSearch } from '@tanstack/react-router';
import { stageToColor } from '@/components/proposal/util';

export function TargetProposalsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  filterUserIds?: string[];
  filterStages?: string[];
  selectedProposalId?: string;
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

const ProposalsQuery = graphql(`
  query listProposals($input: SchemaProposalsInput) {
    schemaProposals(input: $input) {
      edges {
        node {
          id
          title
          stage
          updatedAt
          diffSchema {
            id
          }
          user {
            id
            displayName
            fullName
          }
          commentsCount
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

const ProposalsContent = (props: Parameters<typeof TargetProposalsPage>[0]) => {
  const isFullScreen = !props.selectedProposalId;

  return (
    <ListNavigationProvider isCollapsed={!!props.selectedProposalId} isHidden={false}>
      <div className="flex py-6">
        <div className="flex-1">
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/proposals"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
            }}
          >
            <Title className="inline-block cursor-pointer">Proposals</Title>
          </Link>
          <Subtitle>Collaborate on schema changes to reduce friction during development.</Subtitle>
        </div>
        <div className="ml-auto mr-0 flex flex-col justify-center">
          <Button variant="primary">Propose a change</Button>
        </div>
      </div>
      {!isFullScreen && (
        <div className="flex flex-row">
          <HideMenuButton />
          <span className="flex grow flex-col" />
          <ExpandMenuButton className="hidden md:inline" />
        </div>
      )}
      <ListNavigationWrapper list={<ProposalsListv2 {...props} />} content={<Outlet />} />
    </ListNavigationProvider>
  );
};

function HideMenuButton() {
  return (
    <span>
      <ListNavigationTrigger />
    </span>
  );
}

function ExpandMenuButton(props: { className?: string }) {
  const { isListNavHidden } = useListNavigationContext();
  const [collapsed, toggle] = useListNavCollapsedToggle();

  return isListNavHidden ? null : (
    <Button
      variant="ghost"
      className={cn('inline-block p-[10px]', props.className)}
      onClick={toggle}
    >
      {collapsed ? <PinRightIcon /> : <PinLeftIcon />}
    </Button>
  );
}

function ProposalsListv2(props: Parameters<typeof TargetProposalsPage>[0]) {
  const [pageVariables, setPageVariables] = useState([{ first: 20, after: null as string | null }]);
  const router = useRouter();
  const reset = () => {
    void router.navigate({
      search: { stage: undefined, user: undefined },
    });
  };
  const hasFilterSelection = !!(props.filterStages?.length || props.filterUserIds?.length);

  const hasHasProposalSelected = !!props.selectedProposalId;
  const { setIsListNavCollapsed, isListNavCollapsed, setIsListNavHidden } =
    useListNavigationContext();
  useEffect(() => {
    if (props.selectedProposalId) {
      setIsListNavCollapsed(true);
    } else {
      setIsListNavCollapsed(false);
      setIsListNavHidden(false);
    }
  }, [props.selectedProposalId]);

  const isFiltersHorizontalUI = !hasHasProposalSelected || !isListNavCollapsed;

  return (
    <>
      <div
        className={cn(
          'flex flex-col justify-end gap-2.5 pb-2.5',
          isFiltersHorizontalUI && 'md:flex-row',
        )}
      >
        <UserFilter
          selectedUsers={props.filterUserIds ?? []}
          organizationSlug={props.organizationSlug}
        />
        <StageFilter selectedStages={props.filterStages ?? []} />
        {hasFilterSelection ? (
          <Button
            variant="outline"
            onClick={reset}
            className={cn(isFiltersHorizontalUI && 'md:order-first')}
          >
            Reset Filters
          </Button>
        ) : null}
      </div>

      <div className="min-h-full gap-2.5 rounded-md border border-gray-800/50 bg-gray-900/50 p-2.5">
        {pageVariables.map(({ after }, i) => (
          <ProposalsListPage
            key={after ?? i}
            {...props}
            isLastPage={i === pageVariables.length - 1}
            onLoadMore={(after: string) => {
              setPageVariables([...pageVariables, { after, first: 10 }]);
            }}
          />
        ))}
      </div>
    </>
  );
}

/**
 * This renders a single page of proposals for the ProposalList component.
 */
const ProposalsListPage = (props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  filterUserIds?: string[];
  filterStages?: string[];
  selectedProposalId?: string;
  isLastPage: boolean;
  onLoadMore: (after: string) => void | Promise<void>;
}) => {
  const [query] = useQuery({
    query: ProposalsQuery,
    variables: {
      input: {
        target: {
          byId: props.targetSlug,
        },
        stages: (
          props.filterStages ?? [
            SchemaProposalStage.Draft,
            SchemaProposalStage.Open,
            SchemaProposalStage.Approved,
          ]
        )
          .sort()
          .map(s => s.toUpperCase() as SchemaProposalStage),
        userIds: props.filterUserIds,
      },
    },
    requestPolicy: 'cache-and-network',
  });
  const pageInfo = query.data?.schemaProposals?.pageInfo;
  const search = useSearch({ strict: false });

  const { isListNavCollapsed } = useListNavigationContext();
  const isWide = !props.selectedProposalId || !isListNavCollapsed;

  return (
    <>
      {query.fetching ? <Spinner /> : null}
      {query.data?.schemaProposals?.edges?.map(({ node: proposal }) => {
        return (
          <div
            key={proposal.id}
            className={cn(
              'flex w-full flex-col rounded-md p-2.5 hover:bg-gray-800/40',
              props.selectedProposalId === proposal.id && 'bg-gray-800/40',
            )}
          >
            <Link
              key={proposal.id}
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                proposalId: proposal.id,
              }}
              search={search}
              variant="secondary"
            >
              <div className="flex flex-row items-start">
                <div className="flex min-w-0 grow flex-col">
                  <div className="mr-6 flex min-w-0 flex-row text-sm md:text-base">
                    <span className={cn('text-primary mr-6 font-semibold', !isWide && 'truncate')}>
                      {proposal.title}
                    </span>
                    <span className="text-accent">
                      <BadgeRounded color={stageToColor(proposal.stage)} />
                    </span>
                    <span className="text-gray-400">{proposal.stage}</span>
                  </div>
                  <div className="mb-1.5 mt-2 flex flex-col gap-x-1 align-middle text-xs font-medium text-[#c4c4c4] md:flex-row">
                    <div className="truncate">
                      proposed <TimeAgo date={proposal.updatedAt} />
                    </div>
                    {proposal.user ? (
                      <div className="truncate">
                        by {proposal.user.displayName ?? proposal.user.fullName}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div
                  className={cn(
                    'hidden items-center justify-end gap-1 text-right text-gray-500',
                    isWide && 'sm:flex',
                  )}
                >
                  <span>{proposal.commentsCount}</span>
                  <ChatBubbleIcon />
                </div>
              </div>
            </Link>
          </div>
        );
      })}
      {props.isLastPage && pageInfo?.hasNextPage ? (
        <Button variant="link" onClick={_e => props.onLoadMore(pageInfo?.endCursor)}>
          Load more
        </Button>
      ) : null}
    </>
  );
};
