import { Link } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TargetProposalEditPage } from './target-proposal-edit';
import { TargetProposalHistoryPage } from './target-proposal-history';
import { TargetProposalOverviewPage } from './target-proposal-overview';

enum Page {
  OVERVIEW = 'overview',
  HISTORY = 'history',
  EDIT = 'edit',
}

export function TargetProposalLayoutPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  page: string;
}) {
  return (
    <div className="ml-4 flex w-full grow flex-col rounded bg-gray-900/50 p-4">
      <Tabs  value={props.page}>
        <TabsList variant="menu" className="w-full">
          <TabsTrigger variant="menu" value={Page.OVERVIEW} asChild>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                proposalId: props.proposalId,
              }}
            >
              Overview
            </Link>
          </TabsTrigger>
          <TabsTrigger variant="menu" value={Page.HISTORY} asChild>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                proposalId: props.proposalId,
              }}
              search={{ page: 'history' }}
            >
              History
            </Link>
          </TabsTrigger>
          <TabsTrigger variant="menu" value={Page.EDIT} asChild>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                proposalId: props.proposalId,
              }}
              search={{ page: 'edit' }}
            >
              Edit
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={Page.OVERVIEW} variant="content" className='w-full'>
          <div className="flex grow flex-row">
            <TargetProposalOverviewPage {...props} />
          </div>
        </TabsContent>
        <TabsContent value={Page.HISTORY} variant="content" className='w-full'>
          <div className="flex grow flex-row">
            <TargetProposalHistoryPage {...props} />
          </div>
        </TabsContent>
        <TabsContent value={Page.EDIT} variant="content" className='w-full'>
          <TargetProposalEditPage {...props} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const ProposalPage = Page;
