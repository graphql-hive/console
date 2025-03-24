import type { getPageMap } from '@theguild/components/server';

/**
 * TODO: This type should be exported from `nextra` and `@theguild/components`
 */
export type MdxFile<FrontMatterType> = {
  name: string;
  route: string;
  frontMatter?: FrontMatterType;
};

/**
 * TODO: This should be exported from `nextra` and `@theguild/components`
 */
export type PageMapItem = Awaited<ReturnType<typeof getPageMap>>[number];
