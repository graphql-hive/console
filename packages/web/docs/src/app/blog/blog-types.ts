import type { StaticImageData } from 'next/image';
import { AuthorId } from '../../authors';
import { MdxFile, PageMapItem } from '../case-studies/case-study-types';

export interface BlogFrontmatter {
  authors: AuthorId | AuthorId[];
  title: string;
  date: string;
  tags: string | string[];
  featured?: boolean;
  image?: VideoPath | StaticImageData;
  thumbnail?: StaticImageData;
}

type VideoPath = `${string}.${'webm' | 'mp4'}`;

export type BlogPostFile = Required<MdxFile<BlogFrontmatter>>;

export function isBlogPost(item: PageMapItem): item is BlogPostFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
