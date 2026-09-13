import { cva, type VariantProps } from 'class-variance-authority';
import { User } from 'lucide-react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';

const avatarVariants = cva(
  'bg-accent_10 text-neutral-12 inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium',
  {
    variants: {
      size: {
        xs: 'text-2xs size-6',
        md: 'size-8 text-xs',
      },
      variant: {
        default: '',
        /** An accent ring, for the signed-in user's own avatar in the header. */
        outlined: 'border-accent_80 border-1',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

const iconClass = {
  xs: 'size-3',
  md: 'size-5',
} as const;

type AvatarProps = VariantProps<typeof avatarVariants> & {
  /** The person's name. Shown as initials when there is no image, and as the image's alt text. */
  alt?: string;
  src?: string | null;
};

export function initialsOf(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(word => /^[\p{L}\p{N}]/u.test(word));
  if (words.length === 0) {
    return '';
  }
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ alt, src, size, variant }: AvatarProps) {
  const initials = alt ? initialsOf(alt) : '';
  const icon = iconClass[size ?? 'md'];
  return (
    <BaseAvatar.Root className={avatarVariants({ size, variant })}>
      {src ? (
        <BaseAvatar.Image src={src} alt={alt ?? ''} className="size-full object-cover" />
      ) : null}
      {/* Every call site shows the name beside the avatar, so the fallback is decoration. */}
      <BaseAvatar.Fallback className="flex items-center justify-center" aria-hidden>
        {initials || <User className={icon} />}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
