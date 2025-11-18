import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FragmentType, graphql, useFragment } from '@/gql';
import {
  DeprecationNote,
  Description,
  GraphQLTypeAsLink,
  GraphQLTypeCardListItem,
  LinkToCoordinatePage,
  SchemaExplorerUsageStats,
} from './common';
import { GraphQLArguments } from './graphql-arguments';
import { SupergraphMetadataList } from './super-graph-metadata';
import { useExplorerFieldFiltering } from './utils';

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
      ...SupergraphMetadataList_SupergraphMetadataFragment
    }
  }
`);

export function GraphQLFields(props: {
  typeName: string;
  fields: Array<FragmentType<typeof GraphQLFields_FieldFragment>>;
  totalRequests?: number;
  targetSlug: string;
  projectSlug: string;
  organizationSlug: string;
  warnAboutUnusedArguments: boolean;
  warnAboutDeprecatedArguments: boolean;
  styleDeprecated: boolean;
}) {
  const { totalRequests } = props;
  const fieldsFromFragment = useFragment(GraphQLFields_FieldFragment, props.fields);

  const sortedAndFilteredFields = useExplorerFieldFiltering({
    fields: fieldsFromFragment,
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col">
        {sortedAndFilteredFields.map((field, i) => {
          const coordinate = `${props.typeName}.${field.name}`;
          const isUsed = field.usage.total > 0;
          const hasArguments = field.args.length > 0;
          const showsUnusedSchema = typeof totalRequests !== 'number';
          const isDeprecated = field.isDeprecated;

          return (
            <GraphQLTypeCardListItem key={field.name} index={i}>
              <div className="w-full">
                <div className="flex w-full flex-row items-baseline justify-between">
                  <div>
                    {props.warnAboutUnusedArguments &&
                      isUsed &&
                      hasArguments &&
                      showsUnusedSchema && (
                        <Tooltip>
                          <TooltipContent>
                            This field is used but the presented arguments are not.
                          </TooltipContent>
                          <TooltipTrigger>
                            <span className="mr-1 text-sm text-orange-500">*</span>
                          </TooltipTrigger>
                        </Tooltip>
                      )}
                    {props.warnAboutDeprecatedArguments && !isDeprecated && (
                      <Tooltip>
                        <TooltipContent>
                          This field is not deprecated but the presented arguments are.
                        </TooltipContent>
                        <TooltipTrigger>
                          <span className="mr-1 text-sm text-orange-500">*</span>
                        </TooltipTrigger>
                      </Tooltip>
                    )}
                    <DeprecationNote
                      styleDeprecated={props.styleDeprecated}
                      deprecationReason={field.deprecationReason}
                    >
                      <LinkToCoordinatePage
                        organizationSlug={props.organizationSlug}
                        projectSlug={props.projectSlug}
                        targetSlug={props.targetSlug}
                        coordinate={coordinate}
                        className="font-semibold"
                      >
                        {field.name}
                      </LinkToCoordinatePage>
                    </DeprecationNote>
                    {field.args.length > 0 && (
                      <GraphQLArguments
                        organizationSlug={props.organizationSlug}
                        projectSlug={props.projectSlug}
                        targetSlug={props.targetSlug}
                        styleDeprecated={props.styleDeprecated}
                        parentCoordinate={coordinate}
                        args={field.args}
                      />
                    )}
                    <span className="mr-1">:</span>
                    <GraphQLTypeAsLink
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                      className="font-semibold text-gray-300"
                      type={field.type}
                    />
                  </div>
                  <div className="flex flex-row items-center">
                    {field.supergraphMetadata && (
                      <div className="ml-1">
                        <SupergraphMetadataList
                          targetSlug={props.targetSlug}
                          projectSlug={props.projectSlug}
                          organizationSlug={props.organizationSlug}
                          supergraphMetadata={field.supergraphMetadata}
                        />
                      </div>
                    )}
                    {typeof totalRequests === 'number' && (
                      <SchemaExplorerUsageStats
                        totalRequests={totalRequests}
                        usage={field.usage}
                        targetSlug={props.targetSlug}
                        projectSlug={props.projectSlug}
                        organizationSlug={props.organizationSlug}
                      />
                    )}
                  </div>
                </div>
                {field.description && <Description description={field.description} />}
              </div>
            </GraphQLTypeCardListItem>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
