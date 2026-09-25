import { FragmentType, graphql, useFragment } from '@/gql';
import { GraphQLTypeCard } from './common';
import { GraphQLFields } from './graphql-fields';

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
  warnAboutUnusedArguments: boolean;
  warnAboutDeprecatedArguments: boolean;
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
      <GraphQLFields
        typeName={ttype.name}
        fields={ttype.fields}
        totalRequests={props.totalRequests}
        warnAboutDeprecatedArguments={props.warnAboutDeprecatedArguments}
        warnAboutUnusedArguments={props.warnAboutUnusedArguments}
      />
    </GraphQLTypeCard>
  );
}
