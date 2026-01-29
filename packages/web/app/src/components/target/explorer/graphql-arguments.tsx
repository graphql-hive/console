import { FragmentType, graphql, useFragment } from '@/gql';
import { DeprecationNote, Description, GraphQLTypeAsLink, LinkToCoordinatePage } from './common';
import { useDescriptionsVisibleToggle } from './provider';

export const GraphQLArguments_ArgumentFragment = graphql(`
  fragment GraphQLArguments_ArgumentFragment on GraphQLArgument {
    name
    description
    type
    isDeprecated
    deprecationReason
  }
`);

export function GraphQLArguments(props: {
  parentCoordinate: string;
  args: FragmentType<typeof GraphQLArguments_ArgumentFragment>[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const args = useFragment(GraphQLArguments_ArgumentFragment, props.args);

  const { isDescriptionsVisible } = useDescriptionsVisibleToggle();

  return (
    <span className="ml-1 text-gray-400">
      <span>(</span>
      <div className="text-neutral-11 pl-4">
        {args.map(arg => {
          const coordinate = `${props.parentCoordinate}.${arg.name}`;
          return (
            <div key={arg.name}>
              <DeprecationNote deprecationReason={arg.deprecationReason}>
                <LinkToCoordinatePage
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  coordinate={coordinate}
                >
                  {arg.name}
                </LinkToCoordinatePage>
              </DeprecationNote>
              {': '}
              <GraphQLTypeAsLink
                className="font-medium"
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                type={arg.type}
              />
              {arg.description && isDescriptionsVisible && (
                <Description description={arg.description} />
              )}
            </div>
          );
        })}
      </div>
      <span>)</span>
    </span>
  );
}
