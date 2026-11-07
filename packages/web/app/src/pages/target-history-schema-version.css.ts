import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
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

const divided = (rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      borderBottomStyle: 'solid',
      borderTopStyle: 'solid',
      borderTopWidth: '0px',
      borderBottomWidth: '1px',
    }),
  );
  return root;
};

const hoverSurface = {
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
    },
  },
} as const;

const kind = (text: string, bg: string, dot: string) => ({
  text: style(utility({ color: text })),
  bg: style(utility({ backgroundColor: bg })),
  dot: style(utility({ backgroundColor: dot })),
});

const inlineMeta = style(
  utility({
    display: 'inline-flex',
    alignItems: 'center',
    gap: space(1.5),
  }),
);

const spacedBelow = style(utility({ marginBottom: space(3) }));

const statusIcon = (color?: string) =>
  style(utility({ ...square(3.5), ...(color ? { color } : {}) }));

const smallIcon = style(utility(square(3.5)));

const tinyIcon = style(utility(square(3)));

const checkIcon = style(utility({ ...square(4), color: vars.color.success.DEFAULT }));

const noticeText = style(
  utility({
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
    color: vars.color.fg.secondary,
  }),
);

const notice = style(utility({ cursor: 'default' }));

const noticeHeader = style(
  utility({
    marginBottom: space(3),
    display: 'flex',
    alignItems: 'center',
    gap: space(3),
  }),
);

const noticeTitle = style(
  utility({
    fontSize: vars.text.base,
    lineHeight: vars.text.baseLineHeight,
    fontWeight: vars.weight.medium,
    color: vars.color.fg.DEFAULT,
  }),
);

const card = divided({
  overflow: 'hidden',
  borderRadius: vars.radius.xl,
  borderStyle: 'solid',
  borderWidth: '1px',
});

const cardBody = style(utility({ backgroundColor: vars.color.surface.inset }));

const header = style(
  utility({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space(4),
  }),
);

const changesPadded = style(utility({ paddingInline: space(5) }));

const changes = spaced(3);

const subgraphIcon = style(
  utility({
    display: 'flex',
    ...square(7),
    flexShrink: '0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.radius.md,
    boxShadow: `0 0 0 1px ${vars.color.accent.line}, 0 0 0 2px currentcolor`,
  }),
);

const subgraphName = style(
  utility({
    paddingBlock: space(0.5),
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
);

const toggle = style(
  utility({
    display: 'inline-flex',
    alignItems: 'center',
    gap: space(1),
    borderRadius: vars.radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    padding: space(1),
  }),
);

const toggleButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: space(1.5),
  borderRadius: vars.radius.md,
  paddingInline: space(2.5),
  paddingBlock: space(1),
} as const;

export const targetHistorySchemaVersionStyles = {
  pending: style([
    shared.stack.base,
    shared.fullWidth,
    shared.text.sm,
    shared.fg.secondary,
    utility({
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    }),
  ]),
  spacedBelow,
  error: style(utility({ marginTop: space(20) })),
  count: style([
    shared.inlineRow.gap1_5,
    shared.text.xs,
    shared.fg.default,
    utility({ paddingInline: space(2) }),
  ]),
  inlineMeta,
  root: style([
    shared.stack.base,
    shared.fullWidth,
    shared.fillShrinkable,
    utility({ paddingBlock: space(6) }),
  ]),
  tabs: style([shared.stack.gap3, utility({ marginTop: space(3) })]),
  tab: spaced(8),
  summaryOnly: spaced(8, { marginTop: space(4) }),
  statusCompareIcon: statusIcon(),
  statusPassedIcon: statusIcon(vars.color.success.DEFAULT),
  statusFailedIcon: statusIcon(vars.color.critical.DEFAULT),
  statusTrailing: style([shared.inlineRow.gap1_5, shared.text.xs, shared.fg.muted]),
  serviceArrow: style(utility({ display: 'inline', ...square(3) })),
  header,
  sortHint: style([shared.text.xs, shared.fg.muted]),
  sdl: style([
    shared.stack.base,
    utility({
      minHeight: 'var(--code-max-h)',
      vars: { '--code-max-h': 'calc(100vh - 11rem)' },
    }),
  ]),
  sdlPadded: style(
    utility({
      paddingInline: space(5),
      paddingBlock: space(3),
    }),
  ),
  downloadIcon: style(utility({ marginRight: space(1), ...square(3) })),
  changes,
  changesPadded,
  changesBody: style(
    utility({
      paddingTop: space(2),
      paddingBottom: space(8),
    }),
  ),
  changesEmpty: style([shared.text.xs, utility({ paddingBlock: space(3) })]),
  changesPending: style(utility({ paddingBlock: space(3) })),
  card,
  cardHeaderRow: style(utility({ backgroundColor: vars.color.surface.card })),
  cardBody,
  subgraphNote: style([shared.text.xs, utility({ maxWidth: '600px', padding: space(5) })]),
  subgraphChanges: style(
    utility({
      marginBottom: space(8),
      paddingTop: space(2),
    }),
  ),
  subgraphChangesEmpty: style([shared.text.xs, utility({ paddingBlock: space(5) })]),
  subgraphChangesNote: style([
    shared.text.xs,
    utility({ paddingInline: space(5), paddingBlock: space(5) }),
  ]),
  subgraphChangesList: spaced(4),
  diffMessage: style([
    shared.row.gap2,
    shared.text.xs,
    shared.fg.secondary,
    utility({ paddingInline: space(5), paddingBlock: space(3) }),
  ]),
  checkIcon,
  infoIcon: style(utility({ ...square(4), color: vars.color.fg.muted })),
  diffNotice: style(
    utility({
      cursor: 'default',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.subtle,
      paddingInline: space(5),
      paddingBlock: space(3),
    }),
  ),
  diffNoticeHeader: style([shared.row.gap3, utility({ marginBottom: space(1) })]),
  diffNoticeTitle: style([shared.text.sm, shared.weight.medium, shared.fg.strong]),
  noticeText,
  sdlView: style(utility({ maxWidth: 'inherit' })),
  notice,
  noticeHeader,
  noticeTitle,
  commitIcon: smallIcon,
  commitLink: style(utility({ fontFamily: vars.font.mono })),
  commitMeta: style([shared.inlineRow.gap1_5, utility({ flexWrap: 'wrap' })]),
  branch: style([shared.inlineRow.gap1, utility({ marginLeft: space(1) })]),
  branchIcon: tinyIcon,
  title: style(
    utility({
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      columnGap: space(4),
      rowGap: space(2),
    }),
  ),
  titleText: style([
    shared.weight.semibold,
    shared.fg.strong,
    utility({ fontSize: vars.text.xl, lineHeight: vars.leading.tight }),
  ]),
  titleDescription: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ marginTop: space(1.5) }),
  ]),
  meta: style(
    utility({
      marginTop: space(6),
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      backgroundColor: vars.color.surface.card,
      paddingInline: space(5),
      paddingBlock: space(4),
    }),
  ),
  metaIcon: tinyIcon,
  metaValue: style([shared.truncate, utility({ marginTop: space(0.5), display: 'block' })]),
  toggle,
  viewModeButton: recipe({
    base: utility({
      ...toggleButton,
      fontSize: '12.5px',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      ...hoverSurface,
    }),
    variants: {
      active: { true: utility({ backgroundColor: vars.color.surface.selected }) },
    },
  }),
  toggleIcon: smallIcon,
  severityDot: styleVariants({
    breaking: utility({ backgroundColor: vars.color.critical.DEFAULT }),
    dangerous: utility({ backgroundColor: vars.color.warning.DEFAULT }),
    safe: utility({ backgroundColor: vars.color.info.DEFAULT }),
    all: utility({ backgroundColor: vars.color.fg.muted }),
  }),
  changeTypeButton: recipe({
    base: utility({
      ...toggleButton,
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      ...hoverSurface,
    }),
    variants: {
      active: { true: utility({ backgroundColor: vars.color.surface.selected }) },
    },
  }),
  changeTypeDot: style(
    utility({
      ...square(1.5),
      translate: '0 -1px',
      borderRadius: vars.radius.full,
    }),
  ),
  sectionTitle: style([shared.text.base, shared.weight.semibold, shared.fg.strong]),
  sectionSubtitle: style([shared.text.sm, shared.fg.secondary, utility({ marginTop: space(0.5) })]),
  stats: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '1px',
      overflow: 'hidden',
      borderRadius: vars.radius.xl,
      borderStyle: 'solid',
      borderWidth: '1px',
      backgroundColor: vars.color.surface.card,
      '@media': {
        '(width >= 96rem)': { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' },
      },
    }),
  ),
  statBreaking: style([
    shared.row.base,
    shared.text.xs,
    shared.fg.critical,
    utility({
      marginLeft: space(2),
      gap: space(0.5),
      '@media': {
        '(width >= 64rem)': { fontSize: vars.text.sm, lineHeight: vars.text.smLineHeight },
      },
    }),
  ]),
  statInlineIcon: style(utility({ display: 'inline' })),
  statSafe: style([shared.text.base, shared.fg.success, utility({ paddingLeft: space(2) })]),
  statWide: style(
    utility({
      display: 'none',
      '@media': {
        '(width >= 96rem)': { display: 'flex' },
      },
    }),
  ),
  subgraphs: style(
    utility({
      overflow: 'hidden',
      borderRadius: vars.radius.xl,
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ),
  subgraphsHeader: style([
    shared.row.between,
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      backgroundColor: vars.color.surface.card,
      paddingInline: space(5),
      paddingBlock: space(3),
    }),
  ]),
  subgraphsTitle: style([
    shared.row.gap2,
    shared.text.xs,
    shared.weight.bold,
    utility({ textTransform: 'capitalize' }),
  ]),
  subgraphsList: divided({ backgroundColor: vars.color.surface.inset }),
  subgraphDiff: recipe({
    variants: {
      unchanged: { true: utility({ opacity: '50%' }) },
    },
  }),
  stat: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      gap: space(1.5),
      paddingInline: space(5),
      paddingBlock: space(4),
    }),
  ),
  statLabel: style([shared.text.xs, shared.weight.bold, utility({ textTransform: 'capitalize' })]),
  statValue: style(
    utility({
      fontSize: vars.text.xl,
      lineHeight: '1',
      letterSpacing: vars.tracking.tight,
    }),
  ),
  // The colours of a subgraph's kind of change.
  kind: {
    added: kind(
      vars.color.warning.DEFAULT,
      vars.color.warning.tintStrong,
      vars.color.warning.DEFAULT,
    ),
    removed: kind(
      vars.color.critical.DEFAULT,
      vars.color.critical.tintStrong,
      vars.color.critical.DEFAULT,
    ),
    changed: kind(vars.color.info.DEFAULT, vars.color.info.tintStrong, vars.color.info.DEFAULT),
    unchanged: kind(vars.color.fg.secondary, vars.color.surface.page, vars.color.line.DEFAULT),
  },
  subgraph: style(
    utility({
      display: 'flex',
      alignItems: 'center',
      gap: space(4),
      paddingInline: space(5),
      paddingBlock: space(3.5),
    }),
  ),
  subgraphIcon,
  subgraphIconGlyph: smallIcon,
  subgraphBody: style([shared.stack.base, shared.fillShrinkable]),
  subgraphTitle: style([shared.row.base, utility({ flexWrap: 'wrap', columnGap: space(1) })]),
  subgraphName,
  subgraphArrow: tinyIcon,
  subgraphKind: style(
    utility({
      display: 'inline-flex',
      alignItems: 'center',
      gap: space(1.5),
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
    }),
  ),
  subgraphKindLabel: style(utility({ marginRight: space(2) })),
  subgraphKindDot: style(utility({ ...square(1.5), borderRadius: vars.radius.full })),
  subgraphLink: style([
    shared.inlineRow.gap1,
    shared.text.xs,
    shared.fg.default,
    utility({ width: 'fit-content' }),
  ]),
  subgraphLinkIcon: style(utility(square(2.5))),
  graphCardHeader: style([
    shared.row.gap4,
    utility({
      backgroundColor: vars.color.surface.card,
      paddingInline: space(5),
      paddingBlock: space(3.5),
    }),
  ]),
  graphCardBody: style([shared.stack.base, shared.fillShrinkable, utility({ gap: space(0.5) })]),
  graphCardTitle: style([
    shared.row.base,
    utility({ flexWrap: 'wrap', columnGap: space(1), rowGap: space(1) }),
  ]),
};
