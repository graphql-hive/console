import { JSONObjectResolver } from 'graphql-scalars';

// `scalar JSON` in `module.graphql.ts` does not have a description
// and it messes up the static analysis
JSONObjectResolver.description = undefined;

export const JSONObject = JSONObjectResolver;
