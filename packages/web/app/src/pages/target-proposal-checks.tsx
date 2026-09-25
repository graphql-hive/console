import { Box, CalendarIcon, CheckIcon, Diamond, XIcon } from 'lucide-react';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
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
  proposalId: string;
  checks: FragmentType<typeof ProposalOverview_ChecksFragment> | null;
}) {
  const checks = useFragment(ProposalOverview_ChecksFragment, props.checks);
  return (
    <div className="grid w-full grid-cols-3 content-evenly sm:grid-cols-5">
      {checks?.edges?.map(({ node }, index) => {
        return (
          <CheckItem
            className={index % 2 === 1 ? 'bg-neutral-2/50' : ''}
            key={node.id}
            {...props}
            {...node}
            serviceName={node.serviceName ?? ''}
            commit={node.meta?.commit || node.id}
            author={node.meta?.author}
          />
        );
      })}
    </div>
  );
}

function CheckItem(props: {
  id: string;
  commit: string;
  author?: string | null;
  serviceName: string;
  createdAt: string;
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  hasSchemaChanges: boolean;
  className?: string | boolean;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  return (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
      params={{
        organizationSlug,
        projectSlug,
        targetSlug,
        schemaCheckId: props.id,
      }}
      className={cn(
        'hover:bg-neutral-5 col-span-3 grid grid-cols-subgrid items-center gap-4 px-4 py-3 text-left text-base sm:col-span-5',
        props.className,
      )}
    >
      <div className="row-span-2 sm:row-span-1">
        <SchemaCheckIcon {...props} />
      </div>
      <div className="min-w-[100px] truncate">
        <div className="flex items-center text-base font-semibold">
          <Box className="mr-1 size-3" />
          <div className="truncate">{props.serviceName || 'single schema'}</div>
        </div>
      </div>
      <div className="text-fg-secondary truncate text-center">{props.commit}</div>
      <div className="col-start-2 flex items-center sm:col-start-4 sm:justify-self-end">
        <CalendarIcon className="h-3" />
        <TimeAgo date={props.createdAt} />
      </div>
      <div className="text-fg-secondary truncate pr-4 text-right">{props.author ?? ''}</div>
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
      <div className="text-critical flex items-center">
        <XIcon className="inline-block h-4" />{' '}
        {props.hasSchemaCompositionErrors ? 'ERROR' : 'FAILED'}
      </div>
    );
  }
  if (props.hasSchemaChanges) {
    return (
      <div className="text-success flex items-center">
        <CheckIcon className="inline-block h-4" /> PASS
      </div>
    );
  }
  return (
    <div className="text-fg-secondary flex items-center">
      <Diamond className="mr-2 size-4" /> NO CHANGE
    </div>
  );
}
