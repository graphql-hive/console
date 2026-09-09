import { FragmentType, graphql, useFragment } from '@/gql';
import {
  ExplorerFilteredEmptyState,
  GraphQLTypeAsLink,
  GraphQLTypeCard,
  GraphQLTypeCardListItem,
  SchemaExplorerUsageStats,
} from './common';
import { useSchemaExplorerContext } from './provider';
import { SupergraphMetadataList } from './super-graph-metadata';
import { matchesSubgraphFilter } from './utils';

const GraphQLUnionTypeComponent_TypeFragment = graphql(`
  fragment GraphQLUnionTypeComponent_TypeFragment on GraphQLUnionType {
    name
    description
    usage {
      ...SchemaExplorerUsageStats_UsageFragment
    }
    members {
      name
      usage {
        ...SchemaExplorerUsageStats_UsageFragment
      }
      supergraphMetadata {
        ownedByServiceNames
        ...SupergraphMetadataList_SupergraphMetadataFragment
      }
    }
    supergraphMetadata {
      ...GraphQLTypeCard_SupergraphMetadataFragment
      ...SupergraphMetadataList_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLUnionTypeComponent(props: {
  type: FragmentType<typeof GraphQLUnionTypeComponent_TypeFragment>;
  totalRequests?: number;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const ttype = useFragment(GraphQLUnionTypeComponent_TypeFragment, props.type);
  const { subgraphs } = useSchemaExplorerContext();
  const members = ttype.members.filter(member =>
    matchesSubgraphFilter(member.supergraphMetadata?.ownedByServiceNames, subgraphs),
  );
  return (
    <GraphQLTypeCard
      name={ttype.name}
      kind="union"
      description={ttype.description}
      supergraphMetadata={ttype.supergraphMetadata}
      targetSlug={props.targetSlug}
      projectSlug={props.projectSlug}
      organizationSlug={props.organizationSlug}
    >
      {members.length === 0 ? (
        <ExplorerFilteredEmptyState />
      ) : (
        <div className="flex flex-col">
          {members.map((member, i) => (
            <GraphQLTypeCardListItem key={member.name} index={i}>
              <GraphQLTypeAsLink
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                className="text-neutral-11 font-semibold"
                type={member.name}
              />
              {member.supergraphMetadata && (
                <SupergraphMetadataList
                  targetSlug={props.targetSlug}
                  projectSlug={props.projectSlug}
                  organizationSlug={props.organizationSlug}
                  supergraphMetadata={member.supergraphMetadata}
                />
              )}
              {typeof props.totalRequests === 'number' && (
                <SchemaExplorerUsageStats
                  totalRequests={props.totalRequests}
                  usage={member.usage}
                  targetSlug={props.targetSlug}
                  projectSlug={props.projectSlug}
                  organizationSlug={props.organizationSlug}
                />
              )}
            </GraphQLTypeCardListItem>
          ))}
        </div>
      )}
    </GraphQLTypeCard>
  );
}
