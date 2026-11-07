import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import { animate } from '../../styles/animations.css';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const skeleton = {
  animation: animate.pulse,
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.surface.skeleton,
};

const stat = style(
  utility({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: space(2),
  }),
);

const statIcon = style(utility({ ...square(4), color: vars.color.fg.secondary }));

export const resourceCardStyles = {
  root: style(
    utility({
      height: '100%',
      alignSelf: 'flex-start',
    }),
  ),
  body: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      columnGap: space(2),
    }),
  ),
  details: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      rowGap: space(3),
      paddingInline: space(4),
      paddingTop: space(4),
    }),
  ),
  name: style([
    shared.text.lg,
    shared.weight.bold,
    utility({
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: '2',
    }),
  ]),
  subtitle: style([shared.text.xs, shared.fg.default]),
  nameSkeleton: style(
    utility({
      ...skeleton,
      height: space(4),
      width: space(48),
      paddingBlock: space(2),
    }),
  ),
  subtitleSkeleton: style(
    utility({
      ...skeleton,
      marginTop: space(4),
      height: space(2),
      width: space(24),
    }),
  ),
  stats: style([
    shared.stack.base,
    utility({
      rowGap: space(2),
      paddingBlock: space(1),
    }),
  ]),
  stat,
  statIcon,
  statSkeleton: style(
    utility({
      ...skeleton,
      marginBlock: space(1),
      height: space(2),
      width: space(16),
    }),
  ),
};
