import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import { animate } from '../styles/animations.css';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

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

const toggleRow = style(
  utility({
    marginLeft: space(2),
    display: 'flex',
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${toggleRow} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

const conditionalList = style(
  utility({
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
  }),
);

globalStyle(
  `:where(${conditionalList} > :not(:last-child))`,
  utility({
    borderBottomStyle: 'solid',
    borderTopStyle: 'solid',
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
    borderColor: vars.color.line.DEFAULT,
  }),
);

const annotationIcon = (color: string) =>
  style(utility({ marginRight: space(2), marginLeft: 'auto', ...square(4), color }));

const statusIcon = (color?: string) =>
  style(utility({ ...square(3.5), ...(color ? { color } : {}) }));

const approvalText = style(
  utility({
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
    color: vars.color.fg.secondary,
  }),
);

const paragraph = style(utility({ marginBottom: space(2) }));

const section = style(utility({ marginBottom: space(3) }));

const inlineStatus = style(utility({ display: 'inline-flex' }));

const hintIcon = style(utility(square(3)));

const emphasis = style(utility({ color: vars.color.fg.DEFAULT }));

export const targetChecksSingleStyles = {
  inlineStatus,
  sdl: style(utility({ maxWidth: 'inherit' })),
  // An inline annotation on the SDL, coloured by its severity.
  annotation: recipe({
    base: [
      shared.row.base,
      utility({
        borderLeftStyle: 'solid',
        borderLeftWidth: '5px',
        paddingLeft: space(1),
      }),
    ],
    variants: {
      severity: {
        warning: utility({
          borderColor: vars.color.warning.line,
          backgroundColor: vars.color.warning.tint,
          color: vars.color.warning.text,
        }),
        error: utility({
          borderColor: vars.color.critical.DEFAULT,
          backgroundColor: vars.color.critical.tint,
          color: vars.color.critical.text,
        }),
      },
    },
  }),
  annotationWarningIcon: annotationIcon(vars.color.warning.DEFAULT),
  annotationErrorIcon: annotationIcon(vars.color.critical.DEFAULT),
  toggleHint: style([shared.text.xs, shared.fg.muted, utility({ marginRight: space(2) })]),
  toggleRow,
  approval: spaced(2),
  approvalTitle: style(
    utility({
      lineHeight: '1',
      fontWeight: vars.weight.medium,
    }),
  ),
  approvalText,
  approvalActions: style(utility({ textAlign: 'right' })),
  approvalSpinner: style(utility({ marginRight: space(2), ...square(4), animation: animate.spin })),
  hintIcon,
  hint: style([shared.weight.normal, shared.fg.default]),
  hintTitle: style([shared.text.lg, shared.weight.bold, utility({ marginBottom: space(1) })]),
  hintText: style([shared.text.sm, utility({ marginBottom: space(2) })]),
  hintSubtitle: style(
    utility({
      marginBottom: space(1),
      fontWeight: vars.weight.bold,
    }),
  ),
  paragraph,
  policyInfoText: style([shared.text.xs, shared.fg.default]),
  policyIssues: style(
    utility({
      listStylePosition: 'inside',
      listStyleType: 'disc',
      paddingLeft: space(3),
      fontSize: vars.text.sm,
      lineHeight: vars.leading.relaxed,
    }),
  ),
  policyIssue: recipe({
    base: utility({ marginBlock: space(1) }),
    variants: {
      type: {
        warning: [shared.fg.warning],
        error: utility({ color: vars.color.critical.DEFAULT }),
      },
    },
  }),
  policyIssueText: style(
    utility({
      textAlign: 'left',
      color: vars.color.fg.secondary,
    }),
  ),
  policyIssueLocation: style([
    shared.text.xs,
    shared.fg.muted,
    utility({
      marginLeft: space(1),
      cursor: 'default',
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { textDecorationLine: 'underline' } },
        },
      },
    }),
  ]),
  policyIssueHint: style(
    utility({
      marginLeft: space(2),
      display: 'inline-block',
      color: vars.color.fg.subtle,
    }),
  ),
  policyIssueRule: style([shared.text.sm, shared.fg.default]),
  emphasis,
  conditionalMeta: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ marginTop: space(10), marginBottom: space(5) }),
  ]),
  conditionalDetails: style(utility({ padding: space(2) })),
  conditionalTitle: style([
    shared.text.sm,
    shared.weight.semibold,
    shared.fg.strong,
    utility({ marginBottom: space(2) }),
  ]),
  conditionalList,
  conditionalItem: style(utility({ paddingBlock: space(2) })),
  conditionalItemText: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: '3',
    }),
  ]),
  schemaView: style(utility({ padding: space(5) })),
  schemaViewSection: style(utility({ marginBottom: space(5) })),
  schemaTitle: style(
    utility({
      display: 'flex',
      alignItems: 'center',
      gap: space(1),
    }),
  ),
  schemaName: style(utility({ fontFamily: vars.font.mono })),
  schemaArrow: style(utility({ display: 'inline', ...square(3) })),
  schemaViewBody: style(
    utility({
      paddingInline: space(5),
      paddingBlock: space(3),
    }),
  ),
  checksCount: style([
    shared.inlineRow.gap1_5,
    shared.text.xs,
    shared.fg.default,
    utility({ paddingInline: space(2) }),
  ]),
  checks: style([shared.stack.gap3, utility({ marginTop: space(3) })]),
  section,
  statusFailedIcon: statusIcon(vars.color.critical.DEFAULT),
  statusCompareIcon: statusIcon(),
  statusPassedIcon: statusIcon(vars.color.success.DEFAULT),
  statusTrailing: style([shared.inlineRow.gap1_5, shared.text.xs, shared.fg.muted]),
  pending: style([
    shared.row.base,
    shared.fill,
    utility({ height: 'fit-content', justifyContent: 'center', alignSelf: 'center' }),
  ]),
  pendingText: style([
    shared.stack.base,
    shared.text.sm,
    shared.fg.secondary,
    utility({ alignItems: 'center' }),
  ]),
  emptyList: style(
    utility({
      borderStyle: 'solid',
      borderWidth: '0px',
    }),
  ),
  root: style([shared.stack.base, shared.fillShrinkable, utility({ height: '100%' })]),
  content: style(utility({ paddingBlock: space(6) })),
  summary: style([
    shared.row.gap4,
    utility({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      backgroundColor: vars.color.surface.card,
      paddingInline: space(5),
      paddingBlock: space(4),
    }),
  ]),
  failed: style(utility({ color: vars.color.critical.DEFAULT })),
  summaryNote: style([shared.text.xs, shared.fg.secondary, utility({ display: 'block' })]),
  toggleIcon: style(utility({ marginLeft: space(2), ...square(4) })),
  approved: style([
    shared.flex,
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(6),
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.subtle,
      padding: space(4),
    }),
  ]),
  approvedIcon: style(utility({ ...square(6), color: vars.color.success.DEFAULT })),
  approvedTitle: style(
    utility({
      fontSize: vars.text.sm,
      lineHeight: '1',
      fontWeight: vars.weight.medium,
    }),
  ),
  approvedBy: style([shared.text.sm, shared.fg.strong, utility({ fontStyle: 'italic' })]),
  approvedNote: style([shared.text.sm, utility({ fontStyle: 'italic' })]),
};
