import Image, { StaticImageData } from 'next/image';
import { Anchor, cn } from '@theguild/components';

export interface LinkCardProps extends React.HTMLAttributes<HTMLAnchorElement> {
  description?: string;
  href: string;
  src: string | StaticImageData;
  title?: string;
  alt?: string;
}

export function LinkCard({
  description,
  src,
  href,
  title,
  alt,
  className,
  ...rest
}: LinkCardProps) {
  if (!title && !description) {
    return (
      <Anchor
        href={href}
        className="border-beige-200 mt-6 block overflow-hidden rounded-2xl border dark:border-neutral-800"
      >
        <Image src={src} alt={alt || ''} />
      </Anchor>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        'bg-beige-100 mt-6 flex gap-2 overflow-hidden rounded-2xl dark:bg-neutral-900',
        className,
      )}
      {...rest}
    >
      <span className="flex flex-col gap-1 p-6">
        <strong>{title}</strong>
        <p className="text-sm">{description}</p>
      </span>
      <Image
        src={src}
        alt={alt || ''}
        role="presentation"
        width={286}
        height={160}
        className="rounded-none"
      />
    </a>
  );
}
