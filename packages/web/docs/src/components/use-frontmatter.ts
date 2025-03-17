'use client';

import { useConfig } from '@theguild/components';

/**
 * Dima said there's no possible way to access frontmatter imperatively
 * from a server component in Nextra, so we have a hook for client components.
 */
export function useFrontmatter<
  // this is unsafe, but we're in a blog, and the frontmatter type is
  // controlled by us. if it crashes, we can just fix the frontmatter in markdown
  TFrontmatter,
>() {
  const normalizePagesResult = useConfig().normalizePagesResult;
  const frontmatter = normalizePagesResult.activeMetadata as TFrontmatter;
  const name = normalizePagesResult.activePath.at(-1)?.name;

  if (!name) {
    throw new Error('unexpected');
  }

  return {
    frontmatter,
    name,
  };
}
