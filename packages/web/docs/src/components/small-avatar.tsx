import Image, { ImageProps } from 'next/image';
import { cn } from '@theguild/components';

export interface SmallAvatarProps extends Omit<ImageProps, 'alt'> {
  alt?: string;
}

export function SmallAvatar({ className, ...rest }: SmallAvatarProps) {
  return (
    <Image
      width={24}
      height={24}
      className={cn('size-6 rounded-full object-cover', className)}
      {...rest}
      alt={rest.alt || ''}
    />
  );
}
