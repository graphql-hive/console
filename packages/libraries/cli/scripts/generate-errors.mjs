// Generates the "Errors" section of README.md and errors.json from the error catalog in dist/.
// Run after building the package.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  getErrorReference,
  renderErrorReferenceMarkdown,
} = require('../dist/helpers/error-docs.js');

const START_MARKER = '<!-- errors -->';
const END_MARKER = '<!-- errorsstop -->';

const readmeUrl = new URL('../README.md', import.meta.url);
const readme = readFileSync(readmeUrl, 'utf8');
const start = readme.indexOf(START_MARKER);
const end = readme.indexOf(END_MARKER);

if (start === -1 || end === -1 || end < start) {
  throw new Error(`README.md must contain "${START_MARKER}" followed by "${END_MARKER}".`);
}

writeFileSync(
  readmeUrl,
  readme.slice(0, start + START_MARKER.length) +
    '\n\n' +
    renderErrorReferenceMarkdown() +
    '\n\n' +
    readme.slice(end),
);

writeFileSync(
  new URL('../errors.json', import.meta.url),
  JSON.stringify(getErrorReference(), null, 2) + '\n',
);
