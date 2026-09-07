import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';

const radioItemVariants = cva('group flex cursor-pointer items-center border transition-colors', {
  variants: {
    variant: {
      'as-button': 'gap-1.5 rounded-xs px-3 py-1.5 text-[13px] font-medium',
      'as-card': 'gap-4 rounded-md p-4 text-left text-sm',
    },
    // Surfaces differ only in resting/hover fill, so the pairing lives in compoundVariants.
    onSurface: { base: '', floating: '' },
    orientation: { horizontal: '', vertical: '' },
  },
  compoundVariants: [
    // Cards fill the stack when stacked, and share the row evenly when side by side.
    { variant: 'as-card', orientation: 'vertical', class: 'w-full' },
    { variant: 'as-card', orientation: 'horizontal', class: 'flex-1 basis-0' },
    {
      variant: 'as-button',
      onSurface: 'base',
      class: [
        'bg-neutral-2 border-neutral-5 text-neutral-11',
        'hover:bg-neutral-3 hover:border-neutral-4 hover:text-neutral-12',
        'data-[checked]:bg-neutral-4 data-[checked]:border-neutral-5 data-[checked]:text-neutral-12',
      ],
    },
    {
      variant: 'as-card',
      onSurface: 'base',
      class: [
        'border-neutral-4 bg-transparent',
        'hover:bg-neutral-3',
        'data-[checked]:bg-neutral-3 data-[checked]:border-accent_30',
      ],
    },
    {
      variant: 'as-card',
      onSurface: 'floating',
      class: [
        'bg-neutral-4 border-neutral-5',
        'hover:bg-neutral-5',
        'data-[checked]:bg-neutral-5 data-[checked]:border-accent_30',
      ],
    },
  ],
  defaultVariants: { variant: 'as-button', onSurface: 'base', orientation: 'horizontal' },
});

const radioGroupVariants = cva('flex', {
  variants: {
    // Direction is the orientation's job; variant sets spacing and cross-axis sizing.
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    variant: {
      // Cards stretch so a row of them shares one height and a stack shares one width.
      'as-card': 'items-stretch gap-2',
      'as-button': 'gap-1',
    },
  },
  compoundVariants: [
    // Buttons hug their content on the cross axis instead of stretching.
    { variant: 'as-button', orientation: 'horizontal', class: 'items-center' },
    { variant: 'as-button', orientation: 'vertical', class: 'items-start' },
  ],
  defaultVariants: { orientation: 'horizontal', variant: 'as-button' },
});

type RadioVariants = VariantProps<typeof radioItemVariants>;

export type RadioItemProps = {
  value: string;
  label: string;
  /** Supporting copy under the label. Rendered by `as-card` only. */
  description?: string;
  /** Optional visual indicator (e.g. a colored dot) rendered before the label */
  indicator?: ReactNode;
};

function RadioItem({
  value,
  label,
  description,
  indicator,
  variant,
  onSurface,
  orientation,
}: RadioItemProps & RadioVariants) {
  const isCard = variant === 'as-card';

  return (
    <BaseRadio.Root
      value={value}
      className={radioItemVariants({ variant, onSurface, orientation })}
    >
      {isCard ? (
        <span className="border-neutral-6 group-data-[checked]:border-accent flex size-5 shrink-0 items-center justify-center rounded-full border">
          <BaseRadio.Indicator className="bg-accent size-2.5 rounded-full" />
        </span>
      ) : (
        indicator
      )}
      <span className={isCard ? 'flex flex-col gap-2' : undefined}>
        <span className={isCard ? 'text-neutral-12 font-medium' : undefined}>{label}</span>
        {isCard && description ? (
          <span className="text-neutral-11 leading-[1.4]">{description}</span>
        ) : null}
      </span>
    </BaseRadio.Root>
  );
}

type RadioGroupProps = {
  items: readonly RadioItemProps[];
  onValueChange: (value: string) => void;
  value: string;
} & RadioVariants;

export function RadioGroup({
  items,
  onValueChange,
  value,
  variant,
  // Only `as-card` has a floating treatment in the design.
  onSurface,
  orientation,
}: RadioGroupProps) {
  // Buttons read as a segmented row, cards as a stack, so each variant picks its own default.
  const flow = orientation ?? (variant === 'as-card' ? 'vertical' : 'horizontal');

  return (
    <BaseRadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-orientation={flow}
      className={radioGroupVariants({ orientation: flow, variant })}
    >
      {items.map(item => (
        <RadioItem
          key={item.value}
          {...item}
          variant={variant}
          onSurface={onSurface}
          orientation={flow}
        />
      ))}
    </BaseRadioGroup>
  );
}
