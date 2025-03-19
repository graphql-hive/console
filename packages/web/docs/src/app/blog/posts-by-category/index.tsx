'use client';

import { useSearchParams } from 'next/navigation';
import { BlogFrontmatter } from '../blog-types';
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

export function PostsByCategory({ allPosts }: { allPosts: BlogFrontmatter[] }) {
  const searchParams = useSearchParams();
  let category = searchParams.get('category');

  const categories = TOP_10_TAGS;

  let posts: BlogFrontmatter[];

  if (category && categories.includes(category)) {
    posts = allPosts.filter(post => post.tags.includes(category!));
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
