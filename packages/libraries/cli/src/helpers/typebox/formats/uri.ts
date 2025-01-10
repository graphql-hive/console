import { FormatRegistry } from '@sinclair/typebox';

const uriRegex = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i;

FormatRegistry.Set('uri', (value: unknown) => {
  if (typeof value !== 'string') {
    return false;
  }

  return uriRegex.test(value);
});
