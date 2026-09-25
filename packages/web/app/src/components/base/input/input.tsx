import { forwardRef, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlSize, focusRing, type ControlSize, type OnSurface } from '../shared-styles';

/** The field itself, shared with Textarea. Fill and border come from `fieldSurface`. */
export const fieldClass = [
  'text-fg placeholder:text-fg-subtle',
  // appearance-none: WebKit draws type="search" as a native searchfield with its own corners.
  'min-w-0 appearance-none rounded-sm border transition-colors focus:outline-none',
  focusRing,
  'disabled:cursor-not-allowed disabled:opacity-50',
  // Error state comes from the attribute, so a FormControl and a hand-set `invalid` prop paint the
  // same border.
  'aria-invalid:border-critical aria-invalid:hover:border-critical aria-invalid:focus:border-critical',
];

/**
 * Fill and border by surface, at rest and focused. A field sits one step off its surface and
 * focus lifts it one more: on the page (neutral-1 light, neutral-2 dark) a base field rests at 2/3
 * and focuses at 1/4; in a sheet, dialog or raised card (neutral-3) a raised field rests at 2/4
 * and focuses at 1/5. This is one notch below the button ladder in `controlSurface`, so the focus
 * step has room.
 */
export const fieldSurface = {
  base: [
    'bg-surface-control border-line-control focus:bg-neutral-1',
    'dark:focus:bg-neutral-4',
    'hover:border-line-strong focus:border-neutral-7',
  ].join(' '),
  raised: [
    'bg-surface-control-raised border-line focus:bg-neutral-1',
    'dark:focus:bg-neutral-5',
    'hover:border-line-strong focus:border-neutral-7',
  ].join(' '),
} as const satisfies Record<OnSurface, string>;

// The block before a slug sits one step further from the page than the field it joins.
const prefixSurface = {
  base: 'border-line-control bg-neutral-3 dark:bg-neutral-4',
  raised: 'border-line bg-neutral-3 dark:bg-neutral-5',
} as const satisfies Record<OnSurface, string>;

export const fieldWidth = {
  full: 'w-full',
  xs: 'w-16',
  sm: 'w-48',
  md: 'w-96',
} as const;

const inputVariants = cva(fieldClass, {
  variants: {
    size: {
      compact: `${controlSize.compact} px-2.5 text-sm`,
      default: `${controlSize.default} px-3 text-sm`,
    },
    onSurface: fieldSurface,
    width: fieldWidth,
    mono: {
      true: 'font-mono text-xs',
      false: '',
    },
  },
  defaultVariants: {
    size: 'default',
    onSurface: 'base',
    width: 'full',
    mono: false,
  },
});

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'size' | 'width' | 'prefix'
>;

type InputProps = NativeInputProps &
  VariantProps<typeof inputVariants> & {
    /** Error state for a field outside a Form; FormControl sets `aria-invalid` itself. */
    invalid?: boolean;
    /** An icon inside the leading edge, for a search field. */
    leadingIcon?: LucideIcon;
    /** Something inside the trailing edge, such as an icon-only button. */
    trailing?: ReactNode;
    /** A fixed block attached to the leading edge, such as the base URL before a slug. */
    prefixText?: string;
    'data-cy'?: string;
  };

/** forwardRef is required: react-hook-form's Controller passes a ref to manage focus and validation. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size,
    onSurface,
    width,
    mono,
    invalid,
    leadingIcon: LeadingIcon,
    trailing,
    prefixText,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  // className is not a prop, but a spread from a form library can still carry one in; on the
  // element it would replace every class above, so it is dropped here rather than typed out.
  const { className: _injected, ...native } = props as typeof props & { className?: string };
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';
  const decorated = !!(LeadingIcon || trailing || prefixText);

  const input = (
    <input
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        inputVariants({ size, onSurface, width, mono }),
        LeadingIcon && 'pl-9',
        trailing && 'pr-9',
        prefixText && 'rounded-l-none',
      )}
      {...native}
    />
  );

  if (!decorated) {
    return input;
  }

  // The width stays on the field: a fixed field keeps its size and a prefix adds its own, so a
  // long slug prefix cannot squeeze the field. A fluid field needs the wrapper to be fluid too.
  return (
    <span
      className={cn('relative inline-flex items-center', (width ?? 'full') === 'full' && 'w-full')}
    >
      {prefixText ? (
        <span
          className={cn(
            controlSize[(size ?? 'default') as ControlSize],
            prefixSurface[onSurface ?? 'base'],
            'text-fg-secondary inline-flex shrink-0 items-center whitespace-nowrap rounded-l-sm border border-r-0 px-3 text-sm',
          )}
        >
          {prefixText}
        </span>
      ) : null}
      {LeadingIcon ? (
        <LeadingIcon className="text-fg-muted pointer-events-none absolute left-3 size-4" />
      ) : null}
      {input}
      {trailing ? (
        <span className="absolute right-1.5 inline-flex items-center">{trailing}</span>
      ) : null}
    </span>
  );
});
