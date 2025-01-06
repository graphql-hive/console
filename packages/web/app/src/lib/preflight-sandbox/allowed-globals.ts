/**
 * List all variables that we want to allow users to use inside their scripts
 *
 * initial list comes from https://github.com/postmanlabs/uniscope/blob/develop/lib/allowed-globals.js
 */
export const ALLOWED_GLOBALS = new Set([
  'Array',
  'Atomics',
  'BigInt',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Infinity',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'WeakMap',
  'WeakSet',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'undefined',
  'unescape',
  // More global variables
  'btoa',
  'atob',
  'fetch',
  'setTimeout',
  // We aren't allowing access to window.console, but we need to "allow" it
  // here so a second argument isn't added for it below.
  'console',
]);
