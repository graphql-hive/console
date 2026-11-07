import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

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

const spacedRow = (rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginInlineStart: '0',
      marginInlineEnd: space(2),
    }),
  );
  return root;
};

// The timeline axis: a label and a tick at each quarter of the trace.
const axisLabel = (at: { left?: string; right?: string; translate: string }) =>
  utility({
    position: 'absolute',
    top: space(6),
    ...at,
    textAlign: 'center',
  });

const axisTick = (at: { left?: string; right?: string; translate?: string }) =>
  utility({
    position: 'absolute',
    bottom: '0px',
    ...at,
    height: space(2),
    width: '1px',
    backgroundColor: vars.color.line.DEFAULT,
  });

const hover = (backgroundColor: string) => ({
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover': { backgroundColor } },
    },
  },
});

const emptyIcon = style(
  utility({
    marginInline: 'auto',
    marginBottom: space(2),
    ...square(6),
    color: vars.color.fg.secondary,
  }),
);

const skeleton = (width: string) =>
  style(utility({ display: 'inline-flex', width, verticalAlign: 'middle' }));

const metricIcon = (color: string) => style(utility({ ...square(4), color }));

const statValue = style(
  utility({
    textAlign: 'right',
    fontFamily: vars.font.mono,
  }),
);

const statWide = style(utility({ gridColumn: 'span 2 / span 2' }));

const statBar = style(
  utility({
    height: '2px',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: vars.color.line.DEFAULT,
  }),
);

const document = style(
  utility({
    height: '100%',
    maxHeight: 'none',
    vars: { '--diffs-font-size': '10px' },
  }),
);

export const targetTraceStyles = {
  root: style([shared.stack.base, utility({ height: '100%' })]),
  timeline: style(
    utility({
      position: 'sticky',
      top: '0px',
      zIndex: '10',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  timelineRow: style([shared.row.base, shared.fullWidth, shared.text.xs, shared.fg.strong]),
  timelineLeft: style(
    utility({
      height: space(12),
      flexShrink: '0',
      paddingBlock: space(2),
    }),
  ),
  timelineLeftLabel: style(utility({ paddingLeft: space(4) })),
  timelineHint: style([shared.text.xs, shared.fg.secondary]),
  timelineAxis: style(
    utility({
      height: space(12),
      flexGrow: '1',
      paddingRight: space(8),
    }),
  ),
  axis: style([shared.relative, shared.fullWidth, utility({ height: '100%' })]),
  axisLabel: styleVariants({
    0: axisLabel({ left: '0px', translate: '-50% 0' }),
    25: axisLabel({ left: '25%', translate: '-50% 0' }),
    50: axisLabel({ left: '50%', translate: '-50% 0' }),
    75: axisLabel({ left: '75%', translate: '-50% 0' }),
    100: axisLabel({ right: '0px', translate: '50% 0' }),
  }),
  axisTick: styleVariants({
    0: axisTick({ left: '0px' }),
    25: axisTick({ left: '25%', translate: '-50% 0' }),
    50: axisTick({ left: '50%', translate: '-50% 0' }),
    75: axisTick({ left: '75%', translate: '-50% 0' }),
    100: axisTick({ right: '0px', translate: '-50% 0' }),
  }),
  legend: style(
    utility({
      position: 'sticky',
      bottom: '0px',
      zIndex: '10',
      paddingInline: space(2),
      paddingBlock: space(4),
    }),
  ),
  legendItems: style([
    shared.row.base,
    shared.text.xs,
    shared.fg.secondary,
    utility({ flexWrap: 'wrap', justifyContent: 'center', gap: space(6) }),
  ]),
  legendItem: style([
    shared.row.gap2,
    utility({
      cursor: 'pointer',
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { color: vars.color.fg.DEFAULT } },
        },
      },
    }),
  ]),
  legendSwatch: style(utility(square(2))),
  treeIcon: style(utility({ flexShrink: '1' })),
  // The divider between the span tree and the timeline, with a wider invisible hit area.
  resizeHandle: style(
    utility({
      position: 'absolute',
      insetBlock: '0px',
      zIndex: '20',
      width: '5px',
      cursor: 'ew-resize',
    }),
  ),
  resizeLine: recipe({
    base: utility({
      position: 'absolute',
      insetBlock: '0px',
      left: '2px',
      width: '1px',
      backgroundColor: vars.color.line.DEFAULT,
    }),
    variants: {
      dragging: {
        true: utility({ backgroundColor: vars.color.fg.subtle }),
        false: utility(hover(vars.color.surface.hover)),
      },
    },
  }),
  node: style(
    utility({
      position: 'relative',
      zIndex: '20',
      display: 'block',
      height: space(6),
      minWidth: '1px',
      borderRadius: vars.radius.sm,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ),
  nodeLabel: style([
    shared.row.base,
    shared.mono,
    shared.nowrap,
    shared.fg.default,
    utility({
      position: 'absolute',
      top: '50%',
      translate: '0 -50%',
      paddingInline: '4px',
      lineHeight: '1',
    }),
  ]),
  // A span row: striped, tinted when it carries an exception, stronger when its event is highlighted.
  span: recipe({
    base: utility({
      paddingRight: space(8),
      selectors: {
        '&:nth-child(odd)': { backgroundColor: vars.color.surface.stripe },
      },
      ...hover(vars.color.surface.hover),
    }),
    variants: {
      exception: {
        true: utility({
          backgroundColor: vars.color.critical.tint,
          selectors: {
            '&:nth-child(odd)': { backgroundColor: vars.color.critical.tint },
          },
          ...hover(vars.color.critical.tintStrong),
        }),
      },
      highlighted: {
        true: utility({
          backgroundColor: vars.color.critical.tintStrong,
          selectors: {
            '&:nth-child(odd)': { backgroundColor: vars.color.critical.tintStrong },
          },
        }),
      },
    },
  }),
  spanRow: style([
    shared.relative,
    shared.row.base,
    shared.fullWidth,
    utility({ height: space(8), overflow: 'hidden' }),
  ]),
  spanLeft: style([
    shared.relative,
    shared.row.base,
    shared.noShrink,
    utility({
      height: space(8),
      columnGap: space(2),
      overflow: 'hidden',
      paddingLeft: space(1),
    }),
  ]),
  spanToggle: recipe({
    base: [
      shared.row.base,
      shared.noShrink,
      shared.truncate,
      shared.fg.secondary,
      utility({ height: space(8) }),
    ],
    variants: {
      collapsible: { true: utility({ cursor: 'pointer' }) },
    },
  }),
  spanName: recipe({
    base: [
      shared.row.base,
      shared.fullWidth,
      shared.text.xs,
      shared.nowrap,
      utility({ verticalAlign: 'middle' }),
    ],
    variants: {
      dimmed: {
        true: [shared.fg.secondary],
        false: [shared.fg.strong],
      },
    },
  }),
  spanNameText: style(utility({ marginRight: space(1) })),
  spanBadge: style(
    utility({
      marginRight: space(1),
      marginLeft: 'auto',
      display: 'inline-flex',
    }),
  ),
  spanSubgraph: recipe({
    base: [shared.truncate, shared.text.xs],
    variants: {
      dimmed: {
        true: [shared.fg.subtle],
        false: [shared.fg.secondary],
      },
    },
  }),
  spanBar: style([shared.relative, shared.fullWidth]),
  spanBarLink: recipe({
    base: utility({
      position: 'relative',
      display: 'flex',
      height: '100%',
      flexGrow: '1',
      cursor: 'pointer',
      alignItems: 'center',
      overflow: 'hidden',
    }),
    variants: {
      dimmed: { true: utility({ opacity: '25%' }) },
    },
  }),
  spanPopover: spaced(3, { minWidth: '200px' }),
  spanPopoverPlain: style(utility({ minWidth: '200px' })),
  spanStats: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      rowGap: space(2),
    }),
  ),
  statValue,
  statWide,
  statBar,
  statBarFill: style(utility({ height: '100%' })),
  eventMarker: style(
    utility({
      position: 'absolute',
      insetBlock: '0px',
      zIndex: '50',
      translate: '-50% 0',
      cursor: 'pointer',
      paddingInline: space(1),
    }),
  ),
  eventMarkerBody: style(
    utility({
      position: 'relative',
      height: '100%',
    }),
  ),
  eventLine: recipe({
    base: utility({
      position: 'absolute',
      insetBlock: '0px',
      width: space(0.5),
    }),
    variants: {
      tone: {
        error: utility({ backgroundColor: vars.color.critical.DEFAULT }),
        warning: utility({ backgroundColor: vars.color.warning.DEFAULT }),
      },
    },
  }),
  eventDot: recipe({
    base: utility({
      position: 'absolute',
      top: '-2px',
      left: '-3px',
      ...square(2),
    }),
    variants: {
      tone: {
        error: utility({ backgroundColor: vars.color.critical.DEFAULT }),
        warning: utility({ backgroundColor: vars.color.warning.DEFAULT }),
      },
    },
  }),
  sheet: style(utility({ minHeight: '0px', flex: '1' })),
  sheetBody: style([shared.stack.base, utility({ height: '100%' })]),
  sheetHeader: style(
    utility({
      position: 'sticky',
      top: '0px',
      zIndex: '10',
    }),
  ),
  sheetTab: style(utility({ height: '100%' })),
  empty: style(
    utility({
      paddingBlock: space(4),
      textAlign: 'center',
    }),
  ),
  emptyIcon,
  emptyText: style([shared.text.xs, shared.fg.secondary]),
  sheetErrors: style(utility({ padding: space(4) })),
  sheetErrorList: spaced(2),
  sheetErrorText: style([shared.text.sm, shared.fg.subtle]),
  sheetErrorLink: style(
    utility({
      marginBottom: space(2),
      display: 'block',
    }),
  ),
  sheetDocument: style(
    utility({
      position: 'absolute',
      insetBlock: '0px',
      width: '100%',
    }),
  ),
  document,
  pageHeader: spaced(4, {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    paddingTop: space(6),
  }),
  headerSeparator: style(
    utility({
      display: 'inline-block',
      paddingInline: space(2),
      color: vars.color.fg.secondary,
      fontStyle: 'italic',
    }),
  ),
  headerId: style([
    shared.mono,
    shared.weight.normal,
    shared.fg.secondary,
    utility({ marginLeft: space(2) }),
  ]),
  headerSkeletonShort: skeleton('150px'),
  headerSkeletonLong: skeleton('200px'),
  headerMeta: style([shared.row.gap3, shared.text.xs, utility({ marginTop: space(2) })]),
  headerMetaIcon: style(utility({ ...square(3), color: vars.color.fg.secondary })),
  headerMethod: style([shared.mono, shared.fg.default, utility({ textTransform: 'uppercase' })]),
  page: style(
    utility({
      display: 'flex',
      height: palette.layout.contentHeight,
      flexDirection: 'column',
    }),
  ),
  pageBody: style([shared.stack.base, shared.fill, utility({ minHeight: '0px' })]),
  spanSheetName: style(
    utility({
      marginLeft: space(2),
      color: vars.color.fg.secondary,
    }),
  ),
  sheetActionIcon: style(utility({ marginRight: space(2), ...square(4) })),
  metrics: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: space(4),
      paddingInline: space(6),
      paddingBottom: space(4),
      '@media': {
        '(width >= 48rem)': { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
      },
    }),
  ),
  metric: spacedRow({ display: 'flex', alignItems: 'center' }),
  metricIconInfo: metricIcon(vars.color.info.DEFAULT),
  metricIconSuccess: metricIcon(vars.color.success.DEFAULT),
  metricIconAccent: metricIcon(vars.color.accent.DEFAULT),
  metricLabel: style([shared.text.xs, shared.fg.secondary]),
  metricValue: style([shared.text.sm, shared.weight.medium]),
  sheetTabs: style([shared.stack.base, shared.fill, utility({ minHeight: '0px' })]),
  sheetTabsBorder: style(
    utility({
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  events: style(
    utility({
      paddingInline: space(1),
      paddingTop: space(2),
    }),
  ),
  event: style(utility({ marginBottom: space(2) })),
  attributeCopy: style([
    shared.flex,
    shared.fg.strong,
    utility({ marginRight: '0px', marginLeft: 'auto' }),
  ]),
  // An attribute row; expanded, the value drops below the key and wraps.
  attribute: recipe({
    base: [
      shared.row.between,
      shared.text.xs,
      utility({
        borderBottomStyle: 'solid',
        borderBottomWidth: '1px',
        borderColor: vars.color.line.DEFAULT,
        padding: space(3),
        selectors: {
          '&:last-child': {
            borderStyle: 'solid',
            borderWidth: '0px',
          },
        },
      }),
    ],
    variants: {
      expanded: { true: utility({ flexDirection: 'column', textAlign: 'left' }) },
    },
  }),
  attributeKey: recipe({
    base: utility({
      display: 'flex',
      flex: '1',
      paddingRight: space(2),
      color: vars.color.fg.secondary,
    }),
    variants: {
      expanded: { true: utility({ width: '100%', paddingRight: '0px' }) },
    },
  }),
  attributeValue: recipe({
    base: utility({
      width: '100%',
      flex: '1',
      paddingTop: space(2),
      fontFamily: vars.font.mono,
      fontSize: vars.text['2xs'],
      lineHeight: vars.text['2xsLineHeight'],
      color: vars.color.fg.DEFAULT,
    }),
    variants: {
      collapsed: {
        true: utility({
          overflow: 'hidden',
          paddingTop: '0px',
          ...({ textWrap: 'nowrap' } as object),
          textOverflow: 'ellipsis',
        }),
      },
    },
  }),
  exception: style(
    utility({
      overflow: 'hidden',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.critical.line,
      backgroundColor: vars.color.critical.tint,
    }),
  ),
  exceptionHeader: style([
    shared.row.between,
    utility({
      backgroundColor: vars.color.critical.tintStrong,
      paddingInline: space(3),
      paddingBlock: space(2),
    }),
  ]),
  exceptionType: style([shared.mono, shared.text.xs, shared.weight.medium, shared.fg.critical]),
  exceptionBody: style([shared.text.xs, utility({ padding: space(3) })]),
  exceptionStack: style(
    utility({
      marginTop: space(2),
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.inset,
    }),
  ),
  exceptionStackText: style([
    shared.mono,
    shared.fg.secondary,
    utility({ padding: space(2), fontSize: vars.text['2xs'], lineHeight: vars.leading.tight }),
  ]),
};
