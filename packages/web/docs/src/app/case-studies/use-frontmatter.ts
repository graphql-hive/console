'use client';

import { useConfig } from '@theguild/components';
import { CaseStudyFrontmatter } from './case-study-types';

/**
 * TODO: Lobby Dima to add an imperative way to do this in a server component.
 */
export function useFrontmatter() {
  const normalizePagesResult = useConfig().normalizePagesResult;
  const frontmatter = normalizePagesResult.activeMetadata as CaseStudyFrontmatter;
  const name = normalizePagesResult.activePath.at(-1)?.name;

  if (!name) {
    throw new Error('unexpected');
  }

  return {
    frontmatter,
    name,
  };
}
