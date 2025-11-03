import { z } from 'zod';
import { AuthorOrId, staticImageDataSchema } from '../../authors';
import type { MdxFile, PageMapItem } from '../../mdx-types';

export const VideoPath = z
  .string()
  .regex(/^.+\.(webm|mp4)$/) as z.ZodType<`${string}.${'webm' | 'mp4'}`>;

export type VideoPath = z.infer<typeof VideoPath>;

export const BlogFrontmatter = z.object({
  authors: z.array(AuthorOrId),
  title: z.string(),
  date: z.string(),
  tags: z.union([z.string(), z.array(z.string())]),
  featured: z.boolean().optional(),
  image: z.union([VideoPath, staticImageDataSchema]).optional(),
  thumbnail: staticImageDataSchema.optional(),
  description: z.string().optional(),
});

export type BlogFrontmatter = z.infer<typeof BlogFrontmatter>;

export type BlogPostFile = Required<MdxFile<BlogFrontmatter>>;

export function isBlogPost(item: PageMapItem): item is BlogPostFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
