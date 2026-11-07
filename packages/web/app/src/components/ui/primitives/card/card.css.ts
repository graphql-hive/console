import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const cardStyles = {
  root: recipe({
    base: s({ borderRadius: vars.radius.md, borderStyle: 'solid', borderWidth: 1 }),
    variants: {
      onSurface: {
        base: s({ borderColor: vars.color.line.DEFAULT }),
        raised: s({
          borderColor: vars.color.line.subtle,
          backgroundColor: vars.color.surface.card,
        }),
      },
      interactive: {
        true: s({
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  borderColor: vars.color.line.DEFAULT,
                  backgroundColor: vars.color.surface.cardHover,
                },
              },
            },
          },
        }),
      },
    },
    defaultVariants: { onSurface: 'base' },
  }),
  /** Title row and description, above the body. */
  header: style([shared.stack.base, s({ gap: space(1.5), padding: space(5) })]),
  titleRow: style([shared.row.between, s({ gap: space(4) })]),
  title: recipe({
    base: s({ lineHeight: 1, fontWeight: vars.weight.medium, color: vars.color.fg.DEFAULT }),
    variants: {
      titleSize: {
        default: s({ fontSize: vars.text.sm }),
        large: s({ fontSize: vars.text.lg }),
        xlarge: s({ fontSize: vars.text['2xl'] }),
      },
    },
    defaultVariants: { titleSize: 'default' },
  }),
  actions: style([shared.row.gap2, shared.noShrink, s({ marginLeft: 'auto' })]),
  description: style([shared.text.control, shared.fg.secondary]),
  body: recipe({
    variants: {
      bodyPadding: {
        default: s({ padding: space(5) }),
        none: {},
      },
      /** Under a header, the header's own padding already separates the two. */
      afterHeader: {
        true: s({ paddingTop: 0 }),
      },
    },
    defaultVariants: { bodyPadding: 'default' },
  }),
};
