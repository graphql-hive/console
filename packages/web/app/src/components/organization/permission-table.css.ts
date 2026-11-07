import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const permissionTableStyles = {
  title: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.strong,
    utility({ marginBottom: space(2) }),
  ]),
};
