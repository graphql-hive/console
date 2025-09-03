import { CalendarIcon, CheckIcon, XIcon } from '@/components/ui/icon';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { cn } from '@/lib/utils';
import { ComponentNoneIcon, CubeIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';

export const ProposalOverview_ChecksFragment = graphql(/* GraphQL */ `
  fragment ProposalOverview_ChecksFragment on SchemaCheckConnection {
    pageInfo {
      startCursor
    }
    edges {
      cursor
      node {
        id
        createdAt
        serviceName
        webUrl
        hasSchemaCompositionErrors
        hasUnapprovedBreakingChanges
        hasSchemaChanges
        meta {
          commit
          author
        }
      }
    }
  }
`);

export function TargetProposalChecksPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  proposalId: string;
  checks: FragmentType<typeof ProposalOverview_ChecksFragment> | null;
}) {
  const checks = useFragment(ProposalOverview_ChecksFragment, props.checks);
  return (
    <div className="grid w-full grid-cols-3 content-evenly rounded-lg border-2 sm:grid-cols-5 [&>*:nth-child(even)]:bg-gray-900/50 [&>*]:hover:bg-gray-900">
      {checks?.edges?.map(({ node }, index) => {
        return (
          <CheckItem
            {...props}
            {...node}
            serviceName={node.serviceName ?? ''}
            commit={node.meta?.commit}
            author={node.meta?.author}
          />
        );
      })}
    </div>
  );
}

function CheckItem(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  id: string;
  commit?: string | null;
  author?: string | null;
  serviceName: string;
  createdAt: string;
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  hasSchemaChanges: boolean;
  className?: string | boolean;
}) {
  return (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
      params={{
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
        schemaCheckId: props.id,
      }}
      className={cn(
        'col-span-3 grid grid-cols-subgrid items-center gap-4 px-4 py-3 text-left text-xs sm:col-span-5',
        props.className,
      )}
    >
      <div className="row-span-2 sm:row-span-1">
        <SchemaCheckIcon {...props} />
      </div>
      <div className="min-w-[100px] truncate">
        {props.serviceName.length !== 0 && (
          <div className="flex items-center text-sm font-semibold">
            <CubeIcon className="mr-1 h-3" />
            <div>{props.serviceName}</div>
          </div>
        )}
      </div>
      <div className="truncate text-center text-gray-500">{props.commit ?? props.id}</div>
      <div className="col-start-2 flex items-center sm:col-start-4 sm:justify-self-end">
        <CalendarIcon className="h-3" />
        <TimeAgo date={props.createdAt} />
      </div>
      <div className="truncate pr-4 text-right text-gray-500">
        {props.author ? props.author : ''}
      </div>
    </Link>
  );
}

function SchemaCheckIcon(props: {
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  hasSchemaChanges: boolean;
}) {
  if (props.hasSchemaCompositionErrors || props.hasUnapprovedBreakingChanges) {
    return (
      <div className="text-red-500">
        <XIcon className="inline-block h-4" /> ERROR
      </div>
    );
  }
  if (props.hasSchemaChanges) {
    return (
      <div className="text-green-500">
        <CheckIcon className="inline-block h-4" /> PASS
      </div>
    );
  }
  return (
    <div className="text-gray-500">
      <ComponentNoneIcon className="mr-2 h-4" /> NO CHANGE
    </div>
  );
}
