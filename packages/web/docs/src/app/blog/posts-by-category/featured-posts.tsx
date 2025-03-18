import { BlogCard } from '../blog-card';
import { BlogFrontmatter } from '../blog-types';

export function FeaturedPosts({ posts }: { posts: BlogFrontmatter[] }) {
  const featuredPosts = posts.filter(post => post.featured).slice(0, 3);

  return (
    <ul className="mt-6 flex items-stretch gap-4 *:flex-1 max-md:flex-col sm:gap-6 lg:mt-16">
      {featuredPosts.map(post => (
        <li key={post.href}>
          <BlogCard frontmatter={post} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
