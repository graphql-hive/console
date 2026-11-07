import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { focusRingQuiet } from '../components/ui/primitives/shared-styles';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const sections = style({});

globalStyle(
  `:where(${sections} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(6),
  }),
);

export const targetExplorerUnusedStyles = {
  empty: style([
    shared.row.base,
    shared.noShrink,
    utility({
      height: '250px',
      justifyContent: 'center',
      borderRadius: vars.radius.md,
      borderWidth: '1px',
      borderStyle: 'dashed',
    }),
  ]),
  emptyBody: style([
    shared.stack.base,
    shared.textCenter,
    utility({
      marginInline: 'auto',
      maxWidth: '420px',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
  emptyIcon: style(utility({ ...square(10), color: vars.color.success.DEFAULT })),
  emptyTitle: style([shared.text.lg, shared.weight.semibold, utility({ marginTop: space(4) })]),
  emptyText: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ marginTop: space(2), marginBottom: space(4) }),
  ]),
  sections,
  hint: style([shared.text.sm, shared.fg.secondary]),
  // One tab per starting letter; the active one is filled.
  letter: recipe({
    base: [
      focusRingQuiet,
      utility({
        display: 'inline-flex',
        height: space(9),
        alignItems: 'center',
        paddingInline: space(2),
        paddingBlock: space(1),
        fontSize: vars.text.sm,
        lineHeight: vars.text.smLineHeight,
        fontWeight: vars.weight.medium,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
      }),
    ],
    variants: {
      active: {
        true: utility({
          backgroundColor: vars.color.surface.selected,
          color: vars.color.accent.DEFAULT,
        }),
        false: utility({
          color: vars.color.fg.secondary,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  backgroundColor: vars.color.surface.hover,
                  color: vars.color.accent.DEFAULT,
                },
              },
            },
          },
        }),
      },
    },
  }),
  content: style(utility({ paddingBlock: space(8) })),
  alert: style(utility({ marginBottom: space(3) })),
  alertIcon: style(utility(square(4))),
  alertDescription: style(utility({ maxWidth: '600px' })),
};
