// Re-export as namespace via an intermediate file
// because `export * as Kit from './index_'` is not
// supported by all bundler configurations.

import * as Kit from './index_';

// eslint-disable-next-line unicorn/prefer-export-from
export { Kit };
