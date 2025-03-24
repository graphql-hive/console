'use client';

import { format } from 'date-fns';
import { Anchor, useConfig } from '@theguild/components';
import { AuthorId, authors } from '../../../authors';
import { SocialAvatar } from '../../../components/social-avatar';

type Meta = {
  authors: AuthorId[];
  date: string;
  title: string;
  description: string;
};

export const ProductUpdateAuthors = ({ meta }: { meta: Pick<Meta, 'authors' | 'date'> }) => {
  const date = meta.date ? new Date(meta.date) : new Date();

  if (meta.authors.length === 1) {
    const author = authors[meta.authors[0] as AuthorId];
    if (!author) {
      throw new Error(`Author ${meta.authors[0]} not found`);
    }

    return (
      <div className="has-[a:hover]:bg-beige-900/5 dark:has[a:hover]:bg-neutral-50/5 my-4 -mb-1 flex flex-row items-center justify-center rounded-xl py-1 pl-1 pr-3">
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
            className="text-xs text-[#777]"
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
        {meta.authors.map(authorId => {
          const author = authors[authorId as AuthorId];
          if (!author) {
            throw new Error(`Author ${authorId} not found`);
          }

          return (
            <div key={authorId}>
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
