import Image, { StaticImageData } from 'next/image';
import { cn } from '@theguild/components';

export interface LinkCardProps extends React.HTMLAttributes<HTMLAnchorElement> {
  description: string;
  href: string;
  src: string | StaticImageData;
  title: string;
}

export function LinkCard({ description, src, href, title, className, ...rest }: LinkCardProps) {
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
        alt=""
        role="presentation"
        width={286}
        height={160}
        className="rounded-none"
      />
    </a>
  );
}
