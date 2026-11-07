import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const row = style(
  utility({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: space(2),
    paddingBottom: space(2),
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
);

globalStyle(
  `:where(${row} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(4),
  }),
);

export const permissionSelectorStyles = {
  list: style(
    utility({
      paddingTop: space(1),
      paddingLeft: space(2),
    }),
  ),
  row,
  // Dimmed while a dependency is unmet or the viewer may not assign it.
  rowText: recipe({
    variants: {
      dimmed: {
        true: utility({ opacity: '30%' }),
      },
    },
  }),
  title: style([shared.weight.semibold, shared.fg.strong]),
  description: style([shared.text.xs, shared.fg.default]),
  aside: style([shared.flex, shared.grow, utility({ justifyContent: 'flex-end' })]),
  note: style([shared.text.sm, shared.fg.default]),
  warningIcon: style(utility({ color: vars.color.warning.DEFAULT })),
  // Drawn around the row a dependency link points at.
  focusRing: style(
    utility({
      pointerEvents: 'none',
      position: 'absolute',
      top: '-4px',
      right: '0px',
      bottom: '3px',
      left: '-7px',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.warning.DEFAULT,
    }),
  ),
};
