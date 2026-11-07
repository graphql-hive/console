import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';

// Plain so the action can key its visibility off `root:hover`.
const root = style(
  component({
    display: 'flex',
    alignItems: 'center',
    gap: space(1),
  }),
);

export const copyTextStyles = {
  root,
  action: style(
    component({
      visibility: 'hidden',
      display: 'inline-flex',
      '@media': {
        '(hover: hover)': {
          selectors: {
            [`${root}:hover &`]: { visibility: 'visible' },
          },
        },
      },
    }),
  ),
  icon: style(component(square(3.5))),
};
