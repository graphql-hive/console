import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';

const radioItemVariants = cva(
  'group flex cursor-pointer items-center border transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        'as-button': 'gap-1.5 rounded-xs px-3 py-1.5 text-control font-medium',
        'as-card': 'gap-4 rounded-md p-4 text-left text-sm',
      },
      onSurface: { base: '', raised: '' },
      orientation: { horizontal: '', vertical: '' },
    },
    compoundVariants: [
      { variant: 'as-card', orientation: 'vertical', class: 'w-full' },
      { variant: 'as-card', orientation: 'horizontal', class: 'flex-1 basis-0' },
      {
        variant: 'as-button',
        onSurface: 'base',
        class: [
          'bg-neutral-2 border-line text-fg-default',
          'hover:bg-neutral-3 hover:border-line-subtle hover:text-fg',
          'data-[checked]:bg-neutral-4 data-[checked]:border-line data-[checked]:text-fg',
        ],
      },
      {
        variant: 'as-card',
        onSurface: 'base',
        class: [
          'border-line-subtle bg-transparent',
          'hover:bg-neutral-3',
          'data-[checked]:bg-neutral-3 data-[checked]:border-accent-line',
        ],
      },
      {
        variant: 'as-button',
        onSurface: 'raised',
        class: [
          'bg-neutral-3 border-line text-fg-default',
          'hover:bg-neutral-4 hover:text-fg',
          'data-[checked]:bg-neutral-5 data-[checked]:border-line-strong data-[checked]:text-fg',
        ],
      },
      {
        variant: 'as-card',
        onSurface: 'raised',
        class: [
          'bg-neutral-4 border-line',
          'hover:bg-neutral-5',
          'data-[checked]:bg-neutral-5 data-[checked]:border-accent-line',
        ],
      },
    ],
    defaultVariants: { variant: 'as-button', onSurface: 'base', orientation: 'horizontal' },
  },
);

const radioGroupVariants = cva('flex', {
  variants: {
    orientation: {
      horizontal: 'flex-row',
      vertical: 'flex-col',
    },
    variant: {
      'as-card': 'items-stretch gap-2',
      'as-button': 'gap-1',
    },
  },
  compoundVariants: [
    { variant: 'as-button', orientation: 'horizontal', class: 'items-center' },
    { variant: 'as-button', orientation: 'vertical', class: 'items-start' },
  ],
  defaultVariants: { orientation: 'horizontal', variant: 'as-button' },
});

type RadioVariants = VariantProps<typeof radioItemVariants>;

export type RadioItemProps = {
  value: string;
  /**
   * Accessible name for the option. Without it the name is read from the rendered content, which
   * for a card of body copy is the whole card. Worth setting whenever `content` is more than a
   * short label.
   */
  ariaLabel?: string;
} & (
  | {
      label: string;
      /** Supporting copy under the label. Rendered by `as-card` only. */
      description?: string;
      content?: never;
      withIndicator?: never;
    }
  | {
      /** Replaces the built-in label layout, and by default the radio dot with it. */
      content: ReactNode;
      /**
       * Keeps the radio dot in front of `content`. For options that supply their own body but
       * still need a visible control, rather than signalling selection by the card border alone.
       */
      withIndicator?: boolean;
      label?: never;
      description?: never;
    }
);

function RadioItem({
  item,
  variant,
  onSurface,
  orientation,
}: { item: RadioItemProps } & RadioVariants) {
  const isCard = variant === 'as-card';

  const indicator = isCard ? (
    <span className="border-line-strong group-data-[checked]:border-accent flex size-5 shrink-0 items-center justify-center rounded-full border">
      <BaseRadio.Indicator className="bg-accent size-2.5 rounded-full" />
    </span>
  ) : null;

  return (
    <BaseRadio.Root
      value={item.value}
      aria-label={item.ariaLabel}
      className={radioItemVariants({ variant, onSurface, orientation })}
    >
      {item.content ? (
        <>
          {item.withIndicator ? indicator : null}
          {item.content}
        </>
      ) : (
        <>
          {indicator}
          <span className={isCard ? 'flex flex-col gap-2' : undefined}>
            <span className={isCard ? 'text-fg font-medium' : undefined}>{item.label}</span>
            {isCard && item.description ? (
              <span className="text-fg-default leading-[1.4]">{item.description}</span>
            ) : null}
          </span>
        </>
      )}
    </BaseRadio.Root>
  );
}

type RadioGroupProps = {
  items: readonly RadioItemProps[];
  onValueChange: (value: string) => void;
  value: string;
  /** Makes every option in the group non-interactive. */
  disabled?: boolean;
} & RadioVariants;

export function RadioGroup({
  items,
  onValueChange,
  value,
  disabled,
  variant,
  onSurface,
  orientation,
}: RadioGroupProps) {
  const flow = orientation ?? (variant === 'as-card' ? 'vertical' : 'horizontal');

  return (
    <BaseRadioGroup
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      aria-orientation={flow}
      className={radioGroupVariants({ orientation: flow, variant })}
    >
      {items.map(item => (
        <RadioItem
          key={item.value}
          item={item}
          variant={variant}
          onSurface={onSurface}
          orientation={flow}
        />
      ))}
    </BaseRadioGroup>
  );
}
