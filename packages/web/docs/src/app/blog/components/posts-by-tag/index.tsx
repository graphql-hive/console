import { cn } from '@theguild/components';
import { BlogPostFile } from '../../blog-types';
import { CategorySelect } from './category-select';
import { FeaturedPosts } from './featured-posts';
import { LatestPosts } from './latest-posts';

const TOP_10_TAGS = [
  'graphql',
  'graphql-federation',
  'codegen',
  'typescript',
  'react',
  'graphql-hive',
  'node',
  'graphql-modules',
  'angular',
  'graphql-tools',
];

export function PostsByTag({
  posts,
  tag,
  className,
}: {
  posts: BlogPostFile[];
  tag?: string;
  className?: string;
}) {
  return (
    <section className={cn('px-4 sm:px-6', className)}>
      <CategorySelect currentCategory={tag ?? null} categories={TOP_10_TAGS} />
      <FeaturedPosts posts={posts} className="sm:mb-12" />
      <LatestPosts posts={posts} />
    </section>
  );
}
