import { AuthorId } from '../../authors';
import { MdxFile, PageMapItem } from '../case-studies/case-study-types';

export interface BlogFrontmatter {
  authors: AuthorId[];
  title: string;
  date: string;
  href: string;
  tags: string[];
  featured?: boolean;
}

export type BlogPostFile = Required<MdxFile<BlogFrontmatter>>;

export function isBlogPost(item: PageMapItem): item is BlogPostFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
