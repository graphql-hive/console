import { z } from 'zod';
import { parseSchema } from '../../lib/parse-schema';
import { MdxFile, PageMapItem } from '../../mdx-types';

export const CaseStudyAuthor = z.object({
  name: z.string(),
  position: z.string().optional(),
  avatar: z.string().optional(),
});

export type CaseStudyAuthor = z.infer<typeof CaseStudyAuthor>;

export const CaseStudyFrontmatter = z.object({
  title: z.string(),
  excerpt: z.string(),
  category: z.string(),
  authors: z.array(CaseStudyAuthor).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) as z.ZodType<
    `${number}-${number}-${number}`,
    { description: 'date in YYYY-MM-DD format' }
  >,
});

export type CaseStudyFrontmatter = z.infer<typeof CaseStudyFrontmatter>;

export const CaseStudyFile = MdxFile(CaseStudyFrontmatter);
export type CaseStudyFile = z.infer<typeof CaseStudyFile>;
