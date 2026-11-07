import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const spacedRow = style(
  utility({
    display: 'flex',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  }),
);

globalStyle(
  `:where(${spacedRow} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

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

export const organizationSupportTicketStyles = {
  // A comment sits on the user's or the support side of the thread.
  comment: recipe({
    base: [spacedRow],
    variants: {
      side: {
        support: utility({ justifyContent: 'flex-end' }),
        user: utility({ justifyContent: 'flex-start' }),
      },
    },
  }),
  commentUserIcon: style(utility({ ...square(6), color: vars.color.accent.DEFAULT })),
  commentBubble: recipe({
    base: utility({
      display: 'inline-block',
      maxWidth: '70%',
      borderRadius: vars.radius.lg,
      backgroundColor: vars.color.surface.selected,
      padding: space(2),
      textAlign: 'left',
      color: vars.color.fg.default,
    }),
    variants: {
      side: {
        support: utility({ borderBottomRightRadius: '0' }),
        user: utility({ borderBottomLeftRadius: '0' }),
      },
    },
  }),
  commentTime: style(utility({ color: vars.color.fg.secondary })),
  commentLogo: style([shared.icon.xl, utility({ display: 'block' })]),
  root: style(utility({ paddingBlock: space(6) })),
  layout: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      columnGap: space(6),
    }),
  ),
  thread: style(
    utility({
      flex: '1',
      borderRightStyle: 'solid',
      borderRightWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingRight: space(6),
    }),
  ),
  title: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(2),
    }),
  ),
  titleLink: style(
    utility({
      fontSize: vars.text.lg,
      lineHeight: vars.text.lgLineHeight,
      fontWeight: vars.weight.semibold,
      letterSpacing: vars.tracking.tight,
      color: vars.color.accent.DEFAULT,
      textUnderlineOffset: '4px',
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { textDecorationLine: 'underline' } },
        },
      },
    }),
  ),
  titleSubject: style([
    shared.text.lg,
    shared.weight.semibold,
    shared.fg.secondary,
    utility({ letterSpacing: vars.tracking.tight }),
  ]),
  titleChevron: style(utility(square(4))),
  comments: spaced(6, { paddingBlock: space(12) }),
  reply: style(utility({ marginTop: space(6) })),
  details: style([shared.noShrink, shared.text.sm, utility({ width: '33.333333%' })]),
  detailsList: style([shared.stack.base, utility({ rowGap: space(6), textAlign: 'left' })]),
  detail: spaced(0),
  detailLabel: style([shared.weight.semibold, shared.fg.strong]),
  detailTime: style(
    utility({
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      color: vars.color.fg.secondary,
    }),
  ),
  page: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  pending: style(utility({ paddingBlock: space(6) })),
};
