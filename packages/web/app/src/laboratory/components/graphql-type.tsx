import {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  type GraphQLInputType,
  type GraphQLOutputType,
} from 'graphql';

export const GraphQLType = (props: {
  type: GraphQLOutputType | GraphQLInputType;
  className?: string;
}) => {
  if (props.type instanceof GraphQLNonNull) {
    return (
      <span>
        <GraphQLType type={props.type.ofType} />
        <span className="text-neutral-10!">!</span>
      </span>
    );
  }

  if (props.type instanceof GraphQLList) {
    return (
      <span>
        <span className="text-neutral-10!">[</span>
        <GraphQLType type={props.type.ofType} />
        <span className="text-neutral-10!">]</span>
      </span>
    );
  }

  if (props.type instanceof GraphQLScalarType || props.type instanceof GraphQLEnumType) {
    return <span className="text-teal-400">{props.type.name}</span>;
  }

  return <span className="text-amber-400">{props.type.name}</span>;
};
