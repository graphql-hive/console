import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const graphqlBlockStyles = {
  highlight: style(component({ maxWidth: 'inherit' })),
  heading: style(component({ marginBottom: space(4) })),
  url: style([
    shared.text.sm,
    component({
      marginLeft: space(3),
      fontStyle: 'italic',
    }),
  ]),
  body: style(component({ paddingBottom: space(2) })),
};
