import { vars } from './theme.css';

/**
 * A multiple of the spacing step: `space(4)` is what Tailwind's `p-4` meant, 1rem at the default
 * step. A plain module rather than part of `theme.css.ts`, because a `.css.ts` file may only
 * export styles and tokens.
 */
export const space = (steps: number) => `calc(${vars.spacing} * ${steps})`;

/** A square of that many spacing steps: icons, dots, avatars. */
export const square = (steps: number) => ({ width: space(steps), height: space(steps) });
