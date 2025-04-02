import { cn } from '@theguild/components';
import { BlogPostFile } from '../../blog-types';
import { BlogCard } from '../blog-card';

export function FeaturedPosts({
  posts,
  tag,
  className,
}: {
  posts: BlogPostFile[];
  tag: string | null;
  className?: string;
}) {
  const featuredPosts = posts.filter(post => post.frontMatter.featured).slice(0, 3);

  if (featuredPosts.length === 0) {
    return null;
  }

  return (
    <ul
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3',
        className,
      )}
    >
      {featuredPosts.map(post => (
        <li key={post.route}>
          <BlogCard post={post} className="h-full" variant="featured" tag={tag} />
        </li>
      ))}
    </ul>
  );
}
