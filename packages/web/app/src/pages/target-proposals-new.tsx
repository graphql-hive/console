import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { graphql } from '@/gql';
import { usePrettify } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { SchemaEditor } from '@theguild/editor';

const ProposalsNewProposalQuery = graphql(`
  query ProposalsNewProposalQuery($targetReference: TargetReferenceInput!) {
    target(reference: $targetReference) {
      id
      slug
      latestValidSchemaVersion {
        schemas {
          edges {
            cursor
            node {
              __typename
              ... on CompositeSchema {
                id
                source
                service
                url
              }
              ... on SingleSchema {
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

function schemaTitle(
  schema:
    | {
        __typename: 'CompositeSchema';
        id: string;
        source: string;
        service?: string | null;
        url?: string | null;
      }
    | {
        __typename: 'SingleSchema';
        id: string;
        source: string;
      },
): string {
  if (schema.__typename === 'CompositeSchema') {
    return schema.service ?? schema.url ?? schema.id;
  }
  return '';
}

function ProposalsNewContent(props: Parameters<typeof TargetProposalsNewPage>[0]) {
  const [selectedSchemaCursor, setSelectedSchemaCursor] = useState<string | undefined>(undefined);
  const [query] = useQuery({
    query: ProposalsNewProposalQuery,
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

  // note: schemas is not paginated for some reason...
  const schemaEdges = query.data?.target?.latestValidSchemaVersion?.schemas.edges;
  useEffect(() => {
    if (schemaEdges?.length === 1) {
      setSelectedSchemaCursor(schemaEdges[0].cursor);
    }
  }, [schemaEdges]);
  const selectedSchema = useMemo(() => {
    return schemaEdges?.find(s => s.cursor === selectedSchemaCursor)?.node;
  }, [query.data, selectedSchemaCursor]);

  const source = usePrettify(selectedSchema?.source ?? '');

  const schemaOptions = useMemo(() => {
    return (
      schemaEdges?.map(edge => (
        <SelectItem
          key={edge.cursor}
          value={edge.cursor}
          data-cy={`project-picker-option-${edge.cursor}`}
        >
          {schemaTitle(edge.node)}
        </SelectItem>
      )) ?? []
    );
  }, [schemaEdges]);

  if (query.fetching) {
    return <Spinner />;
  }
  if (query.error) {
    return (
      <Callout type="error" className="mx-auto w-2/3">
        <b>Oops, something went wrong.</b>
        <br />
        {query.error.message}
      </Callout>
    );
  }

  return (
    <div>
      <Label>
        Title <Input aria-label="title" />
      </Label>
      <Label className="mt-6">
        Description <Textarea aria-label="description" />
      </Label>
      {schemaEdges && schemaEdges.length > 1 && (
        <Select value={selectedSchemaCursor}>
          <SelectTrigger variant="default" data-cy="project-picker-trigger">
            <div className="font-medium" data-cy="project-picker-current">
              {selectedSchema ? schemaTitle(selectedSchema) : 'Select service...'}
            </div>
          </SelectTrigger>
          <SelectContent>{schemaOptions}</SelectContent>
        </Select>
      )}
      {/* avoid unloading and loading back in the schema editor when hidden... use the class to hide it */}
      <div className={cn(!source && 'hidden')}>
        <SchemaEditor
          theme="vs-dark"
          className="h-[400px] max-h-[100vh] min-h-[50vh] border"
          schema={source ?? ''}
        />
      </div>
      {!source && <div className="text-lg">Select a service to change</div>}
      <Button>Submit Proposal</Button>
    </div>
  );
}
