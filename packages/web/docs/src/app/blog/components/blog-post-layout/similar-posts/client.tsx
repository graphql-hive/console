'use client';

import { useFrontmatter } from '#components/use-frontmatter';
import { BlogFrontmatter, BlogPostFile } from '../../../blog-types';
import { BlogCard } from '../../blog-card';

export function SimilarPostsClient({ sortedPosts }: { sortedPosts: BlogPostFile[] }) {
  const { frontmatter } = useFrontmatter<BlogFrontmatter>();
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];

  const postsToShow = [];
  const intersectedTags: string[] = [];

  for (let i = 0; i < sortedPosts.length && postsToShow.length < 2; i++) {
    const post = sortedPosts[i];
    if (post.frontMatter.title !== frontmatter.title) {
      const postTags = Array.isArray(post.frontMatter.tags)
        ? post.frontMatter.tags
        : [post.frontMatter.tags];

      const tagsInCommon = postTags.filter(tag => tags.includes(tag));
      if (tagsInCommon.length > 0) {
        postsToShow.push(post);
        intersectedTags.push(tagsInCommon[0]);
      }
    }
  }

  if (postsToShow.length === 0) {
    // We need the CSS in the server component to know we didn't find any similar posts.
    return <del />;
  }

  return postsToShow.map((post, i) => (
    <BlogCard key={i} post={post} className="h-full" tag={intersectedTags[i]} />
  ));
}
