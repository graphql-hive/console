import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposals: NonNullable<QueryResolvers['schemaProposals']> = async (
  _parent,
  _arg,
  _ctx,
) => {
  /* Implement Query.schemaProposals resolver logic here */
  const edges = Array.from({ length: 10 })
    .map(() => ({
      cursor: crypto.randomUUID(),
      node: {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        stage: 'DRAFT' as const,
        updatedAt: Date.now(),
        title: 'Add user types to registration service.',
        user: {
          displayName: 'jdolle',
          fullName: 'Jeff Dolle',
          id: crypto.randomUUID(),
        } as any,
        commentsCount: 7,
      },
    }));

  return {
    edges: edges.map((e: any, i) => {
      if (i == 2) {
        return {
          ...e,
          node: {
            ...e.node,
            title: 'Does some other things as well as this has a long time that should be truncated. So let\'s see what happens',
            stage: 'OPEN' as const,
            commentsCount: 3,
            user: {
              ...e.node.user,
            }
          },
        }
      }
      return e;
    }),
    pageInfo: {
      endCursor: '',
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: '',
    },
  } as any;
};
