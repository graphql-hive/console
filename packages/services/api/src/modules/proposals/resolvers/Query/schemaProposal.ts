import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaProposal: NonNullable<QueryResolvers['schemaProposal']> = async (
  _parent,
  { input: { id } },
  _ctx,
) => {
  /* Implement Query.schemaProposal resolver logic here */
  return {
    createdAt: Date.now(),
    id,
    stage: 'OPEN',
    updatedAt: Date.now(),
    commentsCount: 5,
    title: 'This adds some stuff to the thing.',
    user: {
      id: 'asdffff',
      displayName: 'jdolle',
      fullName: 'Jeff Dolle',
      email: 'jdolle+test@the-guild.dev',
    },
    reviews: {
      edges: [
        {
          cursor: 'asdf',
          node: {
            id: '1',
            comments: {
              pageInfo: {
                endCursor: crypto.randomUUID(),
                startCursor: crypto.randomUUID(),
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: crypto.randomUUID(),
                  node: {
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    body: 'This is a comment. The first comment.',
                    updatedAt: Date.now(),
                  }
                }
              ]
            },
            createdAt: Date.now(),
            lineText: 'type User {',
            lineNumber: 2,
            stageTransition: 'OPEN',
          },
        },
      ],
      pageInfo: {
        startCursor: 'asdf',
        endCursor: 'wxyz',
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };
};
