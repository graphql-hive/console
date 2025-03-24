'use client';

import { Anchor, cn, Heading } from '@theguild/components';
import { ArrowIcon } from '../../../../components/arrow-icon';
import { useFrontmatter } from '../../../../components/use-frontmatter';
import { ProductUpdateAuthors } from '../../../product-updates/(posts)/product-update-header';
import type { BlogFrontmatter } from '../../blog-types';
import { BlogTagChip } from '../blog-tag-chip';
import { BlogPostPicture } from './blog-post-picture';

export function BlogPostHeader({ className }: { className?: string }) {
  const {
    frontmatter: { image, tags, authors, title, date },
  } = useFrontmatter<BlogFrontmatter>();

  const tag = tags[0];

  return (
    <>
      {image && <BlogPostPicture image={image} />}
      <header
        className={cn(
          'flex flex-col items-center rounded-3xl bg-[rgb(var(--nextra-bg))] px-1 pb-6 pt-4 md:px-12 md:pb-12 md:pt-6 xl:w-[888px]',
          image && '-mt-20 max-sm:mx-6',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Anchor href="/blog" className="flex items-center gap-2 text-sm font-medium">
            <ArrowIcon className="text-beige-1000 mr-1 size-4 rotate-180" />
            <span className="text-beige-800">
              Blog
              {tag && <span> /</span>}
            </span>
          </Anchor>
          {tag && <BlogTagChip tag={tag} colorScheme="default" />}
        </div>
        <Heading
          as="h1"
          size="md"
          className="mb-0 mt-4 w-[--article-max-width] text-pretty text-center"
        >
          {title}
        </Heading>
        <ProductUpdateAuthors
          meta={{
            authors: Array.isArray(authors) ? authors : [authors],
            date,
          }}
          className="mt-4"
        />
      </header>
    </>
  );
}
