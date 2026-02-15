import { SupergraphMetadataList } from '@/components/target/explorer/super-graph-metadata';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import {
  DeprecationNote,
  Description,
  GraphQLTypeCard,
  GraphQLTypeCardListItem,
  LinkToCoordinatePage,
} from './common';
import { useSchemaExplorerContext } from './provider';

const GraphQLEnumTypeComponent_TypeFragment = graphql(`
  fragment GraphQLEnumTypeComponent_TypeFragment on GraphQLEnumType {
    name
    description
    usage {
      ...SchemaExplorerUsageStats_UsageFragment
    }
    values {
      name
      description
      isDeprecated
      deprecationReason
      supergraphMetadata {
        metadata {
          name
          content
        }
        ...SupergraphMetadataList_SupergraphMetadataFragment
      }
    }
    supergraphMetadata {
      metadata {
        name
        content
      }
      ...GraphQLTypeCard_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLEnumTypeComponent(props: {
  type: FragmentType<typeof GraphQLEnumTypeComponent_TypeFragment>;
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
  const ttype = useFragment(GraphQLEnumTypeComponent_TypeFragment, props.type);
  const { hasMetadataFilter, metadata: filterMeta } = useSchemaExplorerContext();
  const values = ttype.values.filter(value => {
    let matchesFilter = true;
    if (search) {
      matchesFilter &&= value.name.toLowerCase().includes(search);
    }
    if (filterMeta.length) {
      const metadata = value.supergraphMetadata;
      // Check custom metadata attributes
      const matchesMeta = metadata?.metadata?.some(m => hasMetadataFilter(m.name, m.content));
      // Check service name filters
      const matchesService =
        metadata &&
        'ownedByServiceNames' in metadata &&
        Array.isArray(metadata.ownedByServiceNames) &&
        metadata.ownedByServiceNames.some((serviceName: string) =>
          hasMetadataFilter('service', serviceName),
        );
      matchesFilter &&= !!(matchesMeta || matchesService);
    }
    return matchesFilter;
  });

  return (
    <GraphQLTypeCard
      name={ttype.name}
      kind="enum"
      description={ttype.description}
      supergraphMetadata={ttype.supergraphMetadata}
      targetSlug={props.targetSlug}
      projectSlug={props.projectSlug}
      organizationSlug={props.organizationSlug}
      totalRequests={props.totalRequests}
      usage={ttype.usage}
    >
      <div className="flex flex-col">
        {values.map((value, i) => (
          <GraphQLTypeCardListItem key={value.name} index={i}>
            <div className="flex flex-col">
              <DeprecationNote deprecationReason={value.deprecationReason}>
                <LinkToCoordinatePage
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  coordinate={`${ttype.name}.${value.name}`}
                >
                  {value.name}
                </LinkToCoordinatePage>
              </DeprecationNote>
              {value.description && <Description description={value.description} />}
            </div>
            {value.supergraphMetadata && (
              <SupergraphMetadataList
                targetSlug={props.targetSlug}
                projectSlug={props.projectSlug}
                organizationSlug={props.organizationSlug}
                supergraphMetadata={value.supergraphMetadata}
              />
            )}
          </GraphQLTypeCardListItem>
        ))}
      </div>
    </GraphQLTypeCard>
  );
}
