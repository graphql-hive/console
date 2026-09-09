import { parse } from 'graphql';
import { cacheDocumentKey, createHash } from '../src/client/utils';

test('produce identical hash when absent AST lists are empty arrays or undefined', async () => {
  const document = parse('query Test { viewer @cached }', { noLocation: true });
  const operation = document.definitions[0];

  if (operation.kind !== 'OperationDefinition') {
    throw new Error('Expected an operation definition');
  }

  const field = operation.selectionSet.selections[0];
  if (field.kind !== 'Field') {
    throw new Error('Expected a field');
  }

  const directive = field.directives?.[0];
  if (!directive) {
    throw new Error('Expected a directive');
  }

  const graphql16Document = {
    ...document,
    definitions: [
      {
        ...operation,
        variableDefinitions: [],
        directives: [],
        selectionSet: {
          ...operation.selectionSet,
          selections: [
            {
              ...field,
              arguments: [],
              directives: [{ ...directive, arguments: [] }],
            },
          ],
        },
      },
    ],
  };

  const left = await cacheDocumentKey(document, null);
  const right = await cacheDocumentKey(graphql16Document, null);
  const previousHash = await createHash('SHA-1')
    .update(JSON.stringify(graphql16Document))
    .digest('hex');

  expect(left).toEqual(right);
  expect(right).toEqual(previousHash);
});

test('produce identical hash for the same document and the same keys but different values in variables', async () => {
  const left = await cacheDocumentKey('doc', { a: true });
  const right = await cacheDocumentKey('doc', { a: false });
  expect(left).toEqual(right);
});

test('produce identical hash for the same document but with an empty array', async () => {
  const left = await cacheDocumentKey('doc', { a: [] });
  const right = await cacheDocumentKey('doc', { a: [] });
  expect(left).toEqual(right);
});

test('produce identical hash for the same document but with and without an empty array', async () => {
  const left = await cacheDocumentKey('doc', { a: [] });
  const right = await cacheDocumentKey('doc', { a: null });
  expect(left).toEqual(right);
});

test('produce identical hash for the same document but with an array of primitive values', async () => {
  const left = await cacheDocumentKey('doc', { a: [1, 2, 3] });
  const right = await cacheDocumentKey('doc', { a: [4, 5, 6] });
  expect(left).toEqual(right);
});

test('produce different hash for the same document but with different keys in variables', async () => {
  const left = await cacheDocumentKey('doc', { a: true });
  const right = await cacheDocumentKey('doc', { b: true });
  expect(left).not.toEqual(right);
});

test('produce different hash for the same document but with and without variables', async () => {
  const left = await cacheDocumentKey('doc', { a: true });
  const right = await cacheDocumentKey('doc', null);
  expect(left).not.toEqual(right);
});

test('produce different hash for the same document but with and without variables (empty object)', async () => {
  const left = await cacheDocumentKey('doc', { a: true });
  const right = await cacheDocumentKey('doc', {});
  expect(left).not.toEqual(right);
});
