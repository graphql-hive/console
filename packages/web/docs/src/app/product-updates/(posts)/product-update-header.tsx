'use client';

import { format } from 'date-fns';
import { Anchor, cn, useConfig } from '@theguild/components';
import { Author, AuthorId, authors } from '../../../authors';
import { SocialAvatar } from '../../../components/social-avatar';

type Meta = {
  authors: (AuthorId | Author)[];
  date: string;
  title: string;
  description: string;
};

export const ProductUpdateAuthors = ({
  meta,
  className,
}: {
  meta: Pick<Meta, 'authors' | 'date'>;
  className?: string;
}) => {
  const date = meta.date ? new Date(meta.date) : new Date();

  const metaAuthors = meta.authors.map(author => {
    return typeof author === 'string' ? authors[author as AuthorId] : author;
  });

  if (metaAuthors.length === 1) {
    const author = metaAuthors[0];

    if (!author) {
      throw new Error(`Author ${meta.authors[0]} not found`);
    }

    return (
      <div
        className={cn(
          'has-[a:hover]:bg-beige-900/5 dark:has[a:hover]:bg-neutral-50/5 my-4 -mb-1 flex flex-row items-center justify-center rounded-xl py-1 pl-1 pr-3',
          className,
        )}
      >
        <Anchor href={author.link} title={author.name}>
          <SocialAvatar author={author} />
        </Anchor>
        <div className="ml-2.5 flex flex-col">
          <Anchor
            href={author.link}
            title={author.name}
            className="text-green-1000 font-semibold dark:text-neutral-200"
          >
            {author.name}
          </Anchor>
          <time
            dateTime={date.toISOString()}
            title={`Posted ${format(date, 'EEEE, LLL do y')}`}
            className="text-green-1000 text-xs dark:text-neutral-200"
          >
            {format(date, 'EEEE, LLL do y')}
          </time>
        </div>
      </div>
    );
  }
  return (
    <>
      <time
        dateTime={date.toISOString()}
        title={`Posted ${format(date, 'EEEE, LLL do y')}`}
        className="mt-5 block text-center text-xs text-[#777]"
      >
        {format(date, 'EEEE, LLL do y')}
      </time>
      <div className="my-5 flex flex-wrap justify-center gap-5">
        {metaAuthors.map(author => {
          return (
            <div key={author.name}>
              <Anchor
                href={author.link}
                title={author.name}
                className="text-green-1000 font-semibold dark:text-neutral-200"
              >
                <SocialAvatar author={author} />
                <span className="ml-2.5 text-sm">{author.name}</span>
              </Anchor>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const ProductUpdateHeader = () => {
  const { normalizePagesResult } = useConfig();
  const metadata = normalizePagesResult.activeMetadata as Meta;

  return (
    <div className="x:max-w-[90rem] mx-auto">
      <h1 className="mt-12 text-center text-4xl">{metadata.title}</h1>
      <ProductUpdateAuthors meta={metadata} />
    </div>
  );
};
