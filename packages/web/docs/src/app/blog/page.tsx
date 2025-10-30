import { getPageMap } from '@theguild/components/server';
import type { Author } from '../../authors';
import { CaseStudyFile } from '../case-studies/case-study-types';
import { getCaseStudies } from '../case-studies/get-case-studies';
import { BlogFrontmatter, BlogPostFile, isBlogPost } from './blog-types';
import { NewsletterFormCard } from './components/newsletter-form-card';
import { PostsByTag } from './components/posts-by-tag';
// We can't move this page to `(index)` dir together with `tag` page because Nextra crashes for
// some reason. It will cause an extra rerender on first navigation to a tag page, which isn't
// great, but it's not terrible.
import BlogPageLayout from './tag/layout';

export const metadata = {
  title: 'Hive Blog',
};

export default async function BlogPage() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/blog');

  const caseStudies = await getCaseStudies().then(coerceCaseStudiesToBlogs);

  const allPosts = pageMap.filter(isBlogPost).concat(caseStudies);

  return (
    <BlogPageLayout>
      <PostsByTag posts={allPosts}>
        <NewsletterFormCard />
      </PostsByTag>
    </BlogPageLayout>
  );
}

function coerceCaseStudiesToBlogs(caseStudies: CaseStudyFile[]): BlogPostFile[] {
  return caseStudies.map(caseStudy => ({
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
  }));
}
