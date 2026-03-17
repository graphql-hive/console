'use client';

import { ZodType, ZodTypeDef } from 'zod';
import { useConfig } from '@theguild/components';
import { parseSchema } from '../lib/parse-schema';

/**
 * Dima said there's no possible way to access frontmatter imperatively
 * from a server component in Nextra, so we have a hook for client components.
 */
export function useFrontmatter<TInput, TZodDef extends ZodTypeDef = ZodTypeDef, TOutput = TInput>(
  schema: ZodType<TInput, TZodDef, TOutput>,
) {
  const normalizePagesResult = useConfig().normalizePagesResult;
  const frontmatter = normalizePagesResult.activeMetadata;
  const name = normalizePagesResult.activePath.at(-1)?.name;

  if (!name) {
    throw new Error('unexpected');
  }

  return {
    frontmatter: parseSchema(frontmatter, schema),
    name,
  };
}
