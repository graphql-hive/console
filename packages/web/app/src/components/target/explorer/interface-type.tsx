import { FragmentType, graphql, useFragment } from '@/gql';
import { GraphQLFields, GraphQLTypeCard } from './common';

export const GraphQLInterfaceTypeComponent_TypeFragment = graphql(`
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
  totalRequests: number;
}) {
  const ttype = useFragment(GraphQLInterfaceTypeComponent_TypeFragment, props.type);
  return (
    <GraphQLTypeCard
      kind="interface"
      name={ttype.name}
      description={ttype.description}
      implements={ttype.interfaces}
      supergraphMetadata={ttype.supergraphMetadata}
    >
      <GraphQLFields fields={ttype.fields} totalRequests={props.totalRequests} />
    </GraphQLTypeCard>
  );
}
