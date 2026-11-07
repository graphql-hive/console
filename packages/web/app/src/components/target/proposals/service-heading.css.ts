import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const serviceHeadingStyles = {
  // Clickable when it toggles a section, and squared off at the bottom while that section is open.
  root: recipe({
    base: [
      shared.flex,
      shared.text.base,
      shared.weight.semibold,
      shared.fg.accent,
      utility({
        marginTop: space(2),
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: vars.radius.sm,
        backgroundColor: vars.color.accent.tint,
        paddingInline: space(4),
        paddingBlock: space(2),
      }),
    ],
    variants: {
      interactive: {
        true: utility({
          cursor: 'pointer',
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': { textDecorationLine: 'underline' },
              },
            },
          },
        }),
      },
      open: {
        true: utility({
          borderBottomRightRadius: '0',
          borderBottomLeftRadius: '0',
        }),
      },
    },
  }),
  title: style([
    shared.flex,
    shared.grow,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
    }),
  ]),
  icon: style(utility({ marginRight: space(2), ...square(4) })),
  added: style([shared.text.xs, shared.fg.success, utility({ marginLeft: space(2) })]),
  removed: style([shared.text.xs, shared.fg.critical, utility({ marginLeft: space(2) })]),
  chevron: recipe({
    base: utility({
      ...square(4),
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
    variants: {
      open: {
        true: utility({ rotate: '-180deg' }),
      },
    },
  }),
};
