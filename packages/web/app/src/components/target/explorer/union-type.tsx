import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import { GraphQLTypeCard, GraphQLTypeCardListItem, SchemaExplorerUsageStats } from './common';
import { useSchemaExplorerContext } from './provider';
import { SupergraphMetadataList } from './super-graph-metadata';

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
        metadata {
          name
          content
        }
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
  const router = useRouter();
  const searchObj = router.latestLocation.search;
  const search =
    'search' in searchObj && typeof searchObj.search === 'string'
      ? searchObj.search.toLowerCase()
      : undefined;
  const ttype = useFragment(GraphQLUnionTypeComponent_TypeFragment, props.type);
  const { hasMetadataFilter, metadata: filterMeta } = useSchemaExplorerContext();

  const members = ttype.members.filter((member: any) => {
    let matchesFilter = true;
    if (search) {
      matchesFilter &&= member.name.toLowerCase().includes(search);
    }
    if (filterMeta.length && member.supergraphMetadata) {
      // Check custom metadata attributes
      const matchesMeta = member.supergraphMetadata.metadata?.some((m: any) =>
        hasMetadataFilter(m.name, m.content),
      );
      // Check service name filters
      const matchesService =
        'ownedByServiceNames' in member.supergraphMetadata &&
        Array.isArray(member.supergraphMetadata.ownedByServiceNames) &&
        member.supergraphMetadata.ownedByServiceNames.some((serviceName: string) =>
          hasMetadataFilter('service', serviceName),
        );
      matchesFilter &&= !!(matchesMeta || matchesService);
    }
    return matchesFilter;
  });

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
      <div className="flex flex-col">
        {members.map((member: any, i: number) => (
          <GraphQLTypeCardListItem key={member.name} index={i}>
            <div>{member.name}</div>
            {typeof props.totalRequests === 'number' && (
              <SchemaExplorerUsageStats
                totalRequests={props.totalRequests}
                usage={member.usage}
                targetSlug={props.targetSlug}
                projectSlug={props.projectSlug}
                organizationSlug={props.organizationSlug}
              />
            )}
            {member.supergraphMetadata && (
              <SupergraphMetadataList
                targetSlug={props.targetSlug}
                projectSlug={props.projectSlug}
                organizationSlug={props.organizationSlug}
                supergraphMetadata={member.supergraphMetadata}
              />
            )}
          </GraphQLTypeCardListItem>
        ))}
      </div>
    </GraphQLTypeCard>
  );
}
