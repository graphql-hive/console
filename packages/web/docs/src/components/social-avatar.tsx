'use client';

import { ReactElement } from 'react';
import ReactAvatar from 'react-avatar';

/**
 * TODO: We should drop this and use the avatars defined in authors/index.ts
 * for consistency with the team section on the landing page.
 */
export const SocialAvatar = ({
  author,
}: {
  author: { name: string; github?: string; twitter?: string };
}): ReactElement => {
  return (
    <ReactAvatar
      round
      githubHandle={author.github}
      twitterHandle={author.twitter}
      size="40"
      title={author.name}
      alt={author.name}
    />
  );
};
