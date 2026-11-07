/**
 * The app's global stylesheets, in the one order that works. Import this module, never the files.
 *
 * 0. The UI font's `@font-face` rules, from the self-hosted variable build.
 * 1. `layers.css` declares the cascade layers before anything can use them.
 * 2. `preflight.css` is the reset, in the base layer.
 * 3. `theme.css`, `animations.css` and `global.css` fill the theme, base and components
 *    layers: tokens, keyframes, and the element-level rules. Base rules come after the reset so
 *    they win their ties with it.
 * 4. `utilities.css`, `patterns.css` and `shared.css` export classes for components and call
 *    sites to compose; importing them here puts them before every component stylesheet, so a
 *    component's own style wins a tie with a primitive it composes.
 */
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/instrument-sans/wght-italic.css';
import './layers.css';
import './preflight.css';
import './theme.css';
import './animations.css';
import './global.css';
import './utilities.css';
import './patterns.css';
import './shared.css';
