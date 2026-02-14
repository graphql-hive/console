import { z } from 'zod';
import { AuthorOrId, staticImageDataSchema } from '../../authors';
import { MdxFile } from '../../mdx-types';

export const VideoPath = z
  .string()
  .regex(/^.+\.(webm|mp4)$/) as z.ZodType<`${string}.${'webm' | 'mp4'}`>;

export const ImagePath = z
  .string()
  .regex(
    /^.+\.(webp|png|jpg|jpeg|gif|svg)$/,
  ) as z.ZodType<`${string}.${'webp' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'svg'}`>;

export type VideoPath = z.infer<typeof VideoPath>;
export type ImagePath = z.infer<typeof ImagePath>;
export const BlogFrontmatter = z.object({
  authors: z.union([z.array(AuthorOrId), AuthorOrId]),
  title: z.string(),
  date: z.string(),
  tags: z.union([z.string(), z.array(z.string())]),
  featured: z.boolean().optional(),
  image: z.union([VideoPath, ImagePath, staticImageDataSchema]).optional(),
  thumbnail: staticImageDataSchema.optional(),
  description: z.string().optional(),
});

export type BlogFrontmatter = z.infer<typeof BlogFrontmatter>;

export const BlogPostFile = MdxFile(BlogFrontmatter);
export type BlogPostFile = z.infer<typeof BlogPostFile>;
