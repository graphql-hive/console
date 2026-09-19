import { cva } from 'class-variance-authority';
import { Separator as BaseSeparator } from '@base-ui/react/separator';

const separatorVariants = cva('bg-neutral-5 shrink-0', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px',
    },
    stretch: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    // A control's height, so it reads as part of a toolbar row rather than a wall.
    { orientation: 'vertical', stretch: false, class: 'h-8' },
    { orientation: 'vertical', stretch: true, class: 'self-stretch' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    stretch: false,
  },
});

type SeparatorProps = {
  orientation?: 'horizontal' | 'vertical';
  /** Vertical only: fill the row's height instead of a control's. */
  stretch?: boolean;
};

export function Separator({ orientation = 'horizontal', stretch = false }: SeparatorProps) {
  return (
    <BaseSeparator
      orientation={orientation}
      className={separatorVariants({ orientation, stretch })}
    />
  );
}
