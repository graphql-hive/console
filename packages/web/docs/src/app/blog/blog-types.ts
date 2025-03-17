import { AuthorId } from '../../authors';

export interface BlogFrontmatter {
  author: AuthorId;
  title: string;
  date: string;
  href: string;
  category: string;
  featured?: boolean;
}
