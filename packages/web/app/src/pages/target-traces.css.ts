import { style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const skeletonCell = (width: string) =>
  style(utility({ display: 'inline-flex', width, verticalAlign: 'middle' }));

export const targetTracesStyles = {
  method: style(utility({ textTransform: 'uppercase' })),
  cell: style(utility({ minWidth: '150px' })),
  cellStatic: style(utility({ minWidth: '150px', cursor: 'auto' })),
  kind: style([
    shared.inlineRow.base,
    shared.text.xs,
    shared.fg.secondary,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.card,
      paddingInline: space(1),
      paddingBlock: space(0.5),
      textTransform: 'uppercase',
    }),
  ]),
  label: style([shared.row.base, utility({ columnGap: space(2) })]),
  labelColor: style(
    utility({
      height: '11px',
      width: '2px',
      borderRadius: vars.radius.xs,
    }),
  ),
  labelTone: styleVariants({
    ok: utility({ backgroundColor: vars.color.success.DEFAULT }),
    error: utility({ backgroundColor: vars.color.critical.DEFAULT }),
  }),
  filtersHeader: style([
    shared.row.between,
    shared.noShrink,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.strong,
    utility({
      height: space(8),
      borderRadius: vars.radius.md,
      paddingInline: space(2),
    }),
  ]),
  filtersClearIcon: style(utility(square(4))),
  sheetId: style([
    shared.mono,
    shared.weight.normal,
    shared.fg.secondary,
    utility({ marginLeft: space(2) }),
  ]),
  sheetTitleSkeleton: skeletonCell('260px'),
  sheetSubtitleSkeleton: skeletonCell('200px'),
  sheetMeta: style([
    shared.row.gap3,
    shared.text.xs,
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingInline: space(6),
      paddingBottom: space(4),
    }),
  ]),
  sheetMetaIcon: style(utility({ ...square(3), color: vars.color.fg.secondary })),
  sheetMethod: style([shared.mono, shared.fg.default, utility({ textTransform: 'uppercase' })]),
  sheetMetaSkeleton: skeletonCell('150px'),
  sheetMetaEnd: style(utility({ marginLeft: 'auto' })),
  sheetLinkIcon: style(utility({ marginRight: space(1), ...square(3) })),
  header: style(utility({ paddingBlock: space(6) })),
  headerActions: style([
    shared.flex,
    shared.fill,
    utility({ justifyContent: 'flex-end', columnGap: space(4) }),
  ]),
  layout: style([
    shared.flex,
    shared.fullWidth,
    utility({ marginTop: space(4), minHeight: '100svh' }),
  ]),
  sidebar: style([
    shared.stack.base,
    shared.fg.default,
    utility({
      position: 'sticky',
      top: space(4),
      height: '100%',
      width: space(64),
    }),
  ]),
  sidebarBody: style([shared.stack.gap2, shared.fill, utility({ minHeight: '0px' })]),
  main: style([shared.relative, shared.stack.base, shared.fill, utility({ minHeight: '100svh' })]),
  mainBody: style([
    shared.stack.gap4,
    shared.fill,
    utility({ paddingTop: '0px', paddingLeft: space(4) }),
  ]),
};
