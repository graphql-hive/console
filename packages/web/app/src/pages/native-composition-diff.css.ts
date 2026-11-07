import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const errors = style(
  utility({
    paddingInline: space(1),
    paddingBottom: space(2),
  }),
);

globalStyle(
  `:where(${errors} > :not(:last-child))`,
  utility({
    borderBottomStyle: 'solid',
    borderTopStyle: 'solid',
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
    borderColor: vars.color.critical.lineSubtle,
  }),
);

const metaCell = {
  flex: '1',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
} as const;

const copyIcon = style(
  utility({ marginRight: space(2), ...square(4), color: vars.color.fg.subtle }),
);

const sectionTitle = style([
  shared.text.lg,
  shared.weight.bold,
  utility({ paddingBlock: space(3) }),
]);

export const nativeCompositionDiffStyles = {
  root: style(utility({ padding: space(8) })),
  heading: style(utility({ marginBottom: space(4) })),
  meta: style([
    shared.row.gap4,
    shared.text.xs,
    utility({
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingInline: space(8),
      paddingBlock: space(4),
      selectors: {
        '&:where(.dark, .dark *)': { backgroundColor: vars.color.surface.card },
      },
    }),
  ]),
  metaProject: style(utility(metaCell)),
  metaStatus: style(utility({ ...metaCell, alignItems: 'center' })),
  metaStatusText: style([shared.truncate, utility({ marginLeft: space(1) })]),
  metaSpacer: style(
    utility({
      gridColumn: 'span 2 / span 2',
      flex: 'none',
      textAlign: 'right',
    }),
  ),
  metaAction: style(utility({ width: space(48), flexShrink: '0' })),
  metaActionLabel: style([shared.text.xs, shared.weight.bold, utility({ padding: space(4) })]),
  targetName: style(utility({ marginLeft: space(1) })),
  errorsTitle: sectionTitle,
  errors,
  error: style(
    utility({
      display: 'flex',
      gap: space(3),
      paddingInline: space(4),
      paddingBlock: space(3),
    }),
  ),
  errorIndex: style([
    shared.noShrink,
    shared.mono,
    shared.text.xs,
    shared.fg.critical,
    utility({
      marginTop: space(0.5),
      width: space(6),
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ]),
  // The schema comparison beside the summary from the `lg` breakpoint up.
  comparison: style([
    shared.stack.gap4,
    utility({
      '@media': {
        '(width >= 64rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  diff: style([
    shared.stack.base,
    shared.fullWidth,
    shared.grow,
    utility({ alignItems: 'flex-start' }),
  ]),
  diffTitle: sectionTitle,
  diffLink: style([
    shared.weight.semibold,
    shared.fg.secondary,
    utility({
      textUnderlineOffset: '4px',
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { textDecorationLine: 'underline' } },
        },
      },
    }),
  ]),
  diffIntro: style(utility({ paddingTop: space(2) })),
  diffNote: style(utility({ marginBlock: space(4) })),
  diffEditor: style(
    utility({
      marginTop: space(4),
      minHeight: '100%',
      width: '100%',
    }),
  ),
  summary: style([shared.stack.gap4, utility({ minWidth: 'fit-content' })]),
  summaryValue: style(
    utility({
      display: 'inline-flex',
      maxWidth: space(64),
      textAlign: 'right',
    }),
  ),
  copyIcon,
  summaryError: style([shared.row.base, utility({ ...({ textWrap: 'pretty' } as object) })]),
  summaryErrorIcon: style(
    utility({ marginRight: space(1), ...square(4), color: vars.color.critical.DEFAULT }),
  ),
  cell: style(utility({ minWidth: '0px' })),
  cellLabel: style([shared.text.xs, shared.weight.bold, utility({ textTransform: 'capitalize' })]),
  cellValue: style(utility({ marginTop: space(1) })),
};
