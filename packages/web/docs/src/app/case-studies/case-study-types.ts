import type { MdxFile } from '../../mdx-types';

export type CaseStudyFrontmatter = {
  title: string;
  excerpt: string;
  category: string;
  authors: CaseStudyAuthor[];
  /**
   * YYYY-MM-DD
   */
  date: `${number}-${number}-${number}`;
};

export type CaseStudyAuthor = {
  name: string;
  position?: string;
  avatar?: string;
};

export type CaseStudyFile = Required<MdxFile<CaseStudyFrontmatter>>;
