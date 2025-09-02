import { CalendarIcon, CheckIcon, XIcon } from '@/components/ui/icon';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
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
    <div className="grid w-full grid-cols-1 p-4 md:grid-cols-2 lg:grid-cols-3">
      {checks?.edges?.map(({ node }) => {
        return (
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              schemaCheckId: node.id,
            }}
            className="rounded-lg px-4 py-3 text-left hover:bg-gray-900"
          >
            <div className="bold flex items-center text-lg">
              {node.serviceName && (
                <>
                  <CubeIcon className="mr-2 h-4" />
                  <div>{node.serviceName}</div>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">{node.id}</div>
            <div className="mt-4 flex flex-row">
              <div className="flex grow flex-row items-center text-sm">
                <SchemaCheckIcon {...node} />
              </div>
              <div className="flex items-center pr-4 text-sm">
                <CalendarIcon className="h-4" />
                <TimeAgo date={node.createdAt} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SchemaCheckIcon(props: {
  hasSchemaCompositionErrors: boolean;
  hasUnapprovedBreakingChanges: boolean;
  hasSchemaChanges: boolean;
}) {
  if (props.hasSchemaCompositionErrors || props.hasUnapprovedBreakingChanges) {
    const issue = props.hasSchemaCompositionErrors ? 'COMPOSITION ERRORS' : 'BREAKING CHANGES';
    return (
      <div className="text-red-500">
        <XIcon className="inline-block" /> {issue}
      </div>
    );
  }
  if (props.hasSchemaChanges) {
    return (
      <div className="text-green-500">
        <CheckIcon className="inline-block" /> OK
      </div>
    );
  }
  return (
    <div className="text-gray-500">
      <ComponentNoneIcon className="mr-2" /> NO CHANGE
    </div>
  );
}
