import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import { vars } from '../../styles/theme.css';

// Plain anchors: a leading icon is positioned by the descendant rules below.
const root = style(
  component({
    position: 'relative',
    width: '100%',
    borderRadius: vars.radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    padding: space(4),
  }),
);

globalStyle(
  `${root} > svg`,
  component({
    position: 'absolute',
    top: space(4),
    left: space(4),
    color: vars.color.fg.default,
  }),
);

globalStyle(`${root} > svg + div`, component({ translate: '0 -3px' }));

globalStyle(`${root} > svg ~ *`, component({ paddingLeft: space(7) }));

const destructive = style(
  component({
    borderColor: vars.color.critical.DEFAULT,
    color: vars.color.critical.DEFAULT,
  }),
);

globalStyle(`${destructive} > svg`, component({ color: vars.color.critical.DEFAULT }));

const description = style(
  component({
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
);

globalStyle(`${description} p`, component({ lineHeight: vars.leading.relaxed }));

export const alertStyles = {
  root: recipe({
    base: root,
    variants: {
      variant: {
        default: component({
          backgroundColor: vars.color.surface.card,
          color: vars.color.fg.default,
        }),
        destructive,
      },
    },
    defaultVariants: { variant: 'default' },
  }),
  title: style(
    component({
      marginBottom: space(1),
      lineHeight: '1',
      fontWeight: vars.weight.medium,
      letterSpacing: vars.tracking.tight,
    }),
  ),
  description,
};
