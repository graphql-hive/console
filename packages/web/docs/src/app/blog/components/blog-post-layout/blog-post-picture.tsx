import Image, { StaticImageData } from 'next/image';
import { cn } from '@theguild/components';

export function BlogPostPicture({
  className,
  image,
}: {
  className?: string;
  image: string | StaticImageData;
}) {
  className = cn('h-[324px] rounded-3xl overflow-hidden object-cover', className);

  if (typeof image === 'string' && (image.endsWith('.webm') || image.endsWith('.mp4'))) {
    return <video className={className} src={image} autoPlay muted loop playsInline />;
  }

  return (
    <Image width={1392} height={324} className={className} src={image} alt="" placeholder="blur" />
  );
}
