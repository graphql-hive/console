import { useEffect, useState } from 'react';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DeprecationNote, Description, GraphQLTypeAsLink, LinkToCoordinatePage } from './common';
import { useArgumentListToggle } from './provider';

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
  styleDeprecated: boolean;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const args = useFragment(GraphQLArguments_ArgumentFragment, props.args);

  const [isCollapsedGlobally] = useArgumentListToggle();
  const [collapsed, setCollapsed] = useState(isCollapsedGlobally);
  const hasMoreThanTwo = args.length > 2;
  const showAll = hasMoreThanTwo && !collapsed;

  useEffect(() => {
    setCollapsed(isCollapsedGlobally);
  }, [isCollapsedGlobally, setCollapsed]);

  if (showAll) {
    return (
      <span className="ml-1 text-gray-500">
        <span>(</span>
        <div className="pl-4 text-gray-500">
          {args.map(arg => {
            const coordinate = `${props.parentCoordinate}.${arg.name}`;
            return (
              <div key={arg.name}>
                <DeprecationNote
                  styleDeprecated={props.styleDeprecated}
                  deprecationReason={arg.deprecationReason}
                >
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
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                  type={arg.type}
                />
                {arg.description ? <Description description={arg.description} /> : null}
              </div>
            );
          })}
        </div>
        <span>)</span>
      </span>
    );
  }

  return (
    <span className="ml-1 text-gray-500">
      <span>(</span>
      <span className="space-x-2">
        {args.slice(0, 2).map(arg => {
          const coordinate = `${props.parentCoordinate}.${arg.name}`;
          return (
            <span key={arg.name}>
              <DeprecationNote
                styleDeprecated={props.styleDeprecated}
                deprecationReason={arg.deprecationReason}
              >
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
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
                type={arg.type}
              />
            </span>
          );
        })}
        {hasMoreThanTwo ? (
          <span
            className="cursor-pointer rounded bg-gray-900 p-1 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={() => setCollapsed(prev => !prev)}
          >
            {args.length - 2} hidden
          </span>
        ) : null}
      </span>
      <span>)</span>
    </span>
  );
}
