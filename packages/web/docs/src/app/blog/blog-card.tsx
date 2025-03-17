import Image from 'next/image';
import { Anchor } from '@theguild/components';
import { AuthorId, authors, AvatarFromGitHub } from '../../authors';

export interface BlogCardProps {
  author: AuthorId;
  title: string;
  date: string;
  href: string;
  category: string;
}

export function BlogCard({ title, author, date, href, category }: BlogCardProps) {
  const { name, avatar, github } = authors[author];
  const avatarSrc =
    avatar === AvatarFromGitHub
      ? `https://avatars.githubusercontent.com/${github}?v=4&s=24`
      : avatar;

  return (
    <Anchor href={href}>
      <article className="text-green-1000 flex flex-col gap-6 lg:gap-10">
        <header>
          <span className="text-sm/5 font-medium">{category}</span>
          <time dateTime={new Date(date).toISOString()} className="text-sm/5 font-medium">
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </header>
        <h3 className="text-xl/6">{title}</h3>
        <footer className="mt-2 flex gap-3">
          <Image src={avatarSrc} alt={name} width={24} height={24} />
          <span className="text-sm/5 font-medium">{name}</span>
        </footer>
      </article>
    </Anchor>
  );
}
