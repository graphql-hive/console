import type { MutationResolvers } from '../../../../__generated__/types';

export const replyToSchemaProposalReview: NonNullable<
  MutationResolvers['replyToSchemaProposalReview']
> = async (_parent, { input: { body, schemaProposalReviewId } }, { session }) => {
  const user = await session.getViewer();
  // @todo
  console.log(body, schemaProposalReviewId);
  return {
    author: user.displayName ?? user.fullName,
  } as any /** @todo */;
};
