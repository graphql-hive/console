import { cn } from '@theguild/components';

export function YoutubeIframe({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <iframe
      className={cn('mt-6 h-[400px] w-full', className)}
      src={src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      sandbox="allow-scripts allow-presentation"
    />
  );
}
