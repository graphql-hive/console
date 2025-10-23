// eslint-disable-next-line import/no-extraneous-dependencies
import RSS from 'rss';
import { getPageMap } from '@theguild/components/server';
import { AuthorId, authors } from '../../../authors';
import { BlogFrontmatter, isBlogPost } from '../blog-types';

function getAuthor(frontmatterAuthors: BlogFrontmatter['authors']): string {
  const first = Array.isArray(frontmatterAuthors) ? frontmatterAuthors[0] : frontmatterAuthors;

  if (typeof first === 'string') {
    const author = authors[first as AuthorId];
    return author ? author.name : 'Unknown Author';
  }

  return first.name;
}

export async function GET() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/blog');
  const allPosts = pageMap
    .filter(isBlogPost)
    .map(
      item =>
        ({
          title: item.frontMatter.title,
          date: new Date(item.frontMatter.date),
          url: `https://the-guild.dev/graphql/hive${item.route}`,
          description: (item.frontMatter as any).description ?? '',
          author: getAuthor(item.frontMatter.authors),
          categories: Array.isArray(item.frontMatter.tags)
            ? item.frontMatter.tags
            : [item.frontMatter.tags],
        }) satisfies RSS.ItemOptions,
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

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

export const dynamic = 'force-static';
export const config = { runtime: 'edge' };
