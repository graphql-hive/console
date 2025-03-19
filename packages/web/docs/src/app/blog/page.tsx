import { getPageMap } from '@theguild/components/server';
import { isBlogPost } from './blog-types';
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
  const allPosts = pageMap.filter(isBlogPost);

  return (
    <BlogPageLayout>
      <PostsByTag posts={allPosts} />
    </BlogPageLayout>
  );
}
