import { AuthorId } from '../../authors';
import { MdxFile, PageMapItem } from '../case-studies/case-study-types';

export interface BlogFrontmatter {
  authors: AuthorId | AuthorId[];
  title: string;
  date: string;
  tags: string | string[];
  featured?: boolean;
}

export type BlogPostFile = Required<MdxFile<BlogFrontmatter>>;

export function isBlogPost(item: PageMapItem): item is BlogPostFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
