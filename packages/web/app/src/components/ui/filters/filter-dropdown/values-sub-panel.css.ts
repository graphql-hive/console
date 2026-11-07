import { style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

export const valuesSubPanelStyles = {
  list: style(component({ maxHeight: space(64) })),
};
