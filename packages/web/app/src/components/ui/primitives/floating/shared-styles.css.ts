import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { palette, vars } from '../../../../styles/theme.css';
import * as utilities from '../../../../styles/utilities.css';

// Sides and bottom only: the first row of a menu brings the top inset itself.
const panelInset = style(
  component({
    paddingInline: space(2),
    paddingBottom: space(2),
  }),
);

// No z-index here. The positioner is transformed for placement, which makes it a stacking
// context, so a z-index on the popup would only compete inside it and lose to any page element
// that outranks the positioner. It goes on the positioner instead.
const panelBase = style([
  utilities.thinScrollbar,
  component({
    maxHeight: 'var(--available-height)',
    overflowX: 'hidden',
    overflowY: 'auto',
    borderRadius: vars.radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: vars.color.line.DEFAULT,
    backgroundColor: vars.color.surface.floating,
    fontSize: vars.text.control,
    lineHeight: vars.text.controlLineHeight,
    boxShadow: `0 4px 6px -1px color-mix(in srgb, hsl(${palette.neutral[1]}) 30%, transparent), 0 2px 4px -2px color-mix(in srgb, hsl(${palette.neutral[1]}) 30%, transparent)`,
    outlineStyle: 'none',
    '@supports': {
      '(color: color-mix(in lab, red, red))': {
        boxShadow: `0 4px 6px -1px color-mix(in oklab, ${vars.color.neutral[1]} 30%, transparent), 0 2px 4px -2px color-mix(in oklab, ${vars.color.neutral[1]} 30%, transparent)`,
      },
    },
  }),
]);

export const floatingStyles = {
  panelInset,
  panelBase,
  panel: recipe({
    base: [panelBase],
    variants: {
      padding: {
        none: {},
        sm: component({ padding: space(1) }),
        md: component({ padding: space(2) }),
        menu: [panelInset],
      },
      maxWidth: {
        default: component({ maxWidth: space(75) }),
        none: component({ maxWidth: 'none' }),
        sm: component({ maxWidth: space(60) }),
        lg: component({ maxWidth: '380px' }),
      },
      minWidth: {
        default: component({ minWidth: '12rem' }),
        none: component({ minWidth: '0px' }),
        sm: component({ minWidth: space(40) }),
        md: component({ minWidth: space(60) }),
      },
      width: {
        none: {},
        sm: component({ width: space(40) }),
      },
    },
    defaultVariants: {
      padding: 'sm',
      maxWidth: 'none',
      minWidth: 'none',
      width: 'none',
    },
  }),
  item: recipe({
    base: component({
      display: 'flex',
      height: space(7),
      cursor: 'pointer',
      alignItems: 'center',
      gap: space(2),
      borderRadius: vars.radius.sm,
      outlineStyle: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
    variants: {
      variant: {
        default: component({
          paddingInline: space(2),
          color: vars.color.fg.default,
        }),
        navigationLink: component({
          justifyContent: 'flex-end',
          paddingRight: space(2),
          color: vars.color.accent.muted,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  backgroundColor: 'transparent',
                  color: vars.color.accent.DEFAULT,
                },
              },
            },
          },
        }),
        action: component({
          paddingLeft: space(2),
          color: vars.color.accent.muted,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  backgroundColor: vars.color.accent.tint,
                  color: vars.color.accent.DEFAULT,
                },
              },
            },
          },
        }),
        destructiveAction: component({
          paddingLeft: space(2),
          color: vars.color.critical.DEFAULT,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': { backgroundColor: vars.color.critical.tint },
              },
            },
          },
        }),
      },
      highlighted: {
        true: component({
          backgroundColor: vars.color.surface.selected,
          color: vars.color.fg.DEFAULT,
        }),
        false: {},
      },
      selected: {
        true: component({ color: vars.color.fg.DEFAULT }),
        false: {},
      },
      disabled: {
        true: component({
          pointerEvents: 'none',
          opacity: '50%',
        }),
        false: {},
      },
    },
    defaultVariants: {
      variant: 'default',
      highlighted: false,
      selected: false,
      disabled: false,
    },
  }),
  emptyState: style(
    component({
      paddingInline: space(2),
      paddingBlock: space(4),
      textAlign: 'center',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      color: vars.color.fg.subtle,
      fontStyle: 'italic',
    }),
  ),
};
