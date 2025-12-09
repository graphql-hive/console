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
        <span className="!text-muted-foreground">!</span>
      </span>
    );
  }

  if (props.type instanceof GraphQLList) {
    return (
      <span>
        <span className="!text-muted-foreground">[</span>
        <GraphQLType type={props.type.ofType} />
        <span className="!text-muted-foreground">]</span>
      </span>
    );
  }

  if (props.type instanceof GraphQLScalarType || props.type instanceof GraphQLEnumType) {
    return <span className="text-teal-500 dark:text-teal-400">{props.type.name}</span>;
  }

  return <span className="text-amber-500 dark:text-amber-400">{props.type.name}</span>;
};
