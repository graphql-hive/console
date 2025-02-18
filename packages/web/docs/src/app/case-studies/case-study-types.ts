import type { getPageMap } from '@theguild/components/server';

export type CaseStudyFrontmatter = {
  title: string;
  excerpt: string;
  category: string;
  authors: CaseStudyAuthor[];
};

export type CaseStudyAuthor = {
  name: string;
  position?: string;
  avatar?: string;
};

/**
 * TODO: This type should be exported from `nextra` and `@theguild/components`
 */
export type MdxFile<FrontMatterType> = {
  name: string;
  route: string;
  frontMatter?: FrontMatterType;
};

export type CaseStudyFile = Required<MdxFile<CaseStudyFrontmatter>>;

/**
 * TODO: This should be exported from `nextra` and `@theguild/components`
 */
export type PageMapItem = Awaited<ReturnType<typeof getPageMap>>[number];
