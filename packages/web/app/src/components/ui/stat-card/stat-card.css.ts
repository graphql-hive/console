import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const statCardStyles = {
  header: style(
    component({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(2),
    }),
  ),
  title: recipe({
    base: component({
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      fontWeight: vars.weight.medium,
    }),
    variants: {
      tone: {
        default: component({ color: vars.color.fg.default }),
        success: component({ color: vars.color.success.DEFAULT }),
        danger: component({ color: vars.color.critical.DEFAULT }),
        muted: component({ color: vars.color.fg.secondary }),
      },
    },
    defaultVariants: { tone: 'default' },
  }),
  hintIcon: style(component({ ...square(4), color: vars.color.fg.secondary })),
  // `flexShrink: 0` so a title that wraps to two lines pushes the icon rather than squashing it.
  icon: style(component({ ...square(4), flexShrink: '0', color: vars.color.fg.secondary })),
  value: style([
    shared.text['2xl'],
    shared.weight.bold,
    shared.fg.strong,
    component({ marginTop: space(2) }),
  ]),
  caption: style([shared.text.xs, shared.fg.secondary]),
};
