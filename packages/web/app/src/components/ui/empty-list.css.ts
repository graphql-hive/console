import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const emptyListStyles = {
  root: style(
    component({
      display: 'grid',
      maxHeight: '100vh',
      minHeight: '400px',
      flexGrow: '1',
    }),
  ),
  body: style([
    shared.stack.base,
    component({
      cursor: 'default',
      alignItems: 'center',
      rowGap: space(2),
      padding: space(4),
    }),
  ]),
  title: style(component({ textAlign: 'center' })),
  description: style([
    shared.textCenter,
    shared.text.sm,
    shared.weight.medium,
    shared.fg.secondary,
  ]),
  actions: style(component({ paddingBlock: space(4) })),
  docs: style(component({ paddingBottom: space(4) })),
  // The schema-version prompt: a hint line above the command to run.
  hint: style([
    shared.flex,
    shared.fullWidth,
    shared.text.xs,
    shared.fg.secondary,
    component({
      justifyContent: 'center',
      paddingBlock: space(2),
    }),
  ]),
  command: style([shared.flex, shared.fullWidth, component({ justifyContent: 'center' })]),
};
