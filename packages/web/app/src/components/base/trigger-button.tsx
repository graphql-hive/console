import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';

const triggerButtonVariants = cva(
  'group inline-flex items-center rounded-sm border text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: [
          'bg-neutral-3 border-neutral-4 hover:bg-neutral-4 hover:border-neutral-5 text-neutral-11',
          'dark:bg-neutral-3 dark:border-neutral-4 dark:hover:bg-neutral-4 dark:hover:border-neutral-5 hover:text-neutral-12',
        ],
        active: [
          'border-neutral-5 dark:border-neutral-6 text-neutral-12',
          'bg-neutral-3 dark:bg-neutral-5',
        ],
        action: [
          'border-dashed border-accent_30 text-accent_80 bg-accent_08',
          'hover:border-accent_80 hover:text-accent hover:bg-accent_10',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const separatorClass = 'border-l [border-left-color:inherit]';

type CommonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> &
  VariantProps<typeof triggerButtonVariants> & {
    /** When true, the button is visually dimmed and non-interactive */
    disabled?: boolean;
  };

type LabelLayout = CommonProps & {
  layout?: 'label';
  /** Button label text (always shown) */
  label: string;
  /** Icon rendered to the right of label */
  rightIcon?: {
    action?: () => void;
    icon: LucideIcon;
    label?: string;
    withSeparator: boolean;
  };
  /** Accessory information to be displayed after the button label and before any actions */
  accessoryInformation?: string;
};

type IconOnlyLayout = CommonProps & {
  layout: 'iconOnly';
  icon: LucideIcon;
  'aria-label': string;
};

type TriggerButtonProps = LabelLayout | IconOnlyLayout;

export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
  function TriggerButton(props, ref) {
    const { variant, disabled, ...rest } = props;

    // Remove custom props so they don't get spread onto the DOM element
    const domProps = rest as Record<string, unknown>;
    delete domProps.layout;
    delete domProps.label;
    delete domProps.rightIcon;
    delete domProps.accessoryInformation;
    delete domProps.icon;

    return (
      <button
        ref={ref}
        className={triggerButtonVariants({ variant })}
        disabled={disabled}
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        {...domProps}
      >
        {props.layout === 'iconOnly' ? (
          <span className="flex items-center p-1.5">
            <props.icon className="size-4" />
          </span>
        ) : (
          <>
            <span className="px-3 py-1.5 text-[13px]">{props.label}</span>

            {props.accessoryInformation != null && (
              <span className={`${separatorClass} px-3 py-1.5`}>{props.accessoryInformation}</span>
            )}
            {props.rightIcon && (
              <span
                role={props.rightIcon.action ? 'button' : undefined}
                tabIndex={props.rightIcon.action ? 0 : undefined}
                aria-label={props.rightIcon.label ?? undefined}
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
                className={`${props.rightIcon.withSeparator && separatorClass} text-neutral-8 ${props.rightIcon.action ? 'hover:text-neutral-11' : 'group-hover:text-neutral-12'} flex items-center px-2 py-1.5 transition-colors`}
              >
                <props.rightIcon.icon className="size-4" />
              </span>
            )}
          </>
        )}
      </button>
    );
  },
);
