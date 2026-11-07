import { lenient } from '@/lib/recipe';
import { skeletonStyles } from './skeleton.css';

const skeletonVariants = lenient(skeletonStyles.root);

type SkeletonProps = {
  variants?: NonNullable<Parameters<typeof skeletonVariants>[0]>;
};

export function Skeleton({ variants }: SkeletonProps) {
  return <span aria-hidden className={skeletonVariants({ ...variants })} />;
}
