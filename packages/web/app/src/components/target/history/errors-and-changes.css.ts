import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
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

const bullets = spaced(2, {
  listStylePosition: 'inside',
  listStyleType: 'disc',
});

const sections = spaced(5);

const error = style(
  utility({
    marginBottom: space(1),
    marginLeft: '1.25em',
    listStyleType: 'square',
    paddingLeft: '0px',
    selectors: {
      '&::marker': { paddingLeft: space(1) },
      '&::-webkit-details-marker': { paddingLeft: space(1) },
    },
  }),
);

globalStyle(`${error} ::marker`, utility({ paddingLeft: space(1) }));

globalStyle(`${error} ::-webkit-details-marker`, utility({ paddingLeft: space(1) }));

const underlineOnHover = {
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover': { textDecorationLine: 'underline' } },
    },
  },
} as const;

export const errorsAndChangesStyles = {
  // A change's label colour: approved, by severity, or breaking.
  severity: styleVariants({
    safe: utility({ color: vars.color.success.DEFAULT }),
    dangerous: utility({ color: vars.color.warning.DEFAULT }),
  }),
  approved: style(utility({ color: vars.color.accent.DEFAULT })),
  breaking: style(utility({ color: vars.color.critical.DEFAULT })),
  label: style(utility({ textAlign: 'left' })),
  // Changes with usage data stack as cards; plain changes are a bulleted list.
  list: recipe({
    base: utility({
      fontSize: vars.text.sm,
      lineHeight: vars.leading.relaxed,
    }),
    variants: {
      layout: {
        stack: [shared.stack.gap4],
        bullets: [bullets],
      },
    },
  }),
  title: style([
    shared.text.base,
    shared.weight.bold,
    shared.fg.strong,
    utility({ marginBottom: space(3) }),
  ]),
  section: spaced(2),
  sectionTitle: style([shared.text.sm, shared.weight.medium, shared.fg.strong]),
  heading: style(
    utility({
      marginBottom: space(1),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      fontWeight: vars.weight.medium,
      color: vars.color.fg.DEFAULT,
    }),
  ),
  usageSummary: style([
    shared.flex,
    shared.text.sm,
    shared.fg.secondary,
    utility({
      marginBottom: space(2),
      justifyContent: 'space-between',
    }),
  ]),
  usageCount: style([shared.text.xs, shared.fg.default]),
  usageLink: style(
    utility({
      color: vars.color.accent.muted,
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { color: vars.color.accent.DEFAULT } },
        },
      },
    }),
  ),
  usageDetails: style(utility({ marginTop: space(6) })),
  externalIcon: style(utility(square(3))),
  // The expanded change: sections apart when it has usage, padded when it has only details.
  content: recipe({
    variants: {
      spacing: {
        sections: [sections],
        padded: utility({
          paddingTop: space(4),
          paddingBottom: space(4),
        }),
      },
    },
  }),
  panels: style(
    utility({
      display: 'flex',
      gap: space(4),
    }),
  ),
  panelTitle: style([shared.weight.medium, shared.fg.strong]),
  panelList: spaced(1, {
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
  panelLink: style(
    utility({
      display: 'block',
      paddingTop: space(2),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      color: vars.color.accent.DEFAULT,
      ...underlineOnHover,
    }),
  ),
  panelText: style([shared.text.sm, shared.fg.secondary, utility({ marginBottom: space(2) })]),
  panelWarningLink: style(
    utility({
      marginTop: space(2),
      display: 'block',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      color: vars.color.warning.DEFAULT,
      ...underlineOnHover,
    }),
  ),
  approval: style(utility({ marginBottom: space(3) })),
  approvalLink: style([shared.fg.accent, utility(underlineOnHover)]),
  errors: style(utility({ marginBottom: space(2) })),
  errorsText: style([shared.text.sm, shared.fg.default, utility({ marginBottom: space(2) })]),
  error,
  empty: style(utility({ cursor: 'default' })),
  emptyHeader: style([shared.row.gap3, utility({ marginBottom: space(3) })]),
  emptyIcon: style(utility({ ...square(4), color: vars.color.success.DEFAULT })),
  emptyTitle: style([shared.text.base, shared.weight.medium, shared.fg.strong]),
  emptyText: style([shared.text.xs, shared.fg.secondary]),
};
