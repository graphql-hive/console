import { cn } from '@theguild/components';
import { BlogPostFile } from '../../blog-types';
import { BlogCard } from '../blog-card';

export function FeaturedPosts({ posts, className }: { posts: BlogPostFile[]; className?: string }) {
  const featuredPosts = posts.filter(post => post.frontMatter.featured).slice(0, 3);

  return (
    <ul
      className={cn(
        'mt-6 grid grid-cols-1 gap-4 sm:grid sm:grid-cols-2 sm:gap-6 md:mt-16 lg:grid-cols-3',
        className,
      )}
    >
      {featuredPosts.map(post => (
        <li key={post.route}>
          <BlogCard post={post} className="h-full" colorScheme="featured" />
        </li>
      ))}
    </ul>
  );
}
