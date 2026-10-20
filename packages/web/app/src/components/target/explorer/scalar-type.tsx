import { Markdown } from '@/components/ui/markdown';
import { FragmentType, graphql, useFragment } from '@/gql';
import { GraphQLTypeCard, SchemaExplorerUsageStats } from './common';
import * as styles from './scalar-type.css';

const GraphQLScalarTypeComponent_TypeFragment = graphql(`
  fragment GraphQLScalarTypeComponent_TypeFragment on GraphQLScalarType {
    name
    description
    usage {
      ...SchemaExplorerUsageStats_UsageFragment
    }
    supergraphMetadata {
      ...GraphQLTypeCard_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLScalarTypeComponent(props: {
  type: FragmentType<typeof GraphQLScalarTypeComponent_TypeFragment>;
  totalRequests?: number;
}) {
  const ttype = useFragment(GraphQLScalarTypeComponent_TypeFragment, props.type);
  return (
    <GraphQLTypeCard name={ttype.name} kind="scalar" supergraphMetadata={ttype.supergraphMetadata}>
      <div className={styles.graphQLScalarTypeComponentDiv}>
        <div className={styles.graphQLScalarTypeComponentDiv2}>
          {typeof ttype.description === 'string' && <Markdown content={ttype.description} />}
        </div>
        {typeof props.totalRequests === 'number' && (
          <SchemaExplorerUsageStats totalRequests={props.totalRequests} usage={ttype.usage} />
        )}
      </div>
    </GraphQLTypeCard>
  );
}
