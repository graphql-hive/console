import { SupergraphMetadataList } from '@/components/target/explorer/super-graph-metadata';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import {
  DeprecationNote,
  DescriptionInline,
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
  styleDeprecated: boolean;
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
      const matchesMeta = value.supergraphMetadata?.metadata?.some(m =>
        hasMetadataFilter(m.name, m.content),
      );
      matchesFilter &&= !!matchesMeta;
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
              <DeprecationNote
                styleDeprecated={props.styleDeprecated}
                deprecationReason={value.deprecationReason}
              >
                <LinkToCoordinatePage
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  coordinate={`${ttype.name}.${value.name}`}
                >
                  {value.name}
                </LinkToCoordinatePage>
              </DeprecationNote>
              {value.description ? <DescriptionInline description={value.description} /> : null}
            </div>
            {value.supergraphMetadata ? (
              <SupergraphMetadataList
                targetSlug={props.targetSlug}
                projectSlug={props.projectSlug}
                organizationSlug={props.organizationSlug}
                supergraphMetadata={value.supergraphMetadata}
              />
            ) : null}
          </GraphQLTypeCardListItem>
        ))}
      </div>
    </GraphQLTypeCard>
  );
}
