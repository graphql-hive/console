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
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const separatorClass = 'border-l [border-left-color:inherit]';

type TriggerButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style'
> &
  VariantProps<typeof triggerButtonVariants> & {
    /** Button label text (always shown) */
    label: string;
    /** Icon rendered to the right of label */
    rightIcon: {
      action?: () => void;
      icon: LucideIcon;
      label?: string;
      withSeparator: boolean;
    };
    /** Accessory information to be displayed after the button label and before any actions */
    accessoryInformation?: string;
    /** When true, the button is visually dimmed and non-interactive */
    disabled?: boolean;
  };

export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
  function TriggerButton(
    { label, rightIcon, accessoryInformation, variant, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={triggerButtonVariants({ variant })}
        disabled={disabled}
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        {...props}
      >
        <span className="px-3 py-1.5 text-[13px]">{label}</span>

        {accessoryInformation != null && (
          <span className={`${separatorClass} px-3 py-1.5`}>{accessoryInformation}</span>
        )}
        <span
          role={rightIcon.action ? 'button' : undefined}
          tabIndex={rightIcon.action ? 0 : undefined}
          aria-label={rightIcon.label ?? undefined}
          onClick={
            rightIcon.action
              ? e => {
                  e.stopPropagation();
                  rightIcon.action!();
                }
              : undefined
          }
          onKeyDown={
            rightIcon.action
              ? e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    rightIcon.action!();
                  }
                }
              : undefined
          }
          className={`${rightIcon.withSeparator && separatorClass} text-neutral-8 ${rightIcon.action ? 'hover:text-neutral-11' : 'group-hover:text-neutral-12'} flex items-center px-2 py-1.5 transition-colors`}
        >
          <rightIcon.icon className="size-4" />
        </span>
      </button>
    );
  },
);
