import type { SchemaChangeResolvers } from './../../../__generated__/types';

export function toTitleCase(str: string) {
  return str.toLowerCase().replace(/^_*(.)|_+(.)/g, (_, c: string, d: string) => {
    return (c ?? d).toUpperCase();
  });
}

export const SchemaChange: Pick<SchemaChangeResolvers, 'meta'> = {
  meta: ({ meta, type }, _arg, _ctx) => {
    // @todo consider validating
    return {
      __typename: toTitleCase(type),
      ...(meta as any),
    };
  },
};
