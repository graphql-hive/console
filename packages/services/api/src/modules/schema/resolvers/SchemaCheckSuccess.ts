import type { SchemaCheckSuccessResolvers } from './../../../__generated__/types';

export const SchemaCheckSuccess: SchemaCheckSuccessResolvers = {
  __isTypeOf: obj => {
    return obj.valid;
  },
};
