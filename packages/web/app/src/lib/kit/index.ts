// Re-export as namespace via an intermediate file
// because `export * as Kit from './index_'` is not
// supported by all bundler configurations.

// eslint-disable-next-line unicorn/prefer-export-from
import * as Kit from './index_';

export { Kit };
