import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { animate } from '../../styles/animations.css';
import { vars } from '../../styles/theme.css';

const skeleton = {
  height: space(5),
  width: space(48),
  animation: animate.pulse,
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.surface.skeleton,
};

export const projectSelectorStyles = {
  // The organization slot, capped like the link it stands in for.
  organizationSkeleton: style(utility({ ...skeleton, maxWidth: '200px' })),
  separator: style(
    utility({
      color: vars.color.fg.secondary,
      fontStyle: 'italic',
    }),
  ),
  projectSkeleton: style(utility(skeleton)),
};
