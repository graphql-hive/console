import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const statusLabel = {
  flexDirection: 'row',
  alignItems: 'center',
  fontStyle: 'italic',
  WebkitFontSmoothing: 'auto',
  MozOsxFontSmoothing: 'auto',
} as const;

export const dangerousChangesFormStyles = {
  pendingDot: style(
    utility({
      display: 'inline-block',
      ...square(2),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ),
  justSaved: style([
    shared.inlineFlex,
    shared.fg.success,
    utility({ ...statusLabel, gap: space(1) }),
  ]),
  justSavedIcon: style(utility({ ...square(5), color: vars.color.success.DEFAULT })),
  saved: style([
    shared.inlineFlex,
    shared.fg.secondary,
    utility({ ...statusLabel, gap: space(1) }),
  ]),
  savedIcon: style(utility({ ...square(5), color: vars.color.fg.secondary })),
  unsaved: style([shared.inlineFlex, shared.fg.accent, utility({ ...statusLabel, gap: space(2) })]),
  // Dimmed while the setting is switched off.
  root: recipe({
    base: utility({
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: '150ms',
    }),
    variants: {
      disabled: {
        true: utility({ opacity: '50%' }),
      },
    },
  }),
  panel: style(
    utility({
      display: 'block',
      width: 'auto',
      maxWidth: vars.container['4xl'],
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
      paddingInline: space(5),
      paddingBlock: space(3),
      color: vars.color.fg.secondary,
    }),
  ),
  panelTitle: style([
    shared.weight.semibold,
    shared.fg.strong,
    utility({
      marginTop: space(1),
      marginBottom: space(3),
    }),
  ]),
  failAll: style([
    shared.row.gap1,
    shared.nowrap,
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      paddingBottom: space(3),
    }),
  ]),
  // The pending dot's slot, kept so the row does not jump; hidden while the value is saved.
  failAllPending: recipe({
    base: utility({
      flexGrow: '1',
      paddingLeft: space(4),
    }),
    variants: {
      hidden: { true: [shared.hidden] },
    },
  }),
  orFailOnly: style(utility({ marginBlock: space(3) })),
  changes: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      gap: space(2),
      '@media': {
        '(width >= 64rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
      },
    }),
  ),
  change: style([shared.row.base, shared.shrinkable, utility({ columnGap: space(1) })]),
  changePending: recipe({
    base: utility({
      flexGrow: '1',
      paddingRight: space(4),
      textAlign: 'right',
    }),
    variants: {
      hidden: { true: [shared.hidden] },
    },
  }),
  actions: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(5),
    }),
  ),
  error: style([
    shared.flex,
    shared.fg.critical,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      padding: space(2),
    }),
  ]),
  errorIcon: style(utility(square(4))),
};
