import { Heading } from '@theguild/components';
import { BlogPostFile } from '../../blog-types';
import { BlogCard } from '../blog-card';
import { prettyPrintTag } from '../pretty-print-tag';

export function LatestPosts({
  posts,
  tag,
  children,
}: {
  posts: BlogPostFile[];
  tag: string | null;
  children?: React.ReactNode;
}) {
  // it needs to be 12, because we have 2/3/4 column layouts
  const itemsInFirstSection = children ? 11 : 12;
  const firstTwelve = posts.slice(0, itemsInFirstSection);
  const rest = posts.slice(itemsInFirstSection);

  const firstSection = firstTwelve.map(post => (
    <li key={post.route} className="*:h-full">
      <BlogCard post={post} tag={tag} />
    </li>
  ));

  if (children) {
    firstSection.splice(7, 0, <li key="extra">{children}</li>);
  }

  return (
    <section className="pt-6 sm:pt-12">
      <Heading size="md" as="h2" className="text-center">
        Latest posts
        {tag ? (
          <>
            {' '}
            in <span>{prettyPrintTag(tag)}</span>
          </>
        ) : (
          ''
        )}
      </Heading>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid sm:grid-cols-2 sm:gap-6 md:mt-16 lg:grid-cols-3 xl:grid-cols-4">
        {firstSection}
      </ul>
      <details className="mt-8 sm:mt-12">
        <summary className="bg-beige-200 text-green-1000 border-beige-300 hover:bg-beige-300 hive-focus mx-auto w-fit cursor-pointer select-none list-none rounded-lg border px-4 py-2 hover:border-current dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 [&::marker]:hidden [[open]>&]:mb-8 [[open]>&]:sm:mb-12">
          <span className="[[open]_&]:hidden">Show more</span>
          <span className="hidden [[open]_&]:inline">Hide posts</span>
        </summary>

        <ul className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {rest.map(post => {
            return (
              <li key={post.route} className="*:h-full">
                <BlogCard post={post} tag={tag} />
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
