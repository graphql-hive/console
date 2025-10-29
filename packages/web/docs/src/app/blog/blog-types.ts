import type { StaticImageData } from 'next/image';
import type { Author, AuthorId } from '../../authors';
import type { MdxFile, PageMapItem } from '../../mdx-types';

type OneOrMany<T> = T | T[];

export interface BlogFrontmatter {
  authors: OneOrMany<AuthorId | Author>;
  title: string;
  date: string;
  tags: string | string[];
  featured?: boolean;
  image?: VideoPath | StaticImageData;
  thumbnail?: StaticImageData;
  description?: string;
}

type VideoPath = `${string}.${'webm' | 'mp4'}`;

export type BlogPostFile = Required<MdxFile<BlogFrontmatter>>;

export function isBlogPost(item: PageMapItem): item is BlogPostFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
