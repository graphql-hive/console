'use client';

import { useFrontmatter } from '../../../../components/use-frontmatter';
import type { BlogFrontmatter } from '../../blog-types';

export function BlogPostPicture() {
  const { frontmatter } = useFrontmatter<BlogFrontmatter>();
  const image = frontmatter.image;

  if (!image) {
    return null;
  }

  if (image.endsWith('.webm')) {
    return <video className="h-[324px] w-full" src={image} autoPlay muted loop playsInline />;
  }

  return image;
  // <Image
  //   className="h-[324px] w-full"
  //   width={1440}
  //   height={324}
  //   src={image}
  //   alt=""
  //   placeholder="blur"

  // />
}
