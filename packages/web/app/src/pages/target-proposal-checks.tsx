import { Box, CalendarIcon, CheckIcon, Diamond, XIcon } from 'lucide-react';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import * as styles from './target-proposal-checks.css';

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
    <div className={styles.targetProposalChecksPageDiv}>
      {checks?.edges?.map(({ node }, index) => {
        return (
          <CheckItem
            className={index % 2 === 1 ? styles.targetProposalChecksPageCheckItem : ''}
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
      className={cn(styles.checkItemLink, props.className)}
    >
      <div className={styles.checkItemDiv}>
        <SchemaCheckIcon {...props} />
      </div>
      <div className={styles.checkItemDiv2}>
        <div className={styles.checkItemDiv3}>
          <Box className={styles.checkItemBox} />
          <div className={shared.truncate}>{props.serviceName || 'single schema'}</div>
        </div>
      </div>
      <div className={styles.checkItemDiv5}>{props.commit}</div>
      <div className={styles.checkItemDiv6}>
        <CalendarIcon className={styles.checkItemCalendarIcon} />
        <TimeAgo date={props.createdAt} />
      </div>
      <div className={styles.checkItemDiv7}>{props.author ?? ''}</div>
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
      <div className={styles.schemaCheckIconDiv}>
        <XIcon className={styles.schemaCheckIconXIcon} />{' '}
        {props.hasSchemaCompositionErrors ? 'ERROR' : 'FAILED'}
      </div>
    );
  }
  if (props.hasSchemaChanges) {
    return (
      <div className={styles.schemaCheckIconDiv2}>
        <CheckIcon className={styles.schemaCheckIconCheckIcon} /> PASS
      </div>
    );
  }
  return (
    <div className={styles.schemaCheckIconDiv3}>
      <Diamond className={styles.schemaCheckIconDiamond} /> NO CHANGE
    </div>
  );
}
