'use client';

import { cn, Heading, useConfig } from '@theguild/components';
import { SmallAvatar } from '../../components/small-avatar';

type Meta = {
  title: string;
  description?: string;
  authors: Author[];
};

type Author = {
  name: string;
  position?: string;
  avatar?: string;
};

export function CaseStudiesHeader() {
  const metadata = useConfig().normalizePagesResult.activeMetadata as Meta;
  return (
    <header className="mx-auto my-24 max-w-[640px]">
      <Heading as="h1" size="md">
        {metadata.title}
      </Heading>
      <Authors authors={metadata.authors} className="mt-8" />
    </header>
  );
}

function Authors({ authors, className }: { authors: Author[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-4 text-sm', className)}>
      {authors.map(author => (
        <li className="flex items-center gap-3" key={author.name}>
          {author.avatar && <SmallAvatar src={author.avatar} />}
          <span className="font-medium">{author.name}</span>
          <span>{author.position}</span>
        </li>
      ))}
    </ul>
  );
}
