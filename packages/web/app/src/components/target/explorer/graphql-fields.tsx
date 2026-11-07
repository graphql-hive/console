import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as shared from '@/styles/shared.css';
import {
  DeprecationNote,
  Description,
  ExplorerFilteredEmptyState,
  GraphQLTypeAsLink,
  GraphQLTypeCardListItem,
  LinkToCoordinatePage,
  SchemaExplorerUsageStats,
} from './common';
import { GraphQLArguments } from './graphql-arguments';
import { SupergraphMetadataList } from './super-graph-metadata';
import { useExplorerFieldFiltering } from './utils';
import * as styles from './graphql-fields.css';

const GraphQLFields_FieldFragment = graphql(`
  fragment GraphQLFields_FieldFragment on GraphQLField {
    name
    description
    type
    isDeprecated
    deprecationReason
    usage {
      total
      ...SchemaExplorerUsageStats_UsageFragment
    }
    args {
      ...GraphQLArguments_ArgumentFragment
    }
    supergraphMetadata {
      ownedByServiceNames
      ...SupergraphMetadataList_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLFields(props: {
  typeName: string;
  fields: Array<FragmentType<typeof GraphQLFields_FieldFragment>>;
  totalRequests?: number;
  warnAboutUnusedArguments: boolean;
  warnAboutDeprecatedArguments: boolean;
}) {
  const { totalRequests } = props;
  const fieldsFromFragment = useFragment(GraphQLFields_FieldFragment, props.fields);

  const sortedAndFilteredFields = useExplorerFieldFiltering({
    fields: fieldsFromFragment,
  });

  if (sortedAndFilteredFields.length === 0) {
    return <ExplorerFilteredEmptyState />;
  }

  return (
    <>
      <div className={shared.stack.base}>
        {sortedAndFilteredFields.map((field, i) => {
          const coordinate = `${props.typeName}.${field.name}`;
          const isUsed = field.usage.total > 0;
          const hasArguments = field.args.length > 0;
          const showsUnusedSchema = typeof totalRequests !== 'number';
          const isDeprecated = field.isDeprecated;

          return (
            <GraphQLTypeCardListItem key={field.name} index={i}>
              <div className={shared.fullWidth}>
                <div className={styles.graphQLFieldsDiv3}>
                  <div>
                    {props.warnAboutUnusedArguments &&
                      isUsed &&
                      hasArguments &&
                      showsUnusedSchema && (
                        <Popover
                          trigger={
                            <button
                              type="button"
                              aria-label="Unused arguments"
                              className={styles.graphQLFieldsButton}
                            >
                              *
                            </button>
                          }
                          openOnHover
                          width="auto"
                          content={
                            <p className={styles.graphQLFieldsP}>
                              This field is used but the presented arguments are not.
                            </p>
                          }
                        />
                      )}
                    {props.warnAboutDeprecatedArguments && !isDeprecated && (
                      <Popover
                        trigger={
                          <button
                            type="button"
                            aria-label="Deprecated arguments"
                            className={styles.graphQLFieldsButton2}
                          >
                            *
                          </button>
                        }
                        openOnHover
                        width="auto"
                        content={
                          <p className={styles.graphQLFieldsP2}>
                            This field is not deprecated but the presented arguments are.
                          </p>
                        }
                      />
                    )}
                    <DeprecationNote deprecationReason={field.deprecationReason}>
                      <LinkToCoordinatePage
                        coordinate={coordinate}
                        className={styles.graphQLFieldsLinkToCoordinatePage}
                      >
                        {field.name}
                      </LinkToCoordinatePage>
                    </DeprecationNote>
                    {field.args.length > 0 && (
                      <GraphQLArguments parentCoordinate={coordinate} args={field.args} />
                    )}
                    <span className={styles.graphQLFieldsSpan}>:</span>
                    <GraphQLTypeAsLink
                      className={styles.graphQLFieldsGraphQLTypeAsLink}
                      type={field.type}
                    />
                  </div>
                  <div className={styles.graphQLFieldsDiv4}>
                    {field.supergraphMetadata && (
                      <div className={styles.graphQLFieldsDiv5}>
                        <SupergraphMetadataList supergraphMetadata={field.supergraphMetadata} />
                      </div>
                    )}
                    {typeof totalRequests === 'number' && (
                      <SchemaExplorerUsageStats totalRequests={totalRequests} usage={field.usage} />
                    )}
                  </div>
                </div>
                {field.description && <Description description={field.description} />}
              </div>
            </GraphQLTypeCardListItem>
          );
        })}
      </div>
    </>
  );
}
