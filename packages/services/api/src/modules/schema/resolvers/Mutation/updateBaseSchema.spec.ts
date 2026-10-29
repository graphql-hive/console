import { describe, expect, test } from 'vitest';
import { updateBaseSchema } from './updateBaseSchema';

// The generated resolver type also allows the `{ resolve }` object form; this one is a function.
type Resolve = Extract<typeof updateBaseSchema, (...args: never[]) => unknown>;
type Args = Parameters<Resolve>;

const resolve = updateBaseSchema as Resolve;

// The resolver validates the SDL before it touches the injector, so these inputs never reach it.
const parent = {} as Args[0];
const context = {} as Args[2];
const info = {} as Args[3];

function update(newBase: string) {
  return resolve(
    parent,
    { input: { organizationSlug: 'org', projectSlug: 'project', targetSlug: 'target', newBase } },
    context,
    info,
  );
}

describe('updateBaseSchema', () => {
  test('an SDL syntax error is returned as the error message', async () => {
    await expect(update('iliketurtles')).resolves.toEqual({
      error: { message: expect.stringMatching(/^Syntax Error/) },
    });
  });

  test('a parser failure that is not a syntax error is thrown as unexpected', async () => {
    const depth = 100_000;
    const newBase = `type Query { field: ${'['.repeat(depth)}String${']'.repeat(depth)} }`;

    await expect(update(newBase)).rejects.toThrow(RangeError);
  });
});
