import { gql, useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { CardDescription } from '@/components/ui/card';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Link } from '@tanstack/react-router';

const Proposals_NewProposalQuery = gql(`
  query Proposals_NewProposalQuery($targetReference: TargetReferenceInput!) {
    target(reference: $targetReference) {
      id
      slug
      latestValidSchemaVersion {
        schemas {
          edges {
            cursor
            node {
              __typename
              ...on CompositeSchema {
                id
                source
                service
                url
              }
              ...on SingleSchema {
                id
                source
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`);

export function TargetProposalsNewPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
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
        <ProposalsNewHeading {...props} />
        <ProposalsNewContent {...props} />
      </TargetLayout>
    </>
  );
}

function ProposalsNewHeading(props: Parameters<typeof TargetProposalsNewPage>[0]) {
  return (
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
              <span className="inline-block px-2 italic text-gray-500">/</span> New
            </span>
          }
          description={
            <CardDescription>
              Collaborate on schema changes to reduce friction during development.
            </CardDescription>
          }
        />
      </div>
    </div>
  );
}

function ProposalsNewContent(props: Parameters<typeof TargetProposalsNewPage>[0]) {
  const [query] = useQuery({
    query: Proposals_NewProposalQuery,
    variables: {
      targetReference: {
        bySelector: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      },
    },
  });
  return <div>{JSON.stringify(query.data)}</div>;
}
