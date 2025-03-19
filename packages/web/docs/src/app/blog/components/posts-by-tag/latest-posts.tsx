import { Heading } from '@theguild/components';
import { BlogPostFile } from '../../blog-types';
import { BlogCard } from '../blog-card';

// import { prettyPrintTag } from '../pretty-print-tag';

export function LatestPosts({ posts, tag }: { posts: BlogPostFile[]; tag: string | null }) {
  return (
    <section className="sm:pt-12">
      <Heading size="md" as="h2" className="text-center">
        Latest posts
        {/* Probably redundant, but I wanted to consult designers. */}
        {/* {' '} */}
        {/* {tag ? (
          <>
            in{' '}
            <span
            // className="text-green-1000 inline-block rounded-2xl bg-gradient-to-r from-blue-300 to-blue-500 px-3 py-2"
            >
              {prettyPrintTag(tag)}
            </span>
          </>
        ) : (
          ''
        )} */}
      </Heading>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid sm:grid-cols-2 sm:gap-6 md:mt-16 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map(post => {
          return (
            <li key={post.route} className="basis-1/3">
              <BlogCard post={post} tag={tag} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
