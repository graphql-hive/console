import type { StyleRule } from '@vanilla-extract/css';
import { components, utilities } from './layers.css';

/**
 * Wraps a style rule in a cascade layer. `style(layered.components({ ... }))` reads better than
 * the nested `'@layer': { [components]: { ... } }` it stands for, and every stylesheet in the app
 * uses one of the two: design-system components sit in `components`, call sites in `utilities`,
 * so a page's style always beats the component style it composes.
 */
export const layered = {
  components: (rule: StyleRule): StyleRule => ({ '@layer': { [components]: rule } }),
  utilities: (rule: StyleRule): StyleRule => ({ '@layer': { [utilities]: rule } }),
};
