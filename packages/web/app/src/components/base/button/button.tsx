import { forwardRef, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { controlOnSurface, controlSize, disabledStyle, segmentSeparator } from '../shared-styles';

export const buttonVariants = cva(
  [
    'group inline-flex items-center rounded-sm border font-medium transition-colors',
    'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Segmented trigger style (for selects, menus, popovers, filters). Fill and border come
        // from `controlOnSurface` in the compound variants below.
        default: 'text-neutral-9 hover:text-neutral-11 dark:text-neutral-11',
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
          'border-neutral-5 bg-transparent text-neutral-11 hover:bg-neutral-4 hover:text-neutral-12',
        ghost:
          'border-transparent bg-transparent text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12',
        destructive: [
          'bg-critical_08 border-critical_30 text-critical_80 hover:bg-critical_10 hover:border-critical hover:text-critical',
        ],
      },
      size: {
        compact: controlSize.compact,
        default: controlSize.default,
        'icon-sm': 'size-7 justify-center',
      },
      // What is inside. `label` and `iconOnly` pad their own segments, so the separators between
      // segments can run the full height; only `children` pads the button itself, by size.
      layout: {
        children: '',
        label: '',
        iconOnly: '',
      },
      // Only `full` exists because only full-width is a thing buttons ask for: 116 of the
      // legacy call sites set w-full and nothing else. Fixed widths belong to the component
      // that needs them (a Select trigger), which sizes its wrapper and passes `full` down.
      width: {
        auto: '',
        full: 'w-full justify-center',
      },
      // Which surface the button sits on. Only `default` changes: it is the one variant with a
      // fill of its own to drop, and it is the variant Select uses for its trigger.
      onSurface: {
        base: '',
        raised: '',
      },
    },
    compoundVariants: [
      { variant: 'default', onSurface: 'base', class: controlOnSurface.base },
      { variant: 'default', onSurface: 'raised', class: controlOnSurface.raised },
      { layout: 'children', size: 'compact', class: 'gap-1 px-3' },
      { layout: 'children', size: 'default', class: 'gap-1.5 px-4' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      layout: 'children',
      width: 'auto',
      onSurface: 'base',
    },
  },
);

// `layout` is a cva variant so padding can key on it, but as a prop it is the discriminant of
// the union below, so the union defines it rather than cva.
type CommonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> &
  Omit<VariantProps<typeof buttonVariants>, 'layout'>;

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
  const { variant, size, width, onSurface, disabled, ...rest } = props;

  // Remove custom props so they don't get spread onto the DOM element
  const domProps = rest as Record<string, unknown>;
  delete domProps.layout;
  delete domProps.label;
  delete domProps.rightIcon;
  delete domProps.accessoryInformation;
  delete domProps.icon;
  delete domProps.children;

  const layout =
    props.layout === 'iconOnly' ? 'iconOnly' : props.label != null ? 'label' : 'children';

  return (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, layout, width, onSurface })}
      disabled={disabled}
      style={disabled ? disabledStyle : undefined}
      {...domProps}
    >
      {props.layout === 'iconOnly' ? (
        <span className="flex items-center p-1.5">
          <props.icon className="size-3" />
        </span>
      ) : props.label != null ? (
        <>
          <span className="flex items-center self-stretch px-3">{props.label}</span>

          {props.accessoryInformation != null && (
            <span className={`${segmentSeparator} flex items-center self-stretch px-3`}>
              {props.accessoryInformation}
            </span>
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
              className={`${props.rightIcon.withSeparator && segmentSeparator} text-neutral-8 ${props.rightIcon.action ? 'hover:text-neutral-11' : 'group-hover:text-neutral-12'} flex items-center self-stretch px-2`}
            >
              <props.rightIcon.icon className="size-3" />
            </span>
          )}
        </>
      ) : (
        props.children
      )}
    </button>
  );
});
