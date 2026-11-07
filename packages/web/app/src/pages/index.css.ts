import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { square } from '../styles/space';
import { animate } from '../styles/animations.css';
import * as shared from '../styles/shared.css';

export const indexStyles = {
  root: style([
    shared.flex,
    shared.fullWidth,
    utility({
      height: '100vh',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
  logo: style(utility({ ...square(16), animation: animate.pulse })),
};
