import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, X } from 'lucide-react';

const triggerButtonVariants = cva(
  'inline-flex items-center rounded-sm border text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: [
          'bg-neutral-3 border-neutral-4 hover:bg-neutral-4 hover:border-neutral-5 text-neutral-10',
          'dark:bg-neutral-3 dark:border-neutral-4 dark:hover:bg-neutral-4 dark:hover:border-neutral-5 hover:text-neutral-11',
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

type TriggerButtonProps = VariantProps<typeof triggerButtonVariants> & {
  /** Button label text (always shown) */
  label: string;
  /** Icon rendered before the label */
  icon?: React.ReactNode;
  /** Selected value text (shown after label, styled distinctly) */
  value?: string;
  /** Count badge (shown after label) */
  badge?: number;
  /** When provided, shows × dismiss button instead of chevron. Callback fires on dismiss click. */
  onDismiss?: (e: React.MouseEvent) => void;
  /** When true, the button is visually dimmed and non-interactive */
  disabled?: boolean;
};

export const TriggerButton = forwardRef<HTMLButtonElement, TriggerButtonProps>(
  function TriggerButton({ label, icon, value, badge, onDismiss, variant, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={triggerButtonVariants({ variant })}
        disabled={disabled}
        {...props}
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        <span className="px-3 py-1.5 text-[13px]">{label}</span>
        {value != null && (
          <span className={`${separatorClass} text-neutral-12 px-3 py-1.5`}>{value}</span>
        )}
        {badge != null && <span className={`${separatorClass} px-3 py-1.5`}>{badge}</span>}
        {onDismiss ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear filter"
            onClick={e => {
              e.stopPropagation();
              onDismiss(e);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onDismiss(e as unknown as React.MouseEvent);
              }
            }}
            className={`${separatorClass} text-neutral-8 hover:text-neutral-11 flex items-center px-2 py-1.5 transition-colors`}
          >
            <X className="size-3.5" />
          </span>
        ) : icon ? (
          <span className={`${separatorClass} text-neutral-8 flex items-center px-2 py-1.5`}>
            {icon}
          </span>
        ) : (
          <span className={`${separatorClass} text-neutral-8 flex items-center px-2 py-1.5`}>
            <ChevronDown className="size-4" />
          </span>
        )}
      </button>
    );
  },
);
