import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { animate } from '../../../../styles/animations.css';
import { palette, vars } from '../../../../styles/theme.css';

type Size = 'xs' | 'sm' | 'default' | 'lg' | 'xl';
type Width = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const line = (size: Size, steps: number) => ({
  variants: { shape: 'line' as const, size },
  style: component({ height: space(steps) }),
});
const lineWidth = (width: Width, steps: number) => ({
  variants: { shape: 'line' as const, width },
  style: component({ width: space(steps) }),
});
const circle = (size: Size, steps: number) => ({
  variants: { shape: 'circle' as const, size },
  style: component(square(steps)),
});

export const skeletonStyles = {
  root: recipe({
    // The gradient is fixed to the viewport, so every skeleton on the page shares one shimmer.
    base: component({
      display: 'block',
      flexShrink: 0,
      animation: animate.skeleton,
      backgroundColor: vars.color.surface.skeleton,
      backgroundImage: `linear-gradient(100deg,transparent 35%,hsl(${palette.accent}/0.12) 75%,transparent 85%)`,
      backgroundSize: '200% 100%',
      backgroundAttachment: 'fixed',
      '@media': {
        '(prefers-reduced-motion: reduce)': { animation: 'none', backgroundImage: 'none' },
      },
    }),
    variants: {
      shape: {
        line: component({ borderRadius: vars.radius.sm }),
        block: component({ width: '100%', height: '100%', borderRadius: vars.radius.sm }),
        circle: component({ borderRadius: vars.radius.full }),
      },
      size: { xs: {}, sm: {}, default: {}, lg: {}, xl: {} },
      width: { xs: {}, sm: {}, md: {}, lg: {}, xl: {}, full: {} },
    },
    compoundVariants: [
      line('xs', 2),
      line('sm', 3),
      line('default', 4),
      line('lg', 5),
      line('xl', 6),
      lineWidth('xs', 12),
      lineWidth('sm', 24),
      lineWidth('md', 48),
      lineWidth('lg', 72),
      lineWidth('xl', 96),
      { variants: { shape: 'line', width: 'full' }, style: component({ width: '100%' }) },
      circle('xs', 6),
      circle('sm', 6),
      circle('default', 9),
      circle('lg', 10),
      circle('xl', 10),
    ],
    defaultVariants: { shape: 'line', size: 'default', width: 'md' },
  }),
};
