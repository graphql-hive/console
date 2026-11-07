import { style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const avatarStyles = {
  root: recipe({
    base: s({
      display: 'inline-flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.tint,
      fontWeight: vars.weight.medium,
      color: vars.color.fg.DEFAULT,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
    variants: {
      size: {
        xs: [shared.text['2xs'], s(square(5))],
        md: [shared.text.xs, s(square(8))],
      },
      variant: {
        default: {},
        outlined: s({ borderStyle: 'solid', borderWidth: 1, borderColor: vars.color.accent.muted }),
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  }),
  /** The fallback's icon, by the avatar's size. */
  icon: styleVariants({
    xs: s(square(3)),
    md: s(square(5)),
  }),
  image: style(s({ width: '100%', height: '100%', objectFit: 'cover' })),
  fallback: style(s({ display: 'flex', alignItems: 'center', justifyContent: 'center' })),
};
