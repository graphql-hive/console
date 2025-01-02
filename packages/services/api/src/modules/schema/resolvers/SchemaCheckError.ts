import type { SchemaCheckErrorResolvers } from './../../../__generated__/types';

export const SchemaCheckError: SchemaCheckErrorResolvers = {
  __isTypeOf: obj => {
    return !obj.valid;
  },
};
