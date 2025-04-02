import type { MdxFile } from '../../mdx-types';

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

export type CaseStudyFile = Required<MdxFile<CaseStudyFrontmatter>>;
