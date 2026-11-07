import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const cardStyles = {
  root: recipe({
    base: component({ borderRadius: vars.radius.md, borderStyle: 'solid', borderWidth: 1 }),
    variants: {
      onSurface: {
        base: component({ borderColor: vars.color.line.DEFAULT }),
        raised: component({
          borderColor: vars.color.line.subtle,
          backgroundColor: vars.color.surface.card,
        }),
      },
      interactive: {
        true: component({
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
  header: style([shared.stack.base, component({ gap: space(1.5), padding: space(5) })]),
  titleRow: style([shared.row.between, component({ gap: space(4) })]),
  title: recipe({
    base: component({
      lineHeight: 1,
      fontWeight: vars.weight.medium,
      color: vars.color.fg.DEFAULT,
    }),
    variants: {
      titleSize: {
        default: component({ fontSize: vars.text.sm }),
        large: component({ fontSize: vars.text.lg }),
        xlarge: component({ fontSize: vars.text['2xl'] }),
      },
    },
    defaultVariants: { titleSize: 'default' },
  }),
  actions: style([shared.row.gap2, shared.noShrink, component({ marginLeft: 'auto' })]),
  description: style([shared.text.control, shared.fg.secondary]),
  body: recipe({
    variants: {
      bodyPadding: {
        default: component({ padding: space(5) }),
        none: {},
      },
      /** Under a header, the header's own padding already separates the two. */
      afterHeader: {
        true: component({ paddingTop: 0 }),
      },
    },
    defaultVariants: { bodyPadding: 'default' },
  }),
};
