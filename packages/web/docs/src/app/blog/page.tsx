import { getPageMap } from '@theguild/components/server';
import { coerceCaseStudiesToBlogs } from '../case-studies/coerce-case-studies-to-blogs';
import { getCaseStudies } from '../case-studies/get-case-studies';
import { isBlogPost } from './blog-types';
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
  const [, , ...productUpdates] = await getPageMap('/product-updates');

  const caseStudies = await getCaseStudies().then(coerceCaseStudiesToBlogs);

  const allPosts = pageMap
    .filter(isBlogPost)
    .concat(caseStudies)
    .concat(
      productUpdates
        .filter(isBlogPost)
        .map(post => ((post.frontMatter.tags ||= ['Product Update']), post)),
    );

  return (
    <BlogPageLayout>
      <PostsByTag posts={allPosts}>
        <NewsletterFormCard />
      </PostsByTag>
    </BlogPageLayout>
  );
}
