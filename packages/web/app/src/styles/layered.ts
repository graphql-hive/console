import type { StyleRule } from '@vanilla-extract/css';
import { components, utilities } from './layers.css';

/**
 * Wraps a style rule in a cascade layer. `style(component({ ... }))` reads better than the nested
 * `'@layer': { [components]: { ... } }` it stands for, and every stylesheet in the app uses one of
 * the two: design-system components sit in `components`, call sites in `utilities`, so a page's
 * style always beats the component style it composes.
 *
 * `style`, `recipe` and friends stay imported from the library so Vanilla Extract's debug-id
 * transform still names dev classes after the variable they are assigned to.
 */
export const component = (rule: StyleRule): StyleRule => ({ '@layer': { [components]: rule } });
export const utility = (rule: StyleRule): StyleRule => ({ '@layer': { [utilities]: rule } });
