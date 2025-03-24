'use client';

import Image from 'next/image';
import { cn } from '@theguild/components';
import { useFrontmatter } from '../../../../components/use-frontmatter';
import type { BlogFrontmatter } from '../../blog-types';

export function BlogPostPicture({ className }: { className?: string }) {
  const { frontmatter } = useFrontmatter<BlogFrontmatter>();
  const image = frontmatter.image;

  if (!image) {
    return null;
  }

  className = cn('h-[324px] rounded-3xl overflow-hidden object-cover [&+*]:-mt-20', className);

  if (typeof image === 'string' && (image.endsWith('.webm') || image.endsWith('.mp4'))) {
    return <video className={className} src={image} autoPlay muted loop playsInline />;
  }

  return (
    <Image width={1392} height={324} className={className} src={image} alt="" placeholder="blur" />
  );
}
