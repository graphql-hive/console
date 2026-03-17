import { Author } from '../../authors';
import { BlogFrontmatter, BlogPostFile } from '../blog/blog-types';
import { CaseStudyFile } from './case-study-types';

export function coerceCaseStudiesToBlogs(caseStudies: CaseStudyFile[]): BlogPostFile[] {
  return caseStudies.map(coerceCaseStudyToBlog);
}

export function coerceCaseStudyToBlog(caseStudy: CaseStudyFile): BlogPostFile {
  return {
    ...caseStudy,
    frontMatter: {
      ...caseStudy.frontMatter,
      tags: ['Case Study'],
      authors: caseStudy.frontMatter.authors.map(
        (author): Author => ({
          name: author.name,
          avatar: author.avatar,
          link: '' as 'https://',
          github: '',
        }),
      ),
    } satisfies BlogFrontmatter,
  };
}
