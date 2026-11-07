import { style } from '@vanilla-extract/css';
import { layered } from '../../../../styles/layered';
import * as shared from '../../../../styles/shared.css';

const s = layered.components;

export const chartStyles = {
  /** Sized by the parent's width and the given height; the mount is laid over it. */
  host: style([shared.relative, shared.fullWidth]),
  mount: style(s({ position: 'absolute', inset: 0 })),
};
