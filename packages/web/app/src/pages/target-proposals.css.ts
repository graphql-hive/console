import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const targetProposalsStyles = {
  page: style(
    utility({
      display: 'flex',
      minHeight: '300px',
      flexDirection: 'column',
    }),
  ),
  header: style(
    utility({
      display: 'flex',
      paddingBlock: space(6),
    }),
  ),
  headerEnd: style([
    shared.stack.base,
    utility({ marginRight: '0px', marginLeft: 'auto', justifyContent: 'center' }),
  ]),
  // The list beside the selected proposal, side by side from the `md` breakpoint up.
  layout: style([
    shared.stack.base,
    utility({
      justifyContent: 'flex-start',
      gap: space(2.5),
      paddingBottom: space(2.5),
      '@media': {
        '(width >= 48rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  panel: style(
    utility({
      minHeight: '100%',
      gap: space(2.5),
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.subtle,
      backgroundColor: vars.color.surface.inset,
      padding: space(2.5),
    }),
  ),
  skeleton: style([shared.stack.gap2, utility({ padding: space(2.5) })]),
  empty: style([
    shared.row.base,
    shared.textCenter,
    utility({ marginBlock: space(8), minHeight: space(48) }),
  ]),
  proposal: recipe({
    base: utility({
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      borderRadius: vars.radius.md,
      padding: space(2.5),
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
        },
      },
    }),
    variants: {
      selected: { true: utility({ backgroundColor: vars.color.surface.selected }) },
    },
  }),
  proposalRow: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
    }),
  ),
  proposalBody: style([shared.stack.base, shared.shrinkable, shared.grow]),
  proposalTitleRow: style([
    shared.flex,
    shared.shrinkable,
    shared.text.sm,
    utility({
      marginRight: space(6),
      flexDirection: 'row',
      gap: space(1),
      '@media': {
        '(width >= 48rem)': { fontSize: vars.text.base, lineHeight: vars.text.baseLineHeight },
      },
    }),
  ]),
  proposalTitle: style([
    shared.truncate,
    shared.weight.semibold,
    shared.fg.default,
    utility({ marginRight: space(6) }),
  ]),
  proposalStatus: style([shared.row.base, shared.fg.inverse]),
  proposalMeta: style([
    shared.stack.base,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      marginTop: space(2),
      marginBottom: space(1.5),
      columnGap: space(1),
      verticalAlign: 'middle',
      '@media': {
        '(width >= 48rem)': { flexDirection: 'row' },
      },
    }),
  ]),
};
