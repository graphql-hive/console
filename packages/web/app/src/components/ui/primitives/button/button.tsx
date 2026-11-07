import { forwardRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { useRender } from '@base-ui/react/use-render';
import { disabledStyle } from '../shared-styles';
import { buttonStyles } from './button.css';

export const buttonVariants = lenient(buttonStyles.root);

const rightIconVariants = lenient(buttonStyles.rightIcon);

type AnchorProps = {
  href: string;
  target?: '_blank' | '_self';
  rel?: string;
  download?: boolean | string;
};

// `layout` is a recipe variant so padding can key on it, but as a prop it is the discriminant of
// the union below, so the union defines it rather than the recipe.
type CommonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> &
  Omit<NonNullable<Parameters<typeof buttonVariants>[0]>, 'layout'> & {
    'data-testid'?: string;
    /**
     * Render an `<a>` instead of a `<button>`, for a button that links out: another site, a
     * mailto, an API redirect. A `_blank` target gets `rel="noopener noreferrer"` unless `rel`
     * is given, and `disabled` becomes `aria-disabled` with the href dropped. Router links use
     * `render` with `<Link>` instead.
     */
    anchor?: AnchorProps;
    /**
     * The element to render instead of a `<button>`, for a button that navigates within the
     * app: a router `<Link>`. It gets the button's classes, ref and handlers merged onto its own.
     */
    render?: useRender.RenderProp;
  };

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
  const { variant, size, width, onSurface, disabled, anchor, render, ...rest } = props;

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

  const anchorElement = anchor ? (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- the render hook merges the button's children into it
    <a
      href={disabled ? undefined : anchor.href}
      target={anchor.target}
      rel={anchor.rel ?? (anchor.target === '_blank' ? 'noopener noreferrer' : undefined)}
      download={anchor.download}
    />
  ) : undefined;

  return useRender({
    render: anchorElement ?? render,
    ref,
    defaultTagName: 'button',
    props: {
      className: buttonVariants({ variant, size, layout, width, onSurface }),
      disabled: anchor ? undefined : disabled,
      'aria-disabled': anchor && disabled ? true : undefined,
      tabIndex: anchor && disabled ? -1 : undefined,
      style: disabled ? disabledStyle : undefined,
      ...domProps,
      children:
        props.layout === 'iconOnly' ? (
          <span className={buttonStyles.iconSlot}>
            <props.icon className={buttonStyles.iconOnlyIcon} />
          </span>
        ) : props.label != null ? (
          <>
            <span className={buttonStyles.label}>{props.label}</span>

            {props.accessoryInformation != null && (
              <span className={buttonStyles.accessory}>{props.accessoryInformation}</span>
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
                className={rightIconVariants({
                  separated: props.rightIcon.withSeparator,
                  interactive: !!props.rightIcon.action,
                })}
              >
                <props.rightIcon.icon className={buttonStyles.rightIconGlyph} />
              </span>
            )}
          </>
        ) : (
          props.children
        ),
    },
  });
});
