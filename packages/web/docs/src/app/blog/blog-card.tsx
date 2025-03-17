import Image from 'next/image';
import { Anchor, cn } from '@theguild/components';
import { AuthorId, authors, AvatarFromGitHub } from '../../authors';

export interface BlogCardProps {
  author: AuthorId;
  title: string;
  date: string;
  href: string;
  category: string;
  className?: string;
  colorScheme?: 'default' | 'featured';
}

export function BlogCard({
  title,
  author,
  date,
  href,
  category,
  className,
  colorScheme,
}: BlogCardProps) {
  const { name, avatar, github } = authors[author];
  const avatarSrc =
    avatar === AvatarFromGitHub
      ? `https://avatars.githubusercontent.com/${github}?v=4&s=48`
      : avatar;

  return (
    <Anchor
      className={cn(
        'group/card hive-focus hover:ring-beige-400 block rounded-2xl dark:ring-neutral-600 hover:[&:not(:focus)]:ring dark:hover:[&:not(:focus)]:ring-neutral-600',
        className,
      )}
      href={href}
    >
      <article
        className={cn(
          'text-green-1000 flex h-full flex-col gap-6 rounded-2xl p-6 lg:gap-10 dark:text-white',
          colorScheme === 'featured'
            ? 'bg-beige-200 group-hover/card:bg-beige-300/70 dark:bg-neutral-700/70 dark:hover:bg-neutral-700'
            : 'group-hover/card:bg-beige-200/70 bg-beige-100 dark:bg-neutral-800/70 dark:hover:bg-neutral-800',
        )}
      >
        <header className="flex items-center justify-between gap-1 text-sm/5 font-medium">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-white',
              colorScheme === 'featured' ? 'bg-green-800' : 'bg-beige-800 dark:bg-beige-800/40',
            )}
          >
            {category}
          </span>
          <time
            dateTime={new Date(date).toISOString()}
            className="text-beige-800 whitespace-pre text-sm/5 font-medium"
          >
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </header>
        <h3 className="text-xl/6 xl:min-h-[172px]">{title}</h3>
        <footer className="mt-auto flex items-center gap-3">
          <div className="relative size-6">
            <Image src={avatarSrc} alt={name} width={24} height={24} className="rounded-full" />
            <div className="bg-beige-200/70 absolute inset-0 size-full rounded-full opacity-30 mix-blend-hue" />
          </div>
          <span className="text-sm/5 font-medium">{name}</span>
        </footer>
      </article>
    </Anchor>
  );
}
