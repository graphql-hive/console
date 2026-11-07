import { Box, CalendarIcon, CheckIcon, Diamond, XIcon } from 'lucide-react';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import { targetProposalChecksStyles } from './target-proposal-checks.css';

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
    <div className={targetProposalChecksStyles.list}>
      {checks?.edges?.map(({ node }, index) => {
        return (
          <CheckItem
            className={index % 2 === 1 ? targetProposalChecksStyles.striped : ''}
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
      className={cn(targetProposalChecksStyles.check, props.className)}
    >
      <div className={targetProposalChecksStyles.checkStatus}>
        <SchemaCheckIcon {...props} />
      </div>
      <div className={targetProposalChecksStyles.checkService}>
        <div className={targetProposalChecksStyles.checkServiceName}>
          <Box className={targetProposalChecksStyles.checkServiceIcon} />
          <div className={shared.truncate}>{props.serviceName || 'single schema'}</div>
        </div>
      </div>
      <div className={targetProposalChecksStyles.checkCommit}>{props.commit}</div>
      <div className={targetProposalChecksStyles.checkDate}>
        <CalendarIcon className={targetProposalChecksStyles.checkDateIcon} />
        <TimeAgo date={props.createdAt} />
      </div>
      <div className={targetProposalChecksStyles.checkAuthor}>{props.author ?? ''}</div>
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
      <div className={targetProposalChecksStyles.statusFailed}>
        <XIcon className={targetProposalChecksStyles.statusIcon} />{' '}
        {props.hasSchemaCompositionErrors ? 'ERROR' : 'FAILED'}
      </div>
    );
  }
  if (props.hasSchemaChanges) {
    return (
      <div className={targetProposalChecksStyles.statusPassed}>
        <CheckIcon className={targetProposalChecksStyles.statusIcon} /> PASS
      </div>
    );
  }
  return (
    <div className={targetProposalChecksStyles.statusUnchanged}>
      <Diamond className={targetProposalChecksStyles.statusUnchangedIcon} /> NO CHANGE
    </div>
  );
}
