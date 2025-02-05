// Storybook (or the version we are using)
// is using a version of Babel that does not
// support re-exporting as namespaces:
//
// export * as Kit from './index';
//
// So we have to re-export everything manually
// and incur an additional index_ file for it
// too:

import * as Kit from './index_';

// eslint-disable-next-line unicorn/prefer-export-from
export { Kit };
