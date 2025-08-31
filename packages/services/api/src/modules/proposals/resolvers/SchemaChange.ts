import type { SchemaChangeResolvers } from './../../../__generated__/types';

export const SchemaChange: Pick<SchemaChangeResolvers, 'meta' | '__isTypeOf'> = {
  meta: ({ meta }, _arg, _ctx) => {
    // @todo consider validating
    return meta as any;
  },
};
