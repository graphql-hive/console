import { cn } from '@theguild/components';

export function VideoEmbed({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <video
      className={cn('mx-auto mt-6', className)}
      playsInline
      autoPlay
      loop
      muted
      controls
      title={title}
    >
      <source src={src} type={`video/${src.slice(src.lastIndexOf('.') + 1)}`} />
      Your browser does not support the video tag.
    </video>
  );
}
