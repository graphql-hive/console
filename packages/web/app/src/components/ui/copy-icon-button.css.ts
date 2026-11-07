import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { square } from '../../styles/space';

export const copyIconButtonStyles = {
  icon: style(component(square(3))),
};
