import { GraphQLScalarType, Kind } from 'graphql';

const KindValues = Object.values(Kind);

export const GraphQLKind = new GraphQLScalarType({
  name: 'GraphQLKind',
  description: 'GraphQLKind description',
  serialize: value => {
    if (typeof value === 'string' && KindValues.includes(value as Kind)) {
      return value;
    }
    throw new Error('GraphQLKind scalar expects a valid Kind.');
  },
  parseValue: value => {
    if (typeof value === 'string' && KindValues.includes(value as Kind)) {
      return value;
    }
    throw new Error('GraphQLKind scalar expects a valid Kind.');
  },
  parseLiteral: ast => {
    if (ast.kind === Kind.STRING && KindValues.includes(ast.value as Kind)) {
      return ast.value;
    }
    return null;
  },
});
