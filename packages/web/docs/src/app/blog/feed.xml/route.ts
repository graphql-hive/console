import RSS from 'rss';
import { getPageMap } from '@theguild/components/server';
import { AuthorId, authors } from '../../../authors';
import { parseSchema } from '../../../lib/parse-schema';
import { pagesDepthFirst } from '../../../mdx-types';
import { CaseStudyFile } from '../../case-studies/case-study-types';
import { coerceCaseStudyToBlog } from '../../case-studies/coerce-case-studies-to-blogs';
import { BlogFrontmatter, BlogPostFile } from '../blog-types';

function getAuthor(frontmatterAuthors: BlogFrontmatter['authors']): string {
  const first = Array.isArray(frontmatterAuthors) ? frontmatterAuthors[0] : frontmatterAuthors;

  if (typeof first === 'string') {
    const author = authors[first as AuthorId];
    return author ? author.name : 'Unknown Author';
  }

  return first.name;
}

export const dynamic = 'force-static';
export const config = { runtime: 'edge' };

export async function GET() {
  let allPosts: RSS.ItemOptions[] = [];

  const [_meta, _indexPage, ...pages] = await getPageMap('/');
  for (const page of pagesDepthFirst(pages)) {
    const route = (page && 'route' in page && page.route) || '';
    const [dir, name] = route.split('/').filter(Boolean);
    if (!name) continue;
    switch (dir) {
      case 'blog':
      case 'product-updates':
        allPosts.push(toRssItem(parseSchema(page, BlogPostFile)));
        break;
      case 'case-studies':
        allPosts.push(toRssItem(coerceCaseStudyToBlog(parseSchema(page, CaseStudyFile))));
        break;
    }
  }

  if (allPosts.length === 0) {
    throw new Error('No blog posts found for RSS feed');
  }

  allPosts = allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const feed = new RSS({
    title: 'Hive Blog',
    site_url: 'https://the-guild.dev/graphql/hive/blog',
    feed_url: 'https://the-guild.dev/graphql/hive/blog/feed.xml',
  });

  for (const item of allPosts) {
    feed.item(item);
  }

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

function toRssItem(blogPost: BlogPostFile): RSS.ItemOptions {
  return {
    title: blogPost.frontMatter.title,
    date: new Date(blogPost.frontMatter.date),
    url: `https://the-guild.dev/graphql/hive${blogPost.route}`,
    description: blogPost.frontMatter.description ?? '',
    author: getAuthor(blogPost.frontMatter.authors),
    categories: Array.isArray(blogPost.frontMatter.tags)
      ? blogPost.frontMatter.tags
      : [blogPost.frontMatter.tags],
  };
}
