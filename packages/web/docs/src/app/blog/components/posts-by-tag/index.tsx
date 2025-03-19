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

export function PostsByTag(props: { posts: BlogPostFile[]; tag?: string; className?: string }) {
  const { posts, className } = props;
  const tag = props.tag ?? null;

  return (
    <section className={cn('px-4 sm:px-6', className)}>
      <CategorySelect tag={tag} categories={TOP_10_TAGS} />
      <FeaturedPosts posts={posts} className="sm:mb-12" tag={tag} />
      <LatestPosts posts={posts} tag={tag} />
    </section>
  );
}
