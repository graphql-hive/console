import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';

export const errorStyles = {
  root: style([
    shared.relative,
    shared.row.base,
    shared.fullWidth,
    utility({
      height: '100%',
      justifyContent: 'center',
    }),
  ]),
  signOut: style(
    utility({
      position: 'absolute',
      top: space(6),
      right: space(6),
    }),
  ),
  signOutIcon: style(utility({ marginRight: space(2), ...square(4) })),
  // Illustration beside the text from the `sm` breakpoint up.
  body: style([
    shared.stack.base,
    utility({
      maxWidth: '960px',
      alignItems: 'center',
      columnGap: space(6),
      '@media': {
        '(width >= 40rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  image: style(
    utility({
      display: 'block',
      width: '200px',
      height: '200px',
    }),
  ),
  text: style([
    shared.grow,
    shared.textCenter,
    utility({
      '@media': {
        '(width >= 40rem)': { textAlign: 'left' },
      },
    }),
  ]),
  title: style([shared.text.xl, shared.weight.semibold]),
  details: style(utility({ marginTop: space(2) })),
};
