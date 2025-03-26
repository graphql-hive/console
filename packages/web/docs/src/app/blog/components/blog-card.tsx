import Image from 'next/image';
import { Anchor, cn } from '@theguild/components';
import { Author, AuthorId, authors } from '../../../authors';
import { BlogPostFile } from '../blog-types';
import { BlogTagChip } from './blog-tag-chip';

export interface BlogCardProps {
  post: Pick<BlogPostFile, 'frontMatter' | 'route'>;
  className?: string;
  variant?: 'default' | 'featured';
  /**
   * The tag to display on the card. If not provided, the first tag will be used.
   * Used for tag index page, where we want to show all cards with the same tag.
   */
  tag?: string | null;
}

export function BlogCard({ post, className, variant, tag }: BlogCardProps) {
  const frontmatter = post.frontMatter;
  const { title, tags } = frontmatter;
  const date = new Date(frontmatter.date);

  const postAuthors: Author[] = (
    typeof frontmatter.authors === 'string'
      ? [authors[frontmatter.authors as AuthorId]]
      : frontmatter.authors.map(author => authors[author as AuthorId])
  ).filter(Boolean);

  if (postAuthors.length === 0) {
    console.error('author not found', frontmatter);
    throw new Error(`authors ${JSON.stringify(frontmatter.authors)} not found`);
  }

  const firstAuthor = postAuthors[0];

  // todo: show more authors on hover?
  const avatarSrc =
    firstAuthor.avatar || `https://avatars.githubusercontent.com/${firstAuthor.github}?v=4&s=48`;

  return (
    <Anchor
      className={cn(
        'group/card hive-focus hover:ring-beige-400 block rounded-2xl dark:ring-neutral-600 hover:[&:not(:focus)]:ring dark:hover:[&:not(:focus)]:ring-neutral-600',
        className,
      )}
      href={post.route}
    >
      <article
        className={cn(
          'text-green-1000 flex h-full flex-col gap-6 rounded-2xl p-6 lg:gap-10 dark:text-white',
          variant === 'featured'
            ? 'bg-beige-200 group-hover/card:bg-beige-300/70 dark:bg-neutral-700/70 dark:hover:bg-neutral-700'
            : 'group-hover/card:bg-beige-200/70 bg-beige-100 dark:bg-neutral-800/70 dark:hover:bg-neutral-800',
        )}
      >
        <header className="flex items-center justify-between gap-1 text-sm/5 font-medium">
          <BlogTagChip tag={tag ?? tags[0]} colorScheme={variant || 'default'} inert />
          <time
            dateTime={date.toISOString()}
            className="text-beige-800 whitespace-pre text-sm/5 font-medium"
          >
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </time>
        </header>
        <h3
          className={cn(
            'text-xl/7 lg:min-h-[172px]',
            variant === 'featured' ? 'text-2xl/8' : 'xl:min-h-[120px]',
          )}
        >
          {title}
        </h3>
        <footer className="mt-auto flex items-center gap-3">
          <div className="relative size-6">
            <Image
              src={avatarSrc}
              alt={firstAuthor.name}
              width={24}
              height={24}
              className="rounded-full"
            />
            <div className="bg-beige-200/70 absolute inset-0 size-full rounded-full opacity-30 mix-blend-hue" />
          </div>
          <span className="text-sm/5 font-medium">{firstAuthor.name}</span>
        </footer>
      </article>
    </Anchor>
  );
}
