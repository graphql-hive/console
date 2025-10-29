// eslint-disable-next-line import/no-extraneous-dependencies
import RSS from 'rss';
import { getPageMap } from '@theguild/components/server';
import { Author, AuthorId, authors } from '../../../authors';
import { CaseStudyFile } from '../../case-studies/case-study-types';
import { coerceCaseStudiesToBlogs } from '../../case-studies/coerce-case-studies-to-blogs';
import { isCaseStudy } from '../../case-studies/isCaseStudyFile';
import { BlogFrontmatter, BlogPostFile, isBlogPost } from '../blog-types';

function getAuthor(frontmatterAuthors: BlogFrontmatter['authors']): string {
  const first = Array.isArray(frontmatterAuthors) ? frontmatterAuthors[0] : frontmatterAuthors;

  if (typeof first === 'string') {
    const author = authors[first as AuthorId];
    return author ? author.name : 'Unknown Author';
  }

  return first.name;
}

export async function GET() {
  let allPosts: RSS.ItemOptions[] = [];

  const [, , ...blogs] = await getPageMap('/blog');
  const [, , ...studies] = await getPageMap('/case-studies');
  const [, , ...updates] = await getPageMap('/product-updates');

  const studiesAsBlogs = coerceCaseStudiesToBlogs(studies.filter(isCaseStudy));

  for (const items of [blogs.filter(isBlogPost), updates.filter(isBlogPost), studiesAsBlogs]) {
    allPosts = allPosts.concat(
      items.map(
        (item): RSS.ItemOptions => ({
          title: item.frontMatter.title,
          date: new Date(item.frontMatter.date),
          url: `https://the-guild.dev/graphql/hive${item.route}`,
          description: item.frontMatter.description ?? '',
          author: getAuthor(item.frontMatter.authors),
          categories: Array.isArray(item.frontMatter.tags)
            ? item.frontMatter.tags
            : [item.frontMatter.tags],
        }),
      ),
    );
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

export const dynamic = 'force-static';
export const config = { runtime: 'edge' };
