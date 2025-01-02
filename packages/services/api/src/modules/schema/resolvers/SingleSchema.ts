import type { SingleSchemaResolvers } from './../../../__generated__/types';

export const SingleSchema: SingleSchemaResolvers = {
  __isTypeOf: obj => {
    return obj.kind === 'single';
  },
  source: schema => {
    return schema.sdl;
  },
};
