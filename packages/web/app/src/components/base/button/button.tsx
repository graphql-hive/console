import { forwardRef, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { disabledStyle, segmentSeparator } from '../shared-styles';

export const buttonVariants = cva(
  'group inline-flex items-center rounded-sm border text-xs font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Segmented trigger style (for selects, menus, popovers, filters)
        default: [
          'bg-neutral-2 border-neutral-5 hover:bg-neutral-1 hover:border-neutral-5 text-neutral-9 hover:text-neutral-11',
          'dark:text-neutral-11 dark:bg-neutral-3 dark:border-neutral-4 dark:hover:bg-neutral-4 dark:hover:border-neutral-5',
        ],
        active: [
          'border-neutral-5 dark:border-neutral-6 text-neutral-12',
          'bg-neutral-3 dark:bg-neutral-5',
        ],
        action: [
          'border-dashed border-accent_30 text-accent_80 bg-accent_08',
          'hover:border-accent_80 hover:text-accent hover:bg-accent_10',
        ],
        'muted-action': [
          'border-dashed hover:bg-neutral-3 hover:border-neutral-7 hover:text-neutral-12',
        ],
        // Standard button styles (for form actions)
        primary: 'bg-neutral-12 text-neutral-1 hover:bg-neutral-11 border-transparent',
        outline:
          'border-neutral-5 bg-transparent text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12',
        ghost:
          'border-transparent bg-transparent text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12',
      },
      size: {
        default: '',
        sm: '',
        'icon-sm': 'size-7 justify-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type CommonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> &
  VariantProps<typeof buttonVariants>;

/** Simple button with children content */
type ChildrenLayout = CommonProps & {
  children: ReactNode;
  label?: never;
  rightIcon?: never;
  accessoryInformation?: never;
  layout?: never;
  icon?: never;
};

/** Segmented button with label and optional right icon with separator */
type LabelLayout = CommonProps & {
  children?: never;
  /**
   * Button label content (always shown).
   * Accepts a string for static labels, or a ReactNode for dynamic content
   * (e.g. `<BaseSelect.Value />` when used as a Select trigger).
   */
  label: ReactNode;
  /** Icon rendered to the right of label */
  rightIcon?: {
    action?: () => void;
    icon: LucideIcon;
    label?: string;
    withSeparator: boolean;
  };
  /** Accessory information displayed after the label and before any actions */
  accessoryInformation?: string;
  layout?: 'label';
  icon?: never;
};

/** Icon-only button */
type IconOnlyLayout = CommonProps & {
  children?: never;
  label?: never;
  rightIcon?: never;
  accessoryInformation?: never;
  layout: 'iconOnly';
  icon: LucideIcon;
  'aria-label': string;
};

type ButtonProps = ChildrenLayout | LabelLayout | IconOnlyLayout;

/**
 * forwardRef is needed because Base UI Select/Menu use `render` prop
 * which passes a ref to the trigger element.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { variant, size, disabled, ...rest } = props;

  // Remove custom props so they don't get spread onto the DOM element
  const domProps = rest as Record<string, unknown>;
  delete domProps.layout;
  delete domProps.label;
  delete domProps.rightIcon;
  delete domProps.accessoryInformation;
  delete domProps.icon;
  delete domProps.children;

  const sizeClass =
    size === 'icon-sm'
      ? ''
      : size === 'sm'
        ? 'h-8 px-3 gap-1 text-[13px]'
        : props.label != null || props.layout === 'iconOnly'
          ? '' // segmented/icon buttons handle their own padding
          : 'h-9 px-4 gap-1.5 text-[13px]';

  return (
    <button
      ref={ref}
      className={`${buttonVariants({ variant, size })} ${sizeClass}`}
      disabled={disabled}
      style={disabled ? disabledStyle : undefined}
      {...domProps}
    >
      {props.layout === 'iconOnly' ? (
        <span className="flex items-center p-1.5">
          <props.icon className="size-4" />
        </span>
      ) : props.label != null ? (
        <>
          <span className="px-3 py-1.5 text-[13px]">{props.label}</span>

          {props.accessoryInformation != null && (
            <span className={`${segmentSeparator} px-3 py-1.5`}>{props.accessoryInformation}</span>
          )}
          {props.rightIcon && (
            <span
              role={props.rightIcon.action ? 'button' : undefined}
              tabIndex={props.rightIcon.action ? 0 : undefined}
              aria-label={props.rightIcon.label ?? undefined}
              onPointerDown={
                props.rightIcon.action
                  ? e => {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                  : undefined
              }
              onClick={
                props.rightIcon.action
                  ? e => {
                      e.stopPropagation();
                      props.rightIcon!.action!();
                    }
                  : undefined
              }
              onKeyDown={
                props.rightIcon.action
                  ? e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        props.rightIcon!.action!();
                      }
                    }
                  : undefined
              }
              className={`${props.rightIcon.withSeparator && segmentSeparator} text-neutral-8 ${props.rightIcon.action ? 'hover:text-neutral-11' : 'group-hover:text-neutral-12'} flex items-center px-2 py-1.5`}
            >
              <props.rightIcon.icon className="size-4" />
            </span>
          )}
        </>
      ) : (
        props.children
      )}
    </button>
  );
});
