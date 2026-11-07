import { styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRingQuiet } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const badgeStyles = {
  root: recipe({
    base: component({
      display: 'inline-flex',
      width: 'fit-content',
      flexShrink: 0,
      cursor: 'default',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(1),
      overflow: 'hidden',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: 1,
      fontWeight: vars.weight.medium,
      whiteSpace: 'nowrap',
      selectors: {
        // Inside a link or a button the badge takes that control's cursor.
        ':where(a, button, [role=button]) &': { cursor: 'inherit' },
      },
    }),
    variants: {
      variant: {
        default: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.neutral[6],
          color: vars.color.fg.default,
        }),
        secondary: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.neutral[4],
          color: vars.color.fg.default,
        }),
        outline: component({
          borderColor: vars.color.line.DEFAULT,
          fontWeight: vars.weight.normal,
          color: vars.color.fg.default,
        }),
        success: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.success.tint,
          color: vars.color.success.text,
        }),
        warning: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.warning.tint,
          color: vars.color.warning.text,
        }),
        critical: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.critical.tint,
          color: vars.color.critical.text,
        }),
        info: component({
          borderColor: 'transparent',
          backgroundColor: vars.color.info.tint,
          color: vars.color.info.text,
        }),
      },
      size: {
        default: [shared.text.xs],
        sm: [shared.text['2xs']],
      },
      padding: {
        default: {},
        tight: component({ paddingInline: space(1), paddingBlock: 0 }),
      },
      mono: {
        true: [shared.mono],
        false: {},
      },
      /** A badge that carries a tooltip is a focus stop, so it shows the quiet ring. */
      focusable: {
        true: [focusRingQuiet],
      },
    },
    compoundVariants: [
      {
        variants: { size: 'default', padding: 'default' },
        style: component({ paddingInline: space(2), paddingBlock: space(0.5) }),
      },
      {
        variants: { size: 'sm', padding: 'default' },
        style: component({ paddingInline: space(1.5), paddingBlock: 1 }),
      },
    ],
    defaultVariants: { variant: 'default', size: 'default', padding: 'default', mono: false },
  }),
  /** The leading icon, by the badge's size. */
  icon: styleVariants({
    default: component(square(3.5)),
    sm: component(square(3)),
  }),
};
