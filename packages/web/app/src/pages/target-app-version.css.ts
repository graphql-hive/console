import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const targetAppVersionStyles = {
  anonymous: style(
    utility({
      cursor: 'help',
      fontStyle: 'italic',
    }),
  ),
  content: style([
    shared.stack.base,
    shared.fill,
    utility({ height: '100%', paddingBlock: space(6) }),
  ]),
  header: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space(4),
    }),
  ),
  filterNotice: style([
    shared.row.between,
    shared.text.sm,
    utility({
      marginTop: space(4),
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.warning.line,
      backgroundColor: vars.color.warning.tint,
      paddingInline: space(4),
      paddingBlock: space(2),
    }),
  ]),
  filterCode: style([
    shared.mono,
    shared.fg.warning,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.code,
      paddingInline: space(1),
      paddingBlock: space(0.5),
    }),
  ]),
  filterLink: style(
    utility({
      color: vars.color.warning.DEFAULT,
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { textDecorationLine: 'underline' } },
        },
      },
    }),
  ),
  table: style(utility({ marginTop: space(4) })),
  summary: style(utility({ marginBottom: space(3) })),
  summaryGrid: style([
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      display: 'grid',
      gridAutoFlow: 'column',
      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space(4),
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingInline: space(4),
      paddingBlock: space(3),
      '@media': {
        '(width >= 48rem)': { gridTemplateRows: 'repeat(1, minmax(0, 1fr))' },
      },
    }),
  ]),
  status: recipe({
    base: utility({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      fontWeight: vars.weight.semibold,
      color: vars.color.fg.DEFAULT,
    }),
    variants: {
      state: {
        retired: utility({ color: vars.color.critical.DEFAULT }),
        pending: utility({ color: vars.color.fg.default }),
      },
    },
  }),
  valueCentered: style([
    shared.truncate,
    shared.textCenter,
    shared.text.sm,
    shared.weight.semibold,
    shared.fg.strong,
  ]),
  value: style([shared.text.sm, shared.weight.semibold, shared.fg.strong]),
  valueMuted: style([shared.weight.normal, shared.fg.secondary]),
  page: style(utility({ minHeight: vars.minH.content })),
};
