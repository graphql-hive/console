import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const spaced = (gap: number, rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

export const breakingChangesFormStyles = {
  // Faded and inert until conditional breaking changes are switched on.
  root: recipe({
    base: [shared.fg.default],
    variants: {
      disabled: {
        true: utility({
          pointerEvents: 'none',
          opacity: '25%',
        }),
      },
    },
  }),
  fields: style(
    utility({
      marginBlock: space(2),
      width: 'auto',
      maxWidth: vars.container['4xl'],
    }),
  ),
  errors: spaced(1, { marginTop: space(3), color: vars.color.critical.DEFAULT }),
  sections: spaced(6),
  section: spaced(2),
  strong: style(utility({ fontWeight: vars.weight.semibold })),
  hint: style([shared.text.xs, shared.fg.secondary]),
  control: style(utility({ maxWidth: '420px' })),
  targetsSection: spaced(1),
  targetsHelp: spaced(1, {
    listStyleType: 'disc',
    paddingLeft: space(4),
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
    color: vars.color.fg.secondary,
  }),
  targets: spaced(2, { paddingLeft: space(2) }),
  target: style([shared.row.base, utility({ columnGap: space(2) })]),
  example: spaced(2, {
    width: 'auto',
    maxWidth: vars.container['4xl'],
    borderRadius: vars.radius.sm,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: vars.color.line.DEFAULT,
    backgroundColor: vars.color.surface.card,
    paddingBlock: space(2),
    paddingLeft: space(5),
    color: vars.color.fg.secondary,
  }),
};
