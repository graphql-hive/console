import { ReactElement } from 'react';
import { formatISO, subDays } from 'date-fns';
import { gql, useQuery } from 'urql';

import { TargetLayout } from '@/components/layouts';
import { SchemaExplorerFilter } from '@/components/target/explorer/filter';
import { GraphQLObjectTypeComponent } from '@/components/target/explorer/object-type';
import { SchemaExplorerProvider } from '@/components/target/explorer/provider';
import { DataWrapper, noSchema, Title } from '@/components/v2';
import { OrganizationFieldsFragment, ProjectFieldsFragment, TargetFieldsFragment } from '@/graphql';

function floorDate(date: Date): Date {
  const time = 1000 * 60;
  return new Date(Math.floor(date.getTime() / time) * time);
}

const SchemaView_SchemaExplorer = gql(/* GraphQL */ `
  query SchemaView_SchemaExplorer($organization: ID!, $project: ID!, $target: ID!, $period: DateRangeInput!) {
    target(selector: { organization: $organization, project: $project, target: $target }) {
      __typename
      id
      latestSchemaVersion {
        __typename
        id
        valid
        explorer(usage: { period: $period }) {
          query {
            ...GraphQLObjectTypeComponent_TypeFragment
          }
          mutation {
            ...GraphQLObjectTypeComponent_TypeFragment
          }
          subscription {
            ...GraphQLObjectTypeComponent_TypeFragment
          }
        }
      }
    }
    operationsStats(selector: { organization: $organization, project: $project, target: $target, period: $period }) {
      totalRequests
    }
  }
`);

function SchemaView({
  organization,
  project,
  target,
}: {
  organization: OrganizationFieldsFragment;
  project: ProjectFieldsFragment;
  target: TargetFieldsFragment;
}): ReactElement | null {
  const now = floorDate(new Date());
  const period = {
    to: formatISO(now),
    from: formatISO(subDays(now, 60)),
  };
  const [query] = useQuery({
    query: SchemaView_SchemaExplorer,
    variables: {
      organization: organization.cleanId,
      project: project.cleanId,
      target: target.cleanId,
      period,
    },
    requestPolicy: 'cache-first',
  });

  return (
    <DataWrapper query={query}>
      {({ data }) => {
        if (!data.target?.latestSchemaVersion) {
          return noSchema;
        }

        const { query, mutation, subscription } = data.target.latestSchemaVersion.explorer;
        const { totalRequests } = data.operationsStats;

        return (
          <SchemaExplorerProvider>
            <div className="mb-5 flex flex-row items-center justify-between">
              <div className="font-light text-gray-500">The latest published schema.</div>
            </div>
            <div className="flex flex-col gap-4">
              <SchemaExplorerFilter organization={organization} project={project} target={target} period={period} />
              {query ? <GraphQLObjectTypeComponent type={query} totalRequests={totalRequests} collapsed /> : null}
              {mutation ? <GraphQLObjectTypeComponent type={mutation} totalRequests={totalRequests} collapsed /> : null}
              {subscription ? (
                <GraphQLObjectTypeComponent type={subscription} totalRequests={totalRequests} collapsed />
              ) : null}
            </div>
          </SchemaExplorerProvider>
        );
      }}
    </DataWrapper>
  );
}

export default function ExplorerPage(): ReactElement {
  return (
    <>
      <Title title="Schema Explorer" />
      <TargetLayout value="explorer">{props => <SchemaView {...props} />}</TargetLayout>
    </>
  );
}
