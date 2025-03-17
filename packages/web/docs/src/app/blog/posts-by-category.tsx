import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn, Heading } from '@theguild/components';
import { BlogCard } from './blog-card';
import { BlogFrontmatter } from './blog-types';

export function PostsByCategory() {
  const searchParams = useSearchParams();
  let category = searchParams.get('category');

  // todo: get this from Nextra
  const allPosts: BlogFrontmatter[] = [];

  const categories = Array.from(new Set(allPosts.map(post => post.category)));
  let posts: BlogFrontmatter[];

  if (category && categories.includes(category)) {
    posts = allPosts.filter(post => post.category === category);
  } else {
    posts = allPosts;
    category = null;
  }

  return (
    <section>
      <CategorySelect currentCategory={category} categories={categories} />
      <FeaturedPosts posts={posts} />
      <LatestPosts posts={posts} />
    </section>
  );
}

function CategorySelect({
  currentCategory,
  categories,
}: {
  currentCategory: string | null;
  categories: string[];
}) {
  return (
    <ul>
      <li>
        <CategoryFilterLink category={null} currentCategory={currentCategory} />
      </li>
      {categories.map(category => (
        <li key={category}>
          <CategoryFilterLink category={category} currentCategory={currentCategory} />
        </li>
      ))}
    </ul>
  );
}

function CategoryFilterLink({
  category,
  currentCategory,
}: {
  category: string | null;
  currentCategory: string | null;
}) {
  return (
    <Link
      href={{ search: category ? `category=${category}` : '' }}
      className={cn(
        'rounded-full px-3 py-1',
        currentCategory === category && 'bg-gray-100 text-gray-900', // todo: actual styles
      )}
    >
      {category}
    </Link>
  );
}

function FeaturedPosts({ posts }: { posts: BlogFrontmatter[] }) {
  const featuredPosts = posts.filter(post => post.featured).slice(0, 3);

  return (
    <ul className="mt-6 flex items-stretch gap-4 *:flex-1 max-md:flex-col sm:gap-6 lg:mt-16">
      {featuredPosts.map(post => (
        <li key={post.href}>
          <BlogCard {...post} className="h-full" />
        </li>
      ))}
    </ul>
  );
}

function LatestPosts({ posts, category }: { posts: BlogFrontmatter[]; category?: string }) {
  return (
    <section className="py-6 sm:pt-24">
      <Heading size="md" as="h2" className="text-center">
        Latest posts {category ? `in ${category}` : ''}
      </Heading>
      <ul className="mt-6 flex gap-4 max-md:flex-col sm:gap-6 md:mt-16">
        {posts.map(post => {
          return (
            <li key={post.title} className="basis-1/3">
              <BlogCard {...post} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
