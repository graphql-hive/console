import { NextPageProps } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { parseSchema } from '../../../../lib/parse-schema';
import { BlogPostFile } from '../../blog-types';
import { PostsByTag } from '../../components/posts-by-tag';

export async function generateMetadata({ params }: NextPageProps<'tag'>) {
  return {
    title: `Hive Blog - ${(await params).tag}`,
  };
}

export default async function BlogTagPage(props: NextPageProps<'tag'>) {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/blog');
  const allPosts = pageMap.map(x => parseSchema(x, BlogPostFile));
  const tag = (await props.params).tag;
  const posts = allPosts.filter(post => post.frontMatter.tags.includes(tag));

  return <PostsByTag posts={posts} tag={tag} />;
}

export async function generateStaticParams() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/blog');
  const allPosts = pageMap.map(x => parseSchema(x, BlogPostFile));
  const tags = allPosts.flatMap(post => post.frontMatter.tags);
  const uniqueTags = [...new Set(tags)];
  return uniqueTags.map(tag => ({ tag }));
}
