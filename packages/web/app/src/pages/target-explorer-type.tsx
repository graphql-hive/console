import { useEffect } from 'react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { GraphQLEnumTypeComponent } from '@/components/target/explorer/enum-type';
import {
  ArgumentVisibilityFilter,
  DateRangeFilter,
  FieldByNameFilter,
  MetadataFilter,
  SchemaVariantFilter,
  TypeFilter,
} from '@/components/target/explorer/filter';
import { GraphQLInputObjectTypeComponent } from '@/components/target/explorer/input-object-type';
import { GraphQLInterfaceTypeComponent } from '@/components/target/explorer/interface-type';
import { GraphQLObjectTypeComponent } from '@/components/target/explorer/object-type';
import {
  SchemaExplorerProvider,
  useSchemaExplorerContext,
} from '@/components/target/explorer/provider';
import { GraphQLScalarTypeComponent } from '@/components/target/explorer/scalar-type';
import { GraphQLUnionTypeComponent } from '@/components/target/explorer/union-type';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';

export const TypeRenderFragment = graphql(`
  fragment TypeRenderFragment on GraphQLNamedType {
    __typename
    ...GraphQLObjectTypeComponent_TypeFragment
    ...GraphQLInterfaceTypeComponent_TypeFragment
    ...GraphQLUnionTypeComponent_TypeFragment
    ...GraphQLEnumTypeComponent_TypeFragment
    ...GraphQLInputObjectTypeComponent_TypeFragment
    ...GraphQLScalarTypeComponent_TypeFragment
  }
`);

export function TypeRenderer(props: {
  type: FragmentType<typeof TypeRenderFragment>;
  totalRequests?: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  warnAboutUnusedArguments: boolean;
  warnAboutDeprecatedArguments: boolean;
  styleDeprecated: boolean;
}) {
  const ttype = useFragment(TypeRenderFragment, props.type);
  switch (ttype.__typename) {
    case 'GraphQLObjectType':
      return (
        <GraphQLObjectTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
          warnAboutUnusedArguments={props.warnAboutUnusedArguments}
          warnAboutDeprecatedArguments={props.warnAboutDeprecatedArguments}
          styleDeprecated={props.styleDeprecated}
        />
      );
    case 'GraphQLInterfaceType':
      return (
        <GraphQLInterfaceTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
          warnAboutUnusedArguments={props.warnAboutUnusedArguments}
          warnAboutDeprecatedArguments={props.warnAboutDeprecatedArguments}
          styleDeprecated={props.styleDeprecated}
        />
      );
    case 'GraphQLUnionType':
      return (
        <GraphQLUnionTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
        />
      );
    case 'GraphQLEnumType':
      return (
        <GraphQLEnumTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
          styleDeprecated={props.styleDeprecated}
        />
      );
    case 'GraphQLInputObjectType':
      return (
        <GraphQLInputObjectTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
          styleDeprecated={props.styleDeprecated}
        />
      );
    case 'GraphQLScalarType':
      return (
        <GraphQLScalarTypeComponent
          type={ttype}
          totalRequests={props.totalRequests}
          targetSlug={props.targetSlug}
          projectSlug={props.projectSlug}
          organizationSlug={props.organizationSlug}
        />
      );
    default:
      return <div>Unknown type: {(ttype as any).__typename}</div>;
  }
}

const TargetExplorerTypenamePageQuery = graphql(`
  query TargetExplorerTypenamePageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
    $typename: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      rateLimit {
        retentionInDays
      }
    }
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      slug
      latestSchemaVersion {
        __typename
        id
        explorer(usage: { period: $period }) {
          metadataAttributes {
            name
            values
          }
          type(name: $typename) {
            ...TypeRenderFragment
          }
        }
      }
      project {
        id
        type
      }
      operationsStats(period: $period) {
        totalRequests
      }
    }
  }
`);

function TypeExplorerPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  typename: string;
}) {
  const { resolvedPeriod, dataRetentionInDays, setDataRetentionInDays } =
    useSchemaExplorerContext();
  const [query] = useQuery({
    query: TargetExplorerTypenamePageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      period: resolvedPeriod,
      typename: props.typename,
    },
  });

  const currentOrganization = query.data?.organization;
  const retentionInDays = currentOrganization?.rateLimit.retentionInDays;

  useEffect(() => {
    if (typeof retentionInDays === 'number' && dataRetentionInDays !== retentionInDays) {
      setDataRetentionInDays(retentionInDays);
    }
  }, [setDataRetentionInDays, retentionInDays]);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const currentTarget = query.data?.target;
  const type = currentTarget?.latestSchemaVersion?.explorer?.type;
  const latestSchemaVersion = currentTarget?.latestSchemaVersion;

  return (
    <>
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <Title>Explore</Title>
          <Subtitle>Insights from the latest version.</Subtitle>
        </div>
        <div className="flex flex-row items-center gap-x-4">
          {latestSchemaVersion && type ? (
            <>
              <TypeFilter
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                period={resolvedPeriod}
                typename={props.typename}
              />
              <FieldByNameFilter />
              <DateRangeFilter />
              <ArgumentVisibilityFilter />
              <SchemaVariantFilter
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                variant="all"
              />
              {latestSchemaVersion?.explorer?.metadataAttributes?.length ? (
                <MetadataFilter options={latestSchemaVersion.explorer.metadataAttributes} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {query.fetching ? null : latestSchemaVersion && type ? (
        <TypeRenderer
          totalRequests={query.data?.target?.operationsStats.totalRequests ?? 0}
          type={type}
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          warnAboutDeprecatedArguments={false}
          warnAboutUnusedArguments={false}
          styleDeprecated
        />
      ) : type ? (
        <NoSchemaVersion
          recommendedAction="publish"
          projectType={query.data?.target?.project?.type ?? null}
        />
      ) : (
        <div>Not found</div>
      )}
    </>
  );
}

export function TargetExplorerTypePage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  typename: string;
}) {
  return (
    <>
      <Meta title={`Type ${props.typename}`} />
      <SchemaExplorerProvider>
        <TargetLayout
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          page={Page.Explorer}
        >
          <TypeExplorerPageContent {...props} />
        </TargetLayout>
      </SchemaExplorerProvider>
    </>
  );
}
