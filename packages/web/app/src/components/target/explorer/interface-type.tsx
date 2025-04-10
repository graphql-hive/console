import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import { GraphQLFields, GraphQLTypeCard } from './common';

const GraphQLInterfaceTypeComponent_TypeFragment = graphql(`
  fragment GraphQLInterfaceTypeComponent_TypeFragment on GraphQLInterfaceType {
    name
    description
    interfaces
    usage {
      ...SchemaExplorerUsageStats_UsageFragment
    }
    fields {
      ...GraphQLFields_FieldFragment
    }
    supergraphMetadata {
      ...GraphQLTypeCard_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLInterfaceTypeComponent(props: {
  type: FragmentType<typeof GraphQLInterfaceTypeComponent_TypeFragment>;
  totalRequests?: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  warnAboutUnusedArguments: boolean;
  warnAboutDeprecatedArguments: boolean;
  styleDeprecated: boolean;
}) {
  const router = useRouter();
  const searchObj = router.latestLocation.search;
  const search =
    'search' in searchObj && typeof searchObj.search === 'string'
      ? searchObj.search.toLowerCase()
      : undefined;
  const ttype = useFragment(GraphQLInterfaceTypeComponent_TypeFragment, props.type);
  return (
    <GraphQLTypeCard
      kind="interface"
      name={ttype.name}
      description={ttype.description}
      implements={ttype.interfaces}
      supergraphMetadata={ttype.supergraphMetadata}
      targetSlug={props.targetSlug}
      projectSlug={props.projectSlug}
      organizationSlug={props.organizationSlug}
    >
      <GraphQLFields
        typeName={ttype.name}
        fields={ttype.fields}
        filterValue={search}
        totalRequests={props.totalRequests}
        targetSlug={props.targetSlug}
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        warnAboutDeprecatedArguments={props.warnAboutDeprecatedArguments}
        warnAboutUnusedArguments={props.warnAboutUnusedArguments}
        styleDeprecated={props.styleDeprecated}
      />
    </GraphQLTypeCard>
  );
}
