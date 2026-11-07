import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

const topGap = style(component({ marginTop: space(2) }));

export const notFoundStyles = {
  // Inline padding on the root rather than on `horizontal` alone: the centred layout needs it too
  // once the viewport is narrow enough for a long title to reach the edges.
  root: recipe({
    base: component({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingInline: space(6),
    }),
    variants: {
      layout: {
        centered: component({
          flexDirection: 'column',
          gap: space(2.5),
        }),
        horizontal: {},
      },
      fullScreen: {
        true: component({ height: '100vh' }),
        false: component({
          height: '100%',
          flex: '1',
          paddingBlock: space(6),
        }),
      },
    },
    defaultVariants: {
      layout: 'centered',
      fullScreen: false,
    },
  }),
  image: style(
    component({
      display: 'block',
      width: '200px',
      height: '200px',
    }),
  ),
  bigHeading: style([
    shared.text['4xl'],
    shared.weight.medium,
    component({ marginBottom: space(3) }),
  ]),
  title: style([shared.text.xl, shared.weight.medium]),
  description: style([shared.text.sm, shared.fg.secondary]),
  back: topGap,
  // The horizontal layout: illustration beside the text from the `sm` breakpoint up.
  horizontalBody: style([
    shared.stack.base,
    component({
      maxWidth: '960px',
      alignItems: 'center',
      columnGap: space(6),
      '@media': {
        '(width >= 40rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  horizontalText: style([
    shared.grow,
    shared.textCenter,
    component({
      '@media': {
        '(width >= 40rem)': { textAlign: 'left' },
      },
    }),
  ]),
  horizontalDescription: topGap,
};
