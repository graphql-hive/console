import { Heading } from '@theguild/components';
import { BlogCard } from '../blog-card';
import { BlogFrontmatter } from '../blog-types';

export function LatestPosts({ posts, category }: { posts: BlogFrontmatter[]; category?: string }) {
  return (
    <section className="py-6 sm:pt-24">
      <Heading size="md" as="h2" className="text-center">
        Latest posts {category ? `in ${category}` : ''}
      </Heading>
      <ul className="mt-6 flex gap-4 max-md:flex-col sm:gap-6 md:mt-16">
        {posts.map(post => {
          return (
            <li key={post.title} className="basis-1/3">
              <BlogCard frontmatter={post} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
