import { cn } from '@theguild/components';

export function YoutubeIframe({
  src,
  id,
  title,
  className,
}: {
  src?: string;
  id?: string;
  title: string;
  className?: string;
}) {
  return (
    // I'm not sure if this is not a false positive, and it YouTube
    // iframes don't work without both allow-same-origin and allow-scripts
    // eslint-disable-next-line react/iframe-missing-sandbox
    <iframe
      className={cn('mt-6 h-[400px] w-full', className)}
      src={src || `https://www.youtube.com/embed/${id}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      sandbox="allow-scripts allow-presentation allow-same-origin allow-popups"
    />
  );
}
