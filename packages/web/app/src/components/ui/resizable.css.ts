import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

// A 1px line with a wider invisible hit area drawn by `::after`.
const handle = style(
  component({
    position: 'relative',
    display: 'flex',
    width: '1px',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vars.color.line.DEFAULT,
    selectors: {
      '&::after': {
        position: 'absolute',
        insetBlock: '0px',
        left: '50%',
        width: space(1),
        content: '""',
        translate: '-50% 0',
      },
      '&:focus-visible': {
        boxShadow: `0 0 0 1px ${vars.color.accent.line}, 0 0 0 2px ${vars.color.accent.DEFAULT}`,
        outlineStyle: 'none',
      },
      '&[data-orientation="vertical"]': {
        height: '1px',
        width: '100%',
      },
      '&[data-orientation="vertical"]::after': {
        left: '0px',
        height: space(1),
        width: '100%',
        content: '""',
        translate: '0px -50%',
      },
    },
  }),
);

globalStyle(`${handle}[data-orientation=vertical] > div`, component({ rotate: '90deg' }));

export const resizableStyles = {
  group: style(
    component({
      width: '100%',
      height: '100%',
    }),
  ),
  handle,
  grip: style([
    shared.row.base,
    component({
      zIndex: '10',
      height: space(4),
      width: space(3),
      justifyContent: 'center',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      backgroundColor: vars.color.surface.selected,
    }),
  ]),
  gripIcon: style(component(square(2.5))),
};
