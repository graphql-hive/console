import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { animate } from '../../../styles/animations.css';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const row = (gap: number) =>
  style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(gap),
    }),
  );

const migration = style({});

globalStyle(
  `:where(${migration} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

const statusIcon = (color: string) => style(utility({ ...square(10), color }));

export const nativeCompositionStyles = {
  // One target's switch in the incremental migration list; dimmed while its mutation runs.
  target: recipe({
    base: utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(10),
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
      padding: space(4),
    }),
    variants: {
      pending: {
        true: utility({ animation: animate.pulse }),
      },
    },
  }),
  targetName: style([shared.text.sm, shared.weight.semibold]),
  targetMode: style([shared.text.xs, utility({ minWidth: space(32) })]),
  root: style([
    shared.stack.base,
    utility({
      alignItems: 'flex-start',
      rowGap: space(6),
    }),
  ]),
  description: style([shared.text.sm, shared.fg.secondary]),
  migration,
  migrationTitle: row(2),
  targets: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      gap: space(4),
    }),
  ),
  compatibility: row(4),
  compatibilityIncompatible: statusIcon(vars.color.critical.DEFAULT),
  compatibilityCompatible: statusIcon(vars.color.success.DEFAULT),
  compatibilityUnknown: statusIcon(vars.color.accent.DEFAULT),
  compatibilityTitle: style([shared.text.base, shared.weight.semibold]),
  compatibilityText: style([shared.text.sm, shared.fg.secondary]),
  link: style([
    shared.weight.semibold,
    shared.fg.secondary,
    utility({
      textUnderlineOffset: '4px',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { textDecorationLine: 'underline' },
          },
        },
      },
    }),
  ]),
  actions: row(2),
  spinner: style(utility({ marginRight: space(2), ...square(4), animation: animate.spin })),
};
