import { ArrowIcon, cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { isBlogPost } from '../../../blog-types';
import { SimilarPostsClient } from './client';

export async function SimilarPosts({ className }: { className?: string }) {
  // We're overfetching all posts here, because Nextra doesn't allow us
  // to get the current post frontmatter on the server, and we need it to
  // filter the similar posts. This could be worked around by moving the
  // code to a remark/rehype plugin layer, but it seems like an overkill.
  // We can optimize this later.
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/blog');
  const sortedPosts = pageMap
    .filter(isBlogPost)
    .sort((a, b) => new Date(b.frontMatter.date).getTime() - new Date(a.frontMatter.date).getTime())
    .slice(
      0,
      // This is an assumption that 100 posts is enough to find similar ones.
      // Worst case we'll not render the section if there's no similar post.
      100,
    );

  return (
    <section
      className={cn(
        'flex items-stretch gap-4 py-6 *:flex-1 max-md:flex-col sm:gap-6 lg:p-24',
        'has-[del]:hidden',
        className,
      )}
    >
      <div className="text-green-1000 md:max-w-[36%] dark:text-neutral-100">
        <header className="flex items-center justify-between max-md:justify-center">
          <Heading size="md" as="h3">
            Explore
          </Heading>
          <ArrowIcon className="ml-2 size-12 shrink-0 max-md:hidden" />
        </header>
        <p className="mt-4 max-md:text-center">Dive deeper into related topics.</p>
      </div>
      <SimilarPostsClient sortedPosts={sortedPosts} />
    </section>
  );
}
